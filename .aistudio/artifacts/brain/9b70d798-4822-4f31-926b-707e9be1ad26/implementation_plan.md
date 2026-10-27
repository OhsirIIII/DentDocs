# DentDocs: Philippine Dental Clinic Document Management System

DentDocs is a specialized, clinical document management system designed for a modern dental clinic in the Philippines. It streamlines patient record handling, dental radiographs, treatment plans, prescriptions, laboratory reports, consent forms, and official receipts with simulated OCR extraction and role-based governance.

> [!IMPORTANT]
> **Confirmed Decisions from Clarification**:
> - **Role-Based Access Control (RBAC)**: Active role enforcement for Admin, Dentist, Dental Assistant, and Front Desk. Front Desk is restricted to billing and appointment records; Dental Assistants cannot delete; Dentists have full clinical edit access; Admin manages system logs and user access. Restricted routes and features present clear "Access Restricted" clinical notices.
> - **Philippine Clinic Localization**: Fictionalized realistic Filipino patients, Philippine Peso (₱) billing, FDI two-digit tooth notation (e.g., 11-48), PRC license placeholders (`PRC 0000000`), PhilHealth/HMO tags, and authentic Taglish clinical progress notes. Five documents are deliberately incomplete (missing signatures, dates, or licenses) to test validation workflows.
> - **Guided Transparent Document Ingestion**: 4-second multi-stage simulated processing (`Scanning text` → `Detecting document type` → `Extracting tooth numbers & dates` → `Checking completeness`). Features field confidence meters, amber alerts for low confidence (<85%), staff-verified completeness checklist, and edge-case warnings for scan blur and name mismatches.

---

## 1. Overview & Core Concept

- **What It Does**: DentDocs provides dental staff with an intuitive, calming clinical interface to organize, inspect, search, and upload clinical dental records. Staff can view interactive visual document previews side-by-side with extracted metadata, edit FDI tooth annotations and tags, track incomplete charts, and perform natural-language queries.
- **Target Audience & Personas**:
  - **Dr. Jose Paolo Reyes (Dentist)**: Reviews high-res radiographs, signs treatment plans, edits clinical diagnostic notes and FDI tooth numbers.
  - **Carla Mendoza, RDA (Dental Assistant)**: Drops scanned documents, verifies extracted tooth numbers and dates, flags missing consent signatures.
  - **Mark Vincent Bautista (Front Desk)**: Handles official receipts, billing statements, HMO approvals, and appointment slips; blocked from sensitive radiographs.
  - **Dr. Maria Elena Santos (Admin / Clinic Director)**: Oversees clinic audit logs, document completeness rates, and staff permissions.
- **Key Value**: Eliminates lost paper records, prevents unbilled or unsigned treatments, and accelerates document retrieval through natural dental search queries.

---

