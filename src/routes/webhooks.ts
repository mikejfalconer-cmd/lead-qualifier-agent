import { Router, Request, Response } from 'express';
import { processIncomingEmail } from '../services/emailReceiver';
import { checkForDuplicate, markAsDuplicate } from '../services/leadDeduplication';
import { isValidEmailAddress } from '../services/emailReceiver';
import mysql from 'mysql2/promise';

const router: Router = Router();

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

/**
 * POST /api/webhooks/:token
 * Secure webhook endpoint for receiving emails via webhook token
 * This is the primary endpoint that clients should use
 */
router.post('/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { from, to, subject, text, html, messageId } = req.body;

    // Validate required fields
    if (!from || !to || !subject || !text) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to, subject, text',
      });
      return;
    }

    // Validate email addresses
    if (!isValidEmailAddress(from) || !isValidEmailAddress(to)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email address format',
      });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Verify webhook token and get client
      const [clientResult] = await conn.query(
        'SELECT id, name, email FROM clients WHERE webhook_token = ?',
        [token]
      );

      if (!clientResult || (clientResult as any[]).length === 0) {
        res.status(401).json({
          success: false,
          error: 'Invalid webhook token',
        });
        return;
      }

      const clientId = (clientResult as any[])[0].id;

      // Check for duplicates
      const duplicateCheck = await checkForDuplicate(clientId, from, subject, messageId);

      if (duplicateCheck.isDuplicate) {
        res.status(200).json({
          success: true,
          message: 'Email received but marked as duplicate',
          isDuplicate: true,
          existingLeadId: duplicateCheck.existingLeadId,
          reason: duplicateCheck.reason,
        });
        return;
      }

      // Process the email with client ID from webhook token
      const result = await processIncomingEmail(
        {
          from,
          to,
          subject,
          text,
          html,
          messageId,
        },
        clientId
      );

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json({
        success: true,
        leadId: result.leadId,
        clientId: result.clientId,
        message: 'Email received and lead created',
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Webhooks] Error in webhook endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/webhooks/status/:token
 * Check webhook status and client info
 */
router.get('/status/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      const [clientResult] = await conn.query(
        'SELECT id, name, email, subscription_status FROM clients WHERE webhook_token = ?',
        [token]
      );

      if (!clientResult || (clientResult as any[]).length === 0) {
        res.status(401).json({
          success: false,
          error: 'Invalid webhook token',
        });
        return;
      }

      const client = (clientResult as any[])[0];

      // Get lead statistics
      const [statsResult] = await conn.query(
        `SELECT 
          COUNT(*) as total_leads,
          SUM(CASE WHEN qualification = 'hot' THEN 1 ELSE 0 END) as hot_leads,
          SUM(CASE WHEN qualification = 'warm' THEN 1 ELSE 0 END) as warm_leads,
          SUM(CASE WHEN qualification = 'cold' THEN 1 ELSE 0 END) as cold_leads
        FROM leads WHERE client_id = ?`,
        [client.id]
      );

      const stats = (statsResult as any[])[0];

      res.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          subscriptionStatus: client.subscription_status,
        },
        statistics: {
          totalLeads: parseInt(stats.total_leads || 0),
          hotLeads: parseInt(stats.hot_leads || 0),
          warmLeads: parseInt(stats.warm_leads || 0),
          coldLeads: parseInt(stats.cold_leads || 0),
        },
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Webhooks] Error in status endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
