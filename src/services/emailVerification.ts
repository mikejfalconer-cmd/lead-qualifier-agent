import crypto from 'crypto';
import { db } from '../db/index';
import { clients } from '../db/schema';
import { eq } from 'drizzle-orm';

interface VerificationState {
  [key: string]: {
    code: string;
    email: string;
    clientId: number;
    expiresAt: number;
    verified: boolean;
  };
}

// In-memory store for verification codes (in production, use Redis or database)
const verificationCodes: VerificationState = {};

/**
 * Generate a verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Send verification email to sender
 */
export async function sendVerificationEmail(
  senderEmail: string,
  clientId: number,
  code: string
): Promise<boolean> {
  try {
    // Store verification code
    verificationCodes[senderEmail] = {
      code,
      email: senderEmail,
      clientId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      verified: false,
    };

    // In production, send actual email via Resend or similar
    console.log(`[Verification] Code for ${senderEmail}: ${code}`);
    console.log(`[Verification] Verification codes stored:`, verificationCodes);

    return true;
  } catch (error) {
    console.error('[Verification] Error sending verification email:', error);
    return false;
  }
}

/**
 * Verify email with code
 */
export function verifyEmailWithCode(
  senderEmail: string,
  code: string
): {
  success: boolean;
  clientId?: number;
  message: string;
} {
  const verification = verificationCodes[senderEmail];

  if (!verification) {
    return {
      success: false,
      message: 'No verification code found for this email',
    };
  }

  if (verification.expiresAt < Date.now()) {
    delete verificationCodes[senderEmail];
    return {
      success: false,
      message: 'Verification code has expired',
    };
  }

  if (verification.code !== code) {
    return {
      success: false,
      message: 'Invalid verification code',
    };
  }

  // Mark as verified
  verification.verified = true;

  return {
    success: true,
    clientId: verification.clientId,
    message: 'Email verified successfully',
  };
}

/**
 * Check if email is verified
 */
export function isEmailVerified(senderEmail: string): boolean {
  const verification = verificationCodes[senderEmail];
  return verification ? verification.verified : false;
}

/**
 * Get verification status
 */
export function getVerificationStatus(senderEmail: string): {
  verified: boolean;
  expiresAt?: number;
  message: string;
} {
  const verification = verificationCodes[senderEmail];

  if (!verification) {
    return {
      verified: false,
      message: 'No verification found',
    };
  }

  if (verification.expiresAt < Date.now()) {
    delete verificationCodes[senderEmail];
    return {
      verified: false,
      message: 'Verification code has expired',
    };
  }

  return {
    verified: verification.verified,
    expiresAt: verification.expiresAt,
    message: verification.verified ? 'Email verified' : 'Pending verification',
  };
}

/**
 * Clear verification code
 */
export function clearVerificationCode(senderEmail: string): void {
  delete verificationCodes[senderEmail];
}

/**
 * Get all verification codes (for debugging)
 */
export function getAllVerificationCodes(): VerificationState {
  return verificationCodes;
}
