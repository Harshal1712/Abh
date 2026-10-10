import React from 'react';
import { Database, UserCheck, Users, RotateCcw, Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { userRole, setUserRole, resetDemoData, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();

  return (
    <header className="glass-panel sticky top-0 z-[1500] border-b border-white/70 text-slate-700">
      <div className="px-3 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button 
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-500 hidden sm:inline">System Status:</span>
            <span className="text-emerald-400 font-bold tracking-wide">ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Database className="h-3.5 w-3.5 text-sky-400" />
            <span className="hidden sm:inline">Data Sources:</span>
            <span className="font-bold text-sky-400">8 Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          
          <div className="bg-white/70 p-1 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm backdrop-blur-sm">
            <button onClick={() => { setUserRole('EXPERT'); if (activeTab === 'community-reports') setActiveTab('dashboard'); }} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${userRole === 'EXPERT' ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-200' : 'text-slate-500 hover:bg-slate-50'}`}><UserCheck className="h-3.5 w-3.5" /> EXPERT</button>
            <button onClick={() => setUserRole('CITIZEN')} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${userRole === 'CITIZEN' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200' : 'text-slate-500 hover:bg-slate-50'}`}><Users className="h-3.5 w-3.5" /> CITIZEN</button>
          </div>
          <button onClick={resetDemoData} className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-900 px-2 py-1 rounded-full hover:bg-white/80 transition-all active:scale-95" title="Reset simulation data to initial state"><RotateCcw className="h-3 w-3" />Reset Demo</button>
        </div>
      </div>
    </header>
  );
};
