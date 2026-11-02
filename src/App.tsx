/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AccessRestricted } from './components/AccessRestricted';
import { ClinicProvider, useClinic } from './context/ClinicContext';
import { Navbar } from './components/Navbar';
import {
  LoginView,
  PasswordChangeView,
  UsersView,
  SessionMonitor,
} from './views/SecurityViews';
import { DashboardView } from './views/DashboardView';
import { PatientsView } from './views/PatientsView';
import { UploadView } from './views/UploadView';
import { DocumentViewerView } from './views/DocumentViewerView';
import { SearchView } from './views/SearchView';
import { AuditLogView } from './views/AuditLogView';
import { IncompleteDocumentsView } from './views/IncompleteDocumentsView';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';

function ClinicMainContent() {
  const { pending } = useClinic();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <SessionMonitor />
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <fieldset disabled={pending} aria-busy={pending} className="min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/patients" element={<PatientsView />} />
            <Route path="/patients/:patientId" element={<PatientsView />} />
            <Route path="/upload" element={<UploadView />} />
            <Route
              path="/documents/:documentId"
              element={<DocumentViewerView />}
            />
            <Route path="/search" element={<SearchView />} />
            <Route path="/admin/audit" element={<AdminRoute />} />
            <Route path="/admin/users" element={<AdminRoute users />} />
            <Route
              path="/login"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="/incomplete" element={<IncompleteDocumentsView />} />
            <Route
              path="*"
              element={
                <div role="alert">
                  Page not found. <a href="/dashboard">Return to dashboard</a>
                </div>
              }
            />
          </Routes>
        </fieldset>
      </main>

      {/* Clinic Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="font-semibold text-brand-900">
              San Nicolas Dental Clinic
            </span>
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

function AdminRoute({ users = false }: { users?: boolean }) {
  const { canManageUsersAndAudit } = useClinic();
  return canManageUsersAndAudit ? (
    users ? (
      <UsersView />
    ) : (
      <AuditLogView />
    )
  ) : (
    <AccessRestricted
      requiredRole="Admin"
      reason="The audit console is available to administrators."
    />
  );
}

function DataBoundary() {
  const {
    loading,
    auth,
    data,
    apiError,
    pending,
    reload,
    clearApiError,
    acknowledgePrivacy,
  } = useClinic();
  const location = useLocation();
  if (loading)
    return (
      <div role="status" className="p-8">
        Loading clinic records…
      </div>
    );
  if (!auth)
    return location.pathname === '/login' ? (
      <LoginView />
    ) : (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  if (auth.user.mustChangePassword) return <PasswordChangeView />;
  if (!auth.privacyAcknowledged)
    return (
      <main className="min-h-screen bg-slate-50">
        {apiError && (
          <p role="alert" className="p-4 text-rose-900">
            {apiError}
          </p>
        )}
        <PrivacyNoticeModal
          isOpen
          staffName={auth.user.name}
          staffTitle={auth.user.title}
          onAccept={() => {
            void acknowledgePrivacy().catch(() => {});
          }}
        />
      </main>
    );
  if (!data)
    return (
      <div role="alert" className="p-8">
        Unable to connect to the clinic server. {apiError}
        <button
          className="ml-4 underline"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  return (
    <>
      <div
        className="bg-amber-50 text-amber-950 px-4 py-2 text-sm"
        role="status"
      >
        Fictional records only — clinic release review is still pending.
      </div>
      {pending && (
        <div role="status" className="px-4 py-2 text-sm">
          Saving to clinic server…
        </div>
      )}
      {apiError && (
        <div role="alert" className="bg-rose-50 text-rose-900 px-4 py-3">
          {apiError}
          <button
            className="ml-4 underline"
            onClick={() => {
              clearApiError();
              void reload();
            }}
          >
            Reload records
          </button>
        </div>
      )}
      <ClinicMainContent />
    </>
  );
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
