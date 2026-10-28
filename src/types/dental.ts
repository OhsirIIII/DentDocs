export type UserRole = 'admin' | 'dentist' | 'assistant' | 'front_desk';

export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  license?: string;
  email: string;
  avatarInitials: string;
}

export type DocumentType =
  | 'Patient Record'
  | 'X-ray'
  | 'Treatment Plan'
  | 'Prescription'
  | 'Consent Form'
  | 'Laboratory Report'
  | 'Billing/Receipt'
  | 'Appointment Record';

export type ProcedureCategory =
  | 'Restorative'
  | 'Endodontics'
  | 'Oral Surgery'
  | 'Orthodontics'
  | 'Prosthodontics'
  | 'Periodontics'
  | 'Preventive'
  | 'Billing & Administrative';

export type CompletenessStatus = 'complete' | 'incomplete' | 'needs_review';

export interface Patient {
  id: string;
  recordNo: string; // format PT-2026-0001
  fullName: string;
  preferredName?: string;
  gender: 'Male' | 'Female';
  dob: string;
  age: number;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  medicalAlerts: string[];
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  lastVisit: string;
  nextAppointment?: string;
  fdiTreatedTeeth: number[];
  fdiMissingTeeth: number[];
  fdiWatchTeeth: number[];
}

export interface FieldConfidence {
  documentType: number;
  recordNo: number;
  date: number;
  toothNumbers: number;
  procedureCategory: number;
  tags: number;
}

export interface RadiographDetails {
  modality: 'Panoramic' | 'Periapical' | 'Bitewing' | 'Cephalometric';
  exposureTime?: string;
  kvp?: string;
  findings?: string;
}

export interface PrescriptionDetails {
  genericName: string;
  brandName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  refills: number;
  prcNo: string;
  ptrNo: string;
  s2No?: string;
}

export interface DentalDocument {
  id: string;
  patientId: string;
  patientRecordNo: string;
  patientName: string;
  title: string;
  type: DocumentType;
  date: string; // YYYY-MM-DD
  displayDate: string;
  toothNumbers: number[]; // FDI 11-48
  procedureCategory: ProcedureCategory;
  tags: string[];
  confidenceScore: number; // 0 - 100
  fieldConfidence: FieldConfidence;
  completenessStatus: CompletenessStatus;
  missingFields: string[];
  extractedText: string;
  fileType: 'PDF' | 'JPG' | 'PNG';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  amount?: number;
  receiptNo?: string;
  hmoProvider?: string;
  isBlurryWarning?: boolean;
  isNameMismatch?: boolean;
  reviewNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  version: number;
  versionStatus: 'active' | 'superseded';
  versionHistory: DocumentVersion[];
  radiographDetails?: RadiographDetails;
  prescriptionDetails?: PrescriptionDetails;
  // Soft-delete (archive) fields
  archived?: boolean;
  archivedBy?: string;
  archivedAt?: string;
}

export interface DocumentVersion {
  versionNumber: number;
  uploadedAt: string;
  uploadedBy: string;
  fileType: 'PDF' | 'JPG' | 'PNG';
  fileSize: string;
  title: string;
  extractedText: string;
  toothNumbers: number[];
  procedureCategory: ProcedureCategory;
  tags: string[];
  completenessStatus: CompletenessStatus;
  status: 'active' | 'superseded';
  changeSummary: string;
  supersededAt?: string;
  supersededBy?: string;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertType =
  | 'MISSING_CONSENT'
  | 'EXPIRED_CLEARANCE'
  | 'EXPIRING_PRESCRIPTION'
  | 'OUTDATED_RADIOGRAPH'
  | 'UNSIGNED_TREATMENT_PLAN';

export interface ClinicalAlert {
  id: string;
  patientId: string;
  patientRecordNo: string;
  patientName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  scheduledProcedure?: string;
  scheduledDate?: string;
  linkedDocId?: string;
  actionLabel: string;
}

export interface RequiredFieldDef {
  key: string;
  label: string;
  description: string;
  criticalForCompliance: boolean;
}

export interface DocumentTypeRequirement {
  type: DocumentType;
  requiredFields: RequiredFieldDef[];
  complianceNote: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action:
    | 'UPLOAD'
    | 'UPLOAD_VERSION'
    | 'RESTORE_VERSION'
    | 'EDIT_METADATA'
    | 'MARK_COMPLETE'
    | 'SEND_TO_REVIEW'
    | 'FLAG_INCOMPLETE'
    | 'VIEW_DOCUMENT'
    | 'USER_LOGIN'
    | 'ARCHIVE'
    | 'RESTORE_ARCHIVE'
    | 'PRIVACY_ACK';
  targetType: 'DOCUMENT' | 'PATIENT' | 'SYSTEM';
  targetId: string;
  targetTitle: string;
  details: string;
}

export type UploadStage =
  | 'IDLE'
  | 'SCANNING_TEXT'
  | 'DETECTING_TYPE'
  | 'EXTRACTING_DATA'
  | 'CHECKING_COMPLETENESS'
  | 'REVIEW_READY';
