import mysql from 'mysql2/promise';

let sqlClient: any = null;

function getSqlClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    // Remove ?ssl=... from the URL before parsing
    const cleanUrl = databaseUrl.split('?')[0];
    const url = new URL(cleanUrl);
    sqlClient = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port || '3306'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: { rejectUnauthorized: false }
    });
  }
  return sqlClient;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingLeadId?: number;
  reason?: string;
}

/**
 * Check if a lead is a duplicate based on:
 * 1. Same sender email + subject (exact match)
 * 2. Same sender email + similar subject (fuzzy match)
 * 3. Same message ID (if provided)
 */
export async function checkForDuplicate(
  clientId: number,
  senderEmail: string,
  subject: string,
  messageId?: string
): Promise<DuplicateCheckResult> {
  try {
    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Check 1: Exact match by message ID (most reliable)
      if (messageId) {
        const [rows] = await conn.query(
          'SELECT id FROM leads WHERE client_id = ? AND message_id = ? LIMIT 1',
          [clientId, messageId]
        );

        if (rows && (rows as any[]).length > 0) {
          return {
            isDuplicate: true,
            existingLeadId: (rows as any[])[0].id,
            reason: 'Duplicate message ID',
          };
        }
      }

      // Check 2: Same sender + exact subject (within last 24 hours)
      const [exactMatch] = await conn.query(
        `SELECT id FROM leads 
         WHERE client_id = ? 
         AND sender_email = ? 
         AND subject = ? 
         AND updated_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
         LIMIT 1`,
        [clientId, senderEmail, subject]
      );

      if (exactMatch && (exactMatch as any[]).length > 0) {
        return {
          isDuplicate: true,
          existingLeadId: (exactMatch as any[])[0].id,
          reason: 'Same sender and subject within 24 hours',
        };
      }

      // Check 3: Same sender (within last 7 days)
      // Note: MySQL doesn't have a built-in similarity function like PostgreSQL
      // So we'll just check for same sender within 7 days
      const [similarMatch] = await conn.query(
        `SELECT id FROM leads 
         WHERE client_id = ? 
         AND sender_email = ? 
         AND updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         LIMIT 1`,
        [clientId, senderEmail]
      );

      if (similarMatch && (similarMatch as any[]).length > 0) {
        // Check if this is a different lead (not the same subject)
        const existingId = (similarMatch as any[])[0].id;
        const [existing] = await conn.query(
          'SELECT subject FROM leads WHERE id = ?',
          [existingId]
        );

        if (existing && (existing as any[]).length > 0) {
          const existingSubject = (existing as any[])[0].subject;
          // If subject is different, it's likely a new inquiry
          if (existingSubject !== subject) {
            return { isDuplicate: false };
          }
        }

        return {
          isDuplicate: true,
          existingLeadId: existingId,
          reason: 'Similar inquiry from same sender within 7 days',
        };
      }

      return { isDuplicate: false };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Deduplication] Error checking for duplicates:', error);
    // If there's an error, don't treat it as a duplicate
    return { isDuplicate: false };
  }
}

/**
 * Mark a lead as duplicate
 */
export async function markAsDuplicate(
  leadId: number,
  originalLeadId: number,
  reason: string
): Promise<boolean> {
  try {
    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      await conn.query(
        'UPDATE leads SET is_duplicate = true, notes = ? WHERE id = ?',
        [`Duplicate of lead #${originalLeadId}: ${reason}`, leadId]
      );
      return true;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Deduplication] Error marking lead as duplicate:', error);
    return false;
  }
}

/**
 * Get duplicate leads for a given lead
 */
export async function getDuplicatesForLead(leadId: number): Promise<number[]> {
  try {
    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      const [lead] = await conn.query(
        'SELECT sender_email, subject, client_id FROM leads WHERE id = ?',
        [leadId]
      );

      if (!lead || (lead as any[]).length === 0) {
        return [];
      }

      const { sender_email, subject, client_id } = (lead as any[])[0];

      const [duplicates] = await conn.query(
        `SELECT id FROM leads 
         WHERE client_id = ? 
         AND sender_email = ? 
         AND subject = ? 
         AND id != ? 
         AND updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [client_id, sender_email, subject, leadId]
      );

      return (duplicates as any[]).map((d) => d.id);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Deduplication] Error getting duplicates:', error);
    return [];
  }
}
