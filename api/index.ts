import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database connection
let db: any = null;

async function initializeDatabase() {
  if (db) return db;

  try {
    // Dynamic import for postgres
    const postgresModule = await import("postgres");
    const postgres = postgresModule.default;
    const sql = postgres(process.env.DATABASE_URL || "", {
      ssl: "require",
    });
    db = sql;
    console.log("[API] Database connected");
    return sql;
  } catch (error) {
    console.error("[API] Database connection failed:", error);
    throw error;
  }
}

// ============ HEALTH CHECK ============

app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Lead Qualifier Pro API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      test: "/api/test",
      documentation: "/api/docs",
      clientProfile: "GET /api/clients/me (requires X-API-Key)",
      leads: "GET /api/leads (requires X-API-Key)",
      leadDetail: "GET /api/leads/:leadId (requires X-API-Key)",
      updateLead: "PATCH /api/leads/:leadId (requires X-API-Key)",
      analytics: "GET /api/analytics/summary (requires X-API-Key)",
      emailLogs: "GET /api/analytics/email-logs (requires X-API-Key)",
    },
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  });
});

app.get("/api/docs", (req: Request, res: Response) => {
  res.json({
    name: "Lead Qualifier Pro API",
    version: "1.0.0",
    description: "AI-powered lead qualification and follow-up SaaS system",
    baseUrl: process.env.API_URL || "https://lead-qualifier-agent-production-dabf.up.railway.app",
    authentication: "All endpoints (except /health, /, /api/test) require X-API-Key header",
    endpoints: [
      {
        method: "GET",
        path: "/",
        description: "API root - returns available endpoints",
        authentication: false,
      },
      {
        method: "GET",
        path: "/health",
        description: "Health check endpoint",
        authentication: false,
      },
      {
        method: "GET",
        path: "/api/test",
        description: "Test endpoint",
        authentication: false,
      },
      {
        method: "GET",
        path: "/api/docs",
        description: "API documentation",
        authentication: false,
      },
      {
        method: "GET",
        path: "/api/clients/me",
        description: "Get current client profile",
        authentication: true,
      },
      {
        method: "GET",
        path: "/api/leads",
        description: "Get all leads for client",
        authentication: true,
      },
      {
        method: "GET",
        path: "/api/leads/:leadId",
        description: "Get specific lead with follow-ups",
        authentication: true,
      },
      {
        method: "PATCH",
        path: "/api/leads/:leadId",
        description: "Update lead status, notes, qualification, or score",
        authentication: true,
      },
      {
        method: "GET",
        path: "/api/analytics/summary",
        description: "Get analytics summary for client",
        authentication: true,
      },
      {
        method: "GET",
        path: "/api/analytics/email-logs",
        description: "Get email logs for client",
        authentication: true,
      },
    ],
  });
});

app.get("/api/test", (req: Request, res: Response) => {
  res.json({
    message: "Lead Qualifier Pro API is running!",
    timestamp: new Date().toISOString(),
  });
});

// ============ AUTHENTICATION MIDDLEWARE ============

function authenticateClient(req: any, res: Response, next: NextFunction): void {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    res.status(401).json({ error: "Missing API key" });
    return;
  }

  req.apiKey = apiKey;
  next();
}

// ============ CLIENT ENDPOINTS ============

app.get("/api/clients/me", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Query client by API key
    const result = await sql`
      SELECT id, name, email, forwarding_email, subscription_status, created_at
      FROM clients
      WHERE api_key = ${req.apiKey}
      LIMIT 1
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const client = result[0];
    res.json({
      id: client.id,
      name: client.name,
      email: client.email,
      forwardingEmail: client.forwarding_email,
      subscriptionStatus: client.subscription_status,
      createdAt: client.created_at,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ LEAD ENDPOINTS ============

app.get("/api/leads", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Get client
    const clientResult = await sql`
      SELECT id FROM clients WHERE api_key = ${req.apiKey} LIMIT 1
    `;

    if (clientResult.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientId = clientResult[0].id;

    // Get leads
    const leads = await sql`
      SELECT * FROM leads WHERE client_id = ${clientId} ORDER BY created_at DESC
    `;

    res.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/leads/:leadId", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Get client
    const clientResult = await sql`
      SELECT id FROM clients WHERE api_key = ${req.apiKey} LIMIT 1
    `;

    if (clientResult.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientId = clientResult[0].id;
    const leadId = parseInt(req.params.leadId);

    // Get lead
    const leads = await sql`
      SELECT * FROM leads WHERE id = ${leadId} AND client_id = ${clientId}
    `;

    if (leads.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get follow-ups
    const followUps = await sql`
      SELECT * FROM follow_ups WHERE lead_id = ${leadId} ORDER BY sent_at DESC
    `;

    res.json({
      ...leads[0],
      followUps,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/leads/:leadId", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Get client
    const clientResult = await sql`
      SELECT id FROM clients WHERE api_key = ${req.apiKey} LIMIT 1
    `;

    if (clientResult.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientId = clientResult[0].id;
    const leadId = parseInt(req.params.leadId);
    const { status, notes, qualification, score } = req.body;

    // Update lead
    const updated = await sql`
      UPDATE leads 
      SET 
        status = COALESCE(${status}, status),
        notes = COALESCE(${notes}, notes),
        qualification = COALESCE(${qualification}, qualification),
        score = COALESCE(${score}, score),
        updated_at = NOW()
      WHERE id = ${leadId} AND client_id = ${clientId}
      RETURNING *
    `;

    if (updated.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ ANALYTICS ENDPOINTS ============

app.get("/api/analytics/summary", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Get client
    const clientResult = await sql`
      SELECT id FROM clients WHERE api_key = ${req.apiKey} LIMIT 1
    `;

    if (clientResult.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientId = clientResult[0].id;

    // Get statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN qualification = 'hot' THEN 1 END) as hot_leads,
        COUNT(CASE WHEN qualification = 'warm' THEN 1 END) as warm_leads,
        COUNT(CASE WHEN qualification = 'cold' THEN 1 END) as cold_leads,
        COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_leads,
        COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_leads,
        ROUND(AVG(score)::numeric, 2) as average_score
      FROM leads
      WHERE client_id = ${clientId}
    `;

    const result = stats[0];

    res.json({
      totalLeads: parseInt(result.total_leads),
      hotLeads: parseInt(result.hot_leads),
      warmLeads: parseInt(result.warm_leads),
      coldLeads: parseInt(result.cold_leads),
      convertedLeads: parseInt(result.converted_leads),
      contactedLeads: parseInt(result.contacted_leads),
      lostLeads: parseInt(result.lost_leads),
      averageScore: parseFloat(result.average_score) || 0,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/analytics/email-logs", authenticateClient, async (req: any, res: Response) => {
  try {
    const sql = await initializeDatabase();

    // Get client
    const clientResult = await sql`
      SELECT id FROM clients WHERE api_key = ${req.apiKey} LIMIT 1
    `;

    if (clientResult.length === 0) {
      return res.status(404).json({ error: "Client not found" });
    }

    const clientId = clientResult[0].id;

    // Get email logs
    const logs = await sql`
      SELECT * FROM email_logs 
      WHERE client_id = ${clientId}
      ORDER BY timestamp DESC
      LIMIT 100
    `;

    res.json(logs);
  } catch (error) {
    console.error("Error fetching email logs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============ ERROR HANDLING ============

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[API] SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("[API] Server closed");
    process.exit(0);
  });
});

// Export for Vercel (if needed)
export default app;
