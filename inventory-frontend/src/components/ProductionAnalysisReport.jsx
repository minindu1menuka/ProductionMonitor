import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Search, Plus, Download, Trash2, Save, Database, AlertCircle, RefreshCw, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ProductionAnalysisReport() {
  const [sku, setSku] = useState('');
  const [newSkuInput, setNewSkuInput] = useState(''); 
  const [loadedSKUs, setLoadedSKUs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allParts, setAllParts] = useState([]);

  // Toast Notification State එක
  const [toastMessage, setToastMessage] = useState(null);

  // ලස්සන Notification එක පෙන්නන Function එක
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const fetchAllParts = async () => {
      try {
        const res = await axios.get('https://productionmonitor.onrender.com/api/parts');
        setAllParts(res.data);
      } catch (error) {
        console.error("Error fetching parts:", error);
      }
    };
    fetchAllParts();
  }, []);

  const handleSearch = async () => {
    if (!sku) return showToast("Please enter an SKU to search.", "error");
    if (loadedSKUs.some(s => s.sku === sku)) return showToast("This SKU is already loaded.", "info");

    setLoading(true);
    try {
      const response = await axios.get(`https://productionmonitor.onrender.com/api/items/${sku}`);
      if (response.data.length === 0) {
        showToast("No data found for this SKU. Use 'Create New SKU' to add it.", "error");
      } else {
        const newSkuGroup = {
          sku: sku,
          masterQty: response.data[0].SKU_Qty || 1,
          items: response.data
        };
        setLoadedSKUs([newSkuGroup, ...loadedSKUs]); 
        setSku('');
        showToast("SKU loaded successfully!", "success");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("Error loading SKU data.", "error");
    }
    setLoading(false);
  };

  const handleCreateNewSKU = () => {
    const trimmedSku = newSkuInput.trim();
    if (!trimmedSku) return showToast("Please enter a new SKU name.", "error");
    if (loadedSKUs.some(s => s.sku === trimmedSku)) return showToast("This SKU is already on the screen.", "info");

    const newSkuGroup = { sku: trimmedSku, masterQty: 1, items: [] };
    setLoadedSKUs([newSkuGroup, ...loadedSKUs]);
    setNewSkuInput(''); 
    showToast(`New SKU '${trimmedSku}' created!`, "success");
    setTimeout(() => handleAddRow(0, trimmedSku, 1), 100);
  };

  const handleDeleteSKU = async (skuIndex, skuName) => {
    const isConfirmed = window.confirm(`Are you sure you want to permanently delete the entire SKU '${skuName}'?`);
    if (!isConfirmed) return;

    try {
      await axios.delete(`https://productionmonitor.onrender.com/api/items/sku/${skuName}`);
      const updatedSKUs = [...loadedSKUs];
      updatedSKUs.splice(skuIndex, 1);
      setLoadedSKUs(updatedSKUs);
      showToast(`SKU '${skuName}' has been successfully deleted.`, "success");
    } catch (error) {
      console.error("Error deleting SKU:", error);
      showToast("An error occurred while deleting the SKU.", "error");
    }
  };

  const handleMasterQtyChange = (skuIndex, e) => {
    let newMasterQty = Number(e.target.value) || 0;
    if (newMasterQty < 0) newMasterQty = 0;
    const updatedSKUs = [...loadedSKUs];
    const targetGroup = updatedSKUs[skuIndex];
    targetGroup.masterQty = newMasterQty;

    targetGroup.items = targetGroup.items.map(item => {
      const qtyPerUnit = Number(item.Qty_Per_Unit) || 0;
      const L = Number(item.L) || 0;
      const W = Number(item.W) || 0;
      const EBL = Number(item.Edge_Band_L) || 0;
      const EBW = Number(item.Edge_Band_W) || 0;

      const noOfPanels = newMasterQty * qtyPerUnit;
      const sqm = (L * W * noOfPanels) / 1000000;
      const edgeBandLM = ((L * EBL) + (W * EBW)) * noOfPanels / 1000;
      return { ...item, SKU_Qty: newMasterQty, No_Of_Panels: noOfPanels, SQM: sqm, Edge_Band_LM: edgeBandLM };
    });
    setLoadedSKUs(updatedSKUs);
  };

  const handleRowChange = (skuIndex, itemIndex, field, value) => {
    const updatedSKUs = [...loadedSKUs];
    const targetGroup = updatedSKUs[skuIndex];
    const item = targetGroup.items[itemIndex];
    item[field] = value;

    if (field === 'Size_mm') {
      const parts = value.split(/x|X|\*/).map(p => p.trim());
      if (parts.length === 3) {
        if (!isNaN(parts[0]) && parts[0] !== '') item.L = Number(parts[0]);
        if (!isNaN(parts[1]) && parts[1] !== '') item.W = Number(parts[1]);
        if (!isNaN(parts[2]) && parts[2] !== '') item.T = Number(parts[2]);
      }
    }

    if (['Qty_Per_Unit', 'L', 'W', 'Edge_Band_L', 'Edge_Band_W', 'Size_mm'].includes(field)) {
      const qty = Number(item.Qty_Per_Unit) || 0;
      const L = Number(item.L) || 0;
      const W = Number(item.W) || 0;
      const EBL = Number(item.Edge_Band_L) || 0;
      const EBW = Number(item.Edge_Band_W) || 0;

      item.No_Of_Panels = targetGroup.masterQty * qty;
      item.SQM = (L * W * item.No_Of_Panels) / 1000000;
      item.Edge_Band_LM = ((L * EBL) + (W * EBW)) * item.No_Of_Panels / 1000;
    }
    setLoadedSKUs(updatedSKUs);
  };

  const handleAddRow = (skuIndex, overrideSku = null, overrideMasterQty = null) => {
    const updatedSKUs = [...loadedSKUs];
    const targetGroup = updatedSKUs[skuIndex];
    const skuName = overrideSku || targetGroup.sku;
    const mQty = overrideMasterQty || targetGroup.masterQty;

    const newRow = {
      id: 'new-' + Date.now(), isNew: true, SKU: skuName, SKU_Qty: mQty,
      Item_No: targetGroup.items.length + 1, Part_Name: '', Size_mm: '', Qty_Per_Unit: 0, Edge_Band: '',
      L: 0, W: 0, T: 0, Edge_Band_L: 0, Edge_Band_W: 0, No_Of_Panels: 0, SQM: 0, Edge_Band_LM: 0, Machine: ''
    };
    targetGroup.items.push(newRow);
    setLoadedSKUs(updatedSKUs);
  };

  const handleDeleteRow = async (skuIndex, itemIndex) => {
    const isConfirmed = window.confirm("Are you sure you want to delete this row?");
    if (!isConfirmed) return;
    const updatedSKUs = [...loadedSKUs];
    const targetGroup = updatedSKUs[skuIndex];
    const item = targetGroup.items[itemIndex];

    if (!item.isNew) {
      try {
        await axios.delete(`https://productionmonitor.onrender.com/api/items/${item.id}`);
      } catch (error) {
        console.error("Error deleting item:", error);
        return showToast("An error occurred while deleting.", "error");
      }
    }
    targetGroup.items.splice(itemIndex, 1);
    targetGroup.items.forEach((row, idx) => row.Item_No = idx + 1);
    setLoadedSKUs(updatedSKUs);
    showToast("Row deleted successfully.", "info");
  };

  const saveChanges = async () => {
    try {
      for (let group of loadedSKUs) {
        if (group.items.length === 0) continue; 
        for (let item of group.items) {
          if (item.isNew) {
            item.SKU_Qty = group.masterQty;
            await axios.post(`https://productionmonitor.onrender.com/api/items`, item);
          } else {
            await axios.put(`https://productionmonitor.onrender.com/api/items/${item.id}`, {
              SKU_Qty: group.masterQty, Qty_Per_Unit: item.Qty_Per_Unit,
              No_Of_Panels: item.No_Of_Panels, SQM: item.SQM, Edge_Band_LM: item.Edge_Band_LM
            });
          }
        }
      }
      showToast("All changes successfully saved to the database!", "success");

      const refreshedSKUs = [];
      for (let group of loadedSKUs) {
        if (group.items.length > 0) {
          const res = await axios.get(`https://productionmonitor.onrender.com/api/items/${group.sku}`);
          refreshedSKUs.push({ sku: group.sku, masterQty: group.masterQty, items: res.data });
        }
      }
      setLoadedSKUs(refreshedSKUs);
    } catch (error) {
      console.error("Error saving data:", error);
      showToast("An error occurred while saving.", "error");
    }
  };

  const exportToExcel = async () => {
    if (loadedSKUs.length === 0) return showToast("No data available to export!", "error");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Inventory Summary', { views: [{ showGridLines: false }] });

    sheet.columns = [
      { width: 10 }, { width: 30 }, { width: 20 }, { width: 15 }, { width: 25 },
      { width: 10 }, { width: 10 }, { width: 10 }, { width: 15 }, { width: 15 },
      { width: 15 }, { width: 15 }, { width: 15 }, { width: 25 }
    ];

    let currentRow = 2;
    sheet.mergeCells(`A${currentRow}:N${currentRow}`);
    const titleCell = sheet.getCell(`A${currentRow}`);
    titleCell.value = 'FURNITURE INVENTORY & CUTTING SUMMARY';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; 
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    currentRow += 2;

    loadedSKUs.forEach((group) => {
      if (group.items.length === 0) return; 

      sheet.getCell(`B${currentRow}`).value = 'SKU:';
      sheet.getCell(`B${currentRow}`).font = { bold: true };
      sheet.getCell(`C${currentRow}`).value = group.sku;
      sheet.getCell(`C${currentRow}`).font = { bold: true, color: { argb: 'FFDC2626' } }; 

      sheet.getCell(`D${currentRow}`).value = 'Qty:';
      sheet.getCell(`D${currentRow}`).font = { bold: true };
      const masterQtyCellRef = `E${currentRow}`;
      sheet.getCell(masterQtyCellRef).value = group.masterQty;
      sheet.getCell(masterQtyCellRef).font = { bold: true };
      sheet.getCell(masterQtyCellRef).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      sheet.getCell(masterQtyCellRef).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; 
      currentRow += 2;

      const headers = ['Item No', 'Part Name', 'Size (mm)', 'Qty Per Unit', 'Edge Band', 'L', 'W', 'T', 'Edge Band L', 'Edge Band W', 'No Of Panels', 'SQM', 'Edge Band LM', 'Machine'];
      const headerRow = sheet.getRow(currentRow);
      headerRow.values = headers;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF334155' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      currentRow++;

      group.items.forEach((item) => {
        const row = sheet.getRow(currentRow);
        row.getCell(1).value = item.Item_No;
        row.getCell(2).value = item.Part_Name;
        row.getCell(3).value = item.Size_mm;
        row.getCell(4).value = Number(item.Qty_Per_Unit) || 0;
        row.getCell(5).value = item.Edge_Band;
        row.getCell(6).value = Number(item.L) || 0;
        row.getCell(7).value = Number(item.W) || 0;
        row.getCell(8).value = Number(item.T) || 0;
        row.getCell(9).value = Number(item.Edge_Band_L) || 0;
        row.getCell(10).value = Number(item.Edge_Band_W) || 0;
        row.getCell(11).value = { formula: `$${masterQtyCellRef.charAt(0)}$${masterQtyCellRef.substring(1)} * D${currentRow}` };
        row.getCell(12).value = { formula: `(F${currentRow} * G${currentRow} * K${currentRow}) / 1000000` };
        row.getCell(13).value = { formula: `((F${currentRow} * I${currentRow}) + (G${currentRow} * J${currentRow})) * K${currentRow} / 1000` };
        row.getCell(14).value = item.Machine && item.Machine.trim() !== "" ? item.Machine : "Other/None";

        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { horizontal: 'center' };
        });

        [11, 12, 13].forEach(col => {
          row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } }; 
          row.getCell(col).font = { bold: true };
          row.getCell(col).numFmt = '0.00';
        });
        currentRow++;
      });
      currentRow += 3;
    });

    const lastDataRow = currentRow - 2;
    sheet.getCell(`B${currentRow}`).value = 'GLOBAL SUMMARY';
    sheet.getCell(`B${currentRow}`).font = { bold: true, size: 14 };
    sheet.getCell(`F${currentRow}`).value = 'MACHINE-WISE CUTTING SUMMARY';
    sheet.getCell(`F${currentRow}`).font = { bold: true, size: 14 };
    currentRow += 2;

    sheet.getCell(`B${currentRow}`).value = 'Total No. of Panels:';
    sheet.getCell(`D${currentRow}`).value = { formula: `SUM(K1:K${lastDataRow})` };
    sheet.getCell(`B${currentRow + 1}`).value = 'Total SQM:';
    sheet.getCell(`D${currentRow + 1}`).value = { formula: `SUM(L1:L${lastDataRow})` };
    sheet.getCell(`D${currentRow + 1}`).numFmt = '0.0000';
    sheet.getCell(`B${currentRow + 2}`).value = 'Total Edge Band LM:';
    sheet.getCell(`D${currentRow + 2}`).value = { formula: `SUM(M1:M${lastDataRow})` };
    sheet.getCell(`D${currentRow + 2}`).numFmt = '0.00';
    sheet.getCell(`B${currentRow + 3}`).value = 'Panels With Edge Bands:';
    sheet.getCell(`D${currentRow + 3}`).value = { formula: `SUMIFS(K1:K${lastDataRow}, M1:M${lastDataRow}, ">0")` };

    for (let i = 0; i < 4; i++) {
      const bCell = sheet.getCell(`B${currentRow + i}`);
      const dCell = sheet.getCell(`D${currentRow + i}`);
      bCell.font = { bold: true };
      bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      bCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      dCell.font = { bold: true, color: { argb: 'FF166534' } }; 
      dCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      dCell.alignment = { horizontal: 'right' };
    }

    ['Machine', 'No. of Panels', 'SQM'].forEach((text, i) => {
      const cell = sheet.getCell(currentRow, 6 + i);
      cell.value = text;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { horizontal: 'center' };
    });

    let mRow = currentRow + 1;
    const allItems = loadedSKUs.flatMap(g => g.items);
    const uniqueMachines = [...new Set(allItems.map(i => i.Machine && i.Machine.trim() !== "" ? i.Machine : "Other/None"))];

    uniqueMachines.forEach(machine => {
      const mCell = sheet.getCell(`F${mRow}`);
      const pCell = sheet.getCell(`G${mRow}`);
      const sCell = sheet.getCell(`H${mRow}`);
      mCell.value = machine;
      pCell.value = { formula: `SUMIF(N1:N${lastDataRow}, "${machine}", K1:K${lastDataRow})` };
      sCell.value = { formula: `SUMIF(N1:N${lastDataRow}, "${machine}", L1:L${lastDataRow})` };
      sCell.numFmt = '0.0000';
      [mCell, pCell, sCell].forEach(cell => cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
      pCell.font = { bold: true, color: { argb: 'FF166534' } };
      sCell.font = { bold: true, color: { argb: 'FF166534' } };
      pCell.alignment = { horizontal: 'center' };
      sCell.alignment = { horizontal: 'center' };
      mRow++;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Inventory_Professional_Report.xlsx');
    showToast("Excel file exported successfully!", "success");
  };

  const allLoadedItems = loadedSKUs.flatMap(group => group.items);
  const totalPanels = allLoadedItems.reduce((sum, item) => sum + (Number(item.No_Of_Panels) || 0), 0);
  const totalSQM = allLoadedItems.reduce((sum, item) => sum + (Number(item.SQM) || 0), 0);
  const totalEdgeBandLM = allLoadedItems.reduce((sum, item) => sum + (Number(item.Edge_Band_LM) || 0), 0);
  const totalPanelsWithEdgeBand = allLoadedItems.reduce((sum, item) => sum + ((Number(item.Edge_Band_LM) > 0) ? (Number(item.No_Of_Panels) || 0) : 0), 0);

  const machineSummaryMap = {};
  allLoadedItems.forEach(item => {
    const machine = item.Machine && item.Machine.trim() !== "" ? item.Machine : "Other/None";
    if (!machineSummaryMap[machine]) machineSummaryMap[machine] = { panels: 0, sqm: 0 };
    machineSummaryMap[machine].panels += (Number(item.No_Of_Panels) || 0);
    machineSummaryMap[machine].sqm += (Number(item.SQM) || 0);
  });
  const machineSummaryArray = Object.keys(machineSummaryMap).map(key => ({
    machine: key, panels: machineSummaryMap[key].panels, sqm: machineSummaryMap[key].sqm
  }));

  return (
    <div className="space-y-6">
      <datalist id="part-names-list">
        {allParts.map((part, i) => (
          <option key={i} value={part.Part_Name} />
        ))}
      </datalist>

      {/* Floating Alert/Toast notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-6 right-6 z-50 flex items-center space-x-3 bg-slate-900/95 backdrop-blur-xs text-white font-bold text-xs px-5 py-4 rounded-xl shadow-xl border border-slate-700/40 max-w-sm"
          >
            <div className={`p-1.5 rounded-lg ${toastMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : toastMessage.type === 'error' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'}`}>
              {toastMessage.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Info className="w-4 h-4" />
              )}
            </div>
            <span className="leading-tight">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        
        {/* Search Existing SKU */}
        <div className="flex items-center w-full lg:w-auto bg-slate-50 border border-slate-200 rounded-xl p-2 gap-2 shadow-inner">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Existing SKU..."
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button 
            onClick={handleSearch} 
            disabled={loading}
            className="whitespace-nowrap px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition disabled:opacity-70"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Load SKU'}
          </button>
        </div>

        {/* Create New SKU */}
        <div className="flex items-center w-full lg:w-auto bg-amber-50 border border-amber-200 rounded-xl p-2 gap-2 shadow-inner">
          <input
            type="text"
            placeholder="Enter NEW SKU Name..."
            value={newSkuInput}
            onChange={(e) => setNewSkuInput(e.target.value)}
            className="w-full sm:w-56 px-4 py-2 bg-white border border-amber-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button 
            onClick={handleCreateNewSKU} 
            className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 text-sm font-extrabold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        {/* Export Button */}
        <button 
          onClick={exportToExcel} 
          className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition"
        >
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Loaded SKUs List */}
      {loadedSKUs.map((skuGroup, skuIndex) => (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          key={skuGroup.sku} 
          className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Header Bar */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              SKU: <span className="text-blue-700">{skuGroup.sku}</span>
              {skuGroup.items.length === 0 && <span className="text-rose-500 text-xs font-bold px-2 py-0.5 bg-rose-50 rounded-md border border-rose-200 ml-2">New - Add Rows</span>}
            </h3>

            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-3">Master Qty:</label>
                <input 
                  type="number" 
                  min="0" 
                  value={skuGroup.masterQty} 
                  onChange={(e) => handleMasterQtyChange(skuIndex, e)} 
                  className="w-16 px-2 py-1 bg-slate-100 border border-slate-300 rounded font-bold text-center focus:outline-none" 
                />
              </div>
              
              <button 
                onClick={() => handleDeleteSKU(skuIndex, skuGroup.sku)} 
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-2 rounded-lg text-xs font-bold transition"
              >
                <Trash2 className="w-4 h-4" /> Delete SKU
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[1350px] text-left border-collapse font-sans text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] border border-slate-300">
                  <th className="p-3 border border-slate-300 text-center w-12">No</th>
                  <th className="p-3 border border-slate-300">Part Name</th>
                  <th className="p-3 border border-slate-300 w-32">Size (mm)</th>
                  <th className="p-3 border border-slate-300 text-center w-20">Qty/Unit</th>
                  <th className="p-3 border border-slate-300 w-24">Edge Band</th>
                  <th className="p-3 border border-slate-300 text-center w-16">L</th>
                  <th className="p-3 border border-slate-300 text-center w-16">W</th>
                  <th className="p-3 border border-slate-300 text-center w-16">T</th>
                  <th className="p-3 border border-slate-300 text-center w-20">EB L</th>
                  <th className="p-3 border border-slate-300 text-center w-20">EB W</th>
                  <th className="p-3 border border-slate-300 text-center bg-amber-50 text-amber-900 w-24">Panels</th>
                  <th className="p-3 border border-slate-300 text-center bg-blue-50 text-blue-900 w-24">SQM</th>
                  <th className="p-3 border border-slate-300 text-center bg-emerald-50 text-emerald-900 w-24">EB LM</th>
                  <th className="p-3 border border-slate-300 w-32">Machine</th>
                  <th className="p-3 border border-slate-300 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {skuGroup.items.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="p-8 text-center text-slate-400 font-semibold border border-slate-300">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      No items yet. Click "+ Add New Row" below to start.
                    </td>
                  </tr>
                ) : (
                  skuGroup.items.map((row, itemIndex) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition border border-slate-300 font-medium text-slate-700">
                      <td className="p-2 text-center text-slate-400 font-mono border border-slate-300">{row.Item_No}</td>
                      <td className={`p-2 border border-slate-300 ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="text" list="part-names-list" value={row.Part_Name} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Part_Name', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none" /> : <span className="font-bold text-slate-900">{row.Part_Name}</span>}
                      </td>
                      <td className={`p-2 border border-slate-300 ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="text" value={row.Size_mm} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Size_mm', e.target.value)} placeholder="e.g. 470x390x25" className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none" /> : <span className="font-mono text-[11px]">{row.Size_mm}</span>}
                      </td>
                      <td className="p-2 border border-slate-300 text-center">
                        <input type="number" min="0" value={row.Qty_Per_Unit} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Qty_Per_Unit', e.target.value)} className="w-12 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none font-bold text-blue-700 bg-blue-50" />
                      </td>
                      <td className={`p-2 border border-slate-300 ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="text" value={row.Edge_Band} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Edge_Band', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-xs focus:outline-none" /> : row.Edge_Band}
                      </td>
                      <td className={`p-2 text-center border border-slate-300 font-mono ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="number" value={row.L} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'L', e.target.value)} className="w-12 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none" /> : row.L}
                      </td>
                      <td className={`p-2 text-center border border-slate-300 font-mono ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="number" value={row.W} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'W', e.target.value)} className="w-12 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none" /> : row.W}
                      </td>
                      <td className={`p-2 text-center border border-slate-300 font-mono ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="number" value={row.T} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'T', e.target.value)} className="w-10 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none" /> : <span className="font-bold text-blue-900">{row.T}</span>}
                      </td>
                      <td className={`p-2 text-center border border-slate-300 font-mono ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="number" value={row.Edge_Band_L} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Edge_Band_L', e.target.value)} className="w-10 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none" /> : row.Edge_Band_L}
                      </td>
                      <td className={`p-2 text-center border border-slate-300 font-mono ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? <input type="number" value={row.Edge_Band_W} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Edge_Band_W', e.target.value)} className="w-10 mx-auto p-1.5 border border-slate-300 rounded text-xs text-center focus:outline-none" /> : row.Edge_Band_W}
                      </td>
                      
                      {/* Calculated Fields */}
                      <td className="p-2 text-center bg-amber-50/50 border border-slate-300 font-bold font-mono text-amber-950">{row.No_Of_Panels}</td>
                      <td className="p-2 text-center bg-blue-50/50 border border-slate-300 font-bold font-mono text-blue-900">{Number(row.SQM).toFixed(4)}</td>
                      <td className="p-2 text-center bg-emerald-50/50 border border-slate-300 font-bold font-mono text-emerald-900">{Number(row.Edge_Band_LM).toFixed(2)}</td>
                      
                      <td className={`p-2 border border-slate-300 ${row.isNew ? 'bg-emerald-50/30' : ''}`}>
                        {row.isNew ? (
                          <select value={row.Machine} onChange={(e) => handleRowChange(skuIndex, itemIndex, 'Machine', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-[11px] font-bold focus:outline-none cursor-pointer">
                            <option value="">Select Machine...</option>
                            <option value="SCM Beam Saw">SCM Beam Saw</option>
                            <option value="Selco Beam Saw">Selco Beam Saw</option>
                          </select>
                        ) : <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-[10px] text-slate-600">{row.Machine}</span>}
                      </td>
                      <td className="p-2 text-center border border-slate-300">
                        <button onClick={() => handleDeleteRow(skuIndex, itemIndex)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded transition" title="Delete Row">
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-start">
            <button 
              onClick={() => handleAddRow(skuIndex)} 
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition"
            >
              <Plus className="w-4 h-4" /> Add New Component Row
            </button>
          </div>
        </motion.div>
      ))}

      {/* Global Summaries & Save Button */}
      {loadedSKUs.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Global Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-800 text-white p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">Global Summary</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider">Total Panels</span>
                  <span className="block text-2xl font-black text-amber-950 mt-1">{totalPanels}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <span className="block text-xs font-bold text-blue-700 uppercase tracking-wider">Total SQM</span>
                  <span className="block text-2xl font-black text-blue-950 mt-1">{totalSQM.toFixed(4)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Edge Band LM</span>
                  <span className="block text-2xl font-black text-emerald-950 mt-1">{totalEdgeBandLM.toFixed(2)}</span>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                  <span className="block text-xs font-bold text-purple-700 uppercase tracking-wider">Banded Panels</span>
                  <span className="block text-2xl font-black text-purple-950 mt-1">{totalPanelsWithEdgeBand}</span>
                </div>
              </div>
            </div>

            {/* Machine Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-800 text-white p-4">
                <h3 className="text-sm font-bold uppercase tracking-wider">Machine-wise Cutting Summary</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left font-sans text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Machine</th>
                      <th className="p-4 text-center">Panels Processed</th>
                      <th className="p-4 text-right">SQM Output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {machineSummaryArray.map((summary, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold">{summary.machine}</td>
                        <td className="p-4 text-center font-mono text-blue-700 font-bold">{summary.panels}</td>
                        <td className="p-4 text-right font-mono text-emerald-700 font-bold">{summary.sqm.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <button 
            onClick={saveChanges} 
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black uppercase tracking-wider rounded-xl shadow-lg transition"
          >
            <Save className="w-6 h-6" /> Save All Changes to Database
          </button>
        </div>
      )}
    </div>
  );
}