import { DocumentType, DocumentTypeRequirement, DentalDocument, CompletenessStatus } from '../types/dental';

export const DOCUMENT_REQUIREMENTS: Record<DocumentType, DocumentTypeRequirement> = {
  'Consent Form': {
    type: 'Consent Form',
    complianceNote: 'Republic Act 10173 (Data Privacy) & Philippine Dental Association Medico-Legal Standard',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Full Name & Record Number',
        description: 'Verified match against clinic registration database',
        criticalForCompliance: true,
      },
      {
        key: 'procedure_name',
        label: 'Procedure Name & Clinical Scope',
        description: 'Clear statement of proposed dental surgery or treatment',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Execution Date & Timestamp',
        description: 'Signed prior to administration of local anesthesia or surgery',
        criticalForCompliance: true,
      },
      {
        key: 'patient_signature',
        label: 'Patient Signature (or Legal Guardian for Minors)',
        description: 'Physical or authenticated digital consent signature',
        criticalForCompliance: true,
      },
      {
        key: 'dentist_signature',
        label: 'Attending Dentist Signature',
        description: 'Sign-off verifying clinical discussion and risk explanation',
        criticalForCompliance: true,
      },
      {
        key: 'witness',
        label: 'Staff Witness Verification',
        description: 'Registered Dental Assistant (RDA) or clinic coordinator witness',
        criticalForCompliance: false,
      },
    ],
  },

  'Prescription': {
    type: 'Prescription',
    complianceNote: 'Generics Act of 1988 (RA 6675) & Philippine Food and Drug Administration (FDA) Regulations',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Full Name & Age/DOB',
        description: 'Required for weight and age-appropriate dosing check',
        criticalForCompliance: true,
      },
      {
        key: 'generic_name',
        label: 'Generic Drug Name & Strength',
        description: 'Generic name in full accordance with RA 6675',
        criticalForCompliance: true,
      },
      {
        key: 'sig_instructions',
        label: 'Dosage, Frequency & Duration (Sig)',
        description: 'Unambiguous intake instructions and treatment duration',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Prescription Date',
        description: 'Valid for standard pharmacy dispensation window',
        criticalForCompliance: true,
      },
      {
        key: 'dentist_signature',
        label: 'Prescribing Dentist Signature',
        description: 'Original ink or verified biometric electronic signature',
        criticalForCompliance: true,
      },
      {
        key: 'prc_license',
        label: 'Dentist PRC License Number',
        description: 'Professional Regulation Commission license number',
        criticalForCompliance: true,
      },
      {
        key: 'ptr_number',
        label: 'Current Year PTR Number',
        description: 'Professional Tax Receipt number from local LGU',
        criticalForCompliance: true,
      },
    ],
  },

  'X-ray': {
    type: 'X-ray',
    complianceNote: 'Philippine Radiation Protection Guidelines & Clinical Radiology Documentation Standard',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Name & Record ID',
        description: 'Embedded in DICOM or digital sensor header',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Exposure Date & Timestamp',
        description: 'Accurate chronological sequencing for treatment tracking',
        criticalForCompliance: true,
      },
      {
        key: 'modality',
        label: 'Radiographic Modality',
        description: 'OPG, Bitewing, Periapical, or Cephalometric specification',
        criticalForCompliance: true,
      },
      {
        key: 'tooth_numbers',
        label: 'Target FDI Tooth Number(s) Annotation',
        description: 'Indexed teeth in FDI two-digit standard (11-48)',
        criticalForCompliance: true,
      },
      {
        key: 'findings',
        label: 'Diagnostic Findings / Radiologist Impression',
        description: 'Written interpretation of bone levels, caries, or impactions',
        criticalForCompliance: true,
      },
      {
        key: 'radiologist_signature',
        label: 'Interpreting Clinician / Radiologist Verification',
        description: 'Sign-off confirming radiographic clearance',
        criticalForCompliance: true,
      },
    ],
  },

  'Treatment Plan': {
    type: 'Treatment Plan',
    complianceNote: 'Philippine Dental Association Ethics Code (Informed Financial & Clinical Consent)',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Name & Record Number',
        description: 'Account holder record linkage',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Plan Formulation Date',
        description: 'Date estimate was calculated and presented',
        criticalForCompliance: true,
      },
      {
        key: 'procedure_list',
        label: 'Phased Clinical Procedures & FDI Teeth',
        description: 'Step-by-step sequencing of planned restorative or surgical work',
        criticalForCompliance: true,
      },
      {
        key: 'cost_breakdown',
        label: 'Itemized Fee & Philippine Peso (₱) Breakdown',
        description: 'Explicit chairside and laboratory fee quotations',
        criticalForCompliance: true,
      },
      {
        key: 'dentist_signature',
        label: 'Formulating Dentist Signature',
        description: 'Clinical author sign-off',
        criticalForCompliance: true,
      },
      {
        key: 'patient_acknowledgement',
        label: 'Patient Financial Acknowledgement',
        description: 'Signed approval of treatment scope and estimated investment',
        criticalForCompliance: true,
      },
    ],
  },

  'Billing/Receipt': {
    type: 'Billing/Receipt',
    complianceNote: 'Bureau of Internal Revenue (BIR) Revenue Regulations & Invoicing Requirements',
    requiredFields: [
      {
        key: 'receipt_number',
        label: 'Official Receipt (OR) Number',
        description: 'Pre-printed or system-generated serialized OR number',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Date of Issuance',
        description: 'Transaction date matching bank/cash register ledger',
        criticalForCompliance: true,
      },
      {
        key: 'patient_name',
        label: 'Registered Customer / Patient Name',
        description: 'Full name on official receipt header',
        criticalForCompliance: true,
      },
      {
        key: 'itemized_services',
        label: 'Particulars & Fee Breakdown',
        description: 'Itemized description of professional dental services rendered',
        criticalForCompliance: true,
      },
      {
        key: 'vat_breakdown',
        label: 'Total Amount & 12% VAT Computation',
        description: 'Clear statement of VATable, VAT-exempt, or total ₱ settlement',
        criticalForCompliance: true,
      },
      {
        key: 'tin_cashier',
        label: 'BIR Registered TIN & Cashier Validation',
        description: 'Official tax registration number and issuing staff signature',
        criticalForCompliance: true,
      },
    ],
  },

  'Patient Record': {
    type: 'Patient Record',
    complianceNote: 'PRC Board of Dentistry Standards of Clinical Record-Keeping',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Full Name & Record Number',
        description: 'Primary identifier linking to hard tissue charting',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Clinical Examination Date',
        description: 'Date findings were recorded',
        criticalForCompliance: true,
      },
      {
        key: 'fdi_charting',
        label: 'FDI Dental Hard-Tissue Charting',
        description: 'Recorded caries, missing teeth, and existing restorations',
        criticalForCompliance: true,
      },
      {
        key: 'medical_history',
        label: 'Medical History & Drug Allergy Screening',
        description: 'Systemic diseases, hypertension, and allergy review',
        criticalForCompliance: true,
      },
      {
        key: 'dentist_signature',
        label: 'Examining Dentist Signature & PRC License',
        description: 'Clinical sign-off on examination accuracy',
        criticalForCompliance: true,
      },
    ],
  },

  'Laboratory Report': {
    type: 'Laboratory Report',
    complianceNote: 'Dental Prosthetic Traceability & Quality Assurance Standards',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Name & Clinic Case Number',
        description: 'Prescription work order linkage',
        criticalForCompliance: true,
      },
      {
        key: 'date',
        label: 'Fabrication / Quality Check Date',
        description: 'Date prosthesis passed inspection',
        criticalForCompliance: true,
      },
      {
        key: 'specifications',
        label: 'Prosthetic Material & FDI Tooth Mapping',
        description: 'Material specs (e.g. Monolithic Zirconia, e.max, Cast Metal)',
        criticalForCompliance: true,
      },
      {
        key: 'shade_guide',
        label: 'Shade Guide Match Verification',
        description: 'Vita Classical or 3D Master shade verification',
        criticalForCompliance: false,
      },
      {
        key: 'technician_seal',
        label: 'Certified Dental Technician (CDT) Seal',
        description: 'Laboratory technician quality assurance certification',
        criticalForCompliance: true,
      },
    ],
  },

  'Appointment Record': {
    type: 'Appointment Record',
    complianceNote: 'Clinic Scheduling & Operatory Management Protocols',
    requiredFields: [
      {
        key: 'patient_name',
        label: 'Patient Name & Contact Mobile',
        description: 'Primary patient and SMS reminder number',
        criticalForCompliance: true,
      },
      {
        key: 'date_time',
        label: 'Scheduled Date & Appointment Time',
        description: 'Confirmed time slot',
        criticalForCompliance: true,
      },
      {
        key: 'procedure',
        label: 'Planned Dental Procedure',
        description: 'Restorative, prophylaxis, surgery, or ortho adjustment',
        criticalForCompliance: true,
      },
      {
        key: 'operatory_chair',
        label: 'Operatory / Dental Chair Assignment',
        description: 'Reserved operatory unit',
        criticalForCompliance: false,
      },
      {
        key: 'attending_staff',
        label: 'Assigned Dentist or Clinical Staff',
        description: 'Provider scheduled for visit',
        criticalForCompliance: true,
      },
    ],
  },
};

