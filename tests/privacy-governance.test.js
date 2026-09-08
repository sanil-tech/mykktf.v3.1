/**
 * Comprehensive Automated Security & Privacy Test Suite for MyKKTF v3.1
 * Phase 2.1 Forensic Remediation: RBAC Boundaries, IDOR/BOLA, Scoping, RLS Schema Enforcement,
 * Audit Integrity, Export & File Protections, Real Schema Masking.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { ROLES } from '../src/lib/roles.js';
import {
  hasPermission,
  PERMISSIONS,
  canViewStudentBasicProfile,
  canViewSensitiveProfile,
  canViewDisciplinaryRecord,
  canViewWelfareRecord,
  canExportStudentData,
  canViewAuditLog,
  canAccessMedicalData,
  canManageRoom,
  canApproveLeave,
  canManageIncidents,
  canRequestDataCorrection,
  canApproveDataCorrection,
  canPerformDataRetention,
} from '../src/lib/permissions.js';
import {
  maskIC,
  maskPhone,
  maskEmail,
  sanitizeStudentData,
  sanitizeStudentList,
} from '../src/lib/dataMasking.js';
import { secureExportData } from '../src/lib/exportControl.js';
import {
  verifyResourceOwnership,
  verifyStudentAccess,
  verifyLeaveAccess,
  verifyComplaintAccess,
  verifyDisciplineAccess,
  verifyAuditLogAccess,
  verifyDocumentAccess,
  filterAllowedFields,
  sanitizeInputString,
} from '../src/lib/securityGuards.js';
import { validateUploadFile, generateSafeFilename, logFileDownload } from '../src/lib/fileSecurity.js';
import { validatePasswordStrength, isAccountLocked, recordFailedLogin, resetFailedLogin } from '../src/lib/authHardening.js';
import { anonymizeStudentRecord, DEFAULT_RETENTION_POLICIES } from '../src/lib/retentionPolicy.js';
import { OFFICIAL_PRIVACY_NOTICE, CURRENT_PRIVACY_NOTICE_VERSION } from '../src/lib/privacyNotice.js';
import { INCIDENT_STATUS, RISK_LEVELS } from '../src/lib/dataIncidents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const entitiesDir = path.resolve(__dirname, '../base44/entities');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function parseJsonc(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Strip single-line and multi-line comments
  const cleanJson = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim();
  return JSON.parse(cleanJson);
}

async function runTests() {
  console.log('\n========================================================================');
  console.log('🔒 MYKKTF v3.1 PHASE 2.1 FORENSIC SECURITY & PRIVACY AUDIT TEST SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // TEST GROUP 1: ROLE-BOUNDARY MATRIX & CAPABILITY ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Role-Boundary Matrix & Scope Enforcement ---');
  
  // 1.1 SYSTEM_ADMIN capabilities
  assert(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.VIEW_AUDIT_LOG) === true, 'SYSTEM_ADMIN can view security audit logs');
  assert(hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.MANAGE_USERS) === true, 'SYSTEM_ADMIN can manage system users');

  // 1.2 PENGETUA capabilities
  assert(hasPermission(ROLES.PRINCIPAL, PERMISSIONS.VIEW_MEDICAL_DATA) === true, 'PENGETUA can access medical notes for student health/safety');
  assert(hasPermission(ROLES.PRINCIPAL, PERMISSIONS.VIEW_DISCIPLINARY) === true, 'PENGETUA can review disciplinary hearings');
  assert(hasPermission(ROLES.PRINCIPAL, PERMISSIONS.MANAGE_USERS) === false, 'PENGETUA technical user management is separated (Least Privilege)');

  // 1.3 PENGURUSAN_ADMIN capabilities
  assert(hasPermission(ROLES.ADMIN, PERMISSIONS.MANAGE_ROOM) === true, 'PENGURUSAN_ADMIN can manage room assignments');
  assert(hasPermission(ROLES.ADMIN, PERMISSIONS.VIEW_AUDIT_LOG) === false, 'PENGURUSAN_ADMIN cannot view system security audit logs');

  // 1.4 FELO (Warden) capabilities
  assert(hasPermission(ROLES.WARDEN, PERMISSIONS.APPROVE_LEAVE) === true, 'FELO can approve student leave applications');
  assert(hasPermission(ROLES.WARDEN, PERMISSIONS.VIEW_WELFARE) === true, 'FELO can view block welfare records');
  assert(hasPermission(ROLES.WARDEN, PERMISSIONS.EXPORT_STUDENT_DATA) === false, 'FELO cannot perform bulk student exports');

  // 1.5 STAFF capabilities
  assert(hasPermission(ROLES.STAFF, PERMISSIONS.CHECK_IN_OUT) === true, 'STAFF can manage operational check-in/out');
  assert(hasPermission(ROLES.STAFF, PERMISSIONS.VIEW_DISCIPLINARY) === false, 'STAFF cannot access disciplinary hearings');
  assert(hasPermission(ROLES.STAFF, PERMISSIONS.VIEW_WELFARE) === false, 'STAFF cannot access confidential welfare logs');
  assert(hasPermission(ROLES.STAFF, PERMISSIONS.MANAGE_USERS) === false, 'STAFF cannot manage system user accounts');

  // 1.6 JAKMAS capabilities (Strict Least-Privilege)
  assert(canViewDisciplinaryRecord(ROLES.JAKMAS) === false, 'JAKMAS CANNOT access disciplinary records');
  assert(canViewWelfareRecord(ROLES.JAKMAS) === false, 'JAKMAS CANNOT access confidential welfare records');
  assert(canViewSensitiveProfile(ROLES.JAKMAS) === false, 'JAKMAS CANNOT access unmasked sensitive profiles');
  assert(canExportStudentData(ROLES.JAKMAS) === false, 'JAKMAS CANNOT perform bulk exports of student data');
  assert(canViewAuditLog(ROLES.JAKMAS) === false, 'JAKMAS CANNOT view security audit logs');

  // 1.7 PELAJAR capabilities
  assert(canRequestDataCorrection(ROLES.STUDENT) === true, 'PELAJAR can submit data correction requests');
  assert(canApproveDataCorrection(ROLES.STUDENT) === false, 'PELAJAR cannot approve data corrections');
  assert(canExportStudentData(ROLES.STUDENT) === false, 'PELAJAR cannot perform bulk exports');

  // -------------------------------------------------------------------------
  // TEST GROUP 2: FELO BLOCK-SCOPED ACCESS CONTROL
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Felo Block-Scoped Boundary Verification ---');
  const feloA = { id: 'usr_felo_a', role: ROLES.WARDEN, email: 'felo.a@ums.edu.my' };
  const feloABlocks = ['Block A', 'Block C'];

  const studentInBlockA = { id: 's_001', student_id: 'BA22110001', full_name: 'Ahmad bin Ali', block_name: 'Block A' };
  const studentInBlockB = { id: 's_002', student_id: 'BA22110002', full_name: 'Chong Wei Ming', block_name: 'Block B' };
  const studentInBlockC = { id: 's_003', student_id: 'BA22110003', full_name: 'Dayang Nurul', block_name: 'Block C' };

  const accessBlockA = verifyStudentAccess(feloA, studentInBlockA, feloABlocks);
  const accessBlockB = verifyStudentAccess(feloA, studentInBlockB, feloABlocks);
  const accessBlockC = verifyStudentAccess(feloA, studentInBlockC, feloABlocks);

  assert(accessBlockA.allowed === true && accessBlockA.scope === 'ASSIGNED_BLOCK', 'FELO A can access Student in Block A (Assigned)');
  assert(accessBlockC.allowed === true && accessBlockC.scope === 'ASSIGNED_BLOCK', 'FELO A can access Student in Block C (Assigned)');
  assert(accessBlockB.allowed === false, 'FELO A is BLOCKED from accessing Student in Block B (Unassigned Scope)');

  // -------------------------------------------------------------------------
  // TEST GROUP 3: BROKEN OBJECT-LEVEL AUTHORIZATION (BOLA / IDOR)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: IDOR & Object-Level Authorization ---');
  const studentUser1 = { id: 'usr_stu_1', student_id: 'BI22110101', role: ROLES.STUDENT, email: 'student1@ums.edu.my' };
  const studentUser2 = { id: 'usr_stu_2', student_id: 'BI22110102', role: ROLES.STUDENT, email: 'student2@ums.edu.my' };

  // 3.1 Student profile IDOR
  assert(verifyStudentAccess(studentUser1, studentInBlockA).allowed === false, "Student 1 CANNOT access Student in Block A's private profile");
  assert(verifyStudentAccess(studentUser1, { id: 'usr_stu_1', student_id: 'BI22110101' }).allowed === true, 'Student 1 can access own profile');

  // 3.2 Leave Application IDOR
  const leaveApplication1 = { id: 'leave_101', student_id: 'usr_stu_1', destination: 'Kota Kinabalu', block_name: 'Block A' };
  const leaveApplication2 = { id: 'leave_102', student_id: 'usr_stu_2', destination: 'Sandakan', block_name: 'Block B' };

  assert(verifyLeaveAccess(studentUser1, leaveApplication1) === true, 'Student 1 can view own leave application');
  assert(verifyLeaveAccess(studentUser1, leaveApplication2) === false, "Student 1 is BLOCKED from viewing Student 2's leave application (IDOR)");
  assert(verifyLeaveAccess(feloA, leaveApplication1, feloABlocks) === true, 'FELO A can view leave for student in assigned Block A');
  assert(verifyLeaveAccess(feloA, leaveApplication2, feloABlocks) === false, 'FELO A is BLOCKED from leave for student in unassigned Block B');

  // 3.3 Complaint / Welfare IDOR
  const complaint1 = { id: 'cmp_101', student_id: 'usr_stu_1', subject: 'Air Mati', welfare_flag: false, block_name: 'Block A' };
  const welfareCase2 = { id: 'welfare_102', student_id: 'usr_stu_2', subject: 'Bantuan Kewangan', welfare_flag: true, block_name: 'Block B' };

  assert(verifyComplaintAccess(studentUser1, complaint1) === true, 'Student 1 can access own complaint');
  assert(verifyComplaintAccess(studentUser1, welfareCase2) === false, "Student 1 is BLOCKED from accessing Student 2's welfare case (IDOR)");
  const staffUser = { id: 'usr_staff_1', role: ROLES.STAFF, email: 'staff@ums.edu.my' };
  assert(verifyComplaintAccess(staffUser, complaint1) === true, 'Staff can access general maintenance complaint');
  assert(verifyComplaintAccess(staffUser, welfareCase2) === false, 'Staff is BLOCKED from confidential welfare complaint (welfare_flag=true)');

  // 3.4 Disciplinary IDOR
  const disciplineRec1 = { id: 'disc_101', student_id: 'usr_stu_1', matric_number: 'BI22110101', penalty: 'Warning', block_name: 'Block A' };
  const disciplineRec2 = { id: 'disc_102', student_id: 'usr_stu_2', matric_number: 'BI22110102', penalty: 'Fine', block_name: 'Block B' };

  assert(verifyDisciplineAccess(studentUser1, disciplineRec1) === true, 'Student 1 can view own resolved disciplinary record');
  assert(verifyDisciplineAccess(studentUser1, disciplineRec2) === false, "Student 1 is BLOCKED from viewing Student 2's disciplinary record (IDOR)");
  assert(verifyDisciplineAccess({ role: ROLES.JAKMAS }, disciplineRec1) === false, 'JAKMAS is BLOCKED from all disciplinary records');
  assert(verifyDisciplineAccess({ role: ROLES.STAFF }, disciplineRec1) === false, 'STAFF is BLOCKED from all disciplinary records');
  assert(verifyDisciplineAccess(feloA, disciplineRec1, feloABlocks) === true, 'FELO A can view discipline record in assigned Block A');
  assert(verifyDisciplineAccess(feloA, disciplineRec2, feloABlocks) === false, 'FELO A is BLOCKED from discipline record in unassigned Block B');

  // -------------------------------------------------------------------------
  // TEST GROUP 4: FIELD-LEVEL DATA MASKING & REAL PRODUCTION SCHEMA
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Field-Level Masking & Over-Fetching ---');
  const rawIC1 = '020512-12-5678';
  const rawIC2 = '030815124321';
  const rawPassport = 'A12345678';
  const rawPhone = '0165097489';
  const rawEmail = 'muhammad.azlan@ums.edu.my';

  assert(maskIC(rawIC1) === '******-**-5678', `IC with hyphen masked: ${maskIC(rawIC1)}`);
  assert(maskIC(rawIC2) === '********4321', `IC without hyphen masked: ${maskIC(rawIC2)}`);
  assert(maskIC(rawPassport) === '*****5678', `Passport masked: ${maskIC(rawPassport)}`);
  assert(maskPhone(rawPhone) === '0165-***-7489', `Phone masked: ${maskPhone(rawPhone)}`);
  assert(maskEmail(rawEmail).includes('@ums.edu.my') && maskEmail(rawEmail).startsWith('m'), 'Email masked');

  // Realistic Production Student entity record
  const fullProductionStudentRecord = {
    id: 'stud_999',
    student_id: 'BK23110088',
    full_name: 'Nurul Huda binti Ismail',
    matric_number: 'BK23110088',
    ic_passport: '040219-12-8899',
    phone: '0179998877',
    phone_number: '0179998877',
    parent_name: 'Ismail bin Abdullah',
    parent_phone: '0123334455',
    parent_income: 'RM 1,800',
    emergency_contact: '0123334455',
    medical_condition: 'Alergi Kekacang & Asma',
  };

  const sanitizedForJakmas = sanitizeStudentData(fullProductionStudentRecord, ROLES.JAKMAS);
  assert(sanitizedForJakmas.ic_passport === '******-**-8899', 'IC masked in JAKMAS projection');
  assert(sanitizedForJakmas.phone === '0179-***-8877', 'Production Student.phone masked in JAKMAS projection');
  assert(sanitizedForJakmas.phone_number === '0179-***-8877', 'Student.phone_number masked in JAKMAS projection');
  assert(sanitizedForJakmas.parent_phone === '[RESTRICTED]', 'Parent phone restricted in JAKMAS projection');
  assert(sanitizedForJakmas.emergency_contact === '[RESTRICTED]', 'Emergency contact restricted in JAKMAS projection');
  assert(sanitizedForJakmas.parent_income === '[RESTRICTED]', 'Parent income stripped in JAKMAS projection');
  assert(sanitizedForJakmas.medical_condition === '[CONFIDENTIAL / RESTRICTED]', 'Medical condition stripped for JAKMAS');

  const sanitizedForWarden = sanitizeStudentData(fullProductionStudentRecord, ROLES.WARDEN);
  assert(sanitizedForWarden.medical_condition === 'Alergi Kekacang & Asma', 'Medical notes visible to authorized Warden for care');

  // -------------------------------------------------------------------------
  // TEST GROUP 5: EXPORT CONTROLS & LEAKAGE DEFENSE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Export Controls & Protection ---');
  let studentExportBlocked = false;
  try {
    await secureExportData({
      user: studentUser1,
      data: [fullProductionStudentRecord],
      exportType: 'CSV',
    });
  } catch (err) {
    studentExportBlocked = true;
  }
  assert(studentExportBlocked === true, 'Unauthorized CSV export by Student is BLOCKED');

  let jakmasExportBlocked = false;
  try {
    await secureExportData({
      user: { role: ROLES.JAKMAS, email: 'jakmas@ums.edu.my' },
      data: [fullProductionStudentRecord],
      exportType: 'EXCEL',
    });
  } catch (err) {
    jakmasExportBlocked = true;
  }
  assert(jakmasExportBlocked === true, 'Unauthorized Excel export by JAKMAS is BLOCKED');

  const adminExportResult = await secureExportData({
    user: { role: ROLES.ADMIN, email: 'admin@ums.edu.my' },
    data: [fullProductionStudentRecord],
    exportType: 'CSV',
  });
  assert(adminExportResult.length === 1, 'Authorized Admin export succeeds');
  assert(adminExportResult[0].ic_passport === '******-**-8899', 'Export masks sensitive IC numbers by default');
  assert(adminExportResult[0].parent_income === undefined, 'High-risk income removed from standard export');

  // -------------------------------------------------------------------------
  // TEST GROUP 6: AUDIT LOG INTEGRITY & TAMPER-RESISTANCE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Audit Log Integrity ---');
  assert(verifyAuditLogAccess({ role: ROLES.SUPER_ADMIN }) === true, 'Super Admin can access audit log');
  assert(verifyAuditLogAccess({ role: ROLES.PRINCIPAL }) === true, 'Pengetua can access audit log');
  assert(verifyAuditLogAccess({ role: ROLES.ADMIN }) === false, 'College Admin cannot access audit log (Separation of duties)');
  assert(verifyAuditLogAccess({ role: ROLES.JAKMAS }) === false, 'JAKMAS cannot access audit log');
  assert(verifyAuditLogAccess({ role: ROLES.STUDENT }) === false, 'Student cannot access audit log');

  // -------------------------------------------------------------------------
  // TEST GROUP 7: FILE & DOCUMENT SECURITY
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Document Access & File Security ---');
  const confidentialMedicalDoc = { id: 'doc_555', file_name: 'medical_cert.pdf', type: 'MEDICAL' };

  assert(verifyDocumentAccess(studentUser1, confidentialMedicalDoc, { id: 'usr_stu_1' }) === true, 'Student can download own medical document');
  assert(verifyDocumentAccess(studentUser2, confidentialMedicalDoc, { id: 'usr_stu_1' }) === false, "Student 2 is BLOCKED from downloading Student 1's document (IDOR)");
  assert(verifyDocumentAccess({ role: ROLES.JAKMAS }, confidentialMedicalDoc, { id: 'usr_stu_1' }) === false, 'JAKMAS is BLOCKED from downloading student document');

  const validPng = { type: 'image/png', size: 1 * 1024 * 1024 };
  const invalidBat = { type: 'application/x-bat', size: 500 };
  assert(validateUploadFile(validPng).valid === true, 'Valid PNG file accepted');
  assert(validateUploadFile(invalidBat).valid === false, 'Dangerous script file rejected');

  // -------------------------------------------------------------------------
  // TEST GROUP 8: DEFENSIVE CODING, MASS ASSIGNMENT & SANITIZATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Defensive Coding & Input Sanitization ---');
  const payloadWithInjection = {
    full_name: '<script>alert("hack")</script>Ali',
    role: 'super_admin', // Escalation attempt
    isAdmin: true,
    phone: '0123456789',
  };
  const filtered = filterAllowedFields(payloadWithInjection, ['full_name', 'phone']);
  assert(filtered.role === undefined && filtered.isAdmin === undefined, 'Privilege escalation fields stripped');
  assert(sanitizeInputString(filtered.full_name).includes('&lt;script&gt;'), 'XSS tags sanitized');

  // -------------------------------------------------------------------------
  // TEST GROUP 9: AUTHENTICATION HARDENING & RATE LIMITING
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Authentication & Brute-Force Defense ---');
  assert(validatePasswordStrength('12345').valid === false, 'Short password rejected');
  assert(validatePasswordStrength('password').valid === false, 'Password without uppercase/number rejected');
  assert(validatePasswordStrength('Password123').valid === false, 'Password without special character rejected (Negative test)');
  assert(validatePasswordStrength('Password123!').valid === true, 'Password with uppercase, lowercase, digit and special character accepted (Positive test)');
  assert(validatePasswordStrength('MyKktf@2026!').valid === true, 'Complex institutional password accepted');

  const lockoutUser = 'bruteforce_victim@ums.edu.my';
  resetFailedLogin(lockoutUser);
  for (let i = 0; i < 5; i++) {
    recordFailedLogin(lockoutUser);
  }
  assert(isAccountLocked(lockoutUser).locked === true, 'Account locked in helper tracking after 5 consecutive failed attempts');

  // -------------------------------------------------------------------------
  // TEST GROUP 10: RETENTION, ANONYMIZATION & PRIVACY NOTICES
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: Data Retention, Anonymization & Governance ---');
  const alumniStudent = {
    id: 'alumni_001',
    student_id: 'BA19110055',
    full_name: 'Mohd Farhan bin Razali',
    matric_number: 'BA19110055',
    ic_passport: '000101-12-1122',
    email: 'farhan@ums.edu.my',
    phone: '0198887766',
    medical_condition: 'Sinus kronik',
  };
  const anonymized = anonymizeStudentRecord(alumniStudent);
  assert(anonymized.full_name.includes('Bekas Residen'), 'Student name scrubbed in anonymization');
  assert(anonymized.ic_passport === '******-**-XXXX', 'IC scrubbed in anonymization');
  assert(anonymized.phone === '000-0000000', 'Production phone scrubbed in anonymization');
  assert(anonymized.medical_condition === null, 'Medical condition purged in anonymization');
  assert(anonymized.lifecycle_status === 'ARCHIVED', 'Lifecycle status updated to ARCHIVED');

  assert(OFFICIAL_PRIVACY_NOTICE.version === CURRENT_PRIVACY_NOTICE_VERSION, 'Active Privacy Notice registered');
  assert(DEFAULT_RETENTION_POLICIES.length >= 7, 'Standard collegiate retention categories defined');

  // -------------------------------------------------------------------------
  // TEST GROUP 11: DATABASE-LEVEL ROW LEVEL SECURITY (RLS) VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 11: Database Entity RLS Schema Enforcement ---');

  // 11.1 AuditLog.jsonc
  const auditLogEntity = parseJsonc(path.join(entitiesDir, 'AuditLog.jsonc'));
  assert(auditLogEntity.rls.update === false, 'AuditLog RLS update=false (Database-level immutability)');
  assert(auditLogEntity.rls.delete === false, 'AuditLog RLS delete=false (Database-level non-deletable)');

  // 11.2 Student.jsonc
  const studentEntity = parseJsonc(path.join(entitiesDir, 'Student.jsonc'));
  const studentReadConditions = JSON.stringify(studentEntity.rls.read);
  const studentUpdateConditions = JSON.stringify(studentEntity.rls.update);
  assert(!studentReadConditions.includes('"staff"'), 'Student.jsonc read RLS does NOT grant broad staff access');
  assert(!studentReadConditions.includes('"warden"'), 'Student.jsonc read RLS does NOT grant broad warden access (Must use scoped backend)');
  assert(!studentUpdateConditions.includes('"staff"'), 'Student.jsonc update RLS does NOT grant staff update access');

  // 11.3 LeaveApplication.jsonc
  const leaveEntity = parseJsonc(path.join(entitiesDir, 'LeaveApplication.jsonc'));
  const leaveReadConditions = JSON.stringify(leaveEntity.rls.read);
  assert(!leaveReadConditions.includes('"staff"'), 'LeaveApplication.jsonc read RLS does NOT grant broad staff access');
  assert(!leaveReadConditions.includes('"warden"'), 'LeaveApplication.jsonc read RLS does NOT grant broad warden access (Must use scoped backend)');

  // 11.4 DisciplineRecord.jsonc
  const disciplineEntity = parseJsonc(path.join(entitiesDir, 'DisciplineRecord.jsonc'));
  const disciplineReadConditions = JSON.stringify(disciplineEntity.rls.read);
  assert(!disciplineReadConditions.includes('"staff"'), 'DisciplineRecord.jsonc read RLS does NOT grant staff access');
  assert(!disciplineReadConditions.includes('"jakmas"'), 'DisciplineRecord.jsonc read RLS does NOT grant JAKMAS access');
  assert(!disciplineReadConditions.includes('"warden"'), 'DisciplineRecord.jsonc read RLS does NOT grant broad warden access (Must use scoped backend)');

  // Summary
  console.log('\n========================================================================');
  console.log(`🎯 TOTAL TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
