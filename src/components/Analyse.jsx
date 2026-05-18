import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Download, Truck, Package, Layers, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';

const Analyse = ({ data }) => {
  const [filter, setFilter] = useState('all'); // 'all' | 'missingParts' | 'missingBills' | 'complete'

  const shipments = data?.shipments || [];
  const parts = data?.parts || [];

  const analysis = useMemo(() => {
    // 1. Check Shipments -> Parts (Missing Parts Data)
    const result = shipments.map(ship => {
      const shipParts = parts.filter(p => p.invoiceNumber === ship.invoiceNo);
      const totalQty = shipParts.reduce((acc, p) => acc + (p.qty || 0), 0);
      const uniqueParts = new Set(shipParts.map(p => p.partNumber)).size;
      const uniqueBoxes = new Set(shipParts.map(p => p.containerNo || p.shipLPNo)).size;

      return {
        ...ship,
        hasData: shipParts.length > 0,
        partCount: shipParts.length,
        isMissingBill: false,
        uniqueParts,
        uniqueBoxes,
        totalQty
      };
    });

    const complete = result.filter(r => r.hasData);
    const missingParts = result.filter(r => !r.hasData);

    // 2. Check Parts -> Shipments (Missing Bill Header / Dispatch Status)
    const partInvoices = Array.from(new Set(parts.map(p => p.invoiceNumber).filter(Boolean)));
    const shipmentInvoices = new Set(shipments.map(s => s.invoiceNo));

    const missingBills = partInvoices.filter(inv => !shipmentInvoices.has(inv)).map(inv => {
      const shipParts = parts.filter(p => p.invoiceNumber === inv);
      const totalQty = shipParts.reduce((acc, p) => acc + (p.qty || 0), 0);
      const uniqueParts = new Set(shipParts.map(p => p.partNumber)).size;
      const uniqueBoxes = new Set(shipParts.map(p => p.containerNo || p.shipLPNo)).size;

      return {
        invoiceNo: inv,
        transporter: 'Missing from Dispatch Status',
        trackingNo: 'N/A',
        gatePass: shipParts[0]?.gatePass || 'N/A',
        hasData: false,
        isMissingBill: true,
        uniqueParts,
        uniqueBoxes,
        totalQty
      };
    });

    return {
      all: [...result, ...missingBills],
      complete,
      missingParts,
      missingBills,
      totalExpected: shipments.length
    };
  }, [shipments, parts]);

  const filteredList = useMemo(() => {
    if (filter === 'missingParts') return analysis.missingParts;
    if (filter === 'missingBills') return analysis.missingBills;
    if (filter === 'complete') return analysis.complete;
    return analysis.all;
  }, [analysis, filter]);

  const exportMissingReport = async (exportType) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const isBill = exportType === 'missingBills';
      const worksheet = workbook.addWorksheet(isBill ? 'Missing Bills' : 'Missing Parts');

      worksheet.columns = [
        { header: 'Invoice No', key: 'invoiceNo', width: 20 },
        { header: 'Transporter', key: 'transporter', width: 25 },
        { header: 'Truck / Tracking No', key: 'trackingNo', width: 25 },
        { header: 'Gate Pass', key: 'gatePass', width: 20 },
        { header: isBill ? 'Total Qty (Parts)' : 'Expected Boxes (Est.)', key: 'qtyOrBoxes', width: 20 },
        { header: 'Error Status', key: 'error', width: 35 }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isBill ? 'FFFF9500' : 'FFFF3B30' } };

      const listToExport = isBill ? analysis.missingBills : analysis.missingParts;

      listToExport.forEach(item => {
        worksheet.addRow({
          invoiceNo: item.invoiceNo,
          transporter: item.transporter || 'N/A',
          trackingNo: item.trackingNo || item.truckNo || 'N/A',
          gatePass: item.gatePass || 'N/A',
          qtyOrBoxes: isBill ? item.totalQty : (item.totalBoxes || 'Unknown'),
          error: isBill ? 'Missing from Dispatch Status' : 'Missing from MBR / Dispatch Detail'
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `${isBill ? 'Missing_Bills' : 'Missing_Parts'}_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert("Error exporting report: " + err.message);
    }
  };

  if (shipments.length === 0 && parts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70vh', gap: '16px', padding: '20px', textAlign: 'center' }}>
        <FileSearch size={64} className="text-muted" />
        <div>
          <h3 className="text-xl font-bold">No Shipment Data Loaded</h3>
          <p className="text-sm text-muted" style={{ marginTop: '8px', maxWidth: '400px' }}>
            Please import your Dispatch Status and MBR/Dispatch Detail sheets in the Data tab to perform data integrity analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px' }}>
      <div>
        <h2 className="text-2xl font-bold">Data Integrity Analysis</h2>
        <p className="text-sm text-muted" style={{ marginTop: '4px' }}>
          Verify invoice mapping between Dispatch Status and Parts sheets before receiving couriers.
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-xs font-semibold text-muted uppercase">Expected Invoices</span>
            <FileText size={20} className="text-primary" />
          </div>
          <div className="text-3xl font-bold">{analysis.totalExpected}</div>
          <span className="text-xs text-muted">Listed in Dispatch Status</span>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-xs font-semibold text-muted uppercase">Verified Complete</span>
            <CheckCircle2 size={20} className="text-success" />
          </div>
          <div className="text-3xl font-bold text-success">{analysis.complete.length}</div>
          <span className="text-xs text-muted">Parts data available</span>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--error)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-xs font-semibold text-muted uppercase">Missing Parts Data</span>
            <AlertTriangle size={20} className="text-error" />
          </div>
          <div className="text-3xl font-bold text-error">{analysis.missingParts.length}</div>
          <span className="text-xs text-muted">Missing from MBR / Detail</span>
        </div>

        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-xs font-semibold text-muted uppercase">Missing Bills</span>
            <AlertTriangle size={20} className="text-warning" />
          </div>
          <div className="text-3xl font-bold text-warning">{analysis.missingBills.length}</div>
          <span className="text-xs text-muted">Missing from Dispatch Status</span>
        </div>
      </div>

      {/* Actions & Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)', gap: '4px' }}>
          <button 
            onClick={() => setFilter('all')} 
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: filter === 'all' ? 'var(--bg-surface)' : 'transparent', color: filter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px' }}
          >
            All ({analysis.all.length})
          </button>
          <button 
            onClick={() => setFilter('missingParts')} 
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: filter === 'missingParts' ? 'var(--bg-surface)' : 'transparent', color: filter === 'missingParts' ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px' }}
          >
            Missing Parts ({analysis.missingParts.length})
          </button>
          <button 
            onClick={() => setFilter('missingBills')} 
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: filter === 'missingBills' ? 'var(--bg-surface)' : 'transparent', color: filter === 'missingBills' ? 'var(--warning)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px' }}
          >
            Missing Bills ({analysis.missingBills.length})
          </button>
          <button 
            onClick={() => setFilter('complete')} 
            style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: filter === 'complete' ? 'var(--bg-surface)' : 'transparent', color: filter === 'complete' ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px' }}
          >
            Verified ({analysis.complete.length})
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {analysis.missingParts.length > 0 && (
            <button 
              onClick={() => exportMissingReport('missingParts')}
              className="btn"
              style={{ backgroundColor: 'var(--error)', color: '#fff', gap: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '12px' }}
            >
              <Download size={16} /> Export Missing Parts (.xlsx)
            </button>
          )}

          {analysis.missingBills.length > 0 && (
            <button 
              onClick={() => exportMissingReport('missingBills')}
              className="btn"
              style={{ backgroundColor: 'var(--warning)', color: '#fff', gap: '8px', padding: '12px 16px', fontWeight: 600, fontSize: '12px' }}
            >
              <Download size={16} /> Export Missing Bills (.xlsx)
            </button>
          )}
        </div>
      </div>

      {/* Invoices List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredList.length === 0 ? (
          <div className="card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No invoices found in this category.
          </div>
        ) : (
          filteredList.map((item) => (
            <div 
              key={item.invoiceNo} 
              className="card" 
              style={{ 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                borderColor: item.isMissingBill ? 'rgba(255, 149, 0, 0.4)' : item.hasData ? 'var(--border-color)' : 'rgba(255, 59, 48, 0.3)',
                backgroundColor: item.isMissingBill ? 'rgba(255, 149, 0, 0.02)' : item.hasData ? 'var(--bg-card)' : 'rgba(255, 59, 48, 0.02)'
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: item.isMissingBill ? 'rgba(255, 149, 0, 0.1)' : item.hasData ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.isMissingBill ? 'var(--warning)' : item.hasData ? 'var(--success)' : 'var(--error)' }}>
                    {item.isMissingBill ? <AlertTriangle size={24} /> : item.hasData ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.invoiceNo}
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, backgroundColor: item.isMissingBill ? 'rgba(255, 149, 0, 0.1)' : item.hasData ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: item.isMissingBill ? 'var(--warning)' : item.hasData ? 'var(--success)' : 'var(--error)' }}>
                        {item.isMissingBill ? 'Missing Dispatch Status' : item.hasData ? 'Data Verified' : 'Missing Parts Data'}
                      </span>
                    </h3>
                    <p className="text-xs text-muted" style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span><Truck size={12} style={{ display: 'inline', marginRight: '4px' }} /> {item.transporter || 'Unknown Transporter'}</span>
                      <span>• Tracking: {item.trackingNo || item.truckNo || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Gate Pass: {item.gatePass || 'N/A'}
                </div>
              </div>

              {item.isMissingBill ? (
                <div style={{ backgroundColor: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.2)', padding: '14px 16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertTriangle size={20} className="text-warning" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--warning)', lineHeight: '1.4' }}>
                    <strong>Missing Bill / Dispatch Status:</strong> This invoice has parts data in MBR/Dispatch Detail (Total Qty: {item.totalQty}, Boxes: {item.uniqueBoxes}), but is missing from the Dispatch Status sheet. You won't see transporter or tracking details for this shipment.
                  </div>
                </div>
              ) : item.hasData ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '6px' }}>
                    <Package size={16} className="text-primary" />
                    <span>Unique Parts: <strong>{item.uniqueParts}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '6px' }}>
                    <Layers size={16} className="text-primary" />
                    <span>Total Qty: <strong>{item.totalQty}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '6px' }}>
                    <span>Boxes Found: <strong>{item.uniqueBoxes}</strong></span>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)', padding: '14px 16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <AlertTriangle size={20} className="text-error" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '13px', color: 'var(--error)', lineHeight: '1.4' }}>
                    <strong>Action Required:</strong> This invoice is listed in the Dispatch Status sheet, but no matching parts were found in the MBR Data or Dispatch Detail sheets. If a courier arrives for this invoice, scanning boxes will fail because part details are missing.
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Analyse;
