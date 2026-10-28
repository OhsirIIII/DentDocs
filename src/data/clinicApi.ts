/**
 * clinicApi.ts
 *
 * Async data layer service for DentDocs.
 * Simulates network latency and asynchronous operations so that real backend
 * REST/GraphQL endpoints can seamlessly replace this module later.
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
 * Simulates a GET /api/documents/:id endpoint with realistic network latency.
 */
export async function fetchDocumentById(
  id: string,
  documents: DentalDocument[],
  delayMs = 280
): Promise<DentalDocument | null> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const doc = documents.find((d) => d.id === id) || null;
      resolve(doc);
    }, delayMs);
  });
}

/**
 * Search documents asynchronously with keyword heuristic matching and multi-factor filters.
 * Simulates a POST /api/documents/search endpoint.
 */
export async function searchDocumentsAsync(
  documents: DentalDocument[],
  query: string,
  filters: SearchFilters = {},
  delayMs = 220
): Promise<DentalDocument[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const queryLower = query.toLowerCase().trim();
      const {
        type = 'ALL',
        status = 'ALL',
        patientId = 'ALL',
        tooth = 'ALL',
        date = 'ALL',
      } = filters;

      const results = documents.filter((doc) => {
        // Soft-deleted check
        if (doc.archived) return false;

        // 1. Type filter
        if (type !== 'ALL' && doc.type !== type) return false;

        // 2. Status filter
        if (status !== 'ALL') {
          if (status === 'incomplete' && doc.completenessStatus !== 'incomplete') return false;
          if (status === 'complete' && doc.completenessStatus !== 'complete') return false;
          if (
            status === 'needs_review' &&
            doc.completenessStatus !== 'needs_review' &&
            doc.confidenceScore >= 85
          )
            return false;
        }

        // 3. Patient filter
        if (patientId !== 'ALL' && doc.patientId !== patientId) return false;

        // 4. Tooth number filter
        if (tooth !== 'ALL') {
          const toothNum = parseInt(tooth, 10);
          if (!doc.toothNumbers.includes(toothNum)) return false;
        }

        // 5. Date filter
        if (date === 'OCT_2026') {
          if (!doc.date.startsWith('2026-10')) return false;
        }

        // 6. Natural Language Query match
        if (!queryLower) return true;

        if (queryLower === 'incomplete' || queryLower === 'missing') {
          return doc.completenessStatus === 'incomplete';
        }
        if (queryLower === 'xray' || queryLower === 'radiograph' || queryLower === 'opg') {
          return doc.type === 'X-ray';
        }
        if (queryLower === 'reseta' || queryLower === 'prescription' || queryLower === 'gamot') {
          return doc.type === 'Prescription';
        }
        if (queryLower === 'billing' || queryLower === 'receipt' || queryLower === 'resibo') {
          return doc.type === 'Billing/Receipt';
        }
        if (queryLower === 'consent' || queryLower === 'pahintulot') {
          return doc.type === 'Consent Form';
        }

        const inTitle = doc.title.toLowerCase().includes(queryLower);
        const inPatient = doc.patientName.toLowerCase().includes(queryLower);
        const inRecordNo = doc.patientRecordNo.toLowerCase().includes(queryLower);
        const inText = doc.extractedText.toLowerCase().includes(queryLower);
        const inTags = doc.tags.some((t) => t.toLowerCase().includes(queryLower));
        const inTooth = doc.toothNumbers.some(
          (t) => t.toString() === queryLower.replace('tooth', '').trim()
        );

        return inTitle || inPatient || inRecordNo || inText || inTags || inTooth;
      });

      resolve(results);
    }, delayMs);
  });
}
