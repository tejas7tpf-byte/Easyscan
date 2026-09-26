import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrkxeidlfteoqtrtetfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya3hlaWRsZnRlb3F0cnRldGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk5MzksImV4cCI6MjA4MjU3NTkzOX0.gw2u_0sD77W9deOkPhnwXU7T5BtV-kfqYLbByDL--Mw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const fetchAllRows = async (buildQueryFn) => {
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let keepFetching = true;

  const { data: firstChunk, error: firstErr } = await buildQueryFn().range(0, pageSize - 1);
  if (firstErr) {
    console.error('firstErr:', firstErr);
    throw firstErr;
  }
  if (!firstChunk || firstChunk.length === 0) return [];
  allRows.push(...firstChunk);
  return allRows;
};

async function test() {
  console.log('--- Testing dispatch_detail ---');
  const dd = await fetchAllRows(() => supabase.from('dispatch_detail').select('*').eq('location', 'Vastral'));
  console.log('dd len:', dd.length);

  console.log('--- Testing dispatch_status ---');
  const ds = await fetchAllRows(() => supabase.from('dispatch_status').select('*').eq('location', 'Vastral'));
  console.log('ds len:', ds.length);
}

test().catch(console.error);
