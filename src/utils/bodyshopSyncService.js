import { supabase, fetchAllRows, isReceiveDateCompleted } from './supabaseClient';

export const normalizeLocationName = (loc) => {
  if (!loc) return 'Vastral';
  const str = String(loc).trim();
  const lower = str.toLowerCase();
  if (lower.includes('vastral')) return 'Vastral';
  if (lower.includes('bopal')) return 'Bopal';
  if (lower.includes('shela')) return 'Shela';
  if (lower.includes('surat')) return 'Surat';
  if (lower.includes('nexa')) return 'Nexa';
  if (lower.includes('changodar')) return 'Changodar';
  if (lower.includes('chiloda')) return 'Chiloda';
  if (lower.includes('detroj')) return 'Detroj';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const cleanPartNo = (str) => String(str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

/**
 * Extract base part number by stripping common color codes and extra suffixes
 * e.g., 71751M85S205PK -> 71751M85S20, 77831M77P00-ZSP -> 77831M77P00
 */
const getBasePartNo = (cleanPn) => {
  if (!cleanPn || cleanPn.length < 8) return cleanPn;
  const withoutHyphen = cleanPn.split('-')[0];
  if (withoutHyphen.length >= 10 && withoutHyphen.length <= 15) {
    return withoutHyphen;
  }
  return cleanPn;
};

/**
 * Direct Live Sync from Bodyshop Tracking Supabase Database
 * Fetches Extranet Dispatches, Part Master Bin Locations & Descriptions, and PNA/Jobcards
 * directly from Bodyshop tables (dispatch_status, dispatch_detail, part_master, jobcards).
 * Uses fetchAllRows to bypass default 1000-row pagination caps.
 * 
 * @param {string} locationName - Target location (e.g. 'Vastral', 'Bopal', 'Nexa', etc.)
 */
export const fetchBodyshopLiveData = async (locationName = 'Vastral') => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const targetLoc = normalizeLocationName(locationName);

  try {
    // 1. Fetch Part Master (Target Location first + Global fallback for unlisted items)
    const [pmLocal, pmAll] = await Promise.all([
      fetchAllRows(
        () => supabase
          .from('part_master')
          .select('part_num, bin_location, part_desc, location')
          .eq('location', targetLoc)
      ).catch(() => []),
      fetchAllRows(
        () => supabase
          .from('part_master')
          .select('part_num, bin_location, part_desc, location')
      ).catch(() => [])
    ]);

    const pmMapLocal = new Map();
    const pmMapGlobal = new Map();

    const addPmEntry = (map, row) => {
      const pn = cleanPartNo(row.part_num);
      const bin = String(row.bin_location || '').trim();
      const desc = String(row.part_desc || row.description || row.part_name || '').trim();
      if (pn) {
        if (!map.has(pn) || (bin && bin !== 'NA' && bin !== '-')) {
          map.set(pn, {
            bin: bin && bin !== '-' ? bin : 'N/A',
            desc: desc || ''
          });
        }
      }
    };

    (pmLocal || []).forEach(r => addPmEntry(pmMapLocal, r));
    (pmAll || []).forEach(r => addPmEntry(pmMapGlobal, r));

    const getPartMasterInfo = (cleanPn) => {
      // 1. Check local target location match
      if (pmMapLocal.has(cleanPn)) return pmMapLocal.get(cleanPn);
      // 2. Check global match
      if (pmMapGlobal.has(cleanPn)) return pmMapGlobal.get(cleanPn);
      // 3. Check base part number match
      const basePn = getBasePartNo(cleanPn);
      if (basePn && basePn !== cleanPn) {
        if (pmMapLocal.has(basePn)) return pmMapLocal.get(basePn);
        if (pmMapGlobal.has(basePn)) return pmMapGlobal.get(basePn);
      }
      return null;
    };

    // 2. Fetch ALL PNA / Jobcards rows for Urgent Vehicle tracking (only UNRECEIVED PNA parts)
    const jcData = await fetchAllRows(
      () => supabase
        .from('jobcards')
        .select('part_number, vehicle_no, model, total_demand, status, receive_date, issue_date, location')
        .eq('location', targetLoc)
    ).catch(() => []);

    const urgentMap = new Map();
    (jcData || []).forEach(row => {
      const isReceived = isReceiveDateCompleted(row.receive_date);
      const isIssued = isReceiveDateCompleted(row.issue_date);
      const st = String(row.status || '').trim().toLowerCase();

      // Exclude parts that are already received or issued or completed
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

    // 3. Fetch Dispatch Detail & Dispatch Status from Extranet
    const [rawDispatchDetails, rawDispatchStatus] = await Promise.all([
      fetchAllRows(
        () => supabase.from('dispatch_detail').select('*').eq('location', targetLoc)
      ).catch(() => []),
      fetchAllRows(
        () => supabase.from('dispatch_status').select('*').eq('location', targetLoc)
      ).catch(() => [])
    ]);

    // Process parts list from dispatch_detail
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

      // Check urgent vehicle matching (exact clean PN or base PN)
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

    // Process shipments list from dispatch_status
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
  } catch (error) {
    console.error('Error syncing live Bodyshop data:', error);
    throw error;
  }
};
