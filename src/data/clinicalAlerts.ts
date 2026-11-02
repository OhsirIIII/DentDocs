import { Patient, DentalDocument, ClinicalAlert } from '../types/dental';

export const generateClinicAlerts = (
  patients: Patient[],
  documents: DentalDocument[],
): ClinicalAlert[] => {
  const alerts: ClinicalAlert[] = [];

  // Rule 1: Scheduled procedure but missing or incomplete signed consent form
  patients.forEach((patient) => {
    if (patient.nextAppointment) {
      // Find patient's consent forms
      const consentForms = documents.filter(
        (d) => d.patientId === patient.id && d.type === 'Consent Form',
      );

      const hasCompleteConsent = consentForms.some(
        (c) =>
          c.completenessStatus === 'complete' &&
          ['valid', 'expiring'].includes(c.validity?.status || '') &&
          documents.some(
            (a) =>
              a.id === c.validity?.appointmentId &&
              a.patientId === patient.id &&
              a.type === 'Appointment Record',
          ),
      );

      // Check minor patient Chloe Lim
      if (patient.isMinor) {
        const minorConsent = consentForms.find(
          (c) => c.completenessStatus === 'incomplete',
        );
        if (minorConsent || !hasCompleteConsent) {
          alerts.push({
            id: `alert-consent-${patient.id}`,
            patientId: patient.id,
            patientRecordNo: patient.recordNo,
            patientName: patient.fullName,
            type: 'MISSING_CONSENT',
            severity: 'critical',
            title: `Missing Legal Guardian Consent for Minor (${patient.fullName})`,
            description: `Consent scope and guardian details have not been verified for the scheduled appointment on ${patient.nextAppointment}. Staff must review the original.`,
            scheduledDate: patient.nextAppointment,
            linkedDocId: minorConsent?.id,
            actionLabel: 'Verify Guardian Signature',
          });
        }
      }

      // Check adult patients scheduled for invasive procedures without complete consent
      if (!patient.isMinor && !hasCompleteConsent) {
        // Find appointment record to check procedure
        const apptDoc = documents.find(
          (d) => d.patientId === patient.id && d.type === 'Appointment Record',
        );

        if (
          apptDoc &&
          (apptDoc.procedureCategory === 'Oral Surgery' ||
            apptDoc.title.includes('Surgery') ||
            apptDoc.title.includes('Implant'))
        ) {
          alerts.push({
            id: `alert-consent-${patient.id}`,
            patientId: patient.id,
            patientRecordNo: patient.recordNo,
            patientName: patient.fullName,
            type: 'MISSING_CONSENT',
            severity: 'critical',
            title: `Procedure Scheduled with No Signed Surgical Consent (${patient.fullName})`,
            description: `The scheduled procedure on ${patient.nextAppointment} does not have a complete consent record with verified validity and appointment scope. Staff must review.`,
            scheduledProcedure: apptDoc.title,
            scheduledDate: patient.nextAppointment,
            linkedDocId: apptDoc.id,
            actionLabel: 'Review Appointment Consent',
          });
        }
      }
    }
  });

  // Rule 3: Unsigned or Incomplete Treatment Plan with Upcoming Appointment
  // Ramon Castillo Treatment Plan doc-012
  const incompletePlans = documents.filter(
    (d) => d.type === 'Treatment Plan' && d.completenessStatus === 'incomplete',
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
        description: `Treatment plan "${plan.title}" requires staff completeness verification: ${plan.missingFields.join(', ') || 'review the original'}.`,
        scheduledProcedure: plan.procedureCategory,
        scheduledDate: patient.nextAppointment,
        linkedDocId: plan.id,
        actionLabel: 'Complete Treatment Plan',
      });
    }
  });

  // Rule 4: Prescriptions Missing License Credentials (e.g. Juan Miguel Dela Cruz doc-007)
  const invalidRxs = documents.filter(
    (d) => d.type === 'Prescription' && d.completenessStatus === 'incomplete',
  );

  invalidRxs.forEach((rx) => {
    alerts.push({
      id: `alert-rx-${rx.id}`,
      patientId: rx.patientId,
      patientRecordNo: rx.patientRecordNo,
      patientName: rx.patientName,
      type: 'MISSING_PRESCRIPTION_CREDENTIALS',
      severity: 'warning',
      title: `Prescription Missing PRC License / PTR Stamp (${rx.patientName})`,
      description: `Prescription "${rx.title}" is marked incomplete. Staff must verify the recorded credential fields against the original.`,
      linkedDocId: rx.id,
      actionLabel: 'Add License Stamp',
    });
  });

  // Rule 5: Emergency X-ray Lacking Tooth Annotation (Mateo Reyes doc-018)
  const incompleteXrays = documents.filter(
    (d) => d.type === 'X-ray' && d.completenessStatus === 'incomplete',
  );

  incompleteXrays.forEach((xray) => {
    alerts.push({
      id: `alert-xray-${xray.id}`,
      patientId: xray.patientId,
      patientRecordNo: xray.patientRecordNo,
      patientName: xray.patientName,
      type: 'MISSING_TOOTH_ANNOTATION',
      severity: 'info',
      title: `Emergency Radiograph Missing Tooth Indexing (${xray.patientName})`,
      description: `Radiograph "${xray.title}" is marked incomplete. Staff must verify tooth annotations against the original.`,
      linkedDocId: xray.id,
      actionLabel: 'Annotate Tooth Numbers',
    });
  });

  return alerts;
};
