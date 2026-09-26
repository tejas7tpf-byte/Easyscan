import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetches all active data (shipments, parts, scans, selected invoices) for a specific location
 */
export const fetchLocationData = async (locationId) => {
  const locSuffix = `_${locationId}`;

  // Helper to load fallback from localStorage
  const getLocalStorageFallback = () => {
    const savedData = localStorage.getItem(`easyscan_data_v29${locSuffix}`);
    const savedSelected = localStorage.getItem(`easyscan_selected_v29${locSuffix}`);
    const savedBoxes = localStorage.getItem(`easyscan_boxes_v29${locSuffix}`);
    const savedParts = localStorage.getItem(`easyscan_scanned_parts_v29${locSuffix}`);
    const savedTimestamps = localStorage.getItem(`easyscan_timestamps_v29${locSuffix}`);
    const savedRaw = localStorage.getItem(`easyscan_rawdata_v29${locSuffix}`);
    const savedLast = localStorage.getItem(`easyscan_last_update_v29${locSuffix}`);

    return {
      data: savedData ? JSON.parse(savedData) : { shipments: [], parts: [] },
      rawData: savedRaw ? JSON.parse(savedRaw) : null,
      selectedInvoices: savedSelected ? JSON.parse(savedSelected) : [],
      receivedBoxes: savedBoxes ? JSON.parse(savedBoxes) : [],
      scannedParts: savedParts ? JSON.parse(savedParts) : [],
      scanTimestamps: savedTimestamps ? JSON.parse(savedTimestamps) : {},
      lastUpdate: savedLast || null
    };
  };

  if (!isSupabaseConfigured()) {
    return getLocalStorageFallback();
  }

  try {
    // Attempt Supabase fetch
    const [shipmentsRes, partsRes, scansRes, selectedRes] = await Promise.all([
      supabase.from('shipments').select('*').eq('location_id', locationId),
      supabase.from('parts').select('*').eq('location_id', locationId),
      supabase.from('scans').select('*').eq('location_id', locationId),
      supabase.from('selected_invoices').select('*').eq('location_id', locationId)
    ]);

    // If tables do not exist in schema cache (code PGRST205), fallback to localStorage
    if (shipmentsRes.error?.code === 'PGRST205' || partsRes.error?.code === 'PGRST205') {
      return getLocalStorageFallback();
    }

    const shipments = (shipmentsRes.data || []).map(s => ({
      invoiceNo: s.invoice_no,
      trackingNo: s.tracking_no,
      truckNo: s.truck_no,
      gatePass: s.gate_pass,
      transporter: s.transporter,
      totalBoxes: s.total_boxes,
      totalParts: s.total_parts,
      boxes: s.boxes || []
    }));

    const parts = (partsRes.data || []).map(p => ({
      partNumber: p.part_number,
      description: p.description,
      invoiceNumber: p.invoice_no,
      containerNo: p.container_no,
      shipLPNo: p.ship_lp_no,
      qty: p.qty,
      binLocation: p.bin_location,
      gatePass: p.gate_pass,
      isUrgent: p.is_urgent,
      urgentDetails: p.urgent_details || []
    }));

    const receivedBoxes = [];
    const scannedParts = [];
    const scanTimestamps = {};

    (scansRes.data || []).forEach(scan => {
      if (scan.scan_type === 'box') {
        receivedBoxes.push(scan.scan_key);
      } else if (scan.scan_type === 'part') {
        scannedParts.push(scan.scan_key);
        scanTimestamps[scan.scan_key] = new Date(scan.scanned_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    });

    const selectedInvoices = (selectedRes.data || []).map(s => s.invoice_no);

    // If Supabase tables return empty data, fall back to localStorage
    if (shipments.length === 0 && parts.length === 0) {
      const fallback = getLocalStorageFallback();
      if (fallback.data.shipments.length > 0) return fallback;
    }

    return {
      data: { shipments, parts },
      rawData: null,
      selectedInvoices,
      receivedBoxes,
      scannedParts,
      scanTimestamps,
      lastUpdate: shipmentsRes.data?.[0]?.created_at ? new Date(shipmentsRes.data[0].created_at).toLocaleString() : null
    };
  } catch (error) {
    console.warn("Supabase fetch warning, falling back to localStorage:", error);
    return getLocalStorageFallback();
  }
};

/**
 * Uploads newly imported Extranet data for a specific location
 */
export const uploadLocationData = async (locationId, shipments, parts) => {
  const locSuffix = `_${locationId}`;
  
  // Always update localStorage first for instant client availability
  try {
    localStorage.setItem(`easyscan_data_v29${locSuffix}`, JSON.stringify({ shipments, parts }));
  } catch (e) {
    console.warn("localStorage save warning:", e);
  }

  if (!isSupabaseConfigured()) return;

  try {
    // Attempt Supabase insert if custom tables exist
    await Promise.all([
      supabase.from('shipments').delete().eq('location_id', locationId),
      supabase.from('parts').delete().eq('location_id', locationId),
      supabase.from('scans').delete().eq('location_id', locationId),
      supabase.from('selected_invoices').delete().eq('location_id', locationId)
    ]).catch(() => {});

    if (shipments.length > 0) {
      const shipmentInserts = shipments.map(s => ({
        location_id: locationId,
        invoice_no: s.invoiceNo,
        tracking_no: s.trackingNo || null,
        truck_no: s.truckNo || null,
        gate_pass: s.gatePass || null,
        transporter: s.transporter || null,
        total_boxes: s.totalBoxes || 0,
        total_parts: s.totalParts || 0,
        boxes: s.boxes || []
      }));
      await supabase.from('shipments').insert(shipmentInserts).catch(() => {});
    }

    if (parts.length > 0) {
      const partInserts = parts.map(p => ({
        location_id: locationId,
        invoice_no: p.invoiceNumber,
        part_number: p.partNumber,
        description: p.description || null,
        container_no: p.containerNo || null,
        ship_lp_no: p.shipLPNo || null,
        qty: p.qty || 0,
        bin_location: p.binLocation || null,
        gate_pass: p.gatePass || null,
        is_urgent: p.isUrgent || false,
        urgent_details: p.urgentDetails || []
      }));

      const chunkSize = 500;
      for (let i = 0; i < partInserts.length; i += chunkSize) {
        await supabase.from('parts').insert(partInserts.slice(i, i + chunkSize)).catch(() => {});
      }
    }
  } catch (error) {
    console.warn("Supabase upload warning (handled silently):", error);
  }
};

/**
 * Saves a single scan (box receive or part verification)
 */
export const saveSupabaseScan = async (locationId, scanKey, scanType, currentUser) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('scans').insert({
      location_id: locationId,
      scan_key: scanKey,
      scan_type: scanType,
      scanned_by: currentUser?.name || currentUser?.username || 'Unknown'
    }).catch(() => {});
  } catch (error) {
    console.warn("Supabase save scan warning:", error);
  }
};

/**
 * Removes a single scan (box unreceive or part unverify)
 */
export const removeSupabaseScan = async (locationId, scanKey, scanType) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('scans').delete()
      .eq('location_id', locationId)
      .eq('scan_key', scanKey)
      .eq('scan_type', scanType)
      .catch(() => {});
  } catch (error) {
    console.warn("Supabase remove scan warning:", error);
  }
};

/**
 * Updates selected invoices list in Supabase
 */
export const updateSupabaseSelectedInvoices = async (locationId, selectedInvoices) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('selected_invoices').delete().eq('location_id', locationId).catch(() => {});
    if (selectedInvoices.length > 0) {
      const inserts = selectedInvoices.map(inv => ({
        location_id: locationId,
        invoice_no: inv
      }));
      await supabase.from('selected_invoices').insert(inserts).catch(() => {});
    }
  } catch (error) {
    console.warn("Supabase update selected invoices warning:", error);
  }
};
