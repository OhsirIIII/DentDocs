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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
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

      {/* Top Navbar (also hosts the demo role switcher and persona chooser) */}
      <Navbar onOpenPersonas={() => setLoginModalOpen(true)} />

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

      {/* Role Selection Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Clinic Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-semibold text-brand-900">San Nicolas Dental Clinic</span>
            <span aria-hidden="true">·</span>
            <span>Document Management System</span>
          </div>

          <div className="flex items-center gap-2 text-slate-500 flex-wrap justify-center">
            <span>Fictional prototype data</span>
            <span aria-hidden="true">·</span>
            <span>FDI two-digit tooth notation</span>
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
