const path = require('path');
const dotenv = require('d:\\Hackathon_projects\\ODDO_Hckthon\\VendorBridge_by_CyberCreatures\\server\\node_modules\\dotenv');
dotenv.config({ path: 'd:\\Hackathon_projects\\ODDO_Hckthon\\VendorBridge_by_CyberCreatures\\server\\.env' });
const { createClient } = require('d:\\Hackathon_projects\\ODDO_Hckthon\\VendorBridge_by_CyberCreatures\\server\\node_modules\\@supabase\\supabase-js');

console.log('ENV Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Present (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Missing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function test() {
  try {
    console.log('Attempting to query "users" table...');
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('Supabase error returned:', error);
    } else {
      console.log('Supabase query succeeded. Data:', data);
    }
  } catch (err) {
    console.error('Unhandled catch-block error:', err);
  }
}

test();