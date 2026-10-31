import React, { useEffect, useRef, useState } from 'react';
import logoMark from '../assets/logo-mark.png';
import { useClinic } from '../context/ClinicContext';
import { UserRole } from '../types/dental';
import { STAFF_USERS } from '../data/mockUsersAndAudit';
import { ChevronDown, RotateCcw, AlertTriangle, Users } from 'lucide-react';

type NavScreen = 'dashboard' | 'patients' | 'upload' | 'incomplete' | 'search' | 'audit';

interface NavbarProps {
  /** Opens the full demo persona chooser (LoginModal). */
  onOpenPersonas?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenPersonas }) => {
  const {
    currentUser,
    switchRole,
    currentScreen,
    navigateTo,
    canManageUsersAndAudit,
    resetDemoData,
    visibleDocuments,
    patients,
    alerts,
  } = useClinic();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const incompleteCount = visibleDocuments.filter((d) => d.completenessStatus === 'incomplete').length;
  const alertsCount = alerts.length;

  // Close the role menu on outside click or Escape.
  useEffect(() => {
    if (!roleDropdownOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setRoleDropdownOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRoleDropdownOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [roleDropdownOpen]);

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setRoleDropdownOpen(false);
  };

  const navItems: { screen: NavScreen; label: string; count?: number; short: string }[] = [
    { screen: 'dashboard', label: 'Dashboard', short: 'Home' },
    { screen: 'patients', label: 'Patients', count: patients.length, short: 'Patients' },
    { screen: 'upload', label: 'Upload', short: 'Upload' },
    { screen: 'incomplete', label: 'Incomplete', count: incompleteCount, short: 'Incomplete' },
    { screen: 'search', label: 'Search', short: 'Search' },
    ...(canManageUsersAndAudit
      ? [{ screen: 'audit' as NavScreen, label: 'Audit Log', short: 'Audit' }]
      : []),
  ];

  const activeScreen = currentScreen;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Brand */}
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-2.5 text-left shrink-0 group rounded-lg"
            aria-label="San Nicolas Dental Clinic, go to dashboard"
          >
            <img
              src={logoMark}
              alt=""
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
            <span className="block">
              <span className="block text-[15px] font-bold tracking-tight text-brand-900 leading-tight">
                San Nicolas
              </span>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-700 leading-tight">
                Dental Clinic
              </span>
            </span>
          </button>

          {/* Primary navigation */}
          <nav aria-label="Primary" className="hidden md:flex items-stretch self-stretch gap-1 lg:gap-2">
            {navItems.map((item) => {
              const active = activeScreen === item.screen;
              return (
                <button
                  key={item.screen}
                  onClick={() => navigateTo(item.screen)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-1.5 px-2.5 text-sm whitespace-nowrap transition-colors after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors ${
                    active
                      ? 'text-brand-900 font-semibold after:bg-gold-500'
                      : 'text-slate-600 font-medium hover:text-brand-800 after:bg-transparent hover:after:bg-slate-200'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`tabular-nums text-[11px] leading-none px-1.5 py-0.5 rounded-full font-semibold ${
                        item.screen === 'incomplete'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Status + identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            {alertsCount > 0 && (
              <button
                onClick={() => navigateTo('dashboard')}
                title={`${alertsCount} clinical and expiring document alerts require attention`}
                className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                <span className="tabular-nums">
                  {alertsCount} alert{alertsCount === 1 ? '' : 's'}
                </span>
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 text-xs font-medium hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-full text-slate-800 transition-colors"
                aria-haspopup="menu"
                aria-expanded={roleDropdownOpen}
                aria-label={`Signed in as ${currentUser.name}. Switch user role`}
              >
                <span className="w-8 h-8 rounded-full bg-brand-800 text-white flex items-center justify-center font-semibold text-[11px] ring-2 ring-gold-300 ring-offset-1">
                  {currentUser.avatarInitials}
                </span>
                <span className="text-left hidden sm:block">
                  <span className="block font-semibold text-slate-900 leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </span>
                  <span className="block text-[11px] text-slate-500 leading-tight capitalize">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {roleDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-76 bg-white rounded-xl shadow-[0_12px_32px_-8px_rgb(15_23_42/0.18)] border border-slate-200 p-1.5 z-50"
                >
                  <div className="px-3 pt-2 pb-2.5">
                    <p className="text-xs font-semibold text-slate-900">Switch demo role</p>
                    <p className="text-[11px] text-slate-500">
                      Each role sees different records and actions.
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    {(Object.keys(STAFF_USERS) as UserRole[]).map((r) => {
                      const user = STAFF_USERS[r];
                      const isActive = currentUser.role === r;
                      return (
                        <button
                          key={r}
                          role="menuitemradio"
                          aria-checked={isActive}
                          onClick={() => handleRoleSelect(r)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-3 ${
                            isActive ? 'bg-brand-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">{user.name}</span>
                              {user.license && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {user.license}
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">{user.title}</span>
                          </span>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-gold-500 shrink-0" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-2 px-1">
                    {onOpenPersonas && (
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onOpenPersonas();
                        }}
                        className="text-[11px] font-medium text-brand-700 hover:text-brand-900 hover:bg-brand-50 flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
                      >
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Compare roles</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        resetDemoData();
                        setRoleDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-500 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Reset demo data</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav
          aria-label="Primary"
          className="flex md:hidden items-stretch gap-1 -mx-4 px-4 border-t border-slate-100 text-xs overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = activeScreen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => navigateTo(item.screen)}
                aria-current={active ? 'page' : undefined}
                className={`relative shrink-0 inline-flex items-center gap-1 px-2.5 py-2.5 whitespace-nowrap after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                  active
                    ? 'text-brand-900 font-semibold after:bg-gold-500'
                    : 'text-slate-600 font-medium after:bg-transparent'
                }`}
              >
                {item.short}
                {item.screen === 'incomplete' && incompleteCount > 0 && (
                  <span className="tabular-nums text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                    {incompleteCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
