import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type {
  AuditEntry,
  DentalDocument,
  DocumentType,
  UserRole,
} from '../types/dental';
import {
  request,
  clearCredentials,
  type AuthState,
  type Bootstrap,
} from '../data/apiClient';
import { generateClinicAlerts } from '../data/clinicalAlerts';

type Screen =
  | 'dashboard'
  | 'patients'
  | 'upload'
  | 'viewer'
  | 'search'
  | 'audit'
  | 'incomplete'
  | 'users';
interface NavigationOptions {
  patientId?: string;
  documentId?: string;
  searchQuery?: string;
  filterType?: DocumentType | 'ALL';
  filterStatus?: string;
}
type RevisionInput = Pick<
  DentalDocument,
  | 'title'
  | 'fileType'
  | 'fileSize'
  | 'extractedText'
  | 'toothNumbers'
  | 'procedureCategory'
  | 'tags'
> & {
  changeSummary: string;
  completenessStatus?: DentalDocument['completenessStatus'];
  fileId?: string;
};

function useClinicState() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<Bootstrap | null>(null);
  const latest = useRef(data);
  const authGeneration = useRef(0);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [pending, setPending] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(null);
  const role = auth?.user.role || 'front_desk';
  const [uploadPatientId, setUploadPatientId] = useState<string | null>(null);
  const [searchFilterInitial, setSearchFilterInitial] = useState<{
    query?: string;
    type?: DocumentType | 'ALL';
    status?: string;
  }>({});
  const queue = useRef(Promise.resolve());
  const parts = location.pathname
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const currentScreen: Screen =
    parts[0] === 'documents'
      ? 'viewer'
      : parts[0] === 'admin'
        ? parts[1] === 'users'
          ? 'users'
          : 'audit'
        : ((parts[0] || 'dashboard') as Screen);
  const selectedPatientId =
    parts[0] === 'patients' ? parts[1] || null : uploadPatientId;
  const selectedDocumentId = parts[0] === 'documents' ? parts[1] || null : null;
  async function reload() {
    const generation = authGeneration.current;
    const snapshot = await request<Bootstrap>('/bootstrap');
    if (generation !== authGeneration.current) return;
    latest.current = snapshot;
    setData(snapshot);
  }
  function clearAuth() {
    authGeneration.current += 1;
    clearCredentials();
    setAuth(null);
    setData(null);
    latest.current = null;
  }
  async function acceptAuth(next: AuthState) {
    setAuth(next);
    if (!next.user.mustChangePassword && next.privacyAcknowledged)
      await reload();
  }
  useEffect(() => {
    const generation = authGeneration.current;
    request<AuthState>('/auth/me')
      .then((next) => {
        if (generation === authGeneration.current) return acceptAuth(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    window.addEventListener('dentdocs:unauthorized', clearAuth);
    return () => window.removeEventListener('dentdocs:unauthorized', clearAuth);
  }, []);
  useEffect(() => {
    if (!auth) return;
    const timer = window.setInterval(() => {
      const generation = authGeneration.current;
      request<AuthState>('/auth/me')
        .then((next) => {
          if (generation === authGeneration.current) setAuth(next);
        })
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [auth?.user.id]);
  async function login(email: string, password: string) {
    clearAuth();
    setApiError('');
    await acceptAuth(
      await request<AuthState>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    );
  }
  async function logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      clearAuth();
    }
  }
  async function changePassword(currentPassword: string, newPassword: string) {
    await acceptAuth(
      await request<AuthState>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    );
  }
  async function acknowledgePrivacy() {
    try {
      await request('/privacy-acknowledgements', {
        method: 'POST',
        body: JSON.stringify({ noticeVersion: auth?.noticeVersion }),
      });
      await acceptAuth(await request<AuthState>('/auth/me'));
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : 'Unable to save acknowledgement',
      );
      throw error;
    }
  }
  useEffect(() => {
    const onRejected = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setApiError(
        event.reason instanceof Error
          ? event.reason.message
          : 'The operation failed. Please retry.',
      );
    };
    window.addEventListener('unhandledrejection', onRejected);
    return () => window.removeEventListener('unhandledrejection', onRejected);
  }, []);
  function mutate<T>(operation: () => Promise<T>): Promise<T> {
    const task = queue.current.then(async () => {
      setPending(true);
      setApiError('');
      try {
        const result = await operation();
        await reload();
        return result;
      } catch (error) {
        setApiError(
          error instanceof Error ? error.message : 'Unable to save changes',
        );
        await reload().catch(() => {});
        throw error;
      } finally {
        setPending(false);
      }
    });
    queue.current = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  function change(
    id: string,
    operation: string,
    extra: Record<string, unknown> = {},
    method = 'POST',
  ) {
    return mutate(async () => {
      const doc = latest.current?.documents.find((d) => d.id === id);
      if (!doc) throw new Error('Document not found. Reload the page.');
      return request<DentalDocument>(
        `/documents/${encodeURIComponent(id)}${operation}`,
        {
          method,
          body: JSON.stringify({ expectedRevision: doc.revision, ...extra }),
        },
      );
    });
  }
  function navigateTo(screen: Screen, options: NavigationOptions = {}) {
    if (options.patientId) setUploadPatientId(options.patientId);
    if (screen === 'search')
      setSearchFilterInitial({
        query: options.searchQuery,
        type: options.filterType,
        status: options.filterStatus,
      });
    const path =
      screen === 'viewer'
        ? `/documents/${encodeURIComponent(options.documentId || selectedDocumentId || '')}`
        : screen === 'patients'
          ? `/patients${options.patientId ? `/${encodeURIComponent(options.patientId)}` : ''}`
          : screen === 'users'
            ? '/admin/users'
            : screen === 'audit'
              ? '/admin/audit'
              : `/${screen}`;
    navigate(path);
  }
  const documents = data?.documents || [];
  const patients = data?.patients || [];
  const visibleDocuments = useMemo(
    () =>
      documents.filter(
        (d) =>
          !d.archived &&
          (role !== 'front_desk' ||
            ['Billing/Receipt', 'Appointment Record'].includes(d.type)),
      ),
    [documents, role],
  );
  const archiveDocument = async (id: string) => {
    await change(id, '/archive');
    return { success: true };
  };
  const restoreArchivedDocument = async (id: string) => {
    await change(id, '/restore-archive');
    return { success: true };
  };
  return {
    auth,
    login,
    logout,
    changePassword,
    acknowledgePrivacy,
    data,
    loading,
    apiError,
    pending,
    reload,
    clearApiError: () => setApiError(''),
    // DataBoundary mounts all user-facing views only after bootstrap succeeds.
    currentUser: auth?.user!,
    currentScreen,
    selectedPatientId,
    selectedDocumentId,
    setSelectedPatientId: (id: string | null) => {
      setUploadPatientId(id);
      if (parts[0] === 'patients')
        navigate(`/patients${id ? `/${encodeURIComponent(id)}` : ''}`);
    },
    setSelectedDocumentId: (_id: string | null) => {},
    navigateTo,
    patients,
    documents,
    visibleDocuments,
    archivedDocuments:
      role === 'admin' ? documents.filter((d) => d.archived) : [],
    auditLogs: data?.auditLogs || [],
    alerts:
      role === 'front_desk'
        ? []
        : generateClinicAlerts(patients, visibleDocuments),
    canAccessClinicalDocs: role !== 'front_desk',
    canUploadDocs: true,
    canDeleteDocs: role === 'admin',
    canManageUsersAndAudit: role === 'admin',
    searchFilterInitial,
    addDocument: (document: DentalDocument) =>
      mutate(() =>
        request<DentalDocument>('/documents', {
          method: 'POST',
          body: JSON.stringify({ document, fileId: document.fileId }),
        }),
      ),
    updateDocument: (id: string, updates: Partial<DentalDocument>) =>
      change(id, '', { updates }, 'PATCH'),
    archiveDocument,
    deleteDocument: archiveDocument,
    restoreArchivedDocument,
    resolveIncompleteDocument: (id: string, note: string) =>
      change(id, '/completeness-resolution', { note }),
    uploadNewVersion: (id: string, input: RevisionInput) => {
      const { changeSummary, fileId, ...updates } = input;
      return change(id, '/versions', { note: changeSummary, fileId, updates });
    },
    restoreVersion: (id: string, version: number, note: string) =>
      change(id, `/versions/${version}/restore`, { note }),
  };
}
const ClinicContext = createContext<ReturnType<typeof useClinicState> | null>(
  null,
);
export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useClinicState();
  return (
    <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>
  );
};
export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic requires ClinicProvider');
  return context;
}
