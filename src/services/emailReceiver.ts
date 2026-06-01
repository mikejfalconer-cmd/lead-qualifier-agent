import postgres from 'postgres';
import { extractLeadFromEmail, scoreLeadQuality } from './emailExtractor';

let sqlClient: any = null;

function getSqlClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sqlClient = postgres(databaseUrl, {
      ssl: 'require',
      max: 10,
    });
  }
  return sqlClient;
}

export interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId?: string;
}

/**
 * Extract client ID from forwarding email address
 * Format: leads-{clientId}@leadqualifierpro.com
 */
export function extractClientIdFromEmail(toEmail: string): number | null {
  const match = toEmail.match(/leads-(\d+)@/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse email to extract lead information
 */
export function parseEmailToLead(email: IncomingEmail) {
  const senderName = extractSenderName(email.from);
  const extractedLead = extractLeadFromEmail(email.subject, email.text, email.from, senderName);
  const quality = scoreLeadQuality(extractedLead);
  
  return {
    senderEmail: email.from,
    senderName: senderName,
    subject: email.subject,
    body: email.text,
    htmlBody: email.html,
    extractedData: extractedLead,
    quality: quality,
  };
}

/**
 * Extract sender name from email address
 */
function extractSenderName(email: string): string {
  // Try to extract name before @ symbol
  const namePart = email.split('@')[0];
  // Replace dots and underscores with spaces, capitalize
  return namePart
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Process incoming email and create lead
 */
export async function processIncomingEmail(email: IncomingEmail) {
  try {
    // Extract client ID from email address
    const clientId = extractClientIdFromEmail(email.to);
    
    if (!clientId) {
      console.error(`[Email] Invalid email address format: ${email.to}`);
      return {
        success: false,
        error: 'Invalid email address format',
      };
    }

    // Verify client exists
    const sql = getSqlClient();
    let clientResult;
    try {
      clientResult = await sql`
        SELECT id, name, email, forwarding_email FROM clients WHERE id = ${clientId}
      `;
    } catch (dbError) {
      console.error(`[Email] Database error fetching client:`, dbError);
      return {
        success: false,
        error: 'Database error',
      };
    }

    if (!clientResult || clientResult.length === 0) {
      console.error(`[Email] Client not found: ${clientId}`);
      return {
        success: false,
        error: 'Client not found',
      };
    }

    const client = clientResult[0];

    // Parse email to extract lead data
    const leadData = parseEmailToLead(email);

    // Create lead in database
    const leadResult = await sql`
      INSERT INTO leads (client_id, sender_email, sender_name, subject, body, qualification, status)
      VALUES (${clientId}, ${leadData.senderEmail}, ${leadData.senderName}, ${leadData.subject}, ${leadData.body}, 'cold', 'new')
      RETURNING id, client_id, sender_email, sender_name, subject, body, qualification, status, created_at
    `;

    const newLead = leadResult[0];

    // Log email
    await sql`
      INSERT INTO email_logs (client_id, type, from_email, to_email, subject, message_id, status)
      VALUES (${clientId}, 'inbound', ${email.from}, ${email.to}, ${email.subject}, ${email.messageId || null}, 'sent')
    `;

    console.log(`[Email] Lead created: ${newLead.id} for client: ${clientId}`);

    return {
      success: true,
      leadId: newLead.id,
      clientId,
      qualification: newLead.qualification,
      status: newLead.status,
      message: 'Email processed successfully',
    };
  } catch (error) {
    console.error('[Email] Error processing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get email receiving address for a client
 */
export function getEmailReceivingAddress(clientId: number): string {
  return `leads-${clientId}@leadqualifierpro.resend.dev`;
}

/**
 * Validate email address format
 */
export function isValidEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
