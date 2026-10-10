import React, { useState } from 'react';
import { Database, UserCheck, Users, RotateCcw, Menu, Radio, User, LogOut, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthModal } from '../common/AuthModal';
import { PublishAlertModal } from '../common/PublishAlertModal';

export const Header: React.FC = () => {
  const { 
    userRole, 
    setUserRole, 
    resetDemoData, 
    activeTab, 
    setActiveTab, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen,
    currentUser,
    logoutUser,
    authModalOpen,
    setAuthModalOpen
  } = useApp();

  const [publishAlertModalOpen, setPublishAlertModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logoutUser();
    setUserDropdownOpen(false);
  };

  return (
    <>
      <header className="glass-panel sticky top-0 z-[1500] border-b border-white/70 text-slate-700 bg-white/80 backdrop-blur-md">
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
              <span className="text-emerald-500 font-bold tracking-wide">ACTIVE</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Database className="h-3.5 w-3.5 text-sky-500" />
              <span className="hidden sm:inline">Data Sources:</span>
              <span className="font-bold text-sky-500">8 Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Broadcast Alert Button */}
            <button
              onClick={() => {
                if (!currentUser || !['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role)) {
                  setAuthModalOpen(true);
                  return;
                }
                setPublishAlertModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide text-white bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-md shadow-rose-200 transition-all active:scale-95"
              title="Publish Emergency Alert with Area Email Dispatch"
            >
              <Radio className="h-3.5 w-3.5 text-white animate-pulse" />
              <span>📢 Broadcast Alert</span>
            </button>

            {/* Role Switcher Pill */}
            <div className="bg-white/80 p-0.5 rounded-full border border-slate-200 flex items-center gap-1 shadow-sm">
              <button
                onClick={() => {
                  if (!currentUser || !['ADMIN', 'EXPERT', 'DISPATCHER', 'FIRST_RESPONDER'].includes(currentUser.role)) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setUserRole('EXPERT');
                  if (activeTab === 'community-reports') setActiveTab('dashboard');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                  userRole === 'EXPERT'
                    ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Command Operations Console (Admin clearance required)"
              >
                <UserCheck className="h-3 w-3" /> EXPERT
              </button>
              <button
                onClick={() => setUserRole('CITIZEN')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${
                  userRole === 'CITIZEN'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                title="Citizen Public Safety Portal"
              >
                <Users className="h-3 w-3" /> CITIZEN
              </button>
            </div>

            {/* User Auth Profile Badge */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200/80 transition shadow-sm"
                >
                  <div className="h-4 w-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="truncate max-w-[100px]">{currentUser.name}</span>
                  <span className="text-[9px] text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded font-black">
                    {currentUser.area || 'Kamrup'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-[2000] text-xs font-sans">
                    <div className="p-2 border-b border-slate-100 mb-1">
                      <div className="font-bold text-slate-900">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                      <div className="mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                        Sector: {currentUser.area} · {currentUser.role}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setAuthModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 text-[11px] font-medium"
                    >
                      Switch Profile / Register
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-[11px] font-bold flex items-center gap-1.5"
                    >
                      <LogOut className="h-3 w-3" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition"
              >
                <User className="h-3 w-3" /> Sign In / Register
              </button>
            )}

            <button
              onClick={resetDemoData}
              className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 px-2 py-1 rounded-full hover:bg-white/80 transition-all active:scale-95"
              title="Reset simulation data to initial state"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={() => {}}
      />

      {/* Publish Alert Modal */}
      <PublishAlertModal
        isOpen={publishAlertModalOpen}
        onClose={() => setPublishAlertModalOpen(false)}
        onAlertPublished={(data) => {
          console.log('[Header] Alert published:', data);
        }}
      />
    </>
  );
};
