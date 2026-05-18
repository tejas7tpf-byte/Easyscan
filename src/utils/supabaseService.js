import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fetches all active data (shipments, parts, scans, selected invoices) for a specific location
 */
export const fetchLocationData = async (locationId) => {
  if (!isSupabaseConfigured()) {
    // Fallback to localStorage
    const locSuffix = `_${locationId}`;
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
  }

  try {
    // Fetch from Supabase
    const [shipmentsRes, partsRes, scansRes, selectedRes] = await Promise.all([
      supabase.from('shipments').select('*').eq('location_id', locationId),
      supabase.from('parts').select('*').eq('location_id', locationId),
      supabase.from('scans').select('*').eq('location_id', locationId),
      supabase.from('selected_invoices').select('*').eq('location_id', locationId)
    ]);

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

    return {
      data: { shipments, parts },
      rawData: null, // Raw data is only needed for initial parsing
      selectedInvoices,
      receivedBoxes,
      scannedParts,
      scanTimestamps,
      lastUpdate: shipmentsRes.data?.[0]?.created_at ? new Date(shipmentsRes.data[0].created_at).toLocaleString() : null
    };
  } catch (error) {
    console.error("Supabase fetch error:", error);
    throw error;
  }
};

/**
 * Uploads newly imported Extranet data to Supabase for a specific location
 */
export const uploadLocationData = async (locationId, shipments, parts) => {
  if (!isSupabaseConfigured()) {
    return; // Handled by localStorage useEffect in App
  }

  try {
    // 1. Clear existing data for this location
    await Promise.all([
      supabase.from('shipments').delete().eq('location_id', locationId),
      supabase.from('parts').delete().eq('location_id', locationId),
      supabase.from('scans').delete().eq('location_id', locationId),
      supabase.from('selected_invoices').delete().eq('location_id', locationId)
    ]);

    // 2. Insert new shipments
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
      await supabase.from('shipments').insert(shipmentInserts);
    }

    // 3. Insert new parts in chunks of 500 to avoid payload limits
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
        await supabase.from('parts').insert(partInserts.slice(i, i + chunkSize));
      }
    }
  } catch (error) {
    console.error("Supabase upload error:", error);
    throw error;
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
    });
  } catch (error) {
    console.error("Supabase save scan error:", error);
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
      .eq('scan_type', scanType);
  } catch (error) {
    console.error("Supabase remove scan error:", error);
  }
};

/**
 * Updates selected invoices list in Supabase
 */
export const updateSupabaseSelectedInvoices = async (locationId, selectedInvoices) => {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.from('selected_invoices').delete().eq('location_id', locationId);
    if (selectedInvoices.length > 0) {
      const inserts = selectedInvoices.map(inv => ({
        location_id: locationId,
        invoice_no: inv
      }));
      await supabase.from('selected_invoices').insert(inserts);
    }
  } catch (error) {
    console.error("Supabase update selected invoices error:", error);
  }
};
