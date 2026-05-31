import { db } from './index';
import { emailLogs, leads, clients } from './schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Get email logs for a client
 */
export async function getEmailLogsForClient(clientId: number, limit = 50, offset = 0) {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.clientId, clientId))
      .orderBy(desc(emailLogs.timestamp))
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error('[DB] Error fetching email logs:', error);
    throw error;
  }
}

/**
 * Get email log by ID
 */
export async function getEmailLogById(id: number) {
  try {
    const log = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.id, id))
      .limit(1);

    return log[0] || null;
  } catch (error) {
    console.error('[DB] Error fetching email log:', error);
    throw error;
  }
}

/**
 * Create email log
 */
export async function createEmailLog(data: {
  clientId: number;
  type: 'inbound' | 'outbound';
  fromEmail: string;
  toEmail: string;
  subject?: string;
  messageId?: string;
  status?: 'sent' | 'failed' | 'bounced';
  errorMessage?: string;
}) {
  try {
    const result = await db
      .insert(emailLogs)
      .values(data)
      .returning();

    return result[0];
  } catch (error) {
    console.error('[DB] Error creating email log:', error);
    throw error;
  }
}

/**
 * Update email log status
 */
export async function updateEmailLogStatus(
  id: number,
  status: 'sent' | 'failed' | 'bounced',
  errorMessage?: string
) {
  try {
    const result = await db
      .update(emailLogs)
      .set({
        status,
        errorMessage,
        timestamp: new Date(),
      })
      .where(eq(emailLogs.id, id))
      .returning();

    return result[0];
  } catch (error) {
    console.error('[DB] Error updating email log:', error);
    throw error;
  }
}

/**
 * Get email statistics for a client
 */
export async function getEmailStats(clientId: number) {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.clientId, clientId));

    const stats = {
      totalEmails: logs.length,
      inboundEmails: logs.filter(l => l.type === 'inbound').length,
      outboundEmails: logs.filter(l => l.type === 'outbound').length,
      successfulEmails: logs.filter(l => l.status === 'sent').length,
      failedEmails: logs.filter(l => l.status === 'failed').length,
      bouncedEmails: logs.filter(l => l.status === 'bounced').length,
    };

    return stats;
  } catch (error) {
    console.error('[DB] Error fetching email stats:', error);
    throw error;
  }
}

/**
 * Get leads from email sources
 */
export async function getLeadsFromEmailSources(clientId: number) {
  try {
    const emailLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.clientId, clientId))
      .orderBy(desc(leads.createdAt));

    return emailLeads;
  } catch (error) {
    console.error('[DB] Error fetching email-sourced leads:', error);
    throw error;
  }
}

/**
 * Get email logs for a specific sender
 */
export async function getEmailLogsForSender(clientId: number, senderEmail: string) {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.clientId, clientId),
          eq(emailLogs.fromEmail, senderEmail)
        )
      )
      .orderBy(desc(emailLogs.timestamp));

    return logs;
  } catch (error) {
    console.error('[DB] Error fetching sender email logs:', error);
    throw error;
  }
}

/**
 * Get email logs by type
 */
export async function getEmailLogsByType(
  clientId: number,
  type: 'inbound' | 'outbound',
  limit = 50
) {
  try {
    const logs = await db
      .select()
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.clientId, clientId),
          eq(emailLogs.type, type)
        )
      )
      .orderBy(desc(emailLogs.timestamp))
      .limit(limit);

    return logs;
  } catch (error) {
    console.error('[DB] Error fetching email logs by type:', error);
    throw error;
  }
}

/**
 * Delete old email logs (archive)
 */
export async function deleteOldEmailLogs(clientId: number, daysOld = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // In a real app, you'd archive these instead of deleting
    // For now, we'll just return the count
    const logs = await db
      .select()
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.clientId, clientId),
          // Add date comparison when available
        )
      );

    return logs.length;
  } catch (error) {
    console.error('[DB] Error deleting old email logs:', error);
    throw error;
  }
}
