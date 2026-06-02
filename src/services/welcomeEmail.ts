/**
 * Welcome Email Service
 * Sends onboarding emails to new customers
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailData {
  email: string;
  businessName: string;
  webhookToken: string;
  webhookUrl: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  try {
    const { email, businessName, webhookToken, webhookUrl } = data;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin: 20px 0; }
    .section h3 { color: #667eea; margin-top: 0; }
    .code-block { background: #fff; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; font-family: monospace; word-break: break-all; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .step { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #667eea; }
    .step-number { display: inline-block; background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; text-align: center; line-height: 30px; margin-right: 10px; font-weight: bold; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to Lead Qualifier Pro!</h1>
      <p>Your AI-powered lead qualification system is ready</p>
    </div>

    <div class="content">
      <p>Hi ${businessName},</p>

      <p>Thank you for signing up for Lead Qualifier Pro! We're excited to help you qualify and follow up with your leads automatically.</p>

      <div class="section">
        <h3>🚀 Quick Start (3 Steps)</h3>

        <div class="step">
          <span class="step-number">1</span>
          <strong>Copy Your Webhook URL</strong>
          <div class="code-block">${webhookUrl}</div>
          <p>This URL receives all your incoming leads.</p>
        </div>

        <div class="step">
          <span class="step-number">2</span>
          <strong>Set Up Email Forwarding</strong>
          <p>Forward your lead emails to: <code>webhook@leadqualifierpro.com</code></p>
          <p><strong>Gmail:</strong> Settings → Forwarding and POP/IMAP → Add forwarding address</p>
          <p><strong>Outlook:</strong> Settings → Mail → Forwarding → Start forwarding</p>
        </div>

        <div class="step">
          <span class="step-number">3</span>
          <strong>Send a Test Email</strong>
          <p>Send yourself a test email. Our system will:</p>
          <ul>
            <li>✓ Receive it via webhook</li>
            <li>✓ Analyze it with AI</li>
            <li>✓ Score it (Hot/Warm/Cold)</li>
            <li>✓ Generate a follow-up</li>
            <li>✓ Show it in your dashboard</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h3>📊 Your Dashboard</h3>
        <p>Log in to your dashboard to:</p>
        <ul>
          <li>View all incoming leads with AI scores</li>
          <li>See automatically generated follow-ups</li>
          <li>Track conversion metrics</li>
          <li>Access your API token and webhook URL</li>
        </ul>
        <a href="http://localhost:5173/dashboard" class="button">Go to Dashboard</a>
      </div>

      <div class="section">
        <h3>🔑 Your API Token</h3>
        <p>Keep this token safe - it's used to authenticate your account:</p>
        <div class="code-block">${webhookToken}</div>
      </div>

      <div class="section">
        <h3>❓ Need Help?</h3>
        <p>Check out our Settings page for detailed setup instructions, or contact us at support@leadqualifierpro.com</p>
      </div>

      <div class="section">
        <h3>💡 What Happens Next?</h3>
        <p>Once you set up email forwarding:</p>
        <ol>
          <li>Every lead email you receive gets forwarded to us</li>
          <li>Our AI analyzes the lead quality (budget, urgency, decision-maker, etc.)</li>
          <li>We generate a personalized follow-up email</li>
          <li>You see everything in your dashboard with real-time analytics</li>
          <li>The system learns from your feedback to improve over time</li>
        </ol>
      </div>

      <div class="footer">
        <p>Lead Qualifier Pro - AI-Powered Lead Qualification</p>
        <p>© 2026 Lead Qualifier Pro. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const response = await resend.emails.send({
      from: 'onboarding@leadqualifierpro.com',
      to: email,
      subject: '🎉 Welcome to Lead Qualifier Pro - Get Started in 3 Steps',
      html: htmlContent,
    });

    if (response.error) {
      console.error('[Welcome Email] Failed to send:', response.error);
      return false;
    }

    console.log('[Welcome Email] Sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('[Welcome Email] Error:', error);
    return false;
  }
}
