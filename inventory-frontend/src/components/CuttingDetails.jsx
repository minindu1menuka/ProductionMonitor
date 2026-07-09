import React, { useState, useMemo } from 'react';
import { MACHINES } from '../constants';
import * as XLSX from 'xlsx';
import { Search, Filter, Download, Edit3, Trash2, Calendar, FileText, Check, X, Layers, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function CuttingDetails({ records, onUpdateRecord, onDeleteRecord, onDeleteRow, onWipeDatabase }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('All');

  const [editingDateGroup, setEditingDateGroup] = useState(null);
  const [tempRowRecords, setTempRowRecords] = useState({});

  const [confirmDeleteRowDate, setConfirmDeleteRowDate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filterMonths = useMemo(() => {
    const set = new Set();
    records.forEach((r) => { if (r.month) set.add(r.month); });
    return ['All', ...Array.from(set)];
  }, [records]);

  const groupedByDate = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.date]) {
        map[r.date] = { month: r.month, machines: {} };
        MACHINES.forEach((m) => { map[r.date].machines[m] = null; });
      }
      map[r.date].machines[r.machineName] = r;
    });
    return map;
  }, [records]);

  const filteredDateRows = useMemo(() => {
    return Object.keys(groupedByDate)
      .map((dateStr) => {
        const item = groupedByDate[dateStr];
        const machinesWithData = MACHINES.filter((m) => {
          const mRec = item.machines[m];
          return mRec && (mRec.availableTime > 0 || mRec.panelQuantity > 0);
        });
        const isBreakdownOnly = machinesWithData.length === 0;
        return { date: dateStr, month: item.month, machines: item.machines, isBreakdownOnly };
      })
      .filter((row) => {
        if (row.isBreakdownOnly) return false;
        if (selectedMonthFilter !== 'All' && row.month !== selectedMonthFilter) return false;
        if (searchTerm.trim() !== '') {
          const matchDate = row.date.toLowerCase().includes(searchTerm.toLowerCase());
          const matchMonth = row.month.toLowerCase().includes(searchTerm.toLowerCase());
          const matchMachineName = MACHINES.some((m) => {
            const hasRec = row.machines[m];
            return hasRec && m.toLowerCase().includes(searchTerm.toLowerCase());
          });
          return matchDate || matchMonth || matchMachineName;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [groupedByDate, selectedMonthFilter, searchTerm]);

  const handleExportToExcel = () => {
    const flatReportData = records.map((entry) => {
      const breakdownMin = Math.round(entry.breakdownTime * 60);
      const operatingHours = Math.max(0, entry.availableTime - entry.breakdownTime);
      return {
        'Date': entry.date,
        'Month': entry.month,
        'Machine Name': entry.machineName,
        'Available Time (Hours)': entry.availableTime,
        'Breakdown Time (Hours)': entry.breakdownTime,
        'Breakdown Time (Minutes)': breakdownMin,
        'Operating Time (Hours)': parseFloat(operatingHours.toFixed(2)),
        'Panels Cut (PCS)': entry.panelQuantity,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(flatReportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Production Metrics');
    XLSX.writeFile(workbook, `Machine_Production_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleStartEditDay = (dateStr, machinesState) => {
    setEditingDateGroup(dateStr);
    const tempState = {};
    MACHINES.forEach((m) => {
      const r = machinesState[m];
      tempState[m] = {
        id: r?.id,
        avail: r ? r.availableTime.toString() : '',
        panels: r ? r.panelQuantity.toString() : '',
      };
    });
    setTempRowRecords(tempState);
  };

  const handleSaveDayEdits = (dateStr) => {
    let parts = dateStr.split('-');
    const getMonthNameAndYear = (partsArray) => {
      const year = partsArray[0];
      const monthIndex = parseInt(partsArray[1], 10) - 1;
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[monthIndex]} ${year}`;
    };
    const rowMonth = getMonthNameAndYear(parts);

    MACHINES.forEach((m) => {
      const temp = tempRowRecords[m];
      const availVal = parseFloat(temp.avail);
      const panelsVal = parseFloat(temp.panels);

      if (!isNaN(availVal) && !isNaN(panelsVal)) {
        if (temp.id) {
          onUpdateRecord({ id: temp.id, date: dateStr, machineName: m, availableTime: availVal, breakdownTime: records.find(r => r.id === temp.id)?.breakdownTime || 0, panelQuantity: panelsVal, month: rowMonth });
        } else {
          onUpdateRecord({ id: `prod-${Date.now()}-${m.replace(/\s+/g, '')}`, date: dateStr, machineName: m, availableTime: availVal, breakdownTime: 0, panelQuantity: panelsVal, month: rowMonth });
        }
      } else if (temp.id) {
        onDeleteRecord(temp.id);
      }
    });
    setEditingDateGroup(null);
  };

  const handleDeleteRowTrigger = (dateStr) => {
    setConfirmDeleteRowDate(dateStr);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDeleteRow = () => {
    if (confirmDeleteRowDate) {
      onDeleteRow(confirmDeleteRowDate);
      setShowDeleteConfirm(false);
      setConfirmDeleteRowDate(null);
    }
  };

  return (
    <div id="cutting-details-page" className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cutting Quantity Details</h2>
          <p className="text-xs text-slate-500">Live grid metrics, operational times and cumulative output quantities</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" placeholder="Search machine/date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 w-full sm:w-60 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center space-x-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <select value={selectedMonthFilter} onChange={(e) => setSelectedMonthFilter(e.target.value)} className="border border-slate-200 bg-white hover:bg-slate-50 rounded-lg py-0.5 px-2 font-bold text-[10px] text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {filterMonths.map((m) => (<option key={m} value={m}>{m === 'All' ? 'All Months' : m}</option>))}
            </select>
          </div>

          <motion.button onClick={handleExportToExcel} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center space-x-1.5 py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer">
            <Download className="w-4 h-4" /><span>Export to Excel</span>
          </motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between text-xs font-bold text-slate-500">
          <div className="flex items-center space-x-2"><Layers className="w-4 h-4 text-blue-500" /><span>Cutting Quantity Details</span></div>
          <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase">Active Filter: <span className="font-mono">{selectedMonthFilter}</span> ({filteredDateRows.length} dates)</span>
        </div>

        <div className="overflow-x-auto">
          {filteredDateRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-bold text-slate-500 text-sm">No production records matching filters</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100 text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-4 border-r border-slate-150 text-center w-32" rowSpan={2}>Date</th>
                  {MACHINES.map((m) => (<th key={m} className="py-2 px-2 border-r border-slate-150 text-center text-blue-600 font-extrabold tracking-tight" colSpan={2}>{m}</th>))}
                  <th className="py-3 px-2 text-center w-28" rowSpan={2}>Actions</th>
                </tr>
                <tr className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-150 text-[8px] uppercase tracking-wider">
                  {MACHINES.map((m) => (
                    <React.Fragment key={`sub-${m}`}>
                      <th className="py-1 px-1.5 text-center border-r border-slate-100">Avail (h)</th>
                      <th className="py-1 px-1.5 text-center border-r border-slate-150 text-blue-500 font-bold">Panel (pcs)</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                {filteredDateRows.map((group) => (
                  <tr key={group.date} className="hover:bg-slate-50/40 transition">
                    <td className="py-3.5 px-4 font-bold border-r border-slate-150 font-mono text-slate-800 bg-slate-50/20 text-center">{group.date}</td>
                    {MACHINES.map((machine) => {
                      const rec = group.machines[machine];
                      return (
                        <React.Fragment key={`td-${group.date}-${machine}`}>
                          <td className="py-3 px-1.5 text-center font-mono text-slate-500 border-r border-slate-100 bg-[#FCFDFE]/30">{rec ? rec.availableTime.toFixed(0) : '-'}</td>
                          <td className="py-3 px-1.5 text-center font-mono border-r border-slate-150 font-black text-blue-700 bg-blue-50/10">{rec ? rec.panelQuantity.toLocaleString() : '-'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button type="button" onClick={() => handleStartEditDay(group.date, group.machines)} className="p-1 px-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleDeleteRowTrigger(group.date)} className="p-1 px-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {editingDateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingDateGroup(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', stiffness: 350, damping: 28 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col relative z-10">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div><h3 className="text-base font-black text-slate-900 uppercase">Edit Daily Production Logs</h3><p className="text-xs text-slate-500 font-mono">Date: {editingDateGroup}</p></div>
                <button onClick={() => setEditingDateGroup(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg border border-slate-100 bg-white cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-3.5 divide-y divide-slate-100">
                  {MACHINES.map((machine) => {
                    const data = tempRowRecords[machine] || { avail: '', panels: '' };
                    return (
                      <div key={machine} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-3.5 first:pt-0 border-t-0">
                        <div className="sm:col-span-4 text-xs font-bold text-slate-800 flex items-center space-x-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span><span>{machine}</span></div>
                        <div className="sm:col-span-4"><label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Avail Time (H)</label><input type="number" step="any" value={data.avail} onChange={(e) => setTempRowRecords({ ...tempRowRecords, [machine]: { ...data, avail: e.target.value } })} className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-lg px-2.5 py-1 text-xs font-mono font-bold" /></div>
                        <div className="sm:col-span-4"><label className="block text-[9px] font-semibold text-slate-400 uppercase mb-0.5">Panels (PCS)</label><input type="number" value={data.panels} onChange={(e) => setTempRowRecords({ ...tempRowRecords, [machine]: { ...data, panels: e.target.value } })} className="w-full bg-slate-50 border border-[#D5DCE5] focus:bg-white rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-blue-700" /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
                <button onClick={() => setEditingDateGroup(null)} className="py-2 px-4 border border-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button onClick={() => handleSaveDayEdits(editingDateGroup)} className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center space-x-1"><Check className="w-4 h-4" /><span>Save All Shifts</span></button>
              </div>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && confirmDeleteRowDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteRowDate(null); }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full mx-4 p-6 relative z-10 space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="bg-rose-100 p-2 rounded-lg"><Trash2 className="w-5 h-5" /></div><h3 className="font-bold text-sm text-slate-900 uppercase">Confirm Deletion</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">Are you sure you want to delete ALL records for <span className="font-mono font-bold bg-slate-50 border px-1.5 py-0.5 rounded text-rose-700">{confirmDeleteRowDate}</span>? This action cannot be undone.</p>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button onClick={() => { setShowDeleteConfirm(false); setConfirmDeleteRowDate(null); }} className="py-1.5 px-3.5 border border-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl hover:bg-slate-100 cursor-pointer">Cancel</button>
                <button onClick={handleConfirmDeleteRow} className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase rounded-xl cursor-pointer">Confirm Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}