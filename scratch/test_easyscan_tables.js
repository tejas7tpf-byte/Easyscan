import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrkxeidlfteoqtrtetfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya3hlaWRsZnRlb3F0cnRldGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk5MzksImV4cCI6MjA4MjU3NTkzOX0.gw2u_0sD77W9deOkPhnwXU7T5BtV-kfqYLbByDL--Mw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEasyScanTables() {
  console.log('--- Testing table: shipments ---');
  const { data: sData, error: sErr } = await supabase.from('shipments').select('*').limit(5);
  console.log('shipments error:', sErr);
  console.log('shipments sample:', sData);

  console.log('--- Testing table: parts ---');
  const { data: pData, error: pErr } = await supabase.from('parts').select('*').limit(5);
  console.log('parts error:', pErr);
  console.log('parts sample:', pData);

  console.log('--- Testing table: scans ---');
  const { data: scData, error: scErr } = await supabase.from('scans').select('*').limit(5);
  console.log('scans error:', scErr);

  console.log('--- Testing table: selected_invoices ---');
  const { data: selData, error: selErr } = await supabase.from('selected_invoices').select('*').limit(5);
  console.log('selected_invoices error:', selErr);
}

testEasyScanTables().catch(console.error);
