import express, { Router } from "express";
import * as queries from "../db/queries";
import { sendFollowUpEmail } from "../services/emailDelivery";
import { generateFollowUp } from "../services/leadQualifier";

const router: Router = express.Router();

// Middleware to authenticate client
function authenticateClient(req: any, res: any, next: any): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  req.apiKey = apiKey;
  next();
}

// Get follow-ups for a lead
router.get(
  "/leads/:leadId/follow-ups",
  authenticateClient,
  async (req: any, res: any) => {
    try {
      const client = await queries.getClientByApiKey(req.apiKey);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const lead = await queries.getLeadById(parseInt(req.params.leadId));

      if (!lead || lead.clientId !== client.id) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const followUps = await queries.getFollowUpsByLeadId(lead.id);

      res.json(followUps);
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Send a follow-up email for a lead
router.post(
  "/leads/:leadId/follow-up",
  authenticateClient,
  async (req: any, res: any) => {
    try {
      const client = await queries.getClientByApiKey(req.apiKey);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const lead = await queries.getLeadById(parseInt(req.params.leadId));

      if (!lead || lead.clientId !== client.id) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const { customMessage } = req.body;

      // Generate follow-up if not provided
      let followUpBody = customMessage;

      if (!customMessage) {
        // Use the AI-generated suggestion
        followUpBody = await generateFollowUp(
          {
            senderEmail: lead.senderEmail,
            senderName: lead.senderName,
            subject: lead.subject,
            body: lead.body,
          },
          {
            score: lead.score || 0,
            qualification: lead.qualification as any,
            reasoning: "",
            problemIdentified: "",
            solutionFit: "",
            budgetIndicators: "",
            timeline: "",
            decisionMaker: "",
            followUpSuggestion: "",
          }
        );
      }

      // Add signature
      const fullBody = `${followUpBody}

---
Best regards,
${client.name}
${client.email}`;

      // Send the email
      const result = await sendFollowUpEmail(
        client.id,
        lead.senderEmail,
        lead.senderName || "Prospect",
        client.name,
        client.email,
        `Re: ${lead.subject}`,
        fullBody
      );

      if (!result.success) {
        return res.status(500).json({
          error: "Failed to send follow-up",
          details: result.error,
        });
      }

      // Create follow-up record
      const followUp = await queries.createFollowUp({
        leadId: lead.id,
        clientId: client.id,
        emailBody: fullBody,
        sentAt: new Date(),
      });

      res.json({
        success: true,
        followUp,
        messageId: result.messageId,
      });
    } catch (error) {
      console.error("Error sending follow-up:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Mark a follow-up as responded
router.patch(
  "/follow-ups/:followUpId/response",
  authenticateClient,
  async (req: any, res: any) => {
    try {
      const client = await queries.getClientByApiKey(req.apiKey);

      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const { responseBody } = req.body;

      const followUp = await queries.updateFollowUp(
        parseInt(req.params.followUpId),
        {
          responseReceived: true,
          responseBody: responseBody,
          responseReceivedAt: new Date(),
        }
      );

      if (!followUp) {
        return res.status(404).json({ error: "Follow-up not found" });
      }

      // Update lead status to contacted
      const lead = await queries.getLeadById(followUp.leadId);
      if (lead && lead.clientId === client.id) {
        await queries.updateLead(lead.id, {
          status: "contacted",
        });
      }

      res.json(followUp);
    } catch (error) {
      console.error("Error updating follow-up:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
