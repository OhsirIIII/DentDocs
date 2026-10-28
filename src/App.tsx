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
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';
import { InactivityWarningBanner } from './components/InactivityWarningBanner';
import { useInactivityTimer } from './hooks/useInactivityTimer';

function ClinicMainContent() {
  const { currentScreen, currentUser, switchRole, navigateTo, addAuditLog } = useClinic();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(() => {
    return sessionStorage.getItem('dentdocs_privacy_acknowledged_v1') !== 'true';
  });

  const handleInactivityLogout = () => {
    switchRole('front_desk');
    navigateTo('dashboard');
    addAuditLog(
      'USER_LOGIN',
      'SYSTEM',
      'front_desk',
      'Session Timeout',
      'User automatically downgraded to Front Desk role due to 10 minutes of inactivity.'
    );
  };

  const { isWarning, secondsRemaining, resetTimer } = useInactivityTimer({
    onLogout: handleInactivityLogout,
    enabled: !showPrivacyModal,
  });

  const handlePrivacyAccept = () => {
    sessionStorage.setItem('dentdocs_privacy_acknowledged_v1', 'true');
    addAuditLog(
      'PRIVACY_ACK',
      'SYSTEM',
      currentUser.id,
      `Privacy Acknowledgement: ${currentUser.name}`,
      `Staff member (${currentUser.title}) acknowledged RA 10173 Patient Record Confidentiality Notice for session.`
    );
    setShowPrivacyModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Inactivity Warning Toast Banner */}
      {isWarning && (
        <InactivityWarningBanner
          secondsRemaining={secondsRemaining}
          onStaySignedIn={resetTimer}
        />
      )}

      {/* RA 10173 Session Privacy Notice */}
      <PrivacyNoticeModal
        isOpen={showPrivacyModal}
        staffName={currentUser.name}
        staffTitle={currentUser.title}
        onAccept={handlePrivacyAccept}
      />

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