// Evaluates checklist for a document based on its type requirements and known missing fields
export const evaluateDocumentChecklist = (doc: DentalDocument) => {
  const req = DOCUMENT_REQUIREMENTS[doc.type] || DOCUMENT_REQUIREMENTS['Patient Record'];
  const missingLower = (doc.missingFields || []).map((m) => m.toLowerCase());

  const checklist = req.requiredFields.map((field) => {
    // Check if any missing item text matches field key or label keywords
    const isMissing = missingLower.some(
      (m) =>
        m.includes(field.key.replace('_', ' ')) ||
        m.includes(field.label.toLowerCase()) ||
        (field.key === 'patient_signature' && (m.includes('guardian') || m.includes('signature'))) ||
        (field.key === 'prc_license' && m.includes('prc')) ||
        (field.key === 'ptr_number' && m.includes('ptr')) ||
        (field.key === 'cost_breakdown' && (m.includes('cost') || m.includes('fee'))) ||
        (field.key === 'date' && m.includes('date')) ||
        (field.key === 'receipt_number' && m.includes('or')) ||
        (field.key === 'tin_cashier' && m.includes('tin')) ||
        (field.key === 'tooth_numbers' && (m.includes('tooth') || m.includes('notation')))
    );

    return {
      field,
      found: !isMissing,
    };
  });

  const foundCount = checklist.filter((c) => c.found).length;
  const totalCount = checklist.length;
  const allFound = foundCount === totalCount;

  return {
    requirement: req,
    checklist,
    foundCount,
    totalCount,
    completenessPercentage: Math.round((foundCount / totalCount) * 100),
    isComplete: allFound && doc.completenessStatus === 'complete',
  };
};
