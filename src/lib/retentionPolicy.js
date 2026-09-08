import { logAudit } from './audit.js';

export const RETENTION_LIFECYCLE_STATUS = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
  RESTRICTED: 'RESTRICTED',
  MARKED_FOR_ANONYMIZATION: 'MARKED_FOR_ANONYMIZATION',
  MARKED_FOR_DELETION: 'MARKED_FOR_DELETION',
};

/**
 * Standard Recommended Data Retention Policies for University Residential College
 * (Subject to formal confirmation by UMS Legal / Jabatan Digital)
 */
export const DEFAULT_RETENTION_POLICIES = [
  {
    category: 'active_student_data',
    description: 'Data pelajar aktif menetap di Kolej Kediaman Tun Fuad.',
    retention_period_months: 12, // Active duration per academic session
    action_on_expiry: 'ARCHIVE',
    legal_basis: 'Penyediaan perkhidmatan kediaman universiti & keselamatan',
  },
  {
    category: 'former_resident_data',
    description: 'Data rekod bekas residen / alumni kolej.',
    retention_period_months: 60, // 5 years after graduation
    action_on_expiry: 'ANONYMIZE',
    legal_basis: 'Rekod sejarah kolej & verifikasi kelayakan alumni',
  },
  {
    category: 'attendance_data',
    description: 'Log imbasan kehadiran curfew dan acara kolej.',
    retention_period_months: 24, // 2 years
    action_on_expiry: 'ARCHIVE',
    legal_basis: 'Pengiraan merit dan audit keselamatan',
  },
  {
    category: 'leave_records',
    description: 'Rekod permohonan keluar kolej bermalam.',
    retention_period_months: 24, // 2 years
    action_on_expiry: 'ARCHIVE',
    legal_basis: 'Keselamatan residen & audit felo',
  },
  {
    category: 'disciplinary_records',
    description: 'Rekod tatatertib dan demerit kolej.',
    retention_period_months: 84, // 7 years in line with academic record policies
    action_on_expiry: 'RESTRICT',
    legal_basis: 'Kewajipan berkanun tatatertib pelajar universiti',
  },
  {
    category: 'welfare_records',
    description: 'Rekod aduan dan bantuan kebajikan khas.',
    retention_period_months: 36, // 3 years
    action_on_expiry: 'RESTRICT',
    legal_basis: 'Penyaluran bantuan kebajikan & kaunseling',
  },
  {
    category: 'audit_logs',
    description: 'Log audit keselamatan dan rekod akses sistem MyKKTF.',
    retention_period_months: 84, // 7 years
    action_on_expiry: 'ARCHIVE',
    legal_basis: 'Tadbir urus keselamatan siber & audit pematuhan',
  },
];

/**
 * Anonymize sensitive student record fields safely without deleting row relations
 */
export function anonymizeStudentRecord(student) {
  if (!student) return null;
  return {
    ...student,
    full_name: `Bekas Residen ${student.id?.slice(-4) || 'XXXX'}`,
    matric_number: `ANON-${student.matric_number?.slice(0, 3) || 'XXX'}***`,
    ic_passport: '******-**-XXXX',
    email: 'anonymized@kktf.ums.edu.my',
    phone_number: '000-0000000',
    emergency_contact_name: '[ANONYMIZED]',
    emergency_contact_phone: '[ANONYMIZED]',
    parent_name: '[ANONYMIZED]',
    parent_phone: '[ANONYMIZED]',
    address: '[ANONYMIZED]',
    medical_condition: null,
    allergies: null,
    disability_info: null,
    lifecycle_status: RETENTION_LIFECYCLE_STATUS.ARCHIVED,
  };
}
