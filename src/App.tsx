/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AccessRestricted } from './components/AccessRestricted';
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
  const { currentUser, switchRole, navigateTo, addAuditLog, pending } = useClinic();
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
        <fieldset disabled={pending} aria-busy={pending} className="min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/patients" element={<PatientsView />} />
          <Route path="/patients/:patientId" element={<PatientsView />} />
          <Route path="/upload" element={<UploadView />} />
          <Route path="/documents/:documentId" element={<DocumentViewerView />} />
          <Route path="/search" element={<SearchView />} />
          <Route path="/admin/audit" element={<AdminRoute />} />
          <Route path="/incomplete" element={<IncompleteDocumentsView />} />
          <Route path="*" element={<div role="alert">Page not found. <a href="/dashboard">Return to dashboard</a></div>} />
        </Routes>
        </fieldset>
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

function AdminRoute() {
  const { canManageUsersAndAudit } = useClinic();
  return canManageUsersAndAudit ? <AuditLogView /> : <AccessRestricted requiredRole="Admin" reason="The audit console is available to administrators." />;
}

function DataBoundary() {
  const { loading, data, apiError, pending, reload, clearApiError } = useClinic();
  if (loading) return <div role="status" className="p-8">Loading clinic records…</div>;
  if (!data) return <div role="alert" className="p-8">Unable to connect to the clinic server. {apiError}<button className="ml-4 underline" onClick={() => window.location.reload()}>Retry</button></div>;
  return <>
    <div className="bg-amber-50 text-amber-950 px-4 py-2 text-sm" role="status">Phase 2 — fictional data only. Demo roles are not secure accounts.</div>
    {pending && <div role="status" className="px-4 py-2 text-sm">Saving to clinic server…</div>}
    {apiError && <div role="alert" className="bg-rose-50 text-rose-900 px-4 py-3">{apiError}<button className="ml-4 underline" onClick={() => { clearApiError(); void reload(); }}>Reload records</button></div>}
    <ClinicMainContent />
  </>;
}

export default function App() {
  return (
    <BrowserRouter>
    <ClinicProvider>
      <DataBoundary />
    </ClinicProvider>
    </BrowserRouter>
  );
}
