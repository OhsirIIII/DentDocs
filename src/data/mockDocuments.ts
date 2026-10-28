import { DentalDocument } from '../types/dental';

const RAW_MOCK_DOCUMENTS: Omit<DentalDocument, 'version' | 'versionStatus' | 'versionHistory'>[] = [
  // 1. Patient Record - Complete
  {
    id: 'doc-001',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Comprehensive Initial Dental Examination Chart',
    type: 'Patient Record',
    date: '2026-10-18',
    displayDate: '18 Oct 2026',
    toothNumbers: [16, 26, 36, 46, 47],
    procedureCategory: 'Restorative',
    tags: ['Initial Exam', 'FDI Charting', 'Caries Risk Moderate', 'Adult Patient'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 97,
      toothNumbers: 95,
      procedureCategory: 96,
      tags: 97,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC
Metro Manila, Philippines | PRC Accreditation: 0000000 | TIN: 000-000-000-000
PATIENT CLINICAL RECORD & HARD TISSUE CHARTING
Patient: Juan Miguel Dela Cruz (38 M) | Record No: PT-2026-0001
Date of Examination: 18/10/2026 | Attending Dentist: Dr. Jose Paolo Reyes (PRC 0089123)

CLINICAL FINDINGS:
- Occlusal caries noted on tooth 47 (Class I). Tooth 36 with sound MOD amalgam restoration.
- Teeth 18, 28, 38 clinically missing.
- Periodontal screening score: PSR 2 in lower anteriors. Mild subgingival calculus.
Taglish Note: "Masakit daw minsan sa lower right upon cold drinks. Advised composite restoration on 47 next session."`,
    fileType: 'PDF',
    fileSize: '1.4 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-18 10:45 AM',
    reviewedBy: 'Dr. Jose Paolo Reyes',
    reviewedAt: '2026-10-18 11:15 AM',
    reviewNotes: 'Baseline charting verified. Treatment plan prepared for 47 restoration.',
  },

  // 2. X-ray - Complete
  {
    id: 'doc-002',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Digital Panoramic Radiograph (OPG)',
    type: 'X-ray',
    date: '2026-10-18',
    displayDate: 'Oct 18, 2026',
    toothNumbers: [18, 28, 38, 47, 48],
    procedureCategory: 'Oral Surgery',
    tags: ['Panoramic', 'OPG', 'Third Molar Assessment', 'Full Mouth'],
    confidenceScore: 94,
    fieldConfidence: {
      documentType: 96,
      recordNo: 98,
      date: 95,
      toothNumbers: 92,
      procedureCategory: 94,
      tags: 91,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `IMAGING UNIT: Planmeca ProMax 2D | Exposure: 68kV / 8.0mA / 14.2s
PATIENT: Dela Cruz, Juan Miguel [PT-2026-0001] | DOB: 12-Apr-1988
RAD REPORT:
- Panoramic examination demonstrates complete dentition except third molars 18, 28, 38.
- Tooth 48 impacted (Pell & Gregory Class II Position B, mesioangular).
- Tooth 47 shows radiolucency confined to occlusal enamel-dentin junction.
- Alveolar bone crest levels within normal limits.
Signed: Dr. Maria Elena Santos, Radiologist (PRC 0074512)`,
    fileType: 'JPG',
    fileSize: '4.2 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-18 11:00 AM',
    reviewedBy: 'Dr. Jose Paolo Reyes',
    reviewedAt: '2026-10-18 11:30 AM',
    radiographDetails: {
      modality: 'Panoramic',
      exposureTime: '14.2s',
      kvp: '68 kV',
      findings: 'Mesioangular impacted tooth 48; occlusal dentinal shadow on 47.',
    },
  },

  // 3. Treatment Plan - Complete
  {
    id: 'doc-003',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Restorative & Prophylaxis Phased Treatment Plan',
    type: 'Treatment Plan',
    date: '2026-10-18',
    displayDate: '2026-10-18',
    toothNumbers: [47, 48],
    procedureCategory: 'Restorative',
    tags: ['Treatment Plan', 'Cost Estimate', 'Composite', 'Surgical Extraction'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 97,
      recordNo: 99,
      date: 96,
      toothNumbers: 94,
      procedureCategory: 97,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - COMPREHENSIVE TREATMENT ESTIMATE
Record: PT-2026-0001 | Patient: Juan Miguel Dela Cruz | Date: 18 Oct 2026

Phase 1: Urgent Care & Restorative
- Tooth 47: Light-cure Composite Resin Restoration (Class I) - ₱2,500.00
- Full Mouth Ultrasonic Scaling & Polishing (Deep Prophy) - ₱1,800.00

Phase 2: Preventive & Surgical
- Tooth 48: Odontectomy / Surgical Extraction of Impacted Molar - ₱9,500.00
Estimated Total: ₱13,800.00 (HMO Co-pay eligible: ₱3,500.00)
Patient Signature: [Signed digitally 18/10/2026]
Attending Dentist: Dr. Jose Paolo Reyes (PRC 0089123)`,
    fileType: 'PDF',
    fileSize: '820 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-18 11:40 AM',
    reviewedBy: 'Dr. Jose Paolo Reyes',
    reviewedAt: '2026-10-18 11:45 AM',
  },

  // 4. Consent Form - DELIBERATELY INCOMPLETE #1 (Minor patient Chloe Lim missing guardian signature!)
  {
    id: 'doc-004',
    patientId: 'pat-006',
    patientRecordNo: 'PT-2026-0006',
    patientName: 'Chloe Danielle Lim',
    title: 'Orthodontic Diagnostic & Appliance Consent Agreement',
    type: 'Consent Form',
    date: '2026-10-24',
    displayDate: '24 Oct 2026',
    toothNumbers: [14, 24, 16, 26, 36, 46],
    procedureCategory: 'Orthodontics',
    tags: ['Consent Form', 'Minor Patient', 'Orthodontic Braces', 'Pending Signature'],
    confidenceScore: 82,
    fieldConfidence: {
      documentType: 92,
      recordNo: 95,
      date: 90,
      toothNumbers: 84,
      procedureCategory: 88,
      tags: 76,
    },
    completenessStatus: 'incomplete',
    missingFields: [
      'Legal Guardian Signature (Patient is 14 y/o minor)',
      'Guardian Government-Issued ID Number',
      'Date of Guardian Witness Signing',
    ],
    extractedText: `INFORMED CONSENT FOR ORTHODONTIC APPLIANCE THERAPY
San Nicolas Dental Clinic | Patient Record No: PT-2026-0006
Patient Name: Chloe Danielle Lim | Age: 14 | DOB: 19-Jul-2012

PROCEDURE: Comprehensive fixed orthodontic bracket placement (Upper & Lower Arch)
Risks explained: Decalcification, root resorption, gingival tenderness during adjustments.
Taglish note: "Sinabi sa nanay na kailangan ng guardian signature bago magkabit ng brackets."

PATIENT SIGNATURE: Chloe Lim (Minor)
PARENT / GUARDIAN SIGNATURE: [BLANK - MISSING SIGNATURE]
Guardian Name stated: Mrs. Teresa Lim
Guardian ID: [NOT PROVIDED]
Staff Witness: Carla Mendoza, RDA`,
    fileType: 'PDF',
    fileSize: '1.1 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-24 02:15 PM',
    isNameMismatch: false,
    reviewNotes: 'FLAGGED: Minor patient requires Mrs. Teresa Lim physical or digital signature before treatment begins.',
  },

  // 5. Billing/Receipt - Complete
  {
    id: 'doc-005',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Official Receipt - Consultation & OPG Radiograph',
    type: 'Billing/Receipt',
    date: '2026-10-18',
    displayDate: 'Oct 18, 2026',
    toothNumbers: [],
    procedureCategory: 'Billing & Administrative',
    tags: ['Official Receipt', 'BIR Registered', 'HMO HealthShield', 'Paid in Full'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 99,
      recordNo: 98,
      date: 97,
      toothNumbers: 99,
      procedureCategory: 99,
      tags: 96,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - OFFICIAL RECEIPT
BIR Authority to Print No. 2024-00129-PH | TIN: 000-000-000-000 VAT Reg.
OR No: 2026-8812 | Date: 18-Oct-2026
Received from: Juan Miguel Dela Cruz (PT-2026-0001)

Items:
1. Dental Comprehensive Examination & Charting ...... ₱800.00
2. Digital Panoramic Radiograph (OPG) ............... ₱1,500.00
Subtotal: ₱2,300.00
HMO HealthShield Coverage Approved: ₱1,500.00
Cash Patient Co-payment: ₱800.00
VAT (12% Included): ₱246.43
Cashier: Mark Vincent Bautista`,
    fileType: 'PDF',
    fileSize: '640 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-18 12:10 PM',
    amount: 2300,
    receiptNo: 'OR-2026-8812',
    hmoProvider: 'HealthShield Philippines',
  },

  // 6. Appointment Record - Complete
  {
    id: 'doc-006',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Follow-up Restorative Appointment Slip',
    type: 'Appointment Record',
    date: '2026-10-18',
    displayDate: '18 Oct 2026',
    toothNumbers: [47],
    procedureCategory: 'Restorative',
    tags: ['Appointment Slip', 'Confirmed', 'Chair 2', 'Morning Slot'],
    confidenceScore: 95,
    fieldConfidence: {
      documentType: 97,
      recordNo: 98,
      date: 96,
      toothNumbers: 94,
      procedureCategory: 95,
      tags: 92,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `APPOINTMENT CONFIRMATION SLIP
San Nicolas Dental Clinic, Unit 3A Medical Plaza, Metro Manila
Patient: Juan Miguel Dela Cruz | Record: PT-2026-0001 | Phone: +63 917 555 0114
Next Visit: Wednesday, 04 November 2026 at 10:30 AM
Reserved Operatory: Chair 2 (Dr. Jose Paolo Reyes)
Procedure: Tooth 47 Composite Restoration & Oral Prophylaxis
Notes: "Paki-advise pasyente mag-almusal bago pumunta."`,
    fileType: 'PDF',
    fileSize: '410 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-18 12:20 PM',
  },

  // 7. Prescription - DELIBERATELY INCOMPLETE #2 (Missing dentist PRC License & S2 License number)
  {
    id: 'doc-007',
    patientId: 'pat-001',
    patientRecordNo: 'PT-2026-0001',
    patientName: 'Juan Miguel Dela Cruz',
    title: 'Dental Prescription Slip - Analgesic & Antibiotic',
    type: 'Prescription',
    date: '2026-10-18',
    displayDate: '18 Oct 2026',
    toothNumbers: [47, 48],
    procedureCategory: 'Oral Surgery',
    tags: ['Prescription', 'Mefenamic Acid', 'Missing PRC License', 'Needs Review'],
    confidenceScore: 78,
    fieldConfidence: {
      documentType: 94,
      recordNo: 96,
      date: 92,
      toothNumbers: 80,
      procedureCategory: 85,
      tags: 70,
    },
    completenessStatus: 'incomplete',
    missingFields: [
      'Dentist PRC License Number (Blank on template header)',
      'Dentist PTR Number for current fiscal year',
      'Prescriber S2 Narcotics License (if tramadol/narcotic compound is indicated)',
    ],
    extractedText: `SAN NICOLAS DENTAL CLINIC - PRESCRIPTION Rx
Doctor: Dr. Jose Paolo Reyes, DDM
PRC No: [BLANK / UNREADABLE] | PTR No: [NOT STAMPED] | S2 No: [NONE]
Patient: Juan Miguel Dela Cruz | Age: 38 | Date: 18/10/2026

Rx:
1. Mefenamic Acid 500mg capsules #10
   Sig: Take 1 capsule every 8 hours after meals as needed for moderate pain.
2. Chlorhexidine Gluconate 0.12% oral rinse 250ml #1 bottle
   Sig: Swish 15ml twice daily for 30 seconds for 7 days.
Taglish note: "Note: Inom after kumain para hindi humapdi sikmura."

Dentist Signature: [Digital Scribble present, but License credentials missing]`,
    fileType: 'PNG',
    fileSize: '950 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-18 12:35 PM',
    prescriptionDetails: {
      genericName: 'Mefenamic Acid / Chlorhexidine',
      dosage: '500mg',
      frequency: 'Every 8 hours PRN',
      duration: '3 days',
      refills: 0,
      prcNo: '',
      ptrNo: '',
    },
    reviewNotes: 'FLAGGED: Pharmacy will reject without validated PRC & PTR stamps.',
  },

  // 8. Patient Record - Complete (Ella Santos)
  {
    id: 'doc-008',
    patientId: 'pat-002',
    patientRecordNo: 'PT-2026-0002',
    patientName: 'Maria Carmela Santos',
    title: 'Esthetic Anterior Smile Assessment & Shade Mapping',
    type: 'Patient Record',
    date: '2026-10-22',
    displayDate: '22 Oct 2026',
    toothNumbers: [11, 21, 12, 22],
    procedureCategory: 'Restorative',
    tags: ['Esthetic Consultation', 'Shade A2 to B1', 'Veneers Evaluation'],
    confidenceScore: 95,
    fieldConfidence: {
      documentType: 96,
      recordNo: 97,
      date: 95,
      toothNumbers: 94,
      procedureCategory: 95,
      tags: 93,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - ESTHETIC RESTORATIVE WORKUP
Patient: Maria Carmela Santos | Record: PT-2026-0002 | Date: 22-Oct-2026
Attending Dentist: Dr. Jose Paolo Reyes (PRC 0089123)

FINDINGS:
- Incisal chipping on tooth 11 and 21 from minor trauma during sports.
- Existing composite restorations on 12, 22 with marginal discoloration.
- Baseline Vita Classical shade: A2 body, A1 incisal third.
- Desired shade: B1 / Bleach shade BL3.
Recommended: 4 Porcelain Laminate Veneers (Teeth 12, 11, 21, 22).`,
    fileType: 'PDF',
    fileSize: '2.1 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-22 09:30 AM',
  },

  // 9. X-ray - Complete (Ella Santos Bitewing)
  {
    id: 'doc-009',
    patientId: 'pat-002',
    patientRecordNo: 'PT-2026-0002',
    patientName: 'Maria Carmela Santos',
    title: 'Bilateral Premolar & Molar Bitewing Radiographs',
    type: 'X-ray',
    date: '2026-10-22',
    displayDate: 'Oct 22, 2026',
    toothNumbers: [14, 15, 24, 25, 34, 35, 44, 45],
    procedureCategory: 'Preventive',
    tags: ['Bitewings', 'Interproximal Caries Check', 'Normal Bone Crest'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 97,
      recordNo: 98,
      date: 96,
      toothNumbers: 95,
      procedureCategory: 96,
      tags: 94,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `INTRAORAL RADIOLOGY REPORT
Patient: Maria Carmela Santos | Record: PT-2026-0002 | Date: 22-10-2026
Modality: 4-View Bitewing Series (Dexis Sensor, 65kV 7mA 0.16s)
Findings:
- No interproximal demineralization detected in premolar or molar contacts.
- Intact lamina dura throughout posterior sextants.
- Crown-to-root ratio favorable (1:2).`,
    fileType: 'PNG',
    fileSize: '3.1 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-22 10:15 AM',
    radiographDetails: {
      modality: 'Bitewing',
      exposureTime: '0.16s',
      kvp: '65 kV',
      findings: 'Clear interproximal contact zones. No subgingival calculus.',
    },
  },

  // 10. Laboratory Report - Complete (Ella Santos Zirconia)
  {
    id: 'doc-010',
    patientId: 'pat-002',
    patientRecordNo: 'PT-2026-0002',
    patientName: 'Maria Carmela Santos',
    title: 'Dental Laboratory Fabrication Work Order & Shade Verification',
    type: 'Laboratory Report',
    date: '2026-10-23',
    displayDate: '23 Oct 2026',
    toothNumbers: [11, 21],
    procedureCategory: 'Prosthodontics',
    tags: ['Dental Lab', 'IPS e.max CAD', 'Veneers', 'Shade B1'],
    confidenceScore: 93,
    fieldConfidence: {
      documentType: 95,
      recordNo: 96,
      date: 94,
      toothNumbers: 92,
      procedureCategory: 93,
      tags: 90,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `MANILA PRECISION DENTAL CERAMICS LAB
Work Order No: LAB-2026-4412 | Client: San Nicolas Dental Clinic
Patient: Maria Carmela Santos [PT-2026-0002]
Dentist: Dr. Jose Paolo Reyes

SPECIFICATIONS:
- 2 Units Lithium Disilicate (IPS e.max Press / CAD)
- Teeth: 11, 21 | Preparation type: Feather-edge contact prep
- Shade: B1 with subtle incisal translucency (Halo effect + mamelon anatomy)
- Margin fit checked under 10x microscope: PASS (<30 microns)
Technician: Edgardo Villanueva, Certified Dental Technologist`,
    fileType: 'PDF',
    fileSize: '1.2 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-23 04:20 PM',
  },

  // 11. Consent Form - Complete (Ella Santos)
  {
    id: 'doc-011',
    patientId: 'pat-002',
    patientRecordNo: 'PT-2026-0002',
    patientName: 'Maria Carmela Santos',
    title: 'Informed Consent for Esthetic Porcelain Restoration',
    type: 'Consent Form',
    date: '2026-10-22',
    displayDate: '22 Oct 2026',
    toothNumbers: [11, 21],
    procedureCategory: 'Restorative',
    tags: ['Consent Form', 'Veneers', 'Bilingual Tagalog-English', 'Signed'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 97,
      toothNumbers: 96,
      procedureCategory: 97,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `INFORMED CONSENT FOR COSMETIC DENTAL RESTORATION
(Pahintulot para sa Pagsasaayos at Pagpapaganda ng Ngipin)
San Nicolas Dental Clinic | Patient Record: PT-2026-0002
Patient: Maria Carmela Santos | Gov ID: PhilID 4410-9982-1234

1. Naipaliwanag ang mga hakbang sa enamel micro-reduction at bonding.
2. I acknowledge that porcelain restorations require nightguard protection for bruxism.
Signed: Maria Carmela Santos (Digital PhilID Signature Verified)
Dentist: Dr. Jose Paolo Reyes (PRC 0089123)`,
    fileType: 'PDF',
    fileSize: '890 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-22 10:45 AM',
  },

  // 12. Treatment Plan - DELIBERATELY INCOMPLETE #3 (Missing date & procedure cost breakdown for Ramon Castillo)
  {
    id: 'doc-012',
    patientId: 'pat-0010',
    patientRecordNo: 'PT-2026-0010',
    patientName: 'Ramon Castillo',
    title: 'Full-Arch Removable Partial Denture Treatment Proposal',
    type: 'Treatment Plan',
    date: '2026-10-05',
    displayDate: '[Missing Plan Date]',
    toothNumbers: [16, 17, 26, 27, 36, 46],
    procedureCategory: 'Prosthodontics',
    tags: ['Treatment Plan', 'RPD Cast Metal', 'Missing Costs', 'Incomplete'],
    confidenceScore: 71,
    fieldConfidence: {
      documentType: 88,
      recordNo: 92,
      date: 45, // Low confidence on date
      toothNumbers: 85,
      procedureCategory: 86,
      tags: 68,
    },
    completenessStatus: 'incomplete',
    missingFields: [
      'Official Formulation Date (Header timestamp missing)',
      'Line-Item Cost Breakdown (Missing laboratory & chairside fee quotes)',
      'Patient Financial Agreement Signature',
    ],
    extractedText: `SAN NICOLAS DENTAL CLINIC - PROSTHODONTIC TREATMENT PROPOSAL
Patient: Ramon Castillo | Record: PT-2026-0010
Date: [MISSING / UNDATED]

Treatment Proposal:
- Bilateral free-end saddle Kennedy Class I Maxillary and Mandibular arch.
- Recommended appliance: Cast Cobalt-Chromium Frame Partial Denture.
- Pre-prosthetic rest seat preparations needed on 15, 25, 35, 45.

Financial Summary:
Chairside Prep Fee: [BLANK]
Lab Fabrication Fee: [BLANK]
Total Estimated Investment: [NOT CALCULATED]
Notes: "Naiwan yung cost estimation sheet sa consultation room. Kausapin si Doc Paolo para sa final quote."`,
    fileType: 'PDF',
    fileSize: '980 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-05 03:15 PM',
    reviewNotes: 'FLAGGED: Cannot present to patient until line-item fees are inserted and signed.',
  },

  // 13. Patient Record - Complete (Ramon Castillo)
  {
    id: 'doc-013',
    patientId: 'pat-0010',
    patientRecordNo: 'PT-2026-0010',
    patientName: 'Ramon Castillo',
    title: 'Medical Clearance & Cardiovascular Risk Assessment',
    type: 'Patient Record',
    date: '2026-10-05',
    displayDate: '05 Oct 2026',
    toothNumbers: [],
    procedureCategory: 'Oral Surgery',
    tags: ['Medical Clearance', 'Cardiology', 'Aspirin Hold', 'Stent 2021'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 98,
      toothNumbers: 99,
      procedureCategory: 97,
      tags: 97,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `CARDIOLOGY CONSULTANTS OF METRO MANILA
Re: Medical Clearance for Dental Procedures
Patient: Ramon Castillo (58 M) | Record: PT-2026-0010 | Date: 05-10-2026

To Dr. Jose Paolo Reyes:
Mr. Castillo had drug-eluting stent placement in LAD in 2021.
Currently on Aspirin 81mg OD, Atorvastatin 20mg OD, Losartan 50mg OD.
Cardiovascular status is stable (METS > 4).
Recommendations:
- Proceed with routine dental procedures and local anesthesia with 1:100,000 epinephrine (limit to 2 carpules).
- DO NOT withhold Aspirin for routine minor extractions or impressions. Local hemostatic agents sufficient.
Signed: Dr. Roberto Alcantara, FPCC, Cardiologist (PRC 0061245)`,
    fileType: 'PDF',
    fileSize: '1.3 MB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-05 02:40 PM',
  },

  // 14. Billing/Receipt - Complete (Raffy Tan)
  {
    id: 'doc-014',
    patientId: 'pat-003',
    patientRecordNo: 'PT-2026-0003',
    patientName: 'Rafael Emilio Tan',
    title: 'Official Receipt - Endodontic Root Canal Therapy Obturation',
    type: 'Billing/Receipt',
    date: '2026-10-14',
    displayDate: '14 Oct 2026',
    toothNumbers: [36],
    procedureCategory: 'Billing & Administrative',
    tags: ['Official Receipt', 'Endodontics', 'Credit Card Payment', '₱12,000'],
    confidenceScore: 99,
    fieldConfidence: {
      documentType: 99,
      recordNo: 99,
      date: 99,
      toothNumbers: 98,
      procedureCategory: 99,
      tags: 98,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - OFFICIAL RECEIPT
TIN: 000-000-000-000 VAT Reg. | OR No: 2026-8790 | Date: 14/10/2026
Customer: Rafael Emilio Tan (PT-2026-0003)

Description:
1. Molar Endodontic Treatment (Tooth 36, 3 canals completed) ... ₱12,000.00
Payment Method: Maya Credit Card (Terminal Ref #992144)
Total Paid: ₱12,000.00
Cashier: Mark Vincent Bautista`,
    fileType: 'PDF',
    fileSize: '580 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-14 04:30 PM',
    amount: 12000,
    receiptNo: 'OR-2026-8790',
  },

  // 15. X-ray - Complete (Raffy Tan Periapical)
  {
    id: 'doc-015',
    patientId: 'pat-003',
    patientRecordNo: 'PT-2026-0003',
    patientName: 'Rafael Emilio Tan',
    title: 'Periapical Post-Obturation Radiograph Tooth 36',
    type: 'X-ray',
    date: '2026-10-14',
    displayDate: 'Oct 14, 2026',
    toothNumbers: [36],
    procedureCategory: 'Endodontics',
    tags: ['Periapical', 'Endo Obturation', 'Gutta Percha Fill', 'Tooth 36'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 97,
      toothNumbers: 98,
      procedureCategory: 98,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `DIGITAL INTRAORAL SENSOR - PERIAPICAL
Patient: Tan, Rafael Emilio [PT-2026-0003] | Date: 14-Oct-2026
Tooth: 36 (Lower Left First Molar)
Findings:
- Gutta-percha obturation extends to radiographic apex in MB, ML, and Distal canals (within 0.5mm).
- Dense homogeneous fill, no voids visible.
- Resolving apical periodontitis radiolucency. Recommended core build-up and crown within 4 weeks.
Examining Clinician: Dr. Jose Paolo Reyes (PRC 0089123)`,
    fileType: 'JPG',
    fileSize: '2.4 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-14 04:00 PM',
    radiographDetails: {
      modality: 'Periapical',
      exposureTime: '0.20s',
      kvp: '70 kV',
      findings: 'Dense gutta percha obturation to apex in all 3 canals of tooth 36.',
    },
  },

  // 16. Prescription - Complete (Raffy Tan)
  {
    id: 'doc-016',
    patientId: 'pat-003',
    patientRecordNo: 'PT-2026-0003',
    patientName: 'Rafael Emilio Tan',
    title: 'Post-Endodontic Prescription Slip',
    type: 'Prescription',
    date: '2026-10-14',
    displayDate: '14 Oct 2026',
    toothNumbers: [36],
    procedureCategory: 'Endodontics',
    tags: ['Prescription', 'Ibuprofen', 'Antibiotics Not Indicated', 'Complete'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 99,
      recordNo: 99,
      date: 98,
      toothNumbers: 98,
      procedureCategory: 98,
      tags: 97,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - RX
Doctor: Dr. Jose Paolo Reyes, DDM | PRC: 0089123 | PTR: 2026-904123 | S2: N/A
Patient: Rafael Emilio Tan | Record: PT-2026-0003 | Date: 14/10/2026

Rx:
1. Ibuprofen 400mg tablets #6
   Sig: Take 1 tablet every 6 to 8 hours with meals for mild discomfort.
2. Paracetamol 500mg tablets #6
   Sig: Alternate if needed.
Taglish note: "Paalala sa pasyente: huwag munang ngumuya ng matitigas sa kaliwa hanggang makabitan ng crown."
Signature: Dr. Jose Paolo Reyes`,
    fileType: 'PDF',
    fileSize: '710 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-14 04:45 PM',
    prescriptionDetails: {
      genericName: 'Ibuprofen',
      dosage: '400mg',
      frequency: 'Every 8 hours PRN',
      duration: '2 days',
      refills: 0,
      prcNo: 'PRC 0089123',
      ptrNo: 'PTR 2026-904123',
    },
  },

  // 17. Consent Form - Complete (Bea Aquino)
  {
    id: 'doc-017',
    patientId: 'pat-004',
    patientRecordNo: 'PT-2026-0004',
    patientName: 'Bea Sophia Aquino',
    title: 'In-Office Vital Tooth Whitening Consent Form',
    type: 'Consent Form',
    date: '2026-10-20',
    displayDate: '20 Oct 2026',
    toothNumbers: [13, 12, 11, 21, 22, 23],
    procedureCategory: 'Preventive',
    tags: ['Consent Form', 'Teeth Whitening', 'Hydrogen Peroxide 35%', 'Signed'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 98,
      date: 97,
      toothNumbers: 96,
      procedureCategory: 97,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `IN-OFFICE POWER BLEACHING CONSENT FORM
San Nicolas Dental Clinic | Patient: Bea Sophia Aquino (PT-2026-0004)
Date: 20-Oct-2026

Procedures & Risks:
- Application of 35% Hydrogen Peroxide with LED activation.
- Transient dentinal sensitivity explained (usually subsides within 24-48 hours).
- Avoidance of dark liquids (kape, tsaa, toyo, cola) for 48 hours confirmed.
Patient Signature: Bea Sophia Aquino (Verified)
Dentist: Dr. Jose Paolo Reyes (PRC 0089123)`,
    fileType: 'PDF',
    fileSize: '920 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-20 01:30 PM',
  },

  // 18. X-ray - DELIBERATELY INCOMPLETE #4 (Missing tooth notation annotation and radiologist signature for Mateo Reyes)
  {
    id: 'doc-018',
    patientId: 'pat-007',
    patientRecordNo: 'PT-2026-0007',
    patientName: 'Mateo Jose Reyes',
    title: 'Periapical Emergency Radiograph Lower Anterior Quadrant',
    type: 'X-ray',
    date: '2026-10-12',
    displayDate: '12 Oct 2026',
    toothNumbers: [], // Missing tooth annotation
    procedureCategory: 'Oral Surgery',
    tags: ['Periapical', 'Emergency Scan', 'Missing Tooth Notation', 'Needs Review'],
    confidenceScore: 68,
    fieldConfidence: {
      documentType: 92,
      recordNo: 94,
      date: 88,
      toothNumbers: 30, // Extremely low confidence
      procedureCategory: 75,
      tags: 65,
    },
    completenessStatus: 'incomplete',
    missingFields: [
      'Target FDI Tooth Number Annotation (Teeth not indexed in radiology notes)',
      'Interpreting Radiologist / Attending Dentist Verification Signature',
      'Clinical Diagnostic Impression / Radiographic Findings Summary',
    ],
    extractedText: `EMERGENCY RADIOGRAPHY SLIP - DIGITAL RAW EXPOSURE
Facility: San Nicolas Dental Clinic | Exposure Log: EXP-2026-10-99
Patient: Mateo Jose Reyes [PT-2026-0007] | Date: 12-Oct-2026
Target Teeth: [NOT SPECIFIED ON REQUISITION FORM - LOWER ANTERIOR REGION]
kVp: 65 | mA: 7 | Exposure: 0.12 sec

Findings:
[NO CLINICAL RADIOLOGIST REPORT ATTACHED - RAW IMAGE ONLY]
Taglish note: "Kinuha agad kasi sumakit bigla pagkatapos mag-basketball. Hindi pa naisulat ni Doc kung 31 or 41 ang focus."
Radiologist Signature: [MISSING]`,
    fileType: 'JPG',
    fileSize: '3.8 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-12 11:20 AM',
    isBlurryWarning: true,
    reviewNotes: 'FLAGGED: Tooth numbers must be manually assigned by dentist (probable 31/41 periapical).',
  },

  // 19. Patient Record - Complete (Mateo Reyes)
  {
    id: 'doc-019',
    patientId: 'pat-007',
    patientRecordNo: 'PT-2026-0007',
    patientName: 'Mateo Jose Reyes',
    title: 'Trauma Evaluation & Vitality Testing Record',
    type: 'Patient Record',
    date: '2026-10-12',
    displayDate: '12 Oct 2026',
    toothNumbers: [31, 41],
    procedureCategory: 'Endodontics',
    tags: ['Dental Trauma', 'Cold Vitality Test', 'Tooth Mobility Grade 1'],
    confidenceScore: 94,
    fieldConfidence: {
      documentType: 96,
      recordNo: 98,
      date: 95,
      toothNumbers: 93,
      procedureCategory: 94,
      tags: 92,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `DENTAL TRAUMA LOG SHEET
San Nicolas Dental Clinic | Patient: Mateo Jose Reyes | Record: PT-2026-0007
Date of Trauma: 12-Oct-2026 | Date of Exam: 12-Oct-2026
Chief Complaint: "Napatid sa laro, tumama ang baba sa court. Masakit ang ngipin sa harap."

EXAMINATION:
- Teeth 31 and 41 with Grade 1 mobility, tender to percussion.
- Endo-Ice cold test: Tooth 31 responds normally; Tooth 41 with delayed mild response.
- No alveolar bone fracture palpable.
- Flexible composite splint placed from 33 to 43 for 2 weeks.`,
    fileType: 'PDF',
    fileSize: '1.0 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-12 01:10 PM',
  },

  // 20. Appointment Record - Complete (Mateo Reyes Splint Removal)
  {
    id: 'doc-020',
    patientId: 'pat-007',
    patientRecordNo: 'PT-2026-0007',
    patientName: 'Mateo Jose Reyes',
    title: 'Splint Removal & Re-evaluation Appointment Slip',
    type: 'Appointment Record',
    date: '2026-10-12',
    displayDate: '12 Oct 2026',
    toothNumbers: [31, 41],
    procedureCategory: 'Endodontics',
    tags: ['Appointment Slip', 'Splint Removal', 'Vitality Recheck'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 98,
      recordNo: 98,
      date: 97,
      toothNumbers: 95,
      procedureCategory: 96,
      tags: 94,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `APPOINTMENT CARD - SAN NICOLAS DENTAL CLINIC
Patient: Mateo Jose Reyes (PT-2026-0007)
Date Scheduled: 26 October 2026 at 2:00 PM
Procedure: Flexible wire-composite splint debonding and repeat pulp vitality testing on 31, 41.`,
    fileType: 'PDF',
    fileSize: '390 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-12 01:45 PM',
  },

  // 21. Laboratory Report - Complete (Gabriel Dizon Implant Bridge)
  {
    id: 'doc-021',
    patientId: 'pat-005',
    patientRecordNo: 'PT-2026-0005',
    patientName: 'Gabriel Dizon',
    title: 'Implant Screw-Retained Crown Quality Inspection Cert',
    type: 'Laboratory Report',
    date: '2026-10-09',
    displayDate: '09 Oct 2026',
    toothNumbers: [46],
    procedureCategory: 'Prosthodontics',
    tags: ['Dental Lab', 'Implant Crown', 'Titanium Base', 'Zirconia Monolithic'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 97,
      toothNumbers: 96,
      procedureCategory: 97,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `CERAMIC MASTERS DENTAL LABORATORY PHILIPPINES
Quality Certification No: QC-2026-8910
Clinician: Dr. Jose Paolo Reyes | Clinic: San Nicolas Dental Clinic
Patient: Gabriel Dizon [PT-2026-0005]

Case Details:
- Tooth: 46 (Mandibular Right First Molar)
- Type: Screw-retained monolithic Multilayer Zirconia on Ti-base
- Implant platform: Regular 4.5mm connection
- Occlusion checked against stone cast and digital articulated model: PASS
- Torque specification: 30 Ncm
Certified by: Noel Bautista, RDT`,
    fileType: 'PDF',
    fileSize: '1.5 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-09 11:15 AM',
  },

  // 22. Treatment Plan - Complete (Gabriel Dizon)
  {
    id: 'doc-022',
    patientId: 'pat-005',
    patientRecordNo: 'PT-2026-0005',
    patientName: 'Gabriel Dizon',
    title: 'Dental Implant Restoration & Periodontal Maintenance Plan',
    type: 'Treatment Plan',
    date: '2026-10-09',
    displayDate: '09 Oct 2026',
    toothNumbers: [46, 17, 27],
    procedureCategory: 'Prosthodontics',
    tags: ['Treatment Plan', 'Implant Loading', 'Periodontal Maintenance', 'Signed'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 97,
      recordNo: 98,
      date: 96,
      toothNumbers: 94,
      procedureCategory: 96,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - TREATMENT ROADMAP
Patient: Gabriel Dizon | Record: PT-2026-0005 | Date: 09/10/2026
Procedures Scheduled:
1. Delivery and torquing of implant crown 46 (30 Ncm) + PTFE and composite access closure.
2. Quadrant 1 and Quadrant 2 subgingival debridement (Teeth 17, 27).
Estimated investment: ₱25,000.00
Patient Consent: Gabriel Dizon (Signed)
Dentist: Dr. Jose Paolo Reyes`,
    fileType: 'PDF',
    fileSize: '840 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-09 11:50 AM',
  },

  // 23. Patient Record - Complete (Gabriel Dizon)
  {
    id: 'doc-023',
    patientId: 'pat-005',
    patientRecordNo: 'PT-2026-0005',
    patientName: 'Gabriel Dizon',
    title: 'Implant Delivery & Torque Wrench Verification Sheet',
    type: 'Patient Record',
    date: '2026-10-09',
    displayDate: '09 Oct 2026',
    toothNumbers: [46],
    procedureCategory: 'Prosthodontics',
    tags: ['Implant Delivery', '30 Ncm Torque', 'Radiographic Check', 'Complete'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 99,
      recordNo: 99,
      date: 98,
      toothNumbers: 98,
      procedureCategory: 98,
      tags: 96,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `IMPLANT PROSTHESIS DELIVERY LOG
Patient: Gabriel Dizon [PT-2026-0005] | Date: 09-10-2026
Attending Dentist: Dr. Jose Paolo Reyes (PRC 0089123)

Clinical Steps Performed:
- Healing abutment removed from 46 implant site. Sulcus irrigated with chlorhexidine.
- Monolithic zirconia crown seated; verified passive fit with dental floss.
- Screw torqued to 30 Ncm using calibrated surgical torque wrench.
- Post-seating periapical radiograph confirms full seating on implant shoulder.
- Screw channel sealed with sterile Teflon tape and Filtek Universal composite.`,
    fileType: 'PDF',
    fileSize: '1.1 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-09 12:40 PM',
  },

  // 24. Billing/Receipt - DELIBERATELY INCOMPLETE #5 (Missing official receipt number & BIR TIN stamp for Gabriel Dizon)
  {
    id: 'doc-024',
    patientId: 'pat-005',
    patientRecordNo: 'PT-2026-0005',
    patientName: 'Gabriel Dizon',
    title: 'Provisional Billing Statement - Implant Final Delivery',
    type: 'Billing/Receipt',
    date: '2026-10-09',
    displayDate: '09 Oct 2026',
    toothNumbers: [46],
    procedureCategory: 'Billing & Administrative',
    tags: ['Billing Statement', 'Provisional', 'Missing OR Number', 'Needs TIN Stamp'],
    confidenceScore: 73,
    fieldConfidence: {
      documentType: 89,
      recordNo: 95,
      date: 90,
      toothNumbers: 86,
      procedureCategory: 87,
      tags: 68,
    },
    completenessStatus: 'incomplete',
    missingFields: [
      'Official Receipt (OR) Number (Printed on provisional quotation paper only)',
      'BIR Registered TIN Stamp / Cashier Validation',
      'Proof of Final Payment Settlement',
    ],
    extractedText: `SAN NICOLAS DENTAL CLINIC - STATEMENT OF ACCOUNT
[PROVISIONAL / NOT AN OFFICIAL RECEIPT]
OR Number: [MISSING - NOT ISSUED] | BIR TIN: [UNSTAMPED]
Customer: Gabriel Dizon (PT-2026-0005) | Date: 09-Oct-2026

Particulars:
- Dental Implant Final Prosthesis (Tooth 46) ... ₱25,000.00
Less Previous Deposit (Surgery stage): ₱15,000.00
Balance Due: ₱10,000.00
Payment Status: PENDING / CHEQUE FLOATING
Front Desk Note: "Cheque handed by patient to be cleared on Monday. Do not issue official receipt until deposit confirms."`,
    fileType: 'PDF',
    fileSize: '510 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-09 01:15 PM',
    amount: 10000,
    reviewNotes: 'FLAGGED: Cannot record as tax-official receipt until bank clearance and OR generation.',
  },

  // 25. Patient Record - Complete (Chloe Danielle Lim)
  {
    id: 'doc-025',
    patientId: 'pat-006',
    patientRecordNo: 'PT-2026-0006',
    patientName: 'Chloe Danielle Lim',
    title: 'Pediatric Dental History & Mixed Dentition Analysis',
    type: 'Patient Record',
    date: '2026-10-24',
    displayDate: '24 Oct 2026',
    toothNumbers: [16, 26, 36, 46, 14, 24],
    procedureCategory: 'Orthodontics',
    tags: ['Pediatric Dental', 'Mixed Dentition', 'Class II Div 1', 'Guardian Present'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 97,
      recordNo: 98,
      date: 96,
      toothNumbers: 94,
      procedureCategory: 96,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - ORTHODONTIC CEPHALOMETRIC LOG
Patient: Chloe Danielle Lim | Age: 14 | Record: PT-2026-0006 | Date: 24/10/2026
Accompanying Parent: Mrs. Teresa Lim (Mother)

CLINICAL EXAM:
- Angle Class II division 1 malocclusion with 6mm overjet, 4mm overbite.
- Moderate lower anterior crowding (Bolton discrepancy: +3.2mm).
- High caries risk due to snacking habits; pit and fissure sealants intact on 16, 26, 36, 46.
Plan: Fixed metal brackets MBT prescription 0.022 slot.`,
    fileType: 'PDF',
    fileSize: '1.6 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-24 02:00 PM',
  },

  // 26. X-ray - Complete (Chloe Lim Cephalometric)
  {
    id: 'doc-026',
    patientId: 'pat-006',
    patientRecordNo: 'PT-2026-0006',
    patientName: 'Chloe Danielle Lim',
    title: 'Lateral Cephalometric Radiograph & Tracing',
    type: 'X-ray',
    date: '2026-10-24',
    displayDate: 'Oct 24, 2026',
    toothNumbers: [11, 21, 31, 41],
    procedureCategory: 'Orthodontics',
    tags: ['Lateral Ceph', 'Steiner Analysis', 'SNA 82 SNB 77', 'ANB 5 Deg'],
    confidenceScore: 95,
    fieldConfidence: {
      documentType: 96,
      recordNo: 98,
      date: 95,
      toothNumbers: 93,
      procedureCategory: 96,
      tags: 94,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `DIGITAL CEPHALOMETRIC ANALYSIS
Patient: Chloe Danielle Lim [PT-2026-0006] | Date: 24-Oct-2026
SNA: 82.4° (Normal maxillary position)
SNB: 77.1° (Mild mandibular retrognathia)
ANB: 5.3° (Skeletal Class II relationship)
Upper Incisor to NA: 28° / 6mm (Proclined)
Doctor: Dr. Maria Elena Santos, Radiologist (PRC 0074512)`,
    fileType: 'JPG',
    fileSize: '3.9 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-24 02:30 PM',
    radiographDetails: {
      modality: 'Cephalometric',
      exposureTime: '10.5s',
      kvp: '73 kV',
      findings: 'Skeletal Class II malocclusion with retrognathic mandible and proclined upper incisors.',
    },
  },

  // 27. Prescription - Complete (Alyssa Flores)
  {
    id: 'doc-027',
    patientId: 'pat-008',
    patientRecordNo: 'PT-2026-0008',
    patientName: 'Alyssa Marie Flores',
    title: 'Post-Periodontal Scaling Antibacterial Prescription Slip',
    type: 'Prescription',
    date: '2026-10-15',
    displayDate: '15 Oct 2026',
    toothNumbers: [34, 44],
    procedureCategory: 'Periodontics',
    tags: ['Prescription', 'G6PD Safe', 'Amoxicillin', 'PRC Validated'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 99,
      recordNo: 99,
      date: 98,
      toothNumbers: 97,
      procedureCategory: 98,
      tags: 96,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - RX
Doctor: Dr. Jose Paolo Reyes | PRC: 0089123 | PTR: 2026-904123
Patient: Alyssa Marie Flores | Record: PT-2026-0008 | Date: 15/10/2026
CRITICAL MEDICAL ALERT: G6PD Deficiency (Patient cannot take sulfonamides, aspirin, or primaquine)

Rx:
1. Amoxicillin 500mg capsules #21
   Sig: Take 1 capsule every 8 hours for 7 days. Complete full course.
2. Paracetamol 500mg tablets #10 (G6PD Safe Analgesic)
   Sig: Take 1 tablet every 6 hours as needed for soreness.
Signature: Dr. Jose Paolo Reyes`,
    fileType: 'PDF',
    fileSize: '790 KB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-15 11:30 AM',
    prescriptionDetails: {
      genericName: 'Amoxicillin / Paracetamol (G6PD-Safe)',
      dosage: '500mg',
      frequency: 'Every 8 hours',
      duration: '7 days',
      refills: 0,
      prcNo: 'PRC 0089123',
      ptrNo: 'PTR 2026-904123',
    },
  },

  // 28. Appointment Record - Complete (Joshua Bautista)
  {
    id: 'doc-028',
    patientId: 'pat-009',
    patientRecordNo: 'PT-2026-0009',
    patientName: 'Joshua Bautista',
    title: 'Crown Preparation & Impression Appointment Slip',
    type: 'Appointment Record',
    date: '2026-10-11',
    displayDate: '11 Oct 2026',
    toothNumbers: [47],
    procedureCategory: 'Restorative',
    tags: ['Appointment Slip', 'Latex Allergy Protocol', 'Confirmed'],
    confidenceScore: 96,
    fieldConfidence: {
      documentType: 98,
      recordNo: 98,
      date: 97,
      toothNumbers: 95,
      procedureCategory: 96,
      tags: 94,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `APPOINTMENT SLIP - SAN NICOLAS DENTAL CLINIC
Patient: Joshua Bautista | Record: PT-2026-0009 | Date: 11-10-2026
Scheduled Date: Thursday, 05 November 2026 at 3:00 PM
Procedure: Tooth 47 Full Zirconia Crown Tooth Preparation & Digital Intraoral Scan
SPECIAL NOTICE: Non-latex nitrile gloves and non-latex rubber dam only.`,
    fileType: 'PDF',
    fileSize: '420 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-11 02:20 PM',
  },

  // 29. Billing/Receipt - Complete (Sofia Navarro)
  {
    id: 'doc-029',
    patientId: 'pat-0012',
    patientRecordNo: 'PT-2026-0012',
    patientName: 'Sofia Isabel Navarro',
    title: 'Official Receipt - Routine Prophylaxis & Fluoride Treatment',
    type: 'Billing/Receipt',
    date: '2026-10-23',
    displayDate: '23 Oct 2026',
    toothNumbers: [],
    procedureCategory: 'Billing & Administrative',
    tags: ['Official Receipt', 'PacificCare HMO', 'Oral Prophy', 'Zero Co-Pay'],
    confidenceScore: 98,
    fieldConfidence: {
      documentType: 99,
      recordNo: 98,
      date: 98,
      toothNumbers: 99,
      procedureCategory: 98,
      tags: 97,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `SAN NICOLAS DENTAL CLINIC - OFFICIAL RECEIPT
TIN: 000-000-000-000 VAT Reg. | OR No: 2026-8845 | Date: 23-Oct-2026
Customer: Sofia Isabel Navarro (PT-2026-0012)
HMO Provider: PacificCare HMO Philippines (Member ID: PC-881299-01)

Items Covered:
1. Ultrasonic Scaling & Polishing (Annual HMO Benefit) ... ₱1,500.00
2. Topical Fluoride Gel Application ..................... ₱800.00
Total Claim Amount: ₱2,300.00
Approved HMO Share: ₱2,300.00 (100% Covered)
Patient Out-of-Pocket Balance: ₱0.00
Cashier: Mark Vincent Bautista`,
    fileType: 'PDF',
    fileSize: '590 KB',
    uploadedBy: 'Mark Vincent Bautista',
    uploadedAt: '2026-10-23 03:30 PM',
    amount: 2300,
    receiptNo: 'OR-2026-8845',
    hmoProvider: 'PacificCare HMO',
  },

  // 30. Consent Form - Complete (Joaquin Perez)
  {
    id: 'doc-030',
    patientId: 'pat-0011',
    patientRecordNo: 'PT-2026-0011',
    patientName: 'Joaquin Lorenzo Perez',
    title: 'Informed Consent for Surgical Removal of Impacted Wisdom Tooth',
    type: 'Consent Form',
    date: '2026-10-17',
    displayDate: '17 Oct 2026',
    toothNumbers: [38, 48],
    procedureCategory: 'Oral Surgery',
    tags: ['Consent Form', 'Odontectomy', 'Inferior Alveolar Nerve', 'Signed'],
    confidenceScore: 97,
    fieldConfidence: {
      documentType: 98,
      recordNo: 99,
      date: 97,
      toothNumbers: 96,
      procedureCategory: 97,
      tags: 95,
    },
    completenessStatus: 'complete',
    missingFields: [],
    extractedText: `INFORMED CONSENT FOR SURGICAL ODONTECTOMY
San Nicolas Dental Clinic, Metro Manila | Patient: Joaquin Lorenzo Perez [PT-2026-0011]
Date: 17/10/2026 | Age: 22

PROCEDURE: Surgical removal of impacted lower third molars (Teeth 38, 48)
Risks discussed: Post-operative swelling, trismus (limited mouth opening), temporary altered sensation of lower lip/chin (IAN paresthesia risk < 1%).
Patient statement: "Naintindihan ko po lahat ng risks at pumapayag ako sa surgery."
Signed: Joaquin Lorenzo Perez (Patient)
Surgeon: Dr. Jose Paolo Reyes (PRC 0089123)`,
    fileType: 'PDF',
    fileSize: '1.2 MB',
    uploadedBy: 'Carla Mendoza, RDA',
    uploadedAt: '2026-10-17 01:10 PM',
  },
];

export const MOCK_DOCUMENTS: DentalDocument[] = RAW_MOCK_DOCUMENTS.map((doc) => {
  // Give doc-001 an existing superseded version 1 for instant demo
  if (doc.id === 'doc-001') {
    return {
      ...doc,
      version: 2,
      versionStatus: 'active',
      versionHistory: [
        {
          versionNumber: 1,
          uploadedAt: '2026-10-18 09:30 AM',
          uploadedBy: 'Carla Mendoza, RDA',
          fileType: 'PDF',
          fileSize: '1.2 MB',
          title: 'Comprehensive Initial Dental Examination Chart (Preliminary Draft)',
          extractedText: `SAN NICOLAS DENTAL CLINIC\nPRELIMINARY INTAKE RECORD\nPatient: Juan Miguel Dela Cruz (PT-2026-0001)\nDate of Examination: 18/10/2026\nTooth 47 occlusal caries. PSR scores and third molar impactions not yet fully annotated.`,
          toothNumbers: [47],
          procedureCategory: 'Restorative',
          tags: ['Initial Exam', 'Draft Intake'],
          completenessStatus: 'incomplete',
          status: 'superseded',
          changeSummary: 'Updated with full FDI dental charting, periodontal screening PSR indices, and Dr. Reyes verification sign-off.',
          supersededAt: '2026-10-18 10:45 AM',
          supersededBy: 'Dr. Jose Paolo Reyes',
        },
      ],
    };
  }

  // Give doc-008 an existing superseded version
  if (doc.id === 'doc-008') {
    return {
      ...doc,
      version: 2,
      versionStatus: 'active',
      versionHistory: [
        {
          versionNumber: 1,
          uploadedAt: '2026-10-22 08:45 AM',
          uploadedBy: 'Carla Mendoza, RDA',
          fileType: 'PDF',
          fileSize: '1.9 MB',
          title: 'Esthetic Anterior Smile Assessment & Shade Mapping (Initial Scan)',
          extractedText: `SAN NICOLAS DENTAL CLINIC - ESTHETIC RESTORATIVE WORKUP\nPatient: Maria Carmela Santos (PT-2026-0002)\nBaseline Vita shade: A3 body. Chipping on incisal edges 11, 21.`,
          toothNumbers: [11, 21],
          procedureCategory: 'Restorative',
          tags: ['Esthetic Consultation', 'Shade A3'],
          completenessStatus: 'needs_review',
          status: 'superseded',
          changeSummary: 'Refined shade mapping to Vita A2 body and B1 target bleach shade after cosmetic photography review.',
          supersededAt: '2026-10-22 09:30 AM',
          supersededBy: 'Dr. Jose Paolo Reyes',
        },
      ],
    };
  }

  return {
    ...doc,
    version: 1,
    versionStatus: 'active',
    versionHistory: [],
  };
});

// Helper to calculate initial dashboard stats
export const getInitialClinicStats = (docs: DentalDocument[]) => {
  const incompleteCount = docs.filter((d) => d.completenessStatus === 'incomplete').length;
  const reviewCount = docs.filter((d) => d.completenessStatus === 'needs_review' || d.confidenceScore < 85).length;
  const totalCount = docs.length;

  return {
    incompleteCount,
    reviewCount,
    totalCount,
  };
};
