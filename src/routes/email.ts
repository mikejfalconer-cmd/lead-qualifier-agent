import { Router, Request, Response } from 'express';
import {
  processIncomingEmail,
  getEmailReceivingAddress,
  isValidEmailAddress,
} from '../services/emailReceiver';
import {
  sendVerificationEmail,
  verifyEmailWithCode,
  generateVerificationCode,
  getVerificationStatus,
  isEmailVerified,
} from '../services/emailVerification';
import { db } from '../db/index';
import { clients, emailLogs } from '../db/schema';
import { eq } from 'drizzle-orm';

const router: Router = Router();

/**
 * POST /api/email/receive
 * Webhook endpoint for receiving emails from Resend or similar service
 */
router.post('/receive', async (req: Request, res: Response): Promise<void> => {
  try {
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
    const fromValid = isValidEmailAddress(from);
    const toValid = isValidEmailAddress(to);
    console.log('[DEBUG] Email validation:', { from, to, fromValid, toValid });
    if (!fromValid || !toValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid email address format',
      });
      return;
    }

    // Extract client ID to get clientId for verification
    const clientIdMatch = to.match(/leads-(\d+)@/);
    const clientId = clientIdMatch ? parseInt(clientIdMatch[1], 10) : 0;

    // Check if sender is verified
    if (!isEmailVerified(from)) {
      // Send verification email
      const code = generateVerificationCode();
      await sendVerificationEmail(from, clientId, code);

      res.status(202).json({
        success: false,
        message: 'Email not verified. Verification code sent to sender.',
        verificationRequired: true,
        code: code, // For development only - remove in production
      });
      return;
    }

    // Process the email
    const result = await processIncomingEmail({
      from,
      to,
      subject,
      text,
      html,
      messageId,
    });

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
  } catch (error) {
    console.error('[Email] Error in receive endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/email/address/:clientId
 * Get the email receiving address for a client
 */
router.get('/address/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIdStr = (req.params.clientId as string) || '';
    const clientIdNum = parseInt(clientIdStr, 10);

    // Verify client exists
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, clientIdNum))
      .limit(1);

    if (!client || client.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Client not found',
      });
      return;
    }

    const emailAddress = getEmailReceivingAddress(clientIdNum);

    res.json({
      success: true,
      clientId: clientIdNum,
      emailAddress,
      message: `Forward your leads to this email address: ${emailAddress}`,
    });
  } catch (error) {
    console.error('[Email] Error in address endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/email/verify
 * Verify email with code
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, code',
      });
      return;
    }

    const result = verifyEmailWithCode(email, code);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      clientId: result.clientId,
    });
  } catch (error) {
    console.error('[Email] Error in verify endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/email/verify-status/:email
 * Check verification status of an email
 */
router.get('/verify-status/:email', async (req: Request, res: Response): Promise<void> => {
  try {
    const emailStr = (req.params.email as string) || '';
    const status = getVerificationStatus(emailStr);

    res.json({
      success: true,
      email: emailStr,
      ...status,
    });
  } catch (error) {
    console.error('[Email] Error in verify-status endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/email/logs/:clientId
 * Get email logs for a client
 */
router.get('/logs/:clientId', async (req: Request, res: Response): Promise<void> => {
  try {
    const clientIdStr = (req.params.clientId as string) || '';
    const clientIdNum = parseInt(clientIdStr, 10);
    const limitStr = (req.query.limit as string) || '50';
    const offsetStr = (req.query.offset as string) || '0';
    const limit = parseInt(limitStr, 10);
    const offset = parseInt(offsetStr, 10);

    // Get email logs
    const logs = await db
      .select()
      .from(emailLogs)
      .where(eq(emailLogs.clientId, clientIdNum))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      clientId: clientIdNum,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('[Email] Error in logs endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/email/send-verification
 * Send verification code to email
 */
router.post('/send-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, clientId } = req.body;

    if (!email || !clientId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, clientId',
      });
      return;
    }

    if (!isValidEmailAddress(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email address format',
      });
      return;
    }

    const code = generateVerificationCode();
    const success = await sendVerificationEmail(email, clientId, code);

    if (!success) {
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Verification code sent',
      email,
      code, // In production, don't return code to client
    });
  } catch (error) {
    console.error('[Email] Error in send-verification endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
