import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrkxeidlfteoqtrtetfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ya3hlaWRsZnRlb3F0cnRldGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTk5MzksImV4cCI6MjA4MjU3NTkzOX0.gw2u_0sD77W9deOkPhnwXU7T5BtV-kfqYLbByDL--Mw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const normalizeLocationName = (loc) => {
  if (!loc) return 'Vastral';
  const str = String(loc).trim();
  const lower = str.toLowerCase();
  if (lower.includes('vastral')) return 'Vastral';
  if (lower.includes('bopal')) return 'Bopal';
  if (lower.includes('shela')) return 'Shela';
  if (lower.includes('surat')) return 'Surat';
  if (lower.includes('nexa')) return 'Nexa';
  if (lower.includes('changodar')) return 'Changodar';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const cleanPartNo = (str) => String(str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

const getBasePartNo = (cleanPn) => {
  if (!cleanPn || cleanPn.length < 8) return cleanPn;
  const withoutHyphen = cleanPn.split('-')[0];
  if (withoutHyphen.length >= 10 && withoutHyphen.length <= 15) {
    return withoutHyphen;
  }
  return cleanPn;
};

const isReceiveDateCompleted = (val) => {
  if (!val) return false;
  const str = val.toString().trim().toUpperCase();
  if (!str || str === '-' || str.startsWith('DD-MM') || str === 'NULL') return false;
  if (str === 'ADV' || str.includes('ADV')) return false;
  return true;
};

async function directSync(locationName = 'Vastral') {
  const targetLoc = normalizeLocationName(locationName);

  // 1. Query dispatches directly
  let { data: rawDispatchDetails, error: ddErr } = await supabase
    .from('dispatch_detail')
    .select('*')
    .eq('location', targetLoc);

  let { data: rawDispatchStatus, error: dsErr } = await supabase
    .from('dispatch_status')
    .select('*')
    .eq('location', targetLoc);

  if (ddErr) console.error('ddErr:', ddErr);
  if (dsErr) console.error('dsErr:', dsErr);

  console.log(`Direct fetch: dd=${rawDispatchDetails?.length}, ds=${rawDispatchStatus?.length}`);

  // Fallback if eq returned 0 rows
  if (!rawDispatchDetails || rawDispatchDetails.length === 0) {
    const { data: fallbackDd } = await supabase
      .from('dispatch_detail')
      .select('*')
      .ilike('location', `%${targetLoc}%`);
    rawDispatchDetails = fallbackDd || [];
  }

  if (!rawDispatchStatus || rawDispatchStatus.length === 0) {
    const { data: fallbackDs } = await supabase
      .from('dispatch_status')
      .select('*')
      .ilike('location', `%${targetLoc}%`);
    rawDispatchStatus = fallbackDs || [];
  }

  console.log(`After fallback check: dd=${rawDispatchDetails.length}, ds=${rawDispatchStatus.length}`);

  // Extract unique clean part numbers
  const uniquePnSet = new Set();
  (rawDispatchDetails || []).forEach(row => {
    const pn = cleanPartNo(row.part_number || row.part_num);
    if (pn) {
      uniquePnSet.add(pn);
      const basePn = getBasePartNo(pn);
      if (basePn) uniquePnSet.add(basePn);
    }
  });

  const targetPartNumbers = Array.from(uniquePnSet);

  // 2. Fetch Part Master (Target location + Dispatched Part Numbers)
  const [pmLocalRes, pmGlobalRes] = await Promise.all([
    supabase.from('part_master').select('part_num, bin_location, part_desc, location').eq('location', targetLoc).limit(20000),
    targetPartNumbers.length > 0 ? (
      supabase.from('part_master').select('part_num, bin_location, part_desc, location').in('part_num', targetPartNumbers)
    ) : Promise.resolve({ data: [] })
  ]);

  const pmLocal = pmLocalRes.data || [];
  const pmGlobal = pmGlobalRes.data || [];

  const pmMapLocal = new Map();
  const pmMapGlobal = new Map();

  const addPmEntry = (map, row) => {
    const pn = cleanPartNo(row.part_num);
    const bin = String(row.bin_location || '').trim();
    const desc = String(row.part_desc || row.description || row.part_name || '').trim();
    if (pn) {
      if (!map.has(pn) || (bin && bin !== 'NA' && bin !== '-' && bin !== 'NOBIN')) {
        map.set(pn, {
          bin: bin && bin !== '-' ? bin : 'N/A',
          desc: desc || ''
        });
      }
    }
  };

  pmLocal.forEach(r => addPmEntry(pmMapLocal, r));
  pmGlobal.forEach(r => addPmEntry(pmMapGlobal, r));

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

  // 3. Jobcards
  const { data: jcData } = await supabase
    .from('jobcards')
    .select('part_number, vehicle_no, model, total_demand, status, receive_date, issue_date, location')
    .eq('location', targetLoc)
    .limit(10000);

  const urgentMap = new Map();
  (jcData || []).forEach(row => {
    const isReceived = isReceiveDateCompleted(row.receive_date);
    const isIssued = isReceiveDateCompleted(row.issue_date);
    const st = String(row.status || '').trim().toLowerCase();

    if (isReceived || isIssued || st.includes('receive') || st.includes('issued') || st.includes('completed')) {
      return;
    }

    const pn = cleanPartNo(row.part_number);
    const vehNo = String(row.vehicle_no || '').trim();
    const model = String(row.model || '').trim();
    const qty = String(row.total_demand || 1);

    if (pn && vehNo) {
      if (!urgentMap.has(pn)) urgentMap.set(pn, []);
      const existing = urgentMap.get(pn);
      const isDuplicate = existing.some(item => item.vehicleNo === vehNo && item.model === model);
      if (!isDuplicate) {
        existing.push({ vehicleNo: vehNo, model, qty });
      }
    }
  });

  // 4. Enrich parts
  const enrichedParts = (rawDispatchDetails || []).map(row => {
    const pn = String(row.part_number || row.part_num || '').trim().toUpperCase();
    const cleanPn = cleanPartNo(pn);
    const invNo = String(row.invoice_no || '').trim();
    if (!pn || !invNo) return null;

    const containerNo = String(row.container_no || row.box_no || '').trim();
    const shipLPNo = String(row.ship_lp_no || '').trim();
    const qty = Number(row.dispatch_qty || row.qty || 0);

    const pmInfo = getPartMasterInfo(cleanPn);
    const desc = pmInfo?.desc || String(row.part_desc || row.description || row.part_name || 'N/A').trim();
    const bin = pmInfo?.bin || 'N/A';

    const isUrgent = urgentMap.has(cleanPn) || (getBasePartNo(cleanPn) && urgentMap.has(getBasePartNo(cleanPn)));
    const urgentDetails = urgentMap.get(cleanPn) || urgentMap.get(getBasePartNo(cleanPn)) || [];

    return {
      partNumber: pn,
      description: desc,
      invoiceNumber: invNo,
      containerNo: containerNo,
      shipLPNo: shipLPNo,
      qty: qty,
      binLocation: bin,
      gatePass: String(row.gate_pass || '').trim(),
      isUrgent: isUrgent,
      urgentDetails: urgentDetails
    };
  }).filter(Boolean);

  // 5. Process shipments
  const shipments = (rawDispatchStatus || []).map(row => {
    const invNo = String(row.invoice_no || row.fin_ctrl_no || '').trim();
    if (!invNo) return null;

    const shipmentParts = enrichedParts.filter(p => p.invoiceNumber === invNo);
    const boxSet = new Set();
    shipmentParts.forEach(p => {
      const boxId = p.containerNo || p.shipLPNo;
      if (boxId) boxSet.add(boxId);
    });

    return {
      invoiceNo: invNo,
      trackingNo: String(row.tracking_no || '').trim(),
      truckNo: String(row.truck_no || '').trim(),
      gatePass: String(row.gate_pass_no || row.gate_pass || '').trim(),
      transporter: String(row.transporter || '').trim(),
      location: String(row.location || targetLoc).trim(),
      totalBoxes: boxSet.size,
      boxes: Array.from(boxSet),
      totalParts: shipmentParts.reduce((acc, p) => acc + p.qty, 0)
    };
  }).filter(Boolean);

  return {
    shipments,
    parts: enrichedParts,
    totalPartsCount: enrichedParts.length,
    totalShipmentsCount: shipments.length
  };
}

directSync('Vastral').then(res => {
  console.log('Result:', { totalPartsCount: res.totalPartsCount, totalShipmentsCount: res.totalShipmentsCount });
}).catch(console.error);
