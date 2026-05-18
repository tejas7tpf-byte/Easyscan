import React from 'react';
import { UploadCloud, FileCheck, AlertCircle, FileSpreadsheet, Loader2, Download, Database, Layers, Clock } from 'lucide-react';
import { exportMasterDataExcel } from '../utils/exporter';

const FileLoader = ({ onFilesLoaded, onMasterImport, onExtranetImport, onSupplementalImport, currentData, isProcessing = false, lastUpdate }) => {
  const [importMode, setImportMode] = React.useState('extranet'); // 'extranet' | 'multi' | 'master' | 'supplemental'
  const [masterFile, setMasterFile] = React.useState(null);
  const [extranetFile, setExtranetFile] = React.useState(null);
  const [extranetPM, setExtranetPM] = React.useState(null);
  const [extranetBT, setExtranetBT] = React.useState(null);

  const [files, setFiles] = React.useState({
    dispatchStatus: null,
    mbr: null,
    dispatchDetail: null,
    partMaster: null,
    bodyshopTracking: null
  });

  const handleFileChange = (key, file) => {
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const isMultiReady = (files.dispatchStatus || files.mbr || files.dispatchDetail) && !isProcessing;
  const isMultiSupplementalOnly = !(files.dispatchStatus || files.mbr || files.dispatchDetail) && (files.partMaster || files.bodyshopTracking) && !isProcessing;
  const isAnyMultiReady = isMultiReady || isMultiSupplementalOnly;

  const isExtranetReady = extranetFile && !isProcessing;
  const isSupplementalOnlyReady = !extranetFile && (extranetPM || extranetBT) && !isProcessing;
  const isAnyExtranetReady = isExtranetReady || isSupplementalOnlyReady;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 className="text-2xl font-bold">Data Management</h2>
        <p className="text-sm text-muted" style={{ marginTop: '4px' }}>Import raw sheets, Extranet workbooks, or manage master backups.</p>
        {lastUpdate && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', marginTop: '12px' }}>
            <Clock size={14} className="text-primary" />
            <span>Last Updated: <strong>{lastUpdate}</strong></span>
          </div>
        )}
      </div>

      {/* 4-Way Mode Toggle */}
      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '4px' }}>
        <button 
          onClick={() => setImportMode('extranet')} 
          style={{ flex: 1, minWidth: '120px', padding: '10px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: importMode === 'extranet' ? 'var(--bg-surface)' : 'transparent', color: importMode === 'extranet' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}
        >
          Extranet Workbook
        </button>
        <button 
          onClick={() => setImportMode('multi')} 
          style={{ flex: 1, minWidth: '120px', padding: '10px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: importMode === 'multi' ? 'var(--bg-surface)' : 'transparent', color: importMode === 'multi' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}
        >
          5 Separate Sheets
        </button>
        <button 
          onClick={() => setImportMode('master')} 
          style={{ flex: 1, minWidth: '120px', padding: '10px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: importMode === 'master' ? 'var(--bg-surface)' : 'transparent', color: importMode === 'master' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}
        >
          Master Backup & Edit
        </button>
        <button 
          onClick={() => setImportMode('supplemental')} 
          style={{ flex: 1, minWidth: '120px', padding: '10px 8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: importMode === 'supplemental' ? 'var(--bg-surface)' : 'transparent', color: importMode === 'supplemental' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}
        >
          Update Part/Bodyshop
        </button>
      </div>

      {importMode === 'extranet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'var(--primary)', backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} className="text-primary" /> Extranet Multi-Sheet Workbook
              </h3>
              <p className="text-xs text-muted" style={{ marginTop: '6px', lineHeight: '1.4' }}>
                Upload a single Extranet Excel workbook containing Dispatch Detail, Dispatch Status, and MBR sheets. The system will automatically identify and extract them while ignoring any unrelated sheets.
              </p>
            </div>

            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: extranetFile ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: extranetFile ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '16px 20px'
              }}
            >
              <div style={{ color: extranetFile ? 'var(--success)' : 'var(--primary)' }}>
                {extranetFile ? <FileCheck size={32} /> : <FileSpreadsheet size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">{extranetFile ? extranetFile.name : 'Select Extranet Workbook'}</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {extranetFile ? 'Click to change file' : 'Auto-extracts Dispatch Detail, Dispatch Status, MBR'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setExtranetFile(e.target.files[0])} 
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 className="text-xs font-semibold text-muted uppercase" style={{ paddingLeft: '4px' }}>Optional Supplemental Sheets</h4>
            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: extranetPM ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: extranetPM ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '14px 16px'
              }}
            >
              <div style={{ color: extranetPM ? 'var(--success)' : 'var(--primary)' }}>
                <FileCheck size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">Part Master (Optional)</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {extranetPM ? extranetPM.name : 'Upload Part Master for Bin Locations'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setExtranetPM(e.target.files[0])} 
              />
            </label>

            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: extranetBT ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: extranetBT ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '14px 16px'
              }}
            >
              <div style={{ color: extranetBT ? 'var(--success)' : 'var(--primary)' }}>
                {extranetBT ? <FileCheck size={24} /> : <AlertCircle size={24} />}
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">Bodyshop Tracking (Optional)</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {extranetBT ? extranetBT.name : 'Upload Bodyshop Tracking for Urgent Orders'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setExtranetBT(e.target.files[0])} 
              />
            </label>
          </div>

          <button 
            onClick={() => { 
              if (isExtranetReady) {
                onExtranetImport(extranetFile, extranetPM, extranetBT); 
              } else if (isSupplementalOnlyReady) {
                onSupplementalImport(extranetPM, extranetBT);
              }
            }}
            disabled={!isAnyExtranetReady}
            className="btn btn-primary"
            style={{ 
              marginTop: '4px', 
              width: '100%',
              opacity: isAnyExtranetReady ? 1 : 0.5,
              cursor: isAnyExtranetReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              height: '56px'
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing Data...
              </>
            ) : isSupplementalOnlyReady ? (
              <>
                <UploadCloud size={20} />
                Update Supplemental Data Only
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                Process Extranet Data
              </>
            )}
          </button>
        </div>
      )}

      {importMode === 'supplemental' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'var(--primary)', backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} className="text-primary" /> Update Part Master & Bodyshop Tracking
              </h3>
              <p className="text-xs text-muted" style={{ marginTop: '6px', lineHeight: '1.4' }}>
                Upload an updated Part Master or Bodyshop Tracking sheet at any time. This will instantly update your active inventory's Bin Locations and Urgent Vehicle orders without resetting your current scanning progress.
              </p>
            </div>

            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: extranetPM ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: extranetPM ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '14px 16px'
              }}
            >
              <div style={{ color: extranetPM ? 'var(--success)' : 'var(--primary)' }}>
                <FileCheck size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">Part Master (Update)</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {extranetPM ? extranetPM.name : 'Select updated Part Master sheet'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setExtranetPM(e.target.files[0])} 
              />
            </label>

            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: extranetBT ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: extranetBT ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '14px 16px'
              }}
            >
              <div style={{ color: extranetBT ? 'var(--success)' : 'var(--primary)' }}>
                <AlertCircle size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">Bodyshop Tracking (Update)</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {extranetBT ? extranetBT.name : 'Select updated Bodyshop Tracking sheet'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setExtranetBT(e.target.files[0])} 
              />
            </label>
          </div>

          <button 
            onClick={() => { if (extranetPM || extranetBT) onSupplementalImport(extranetPM, extranetBT); }}
            disabled={(!extranetPM && !extranetBT) || isProcessing}
            className="btn btn-primary"
            style={{ 
              marginTop: '4px', 
              width: '100%',
              opacity: (extranetPM || extranetBT) ? 1 : 0.5,
              cursor: (extranetPM || extranetBT) ? 'pointer' : 'not-allowed',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              height: '56px'
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Updating Inventory Data...
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                Update Supplemental Data
              </>
            )}
          </button>
        </div>
      )}

      {importMode === 'multi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { key: 'dispatchStatus', label: 'Dispatch Status', desc: 'Columns A-M', icon: FileSpreadsheet },
              { key: 'mbr', label: 'MBR Data', desc: 'Columns A-K', icon: FileSpreadsheet },
              { key: 'dispatchDetail', label: 'Dispatch Detail', desc: 'Columns A-I', icon: FileSpreadsheet },
              { key: 'partMaster', label: 'Part Master', desc: 'Bin Locations', icon: FileCheck },
              { key: 'bodyshopTracking', label: 'Bodyshop Tracking', desc: 'Urgent Orders', icon: AlertCircle }
            ].map((item) => {
              const Icon = item.icon;
              const hasFile = !!files[item.key];
              return (
                <label 
                  key={item.key}
                  className="card card-clickable"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    borderColor: hasFile ? 'var(--success)' : 'var(--border-color)',
                    backgroundColor: hasFile ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                    opacity: isProcessing ? 0.6 : 1,
                    padding: '14px 16px'
                  }}
                >
                  <div style={{ color: hasFile ? 'var(--success)' : 'var(--primary)' }}>
                    {hasFile ? <FileCheck size={24} /> : <Icon size={24} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p className="font-semibold text-base">{item.label}</p>
                    <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                      {hasFile ? files[item.key].name : item.desc}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    style={{ display: 'none' }} 
                    disabled={isProcessing}
                    onChange={(e) => handleFileChange(item.key, e.target.files[0])} 
                  />
                </label>
              )
            })}
          </div>

          <button 
            onClick={() => {
              if (isMultiReady) {
                onFilesLoaded(files);
              } else if (isMultiSupplementalOnly) {
                onSupplementalImport(files.partMaster, files.bodyshopTracking);
              }
            }}
            disabled={!isAnyMultiReady}
            className="btn btn-primary"
            style={{ 
              marginTop: '4px', 
              width: '100%',
              opacity: isAnyMultiReady ? 1 : 0.5,
              cursor: isAnyMultiReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px',
              height: '56px'
            }}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : isMultiSupplementalOnly ? (
              <>
                <UploadCloud size={20} />
                Update Supplemental Data Only
              </>
            ) : (
              <>
                <UploadCloud size={20} />
                Process Data
              </>
            )}
          </button>
        </div>
      )}

      {importMode === 'master' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', borderColor: 'var(--primary)', backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} className="text-primary" /> Export Active Master Data
              </h3>
              <p className="text-xs text-muted" style={{ marginTop: '6px', lineHeight: '1.4' }}>
                Download your exact uploaded 5 sheets (Dispatch Status, MBR Data, Dispatch Detail, Part Master, Bodyshop Tracking) into a single Master Excel workbook. You can modify this workbook in Excel and re-import it below to update your inventory.
              </p>
            </div>
            <button 
              onClick={() => exportMasterDataExcel(currentData)}
              disabled={!currentData || !currentData.dispatchStatus || currentData.dispatchStatus.length === 0}
              className="btn btn-primary"
              style={{ justifyContent: 'center', gap: '10px', padding: '16px', opacity: (!currentData || !currentData.dispatchStatus || currentData.dispatchStatus.length === 0) ? 0.5 : 1 }}
            >
              <Download size={20} /> Export Master Workbook (.xlsx)
            </button>
            {(!currentData || !currentData.dispatchStatus || currentData.dispatchStatus.length === 0) && (
              <p className="text-xs text-warning" style={{ textAlign: 'center' }}>No active raw data loaded. Please perform a 5-Sheet Raw Import first.</p>
            )}
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 className="text-lg font-bold" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={20} className="text-success" /> Import Modified Master Data
              </h3>
              <p className="text-xs text-muted" style={{ marginTop: '6px', lineHeight: '1.4' }}>
                Upload a modified Master Excel workbook (containing the 5 original sheets) to replace your active inventory.
              </p>
            </div>
            
            <label 
              className="card card-clickable"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                borderColor: masterFile ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: masterFile ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)',
                padding: '16px 20px'
              }}
            >
              <div style={{ color: masterFile ? 'var(--success)' : 'var(--primary)' }}>
                {masterFile ? <FileCheck size={32} /> : <FileSpreadsheet size={32} />}
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-semibold text-base">{masterFile ? masterFile.name : 'Select Master Workbook'}</p>
                <p className="text-xs text-muted" style={{ marginTop: '2px' }}>
                  {masterFile ? 'Click to change file' : 'Must contain the 5 original sheets'}
                </p>
              </div>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                style={{ display: 'none' }} 
                disabled={isProcessing}
                onChange={(e) => setMasterFile(e.target.files[0])} 
              />
            </label>

            <button 
              onClick={() => { if (masterFile) onMasterImport(masterFile); }}
              disabled={!masterFile || isProcessing}
              className="btn btn-primary"
              style={{ 
                justifyContent: 'center', 
                gap: '12px', 
                height: '56px',
                opacity: (!masterFile || isProcessing) ? 0.5 : 1,
                cursor: (!masterFile || isProcessing) ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processing...
                </>
              ) : (
                <>
                  <UploadCloud size={20} />
                  Import Master Data
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileLoader;

