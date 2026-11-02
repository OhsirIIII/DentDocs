import type { DentalDocument, DocumentType } from './dental';

export interface ReviewSummary {
  id: string;
  status:
    'pending' | 'in_review' | 'changes_requested' | 'approved' | 'superseded';
  reasons: string[];
  revision: number;
}
export interface ValidityState {
  status: 'unknown' | 'valid' | 'expiring' | 'expired' | 'not_applicable';
  reason: string;
  revision: number;
  basis: 'explicit' | 'rule' | 'not_applicable' | null;
  category: string;
  expiresOn: string | null;
  issuedOn: string | null;
  warningDays: number;
  daysRemaining?: number;
  ruleId: string | null;
  ruleVersion?: number;
  appointmentId: string | null;
  confirmedBy?: string;
  confirmedAt?: string;
  note?: string;
  version?: number;
  history?: ValidityState[];
}
export interface ValidityRule {
  id: string;
  documentType: DocumentType;
  category: string;
  version: number;
  validForDays: number;
  warningDays: number;
  reference: string;
  status: 'draft' | 'approved' | 'retired';
  approvedBy?: string;
  approvedAt?: string;
  approvalNote?: string;
  revision: number;
}
export interface ReviewRow extends ReviewSummary {
  documentId: string;
  version: number;
  assigneeId: string | null;
  assigneeName: string | null;
  decisionNote: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  updatedAt: string;
  document: Pick<
    DentalDocument,
    | 'title'
    | 'type'
    | 'patientName'
    | 'patientRecordNo'
    | 'confidenceScore'
    | 'completenessStatus'
    | 'revision'
  >;
}
export interface ReviewDetail extends ReviewRow {
  source: DentalDocument;
  events: {
    action: string;
    timestamp: string;
    userName: string;
    note: string;
    status: string;
  }[];
}
export interface ReviewQueue {
  items: ReviewRow[];
  reviewers: { id: string; name: string; role: string }[];
}

export const reviewReasons: Record<string, string> = {
  low_confidence: 'Low overall confidence',
  field_confidence: 'Uncertain extracted fields',
  name_mismatch: 'Patient name mismatch',
  blur: 'Blurred original',
  staff_referral: 'Staff referral',
  source_changed: 'Source changed',
};
export const reviewStatuses: Record<string, string> = {
  pending: 'Awaiting review',
  in_review: 'In review',
  changes_requested: 'Corrections requested',
  approved: 'Extraction approved',
  superseded: 'Superseded',
};
export const validityLabels: Record<ValidityState['status'], string> = {
  unknown: 'Validity unknown',
  valid: 'Valid',
  expiring: 'Expiring',
  expired: 'Expired',
  not_applicable: 'Expiry not applicable',
};
export const documentTypes: DocumentType[] = [
  'Patient Record',
  'X-ray',
  'Treatment Plan',
  'Prescription',
  'Consent Form',
  'Laboratory Report',
  'Billing/Receipt',
  'Appointment Record',
];
