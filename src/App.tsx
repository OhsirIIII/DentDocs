/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { DashboardView } from './views/DashboardView';
import { PatientsView } from './views/PatientsView';
import { UploadView } from './views/UploadView';
import { DocumentViewerView } from './views/DocumentViewerView';
import { SearchView } from './views/SearchView';
import { AuditLogView } from './views/AuditLogView';
import { IncompleteDocumentsView } from './views/IncompleteDocumentsView';
import { Users2, Shield, HeartPulse } from 'lucide-react';

function ClinicMainContent() {
  const { currentScreen, currentUser } = useClinic();
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentScreen === 'dashboard' && <DashboardView />}
        {currentScreen === 'patients' && <PatientsView />}
        {currentScreen === 'upload' && <UploadView />}
        {currentScreen === 'viewer' && <DocumentViewerView />}
        {currentScreen === 'search' && <SearchView />}
        {currentScreen === 'audit' && <AuditLogView />}
        {currentScreen === 'incomplete' && <IncompleteDocumentsView />}
      </main>

      {/* Demo Role Switcher Quick Pill at bottom right */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setLoginModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white/95 hover:bg-white border border-slate-300 rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <div className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold">
            {currentUser.avatarInitials}
          </div>
          <span className="hidden sm:inline">Role: {currentUser.title.split(' ')[0]}</span>
          <span className="text-teal-700 underline text-[11px]">Switch Persona</span>
        </button>
      </div>

      {/* Role Selection Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Clinic Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">DentDocs</span>
            <span aria-hidden="true">·</span>
            <span>Dalisay Dental Studio (Metro Manila, Philippines)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-slate-400">PRC Lic. 0089123</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Fictional Prototype Data</span>
            <span aria-hidden="true">·</span>
            <span>Compliant with FDI 2-Digit Charting</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ClinicProvider>
      <ClinicMainContent />
    </ClinicProvider>
  );
}
