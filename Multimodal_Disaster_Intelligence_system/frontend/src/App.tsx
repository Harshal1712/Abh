import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ActiveEventsPage } from './pages/ActiveEventsPage';
import { AIRiskAnalysisPage } from './pages/AIRiskAnalysisPage';
import { ExpertReviewPage } from './pages/ExpertReviewPage';
import { AlertManagementPage } from './pages/AlertManagementPage';
import { CommunityReportsPage } from './pages/CommunityReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CitizenPortalPage } from './pages/CitizenPortalPage';
import { DispatchModal } from './components/common/DispatchModal';

const MainLayout: React.FC = () => {
  const { userRole, activeTab, dispatchModalData, setDispatchModalData } = useApp();

  return (
    <>
      {userRole === 'CITIZEN' ? (
        <CitizenPortalPage />
      ) : (
        <div className="app-shell h-screen flex flex-col font-sans text-slate-300 selection:bg-sky-500/30 selection:text-white relative bg-[#0f172a] overflow-hidden">
          {/* Background ambient glow - dark theme */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-sky-900/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-900/10 blur-[150px] pointer-events-none rounded-full" />
          
          {/* Top Header Bar */}
          <Header />

          {/* Main Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Navy Blue Left Sidebar */}
            <Sidebar />

            {/* Dynamic Page Content Canvas */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-transparent min-h-[calc(100vh-80px)] w-full">
              {activeTab === 'dashboard' && <DashboardPage />}
              {activeTab === 'active-events' && <ActiveEventsPage />}
              {activeTab === 'ai-risk' && <AIRiskAnalysisPage />}
              {activeTab === 'expert-review' && <ExpertReviewPage />}
              {activeTab === 'alert-management' && <AlertManagementPage />}
              {activeTab === 'community-reports' && <CommunityReportsPage />}
              {activeTab === 'settings' && <SettingsPage />}
              {activeTab === 'event-detail' && <EventDetailPage />}
            </main>
          </div>
        </div>
      )}

      {/* Global Dispatch Modal */}
      {dispatchModalData && (
        <DispatchModal 
          data={dispatchModalData} 
          onClose={() => setDispatchModalData(null)} 
        />
      )}
    </>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
