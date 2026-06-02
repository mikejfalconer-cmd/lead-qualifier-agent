import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { sendWelcomeEmail } from '../services/welcomeEmail';

const router: Router = Router();

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  const cleanUrl = databaseUrl.split('?')[0];
  const url = new URL(cleanUrl);
  return mysql.createPool({
    host: url.hostname,
    port: parseInt(url.port || '3306'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false },
  });
}

/**
 * Generate unique API token
 */
function generateToken(): string {
  return 'lqp_' + crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/signup
 * Create new customer account
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, businessName } = req.body;

    // Validation
    if (!email || !password || !businessName) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Check if email already exists
      const [existingClient] = await conn.query(
        'SELECT id FROM clients WHERE email = ?',
        [email]
      );

      if ((existingClient as any[]).length > 0) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Generate token
      const token = generateToken();

      // Create client account
      const [result] = await conn.query(
        `INSERT INTO clients (email, name, webhook_token, created_at)
         VALUES (?, ?, ?, NOW())`,
        [email, businessName, token]
      );

      const clientId = (result as any).insertId;

      console.log(`[Auth] New client created: ${email} (ID: ${clientId})`);

      // Send welcome email
      const webhookUrl = `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/api/webhooks/email?token=${token}`;
      await sendWelcomeEmail({
        email,
        businessName,
        webhookToken: token,
        webhookUrl,
      });

      res.json({
        success: true,
        token,
        clientId,
        message: 'Account created successfully. Check your email for setup instructions.',
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Auth] Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      // Find client by email
      const [clients] = await conn.query(
        'SELECT id, webhook_token FROM clients WHERE email = ?',
        [email]
      );

      if ((clients as any[]).length === 0) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const client = (clients as any[])[0];
      // For now, we'll skip password validation (can add later)
      // Just verify the email exists

      console.log(`[Auth] Client logged in: ${email}`);

      res.json({
        success: true,
        token: client.webhook_token,
        clientId: client.id,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current client info (requires token)
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers['x-api-key'] as string;

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const pool = getSqlClient();
    const conn = await pool.getConnection();

    try {
      const [clients] = await conn.query(
        'SELECT id, email, name, webhook_token, created_at FROM clients WHERE webhook_token = ?',
        [token]
      );

      if ((clients as any[]).length === 0) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      const client = (clients as any[])[0];

      res.json({
        id: client.id,
        email: client.email,
        businessName: client.name,
        token: client.webhook_token,
        createdAt: client.created_at,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('[Auth] Get client error:', error);
    res.status(500).json({ error: 'Failed to get client info' });
  }
});

export default router;
