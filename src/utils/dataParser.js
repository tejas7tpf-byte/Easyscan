import * as XLSX from 'xlsx';

/**
 * Parses an Excel file and returns an array of arrays (raw data)
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(raw);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Robustly find the first data row (skipping empty rows and header keywords)
 */
const findStartRow = (rows, keywords) => {
  const idx = rows.findIndex(r => r && r.some(c => 
    c && keywords.some(k => String(c).toLowerCase().includes(k.toLowerCase()))
  ));
  return idx !== -1 ? idx : 0;
};

/**
 * Processes the raw data from all 5 sheets using strict index mapping from user image
 */
export const processDataSources = (sheets) => {
  const {
    dispatchStatus = [],
    mbr = [],
    dispatchDetail = [],
    partMaster = [],
    bodyshopTracking = []
  } = sheets;

  // --- 1. Process Part Master (B=1, F=5) ---
  const binMap = new Map();
  const pmStart = findStartRow(partMaster, ['part number']);
  partMaster.slice(pmStart + 1).forEach(row => {
    if (!row || row.length < 2) return;
    const partNo = String(row[1] || '').trim();
    const binLoc = String(row[5] || '').trim();
    if (partNo) binMap.set(partNo, binLoc);
  });

  // --- 2. Process Bodyshop Tracking (COLLECT MULTIPLE VEHICLES PER PART) ---
  const urgentMap = new Map(); // Map<PartNo, Array<{vehicleNo, model, qty}>>
  const btStart = findStartRow(bodyshopTracking, ['part number', 'vehicle', 'reg']);
  const btHeader = bodyshopTracking[btStart] || [];
  
  const findCol = (header, keywords, fallback) => {
    const idx = header.findIndex(c => c && keywords.some(k => String(c).toLowerCase().includes(k.toLowerCase())));
    return idx !== -1 ? idx : fallback;
  };

  const btCols = {
    part: findCol(btHeader, ['part number', 'part no'], 11),
    veh: findCol(btHeader, ['veh', 'reg'], 4),
    model: findCol(btHeader, ['model'], 5),
    qty: findCol(btHeader, ['order qty', 'qty'], 13)
  };

  bodyshopTracking.slice(btStart + 1).forEach(row => {
    if (!row) return;
    const partNo = String(row[btCols.part] || '').trim();
    const vehNo = String(row[btCols.veh] || '').trim();
    const model = String(row[btCols.model] || '').trim();
    const qty = String(row[btCols.qty] || '').trim();

    if (partNo) {
      if (!urgentMap.has(partNo)) urgentMap.set(partNo, []);
      const existing = urgentMap.get(partNo);
      
      // PREVENT DUPLICATE VEHICLE ENTRIES FOR SAME PART
      const isDuplicate = existing.some(item => item.vehicleNo === vehNo && item.model === model);
      if (!isDuplicate) {
        existing.push({ vehicleNo: vehNo, model, qty });
      }
    }
  });

  // --- 3. Process Parts (MBR or Dispatch Detail) ---
  const mbrStart = findStartRow(mbr, ['part number', 'invoice number']);
  const processedMBR = mbr.slice(mbrStart + 1).map(row => {
    const partNo = String(row[1] || '').trim();
    const invNo = String(row[4] || '').trim();
    if (!partNo || !invNo) return null;
    return {
      partNumber: partNo,
      description: String(row[2] || 'N/A'),
      invoiceNumber: invNo,
      containerNo: String(row[6] || '').trim(),
      shipLPNo: String(row[7] || '').trim(),
      qty: Number(row[8] || 0),
      binLocation: String(row[9] || '').trim() || binMap.get(partNo) || 'NOT FOUND',
      gatePass: String(row[10] || '').trim()
    };
  }).filter(Boolean);

  const ddStart = findStartRow(dispatchDetail, ['invoice number', 'part number']);
  const processedDetail = dispatchDetail.slice(ddStart + 1).map(row => {
    const partNo = String(row[5] || '').trim();
    const invNo = String(row[1] || '').trim();
    if (!partNo || !invNo) return null;
    return {
      partNumber: partNo,
      description: String(row[6] || 'N/A'),
      invoiceNumber: invNo,
      containerNo: String(row[4] || '').trim(),
      shipLPNo: String(row[3] || '').trim(),
      qty: Number(row[7] || 0),
      binLocation: binMap.get(partNo) || 'NOT FOUND',
      gatePass: String(row[2] || row[8] || '').trim()
    };
  }).filter(Boolean);

  const allParts = processedMBR.length > 0 ? processedMBR : processedDetail;
  const enrichedParts = allParts.map(p => ({
    ...p,
    isUrgent: urgentMap.has(p.partNumber),
    urgentDetails: urgentMap.get(p.partNumber) || [] // Now an array
  }));

  // --- 4. Process Shipment Headers (Dispatch Status) ---
  const dsStart = findStartRow(dispatchStatus, ['fin ctrl', 'invoice number']);
  const shipments = dispatchStatus.slice(dsStart + 1).map(row => {
    const invNo = String(row[3] || '').trim();
    if (!invNo) return null;

    const shipmentParts = enrichedParts.filter(p => p.invoiceNumber === invNo);
    const boxSet = new Set();
    shipmentParts.forEach(p => {
      const boxId = p.containerNo || p.shipLPNo;
      if (boxId) boxSet.add(boxId);
    });

    return {
      invoiceNo: invNo,
      trackingNo: String(row[8] || '').trim(),
      truckNo: String(row[11] || '').trim(), // Ensure truckNo is captured
      gatePass: String(row[6] || '').trim(),
      transporter: String(row[10] || '').trim(),
      location: String(row[12] || '').trim(),
      totalBoxes: boxSet.size,
      boxes: Array.from(boxSet),
      totalParts: shipmentParts.reduce((acc, p) => acc + p.qty, 0)
    };
  }).filter(Boolean);

  return {
    shipments,
    parts: enrichedParts
  };
};