## 2. User Experience & Visual Design

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Calming, clinical, high-trust healthcare aesthetic inspired by modern Philippine medical centers (St. Luke's / Makati Med standard).
  - *Palette*: Dominant crisp white and soft surgical slate (`#F8FAFC`, `#F1F5F9`), deep surgical teal primary (`#0F766E` / `#115E59`), serene cyan secondary (`#06B6D4`), and muted slate typography (`#0F172A`, `#475569`).
  - *State Colors*: Emerald (`#059669`) for complete/verified, Amber (`#D97706`) for missing fields/needs review, and Rose (`#E11D48`) for incomplete/access restricted.
  - *Typography*: Clean, legible sans (`Plus Jakarta Sans` / `DM Sans`) for interfaces, paired with strict tabular numerals (`tabular-nums font-mono`) for FDI tooth numbers, dates, peso currency (`₱`), and PRC numbers.
- **Key User Flows**:
  1. **Demo Role Switching**: Header role switcher allowing immediate live testing of permissions between Admin, Dentist, Assistant, and Front Desk.
  2. **Dashboard Overview**: Metrics bar for flagged incomplete docs (5), pending reviews, total documents (30), and active patients (12), followed by a split view of the Urgent Attention Queue and Recently Uploaded Documents.
  3. **Patient Directory & Dental Profile**: Searchable directory with quick badges for alerts (e.g., Penicillin allergy, Minor/Guardian required), linking directly to patient document vaults with FDI interactive dental charting overview.
  4. **Guided Upload & Extraction Flow**:
     - *Patient Selection & Drag-and-Drop*: Supports PDF, JPG, PNG with filename auto-detection.
     - *Simulated Processing Modal*: 3.5s progress animation through 4 discrete stages.
     - *Review Screen*: Split-screen comparison (document preview on left, field-by-field confidence and completeness verification on right). Includes blur detection warning and patient mismatch safeguards.
  5. **Side-by-Side Document Viewer**: High-fidelity clinical preview (radiographs with inverted contrast filter, official receipts with VAT stamps, prescription Rx slips) alongside editable FDI tags, metadata, and history.
  6. **Natural Language Search & Filtering**: Multi-condition search accepting queries like `"incomplete consent forms"`, `"tooth 46 x-ray"`, or `"receipt over 5000"`, with instant pill-free faceted filters.

---

## 3. Key Product Decisions & Trade-Offs

- **Simulated In-Browser OCR & Processing**:
  - *Chosen Approach*: Client-side deterministic OCR simulator that inspects uploaded file names, sample image types, and patient context, generating realistic extracted text, confidence scores, and completeness checklists without external API latency or privacy leaks.
  - *Why*: Provides an instant, reliable, zero-configuration evaluation experience with consistent testable edge cases.
- **Comprehensive In-Memory State with Persistence**:
  - *Chosen Approach*: Reactive local state initialized with 12 Philippine patients and 30 rich dental documents, persisted to `localStorage` so uploads and tag edits survive page reloads, with a 1-click "Reset Demo Data" option.
  - *Why*: Allows the user to create new documents, modify tags, resolve missing fields, and immediately see stats update without complex server setup.
- **Strict Role-Based Routing & Graceful Fallback**:
  - *Chosen Approach*: Active role guard that checks screen access. If Front Desk navigates to clinical patient records or radiographs, an informative "Access Restricted" state explains the clinic compliance policy and provides a 1-click button to view authorized billing records.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DentDocs Client Application                     │
├────────────────────────────────────────────────────────────────────────┤
│  Top Bar: Clinic Brand · Navigation Links · Role Selector & Profile    │
├───────────────┬────────────────────────────────────────────────────────┤
│ Navigation    │ Active View Controller                                 │
│               ├────────────────────────────────────────────────────────┤
│ - Dashboard   │ [1] Dashboard: Metrics, Incomplete Queue, Recent Docs  │
│ - Patients    │ [2] Patient Directory & Detail Vault (FDI Chart)       │
│ - Upload Flow │ [3] 5-Step Ingestion Pipeline with OCR Simulation      │
│ - Doc Viewer  │ [4] Dual-Pane Viewer (Document Preview + Metadata Edits│
│ - Search      │ [5] Natural Language Search & Faceted Filter Engine    │
│ - Audit Log   │ [6] Clinic Compliance & Activity Log (Admin Only)      │
├───────────────┴────────────────────────────────────────────────────────┤
│ Data Layer: `clinicStore` (12 Patients, 30 Documents, Audit Logs)       │
│ LocalStorage Synced · FDI Tooth Matrix · Completeness Checker Engine   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Entities & Schema
- **Patient**: `id`, `recordNo` (`PT-2026-0001` format), `fullName`, `gender`, `dob`, `age`, `phone` (`+63 917 ...`), `address`, `emergencyContact`, `medicalAlerts`, `isMinor`, `guardianName`.
- **Document**:
  - `id`, `patientRecordNo`, `patientId`, `patientName`
  - `title`, `type` (`Patient Record`, `X-ray`, `Treatment Plan`, `Prescription`, `Consent Form`, `Laboratory Report`, `Billing/Receipt`, `Appointment Record`)
  - `date` (ISO normalized), `displayDate` (Philippine format / Taglish context)
  - `toothNumbers` (Array of FDI numbers: e.g. `[16, 26, 36, 46]`)
  - `procedureCategory` (Restorative, Endodontics, Oral Surgery, Orthodontics, Prosthodontics, Periodontics, Preventive, Billing)
  - `tags` (Array of clinical and administrative keywords)
  - `confidenceScore` (0–100%) and `fieldConfidence` (`{ type, date, toothNumbers, patient, procedure }`)
  - `completenessStatus` (`complete`, `incomplete`, `needs_review`)
  - `missingFields` (Array of specific missing requirements, e.g. `"Dentist PRC License"`, `"Guardian Signature"`)
  - `extractedText` (Simulated OCR text content including Philippine clinic headers, doctor notes, and Taglish remarks)
  - `previewType` (`radiograph`, `prescription`, `consent`, `receipt`, `lab_report`, `chart`)
  - `amount` (Optional ₱ figure for billing)
  - `isBlurryWarning`, `isNameMismatch` flags for edge-case simulation.
- **AuditEntry**: `id`, `timestamp`, `userRole`, `userName`, `action`, `documentTitle`, `details`.

---

## 5. Implementation Steps

1. **Foundation & Mock Data Assets**:
   - Create typed Philippine dental clinic datasets (`12 patients`, `30 documents` with 5 deliberate incompletes, FDI tooth chart specifications, and initial audit logs).
   - Configure local state store with `localStorage` fallback and reset actions.
2. **Global Navigation & Role Gate System**:
   - Implement clean top bar complying with top bar contract (Brand, single-line links, interactive Role Switcher).
   - Implement RBAC permission wrapper and "Access Restricted" clinical notice screen.
3. **Dashboard View**:
   - KPI metrics (Flagged Incomplete, Needing Review, Total Documents, Active Patients).
   - Incomplete documents urgent triage queue with direct 1-click review triggers.
   - Recently uploaded documents list with status pills replaced by clean typography.
4. **Patient Vault & Clinical Profile**:
   - Searchable patient directory with instant lookup by name or `PT-2026-XXXX`.
   - Comprehensive patient profile featuring personal details, medical alerts, FDI dental tooth map overview, and filtered document timeline.
5. **Guided Ingestion & OCR Processing Pipeline**:
   - Drag-and-drop zone with file type validation and filename heuristic detection.
   - Animated 4-stage processing simulator with step timers (Scanning → Detecting → Extracting → Checking).
   - Side-by-side Review & Verification screen with field confidence indicators, low-confidence amber badges, completeness checklist ("AI suggestion, staff must verify"), blur warnings, and patient mismatch alerts.
   - Save & Audit commit logic.
6. **Dual-Pane Document Viewer**:
   - Left pane: Rich document visual rendering (radiograph dark-mode canvas, official prescription slip, bilingual consent form, official receipt with Philippine TIN).
   - Right pane: Metadata editor (inline tag management, type switcher, tooth numbers editor, completeness checklist toggle, audit history).
7. **Natural Language Search & Faceted Engine**:
   - Unified search bar parsing procedural, clinical, tooth, and financial terms.
   - Faceted dropdown filters for Document Type, Patient, Date Range, and Completeness Status.
8. **Admin Audit & Compliance Log**:
   - Detailed chronological audit trail with filter by user and action type.
