import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { UserRole } from '../types/dental';
import { STAFF_USERS } from '../data/mockUsersAndAudit';
import {
  ShieldCheck,
  Stethoscope,
  FileSpreadsheet,
  Receipt,
  UserCheck,
  X,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, switchRole } = useClinic();

  if (!isOpen) return null;

  const handleSelectRole = (role: UserRole) => {
    switchRole(role);
    onClose();
  };

  const roleInfo: Record<
    UserRole,
    {
      icon: any;
      description: string;
      permissions: string[];
      accent: string;
    }
  > = {
    admin: {
      icon: ShieldCheck,
      description: 'Clinic Director overseeing overall clinic compliance, staff, and system logs.',
      permissions: ['Full Access to all 30 documents', 'Staff & User Management', 'Tamper-Evident Audit Logs', 'Can Delete Records'],
      accent: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    dentist: {
      icon: Stethoscope,
      description: 'Lead Dental Surgeon managing clinical diagnostics, X-rays, and patient care.',
      permissions: ['View & Edit All Clinical Documents', 'Annotate FDI Teeth & Findings', 'Mark Incomplete Documents Complete', 'Can Delete Records'],
      accent: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    assistant: {
      icon: FileSpreadsheet,
      description: 'Senior Registered Dental Assistant scanning records, checking checklists.',
      permissions: ['Upload Scans & Radiographs', 'Run Simulated OCR Extraction', 'Verify Completeness Checklist', 'Deletion Locked (Safety Guard)'],
      accent: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    },
    front_desk: {
      icon: Receipt,
      description: 'Patient Coordinator handling billing receipts, HMO approvals, and appointments.',
      permissions: ['View Billing & Official Receipts', 'Manage Appointment Slips', 'Clinical Records Restricted (HIPAA/Privacy Guard)'],
      accent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
            <span>DentDocs Role Switcher</span>
            <span aria-hidden="true">·</span>
            <span>Demo Mode</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Select Staff Persona for Demo Testing
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Experience DentDocs from the perspective of each clinic role to test access boundaries,
            permissions, and workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(STAFF_USERS) as UserRole[]).map((r) => {
            const user = STAFF_USERS[r];
            const meta = roleInfo[r];
            const Icon = meta.icon;
            const isCurrent = currentUser.role === r;

            return (
              <div
                key={r}
                onClick={() => handleSelectRole(r)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isCurrent
                    ? 'border-teal-600 bg-teal-50/30 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.accent}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                          {user.name}
                        </h3>
                        <p className="text-xs text-slate-500 capitalize">{user.title}</p>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-700 text-white font-bold shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mb-3">{meta.description}</p>

                  <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2 mb-3">
                    {meta.permissions.map((perm, idx) => (
                      <p key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                        <span>{perm}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                    isCurrent
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 group-hover:bg-teal-600 text-slate-700 group-hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Currently Active' : `Switch to ${user.name.split(' ')[1] || user.name}`}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Dalisay Dental Studio · Manila, Philippines</span>
          <span>Fictional Clinic Demo</span>
        </div>
      </div>
    </div>
  );
};
