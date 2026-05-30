import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_X5yT7SQglwMD@ep-wispy-salad-apra9k5e-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
  console.log('[Migration] Connecting to database...');
  
  const sql = postgres(connectionString, {
    ssl: 'require',
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('[Migration] Running schema migration...');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('[Migration] ✅ Schema migration completed successfully!');
    
    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('[Migration] Created tables:');
    tables.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('[Migration] ❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
