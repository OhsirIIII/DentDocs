import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { UserRole } from '../types/dental';
import { STAFF_USERS } from '../data/mockUsersAndAudit';
import {
  ShieldAlert,
  ChevronDown,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    switchRole,
    currentScreen,
    navigateTo,
    canManageUsersAndAudit,
    resetDemoData,
    documents,
    alerts,
  } = useClinic();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const incompleteCount = documents.filter((d) => d.completenessStatus === 'incomplete').length;
  const criticalAlertsCount = alerts.length;

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setRoleDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigateTo('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-teal-800 transition-colors">
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C7.58 2 4 5.58 4 10c0 3.31 1.7 6.22 4.25 7.88L8 22l4-2 4 2-.25-4.12C18.3 16.22 20 13.31 20 10c0-4.42-3.58-8-8-8zm-1 14.5-2.5 1.25.18-2.92C9.5 15.15 10.23 15.5 11 15.75v.75zm6-1.67-.18 2.92-2.5-1.25v-.75c.77-.25 1.5-.6 2.32-.92H17zM12 4c3.31 0 6 2.69 6 6 0 2.21-1.2 4.14-3 5.18V13.5c0-.83-.67-1.5-1.5-1.5h-3c-.83 0-1.5.67-1.5 1.5v1.68C7.2 14.14 6 12.21 6 10c0-3.31 2.69-6 6-6z" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-teal-900 transition-colors">
                  DentDocs
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500">
                  Dalisay Dental Studio · Manila
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: 4–5 single-line clean text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <button
              onClick={() => navigateTo('dashboard')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentScreen === 'dashboard'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                  : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigateTo('patients')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentScreen === 'patients'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                  : ''
              }`}
            >
              Patients (12)
            </button>
            <button
              onClick={() => navigateTo('upload')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
                currentScreen === 'upload'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                  : ''
              }`}
            >
              <span>Upload</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-teal-50 text-teal-800 rounded">
                OCR
              </span>
            </button>
            <button
              onClick={() => navigateTo('incomplete')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
                currentScreen === 'incomplete'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                  : ''
              }`}
            >
              <span>Incomplete</span>
              {incompleteCount > 0 && (
                <span className="font-mono text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded-full font-bold">
                  {incompleteCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigateTo('search')}
              className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentScreen === 'search'
                  ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                  : ''
              }`}
            >
              Search
            </button>
            {canManageUsersAndAudit && (
              <button
                onClick={() => navigateTo('audit')}
                className={`hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  currentScreen === 'audit'
                    ? 'text-teal-700 font-semibold border-b-2 border-teal-700'
                    : ''
                }`}
              >
                Audit Log
              </button>
            )}
          </nav>

          {/* Zone 3: 1 primary action area / Role Selector */}
          <div className="flex items-center gap-3 shrink-0">
            {criticalAlertsCount > 0 && (
              <button
                onClick={() => navigateTo('dashboard')}
                title={`${criticalAlertsCount} clinical and expiring document alerts require attention`}
                className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>{criticalAlertsCount} Alerts</span>
              </button>
            )}

            {incompleteCount > 0 && (
              <button
                onClick={() => navigateTo('incomplete')}
                title={`${incompleteCount} documents require missing signatures or data`}
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>{incompleteCount} Incomplete</span>
              </button>
            )}

            {/* Role Switcher Popover */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg text-slate-800 transition-colors"
                aria-label="Switch User Role"
              >
                <div className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.avatarInitials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="font-semibold text-slate-900 leading-none truncate max-w-[120px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-tight capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-900">Demo Role Switcher</p>
                    <p className="text-[11px] text-slate-500">
                      Test DentDocs role-based security & workflows
                    </p>
                  </div>

                  <div className="space-y-1">
                    {(Object.keys(STAFF_USERS) as UserRole[]).map((r) => {
                      const user = STAFF_USERS[r];
                      const isActive = currentUser.role === r;
                      return (
                        <button
                          key={r}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            isActive
                              ? 'bg-teal-50 text-teal-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-slate-900">{user.name}</span>
                              {user.license && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {user.license}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">{user.title}</span>
                          </div>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between px-2">
                    <button
                      onClick={() => {
                        resetDemoData();
                        setRoleDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 py-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Demo Data</span>
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">v1.0 (Mock)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 text-xs font-medium text-slate-600 overflow-x-auto">
          <button
            onClick={() => navigateTo('dashboard')}
            className={`px-2 py-1 ${currentScreen === 'dashboard' ? 'text-teal-700 font-bold' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigateTo('patients')}
            className={`px-2 py-1 ${currentScreen === 'patients' ? 'text-teal-700 font-bold' : ''}`}
          >
            Patients
          </button>
          <button
            onClick={() => navigateTo('upload')}
            className={`px-2 py-1 ${currentScreen === 'upload' ? 'text-teal-700 font-bold' : ''}`}
          >
            Upload
          </button>
          <button
            onClick={() => navigateTo('incomplete')}
            className={`px-2 py-1 ${currentScreen === 'incomplete' ? 'text-teal-700 font-bold' : ''}`}
          >
            Incomplete
          </button>
          <button
            onClick={() => navigateTo('search')}
            className={`px-2 py-1 ${currentScreen === 'search' ? 'text-teal-700 font-bold' : ''}`}
          >
            Search
          </button>
          {canManageUsersAndAudit && (
            <button
              onClick={() => navigateTo('audit')}
              className={`px-2 py-1 ${currentScreen === 'audit' ? 'text-teal-700 font-bold' : ''}`}
            >
              Audit
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
