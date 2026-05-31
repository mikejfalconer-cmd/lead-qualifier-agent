import { db } from '../db/index';
import { emailLogs, leads, clients } from '../db/schema';
import { eq } from 'drizzle-orm';
import { extractLeadFromEmail, scoreLeadQuality } from './emailExtractor';

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
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client || client.length === 0) {
      console.error(`[Email] Client not found: ${clientId}`);
      return {
        success: false,
        error: 'Client not found',
      };
    }

    // Parse email to extract lead data
    const leadData = parseEmailToLead(email);

    // Create lead in database
    const result = await db
      .insert(leads)
      .values({
        clientId,
        senderEmail: leadData.senderEmail,
        senderName: leadData.senderName,
        subject: leadData.subject,
        body: leadData.body,
        qualification: 'cold', // Default, will be updated by AI
        status: 'new',
      })
      .returning();

    const newLead = result[0];

    // Log email
    await db
      .insert(emailLogs)
      .values({
        clientId,
        type: 'inbound',
        fromEmail: email.from,
        toEmail: email.to,
        subject: email.subject,
        messageId: email.messageId,
        status: 'sent',
      });

    console.log(`[Email] Lead created: ${newLead.id} for client: ${clientId}`);

    return {
      success: true,
      leadId: newLead.id,
      clientId,
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
  return `leads-${clientId}@leadqualifierpro.com`;
}

/**
 * Validate email address format
 */
export function isValidEmailAddress(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
