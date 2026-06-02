import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

let dbInstance: any = null;

export async function initializeDatabase() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse MySQL connection string - handle URL with SSL in query string
  // Remove ?ssl=... from the URL before parsing
  const cleanUrl = databaseUrl.split('?')[0];
  const url = new URL(cleanUrl);
  
  const pool = mysql.createPool({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: { rejectUnauthorized: false }
  });

  dbInstance = drizzle(pool, { schema, mode: "default" });

  console.log("[Database] Connected to MySQL/TiDB successfully");
  return dbInstance;
}

export function getDatabase() {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return dbInstance;
}

export { dbInstance as db };
