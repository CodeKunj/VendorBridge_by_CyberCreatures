/**
 * Migration: Create quotation_attachments table
 * Run: node migrate_quotation_attachments.js
 */

const https = require('https');

const SUPABASE_URL = 'https://rwwvmaoombjwgzqymsbt.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3d3ZtYW9vbWJqd2d6cXltc2J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDcxOTMxMywiZXhwIjoyMDk2Mjk1MzEzfQ.-Vbh7THBk2IPiE-s59aXS91juFkvC_frb74x3g2RiJo';

const sql = `
CREATE TABLE IF NOT EXISTS public.quotation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  mime_type text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotation_attachments_quotation_id 
  ON public.quotation_attachments (quotation_id);
`;

function runSQL(query) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    // Use Supabase's postgres endpoint via pg-meta
    const pgMetaUrl = new URL(`${SUPABASE_URL.replace('https://', 'https://')}/pg/query`);
    
    const body = JSON.stringify({ query });

    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      port: 443,
      path: '/pg/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Try using the postgres connection directly via pg
async function main() {
  console.log('🔧 Running migration: quotation_attachments table...\n');

  try {
    // Try using the pg package which should be available
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: 'postgresql://postgres:Cybercreature@147@db.rwwvmaoombjwgzqymsbt.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL');

    await client.query(sql);
    console.log('✅ Migration successful: quotation_attachments table created');
    
    // Verify
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'quotation_attachments'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: quotation_attachments table exists in database');
    }

    // Check FK constraint
    const fkResult = await client.query(`
      SELECT constraint_name, table_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'quotation_attachments' AND table_schema = 'public'
    `);
    console.log('\n📋 Table constraints:', fkResult.rows);

    await client.end();
    console.log('\n🎉 Done! PostgREST will reload schema cache automatically.');
    console.log('   Restart your server if the error persists.');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

main();
