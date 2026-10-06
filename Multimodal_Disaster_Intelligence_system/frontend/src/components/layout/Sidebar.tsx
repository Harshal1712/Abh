import React, { useState } from 'react';
import { LayoutDashboard, Activity, BrainCircuit, CheckSquare, BellRing, MessageSquare, Settings as SettingsIcon, PanelLeft, PanelRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { NavTab } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, events, alerts, communityReports, isMobileMenuOpen, setIsMobileMenuOpen } = useApp();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pendingReviewCount = events.filter(e => e.status === 'PENDING_REVIEW').length;
  const pendingAlertCount = alerts.filter(a => a.status === 'PENDING_PUBLISH').length;
  const unverifiedReportCount = communityReports.filter(r => r.status === 'UNVERIFIED').length;
  const navSections: { label: string; items: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; badgeColor?: string }[] }[] = [
    { label: 'Overview', items: [{ id: 'dashboard', label: 'Command Center', icon: LayoutDashboard }, { id: 'active-events', label: 'Active Events', icon: Activity }] },
    { label: 'Assessment', items: [{ id: 'ai-risk', label: 'Risk Intelligence', icon: BrainCircuit }] },
    { label: 'Operations', items: [
      { id: 'expert-review', label: 'Expert Review', icon: CheckSquare, badge: pendingReviewCount, badgeColor: 'bg-purple-500 text-white' },
      { id: 'alert-management', label: 'Alert Management', icon: BellRing, badge: pendingAlertCount, badgeColor: 'bg-amber-500 text-white' },
      { id: 'community-reports', label: 'Community Reports', icon: MessageSquare, badge: unverifiedReportCount, badgeColor: 'bg-rose-500 text-white' }
    ]},
    { label: 'Workspace', items: [{ id: 'settings', label: 'Settings', icon: SettingsIcon }] }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[1900] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          ${isCollapsed ? 'w-20' : 'w-64'} 
          glass-panel border-r border-slate-200/80 flex flex-col justify-between h-full text-slate-600 shrink-0 
          z-[2000] md:z-10 m-0 md:m-3 md:mr-0 md:rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(15,23,42,.06)] 
          transition-transform duration-300 ease-in-out
          fixed md:relative inset-y-0 left-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      <div>
        <div className={`p-4 border-b border-slate-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={isCollapsed ? 'hidden' : ''}><p className="text-[9px] font-black uppercase tracking-[.18em] text-slate-400">Workspace</p><h1 className="mt-1 text-sm font-black tracking-tight text-slate-900 font-display">Operations Console</h1></div>
          <button onClick={() => setIsCollapsed(value => !value)} title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-200 transition hover:bg-indigo-600">{isCollapsed ? <PanelRight className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}</button>
        </div>
        <nav className="p-3 pt-4 space-y-4">
          {navSections.map(section => <div key={section.label}><p className={`${isCollapsed ? 'hidden' : ''} px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400`}>{section.label}</p><div className="space-y-1">{section.items.map(item => {
            const Icon = item.icon; const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} 
                title={isCollapsed ? item.label : undefined} 
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'} py-3 md:py-2.5 rounded-xl text-[14px] md:text-[13px] font-semibold transition-all duration-200 group ${isActive ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-200 border border-sky-500' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'}`}
              >
                <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
                  <Icon className={`h-5 w-5 md:h-4 md:w-4 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                  <span className={isCollapsed ? 'hidden' : ''}>{item.label}</span>
                </div>
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.badgeColor}`}>{item.badge}</span>}
              </button>
            );
          })}</div></div>)}
        </nav>
      </div>
      <div className={`p-4 border-t border-slate-100 bg-white/65 m-3 rounded-2xl shadow-sm backdrop-blur-md ${isCollapsed ? 'px-2' : ''}`}><div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}><div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold font-display shadow-sm">AS</div><div className={`${isCollapsed ? 'hidden' : ''} overflow-hidden`}><span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider block">Signed in as</span><h4 className="text-xs font-bold text-slate-800 truncate mt-0.5">Dr. Ananya Sharma</h4><p className="text-[10px] text-slate-500 truncate">Disaster Risk Analyst</p></div></div></div>
    </aside>
    </>
  );
};
