import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import FileLoader from './components/FileLoader';
import Scanner from './components/Scanner';
import Analyse from './components/Analyse';
import Profile from './components/Profile';
import Login from './components/Login';
import { parseExcelFile, processDataSources, parseMasterBackupExcel, parseExtranetWorkbook } from './utils/dataParser';
import { exportToExcel, exportToPDF } from './utils/exporter';
import { fetchLocationData, uploadLocationData, saveSupabaseScan, removeSupabaseScan, updateSupabaseSelectedInvoices } from './utils/supabaseService';
import { playSuccessSound, playErrorSound } from './utils/soundPlayer';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  MapPin, 
  Box,
  Search,
  ArrowRight,
  Car,
  Hash,
  X,
  RotateCcw,
  ClipboardList,
  Truck,
  Package,
  Filter,
  Info,
  FileText,
  Download,
  FileSpreadsheet,
  User,
  Heart,
  Monitor,
  Layout as LayoutIcon,
  Globe,
  Settings,
  Loader2
} from 'lucide-react';

const DEFAULT_LOCATIONS = [
  { id: 'vastral', name: 'Vastral Store', code: 'VAS-01', address: 'Vastral Main Road' },
  { id: 'bopal', name: 'Bopal Store', code: 'BOP-02', address: 'Bopal Ambli Road' },
  { id: 'shela', name: 'Shela Store', code: 'SHE-03', address: 'Shela VIP Road' },
  { id: 'surat', name: 'Surat Store', code: 'SUR-04', address: 'Surat Ring Road' },
  { id: 'nexa_rbi', name: 'Nexa RBI', code: 'NEX-05', address: 'Nexa RBI Hub' }
];

