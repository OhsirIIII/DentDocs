import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Patient, DentalDocument } from '../types/dental';
import { FdiDentalChart } from '../components/FdiDentalChart';
import {
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  FileText,
  Upload,
  ArrowLeft,
  Calendar,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export const PatientsView: React.FC = () => {
  const {
    patients,
    visibleDocuments,
    alerts,
    currentUser,
    canAccessClinicalDocs,
    navigateTo,
    setSelectedDocumentId,
    selectedPatientId,
    setSelectedPatientId,
  } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToothFilter, setSelectedToothFilter] = useState<number | null>(null);

  // Active patient object if selected
  const activePatient = patients.find((p) => p.id === selectedPatientId);
  const patientAlerts = activePatient
    ? alerts.filter((a) => a.patientId === activePatient.id)
    : [];

  // Filter patient list
  const filteredPatients = patients.filter((patient) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      patient.fullName.toLowerCase().includes(q) ||
      patient.recordNo.toLowerCase().includes(q) ||
      patient.phone.includes(q) ||
      (patient.preferredName && patient.preferredName.toLowerCase().includes(q))
    );
  });

  // Get documents linked to active patient
  const linkedDocs = activePatient
    ? visibleDocuments.filter((d) => d.patientId === activePatient.id)
    : [];

  const handleOpenDoc = (docId: string) => {
    setSelectedDocumentId(docId);
    navigateTo('viewer', { documentId: docId });
  };

  const handleUploadForPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    navigateTo('upload', { patientId });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* If viewing a single patient detail */}
      {activePatient ? (
        <div className="space-y-6">
          {/* Back button & Patient Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div>
              <button
                onClick={() => setSelectedPatientId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 mb-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Patient Directory</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold text-lg flex items-center justify-center shrink-0">
                  {activePatient.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {activePatient.fullName}
                    </h1>
                    {activePatient.preferredName && (
                      <span className="text-xs text-slate-500 font-medium">
                        ("{activePatient.preferredName}")
                      </span>
                    )}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {activePatient.recordNo}
                    </span>
                  </div>
                  {/* Demographic subtext */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                    <span>{activePatient.gender}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activePatient.age} yrs old (DOB: {activePatient.dob})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Last visit: {activePatient.lastVisit}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleUploadForPatient(activePatient.id)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Upload For Patient</span>
              </button>
            </div>
          </div>

          {/* Urgent Missing or Expiring Document Alerts */}
          {patientAlerts.length > 0 && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 text-xs text-rose-950 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-rose-950">
                    Active Clinical & Missing Document Alerts ({patientAlerts.length})
                  </span>
                </div>
                <span className="text-[11px] font-mono text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-semibold">
                  Compliance Risk
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {patientAlerts.map((pa) => (
                  <div
                    key={pa.id}
                    className="p-3 bg-white rounded-lg border border-rose-200 text-xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                            pa.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pa.severity === 'critical' ? 'Urgent Missing' : 'Expiring'}
                        </span>
                        {pa.scheduledDate && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Sched: {pa.scheduledDate}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900">{pa.title}</p>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {pa.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      {pa.linkedDocId ? (
                        <button
                          onClick={() => handleOpenDoc(pa.linkedDocId!)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                        >
                          <span>{pa.actionLabel}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUploadForPatient(pa.patientId)}
                          className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                        >
                          <span>Upload Form</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Alerts & Guardian Warning */}
          {(activePatient.medicalAlerts.length > 0 || activePatient.isMinor) && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Clinical & Administrative Alerts:</p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {activePatient.medicalAlerts.map((alert, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-white border border-amber-300 font-medium text-amber-800"
                    >
                      {alert}
                    </span>
                  ))}
                  {activePatient.isMinor && (
                    <span className="px-2.5 py-1 rounded-md bg-white border border-rose-300 text-rose-800 font-medium">
                      Minor Patient · Guardian: {activePatient.guardianName} ({activePatient.guardianPhone})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Grid: Patient Details & FDI Charting */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Contact & Demographics (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Patient Contact & Background
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone
                  </span>
                  <span className="font-mono text-slate-900 font-medium">
                    {activePatient.phone}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
                  </span>
                  <span className="text-slate-900">{activePatient.email}</span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Residential Address
                  </span>
                  <span className="text-slate-700 leading-relaxed">
                    {activePatient.address}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-0.5">Emergency Contact</span>
                  <p className="font-semibold text-slate-800">
                    {activePatient.emergencyContact.name}{' '}
                    <span className="text-slate-500 font-normal">
                      ({activePatient.emergencyContact.relation})
                    </span>
                  </p>
                  <p className="font-mono text-slate-700 mt-0.5">
                    {activePatient.emergencyContact.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* FDI Interactive Charting (8 cols) */}
            <div className="lg:col-span-8">
              <FdiDentalChart
                treatedTeeth={activePatient.fdiTreatedTeeth}
                missingTeeth={activePatient.fdiMissingTeeth}
                watchTeeth={activePatient.fdiWatchTeeth}
                selectedTeeth={selectedToothFilter ? [selectedToothFilter] : []}
                onToothClick={(tooth) => {
                  setSelectedToothFilter(selectedToothFilter === tooth ? null : tooth);
                }}
              />
              <p className="text-[11px] text-slate-500 mt-2 text-right">
                Click any tooth number to filter documents linked to that tooth
              </p>
            </div>
          </div>

          {/* Linked Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Linked Documents ({linkedDocs.length})
                </h2>
                <p className="text-xs text-slate-500">
                  {currentUser.role === 'front_desk'
                    ? 'Showing Billing & Appointment records authorized for Front Desk'
                    : 'All clinical and administrative documents for this patient record'}
                  {selectedToothFilter && ` · Filtered by Tooth FDI ${selectedToothFilter}`}
                </p>
              </div>

              {selectedToothFilter && (
                <button
                  onClick={() => setSelectedToothFilter(null)}
                  className="text-xs text-teal-700 font-medium hover:underline"
                >
                  Clear Tooth Filter
                </button>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {linkedDocs
                .filter((d) =>
                  selectedToothFilter ? d.toothNumbers.includes(selectedToothFilter) : true
                )
                .map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenDoc(doc.id)}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-teal-800 transition-colors truncate">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                          <span>{doc.type}</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.procedureCategory}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{doc.displayDate}</span>
                          {doc.toothNumbers.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-teal-800 font-medium">
                                Teeth: {doc.toothNumbers.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {doc.completenessStatus === 'incomplete' ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                          Incomplete ({doc.missingFields.length})
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}

              {linkedDocs.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-700">No documents accessible</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {currentUser.role === 'front_desk'
                      ? 'No billing or appointment slips on file for this patient.'
                      : 'Upload the first clinical document for this patient above.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Patient Directory Listing (All 12 Patients) */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Patient Directory
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Search 12 registered patients by name, record number (PT-2026-XXXX), or mobile
              </p>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PT-2026-0001 or name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Directory Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPatients.map((patient) => {
              const docCount = visibleDocuments.filter((d) => d.patientId === patient.id).length;
              const hasIncomplete = visibleDocuments.some(
                (d) => d.patientId === patient.id && d.completenessStatus === 'incomplete'
              );
              const activeAlerts = alerts.filter((a) => a.patientId === patient.id);

              return (
                <div
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  className="bg-white border border-slate-200 hover:border-teal-300 rounded-xl p-5 transition-all cursor-pointer group shadow-xs hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-bold flex items-center justify-center shrink-0 text-sm">
                        {patient.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-teal-800 transition-colors">
                          {patient.fullName}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">{patient.recordNo}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {activeAlerts.length > 0 && (
                        <span
                          title={activeAlerts[0].title}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-800 font-bold border border-rose-200 shrink-0 flex items-center gap-1"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Alert ({activeAlerts.length})</span>
                        </span>
                      )}
                      {hasIncomplete && activeAlerts.length === 0 && (
                        <span
                          title="Contains document with missing required items"
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200 shrink-0"
                        >
                          Action Needed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Demographic & Contact */}
                  <div className="space-y-1 text-xs text-slate-600 mb-4">
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{patient.phone}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{patient.address}</span>
                    </p>
                  </div>

                  {/* Medical Alert tags if any */}
                  {patient.medicalAlerts.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1">
                      {patient.medicalAlerts.map((m, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium truncate max-w-full"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer Stats */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-800 font-semibold">{docCount}</strong> linked docs
                    </span>
                    <span className="text-teal-700 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open Record <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
