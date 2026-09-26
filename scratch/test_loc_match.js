import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrkxeidlfteoqtrtetfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya3hlaWRsZnRlb3F0cnRldGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk5MzksImV4cCI6MjA4MjU3NTkzOX0.gw2u_0sD77W9deOkPhnwXU7T5BtV-kfqYLbByDL--Mw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLocQueries() {
  const loc = 'Vastral';

  const { data: dd1 } = await supabase.from('dispatch_detail').select('*').eq('location', loc);
  console.log(`eq('location', 'Vastral'): ${dd1?.length}`);

  const { data: dd2 } = await supabase.from('dispatch_detail').select('*').ilike('location', '%Vastral%');
  console.log(`ilike('location', '%Vastral%'): ${dd2?.length}`);

  const { data: ds1 } = await supabase.from('dispatch_status').select('*').eq('location', loc);
  console.log(`dispatch_status eq('location', 'Vastral'): ${ds1?.length}`);

  const { data: ds2 } = await supabase.from('dispatch_status').select('*').ilike('location', '%Vastral%');
  console.log(`dispatch_status ilike('location', '%Vastral%'): ${ds2?.length}`);
}

testLocQueries().catch(console.error);
