import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase, getDatabase } from "./db/index";
import { startEmailProcessorLoop } from "./services/emailProcessor";
import { startRetrainingScheduler } from "./services/retrainingScheduler";
import { clients, leads, followUps } from "./db/schema";
import { eq, and } from "drizzle-orm";
import Stripe from "stripe";
import emailRoutes from "./routes/email";
import webhookRoutes from "./routes/webhooks";
import dashboardRoutes from "./routes/dashboard";
import selfImprovementRoutes from "./routes/selfImprovement";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null; // Stripe is optional for testing

// Middleware
app.use(cors());
app.use(express.json());

// Email routes
app.use("/api/email", emailRoutes);

// Webhook routes (secure token-based endpoints)
app.use("/api/webhooks", webhookRoutes);

// Dashboard routes (client API)
app.use("/api", dashboardRoutes);

// Self-improvement routes
app.use("/api/self-improvement", selfImprovementRoutes);

// Authentication routes
app.use("/api/auth", authRoutes);

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

// API root
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Lead Qualifier Pro API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      clients: "GET /api/clients/me (requires X-API-Key)",
      leads: "GET /api/leads (requires X-API-Key)",
      leadDetail: "GET /api/leads/:leadId (requires X-API-Key)",
      updateLead: "PATCH /api/leads/:leadId (requires X-API-Key)",
      analytics: "GET /api/analytics/summary (requires X-API-Key)",
      emailReceive: "POST /api/email/receive",
      emailAddress: "GET /api/email/address/:clientId",
      emailVerify: "POST /api/email/verify",
      emailLogs: "GET /api/email/logs/:clientId",
    },
  });
});

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

// TEST ENDPOINTS (Development only)

// Create test client
app.post("/api/test/create-client", async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { name, email, forwardingEmail } = req.body;

    if (!name || !email || !forwardingEmail) {
      res.status(400).json({ error: "Missing required fields: name, email, forwardingEmail" });
      return;
    }

    const result = await db
      .insert(clients)
      .values({
        name,
        email,
        forwardingEmail,
        apiKey: `test_key_${Math.random().toString(36).substr(2, 9)}`,
      })
      .returning();

    res.json({
      success: true,
      client: result[0],
      message: `Client created with ID: ${result[0].id}`,
    });
  } catch (error) {
    console.error("Error creating test client:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
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
  if (!stripe) {
    res.status(400).json({ error: "Stripe not configured" });
    return;
  }
  
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

// START SERVER
async function start() {
  try {
    await initializeDatabase();
    console.log("[Server] Database initialized");

    const processorInterval = parseInt(process.env.EMAIL_PROCESSOR_INTERVAL_MS || "300000");
    startEmailProcessorLoop(processorInterval);
    
    // Start model retraining scheduler (every 6 hours)
    startRetrainingScheduler(6);
    console.log("[Server] Email processor started");

    const port = parseInt(process.env.PORT || "3000");
    app.listen(port, () => {
      console.log(`[Server] Listening on port ${port}`);
    });
  } catch (error) {
    console.error("[Server] Startup error:", error);
    process.exit(1);
  }
}

start();
