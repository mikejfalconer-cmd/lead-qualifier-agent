import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Use compiled dist files instead of src
const initializeDatabase = require("../dist/src/db/index").initializeDatabase;
const queries = require("../dist/src/db/queries");
const followUpRouter = require("../dist/src/routes/followUp").default;

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on first request
let dbInitialized = false;

async function ensureDbInitialized() {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log("[API] Database initialized");
    } catch (error) {
      console.error("[API] Database initialization error:", error);
      throw error;
    }
  }
}

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// Authentication middleware
function authenticateClient(req: any, res: any, next: any): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  req.apiKey = apiKey;
  next();
}

// ============ HEALTH CHECK ============

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ============ CLIENT ENDPOINTS ============

app.get("/api/clients/me", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
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

// ============ LEAD ENDPOINTS ============

app.get("/api/leads", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const qualification = (req.query.qualification as string) || undefined;
    const status = (req.query.status as string) || undefined;

    const clientLeads = await queries.getLeadsByClientId(client.id, {
      qualification,
      status,
    });

    res.json(clientLeads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/leads/:leadId", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const lead = await queries.getLeadById(parseInt(req.params.leadId));

    if (!lead || lead.clientId !== client.id) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/leads/:leadId", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const lead = await queries.getLeadById(parseInt(req.params.leadId));

    if (!lead || lead.clientId !== client.id) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const { status, notes, qualification, score } = req.body;

    const updated = await queries.updateLead(lead.id, {
      status: status || lead.status,
      notes: notes || lead.notes,
      qualification: qualification || lead.qualification,
      score: score !== undefined ? score : lead.score,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ FOLLOW-UP ENDPOINTS ============

app.use("/api", followUpRouter);

// ============ ANALYTICS ENDPOINTS ============

app.get("/api/analytics/summary", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const stats = await queries.getLeadStats(client.id);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/analytics/email-logs", authenticateClient, async (req: any, res: any) => {
  try {
    const client = await queries.getClientByApiKey(req.apiKey);

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    const type = (req.query.type as string) || undefined;
    const logs = await queries.getEmailLogsByClientId(client.id, type);

    res.json(logs);
  } catch (error) {
    console.error("Error fetching email logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ ERROR HANDLER ============

app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Export as Vercel handler
export default (req: any, res: any) => {
  return app(req, res);
};
