import { supabase } from './supabaseClient';

/**
 * Direct Live Sync from Bodyshop Tracking Supabase Database
 * Fetches Extranet Dispatches, Part Master Bin Locations, and PNA/Jobcards
 * directly from Bodyshop tables (dispatch_status, dispatch_detail, part_master, jobcards).
 * 
 * @param {string} locationName - Target location (e.g. 'Vastral', 'SG Highway', etc.)
 */
export const fetchBodyshopLiveData = async (locationName = 'Vastral') => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  try {
    // 1. Fetch Part Master for Bin Locations
    const { data: pmData, error: pmErr } = await supabase
      .from('part_master')
      .select('part_num, bin_location')
      .eq('location', locationName);

    if (pmErr) console.warn('[BodyshopSync] Part Master fetch warning:', pmErr);

    const binMap = new Map();
    (pmData || []).forEach(row => {
      const pn = (row.part_num || '').trim().toUpperCase();
      const bin = (row.bin_location || '').trim();
      if (pn && bin) binMap.set(pn, bin);
    });

    // 2. Fetch PNA / Jobcards for Urgent Vehicle tracking
    const { data: jcData, error: jcErr } = await supabase
      .from('jobcards')
      .select('part_number, vehicle_no, model, total_demand, status')
      .eq('location', locationName);

    if (jcErr) console.warn('[BodyshopSync] Jobcards fetch warning:', jcErr);

    const urgentMap = new Map();
    (jcData || []).forEach(row => {
      const pn = (row.part_number || '').trim().toUpperCase();
      const vehNo = (row.vehicle_no || '').trim();
      const model = (row.model || '').trim();
      const qty = String(row.total_demand || 1);

      if (pn) {
        if (!urgentMap.has(pn)) urgentMap.set(pn, []);
        const existing = urgentMap.get(pn);
        const isDuplicate = existing.some(item => item.vehicleNo === vehNo && item.model === model);
        if (!isDuplicate) {
          existing.push({ vehicleNo: vehNo, model, qty });
        }
      }
    });

    // 3. Fetch Dispatch Detail & Dispatch Status from Extranet
    const [ddRes, dsRes] = await Promise.all([
      supabase.from('dispatch_detail').select('*').eq('location', locationName),
      supabase.from('dispatch_status').select('*').eq('location', locationName)
    ]);

    if (ddRes.error) console.warn('[BodyshopSync] Dispatch Detail fetch warning:', ddRes.error);
    if (dsRes.error) console.warn('[BodyshopSync] Dispatch Status fetch warning:', dsRes.error);

    const rawDispatchDetails = ddRes.data || [];
    const rawDispatchStatus = dsRes.data || [];

    // Process parts list from dispatch_detail
    const enrichedParts = rawDispatchDetails.map(row => {
      const pn = String(row.part_number || row.part_num || '').trim().toUpperCase();
      const invNo = String(row.invoice_no || '').trim();
      if (!pn || !invNo) return null;

      const containerNo = String(row.container_no || row.box_no || '').trim();
      const shipLPNo = String(row.ship_lp_no || '').trim();
      const qty = Number(row.dispatch_qty || row.qty || 0);

      return {
        partNumber: pn,
        description: String(row.part_desc || row.description || 'N/A'),
        invoiceNumber: invNo,
        containerNo: containerNo,
        shipLPNo: shipLPNo,
        qty: qty,
        binLocation: binMap.get(pn) || 'NOT FOUND',
        gatePass: String(row.gate_pass || '').trim(),
        isUrgent: urgentMap.has(pn),
        urgentDetails: urgentMap.get(pn) || []
      };
    }).filter(Boolean);

    // Process shipments list from dispatch_status
    const shipments = rawDispatchStatus.map(row => {
      const invNo = String(row.invoice_no || '').trim();
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
        gatePass: String(row.gate_pass || '').trim(),
        transporter: String(row.transporter || '').trim(),
        location: String(row.location || locationName).trim(),
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
  } catch (error) {
    console.error('Error syncing live Bodyshop data:', error);
    throw error;
  }
};
