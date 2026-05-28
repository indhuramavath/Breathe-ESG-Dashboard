import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema/index.ts";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";


const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

let db: any;
let pool: any = null;

if (dbUrl) {
  pool = new Pool({ connectionString: dbUrl });
  db = drizzlePg(pool, { schema });
} else {
  // Use PGlite local database
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  const persistPath = path.resolve(__dirname, "../../../.local/pglite-data");
  console.log(`Initializing PGlite local database at: ${persistPath}`);

  // Ensure the persistence directory exists (Windows mkdir ENOENT fix)
  fs.mkdirSync(persistPath, { recursive: true });

  const client = new PGlite(persistPath);
  db = drizzlePglite({ client, schema });

  
  // Bootstrap tables
  initPgliteTables(client).catch(err => {
    console.error("Failed to initialize PGlite tables:", err);
  });
}

async function initPgliteTables(client: PGlite) {
  try {
    // Create companies table
    await client.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        is_sample BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create data_uploads table
    await client.exec(`
      CREATE TABLE IF NOT EXISTS data_uploads (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        total_rows INTEGER NOT NULL DEFAULT 0,
        imported_rows INTEGER NOT NULL DEFAULT 0,
        error_rows INTEGER NOT NULL DEFAULT 0,
        error_log TEXT,
        uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create emission_records table
    await client.exec(`
      CREATE TABLE IF NOT EXISTS emission_records (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        upload_id INTEGER REFERENCES data_uploads(id) ON DELETE SET NULL,
        source_type TEXT NOT NULL,
        scope INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        co2_kg REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        approved_by TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        raw_data JSONB NOT NULL DEFAULT '{}',
        imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("PGlite database tables initialized successfully.");
  } catch (error) {
    console.error("Error creating tables in PGlite:", error);
    throw error;
  }
}

export { db, pool };
export * from "./schema/index.ts";
