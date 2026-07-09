import React from 'react';
import { LayoutDashboard, Scissors, Wrench, Layers, Factory, BarChart3, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export function Navbar({ activeTab, setActiveTab, setIsAuthenticated }) {
  const tabs = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Cutting Entry', icon: Scissors },
    { name: 'Breakdown', icon: Wrench },
    { name: 'Cutting Quantity', icon: Layers },
    { name: 'Analysis Report', icon: BarChart3 },
  ];

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 shadow-sm">
      {/* Upper Brand Section & Logout Button */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 text-white p-3 rounded-xl shadow-md">
            <Factory className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none">
              MACHINE PRODUCTION MONITOR
            </h1>
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mt-1">
              FACTORY PERFORMANCE SYSTEM
            </p>
          </div>
        </div>

        
        <button
          onClick={() => {
           
            localStorage.removeItem('isLoggedIn');
            setIsAuthenticated(false);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold border border-rose-200 shadow-sm transition cursor-pointer"
          title="Secure Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline uppercase tracking-wider">Logout</span>
        </button>
      </div>

      {/* Tabs Menu Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
        <nav className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.name;
            return (
              <button
                key={tab.name}
                id={`tab-${tab.name.toLowerCase().replace(' ', '-')}`}
                onClick={() => setActiveTab(tab.name)}
                className="relative flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-bold text-sm tracking-wide transition-all duration-150 focus:outline-none cursor-pointer select-none"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-nav-indicator"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200/50 z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`relative z-10 w-4 h-4 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`relative z-10 uppercase transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}