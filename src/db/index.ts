import { drizzle } from "drizzle-orm/mysql2/driver";
import mysql from "mysql2/promise";
import * as schema from "./schema";

let dbInstance: any = null;

export async function initializeDatabase() {
  if (dbInstance) return dbInstance;

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lead_qualifier_pro",
  });

  dbInstance = drizzle(connection, { schema, mode: "default" });

  console.log("[Database] Connected successfully");
  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return dbInstance;
}

export { dbInstance as db };
