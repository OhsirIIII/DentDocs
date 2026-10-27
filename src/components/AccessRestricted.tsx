import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { ShieldX, Lock, ArrowRight, UserCheck } from 'lucide-react';

interface AccessRestrictedProps {
  requiredRole?: string;
  reason?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  requiredRole = 'Dentist or Admin',
  reason,
}) => {
  const { currentUser, switchRole, navigateTo } = useClinic();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200/80 p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-5">
          <ShieldX className="w-7 h-7" />
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Access Restricted</span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Clinical Clearance Required
        </h2>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {reason || (
            <>
              Your active role as{' '}
              <strong className="text-slate-900 font-semibold">{currentUser.title}</strong>{' '}
              does not have authorization to view or edit confidential clinical charts and
              radiographs. Front Desk staff may only access Billing & Appointment records.
            </>
          )}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Current Role:</span>
            <span className="font-semibold text-slate-900 capitalize">
              {currentUser.role.replace('_', ' ')}
            </span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Required Clearance:</span>
            <span className="font-semibold text-teal-700">{requiredRole}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Clinic Compliance:</span>
            <span className="text-slate-700">Dalisay Dental Privacy Policy 2026</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => switchRole('dentist')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-sm"
          >
            <UserCheck className="w-4 h-4" />
            <span>Switch Role to Dentist (Dr. Reyes)</span>
          </button>

          <button
            onClick={() => navigateTo('search', { filterType: 'Billing/Receipt' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <span>View Authorized Billing Documents</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigateTo('dashboard')}
            className="w-full text-xs text-slate-500 hover:text-slate-800 py-1"
          >
            Back to Clinic Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
