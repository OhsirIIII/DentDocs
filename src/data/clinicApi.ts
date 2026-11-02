import { request } from './apiClient';
/**
 * clinicApi.ts
 *
 * Async data layer service for DentDocs.
 * Calls the Phase 2 REST API. Legacy array/delay parameters remain temporarily
 * for compatibility with existing view components.
 */

import { DentalDocument, DocumentType, ProcedureCategory, CompletenessStatus, Patient } from '../types/dental';

export interface SearchFilters {
  type?: DocumentType | 'ALL';
  status?: string;
  patientId?: string;
  tooth?: string;
  date?: string;
}

export interface LocalOcrResult {
  handwritingDraft?: boolean;
  title: string;
  type: DocumentType;
  patientId: string;
  patientRecordNo: string;
  patientName: string;
  date: string;
  displayDate: string;
  toothNumbers: number[];
  procedureCategory: ProcedureCategory;
  tags: string[];
  confidenceScore: number;
  fieldConfidence: {
    documentType: number;
    recordNo: number;
    date: number;
    toothNumbers: number;
    procedureCategory: number;
    tags: number;
  };
  completenessStatus: CompletenessStatus;
  missingFields: string[];
  extractedText: string;
  fileType: 'PDF' | 'JPG' | 'PNG';
  fileSize: string;
  isBlurryWarning?: boolean;
  isNameMismatch?: boolean;
  mismatchedDetectedName?: string;
  extraction?: import('../types/dental').ExtractionProvenance;
}

/**
 * Fetch a single document asynchronously by ID.
 * Calls GET /api/documents/:id.
 */
export async function fetchDocumentById(
  id: string,
  documents: DentalDocument[],
  delayMs = 280
): Promise<DentalDocument | null> {
  return request<DentalDocument>(`/documents/${encodeURIComponent(id)}`);
}

/**
 * Search documents asynchronously with keyword heuristic matching and multi-factor filters.
 * Calls POST /api/documents/search; Phase 2 keeps keyword matching on the server.
 */
export async function searchDocumentsAsync(
  documents: DentalDocument[],
  query: string,
  filters: SearchFilters = {},
  mode: 'hybrid' | 'semantic' | 'keyword' = 'hybrid'
): Promise<{ results: DentalDocument[]; modeUsed: string; notice: string | null }> {
  const response = await request<{ results: DentalDocument[]; modeUsed: string; notice: string | null }>('/search', { method: 'POST', body: JSON.stringify({ query, filters, mode }) });
  const visibleIds = new Set(documents.map(d => d.id));
  return { ...response, results: response.results.filter(d => visibleIds.has(d.id)) };
}
