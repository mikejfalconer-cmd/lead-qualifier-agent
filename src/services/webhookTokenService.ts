import crypto from 'crypto';

/**
 * Generate a secure webhook token for a client
 * Format: wh_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 bytes = 64 hex chars)
 */
export function generateWebhookToken(): string {
  const randomBytes = crypto.randomBytes(32);
  return `wh_${randomBytes.toString('hex')}`;
}

/**
 * Validate webhook token format
 */
export function isValidWebhookToken(token: string): boolean {
  return /^wh_[a-f0-9]{64}$/.test(token);
}

/**
 * Extract client ID from webhook URL
 * Format: /api/webhooks/{token}
 */
export function extractTokenFromPath(path: string): string | null {
  const match = path.match(/\/webhooks\/([a-f0-9wh_]+)$/);
  return match ? match[1] : null;
}

/**
 * Generate webhook URL for a client
 */
export function generateWebhookUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/api/webhooks/${token}`;
}
