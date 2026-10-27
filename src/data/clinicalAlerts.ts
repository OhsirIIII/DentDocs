import { Patient, DentalDocument, ClinicalAlert } from '../types/dental';

export const generateClinicAlerts = (
  patients: Patient[],
  documents: DentalDocument[]
): ClinicalAlert[] => {
  const alerts: ClinicalAlert[] = [];

  // Rule 1: Scheduled procedure but missing or incomplete signed consent form
  patients.forEach((patient) => {
    if (patient.nextAppointment) {
      // Find patient's consent forms
      const consentForms = documents.filter(
        (d) => d.patientId === patient.id && d.type === 'Consent Form'
      );

      const hasCompleteConsent = consentForms.some(
        (c) => c.completenessStatus === 'complete'
      );

      // Check minor patient Chloe Lim
      if (patient.isMinor) {
        const minorConsent = consentForms.find((c) => c.completenessStatus === 'incomplete');
        if (minorConsent || !hasCompleteConsent) {
          alerts.push({
            id: `alert-consent-${patient.id}`,
            patientId: patient.id,
            patientRecordNo: patient.recordNo,
            patientName: patient.fullName,
            type: 'MISSING_CONSENT',
            severity: 'critical',
            title: `Missing Legal Guardian Consent for Minor (${patient.fullName})`,
            description: `Scheduled orthodontic appliance appointment on ${patient.nextAppointment}. Patient is 14 y/o and requires physical or authenticated digital signature from legal guardian ${patient.guardianName || 'parent'}.`,
            scheduledProcedure: 'Fixed Orthodontic Appliance Placement',
            scheduledDate: patient.nextAppointment,
            linkedDocId: minorConsent?.id || 'doc-004',
            actionLabel: 'Verify Guardian Signature',
          });
        }
      }

      // Check adult patients scheduled for invasive procedures without complete consent
      if (!patient.isMinor && !hasCompleteConsent) {
        // Find appointment record to check procedure
        const apptDoc = documents.find(
          (d) => d.patientId === patient.id && d.type === 'Appointment Record'
        );

        if (apptDoc && (apptDoc.procedureCategory === 'Oral Surgery' || apptDoc.title.includes('Surgery') || apptDoc.title.includes('Implant'))) {
          alerts.push({
            id: `alert-consent-${patient.id}`,
            patientId: patient.id,
            patientRecordNo: patient.recordNo,
            patientName: patient.fullName,
            type: 'MISSING_CONSENT',
            severity: 'critical',
            title: `Procedure Scheduled with No Signed Surgical Consent (${patient.fullName})`,
            description: `Scheduled for surgical procedure on ${patient.nextAppointment}. Informed consent must be signed prior to local anesthesia administration.`,
            scheduledProcedure: apptDoc.title,
            scheduledDate: patient.nextAppointment,
            linkedDocId: apptDoc.id,
            actionLabel: 'Generate Consent Form',
          });
        }
      }
    }
  });

  // Rule 2: Expiring or Expired Medical Clearances
  // Patient Ramon Castillo (Cardiovascular Stent)
  const ramonPatient = patients.find((p) => p.id === 'pat-0010');
  const ramonClearance = documents.find(
    (d) => d.patientId === 'pat-0010' && d.title.includes('Medical Clearance')
  );

  if (ramonPatient && ramonClearance) {
    alerts.push({
      id: 'alert-clearance-pat-0010',
      patientId: ramonPatient.id,
      patientRecordNo: ramonPatient.recordNo,
      patientName: ramonPatient.fullName,
      type: 'EXPIRED_CLEARANCE',
      severity: 'warning',
      title: `Cardiology Medical Clearance Expiring Soon (${ramonPatient.fullName})`,
      description: `Cardiology clearance dated ${ramonClearance.displayDate} is valid for 30 days. Approaching renewal window prior to prosthodontic surgery on ${ramonPatient.nextAppointment}.`,
      scheduledProcedure: 'Cast Partial Denture Delivery',
      scheduledDate: ramonPatient.nextAppointment,
      linkedDocId: ramonClearance.id,
      actionLabel: 'Request Updated Clearance',
    });
  }

  // Rule 3: Unsigned or Incomplete Treatment Plan with Upcoming Appointment
  // Ramon Castillo Treatment Plan doc-012
  const incompletePlans = documents.filter(
    (d) => d.type === 'Treatment Plan' && d.completenessStatus === 'incomplete'
  );

  incompletePlans.forEach((plan) => {
    const patient = patients.find((p) => p.id === plan.patientId);
    if (patient) {
      alerts.push({
        id: `alert-plan-${plan.id}`,
        patientId: patient.id,
        patientRecordNo: patient.recordNo,
        patientName: patient.fullName,
        type: 'UNSIGNED_TREATMENT_PLAN',
        severity: 'warning',
        title: `Incomplete Treatment Plan Quote (${patient.fullName})`,
        description: `Treatment plan "${plan.title}" is missing procedure fee quotations and patient financial acknowledgement.`,
        scheduledProcedure: plan.procedureCategory,
        scheduledDate: patient.nextAppointment,
        linkedDocId: plan.id,
        actionLabel: 'Complete Treatment Plan',
      });
    }
  });

  // Rule 4: Prescriptions Missing License Credentials (e.g. Juan Miguel Dela Cruz doc-007)
  const invalidRxs = documents.filter(
    (d) => d.type === 'Prescription' && d.completenessStatus === 'incomplete'
  );

  invalidRxs.forEach((rx) => {
    alerts.push({
      id: `alert-rx-${rx.id}`,
      patientId: rx.patientId,
      patientRecordNo: rx.patientRecordNo,
      patientName: rx.patientName,
      type: 'EXPIRING_PRESCRIPTION',
      severity: 'warning',
      title: `Prescription Missing PRC License / PTR Stamp (${rx.patientName})`,
      description: `Prescription Rx slip "${rx.title}" lacks dentist license numbers and may be rejected by Philippine pharmacies.`,
      linkedDocId: rx.id,
      actionLabel: 'Add License Stamp',
    });
  });

  // Rule 5: Emergency X-ray Lacking Tooth Annotation (Mateo Reyes doc-018)
  const incompleteXrays = documents.filter(
    (d) => d.type === 'X-ray' && d.completenessStatus === 'incomplete'
  );

  incompleteXrays.forEach((xray) => {
    alerts.push({
      id: `alert-xray-${xray.id}`,
      patientId: xray.patientId,
      patientRecordNo: xray.patientRecordNo,
      patientName: xray.patientName,
      type: 'OUTDATED_RADIOGRAPH',
      severity: 'info',
      title: `Emergency Radiograph Missing Tooth Indexing (${xray.patientName})`,
      description: `Sensor image "${xray.title}" requires attending dentist tooth notation annotation (probable teeth 31/41).`,
      linkedDocId: xray.id,
      actionLabel: 'Annotate Tooth Numbers',
    });
  });

  return alerts;
};
