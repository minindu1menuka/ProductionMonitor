import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MACHINES } from '../constants';
import { Trash2, Edit2, Plus, Calendar, AlertTriangle, FileSpreadsheet, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const MONTH_MAP = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
  'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
};

export function BreakdownEntry({
  records,
  onAddBreakdown,
  onUpdateBreakdownsForDay,
  onDeleteBreakdownsForDay,
  onBreakdownsChange,
}) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const currentDateString = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const monthsRange = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [logDate, setLogDate] = useState(currentDateString);
  const [logMachine, setLogMachine] = useState('Beam Saw New');
  const [logDuration, setLogDuration] = useState('');
  const [logReason, setLogReason] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentYear);
  const [pickerMonth, setPickerMonth] = useState(currentMonthIndex);

  const pickerRef = useRef(null);

  const monthNames = useMemo(() => monthsRange, []);

  useEffect(() => {
    if (logDate) {
      const parts = logDate.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (!isNaN(yr) && !isNaN(mo)) {
          setPickerYear(yr);
          setPickerMonth(mo);
        }
      }
    }
  }, [logDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear(pickerYear - 1);
    } else {
      setPickerMonth(pickerMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear(pickerYear + 1);
    } else {
      setPickerMonth(pickerMonth + 1);
    }
  };

  const handleSelectDate = (dateString) => {
    setLogDate(dateString);
    setPickerOpen(false);
  };

  const handleClearDate = () => {
    setLogDate('');
    setPickerOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    setLogDate(todayStr);
    setPickerYear(today.getFullYear());
    setPickerMonth(today.getMonth());
    setPickerOpen(false);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

  const dayGrid = useMemo(() => {
    const days = [];
    const firstDayIndex = getFirstDayOfWeek(pickerYear, pickerMonth);
    const totalDays = getDaysInMonth(pickerYear, pickerMonth);

    const prevMonth = pickerMonth === 0 ? 11 : pickerMonth - 1;
    const prevYear = pickerMonth === 0 ? pickerYear - 1 : pickerYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const dateString = `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dNum.toString().padStart(2, '0')}`;
      days.push({ day: dNum, monthOffset: 'prev', dateString, isToday: false, isSelected: logDate === dateString });
    }

    const todayObj = new Date();
    const todayY = todayObj.getFullYear();
    const todayM = todayObj.getMonth();
    const todayD = todayObj.getDate();

    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${pickerYear}-${(pickerMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = pickerYear === todayY && pickerMonth === todayM && d === todayD;
      days.push({ day: d, monthOffset: 'current', dateString, isToday, isSelected: logDate === dateString });
    }

    const remainingCells = 42 - days.length;
    const nextMonth = pickerMonth === 11 ? 0 : pickerMonth + 1;
    const nextYear = pickerMonth === 11 ? pickerYear + 1 : pickerYear;

    for (let d = 1; d <= remainingCells; d++) {
      const dateString = `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, monthOffset: 'next', dateString, isToday: false, isSelected: logDate === dateString });
    }
    return days;
  }, [pickerYear, pickerMonth, logDate]);

 const [viewYear, setViewYear] = useState(currentYear);
  const [viewMonth, setViewMonth] = useState(monthsRange[currentMonthIndex]);
  const [editingDay, setEditingDay] = useState(null);
  const [editMinutesState, setEditMinutesState] = useState({});
  const [submittedRecords, setSubmittedRecords] = useState(records);
  const [gridDraft, setGridDraft] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDeleteDate, setPendingDeleteDate] = useState(null);

  const yearsRange = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
  

  const parseDateToParts = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length < 3) return null;
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return { year, month: monthsRange[monthIndex], day };
  };

  useEffect(() => {
    const mapped = records.map(b => ({
      ...b,
      date: b.date || `${b.year}-${MONTH_MAP[b.month] || '01'}-${b.day.toString().padStart(2, '0')}`
    }));
    setSubmittedRecords(mapped);
  }, [records]);

  const handleAddQuickLog = (e) => {
    e.preventDefault();
    const parsed = parseDateToParts(logDate);
    if (!parsed) return alert('Please enter a valid logging date');
    
    const minsVal = parseInt(logDuration, 10);
    if (isNaN(minsVal) || minsVal <= 0) return alert('Loss duration is required and must be a positive integer in minutes.');
    if (!logMachine) return alert('Please select a system machine');

    const payload = {
      id: `brk-${Date.now()}`,
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      machineName: logMachine,
      lossDuration: minsVal,
      reason: logReason.trim() || undefined,
    };

    onAddBreakdown(payload);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
    setLogDuration('');
    setLogReason('');
  };

  const gridRecords = useMemo(() => {
    return submittedRecords.filter((r) => r.year === viewYear && r.month === viewMonth);
  }, [submittedRecords, viewYear, viewMonth]);

  const spreadsheetRows = useMemo(() => {
    const dayMap = {};
    gridRecords.forEach((b) => {
      if (!dayMap[b.day]) {
        dayMap[b.day] = {};
        MACHINES.forEach((m) => dayMap[b.day][m] = 0);
      }
      dayMap[b.day][b.machineName] += b.lossDuration;
    });

    return Object.keys(dayMap)
      .map((dayStr) => ({ day: parseInt(dayStr, 10), machines: dayMap[dayStr] }))
      .sort((a, b) => a.day - b.day);
  }, [gridRecords]);

  const machineColumnTotals = useMemo(() => {
    const totals = {};
    MACHINES.forEach((m) => totals[m] = 0);
    spreadsheetRows.forEach((row) => {
      MACHINES.forEach((m) => totals[m] += row.machines[m] || 0);
    });
    return totals;
  }, [spreadsheetRows]);

  const startRowEdit = (dayNum, machinesData) => {
    setEditingDay(dayNum);
    const initialMinutesMap = {};
    MACHINES.forEach((m) => initialMinutesMap[m] = (machinesData[m] || 0).toString());
    setEditMinutesState(initialMinutesMap);
  };

  const saveRowEdit = (dayNum) => {
    const targetMinutesNum = {};
    for (const m of MACHINES) {
      const valStr = editMinutesState[m] || '0';
      const minutesInt = Math.floor(Number(valStr)) || 0;
      if (minutesInt < 0) return alert('Breakdown minutes cannot be a negative value.');
      targetMinutesNum[m] = minutesInt;
    }
    onUpdateBreakdownsForDay(viewYear, viewMonth, dayNum, targetMinutesNum);
    setEditingDay(null);
  };

  const handleDeleteRowClick = (dayStr) => {
    setPendingDeleteDate(dayStr);
    setShowConfirmModal(true);
  };

  const handleActualDelete = (dateStr) => {
    
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mmIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const targetMonth = monthsRange[mmIdx] || viewMonth;
      
      if (onDeleteBreakdownsForDay) {
        onDeleteBreakdownsForDay(yr, targetMonth, day);
      }
    }

    
    setShowConfirmModal(false);
    setPendingDeleteDate(null);
  };

  const handleExportToExcel = () => {
    const headerRow = ['Date', ...MACHINES.map(m => m.toUpperCase()), 'Total Loss (Minutes)'];
    const aoa = [
      [{ t: 's', v: 'Machine Breakdown Report' }],
      [{ t: 's', v: `Year: ${viewYear}` }],
      [{ t: 's', v: `Month: ${viewMonth}` }],
      [{ t: 's', v: `Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` }],
      [],
      headerRow.map(h => ({ t: 's', v: h }))
    ];

    const N = spreadsheetRows.length;

    spreadsheetRows.forEach((row, dIdx) => {
      const excelRowNumber = 7 + dIdx;
      const rowData = [{ t: 's', v: `${row.day}-${viewMonth.substring(0, 3)}-${viewYear}` }];

      MACHINES.forEach((machine) => {
        const value = row.machines[machine] || 0;
        rowData.push({ t: 'n', v: value, z: '#,##0' });
      });

      rowData.push({ t: 'n', f: `SUM(B${excelRowNumber}:I${excelRowNumber})`, z: '#,##0' });
      aoa.push(rowData);
    });

    const totalsRowExcelIndex = 7 + N;
    const totalsRow = [{ t: 's', v: 'MONTH TOTALS' }];

    MACHINES.forEach((_machine, colIdx) => {
      const colLetter = String.fromCharCode(66 + colIdx);
      totalsRow.push({ t: 'n', f: `SUM(${colLetter}7:${colLetter}${6 + N})`, z: '#,##0' });
    });

    totalsRow.push({ t: 'n', f: `SUM(J7:J${6 + N})`, z: '#,##0' });
    aoa.push(totalsRow);
    aoa.push([]);
    
    aoa.push([
      { t: 's', v: 'Grand Total Minutes:' },
      { t: 'n', f: `J${totalsRowExcelIndex}`, z: '#,##0' }
    ]);

    aoa.push([
      { t: 's', v: 'Grand Total Hours:' },
      { t: 'n', f: `J${totalsRowExcelIndex}/60`, z: '#,##0.00' }
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();

    const colWidths = [
      { wch: 15 },
      ...MACHINES.map(m => ({ wch: Math.max(m.length + 3, 14) })),
      { wch: 22 }
    ];
    worksheet['!cols'] = colWidths;
    worksheet['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 6, activePane: 'bottomLeft', topLeftCell: 'A7' }];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Breakdown Metrics');
    XLSX.writeFile(workbook, `Breakdown_Report_${viewMonth}_${viewYear}.xlsx`);
  };

  return (
    <div id="breakdown-tab" className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex items-center space-x-3">
        <div className="bg-amber-500 text-white p-2 rounded-lg shadow-sm">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Industrial Breakdown Sheet</h2>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="bg-amber-5/45 p-5 rounded-2xl border border-amber-200/60 shadow-xs">
        <div className="flex items-center space-x-2.5 mb-4 border-b border-amber-200/35 pb-2">
          <Calendar className="w-4 h-4 text-amber-700" />
          <div>
            <h3 className="font-bold text-sm text-amber-900">Quick Breakdown Record Log</h3>
            <p className="text-xs text-amber-500">Submit single machine mechanical stop minutes directly to the master engineer logs</p>
          </div>
        </div>

        <form onSubmit={handleAddQuickLog} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div ref={pickerRef} className="md:col-span-2 relative">
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5 font-sans">Date <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input type="text" required placeholder="YYYY-MM-DD" readOnly onClick={() => setPickerOpen(!pickerOpen)} value={logDate} className="w-full pl-3 pr-8 py-2 bg-white hover:bg-slate-50 border border-amber-200/80 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer select-none" />
              <button type="button" onClick={() => setPickerOpen(!pickerOpen)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-700/70 hover:text-amber-800 transition cursor-pointer"><Calendar className="w-3.5 h-3.5" /></button>
            </div>

            <AnimatePresence>
              {pickerOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="absolute left-0 mt-1 z-50 bg-white border border-slate-150 rounded-xl shadow-xl p-2.5 w-[210px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <div className="flex items-center space-x-1">
                      <select value={pickerMonth} onChange={(e) => setPickerMonth(parseInt(e.target.value, 10))} className="px-1 py-0.5 h-7 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">{monthNames.map((m, idx) => (<option key={m} value={idx}>{m.substring(0, 3)}</option>))}</select>
                      <select value={pickerYear} onChange={(e) => setPickerYear(parseInt(e.target.value, 10))} className="px-1 py-0.5 h-7 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">{Array.from({ length: 201 }, (_, i) => 1900 + i).map((yr) => (<option key={yr} value={yr}>{yr}</option>))}</select>
                    </div>
                    <div className="flex items-center space-x-0.5">
                      <button type="button" onClick={handlePrevMonth} className="p-1 text-slate-500 hover:bg-slate-50 rounded-md cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={handleNextMonth} className="p-1 text-slate-500 hover:bg-slate-50 rounded-md cursor-pointer"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-1">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (<span key={day} className="text-[10px] font-bold text-slate-400 uppercase">{day}</span>))}</div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {dayGrid.map((cell, idx) => {
                      let btnClass = "w-6 h-6 flex items-center justify-center text-[10px] rounded-md font-semibold cursor-pointer mx-auto ";
                      if (cell.isSelected) btnClass += "bg-blue-600 text-white shadow-xs";
                      else if (cell.isToday) btnClass += "border border-blue-500 text-blue-600 bg-blue-50/40";
                      else btnClass += cell.monthOffset === 'current' ? "text-slate-700 hover:bg-slate-50" : "text-slate-300";
                      return <button key={idx} type="button" onClick={() => handleSelectDate(cell.dateString)} className={btnClass}>{cell.day}</button>;
                    })}
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 mt-2.5 pt-1.5 text-[10px] font-bold">
                    <button type="button" onClick={handleClearDate} className="text-slate-500 hover:bg-slate-50 py-0.5 px-1.5 rounded cursor-pointer">Clear</button>
                    <button type="button" onClick={handleSetToday} className="text-blue-600 hover:bg-slate-50 py-0.5 px-1.5 rounded cursor-pointer">Today</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Machine Name</label>
            <select value={logMachine} onChange={(e) => setLogMachine(e.target.value)} className="w-full bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer">
              <option value="">Select Machine...</option>
              {MACHINES.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Loss Duration (Min)</label>
            <input type="number" required placeholder="Minutes e.g.450" value={logDuration} onChange={(e) => {
              const val = e.target.value;
              let cleaned = val;
              if (/^0+[1-9]/.test(val)) cleaned = val.replace(/^0+/, '');
              else if (/^0+/.test(val)) cleaned = '0';
              setLogDuration(cleaned);
            }} className="w-full bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1.5">Reason / Description</label>
            <input type="text" placeholder="Optional Reason" value={logReason} onChange={(e) => setLogReason(e.target.value)} className="w-full bg-white border border-amber-200/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500" />
          </div>

          <div className="md:col-span-2">
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full flex items-center justify-center space-x-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-wide cursor-pointer shadow-md">
              <Plus className="w-4 h-4" /><span>Save Entry</span>
            </motion.button>
          </div>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }} className="bg-[#FAF8F5] rounded-2xl border border-[#EBE5D8] shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EBE5D8] pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <label className="text-[8px] font-bold text-[#6B614E] uppercase tracking-wide">Year:</label>
              <select value={viewYear} onChange={(e) => { setViewYear(parseInt(e.target.value, 10)); setEditingDay(null); }} className="bg-white border border-[#DDD5C3] rounded-lg py-0.5 px-2 font-bold text-[10px] text-[#5C523F] cursor-pointer">
                {yearsRange.map((yr) => (<option key={yr} value={yr}>{yr}</option>))}
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-[8px] font-bold text-[#6B614E] uppercase tracking-wide">Month:</label>
              <select value={viewMonth} onChange={(e) => { setViewMonth(e.target.value); setEditingDay(null); }} className="bg-white border border-[#DDD5C3] rounded-lg py-0.5 px-2 font-bold text-[10px] text-amber-700 cursor-pointer">
                {monthsRange.map((mn) => (<option key={mn} value={mn}>{mn}</option>))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <motion.button onClick={handleExportToExcel} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center space-x-1.5 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" /><span>Export Breakdown</span>
            </motion.button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-[#8F8168] bg-[#F3ECE0] px-4 py-2 rounded-lg">
          <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span><span>BREAKDOWN DETAILS –</span><span className="text-amber-900 font-black uppercase tracking-wide">{viewMonth} {viewYear}</span></div>
          <span className="text-[10px] uppercase font-bold text-[#6B614E] tracking-wider font-mono">Interactive Spreadsheet View</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E5DDD0]">
          {spreadsheetRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-white py-14 text-center">
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-bold text-[#8C7D64] text-sm">No recorded breakdowns for this month</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-[#F6EFE3] text-[#7C6E56] font-extrabold border-b border-[#EBE3D3] text-[9px] uppercase tracking-wider">
                  <th className="py-3 px-3 border-r border-[#EBE3D3] w-24">Date</th>
                  {MACHINES.map((machine) => (
                    <th key={machine} className="py-3 px-2 border-r border-[#EBE3D3] text-center font-bold font-sans text-[10px]">{machine.toUpperCase()}<span className="block text-[8px] font-normal text-amber-800 tracking-normal">(MINUTES)</span></th>
                  ))}
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBE5D8] text-xs text-[#5C523F] font-semibold">
                {spreadsheetRows.map((row) => {
                  const isEditing = editingDay === row.day;
                  const mm = MONTH_MAP[viewMonth] || '01';
                  const dayStr = `${viewYear}-${mm}-${row.day.toString().padStart(2, '0')}`;

                  return (
                    <tr key={row.day} className={`hover:bg-[#FCFAF7] transition-colors ${isEditing ? 'bg-amber-5/50' : ''}`}>
                      <td className="py-3 px-3 font-bold border-r border-[#EBE5D8] text-[#7C6E56] font-mono">{row.day}-{viewMonth.substring(0, 3)}</td>
                      {MACHINES.map((machine) => {
                        const cellVal = row.machines[machine] || 0;
                        return (
                          <td key={machine} className="px-1 text-center font-mono border-r border-[#EBE5D8]">
                            {isEditing ? (
                              <input type="number" min="0" value={editMinutesState[machine] === undefined ? '0' : editMinutesState[machine]} onFocus={(e) => e.target.select()} onChange={(e) => {
                                const val = e.target.value;
                                let cleaned = val;
                                if (/^0+[1-9]/.test(val)) cleaned = val.replace(/^0+/, '');
                                else if (/^0+/.test(val)) cleaned = '0';
                                setEditMinutesState({ ...editMinutesState, [machine]: cleaned });
                              }} onBlur={() => { if (editMinutesState[machine] === '') setEditMinutesState({ ...editMinutesState, [machine]: '0' }); }} className="w-16 bg-white border border-amber-300 rounded px-1.5 py-1 text-center font-mono text-xs font-bold text-amber-900 focus:outline-none" />
                            ) : (
                              <span className={`block text-center font-mono text-xs py-1.5 ${cellVal > 0 ? 'text-amber-950 font-bold' : 'text-[#BFB5A0] font-normal font-medium'}`}>{cellVal}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => saveRowEdit(row.day)} className="p-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => setEditingDay(null)} className="p-1 text-[#8C7D64] bg-slate-50 border border-slate-200 rounded cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startRowEdit(row.day, row.machines)} className="p-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleDeleteRowClick(dayStr)} className="p-1.5 text-rose-600 bg-rose-50 border border-rose-100 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-[#FAF5EC] font-bold border-t-2 border-[#DCD3C1] text-[#7C6E56]">
                  <td className="py-4 px-3 border-r border-[#EBE3D3] uppercase tracking-wide text-[10px] font-black">MONTH TOTALS</td>
                  {MACHINES.map((machine) => (
                    <td key={machine} className="py-4 px-1 text-center font-mono border-r border-[#EBE3D3] bg-[#FCFAF6]/60">
                      <span className="block text-sm font-black text-amber-900">{machineColumnTotals[machine] || 0}</span>
                      <span className="text-[9px] text-[#8F8168] font-semibold">mins</span>
                    </td>
                  ))}
                  <td className="py-4 px-3 bg-[#FAF5EC]"></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {showConfirmModal && pendingDeleteDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="bg-rose-100 p-2 rounded-lg"><Trash2 className="w-6 h-6" /></div>
              <h3 className="font-bold text-base text-slate-900">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Are you sure you want to clear ALL breakdown entries for <span className="font-mono font-bold bg-slate-50 border px-1.5 py-0.5 rounded text-rose-700">{pendingDeleteDate}</span>?</p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button type="button" onClick={() => { setShowConfirmModal(false); setPendingDeleteDate(null); }} className="py-2 px-4 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="button" onClick={() => handleActualDelete(pendingDeleteDate)} className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs uppercase cursor-pointer">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}