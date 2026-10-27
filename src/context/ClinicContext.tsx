import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  StaffUser,
  UserRole,
  Patient,
  DentalDocument,
  AuditEntry,
  DocumentType,
  ClinicalAlert,
  ProcedureCategory,
  CompletenessStatus,
} from '../types/dental';
import { MOCK_PATIENTS } from '../data/mockPatients';
import { MOCK_DOCUMENTS } from '../data/mockDocuments';
import { STAFF_USERS, INITIAL_AUDIT_LOGS } from '../data/mockUsersAndAudit';
import { generateClinicAlerts } from '../data/clinicalAlerts';

interface NavigationOptions {
  patientId?: string;
  documentId?: string;
  searchQuery?: string;
  filterType?: DocumentType | 'ALL';
  filterStatus?: string;
}

interface ClinicContextType {
  currentUser: StaffUser;
  switchRole: (role: UserRole) => void;
  currentScreen: 'dashboard' | 'patients' | 'upload' | 'viewer' | 'search' | 'audit' | 'incomplete';
  navigateTo: (
    screen: 'dashboard' | 'patients' | 'upload' | 'viewer' | 'search' | 'audit' | 'incomplete',
    options?: NavigationOptions
  ) => void;
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
  selectedDocumentId: string | null;
  setSelectedDocumentId: (id: string | null) => void;
  patients: Patient[];
  documents: DentalDocument[];
  auditLogs: AuditEntry[];
  visibleDocuments: DentalDocument[];
  alerts: ClinicalAlert[];
  addDocument: (doc: DentalDocument) => void;
  updateDocument: (id: string, updates: Partial<DentalDocument>) => void;
  deleteDocument: (id: string) => { success: boolean; reason?: string };
  resolveIncompleteDocument: (docId: string, resolutionNote: string) => void;
  uploadNewVersion: (
    docId: string,
    newVersionData: {
      title: string;
      fileType: 'PDF' | 'JPG' | 'PNG';
      fileSize: string;
      extractedText: string;
      toothNumbers: number[];
      procedureCategory: ProcedureCategory;
      tags: string[];
      changeSummary: string;
      completenessStatus?: CompletenessStatus;
    }
  ) => void;
  restoreVersion: (docId: string, targetVersionNumber: number, restoreNote: string) => void;
  addAuditLog: (
    action: AuditEntry['action'],
    targetType: AuditEntry['targetType'],
    targetId: string,
    targetTitle: string,
    details: string
  ) => void;
  resetDemoData: () => void;
  canAccessClinicalDocs: boolean;
  canUploadDocs: boolean;
  canDeleteDocs: boolean;
  canManageUsersAndAudit: boolean;
  searchFilterInitial: {
    query?: string;
    type?: DocumentType | 'ALL';
    status?: string;
  };
}

