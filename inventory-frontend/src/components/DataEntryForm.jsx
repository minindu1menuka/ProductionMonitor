import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MACHINES } from '../constants';
import { Save, RotateCcw, ClipboardSignature, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function DataEntryForm({ records, onAddRecord, onUpdateRecord, onDeleteRecord }) {
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState('');
  const [machineName, setMachineName] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [panelQuantity, setPanelQuantity] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const pickerRef = useRef(null);
  const monthNames = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);

  useEffect(() => {
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (!isNaN(yr) && !isNaN(mo)) { setViewYear(yr); setViewMonth(mo); }
      }
    }
  }, [date]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = () => { viewMonth === 0 ? (setViewMonth(11), setViewYear(viewYear - 1)) : setViewMonth(viewMonth - 1); };
  const handleNextMonth = () => { viewMonth === 11 ? (setViewMonth(0), setViewYear(viewYear + 1)) : setViewMonth(viewMonth + 1); };
  const handleSelectDate = (dateString) => { setDate(dateString); setIsOpen(false); };
  const handleClearDate = () => { setDate(''); setIsOpen(false); };
  const handleSetToday = () => {
    const today = new Date();
    setDate(`${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`);
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setIsOpen(false);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year, month) => new Date(year, month, 1).getDay();

  const dayGrid = useMemo(() => {
    const days = [];
    const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth);
    const totalDays = getDaysInMonth(viewYear, viewMonth);
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      days.push({ day: dNum, monthOffset: 'prev', dateString: `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dNum.toString().padStart(2, '0')}`, isToday: false, isSelected: date === `${prevYear}-${(prevMonth + 1).toString().padStart(2, '0')}-${dNum.toString().padStart(2, '0')}` });
    }

    const todayObj = new Date();
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      days.push({ day: d, monthOffset: 'current', dateString, isToday: viewYear === todayObj.getFullYear() && viewMonth === todayObj.getMonth() && d === todayObj.getDate(), isSelected: date === dateString });
    }

    const remainingCells = 42 - days.length;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remainingCells; d++) {
      days.push({ day: d, monthOffset: 'next', dateString: `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`, isToday: false, isSelected: date === `${nextYear}-${(nextMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}` });
    }
    return days;
  }, [viewYear, viewMonth, date]);

  const getMonthNameAndYear = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return '';
    return `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
  };

  const resetForm = () => { setEditingId(null); setDate(''); setMachineName(''); setAvailableTime(''); setPanelQuantity(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !machineName || !availableTime || !panelQuantity) return alert('Please fill out all required fields marked with *');

    const availHoursVal = parseFloat(availableTime);
    const panelsVal = parseFloat(panelQuantity);

    if (isNaN(availHoursVal) || availHoursVal < 0) return alert('Available time must be a non-negative number');
    if (isNaN(panelsVal) || panelsVal < 0) return alert('Panels quantity must be a non-negative count number');

    const recordData = {
      id: editingId || `prod-${Date.now()}`, date, machineName, availableTime: availHoursVal, breakdownTime: 0, panelQuantity: panelsVal, month: getMonthNameAndYear(date)
    };

    editingId ? onUpdateRecord(recordData) : onAddRecord(recordData);
    resetForm();
  };

  return (
    <div id="cutting-entry" className="flex justify-center w-full py-2">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 25 }} className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm animate-pulse"><ClipboardSignature className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-slate-800">{editingId ? 'Edit Production Record' : 'Add Production Record'}</h3><p className="text-xs text-slate-500">Enter daily operating metrics for CNC machinery</p></div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div ref={pickerRef} className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input type="text" required placeholder="YYYY-MM-DD" readOnly onClick={() => setIsOpen(!isOpen)} value={date} className="w-full pl-4 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/55 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm font-mono font-medium transition cursor-pointer select-none" />
              <button type="button" onClick={() => setIsOpen(!isOpen)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"><Calendar className="w-4 h-4" /></button>
            </div>
            
            <AnimatePresence>
              {isOpen && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="absolute left-0 mt-1 z-50 bg-white border border-slate-150 rounded-xl shadow-xl p-2.5 w-[210px]">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <div className="flex items-center space-x-1">
                      <select value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value, 10))} className="px-1 py-0.5 h-7 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">{monthNames.map((m, idx) => (<option key={m} value={idx}>{m.substring(0, 3)}</option>))}</select>
                      <select value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value, 10))} className="px-1 py-0.5 h-7 text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md cursor-pointer">{Array.from({ length: 201 }, (_, i) => 1900 + i).map((yr) => (<option key={yr} value={yr}>{yr}</option>))}</select>
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
            {date && <p className="text-[11px] text-blue-600 font-bold mt-1 uppercase">Auto Month: {getMonthNameAndYear(date)}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Machine Name <span className="text-rose-500">*</span></label>
            <select required value={machineName} onChange={(e) => setMachineName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium cursor-pointer">
              <option value="">-- Select Industrial Machine --</option>
              {MACHINES.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Available Time (Hours) <span className="text-rose-500">*</span></label>
            <input type="number" step="any" required placeholder="e.g. 24 or 20.5" value={availableTime} onChange={(e) => setAvailableTime(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-mono font-medium" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Panel Quantity <span className="text-rose-500">*</span></label>
            <input type="number" required placeholder="e.g. 450" value={panelQuantity} onChange={(e) => setPanelQuantity(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-mono font-medium" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <motion.button type="button" onClick={resetForm} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center space-x-1 py-2.5 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-slate-50 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /><span>Clear</span></motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center justify-center space-x-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase cursor-pointer"><Save className="w-3.5 h-3.5" /><span>{editingId ? 'Update' : 'Save'}</span></motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}