import React, { useState, useMemo, useEffect } from 'react';
import { MACHINES } from '../constants';
import { PlayCircle, AlertTriangle, Activity, Database, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard({ productionRecords, breakdownRecords }) {
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    productionRecords.forEach(rec => { if (rec.month) monthsSet.add(rec.month); });
    breakdownRecords.forEach(rec => {
      if (rec.month && rec.year) monthsSet.add(`${rec.month} ${rec.year}`);
    });
    if (monthsSet.size === 0) monthsSet.add('June 2026');

    return Array.from(monthsSet).sort((a, b) => {
      const parseMonth = (s) => {
        const parts = s.split(' ');
        const yr = parseInt(parts[1] || '0', 10);
        const mnIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(parts[0]);
        return yr * 12 + mnIndex;
      };
      return parseMonth(b) - parseMonth(a);
    });
  }, [productionRecords, breakdownRecords]);

  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths.includes('June 2026') ? 'June 2026' : availableMonths[0] || 'June 2026'
  );

  useEffect(() => {
    
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  const parsedFilter = useMemo(() => {
    const parts = selectedMonth.split(' ');
    return { monthName: parts[0] || 'June', yearValue: parseInt(parts[1] || '2026', 10) };
  }, [selectedMonth]);

  const machineStats = useMemo(() => {
    return MACHINES.map((machine) => {
      const prodForMachine = productionRecords.filter((r) => r.machineName === machine && r.month === selectedMonth);
      const totalAvailableHours = prodForMachine.reduce((sum, r) => sum + r.availableTime, 0);
      const totalPanels = prodForMachine.reduce((sum, r) => sum + r.panelQuantity, 0);

      const listBreakdownForMachine = breakdownRecords.filter(
        (b) => b.machineName === machine &&
          b.month?.toLowerCase() === parsedFilter.monthName?.toLowerCase() &&
          b.year === parsedFilter.yearValue
      );
      const totalBreakdownMin = listBreakdownForMachine.reduce((sum, b) => sum + b.lossDuration, 0);

      const availMinTotal = totalAvailableHours * 60;
      const opMinTotal = Math.max(0, availMinTotal - totalBreakdownMin);

      const availHoursPart = Math.floor(totalAvailableHours);
      const availMinsPart = Math.round((totalAvailableHours - availHoursPart) * 60);

      const opHoursPart = Math.floor(opMinTotal / 60);
      const opMinsPart = opMinTotal % 60;

      const bdHoursPart = Math.floor(totalBreakdownMin / 60);
      const bdMinsPart = totalBreakdownMin % 60;

      const hasRecords = prodForMachine.length > 0 || listBreakdownForMachine.length > 0;
      const status = totalAvailableHours > 0 ? 'ACTIVE' : (!hasRecords ? 'NO_DATA' : 'IDLE');

      return {
        machine,
        status,
        availableTimeStr: totalAvailableHours === 0 ? '0' : `${availHoursPart}:${availMinsPart.toString().padStart(2, '0')}`,
        breakdownTimeStr: totalBreakdownMin === 0 ? '0' : `${bdHoursPart}:${bdMinsPart.toString().padStart(2, '0')}`,
        operatingTimeStr: opMinTotal === 0 ? '0' : `${opHoursPart}:${opMinsPart.toString().padStart(2, '0')}`,
        availableHours: totalAvailableHours,
        breakdownHours: totalBreakdownMin / 60,
        operatingHours: opMinTotal / 60,
        breakdownMin: totalBreakdownMin,
        panelsCut: totalPanels,
      };
    });
  }, [productionRecords, breakdownRecords, selectedMonth, parsedFilter]);

  return (
    <div id="dashboard-section" className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-800">Industrial Machinery Cockpit</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">Real-time factory metrics and shift breakdowns</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Calendar className="w-3 h-3 text-slate-400" />
          <label htmlFor="month-selector" className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Month:</label>
          <select
            id="month-selector"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg py-0.5 px-2 font-bold text-[10px] text-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableMonths.map((m) => (<option key={m} value={m}>{m}</option>))}
          </select>
        </div>
      </div>

      <motion.div
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.035 } } }}
        initial="hidden" animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {machineStats.map((stat) => {
          const availPct = stat.availableHours > 0 ? 100 : 0;
          const breakdownPct = stat.availableHours > 0 ? (stat.breakdownHours / stat.availableHours) * 100 : 0;
          const operatingPct = stat.availableHours > 0 ? (stat.operatingHours / stat.availableHours) * 100 : 0;

          return (
            <motion.div
              key={stat.machine}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              whileHover={{ y: -6, boxShadow: "0 10px 25px -4px rgba(51, 65, 85, 0.12)", borderColor: "rgba(59, 130, 246, 0.3)" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden select-none"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Database className="w-4 h-4" /></div>
                  <h3 className="font-bold text-slate-800 text-sm tracking-tight">{stat.machine}</h3>
                </div>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full tracking-wider ${stat.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : stat.status === 'NO_DATA' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
                  {stat.status === 'NO_DATA' ? 'No Data' : stat.status}
                </span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-slate-500 font-bold space-x-1.5 uppercase"><PlayCircle className="w-3.5 h-3.5 text-blue-500" /><span>Avail Time</span></div>
                  <div className="flex items-baseline space-x-1"><span className="font-mono text-sm font-bold text-slate-800">{stat.availableTimeStr}</span><span className="text-[10px] text-slate-400 font-mono">h</span></div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-slate-500 font-bold space-x-1.5 uppercase"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /><span>Breakdown</span></div>
                  <div className="flex items-baseline space-x-1"><span className="font-mono text-sm font-bold text-rose-600">{stat.breakdownTimeStr}</span><span className="text-[10px] text-rose-400 font-mono">h</span></div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <div className="flex items-center text-slate-500 font-bold space-x-1.5 uppercase"><Activity className="w-3.5 h-3.5 text-emerald-500" /><span>Operating</span></div>
                  <div className="flex items-baseline space-x-1"><span className="font-mono text-sm font-bold text-emerald-600">{stat.operatingTimeStr}</span><span className="text-[10px] text-emerald-400 font-mono">h</span></div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-lg">
                  <span className="font-bold text-slate-600 uppercase">Panels Cut</span>
                  <div className="flex items-baseline space-x-0.5 text-blue-600">
                    <span className="font-mono text-base font-black">{stat.panelsCut.toLocaleString()}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">pcs</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}