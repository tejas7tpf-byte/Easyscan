import { supabase, isReceiveDateCompleted } from './supabaseClient';

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
 * 
 * @param {string} locationName - Target location (e.g. 'Vastral', 'Bopal', 'Nexa', etc.)
 */
export const fetchBodyshopLiveData = async (locationName = 'Vastral') => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const normTarget = (locationName || 'Vastral').toLowerCase().replace('store', '').trim();

  try {
    // 1. Fetch Extranet Dispatches globally to guarantee zero query failure
    const [ddRes, dsRes] = await Promise.all([
      supabase.from('dispatch_detail').select('*'),
      supabase.from('dispatch_status').select('*')
    ]);

    if (ddRes.error) throw new Error('dispatch_detail fetch error: ' + ddRes.error.message);
    if (dsRes.error) throw new Error('dispatch_status fetch error: ' + dsRes.error.message);

    const filterByLoc = (r) => {
      if (!normTarget || normTarget === 'all' || normTarget === 'main') return true;
      const l = String(r.location || '').toLowerCase();
      return l.includes(normTarget) || normTarget.includes(l);
    };

    const rawDispatchDetails = (ddRes.data || []).filter(filterByLoc);
    const rawDispatchStatus = (dsRes.data || []).filter(filterByLoc);

    // Extract unique clean part numbers to target in part_master
    const uniquePnSet = new Set();
    rawDispatchDetails.forEach(row => {
      const pn = cleanPartNo(row.part_number || row.part_num);
      if (pn) {
        uniquePnSet.add(pn);
        const basePn = getBasePartNo(pn);
        if (basePn) uniquePnSet.add(basePn);
      }
    });

    const targetPartNumbers = Array.from(uniquePnSet);

    // 2. Fetch Part Master in small chunks to prevent HTTP 414 / GET URL limits
    let pmData = [];
    if (targetPartNumbers.length > 0) {
      const chunkSize = 80;
      for (let i = 0; i < targetPartNumbers.length; i += chunkSize) {
        const chunk = targetPartNumbers.slice(i, i + chunkSize);
        const { data: chunkPm, error: pmErr } = await supabase
          .from('part_master')
          .select('part_num, bin_location, part_desc, location')
          .in('part_num', chunk);
        if (chunkPm) pmData.push(...chunkPm);
      }
    }

    const pmMap = new Map();
    pmData.forEach(row => {
      const pn = cleanPartNo(row.part_num);
      const bin = String(row.bin_location || '').trim();
      const desc = String(row.part_desc || row.description || row.part_name || '').trim();
      if (pn) {
        if (!pmMap.has(pn) || (bin && bin !== 'NA' && bin !== '-' && bin !== 'NOBIN')) {
          pmMap.set(pn, {
            bin: bin && bin !== '-' ? bin : 'N/A',
            desc: desc || ''
          });
        }
      }
    });

    const getPartMasterInfo = (cleanPn) => {
      if (pmMap.has(cleanPn)) return pmMap.get(cleanPn);
      const basePn = getBasePartNo(cleanPn);
      if (basePn && pmMap.has(basePn)) return pmMap.get(basePn);
      return null;
    };

    // 3. Fetch Jobcards for Urgent Vehicle tracking (unreceived PNA parts)
    const { data: jcData } = await supabase
      .from('jobcards')
      .select('part_number, vehicle_no, model, total_demand, status, receive_date, issue_date, location')
      .limit(10000);

    const filteredJc = (jcData || []).filter(filterByLoc);

    const urgentMap = new Map();
    filteredJc.forEach(row => {
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

    // 4. Enrich parts list from dispatch_detail
    const enrichedParts = rawDispatchDetails.map(row => {
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

    // 5. Build shipments list from DS and DD
    const dsMap = new Map();
    rawDispatchStatus.forEach(row => {
      const invNo = String(row.invoice_no || row.fin_ctrl_no || '').trim();
      if (invNo) dsMap.set(invNo, row);
    });

    const allInvoiceNos = new Set([
      ...rawDispatchStatus.map(r => String(r.invoice_no || r.fin_ctrl_no || '').trim()),
      ...rawDispatchDetails.map(r => String(r.invoice_no || '').trim())
    ]);
    allInvoiceNos.delete('');

    const shipments = Array.from(allInvoiceNos).map(invNo => {
      const dsRow = dsMap.get(invNo) || {};
      const shipmentParts = enrichedParts.filter(p => p.invoiceNumber === invNo);
      const boxSet = new Set();
      shipmentParts.forEach(p => {
        const boxId = p.containerNo || p.shipLPNo;
        if (boxId) boxSet.add(boxId);
      });

      return {
        invoiceNo: invNo,
        trackingNo: String(dsRow.goods_receipt_no || dsRow.tracking_no || dsRow.goods_receipt || '').trim(),
        truckNo: String(dsRow.truck_no || '').trim(),
        gatePass: String(dsRow.gate_pass_no || dsRow.gate_pass || '').trim(),
        transporter: String(dsRow.transporter || '').trim(),
        location: String(dsRow.location || locationName).trim(),
        totalBoxes: boxSet.size,
        boxes: Array.from(boxSet),
        totalParts: shipmentParts.reduce((acc, p) => acc + p.qty, 0)
      };
    });

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