const DEFAULT_USERS = [
  { username: 'pegasus.spare', password: 'spare321', role: 'admin', name: 'Master Admin', locationId: 'all' },
  { username: 'vastral.user', password: '123', role: 'user', name: 'Vastral Manager', locationId: 'vastral' },
  { username: 'bopal.user', password: '123', role: 'user', name: 'Bopal Manager', locationId: 'bopal' },
  { username: 'shela.user', password: '123', role: 'user', name: 'Shela Manager', locationId: 'shela' },
  { username: 'surat.user', password: '123', role: 'user', name: 'Surat Manager', locationId: 'surat' },
  { username: 'nexa.user', password: '123', role: 'user', name: 'Nexa Manager', locationId: 'nexa_rbi' }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('load');
  const [data, setData] = useState({ shipments: [], parts: [] });
  const [rawData, setRawData] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]); 
  const [receivedBoxes, setReceivedBoxes] = useState([]); 
  const [scannedParts, setScannedParts] = useState([]); 
  const [scanTimestamps, setScanTimestamps] = useState({});
  const [auditMode, setAuditMode] = useState('box'); 
  const [recentScan, setRecentScan] = useState(null);

  useEffect(() => {
    if (recentScan) {
      if (recentScan.type === 'success') {
        playSuccessSound();
      } else if (recentScan.type === 'error') {
        playErrorSound();
      }
    }
  }, [recentScan]);
  const [shipmentFilter, setShipmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); 
  const [selectedBox, setSelectedBox] = useState(null);
  const [scannedPartDetail, setScannedPartDetail] = useState(null);
  const [scannedBoxDetail, setScannedBoxDetail] = useState(null); 
  const [activeCartonFilter, setActiveCartonFilter] = useState(null);
  const [selectedUrgentPart, setSelectedUrgentPart] = useState(null); 
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [infoBox, setInfoBox] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [autoConfirmParts, setAutoConfirmParts] = useState(() => {
    return localStorage.getItem('easyscan_autoconfirm_parts') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('easyscan_autoconfirm_parts', autoConfirmParts);
  }, [autoConfirmParts]);

  const [locations, setLocations] = useState(() => {
    const saved = localStorage.getItem('easyscan_locations_v29');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS;
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('easyscan_users_v29');
    return saved ? JSON.parse(saved) : DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('easyscan_current_user_v29');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentLocation, setCurrentLocation] = useState(() => {
    return localStorage.getItem('easyscan_current_loc_v29') || 'vastral';
  });

  const activeLocationObj = useMemo(() => {
    return locations.find(loc => loc.id === currentLocation) || locations[0] || { name: 'Main' };
  }, [locations, currentLocation]);

  useEffect(() => {
    localStorage.setItem('easyscan_locations_v29', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('easyscan_users_v29', JSON.stringify(users));
  }, [users]);

  // Auto-close Carton Info Box when all parts inside it are verified
  useEffect(() => {
    if (!infoBox) return;
    const partsList = data?.parts || [];
    const boxParts = partsList.filter(p => 
      selectedInvoices.includes(p.invoiceNumber) && 
      getBoxId(p).toUpperCase() === infoBox.toUpperCase()
    );
    if (boxParts.length === 0) return;
    
    const allVerified = boxParts.every(p => 
      scannedParts.includes(getPartKey(p.partNumber, infoBox))
    );
    
    if (allVerified) {
      const timer = setTimeout(() => {
        setInfoBox(null);
        setIsCameraOpen(true);
        setRecentScan({ type: 'success', text: `Box ${infoBox} fully verified! 🎉` });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scannedParts, infoBox, data, selectedInvoices]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('easyscan_current_user_v29', JSON.stringify(user));
    if (user.locationId !== 'all') {
      setCurrentLocation(user.locationId);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('easyscan_current_user_v29');
  };

  const handleAddLocation = (newLoc) => {
    setLocations(prev => [...prev, newLoc]);
  };

  const handleAddUser = (newUser) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleResetPassword = (username) => {
    setUsers(prev => prev.map(u => u.username === username ? { ...u, password: '123' } : u));
  };

  const handleChangePassword = (oldPass, newPass) => {
    if (currentUser?.password !== oldPass) return false;
    const updatedUser = { ...currentUser, password: newPass };
    setCurrentUser(updatedUser);
    localStorage.setItem('easyscan_current_user_v29', JSON.stringify(updatedUser));
    setUsers(prev => prev.map(u => u.username === currentUser.username ? { ...u, password: newPass } : u));
    return true;
  };

  const [theme, setTheme] = useState(localStorage.getItem('easyscan_theme') || 'dark');
  const [viewMode, setViewMode] = useState(localStorage.getItem('easyscan_viewmode') || 'pc');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-mode' : '';
    localStorage.setItem('easyscan_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('easyscan_viewmode', viewMode);
  }, [viewMode]);

  const isCourier = (transporter) => {
    const t = String(transporter || '').toLowerCase();
    return t.includes('scou') || t.includes('blrd') || t.includes('deli') || t.includes('courier');
  };

  const getBoxId = (p) => {
    return String(p?.containerNo || p?.shipLPNo || 'N/A').trim();
  };

  const getPartKey = (partNo, boxId) => {
    return `${String(partNo || '').trim().toUpperCase()}||${String(boxId || '').trim().toUpperCase()}`;
  };

  // Persistence (v29) with Multi-Location Isolation
  useEffect(() => {
    try {
      localStorage.setItem('easyscan_current_loc_v29', currentLocation);

      const locSuffix = `_${currentLocation}`;
      
      // Async fetch from Supabase (or fallback to localStorage)
      fetchLocationData(currentLocation).then(res => {
        setData(res.data);
        if (res.rawData) setRawData(res.rawData);
        setSelectedInvoices(res.selectedInvoices);
        setReceivedBoxes(res.receivedBoxes);
        setScannedParts(res.scannedParts);
        setScanTimestamps(res.scanTimestamps);
        setLastUpdate(res.lastUpdate);
      }).catch(err => console.error("Fetch data error:", err));

      const savedData = localStorage.getItem(`easyscan_data_v29${locSuffix}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed && Array.isArray(parsed.shipments) && Array.isArray(parsed.parts)) {
          setData(parsed);
        } else {
          setData({ shipments: [], parts: [] });
        }
      } else {
        setData({ shipments: [], parts: [] });
      }

      const savedSelected = localStorage.getItem(`easyscan_selected_v29${locSuffix}`);
      setSelectedInvoices(savedSelected ? JSON.parse(savedSelected) || [] : []);

      const savedBoxes = localStorage.getItem(`easyscan_boxes_v29${locSuffix}`);
      if (savedBoxes) {
        const parsedBoxes = JSON.parse(savedBoxes);
        setReceivedBoxes(Array.isArray(parsedBoxes) ? parsedBoxes.map(b => String(b).trim().toUpperCase()) : []);
      } else {
        setReceivedBoxes([]);
      }

      const savedParts = localStorage.getItem(`easyscan_scanned_parts_v29${locSuffix}`);
      if (savedParts) {
        const parsedParts = JSON.parse(savedParts);
        setScannedParts(Array.isArray(parsedParts) ? parsedParts.map(p => String(p).trim().toUpperCase()) : []);
      } else {
        setScannedParts([]);
      }

      const savedTimestamps = localStorage.getItem(`easyscan_timestamps_v29${locSuffix}`);
      setScanTimestamps(savedTimestamps ? JSON.parse(savedTimestamps) || {} : {});

      const savedRaw = localStorage.getItem(`easyscan_rawdata_v29${locSuffix}`);
      setRawData(savedRaw ? JSON.parse(savedRaw) : null);

      const savedLast = localStorage.getItem(`easyscan_last_update_v29${locSuffix}`);
      setLastUpdate(savedLast || null);

      const savedMode = localStorage.getItem(`easyscan_mode_v29${locSuffix}`);
      if (savedMode) setAuditMode(savedMode);

    } catch (e) {}
  }, [currentLocation]);

  useEffect(() => {
    try {
      const locSuffix = `_${currentLocation}`;
      if (data?.shipments) localStorage.setItem(`easyscan_data_v29${locSuffix}`, JSON.stringify(data));
      if (rawData) localStorage.setItem(`easyscan_rawdata_v29${locSuffix}`, JSON.stringify(rawData));
      localStorage.setItem(`easyscan_selected_v29${locSuffix}`, JSON.stringify(selectedInvoices));
      localStorage.setItem(`easyscan_boxes_v29${locSuffix}`, JSON.stringify(receivedBoxes));
      localStorage.setItem(`easyscan_scanned_parts_v29${locSuffix}`, JSON.stringify(scannedParts));
      localStorage.setItem(`easyscan_timestamps_v29${locSuffix}`, JSON.stringify(scanTimestamps));
      if (lastUpdate) localStorage.setItem(`easyscan_last_update_v29${locSuffix}`, lastUpdate);
      localStorage.setItem(`easyscan_mode_v29${locSuffix}`, auditMode);
    } catch (e) {}
  }, [data, rawData, selectedInvoices, receivedBoxes, scannedParts, scanTimestamps, auditMode, lastUpdate, currentLocation]);



  const handleFilesLoaded = async (files) => {
    setIsProcessing(true);
    // Use setTimeout to allow the UI to update with the loader
    setTimeout(async () => {
      try {
        const newRaw = {};
        for (const [key, file] of Object.entries(files)) {
          if (file) newRaw[key] = await parseExcelFile(file);
        }
        const processed = processDataSources(newRaw);
        if (!processed || !processed.shipments || !processed.parts) {
          alert("Invalid data structure.");
          setIsProcessing(false);
          return;
        }
        setRawData(newRaw);
        setData({ shipments: processed.shipments, parts: processed.parts });
        uploadLocationData(currentLocation, processed.shipments, processed.parts);
        setSelectedInvoices([]);
        updateSupabaseSelectedInvoices(currentLocation, []);
        setReceivedBoxes([]);
        setScannedParts([]);
        setScanTimestamps({});
        setAuditMode('box');
        const now = new Date().toLocaleString();
        setLastUpdate(now);
        localStorage.setItem(`easyscan_last_update_v29_${currentLocation}`, now);
        setActiveTab('shipment');
      } catch (err) {
        alert("Error: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleMasterImport = async (file) => {
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const newRaw = await parseMasterBackupExcel(file);
        if (!newRaw || !newRaw.dispatchStatus) {
          alert("Invalid Master Backup structure. Make sure it contains the original sheets.");
          setIsProcessing(false);
          return;
        }
        const processed = processDataSources(newRaw);
        if (!processed || !processed.shipments || !processed.parts) {
          alert("Error processing master backup sheets.");
          setIsProcessing(false);
          return;
        }
        setRawData(newRaw);
        setData({ shipments: processed.shipments, parts: processed.parts });
        uploadLocationData(currentLocation, processed.shipments, processed.parts);
        setSelectedInvoices([]);
        updateSupabaseSelectedInvoices(currentLocation, []);
        setReceivedBoxes([]);
        setScannedParts([]);
        setScanTimestamps({});
        setAuditMode('box');
        const now = new Date().toLocaleString();
        setLastUpdate(now);
        localStorage.setItem(`easyscan_last_update_v29_${currentLocation}`, now);
        setActiveTab('shipment');
      } catch (err) {
        alert("Error importing master backup: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleExtranetImport = async (extranetFile, partMasterFile, bodyshopTrackingFile) => {
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const newRaw = await parseExtranetWorkbook(extranetFile, partMasterFile, bodyshopTrackingFile);
        if (!newRaw || (!newRaw.dispatchStatus?.length && !newRaw.mbr?.length && !newRaw.dispatchDetail?.length)) {
          alert("Could not extract Dispatch Status, MBR, or Dispatch Detail sheets. Make sure sheet names match expected formats.");
          setIsProcessing(false);
          return;
        }
        const processed = processDataSources(newRaw);
        if (!processed || !processed.shipments || !processed.parts) {
          alert("Error processing Extranet workbook sheets.");
          setIsProcessing(false);
          return;
        }
        setRawData(newRaw);
        setData({ shipments: processed.shipments, parts: processed.parts });
        uploadLocationData(currentLocation, processed.shipments, processed.parts);
        setSelectedInvoices([]);
        updateSupabaseSelectedInvoices(currentLocation, []);
        setReceivedBoxes([]);
        setScannedParts([]);
        setScanTimestamps({});
        setAuditMode('box');
        const now = new Date().toLocaleString();
        setLastUpdate(now);
        localStorage.setItem(`easyscan_last_update_v29_${currentLocation}`, now);
        setActiveTab('shipment');
      } catch (err) {
        alert("Error importing Extranet workbook: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const handleSupplementalImport = async (pmFile, btFile) => {
    if (!data || !data.parts || data.parts.length === 0) {
      alert("No active inventory/parts found. Please perform an Extranet or 5-Sheet import first.");
      return;
    }
    setIsProcessing(true);
    setTimeout(async () => {
      try {
        const binMap = new Map();
        if (pmFile) {
          const pmRaw = await parseExcelFile(pmFile);
          const pmStart = pmRaw.findIndex(r => r && r.some(c => c && String(c).toLowerCase().includes('part number')));
          const startIdx = pmStart !== -1 ? pmStart : 0;
          pmRaw.slice(startIdx + 1).forEach(row => {
            if (!row || row.length < 2) return;
            const partNo = String(row[1] || '').trim();
            const binLoc = String(row[5] || '').trim();
            if (partNo) binMap.set(partNo, binLoc);
          });
        }

        const urgentMap = new Map();
        if (btFile) {
          const btRaw = await parseExcelFile(btFile);
          const btStart = btRaw.findIndex(r => r && r.some(c => c && String(c).toLowerCase().includes('part number')));
          const startIdx = btStart !== -1 ? btStart : 0;
          const btHeader = btRaw[startIdx] || [];
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
          btRaw.slice(startIdx + 1).forEach(row => {
            if (!row) return;
            const partNo = String(row[btCols.part] || '').trim();
            const vehNo = String(row[btCols.veh] || '').trim();
            const model = String(row[btCols.model] || '').trim();
            const qty = String(row[btCols.qty] || '').trim();
            if (partNo) {
              if (!urgentMap.has(partNo)) urgentMap.set(partNo, []);
              const existing = urgentMap.get(partNo);
              const isDuplicate = existing.some(item => item.vehicleNo === vehNo && item.model === model);
              if (!isDuplicate) {
                existing.push({ vehicleNo: vehNo, model, qty });
              }
            }
          });
        }

        const updatedParts = (data?.parts || []).map(p => {
          let newBin = p.binLocation;
          if (pmFile && binMap.has(p.partNumber)) {
            newBin = binMap.get(p.partNumber);
          }
          let newUrgent = p.isUrgent;
          let newUrgentDetails = p.urgentDetails || [];
          if (btFile) {
            if (urgentMap.has(p.partNumber)) {
              newUrgent = true;
              newUrgentDetails = urgentMap.get(p.partNumber);
            }
          }
          return {
            ...p,
            binLocation: newBin,
            isUrgent: newUrgent,
            urgentDetails: newUrgentDetails
          };
        });

        let updatedRaw = rawData ? { ...rawData } : null;
        if (updatedRaw) {
          if (pmFile) updatedRaw.partMaster = await parseExcelFile(pmFile);
          if (btFile) updatedRaw.bodyshopTracking = await parseExcelFile(btFile);
          setRawData(updatedRaw);
        }

        setData({ shipments: data?.shipments || [], parts: updatedParts });
        uploadLocationData(currentLocation, data?.shipments || [], updatedParts);
        const now = new Date().toLocaleString();
        setLastUpdate(now);
        localStorage.setItem(`easyscan_last_update_v29_${currentLocation}`, now);
        alert("Supplemental sheets updated successfully!");
      } catch (err) {
        alert("Error updating supplemental sheets: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  const triggerFocus = () => setFocusTrigger(prev => prev + 1);

  const handleBack = () => {
    if (activeTab === 'scan') setActiveTab('shipment');
    else if (activeTab === 'tally') setActiveTab('scan');
    else if (activeTab === 'shipment') setActiveTab('load');
  };

  const handleManualReceiveBox = (boxId) => {
    const q = String(boxId || '').trim().toUpperCase();
    if (!receivedBoxes.includes(q)) {
      setReceivedBoxes(prev => [...prev, q]);
      saveSupabaseScan(currentLocation, q, 'box', currentUser);
      setRecentScan({ type: 'success', text: `Rcvd: ${q}` });
    }
    setScannedBoxDetail(null);
    triggerFocus();
    if (auditMode === 'box') {
      setIsCameraOpen(true);
    }
  };

  const handleUnreceiveBox = (boxId) => {
    const q = String(boxId || '').trim().toUpperCase();
    setReceivedBoxes(prev => {
      const newList = prev.filter(b => b !== q);
      if (newList.length < prev.length) {
        removeSupabaseScan(currentLocation, q, 'box');
        setRecentScan({ type: 'success', text: `Removed Box: ${q}` });
      }
      return newList;
    });
    triggerFocus();
  };

  const handleManualReceivePart = (partNumber, boxId) => {
    const key = getPartKey(partNumber, boxId);
    if (!scannedParts.includes(key)) {
      const nowStr = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setScannedParts(prev => [...prev, key]);
      saveSupabaseScan(currentLocation, key, 'part', currentUser);
      setScanTimestamps(prev => ({ ...prev, [key]: nowStr }));
      setRecentScan({ type: 'success', text: `Vrf: ${partNumber}` });
    }
    setScannedPartDetail(null); // Close part detail popup
    setSearchQuery('');
    triggerFocus();
    if (auditMode === 'part') {
      setIsCameraOpen(true); // Re-open camera for next scan
    }
  };

  const handleUnreceivePart = (partNumber, boxId) => {
    const key = getPartKey(partNumber, boxId);
    setScannedParts(prev => {
      const newList = prev.filter(p => p !== key);
      if (newList.length < prev.length) {
        removeSupabaseScan(currentLocation, key, 'part');
        setRecentScan({ type: 'success', text: `Removed Part: ${partNumber}` });
      }
      return newList;
    });
    setScanTimestamps(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    triggerFocus();
  };

  const handleShipmentScan = useCallback((query) => {
    const q = String(query || '').trim().toLowerCase();
    const shipments = data?.shipments || [];
    const shipment = shipments.find(s => 
      (s.trackingNo && String(s.trackingNo).toLowerCase() === q) || 
      (s.invoiceNo && String(s.invoiceNo).toLowerCase() === q) || 
      (s.truckNo && String(s.truckNo).toLowerCase() === q) || 
      (s.gatePass && String(s.gatePass).toLowerCase() === q)
    );
    if (shipment) {
      if (!selectedInvoices.includes(shipment.invoiceNo)) {
        const newSel = [...selectedInvoices, shipment.invoiceNo];
        setSelectedInvoices(newSel);
        updateSupabaseSelectedInvoices(currentLocation, newSel);
      }
      setRecentScan({ type: 'success', text: `Selected: ${shipment.invoiceNo}` });
    }
  }, [data, selectedInvoices, currentLocation]);

  const handleScan = useCallback((scannedText) => {
    const q = String(scannedText || '').trim().toUpperCase();
    if (!q) return;
    const parts = data?.parts || [];
    if (auditMode === 'box') {
      if (receivedBoxes.includes(q)) {
        setRecentScan({ type: 'error', text: `Dpl: ${q}` });
        return;
      }
      const isBox = parts.some(p => selectedInvoices.includes(p.invoiceNumber) && (String(p.containerNo || '').toUpperCase() === q || String(p.shipLPNo || '').toUpperCase() === q));
      if (isBox) {
        // Show box detail popup and close camera
        const boxParts = parts.filter(p => selectedInvoices.includes(p.invoiceNumber) && (String(p.containerNo || '').toUpperCase() === q || String(p.shipLPNo || '').toUpperCase() === q));
        setScannedBoxDetail({ boxId: q, parts: boxParts });
        setIsCameraOpen(false);
        setRecentScan({ type: 'success', text: `Box Found: ${q}` });
      } else {
        setRecentScan({ type: 'error', text: `No ID: ${q}` });
      }
    } else {
      const eligibleCartons = [...new Set(parts.filter(p => selectedInvoices.includes(p.invoiceNumber)).map(p => getBoxId(p).toUpperCase()))];
      const exactCartonMatch = eligibleCartons.find(c => c === q);
      if (exactCartonMatch) {
        setInfoBox(exactCartonMatch);
        setIsCameraOpen(false);
        setSearchQuery(''); 
        setRecentScan({ type: 'success', text: `Opened Carton: ${exactCartonMatch}` });
        return;
      }

      let matchingPart = parts.find(p => 
        selectedInvoices.includes(p.invoiceNumber) && String(p.partNumber || '').toUpperCase() === q &&
        (receivedBoxes.includes(String(p.containerNo || '').toUpperCase()) || receivedBoxes.includes(String(p.shipLPNo || '').toUpperCase())) &&
        (!activeCartonFilter || (String(p.containerNo || '').toUpperCase() === activeCartonFilter || String(p.shipLPNo || '').toUpperCase() === activeCartonFilter))
      );

      if (!matchingPart) {
        matchingPart = parts.find(p => 
          selectedInvoices.includes(p.invoiceNumber) && String(p.partNumber || '').toUpperCase().includes(q) &&
          (receivedBoxes.includes(String(p.containerNo || '').toUpperCase()) || receivedBoxes.includes(String(p.shipLPNo || '').toUpperCase())) &&
          (!activeCartonFilter || (String(p.containerNo || '').toUpperCase() === activeCartonFilter || String(p.shipLPNo || '').toUpperCase() === activeCartonFilter))
        );
      }

      if (matchingPart) {
        if (autoConfirmParts) {
          handleManualReceivePart(matchingPart.partNumber, getBoxId(matchingPart));
          setRecentScan({ type: 'success', text: `Auto-Verified: ${matchingPart.partNumber}` });
        } else {
          setScannedPartDetail(matchingPart); // Show popup modal with part detail
          setIsCameraOpen(false); // Close camera to let user press OK
          setRecentScan({ type: 'success', text: `Found: ${matchingPart.partNumber}` });
        }
      } else {
        setRecentScan({ type: 'error', text: `No Match: ${q}` });
      }
    }
  }, [auditMode, selectedInvoices, receivedBoxes, data, activeCartonFilter, scannedParts, autoConfirmParts]);

  const safeShipments = data?.shipments || [];
  const safeParts = data?.parts || [];
  const activeShipments = safeShipments.filter(s => selectedInvoices.includes(s.invoiceNo));
  
  const totalBoxesInSelection = useMemo(() => {
    return activeShipments.reduce((acc, s) => acc + (s.totalBoxes || 0), 0);
  }, [activeShipments]);

  const allPendingBoxes = useMemo(() => {
    const boxes = [];
    activeShipments.forEach(s => (s.boxes || []).forEach(b => { 
      const bNorm = String(b || '').trim().toUpperCase();
      if (b && !receivedBoxes.includes(bNorm)) boxes.push(b); 
    }));
    return [...new Set(boxes)];
  }, [activeShipments, receivedBoxes]);

  const allReceivedBoxes = useMemo(() => {
    return receivedBoxes.filter(b => activeShipments.some(s => (s.boxes || []).some(sb => String(sb || '').trim().toUpperCase() === b)));
  }, [activeShipments, receivedBoxes]);

  const pendingPartsToAudit = useMemo(() => {
    let eligible = safeParts.filter(p => {
      const invMatch = selectedInvoices.includes(p.invoiceNumber);
      const boxId = getBoxId(p).toUpperCase();
      const boxReceived = receivedBoxes.includes(boxId);
      return invMatch && boxReceived;
    });

    if (activeCartonFilter) {
      eligible = eligible.filter(p => getBoxId(p).toUpperCase() === activeCartonFilter);
    }

    const aggregated = [];
    const map = new Map();
    eligible.forEach(p => {
      const boxId = getBoxId(p);
      const uniqueKey = `${p.partNumber}-${boxId}`;
      if (!map.has(uniqueKey)) {
        map.set(uniqueKey, { ...p });
        aggregated.push(map.get(uniqueKey));
      } else {
        const existing = map.get(uniqueKey);
        existing.qty += p.qty;
      }
    });
    return aggregated;
  }, [safeParts, selectedInvoices, receivedBoxes, activeCartonFilter]);

  const stats = useMemo(() => {
    const relevantParts = safeParts.filter(p => selectedInvoices.includes(p.invoiceNumber));
    const totalPartsCount = relevantParts.reduce((acc, p) => acc + (p.qty || 0), 0);
    const scannedPartsCount = relevantParts.filter(p => {
      const boxId = getBoxId(p);
      return scannedParts.includes(getPartKey(p.partNumber, boxId));
    }).reduce((acc, p) => acc + (p.qty || 0), 0);
    return { progress: totalPartsCount > 0 ? (scannedPartsCount / totalPartsCount) * 100 : 0, totalPartsCount, scannedPartsCount };
  }, [selectedInvoices, safeParts, scannedParts]);

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout 
      activeTab={activeTab} onTabChange={setActiveTab} showBack={activeTab !== 'load'} onBack={handleBack}
      theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      viewMode={viewMode} onViewModeToggle={() => setViewMode(viewMode === 'pc' ? 'mobile' : 'pc')}
      currentLocationName={activeLocationObj.name}
      onLogout={handleLogout}
    >
      
      {isProcessing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          <div style={{ textAlign: 'center' }}>
            <h2 className="text-xl font-bold" style={{ color: '#fff' }}>Processing Audit Data</h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Please wait while we normalize your inventory...</p>
          </div>
        </div>
      )}

      {activeTab === 'load' && (
        <div className="animate-fade-in" style={{ padding: '10px', overflowY: 'auto', height: '100%' }}>
          <FileLoader 
            onFilesLoaded={handleFilesLoaded} 
            onMasterImport={handleMasterImport}
            onExtranetImport={handleExtranetImport}
            onSupplementalImport={handleSupplementalImport}
            currentData={rawData}
            isProcessing={isProcessing} 
            lastUpdate={lastUpdate}
          />
        </div>
      )}

      {activeTab === 'analyse' && (
        <div className="animate-fade-in" style={{ padding: '10px', overflowY: 'auto', height: '100%' }}>
          <Analyse data={data} />
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="animate-fade-in" style={{ padding: '10px', overflowY: 'auto', height: '100%' }}>
          <Profile 
            currentUser={currentUser} 
            locations={locations} 
            users={users} 
            onAddLocation={handleAddLocation} 
            onAddUser={handleAddUser} 
            onResetPassword={handleResetPassword} 
            onChangePassword={handleChangePassword} 
            onLogout={handleLogout} 
            currentLocation={currentLocation} 
            onSelectLocation={(newLoc) => setCurrentLocation(newLoc)} 
          />
        </div>
      )}

      {activeTab === 'shipment' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '10px' }}>
          <div style={{ flexShrink: 0, marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="text-xl font-bold">Shipments</h2>
                <span style={{ fontSize: '11px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  Total: {activeShipments.length}
                </span>
                {selectedInvoices.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>
                      {selectedInvoices.length} SEL
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: 'var(--success)', color: '#fff', padding: '2px 8px', borderRadius: '10px' }}>
                      {totalBoxesInSelection} BOXES
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedInvoices([]); }} style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger)', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>CLEAR</button>
                  </div>
                )}
              </div>
              {selectedInvoices.length > 0 && <button onClick={() => { setActiveTab('scan'); triggerFocus(); }} className="btn btn-primary btn-sm">Start <ArrowRight size={14} /></button>}
            </div>
            <Scanner onScan={handleShipmentScan} placeholder="Scan GRN/Inv..." focusTrigger={focusTrigger} />
            <div style={{ position: 'relative', marginTop: '8px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input type="text" className="input-text" style={{ paddingLeft: '36px' }} placeholder="Filter shipments..." value={shipmentFilter} onChange={e => setShipmentFilter(e.target.value)} />
            </div>
          </div>
          
          <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {safeShipments.filter(s => { const q = (shipmentFilter || '').toLowerCase(); return String(s.invoiceNo || '').toLowerCase().includes(q) || String(s.trackingNo || '').toLowerCase().includes(q) || String(s.truckNo || '').toLowerCase().includes(q) || String(s.transporter || '').toLowerCase().includes(q); }).map((s, idx) => {
              const isSelected = selectedInvoices.includes(s.invoiceNo);
              const courier = isCourier(s.transporter);
              return (
                <div key={idx} onClick={() => setSelectedInvoices(prev => prev.includes(s.invoiceNo) ? prev.filter(inv => inv !== s.invoiceNo) : [...prev, s.invoiceNo])} className="card card-clickable" style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isSelected ? 'var(--primary)' : 'var(--border-color)', border: isSelected ? '2px solid var(--primary-hover)' : 'none' }} />
                      <span className="font-bold text-base">{s.invoiceNo}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {courier ? <Package size={14} color="var(--secondary)" /> : <Truck size={14} color="var(--warning)" />}
                        {s.transporter}
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px' }}>{s.totalBoxes} Bx</span>
                  </div>
                  {(courier ? s.trackingNo : s.truckNo) && (
                    <div style={{ display: 'flex', gap: '16px', marginLeft: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {courier && s.trackingNo && <span>Tracking No: <strong style={{ color: 'var(--text-primary)' }}>{s.trackingNo}</strong></span>}
                      {!courier && s.truckNo && <span>Truck No: <strong style={{ color: 'var(--text-primary)' }}>{s.truckNo}</strong></span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'scan' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '10px', position: 'relative' }}>
          
          {/* Info Box Modal Pop-up */}
          {/* Scanned Part Detail Modal (shows on camera scan match) */}
          {scannedPartDetail && (
            <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5dvh 16px 16px', overflowY: 'auto' }}>
              <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid var(--success)' }}>
                <div style={{ padding: '14px 18px', backgroundColor: 'rgba(52,199,89,0.15)', borderBottom: '1px solid var(--success)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={22} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: 'var(--success)' }}>PART FOUND ✓</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Verify and press OK to confirm</div>
                  </div>
                </div>
                <div style={{ padding: '18px' }}>
                  <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '8px' }}>{scannedPartDetail.partNumber}</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>{scannedPartDetail.description || '—'}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Qty</div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--primary)' }}>{scannedPartDetail.qty}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Bin Location</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--success)' }}>{scannedPartDetail.binLocation || 'N/A'}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Invoice</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{scannedPartDetail.invoiceNumber || '—'}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Box/Carton</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{getBoxId(scannedPartDetail) || '—'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setScannedPartDetail(null); setIsCameraOpen(true); }} className="btn" style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700 }}>Cancel</button>
                  <button onClick={() => handleManualReceivePart(scannedPartDetail.partNumber, getBoxId(scannedPartDetail))} className="btn btn-primary" style={{ flex: 2, fontSize: '16px', fontWeight: 900, padding: '14px' }}>✓ OK — Verified</button>
                </div>
              </div>
            </div>
          )}

          {/* Scanned Box Detail Modal */}
          {scannedBoxDetail && (
            <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5dvh 16px 16px', overflowY: 'auto' }}>
              <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', border: '2px solid var(--primary)' }}>
                <div style={{ padding: '14px 18px', backgroundColor: 'rgba(0,122,255,0.12)', borderBottom: '1px solid var(--primary)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Box size={22} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '14px', color: 'var(--primary)' }}>BOX FOUND ✓</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{scannedBoxDetail.boxId} — {scannedBoxDetail.parts.length} part(s)</div>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', maxHeight: '40dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {scannedBoxDetail.parts.map((p, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px' }}>{p.partNumber}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{p.description}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, fontSize: '13px', color: 'var(--primary)' }}>Qty: {p.qty}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--success)' }}>{p.binLocation || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setScannedBoxDetail(null); setIsCameraOpen(true); }} className="btn" style={{ flex: 1, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 700 }}>Cancel</button>
                  <button onClick={() => handleManualReceiveBox(scannedBoxDetail.boxId)} className="btn btn-primary" style={{ flex: 2, fontSize: '16px', fontWeight: 900, padding: '14px' }}>✓ OK — Received</button>
                </div>
              </div>
            </div>
          )}

          {infoBox && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
                {/* Modal Header */}
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Box size={18} className="text-primary" />
                    <h3 className="font-bold text-sm">Box Contents: {infoBox}</h3>
                  </div>
                  <button onClick={() => { setInfoBox(null); setIsCameraOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body (Parts List) */}
                <div style={{ padding: '12px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, maxHeight: '60dvh' }}>
                  {safeParts.filter(p => getBoxId(p).toUpperCase() === infoBox.toUpperCase() && selectedInvoices.includes(p.invoiceNumber)).map((p, idx) => {
                    const isVerified = scannedParts.includes(getPartKey(p.partNumber, infoBox));
                    return (
                      <div key={idx} className="card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', backgroundColor: isVerified ? 'rgba(52, 199, 89, 0.05)' : 'var(--bg-card)', borderColor: isVerified ? 'var(--success)' : 'var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div style={{ color: isVerified ? 'var(--success)' : 'var(--text-tertiary)', flexShrink: 0 }}>
                            {isVerified ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="font-bold text-xs">{p.partNumber}</span>
                              <span style={{ fontSize: '9px', fontWeight: 800, backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px' }}>Qty: {p.qty}</span>
                              <span style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', color: 'var(--text-secondary)' }}>Inv: {p.invoiceNumber}</span>
                            </div>
                            <p className="text-[11px] text-muted truncate" style={{ marginTop: '2px' }}>{p.description}</p>
                            
                            {/* Vehicle Number (Urgent details) */}
                            {p.isUrgent && p.urgentDetails && p.urgentDetails.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                {p.urgentDetails.map((u, uidx) => (
                                  <span key={uidx} style={{ fontSize: '9px', fontWeight: 800, backgroundColor: 'rgba(255,149,0,0.15)', color: 'var(--warning)', padding: '1px 5px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                    <Car size={9} /> {u.vehicleNo} {u.model ? `(${u.model})` : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Right Side: Bin Location & OK/Reset Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                              <MapPin size={10} /> {p.binLocation || 'N/A'}
                            </span>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', display: 'block', marginTop: '2px', fontWeight: 600 }}>{isVerified ? 'Verified' : 'Pending'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {!isVerified ? (
                              <button 
                                onClick={() => handleManualReceivePart(p.partNumber, infoBox)} 
                                className="btn btn-primary btn-xs" 
                                style={{ padding: '4px 10px', fontWeight: 800 }}
                              >
                                OK
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleUnreceivePart(p.partNumber, infoBox)} 
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                              >
                                <RotateCcw size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-card)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }}>
                  <button onClick={() => { setInfoBox(null); setIsCameraOpen(true); }} className="btn btn-primary btn-sm" style={{ padding: '6px 16px', fontWeight: 700 }}>Close</button>
                </div>
              </div>
            </div>
          )}

          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-color)' }}>
              <button onClick={() => { setAuditMode('box'); setSearchQuery(''); triggerFocus(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: auditMode === 'box' ? 'var(--bg-surface)' : 'transparent', color: auditMode === 'box' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '11px' }}>1. BOXES</button>
              <button onClick={() => { setAuditMode('part'); setSearchQuery(''); triggerFocus(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: auditMode === 'part' ? 'var(--bg-surface)' : 'transparent', color: auditMode === 'part' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '11px' }}>2. PARTS</button>
            </div>
            
            {auditMode === 'part' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  <input 
                    type="checkbox" 
                    checked={autoConfirmParts} 
                    onChange={(e) => { setAutoConfirmParts(e.target.checked); triggerFocus(); }}
                    style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                  />
                  Auto-Confirm (No Popup)
                </label>
              </div>
            )}
            
            <Scanner 
              onScan={handleScan} 
              onChange={setSearchQuery}
              value={searchQuery}
              placeholder={auditMode === 'box' ? "Box ID (Live Search)..." : "Part/Carton (Live Search)..."} 
              focusTrigger={focusTrigger} 
              isCameraOpenProp={isCameraOpen}
              setIsCameraOpenProp={setIsCameraOpen}
              inlineDetail={
                scannedPartDetail ? { type: 'part', ...scannedPartDetail, boxId: getBoxId(scannedPartDetail) } :
                scannedBoxDetail ? { type: 'box', ...scannedBoxDetail } :
                null
              }
              onInlineOk={() => {
                if (scannedPartDetail) handleManualReceivePart(scannedPartDetail.partNumber, getBoxId(scannedPartDetail));
                else if (scannedBoxDetail) handleManualReceiveBox(scannedBoxDetail.boxId);
              }}
              onInlineCancel={() => {
                setScannedPartDetail(null);
                setScannedBoxDetail(null);
                setIsCameraOpen(true);
              }}
            />
            {recentScan && (
              <div className="card" style={{ borderLeft: `4px solid ${recentScan.type === 'success' ? 'var(--success)' : 'var(--danger)'}`, padding: '4px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>{recentScan.type === 'success' ? <CheckCircle2 size={16} color="var(--success)" /> : <AlertTriangle size={16} color="var(--danger)" />} {recentScan.text}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">
                {auditMode === 'box' ? `Pending (${allPendingBoxes.length})` : `Checklist (${pendingPartsToAudit.filter(p => !scannedParts.includes(getPartKey(p.partNumber, getBoxId(p)))).length})`}
              </h3>
              {auditMode === 'part' && activeCartonFilter && (
                <button onClick={() => { setActiveCartonFilter(null); triggerFocus(); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--primary)', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}>
                  <Filter size={10} /> {activeCartonFilter} <X size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {auditMode === 'box' ? (
              <>
                {allPendingBoxes.filter(b => String(b || '').toUpperCase().includes(searchQuery.toUpperCase())).map(b => (
                  <div key={b} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={14} color="var(--text-tertiary)" /><span className="font-semibold text-sm">{b}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => { setInfoBox(b); setIsCameraOpen(false); }} 
                        className="btn btn-xs" 
                        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 8px' }}
                        title="View parts in this box"
                      >
                        <Info size={14} /> Info
                      </button>
                      <button onClick={() => handleManualReceiveBox(b)} className="btn btn-primary btn-xs" style={{ padding: '4px 10px' }}>OK</button>
                    </div>
                  </div>
                ))}
                {allReceivedBoxes.length > 0 && (
                  <>
                    <h3 className="text-[10px] font-bold text-success uppercase mt-4 mb-2">Received ({allReceivedBoxes.length})</h3>
                    {allReceivedBoxes.filter(b => String(b || '').toUpperCase().includes(searchQuery.toUpperCase())).map(b => (
                      <div key={b} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', opacity: 0.6, marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={14} color="var(--success)" /><span className="font-semibold text-sm">{b}</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={() => { setInfoBox(b); setIsCameraOpen(false); }} 
                            className="btn btn-xs" 
                            style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '4px 8px' }}
                            title="View parts in this box"
                          >
                            <Info size={14} /> Info
                          </button>
                          <button onClick={() => handleUnreceiveBox(b)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><RotateCcw size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              pendingPartsToAudit.filter(p => { 
                const q = searchQuery.toUpperCase(); 
                return String(p.partNumber||'').toUpperCase().includes(q) || String(p.description||'').toUpperCase().includes(q) || getBoxId(p).toUpperCase().includes(q); 
              }).map((p, i) => {
                const boxId = getBoxId(p);
                const isReceived = scannedParts.includes(getPartKey(p.partNumber, boxId));
                return (
                  <div key={i} className="card" style={{ display: 'flex', gap: '8px', padding: '6px 8px', opacity: isReceived ? 0.5 : 1, borderColor: isReceived ? 'var(--success)' : 'var(--border-color)' }}>
                    <div style={{ color: isReceived ? 'var(--success)' : 'var(--text-tertiary)', marginTop: '2px' }}>{isReceived ? <CheckCircle2 size={16} /> : <Circle size={16} />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="font-bold text-sm" style={{ letterSpacing: '-0.01em', fontSize: '13px' }}>{p.partNumber}</span>
                          <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: 'rgba(0,122,255,0.1)', color: 'var(--primary)', padding: '1px 5px', borderRadius: '4px' }}>Q: {p.qty}</span>
                          <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '2px' }}><MapPin size={9} /> {p.binLocation}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {!isReceived && <button onClick={() => handleManualReceivePart(p.partNumber, boxId)} className="btn btn-primary" style={{ padding: '4px 14px', fontSize: '11px', fontWeight: 800 }}>OK</button>}
                          {isReceived && <button onClick={() => handleUnreceivePart(p.partNumber, boxId)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><RotateCcw size={18} /></button>}
                        </div>
                      </div>
                      <p className="text-muted truncate" style={{ marginTop: '1px', fontWeight: 500, fontSize: '10px' }}>{p.description}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}><FileText size={8}/> {p.invoiceNumber}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}><Box size={8}/> {boxId}</span>
                        {p.isUrgent && p.urgentDetails && p.urgentDetails.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {p.urgentDetails.map((u, uidx) => (
                              <span key={uidx} style={{ fontSize: '10px', fontWeight: 800, backgroundColor: 'rgba(255,149,0,0.15)', color: 'var(--warning)', padding: '1px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Car size={10} /> {u.vehicleNo} {u.model ? `(${u.model})` : ''} {u.qty ? `[Qty: ${u.qty}]` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'tally' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px' }}>
          <div style={{ flexShrink: 0, marginBottom: '20px' }}>
            <h2 className="text-2xl font-bold mb-4">Audit Reports</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={async () => {
                  await exportToExcel(safeParts, safeShipments, scannedParts, selectedInvoices, scanTimestamps);
                  setRecentScan({ type: 'success', text: 'Excel Saved to Downloads' });
                }}
                className="btn btn-primary" 
                style={{ padding: '20px', fontSize: '16px', justifyContent: 'center', gap: '12px' }}
              >
                <FileSpreadsheet size={24} /> Export to Excel (.xlsx)
              </button>
              <button 
                onClick={() => {
                  exportToPDF(safeParts, safeShipments, scannedParts, selectedInvoices, scanTimestamps);
                  setRecentScan({ type: 'success', text: 'PDF Saved to Downloads' });
                }}
                className="btn" 
                style={{ padding: '20px', fontSize: '16px', justifyContent: 'center', gap: '12px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 700 }}
              >
                <FileText size={24} color="var(--danger)" /> Export to PDF (.pdf)
              </button>

            </div>
            
            <div style={{ marginTop: '32px' }}>
              <h3 className="text-sm font-bold text-muted uppercase mb-4">Summary Statistics</h3>
              <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-sm font-semibold">Verification Progress</span>
                  <span className="text-sm font-bold">{Math.round(stats.progress)}%</span>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.progress}%`, backgroundColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div>
                    <p className="text-[10px] text-muted font-bold uppercase">Total Parts</p>
                    <p className="text-xl font-bold">{stats.totalPartsCount}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="text-[10px] text-muted font-bold uppercase">Verified</p>
                    <p className="text-xl font-bold text-success">{stats.scannedPartsCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
            <LayoutIcon size={48} />
          </div>
          <h2 className="text-3xl font-bold mb-2">EasyScan</h2>
          <p className="text-muted mb-8" style={{ maxWidth: '300px' }}>Advanced Warehouse Audit & Inventory Receiving System</p>
          
          <div className="card" style={{ width: '100%', maxWidth: '360px', padding: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', justifyContent: 'center' }}>
              <User size={20} className="text-primary" />
              <span className="text-sm font-bold text-muted uppercase">Developed By</span>
            </div>
            <h3 className="text-2xl font-black mb-4">TEJAS PANCHAL</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
              <div className="text-muted"><Globe size={16} /></div>
              <div className="text-muted"><Settings size={16} /></div>
              <div className="text-primary"><Heart size={16} fill="var(--primary)" /></div>
            </div>
          </div>
          
          <p className="text-[10px] text-muted font-bold uppercase mt-12">Version 2.0.0 (Enterprise Edition)</p>
          <p className="text-[10px] text-muted font-medium mt-1">© 2026 EasyScan Systems</p>
        </div>
      )}

    </Layout>
  );
};

export default App;
