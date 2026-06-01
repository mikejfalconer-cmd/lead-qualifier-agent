import postgres from "postgres";

const sql = postgres("postgresql://neondb_owner:npg_X5yT7SQglwMD@ep-wispy-salad-apra9k5e-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

try {
  const tables = await sql`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  
  console.log("📊 Existing tables in database:");
  if (tables.length === 0) {
    console.log("  (No tables found)");
  } else {
    tables.forEach(t => console.log(`  ✓ ${t.table_name}`));
  }
  
  await sql.end();
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
