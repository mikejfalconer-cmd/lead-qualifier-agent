import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase, getDatabase } from "../src/db/index";
import { startEmailProcessorLoop } from "../src/services/emailProcessor";
import { clients, leads, followUps } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
function authenticateClient(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  (req as any).apiKey = apiKey;
  next();
}

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// CLIENT ENDPOINTS

// Get client info
app.get("/api/clients/me", authenticateClient, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const client = await db.query.clients.findFirst({
      where: eq(clients.apiKey, (req as any).apiKey),
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json({
      id: client.id,
      name: client.name,
      email: client.email,
      forwardingEmail: client.forwardingEmail,
      subscriptionStatus: client.subscriptionStatus,
      createdAt: client.createdAt,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// LEAD ENDPOINTS

// Get all leads for a client
app.get("/api/leads", authenticateClient, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const client = await db.query.clients.findFirst({
      where: eq(clients.apiKey, (req as any).apiKey),
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const qualification = (req.query.qualification as string) || undefined;
    const status = (req.query.status as string) || undefined;

    const filters: any[] = [eq(leads.clientId, client.id)];
    if (qualification) {
      filters.push(eq(leads.qualification, qualification as any));
    }
    if (status) {
      filters.push(eq(leads.status, status as any));
    }

    const clientLeads = await db
      .select()
      .from(leads)
      .where(filters.length > 1 ? and(...filters) : filters[0]);

    res.json(clientLeads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get lead details
app.get("/api/leads/:leadId", authenticateClient, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const client = await db.query.clients.findFirst({
      where: eq(clients.apiKey, (req as any).apiKey),
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, parseInt((req.params.leadId as string) || "0")), eq(leads.clientId, client.id)),
    });

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const followUpRecords = await db.query.followUps.findMany({
      where: eq(followUps.leadId, lead.id),
    });

    res.json({
      ...lead,
      followUps: followUpRecords,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update lead status
app.patch("/api/leads/:leadId", authenticateClient, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const client = await db.query.clients.findFirst({
      where: eq(clients.apiKey, (req as any).apiKey),
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const { status, notes } = req.body;

    const lead = await db.query.leads.findFirst({
      where: and(eq(leads.id, parseInt((req.params.leadId as string) || "0")), eq(leads.clientId, client.id)),
    });

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    await db
      .update(leads)
      .set({
        status: status || lead.status,
        notes: notes || lead.notes,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ANALYTICS ENDPOINTS

// Get lead statistics
app.get("/api/analytics/summary", authenticateClient, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const client = await db.query.clients.findFirst({
      where: eq(clients.apiKey, (req as any).apiKey),
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const clientLeads = await db.query.leads.findMany({
      where: eq(leads.clientId, client.id),
    });

    const stats = {
      totalLeads: clientLeads.length,
      hotLeads: clientLeads.filter((l: any) => l.qualification === "hot").length,
      warmLeads: clientLeads.filter((l: any) => l.qualification === "warm").length,
      coldLeads: clientLeads.filter((l: any) => l.qualification === "cold").length,
      convertedLeads: clientLeads.filter((l: any) => l.status === "converted").length,
      averageScore:
        clientLeads.length > 0
          ? Math.round(
              clientLeads.reduce((sum: number, l: any) => sum + (l.score || 0), 0) /
                clientLeads.length
            )
          : 0,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// STRIPE WEBHOOK
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );

    if (event.type === "customer.subscription.updated") {
      console.log(`[Stripe] Subscription updated: ${(event.data.object as any).id}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).send("Webhook error");
  }
});

// ERROR HANDLER
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize database and start email processor on first request
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    try {
      await initializeDatabase();
      console.log("[Server] Database initialized");
      initialized = true;
    } catch (error) {
      console.error("[Server] Initialization error:", error);
      throw error;
    }
  }
}

// Export the Express app as a Vercel handler
export default async (req: Request, res: Response) => {
  await ensureInitialized();
  app(req, res);
};
