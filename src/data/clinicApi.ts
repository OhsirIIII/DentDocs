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

export interface SimulatedOcrResult {
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
  delayMs = 220
): Promise<DentalDocument[]> {
  const results = await request<DentalDocument[]>('/documents/search', { method: 'POST', body: JSON.stringify({ query, filters }) });
  const visibleIds = new Set(documents.map(d => d.id));
  return results.filter(d => visibleIds.has(d.id));
}
