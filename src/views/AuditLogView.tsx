import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { AccessRestricted } from '../components/AccessRestricted';
import { STAFF_USERS } from '../data/mockUsersAndAudit';
import {
  ShieldAlert,
  ShieldCheck,
  User,
  History,
  Filter,
  Download,
  Calendar,
  Lock,
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { currentUser, auditLogs, canManageUsersAndAudit } = useClinic();

  if (!canManageUsersAndAudit) {
    return (
      <AccessRestricted
        requiredRole="Admin (Clinic Director)"
        reason="The Philippine Dental Clinic Compliance & Audit Trail is restricted strictly to Administrator level (Dr. Maria Elena Santos). Please switch your role to Admin to view audit logs."
      />
    );
  }

  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterUser !== 'ALL' && log.userId !== filterUser) return false;
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
          <span>Administrative Console</span>
          <span aria-hidden="true">·</span>
          <span>Security & Compliance</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Clinic Audit Trail & Staff Directory
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tamper-evident activity logs for Philippine dental board compliance, record alterations, and
          staff actions.
        </p>
      </div>

      {/* Staff User Management Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-teal-700" />
          <span>Active Clinic Staff & License Registry</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(STAFF_USERS).map((user) => (
            <div
              key={user.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">{user.name}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                  {user.role}
                </span>
              </div>
              <p className="text-xs text-slate-600">{user.title}</p>
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/60">
                {user.license ? <span>Lic: {user.license}</span> : <span>Non-clinical</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Log Filters & Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-teal-700" />
              <span>Event Activity Stream ({filteredLogs.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Chronological log of document uploads, flag toggles, and metadata revisions
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
            >
              <option value="ALL">All Staff Members</option>
              {Object.values(STAFF_USERS).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
            >
              <option value="ALL">All Event Types</option>
              <option value="UPLOAD">Upload</option>
              <option value="FLAG_INCOMPLETE">Flag Incomplete</option>
              <option value="EDIT_METADATA">Edit Metadata</option>
              <option value="MARK_COMPLETE">Mark Complete</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Document / Subject</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                    {log.userName}
                    <span className="block text-[10px] text-slate-400 capitalize">
                      {log.userRole.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        log.action === 'FLAG_INCOMPLETE'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : log.action === 'MARK_COMPLETE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : log.action === 'UPLOAD'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate">
                    {log.targetTitle}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