const STORAGE_KEY_DOCS = 'dentdocs_mock_documents_v1';
const STORAGE_KEY_PATIENTS = 'dentdocs_mock_patients_v1';
const STORAGE_KEY_AUDIT = 'dentdocs_mock_audit_v1';
const STORAGE_KEY_ROLE = 'dentdocs_mock_role_v1';

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE) as UserRole | null;
    return saved && STAFF_USERS[saved] ? saved : 'dentist';
  });

  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PATIENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached patients', e);
      }
    }
    return MOCK_PATIENTS;
  });

  const [documents, setDocuments] = useState<DentalDocument[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DOCS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached documents', e);
      }
    }
    return MOCK_DOCUMENTS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached audit', e);
      }
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [currentScreen, setCurrentScreen] = useState<
    'dashboard' | 'patients' | 'upload' | 'viewer' | 'search' | 'audit' | 'incomplete'
  >('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>('doc-004'); // default to minor consent for demo
  const [searchFilterInitial, setSearchFilterInitial] = useState<{
    query?: string;
    type?: DocumentType | 'ALL';
    status?: string;
  }>({});

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PATIENTS, JSON.stringify(patients));
  }, [patients]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROLE, currentUserRole);
  }, [currentUserRole]);

  const currentUser = STAFF_USERS[currentUserRole];

  // Role permissions
  // Front Desk: only billing documents and appointment records
  // Dental Assistant: can upload and view but NOT delete
  // Dentist: can view and edit clinical documents
  // Admin: full access + user management + audit log
  const canAccessClinicalDocs = currentUserRole !== 'front_desk';
  const canUploadDocs = true; // all staff can upload files
  const canDeleteDocs = currentUserRole === 'admin' || currentUserRole === 'dentist';
  const canManageUsersAndAudit = currentUserRole === 'admin';

  // Filter documents visible to the current role
  const visibleDocuments = documents.filter((doc) => {
    if (currentUserRole === 'front_desk') {
      return doc.type === 'Billing/Receipt' || doc.type === 'Appointment Record';
    }
    return true;
  });

  const switchRole = (newRole: UserRole) => {
    setCurrentUserRole(newRole);
    const user = STAFF_USERS[newRole];
    // Record login/switch audit
    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      targetType: 'SYSTEM',
      targetId: user.id,
      targetTitle: `Active Role: ${user.title}`,
      details: `Switched session view to ${user.name} (${user.title}).`,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const addAuditLog = (
    action: AuditEntry['action'],
    targetType: AuditEntry['targetType'],
    targetId: string,
    targetTitle: string,
    details: string
  ) => {
    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      targetType,
      targetId,
      targetTitle,
      details,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const addDocument = (doc: DentalDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    addAuditLog(
      'UPLOAD',
      'DOCUMENT',
      doc.id,
      doc.title,
      `Uploaded and saved "${doc.title}" for patient ${doc.patientName} (${doc.patientRecordNo}). Confidence: ${doc.confidenceScore}%.`
    );
  };

  const updateDocument = (id: string, updates: Partial<DentalDocument>) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          const updated = { ...doc, ...updates };
          return updated;
        }
        return doc;
      })
    );

    const doc = documents.find((d) => d.id === id);
    if (doc) {
      const detailsList = Object.keys(updates)
        .map((k) => `${k}: updated`)
        .join(', ');
      addAuditLog(
        'EDIT_METADATA',
        'DOCUMENT',
        id,
        doc.title,
        `Staff ${currentUser.name} updated fields [${detailsList}] on document ${id}.`
      );
    }
  };

  const deleteDocument = (id: string) => {
    if (!canDeleteDocs) {
      return {
        success: false,
        reason: 'Permission Denied: Dental Assistants and Front Desk staff cannot delete documents.',
      };
    }
    const targetDoc = documents.find((d) => d.id === id);
    if (targetDoc) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      addAuditLog(
        'EDIT_METADATA',
        'DOCUMENT',
        id,
        targetDoc.title,
        `Document permanently removed by ${currentUser.name} (${currentUser.title}).`
      );
      return { success: true };
    }
    return { success: false, reason: 'Document not found' };
  };

  const resolveIncompleteDocument = (docId: string, resolutionNote: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          return {
            ...doc,
            completenessStatus: 'complete',
            missingFields: [],
            resolvedBy: `${currentUser.name} (${currentUser.title})`,
            resolvedAt: timestamp,
            resolutionNote,
          };
        }
        return doc;
      })
    );

    const targetDoc = documents.find((d) => d.id === docId);
    const title = targetDoc ? targetDoc.title : docId;

    addAuditLog(
      'MARK_COMPLETE',
      'DOCUMENT',
      docId,
      title,
      `Completeness flag resolved by ${currentUser.name} (${currentUser.title}). Staff note: "${resolutionNote}"`
    );
  };

  const alerts = generateClinicAlerts(patients, visibleDocuments);

  const uploadNewVersion = (
    docId: string,
    newVersionData: {
      title: string;
      fileType: 'PDF' | 'JPG' | 'PNG';
      fileSize: string;
      extractedText: string;
      toothNumbers: number[];
      procedureCategory: ProcedureCategory;
      tags: string[];
      changeSummary: string;
      completenessStatus?: CompletenessStatus;
    }
  ) => {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const archivedVersion = {
            versionNumber: doc.version,
            uploadedAt: doc.uploadedAt,
            uploadedBy: doc.uploadedBy,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            title: doc.title,
            extractedText: doc.extractedText,
            toothNumbers: doc.toothNumbers,
            procedureCategory: doc.procedureCategory,
            tags: doc.tags,
            completenessStatus: doc.completenessStatus,
            status: 'superseded' as const,
            changeSummary: newVersionData.changeSummary,
            supersededAt: timestamp,
            supersededBy: currentUser.name,
          };

          const newVersionNum = doc.version + 1;

          return {
            ...doc,
            version: newVersionNum,
            versionStatus: 'active' as const,
            versionHistory: [archivedVersion, ...(doc.versionHistory || [])],
            title: newVersionData.title,
            fileType: newVersionData.fileType,
            fileSize: newVersionData.fileSize,
            extractedText: newVersionData.extractedText,
            toothNumbers: newVersionData.toothNumbers,
            procedureCategory: newVersionData.procedureCategory,
            tags: newVersionData.tags,
            completenessStatus: newVersionData.completenessStatus || 'complete',
            uploadedBy: `${currentUser.name} (${currentUser.title})`,
            uploadedAt: timestamp,
          };
        }
        return doc;
      })
    );

    const targetDoc = documents.find((d) => d.id === docId);
    const title = targetDoc ? targetDoc.title : docId;

    addAuditLog(
      'UPLOAD_VERSION',
      'DOCUMENT',
      docId,
      title,
      `Uploaded new version v${(targetDoc?.version || 1) + 1} of "${newVersionData.title}". Previous version marked Superseded. Change note: "${newVersionData.changeSummary}"`
    );
  };

  const restoreVersion = (docId: string, targetVersionNumber: number, restoreNote: string) => {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const target = doc.versionHistory?.find((v) => v.versionNumber === targetVersionNumber);
          if (!target) return doc;

          const archivedCurrent = {
            versionNumber: doc.version,
            uploadedAt: doc.uploadedAt,
            uploadedBy: doc.uploadedBy,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            title: doc.title,
            extractedText: doc.extractedText,
            toothNumbers: doc.toothNumbers,
            procedureCategory: doc.procedureCategory,
            tags: doc.tags,
            completenessStatus: doc.completenessStatus,
            status: 'superseded' as const,
            changeSummary: `Superseded by rollback to version v${targetVersionNumber}. Note: ${restoreNote}`,
            supersededAt: timestamp,
            supersededBy: currentUser.name,
          };

          const nextVersionNumber = doc.version + 1;

          return {
            ...doc,
            version: nextVersionNumber,
            versionStatus: 'active' as const,
            versionHistory: [archivedCurrent, ...(doc.versionHistory || [])],
            title: target.title,
            fileType: target.fileType,
            fileSize: target.fileSize,
            extractedText: target.extractedText,
            toothNumbers: target.toothNumbers,
            procedureCategory: target.procedureCategory,
            tags: target.tags,
            completenessStatus: target.completenessStatus,
            uploadedBy: `${currentUser.name} (${currentUser.title})`,
            uploadedAt: timestamp,
          };
        }
        return doc;
      })
    );

    const targetDoc = documents.find((d) => d.id === docId);
    const title = targetDoc ? targetDoc.title : docId;

    addAuditLog(
      'RESTORE_VERSION',
      'DOCUMENT',
      docId,
      title,
      `Restored archived version v${targetVersionNumber} as active version v${(targetDoc?.version || 1) + 1}. Staff note: "${restoreNote}"`
    );
  };

  const navigateTo = (
    screen: 'dashboard' | 'patients' | 'upload' | 'viewer' | 'search' | 'audit' | 'incomplete',
    options?: NavigationOptions
  ) => {
    if (options?.patientId) setSelectedPatientId(options.patientId);
    if (options?.documentId) setSelectedDocumentId(options.documentId);
    if (options?.searchQuery || options?.filterType || options?.filterStatus) {
      setSearchFilterInitial({
        query: options.searchQuery,
        type: options.filterType,
        status: options.filterStatus,
      });
    }
    setCurrentScreen(screen);
  };

  const resetDemoData = () => {
    setPatients(MOCK_PATIENTS);
    setDocuments(MOCK_DOCUMENTS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUserRole('dentist');
    setSelectedDocumentId('doc-004');
    setSelectedPatientId(null);
    localStorage.removeItem(STORAGE_KEY_DOCS);
    localStorage.removeItem(STORAGE_KEY_PATIENTS);
    localStorage.removeItem(STORAGE_KEY_AUDIT);
    localStorage.removeItem(STORAGE_KEY_ROLE);
  };

  return (
    <ClinicContext.Provider
      value={{
        currentUser,
        switchRole,
        currentScreen,
        navigateTo,
        selectedPatientId,
        setSelectedPatientId,
        selectedDocumentId,
        setSelectedDocumentId,
        patients,
        documents,
        auditLogs,
        visibleDocuments,
        alerts,
        addDocument,
        updateDocument,
        deleteDocument,
        resolveIncompleteDocument,
        uploadNewVersion,
        restoreVersion,
        addAuditLog,
        resetDemoData,
        canAccessClinicalDocs,
        canUploadDocs,
        canDeleteDocs,
        canManageUsersAndAudit,
        searchFilterInitial,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};
