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
  if (firstErr) throw firstErr;
  if (!firstChunk || firstChunk.length === 0) return [];
  allRows.push(...firstChunk);

  if (firstChunk.length < pageSize) return allRows;

  let currentOffset = pageSize;
  while (keepFetching) {
    const batchPromises = [0, 1, 2, 3, 4].map(idx => {
      const start = currentOffset + idx * pageSize;
      const end = start + pageSize - 1;
      return buildQueryFn().range(start, end).then(res => {
        if (res.error) return [];
        return res.data || [];
      }).catch(() => []);
    });

    const batchResults = await Promise.all(batchPromises);
    let gotData = false;
    for (const chunk of batchResults) {
      if (chunk && chunk.length > 0) {
        allRows.push(...chunk);
        gotData = true;
        if (chunk.length < pageSize) {
          keepFetching = false;
          break;
        }
      } else {
        keepFetching = false;
        break;
      }
    }
    if (!gotData) keepFetching = false;
    currentOffset += 5 * pageSize;
  }

  return allRows;
};

async function runTest() {
  const targetLoc = 'Vastral';
  console.log('Testing fetchAllRows for dispatch_status...');
  const ds = await fetchAllRows(() => supabase.from('dispatch_status').select('*').eq('location', targetLoc));
  console.log('dispatch_status count:', ds.length);

  console.log('Testing fetchAllRows for dispatch_detail...');
  const dd = await fetchAllRows(() => supabase.from('dispatch_detail').select('*').eq('location', targetLoc));
  console.log('dispatch_detail count:', dd.length);
}

runTest().catch(console.error);
