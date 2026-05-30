import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let dbInstance: any = null;

export async function initializeDatabase() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Create PostgreSQL connection
  const client = postgres(databaseUrl, {
    ssl: process.env.NODE_ENV === "production" ? "require" : false,
    max: 10, // Connection pool size
  });

  dbInstance = drizzle(client, { schema });

  console.log("[Database] Connected to PostgreSQL successfully");
  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return dbInstance;
}

export { dbInstance as db };
