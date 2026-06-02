import mysql from 'mysql2/promise';
import { extractLeadFromEmail, scoreLeadQuality } from './emailExtractor';
import { qualifyLead } from './leadQualifier';
import { generateFollowUpEmail, buildEmailWithSignature } from './followUpGenerator';
import { sendFollowUpEmail } from './emailDelivery';

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
 * Supports multiple formats:
 * - leads-{clientId}@domain.com (legacy format with client ID)
 * - leads@domain.com (generic format - client ID from webhook token)
 * - custom@domain.com (custom domain - client ID from webhook token)
 */
export function extractClientIdFromEmail(toEmail: string): number | null {
  // Try to extract client ID from email format: leads-{clientId}@
  const match = toEmail.match(/leads-(\d+)@/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // If no client ID in email, return null (will be provided by webhook token)
  return null;
}

/**
 * Validate email address format
 */
export function isValidEmailAddress(email: string): boolean {
  // RFC 5322 simplified regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Extract sender name from email address
 */
function extractSenderName(email: string): string {
  const parts = email.split('@')[0];
  return parts
    .replace(/[._-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
    qualification: quality.qualification,
    score: quality.score,
  };
}

/**
 * Process incoming email and create lead with AI scoring and auto follow-up
 * @param email - The incoming email data
 * @param clientId - The client ID (provided by webhook token, not extracted from email)
 */
export async function processIncomingEmail(email: IncomingEmail, clientId: number) {
  try {
    // Validate client ID
    if (!clientId || clientId <= 0) {
      console.error(`[Email] Invalid client ID: ${clientId}`);
      return {
        success: false,
        error: 'Invalid client ID',
      };
    }

    // Validate email addresses
    if (!isValidEmailAddress(email.from)) {
      console.error(`[Email] Invalid sender email: ${email.from}`);
      return {
        success: false,
        error: 'Invalid sender email',
      };
    }

    // Extract sender name from email
    const senderName = extractSenderName(email.from);

    // Get database connection
    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Get client details for follow-up
      const [clientResult] = await conn.query(
        'SELECT id, name, email FROM clients WHERE id = ?',
        [clientId]
      );

      if (!clientResult || (clientResult as any[]).length === 0) {
        console.error(`[Email] Client not found: ${clientId}`);
        return {
          success: false,
          error: 'Client not found',
        };
      }

      const client = (clientResult as any[])[0];

      // AI Lead Scoring - Use LLM for intelligent qualification
      console.log(`[Email] Analyzing lead from: ${email.from}`);
      const qualification = await qualifyLead({
        senderEmail: email.from,
        senderName,
        subject: email.subject,
        body: email.text,
      });

      // Create lead in database with AI score
      const [leadResult] = await conn.query(
        `INSERT INTO leads (client_id, sender_email, sender_name, subject, message, qualification, status, message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          email.from,
          senderName,
          email.subject,
          email.text.substring(0, 5000),
          qualification.qualification,
          'new',
          email.messageId || null,
        ]
      );

      const leadId = (leadResult as any).insertId;

      console.log(
        `[Email] Lead created: ${leadId} (${qualification.qualification}, score: ${qualification.score})`
      );

      // Auto Follow-up: Generate and send personalized email
      if (client.email) {
        try {
          console.log(`[Email] Generating follow-up for: ${email.from}`);
          const followUpEmail = await generateFollowUpEmail({
            senderName,
            senderEmail: email.from,
            leadSubject: email.subject,
            leadBody: email.text,
            qualification: qualification.qualification,
            clientName: client.name,
            clientBusiness: client.name,
            clientEmail: client.email,
          });

          const fullBody = buildEmailWithSignature(
            followUpEmail.body,
            client.name,
            client.email
          );

          const emailResult = await sendFollowUpEmail(
            clientId,
            email.from,
            senderName,
            client.name,
            client.email,
            followUpEmail.subject,
            fullBody
          );

          if (emailResult.success) {
            // Record follow-up in database
            await conn.query(
              `INSERT INTO follow_ups (lead_id, client_id, email_body, sent_at)
               VALUES (?, ?, ?, ?)`,
              [leadId, clientId, fullBody, new Date()]
            );

            console.log(`[Email] Follow-up sent to ${email.from}`);
          } else {
            console.error(
              `[Email] Failed to send follow-up: ${emailResult.error}`
            );
          }
        } catch (followUpError) {
          console.error('[Email] Error in follow-up process:', followUpError);
          // Don't fail the whole lead creation if follow-up fails
        }
      }

      // Fetch the created lead
      const [newLeadResult] = await conn.query(
        'SELECT id, client_id, sender_email, sender_name, subject, message, qualification, status, createdAt FROM leads WHERE id = ?',
        [leadId]
      );

      const newLead = (newLeadResult as any[])[0];

      return {
        success: true,
        leadId: newLead.id,
        clientId: newLead.client_id,
        senderEmail: newLead.sender_email,
        senderName: newLead.sender_name,
        qualification: newLead.qualification,
        status: newLead.status,
        createdAt: newLead.createdAt,
      };
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Email] Error processing incoming email:', error);
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
 * Send verification email to confirm sender
 */
export async function sendVerificationEmail(clientId: number, senderEmail: string, verificationCode: string): Promise<boolean> {
  try {
    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Store verification request
      await conn.query(
        `INSERT INTO email_verifications (client_id, sender_email, verification_code, status)
         VALUES (?, ?, ?, 'pending')`,
        [clientId, senderEmail, verificationCode]
      );

      // TODO: Send actual verification email via Resend
      console.log(`[Email] Verification code sent to ${senderEmail}: ${verificationCode}`);

      return true;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Email] Error sending verification email:', error);
    return false;
  }
}
