import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrkxeidlfteoqtrtetfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya3hlaWRsZnRlb3F0cnRldGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk5MzksImV4cCI6MjA4MjU3NTkzOX0.gw2u_0sD77W9deOkPhnwXU7T5BtV-kfqYLbByDL--Mw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cleanPartNo = (str) => String(str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getBasePartNo = (cleanPn) => {
  if (!cleanPn || cleanPn.length < 8) return cleanPn;
  const withoutHyphen = cleanPn.split('-')[0];
  if (withoutHyphen.length >= 10 && withoutHyphen.length <= 15) {
    return withoutHyphen;
  }
  return cleanPn;
};

async function testOptimizedSync() {
  const start = Date.now();
  const targetLoc = 'Vastral';

  // 1. Fetch dispatch_detail and dispatch_status for target location
  const [ddRes, dsRes] = await Promise.all([
    supabase.from('dispatch_detail').select('*').eq('location', targetLoc),
    supabase.from('dispatch_status').select('*').eq('location', targetLoc)
  ]);

  const rawDispatchDetails = ddRes.data || [];
  const rawDispatchStatus = dsRes.data || [];

  console.log(`Extranet dispatches loaded in ${Date.now() - start}ms: dd=${rawDispatchDetails.length}, ds=${rawDispatchStatus.length}`);

  // Extract unique clean part numbers & base part numbers
  const uniquePnSet = new Set();
  rawDispatchDetails.forEach(row => {
    const pn = cleanPartNo(row.part_number || row.part_num);
    if (pn) {
      uniquePnSet.add(pn);
      const basePn = getBasePartNo(pn);
      if (basePn) uniquePnSet.add(basePn);
    }
  });

  const partNumbersList = Array.from(uniquePnSet);
  console.log(`Unique part numbers to fetch in part_master: ${partNumbersList.length}`);

  // 2. Fetch part_master specifically for target location AND for these specific part numbers
  const [pmLocalRes, pmTargetPnRes] = await Promise.all([
    supabase.from('part_master').select('part_num, bin_location, part_desc, location').eq('location', targetLoc),
    supabase.from('part_master').select('part_num, bin_location, part_desc, location').in('part_num', partNumbersList)
  ]);

  console.log(`Part master fetched in ${Date.now() - start}ms: pmLocal=${pmLocalRes.data?.length}, pmTargetPn=${pmTargetPnRes.data?.length}`);

  const pmMapLocal = new Map();
  const pmMapGlobal = new Map();

  const addPmEntry = (map, row) => {
    const pn = cleanPartNo(row.part_num);
    const bin = String(row.bin_location || '').trim();
    const desc = String(row.part_desc || '').trim();
    if (pn) {
      if (!map.has(pn) || (bin && bin !== 'NA' && bin !== '-')) {
        map.set(pn, {
          bin: bin && bin !== '-' ? bin : 'N/A',
          desc: desc || ''
        });
      }
    }
  };

  (pmLocalRes.data || []).forEach(r => addPmEntry(pmMapLocal, r));
  (pmTargetPnRes.data || []).forEach(r => addPmEntry(pmMapGlobal, r));

  const getPartMasterInfo = (cleanPn) => {
    if (pmMapLocal.has(cleanPn)) return pmMapLocal.get(cleanPn);
    if (pmMapGlobal.has(cleanPn)) return pmMapGlobal.get(cleanPn);
    const basePn = getBasePartNo(cleanPn);
    if (basePn && basePn !== cleanPn) {
      if (pmMapLocal.has(basePn)) return pmMapLocal.get(basePn);
      if (pmMapGlobal.has(basePn)) return pmMapGlobal.get(basePn);
    }
    return null;
  };

  const enrichedParts = rawDispatchDetails.map(row => {
    const pn = String(row.part_number || row.part_num || '').trim().toUpperCase();
    const cleanPn = cleanPartNo(pn);
    const invNo = String(row.invoice_no || '').trim();
    if (!pn || !invNo) return null;

    const pmInfo = getPartMasterInfo(cleanPn);
    const desc = pmInfo?.desc || String(row.part_desc || row.description || row.part_name || 'N/A').trim();
    const bin = pmInfo?.bin || 'N/A';

    return {
      partNumber: pn,
      description: desc,
      invoiceNumber: invNo,
      binLocation: bin
    };
  }).filter(Boolean);

  console.log(`Total Enriched Parts: ${enrichedParts.length}`);
  const withDesc = enrichedParts.filter(p => p.description && p.description !== 'N/A');
  const withBin = enrichedParts.filter(p => p.binLocation && p.binLocation !== 'N/A');

  console.log(`With Desc: ${withDesc.length}/${enrichedParts.length}`);
  console.log(`With Bin: ${withBin.length}/${enrichedParts.length}`);
  console.log(`Total Time Elapsed: ${Date.now() - start}ms`);
}

testOptimizedSync().catch(console.error);
