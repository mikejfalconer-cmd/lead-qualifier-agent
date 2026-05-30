import IMAP from "imap";
import { simpleParser } from "mailparser";
import { getDatabase } from "../db/index";
import { clients, leads, followUps } from "../db/schema";
import { qualifyLead } from "./leadQualifier";
import { generateFollowUpEmail, buildEmailWithSignature } from "./followUpGenerator";
import { sendFollowUpEmail } from "./emailDelivery";
import { eq } from "drizzle-orm";

export class EmailProcessor {
  private imapConfig = {
    user: process.env.GMAIL_ADDRESS!,
    password: process.env.GMAIL_PASSWORD!,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
  };

  async processInboxEmails(): Promise<void> {
    console.log("[EmailProcessor] Starting email processing cycle...");

    try {
      const imap = new IMAP(this.imapConfig);

      imap.openBox("INBOX", false, async (err: Error | null, box: any) => {
        if (err) {
          console.error("[EmailProcessor] Error opening inbox:", err);
          return;
        }

        imap.search(["UNSEEN"], async (err: Error | null, results: number[]) => {
          if (err) {
            console.error("[EmailProcessor] Search error:", err);
            imap.end();
            return;
          }

          if (!results || results.length === 0) {
            console.log("[EmailProcessor] No new emails");
            imap.end();
            return;
          }

          console.log(`[EmailProcessor] Found ${results.length} new emails`);

          for (const uid of results) {
            await this.processEmail(imap, uid);
          }

          imap.end();
        });
      });

      imap.openBox("INBOX", false, () => {});
    } catch (error) {
      console.error("[EmailProcessor] Fatal error:", error);
    }
  }

  private async processEmail(imap: IMAP, uid: number): Promise<void> {
    try {
      const f = imap.fetch(uid.toString(), { bodies: "" });

      f.on("message", async (msg: any) => {
        simpleParser(msg, async (err: Error | null, parsed: any) => {
          if (err) {
            console.error("[EmailProcessor] Parse error:", err);
            return;
          }

          const toEmail = parsed.to?.text || "";
          const fromEmail = parsed.from?.text || "";
          const subject = parsed.subject || "(No Subject)";
          const text = parsed.text || parsed.html || "";

          // Extract sender name and email
          const senderMatch = fromEmail.match(/^([^<]+)<([^>]+)>/);
          const senderName = senderMatch ? senderMatch[1].trim() : fromEmail.split("@")[0];
          const senderEmailOnly = senderMatch ? senderMatch[2] : fromEmail;

          // Find client by forwarding email
          const db = getDatabase();
          const client = await db.query.clients.findFirst({
            where: eq(clients.forwardingEmail, toEmail),
          });

          if (!client) {
            console.log(`[EmailProcessor] No client found for ${toEmail}`);
            return;
          }

          console.log(`[EmailProcessor] Processing lead for client: ${client.name}`);

          // Create lead record
          const qualification = await qualifyLead({
            senderEmail: senderEmailOnly,
            senderName,
            subject,
            body: text,
          });

          const leadResult = await db.insert(leads).values({
            clientId: client.id,
            senderEmail: senderEmailOnly,
            senderName,
            subject,
            body: text.substring(0, 5000),
            score: qualification.score,
            qualification: qualification.qualification,
            status: "new",
            notes: `Problem: ${qualification.problemIdentified}\nFit: ${qualification.solutionFit}`,
          });

          const leadId = leadResult.id;

          // Generate and send follow-up email
          if (client.email) {
            const followUpEmail = await generateFollowUpEmail({
              senderName,
              senderEmail: senderEmailOnly,
              leadSubject: subject,
              leadBody: text,
              qualification: qualification.qualification,
              clientName: client.name,
              clientBusiness: client.name,
              clientEmail: client.email,
            });

            const fullBody = buildEmailWithSignature(
              followUpEmail.body,
              client.name,
              client.email
            );

            const emailResult = await sendFollowUpEmail(
              client.id,
              senderEmailOnly,
              senderName,
              client.name,
              client.email,
              followUpEmail.subject,
              fullBody
            );

            if (emailResult.success) {
              await db.insert(followUps).values({
                leadId,
                clientId: client.id,
                emailBody: fullBody,
                sentAt: new Date(),
              });

              console.log(
                `[EmailProcessor] Follow-up sent to ${senderEmailOnly}`
              );
            } else {
              console.error(
                `[EmailProcessor] Failed to send follow-up: ${emailResult.error}`
              );
            }
          }

          // Mark as read
          imap.addFlags(uid.toString(), ["\\Seen"], (err: Error | null) => {
            if (err) console.error("[EmailProcessor] Flag error:", err);
          });
        });
      });

      f.on("error", (err: Error) => {
        console.error("[EmailProcessor] Fetch error:", err);
      });
    } catch (error) {
      console.error("[EmailProcessor] Process email error:", error);
    }
  }
}

export async function startEmailProcessorLoop(intervalMs: number = 300000): Promise<void> {
  console.log(
    `[EmailProcessor] Starting loop with ${intervalMs}ms interval (${(intervalMs / 1000 / 60).toFixed(1)} minutes)`
  );

  const processor = new EmailProcessor();

  // Run immediately
  await processor.processInboxEmails();

  // Then run on interval
  setInterval(() => {
    processor.processInboxEmails().catch((err) => {
      console.error("[EmailProcessor] Loop error:", err);
    });
  }, intervalMs);
}