/**
 * Parses a modified Master Backup workbook containing the 5 original sheets
 */
export const parseMasterBackupExcel = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const getSheetData = (keywords) => {
          const name = workbook.SheetNames.find(n => keywords.some(k => n.toLowerCase().includes(k.toLowerCase())));
          if (!name) return [];
          return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
        };

        const rawData = {
          dispatchStatus: getSheetData(['dispatch status', 'status', 'dispatch_status', 'sheet1']),
          mbr: getSheetData(['mbr', 'sheet2']),
          dispatchDetail: getSheetData(['dispatch detail', 'detail', 'dispatch_detail', 'sheet3']),
          partMaster: getSheetData(['part master', 'master', 'part_master', 'sheet4']),
          bodyshopTracking: getSheetData(['bodyshop', 'tracking', 'bodyshop_tracking', 'sheet5'])
        };

        resolve(rawData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Parses an Extranet Multi-Sheet workbook and optional Part Master / Bodyshop Tracking files
 */
export const parseExtranetWorkbook = async (extranetFile, partMasterFile, bodyshopTrackingFile) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const getSheetData = (possibleNames) => {
          const sheetName = workbook.SheetNames.find(n => 
            possibleNames.some(p => n.toLowerCase() === p.toLowerCase())
          );
          if (!sheetName) return [];
          return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        };

        // Match exact variations from user image table
        const dispatchDetail = getSheetData(['Dispatch Detail', 'Dispatch_Detail', 'DD', 'Dispatch detail']);
        const dispatchStatus = getSheetData(['Dispatch Status', 'Dispatch_Status', 'Dispatch status', 'Dispatch_status']);
        const mbr = getSheetData(['MBR', 'mbr']);

        // Parse optional separate files if provided
        let partMaster = [];
        let bodyshopTracking = [];

        if (partMasterFile) {
          partMaster = await parseExcelFile(partMasterFile);
        }
        if (bodyshopTrackingFile) {
          bodyshopTracking = await parseExcelFile(bodyshopTrackingFile);
        }

        const rawData = {
          dispatchStatus,
          mbr,
          dispatchDetail,
          partMaster,
          bodyshopTracking
        };

        resolve(rawData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(extranetFile);
  });
};


