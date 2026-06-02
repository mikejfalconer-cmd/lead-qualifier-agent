import { Resend } from "resend";
import { getDatabase } from "../db/index";
import { emailLogs } from "../db/schema";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailRequest {
  clientId: number;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  body: string;
  type: "inbound" | "outbound";
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  request: SendEmailRequest
): Promise<SendEmailResult> {
  try {
    const response = await resend.emails.send({
      from: `${request.fromName} <${request.fromEmail}>`,
      to: request.toEmail,
      subject: request.subject,
      html: formatEmailBody(request.body),
    });

    if (response.error) {
      await logEmail({
        ...request,
        status: "failed",
        errorMessage: response.error.message,
      });

      return {
        success: false,
        error: response.error.message,
      };
    }

    await logEmail({
      ...request,
      status: "sent",
      messageId: response.data?.id,
    });

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await logEmail({
      ...request,
      status: "failed",
      errorMessage,
    });

    console.error("Email delivery error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function logEmail(
  request: SendEmailRequest & {
    status: "sent" | "failed" | "bounced";
    messageId?: string;
    errorMessage?: string;
  }
): Promise<void> {
  try {
    const db = getDatabase();
    await db.insert(emailLogs).values({
      clientId: request.clientId,
      type: request.type,
      fromEmail: request.fromEmail,
      toEmail: request.toEmail,
      subject: request.subject,
      messageId: request.messageId,
      status: request.status,
      errorMessage: request.errorMessage,
    });
  } catch (error) {
    // Silently fail if email_logs table doesn't exist (it's optional for Phase 3)
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      console.warn("Email logging table not available (optional)");
    } else {
      console.error("Failed to log email:", error);
    }
  }
}

function formatEmailBody(body: string): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto;">
          ${body
            .split("\n")
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join("")}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export async function sendFollowUpEmail(
  clientId: number,
  leadEmail: string,
  leadName: string,
  clientName: string,
  clientEmail: string,
  subject: string,
  body: string
): Promise<SendEmailResult> {
  return sendEmail({
    clientId,
    fromEmail: clientEmail,
    fromName: clientName,
    toEmail: leadEmail,
    subject,
    body,
    type: "outbound",
  });
}
