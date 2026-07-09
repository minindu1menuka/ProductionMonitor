import React, { useState, useEffect } from 'react';
import { MACHINES } from './constants';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DataEntryForm } from './components/DataEntryForm';
import { BreakdownEntry } from './components/BreakdownEntry';
import { CuttingDetails } from './components/CuttingDetails';
import { ProductionAnalysisReport } from './components/ProductionAnalysisReport';
import { Check, Info, Server, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Login } from './components/Login';

const STORAGE_KEYS = {
  PRODUCTION: 'factory_production_records_v1',
  BREAKDOWNS: 'factory_breakdowns_v2',
  SUBMITTED_BREAKDOWNS: 'factory_submitted_breakdowns_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [productionRecords, setProductionRecords] = useState([]);
  const [breakdownRecords, setBreakdownRecords] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  useEffect(() => {
    async function loadData() {
      try {
        const prodRes = await axios.get('https://productionmonitor.onrender.com/api/production');
        setProductionRecords(prodRes.data);
      } catch (e) { console.error(e); }

      try {
        const brkRes = await axios.get('https://productionmonitor.onrender.com/api/breakdowns');
        setBreakdownRecords(brkRes.data);
      } catch (e) { console.error(e); }
    }

    loadData();
  }, []);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddProductionRecord = async (newRec) => {
    try {
      const response = await axios.post('https://productionmonitor.onrender.com/api/production', newRec);
      const recordWithId = { ...newRec, id: response.data.id }; // DB එකෙන් දෙන අලුත් ID එක ගන්නවා
      setProductionRecords([recordWithId, ...productionRecords]);
      showToast('Production record saved to database!');
    } catch (error) {
      console.error(error);
      showToast('Failed to save record', 'error');
    }
  };

  const handleUpdateProductionRecord = async (updatedRec) => {
    try {
      if (updatedRec.id && !updatedRec.id.toString().startsWith('prod-')) {
        // If it's a real DB ID, update the DB
        await axios.put(`https://productionmonitor.onrender.com/api/production/${updatedRec.id}`, updatedRec);
      } else {
        // Fallback if ID is messy, save as new
        await axios.post('https://productionmonitor.onrender.com/api/production', updatedRec);
      }

      const updated = productionRecords.map((r) => (r.id === updatedRec.id ? updatedRec : r));
      const exists = productionRecords.some((r) => r.id === updatedRec.id);
      const finalArray = exists ? updated : [updatedRec, ...productionRecords];

      setProductionRecords(finalArray);
      showToast('Production record updated successfully!');
    } catch (error) {
      console.error(error);
      showToast('Failed to update record', 'error');
    }
  };

  const handleDeleteProductionRecord = async (id) => {
    try {
      await axios.delete(`https://productionmonitor.onrender.com/api/production/${id}`);
      const updated = productionRecords.filter((r) => r.id !== id);
      setProductionRecords(updated);
      showToast('Production record deleted from database.', 'info');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete record', 'error');
    }
  };

  const handleDeleteRow = async (date) => {
    try {

      await axios.delete(`https://productionmonitor.onrender.com/api/production/day/${date}`);

      const updatedRecords = productionRecords.filter((rec) => rec.date !== date);
      setProductionRecords(updatedRecords);
      showToast(`Removed all production records for ${date}`, 'info');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete rows from database.', 'error');
    }
  };


  const handleAddBreakdownRecord = async (newBrk) => {
    const monthMap = { 'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06', 'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12' };
    const enrichedBrk = {
      ...newBrk,
      date: newBrk.date || `${newBrk.year}-${monthMap[newBrk.month] || '01'}-${newBrk.day.toString().padStart(2, '0')}`
    };

    try {
      const res = await axios.post('https://productionmonitor.onrender.com/api/breakdowns', enrichedBrk);
      const savedBrk = { ...enrichedBrk, id: res.data.id };

      const updated = [savedBrk, ...breakdownRecords];
      setBreakdownRecords(updated);
      updateProductionRecordBreakdownHours(newBrk.year, newBrk.month, newBrk.day, updated);
      showToast('Breakdown logged to database successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to log breakdown', 'error');
    }
  };

  const handleUpdateBreakdownsForDay = async (year, month, day, machineMinutes) => {
    const monthMap = { 'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06', 'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12' };
    const formattedDate = `${year}-${monthMap[month] || '01'}-${day.toString().padStart(2, '0')}`;

    try {

      await axios.delete(`https://productionmonitor.onrender.com/api/breakdowns/day/${formattedDate}`);


      const newRecords = [];
      for (const m of MACHINES) {
        const minutes = machineMinutes[m] || 0;
        if (minutes > 0) {
          const payload = { year, month, day, machineName: m, lossDuration: minutes, date: formattedDate, reason: '' };
          const res = await axios.post('https://productionmonitor.onrender.com/api/breakdowns', payload);
          newRecords.push({ ...payload, id: res.data.id });
        }
      }


      const filtered = breakdownRecords.filter((b) => b.date !== formattedDate);
      const updatedBreakdowns = [...filtered, ...newRecords];

      setBreakdownRecords(updatedBreakdowns);
      updateProductionRecordBreakdownHours(year, month, day, updatedBreakdowns);
      showToast('Breakdown record updated successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error saving breakdowns', 'error');
    }
  };

  const handleDeleteBreakdownsForDay = async (year, month, day) => {
    const monthMap = { 'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06', 'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12' };
    const formattedDate = `${year}-${monthMap[month] || '01'}-${day.toString().padStart(2, '0')}`;

    try {
      await axios.delete(`https://productionmonitor.onrender.com/api/breakdowns/day/${formattedDate}`);
      const filtered = breakdownRecords.filter((b) => b.date !== formattedDate);

      setBreakdownRecords(filtered);
      updateProductionRecordBreakdownHours(year, month, day, filtered);
      showToast('Breakdown row deleted successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Error deleting breakdowns', 'error');
    }
  };

  const updateProductionRecordBreakdownHours = (year, monthName, dayNum, allBrks) => {
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04', 'May': '05', 'June': '06',
      'July': '07', 'August': '08', 'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const mm = monthMap[monthName] || '01';
    const dd = dayNum.toString().padStart(2, '0');
    const lookupDateStr = `${year}-${mm}-${dd}`;

    const updatedProdList = productionRecords.map((r) => {
      if (r.date === lookupDateStr) {
        const dayMins = allBrks
          .filter((b) => b.year === year && b.month === monthName && b.day === dayNum && b.machineName === r.machineName)
          .reduce((sum, b) => sum + b.lossDuration, 0);
        return { ...r, breakdownTime: dayMins / 60 };
      }
      return r;
    });

    setProductionRecords(updatedProdList);
    localStorage.setItem(STORAGE_KEYS.PRODUCTION, JSON.stringify(updatedProdList));
  };

  const handleWipeDatabase = async () => {
    try {

      await axios.delete('https://productionmonitor.onrender.com/api/wipe');


      setProductionRecords([]);
      setBreakdownRecords([]);
      showToast('Database wiped successfully! System is clean.', 'success');
      setActiveTab('Dashboard');
    } catch (error) {
      console.error(error);
      showToast('Failed to wipe database.', 'error');
    }
  };

  if (!isAuthenticated) {
    return (
      <Login
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          localStorage.setItem('isLoggedIn', 'true');
          
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 flex flex-col antialiased">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} setIsAuthenticated={setIsAuthenticated} />

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
              {toastMessage.type === 'success' ? <Check className="w-4 h-4" /> : <Info className="w-4 h-4" />}
            </div>
            <span className="leading-tight">{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>



      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'Dashboard' && (
              <Dashboard productionRecords={productionRecords} breakdownRecords={breakdownRecords} />
            )}
            {activeTab === 'Cutting Entry' && (
              <DataEntryForm
                records={productionRecords}
                onAddRecord={handleAddProductionRecord}
                onUpdateRecord={handleUpdateProductionRecord}
                onDeleteRecord={handleDeleteProductionRecord}
              />
            )}
            {activeTab === 'Breakdown' && (
              <BreakdownEntry
                records={breakdownRecords}
                onAddBreakdown={handleAddBreakdownRecord}
                onUpdateBreakdownsForDay={handleUpdateBreakdownsForDay}
                onDeleteBreakdownsForDay={handleDeleteBreakdownsForDay}

              />
            )}
            {activeTab === 'Cutting Quantity' && (
              <CuttingDetails
                records={productionRecords}
                onUpdateRecord={handleUpdateProductionRecord}
                onDeleteRecord={handleDeleteProductionRecord}
                onDeleteRow={handleDeleteRow}
                onWipeDatabase={handleWipeDatabase}
              />
            )}
            {activeTab === 'Analysis Report' && <ProductionAnalysisReport />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs font-bold text-slate-400">
        <div>MACHINE PRODUCTION MONITOR &copy; 2026. ALL RIGHTS RESERVED.</div>
      </footer>
    </div>
  );
}