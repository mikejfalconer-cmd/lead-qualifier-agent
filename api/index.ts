import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "Lead Qualifier Pro API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Database connection test
app.get("/api/db-status", async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({
        error: "DATABASE_URL not configured",
      });
    }

    res.json({
      status: "configured",
      database: dbUrl.includes("neon") ? "PostgreSQL (Neon)" : "Unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Database check failed",
      message: (error as Error).message,
    });
  }
});

// Placeholder client endpoints
app.get("/api/clients/me", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  res.json({
    message: "Client endpoint - database integration coming soon",
    apiKey: "***",
  });
});

// Placeholder leads endpoints
app.get("/api/leads", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey) {
    return res.status(401).json({ error: "Missing API key" });
  }

  res.json({
    leads: [],
    message: "Leads endpoint - database integration coming soon",
  });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Export as Vercel handler - compatible with both serverless and traditional Node
export default (req: any, res: any) => {
  return app(req, res);
};
