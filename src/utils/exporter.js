import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

/**
 * Generates a dynamic filename based on audit data
 * Standard format: INV-123_Transporter_2026-05-16.xlsx
 */
const getFileName = (shipments, selectedInvoices, extension) => {
  try {
    const date = new Date().toISOString().slice(0, 10);
    if (!selectedInvoices || selectedInvoices.length === 0) {
      return `EasyScan_All_Report_${date}.${extension}`;
    }
    
    const inv = String(selectedInvoices[0]).replace(/[^a-z0-9-]/gi, '_');
    const shipment = (shipments || []).find(s => s.invoiceNo === selectedInvoices[0]);
    
    // Clean transporter name (remove special chars)
    let transporter = String(shipment?.transporter || 'Unknown').trim();
    transporter = transporter.replace(/[^a-z0-9]/gi, '_').substring(0, 20); // Limit length
    
    const count = selectedInvoices.length > 1 ? `_plus_${selectedInvoices.length - 1}_Others` : '';
    
    const finalName = `${inv}_${transporter}${count}_${date}.${extension}`;
    console.log("Generated Filename:", finalName);
    return finalName;
  } catch (err) {
    return `EasyScan_Report_${new Date().getTime()}.${extension}`;
  }
};

/**
 * Generates an Excel report
 */
export const exportToExcel = async (parts, shipments, scannedParts, selectedInvoices, scanTimestamps = {}) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Report');

    worksheet.columns = [
      { header: 'Transporter', key: 'transporter', width: 20 },
      { header: 'Tracking/Truck No', key: 'tracking', width: 20 },
      { header: 'Invoice No', key: 'invoice', width: 15 },
      { header: 'Carton No', key: 'carton', width: 20 },
      { header: 'Part Number', key: 'partNo', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Bin Location', key: 'bin', width: 15 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Receive Date & Time', key: 'receiveDate', width: 22 },
      { header: 'Urgent Vehicle Details', key: 'urgent', width: 40 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AFF' } };

    const relevantParts = parts.filter(p => selectedInvoices.includes(p.invoiceNumber));
    
    relevantParts.forEach(p => {
      const shipment = shipments.find(s => s.invoiceNo === p.invoiceNumber);
      const boxId = String(p.containerNo || p.shipLPNo || 'N/A').trim();
      const key = `${String(p.partNumber).trim().toUpperCase()}||${boxId.toUpperCase()}`;
      const isReceived = scannedParts.includes(key);
      const receiveDate = isReceived ? (scanTimestamps[key] || new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : '-';
      
      const row = worksheet.addRow({
        transporter: shipment?.transporter || 'N/A',
        tracking: shipment?.trackingNo || shipment?.truckNo || 'N/A',
        invoice: p.invoiceNumber,
        carton: boxId,
        partNo: p.partNumber,
        description: p.description,
        bin: p.binLocation,
        qty: p.qty,
        status: isReceived ? 'RECEIVED' : 'PENDING',
        receiveDate: receiveDate,
        urgent: (p.urgentDetails || []).map(v => `${v.vehicleNo} (${v.model})`).join(', ')
      });

      if (isReceived) {
        row.getCell('status').font = { color: { argb: 'FF34C759' }, bold: true };
      } else {
        row.getCell('status').font = { color: { argb: 'FFFF3B30' }, bold: true };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = getFileName(shipments, selectedInvoices, 'xlsx');
    
    // Using native <a> tag for most reliable filename preservation
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
  } catch (error) {
    alert("Excel Error: " + error.message);
  }
};

/**
 * Generates a PDF report
 */
export const exportToPDF = (parts, shipments, scannedParts, selectedInvoices, scanTimestamps = {}) => {
  try {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(18);
    doc.setTextColor(0, 122, 255);
    doc.text('EasyScan Audit Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    const relevantParts = parts.filter(p => selectedInvoices.includes(p.invoiceNumber));
    
    const tableData = relevantParts.map(p => {
      const shipment = shipments.find(s => s.invoiceNo === p.invoiceNumber);
      const boxId = String(p.containerNo || p.shipLPNo || 'N/A').trim();
      const key = `${String(p.partNumber).trim().toUpperCase()}||${boxId.toUpperCase()}`;
      const isReceived = scannedParts.includes(key);
      const receiveDate = isReceived ? (scanTimestamps[key] || new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : '-';
      
      return [
        shipment?.transporter || 'N/A',
        p.invoiceNumber,
        boxId,
        p.partNumber,
        p.description,
        p.qty,
        isReceived ? 'RECEIVED' : 'PENDING',
        receiveDate,
        (p.urgentDetails || []).map(v => v.vehicleNo).join(', ')
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Transporter', 'Invoice', 'Carton', 'Part No', 'Description', 'Qty', 'Status', 'Receive Date & Time', 'Vehicles']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 122, 255] },
      columnStyles: {
        0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 2: { cellWidth: 30 }, 3: { cellWidth: 32 },
        4: { cellWidth: 45 }, 5: { cellWidth: 12 }, 6: { cellWidth: 22 }, 7: { cellWidth: 28 }, 8: { cellWidth: 42 }
      },
      styles: { fontSize: 8 }
    });

    const fileName = getFileName(shipments, selectedInvoices, 'pdf');
    doc.save(fileName);
  } catch (error) {
    alert("PDF Error: " + error.message);
  }
};

/**
 * Generates a Master Data Backup workbook containing exactly the 5 original sheets
 */
export const exportMasterDataExcel = async (rawData) => {
  try {
    if (!rawData || Object.keys(rawData).length === 0) {
      alert("No raw data available to export. Please import files first.");
      return;
    }
    const workbook = new ExcelJS.Workbook();

    const sheetMappings = [
      { key: 'dispatchStatus', name: 'Dispatch Status', color: 'FF007AFF' },
      { key: 'mbr', name: 'MBR Data', color: 'FF34C759' },
      { key: 'dispatchDetail', name: 'Dispatch Detail', color: 'FFFF9500' },
      { key: 'partMaster', name: 'Part Master', color: 'FF5856D6' },
      { key: 'bodyshopTracking', name: 'Bodyshop Tracking', color: 'FFFF2D55' }
    ];

    sheetMappings.forEach(sm => {
      const rows = rawData[sm.key] || [];
      if (rows.length > 0) {
        const sheet = workbook.addWorksheet(sm.name);
        rows.forEach((row, rIdx) => {
          const addedRow = sheet.addRow(row);
          if (rIdx === 0) {
            addedRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            addedRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sm.color } };
          }
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `EasyScan_Master_5Sheets_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    alert("Export Master Data Error: " + error.message);
  }
};

