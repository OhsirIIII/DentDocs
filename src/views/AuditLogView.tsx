import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { AccessRestricted } from '../components/AccessRestricted';
import { STAFF_USERS } from '../data/mockUsersAndAudit';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DentalDocument } from '../types/dental';
import {
  ShieldAlert,
  ShieldCheck,
  User,
  History,
  Filter,
  Download,
  Calendar,
  Lock,
  Archive,
  RotateCcw,
  FileText,
  Trash2,
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const {
    currentUser,
    auditLogs,
    canManageUsersAndAudit,
    archivedDocuments,
    restoreArchivedDocument,
  } = useClinic();

  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [docToRestore, setDocToRestore] = useState<DentalDocument | null>(null);

  if (!canManageUsersAndAudit) {
    return (
      <AccessRestricted
        requiredRole="Admin (Clinic Director)"
        reason="The Philippine Dental Clinic Compliance & Audit Trail is restricted strictly to Administrator level (Dr. Maria Elena Santos). Please switch your role to Admin to view audit logs."
      />
    );
  }

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

      {/* Admin Soft-Deleted Records Vault */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-4 h-4 text-teal-700" />
              <span>Archived Records Vault ({archivedDocuments.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Soft-deleted documents hidden from normal patient charts. Only Administrator can review and restore records.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Soft Delete · Tamper-evident retention
          </span>
        </div>

        {archivedDocuments.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Archived Documents</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All clinical records and diagnostic scans are active. Soft-deleted files will appear here for recovery.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Archived By & When</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archivedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate max-w-xs">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{doc.patientName}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {doc.patientRecordNo}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                        {doc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span>{doc.archivedBy || 'Administrator'}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        {doc.archivedAt || 'Recent'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setDocToRestore(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore Record</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
              <option value="UPLOAD_VERSION">Upload Version</option>
              <option value="RESTORE_VERSION">Restore Version</option>
              <option value="ARCHIVE">Archive (Soft Delete)</option>
              <option value="RESTORE_ARCHIVE">Restore Archive</option>
              <option value="PRIVACY_ACK">Privacy Notice Ack</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>

        {/* Audit Table or Empty State */}
        {filteredLogs.length === 0 ? (
          <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Audit Events Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No activity logs match the selected filters for staff member or event type.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilterUser('ALL');
                setFilterAction('ALL');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors border border-teal-200"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
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
                            : log.action === 'ARCHIVE'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : log.action === 'RESTORE_ARCHIVE'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : log.action === 'PRIVACY_ACK'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : log.action === 'RESTORE_VERSION' || log.action === 'UPLOAD_VERSION'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
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
        )}
      </div>

      {/* Confirmation Dialog for Soft-Delete Record Restoration */}
      <ConfirmDialog
        isOpen={!!docToRestore}
        title={`Restore "${docToRestore?.title}"?`}
        description="This soft-deleted document will immediately be restored to the patient's active clinical chart and become visible in search queries and queues."
        consequenceNote="Reversible: An audit log entry will be created attributing this restoration to your Admin account."
        confirmLabel="Restore Document"
        variant="default"
        onConfirm={() => {
          if (docToRestore) {
            restoreArchivedDocument(docToRestore.id);
            setDocToRestore(null);
          }
        }}
        onCancel={() => setDocToRestore(null)}
      />
    </div>
  );
};
