import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';

const router: Router = Router();

let sqlClient: any = null;

function getSqlClient() {
  if (!sqlClient) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
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
 * GET /api/clients/me
 * Get current client info
 */
router.get('/clients/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers['x-webhook-token'] as string;
    
    if (!token) {
      res.status(401).json({ error: 'Missing webhook token' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      const [clients] = await conn.query(
        'SELECT id, name, email, webhook_token, subscription_status FROM clients WHERE webhook_token = ?',
        [token]
      );

      if (!clients || (clients as any[]).length === 0) {
        res.status(401).json({ error: 'Invalid webhook token' });
        return;
      }

      const client = (clients as any[])[0];
      res.json({
        id: client.id,
        name: client.name,
        email: client.email,
        webhookToken: client.webhook_token,
        subscriptionStatus: client.subscription_status,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Dashboard] Error in /clients/me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leads/client/:clientId
 * Get all leads for a client
 */
router.get('/leads/client/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const token = req.headers['x-webhook-token'] as string;

    if (!token) {
      res.status(401).json({ error: 'Missing webhook token' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Verify token belongs to this client
      const [clients] = await conn.query(
        'SELECT id FROM clients WHERE webhook_token = ? AND id = ?',
        [token, clientId]
      );

      if (!clients || (clients as any[]).length === 0) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      const [leads] = await conn.query(
        'SELECT id, client_id, sender_email, sender_name, subject, message, qualification, status, message_id FROM leads WHERE client_id = ? ORDER BY id DESC',
        [clientId]
      );

      res.json(leads);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Dashboard] Error in /leads/client/:clientId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/leads/stats/:clientId
 * Get lead statistics for a client
 */
router.get('/leads/stats/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const token = req.headers['x-webhook-token'] as string;

    if (!token) {
      res.status(401).json({ error: 'Missing webhook token' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Verify token belongs to this client
      const [clients] = await conn.query(
        'SELECT id FROM clients WHERE webhook_token = ? AND id = ?',
        [token, clientId]
      );

      if (!clients || (clients as any[]).length === 0) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      const [stats] = await conn.query(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN qualification = 'hot' THEN 1 ELSE 0 END) as hot,
          SUM(CASE WHEN qualification = 'warm' THEN 1 ELSE 0 END) as warm,
          SUM(CASE WHEN qualification = 'cold' THEN 1 ELSE 0 END) as cold,
          SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
        FROM leads WHERE client_id = ?`,
        [clientId]
      );

      const result = (stats as any[])[0];
      res.json({
        total: result.total || 0,
        hot: result.hot || 0,
        warm: result.warm || 0,
        cold: result.cold || 0,
        contacted: result.contacted || 0,
        converted: result.converted || 0,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Dashboard] Error in /leads/stats/:clientId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/follow-ups/client/:clientId
 * Get all follow-ups for a client
 */
router.get('/follow-ups/client/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const token = req.headers['x-webhook-token'] as string;

    if (!token) {
      res.status(401).json({ error: 'Missing webhook token' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Verify token belongs to this client
      const [clients] = await conn.query(
        'SELECT id FROM clients WHERE webhook_token = ? AND id = ?',
        [token, clientId]
      );

      if (!clients || (clients as any[]).length === 0) {
        res.status(403).json({ error: 'Unauthorized' });
        return;
      }

      const [followUps] = await conn.query(
        'SELECT id, lead_id, client_id, email_body, sent_at, response_received, response_body, response_received_at FROM follow_ups WHERE client_id = ? ORDER BY sent_at DESC',
        [clientId]
      );

      res.json(followUps);
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Dashboard] Error in /follow-ups/client/:clientId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
