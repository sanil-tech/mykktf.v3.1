/**
 * Security Guards, IDOR/BOLA Protection & Scope Enforcers for MyKKTF v3.1
 * Defends against Broken Object Level Authorization (BOLA/IDOR), Mass Assignment, and Scope Leaks.
 */

import { ROLES } from './roles.js';
import { isBlockInList } from './kktfBlocks.js';
import {
  canViewStudentBasicProfile,
  canViewSensitiveProfile,
  canViewDisciplinaryRecord,
  canViewWelfareRecord,
  canManageRoom,
  canApproveLeave,
  canViewAuditLog,
} from './permissions.js';

/**
 * Generic Ownership Guard
 */
export function verifyResourceOwnership(currentUser, resourceOwnerId, allowedRoles = [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN]) {
  if (!currentUser) return false;
  
  if (allowedRoles.includes(currentUser.role)) {
    return true;
  }
  
  const isOwner = currentUser.id === resourceOwnerId || 
                  currentUser.email === resourceOwnerId || 
                  currentUser.matric_number === resourceOwnerId ||
                  currentUser.student_id === resourceOwnerId;
  return !!isOwner;
}

/**
 * Student Record Access & Scope Verifier (Object-level & Block-scoped)
 */
export function verifyStudentAccess(currentUser, studentRecord, wardenAssignedBlocks = []) {
  if (!currentUser || !studentRecord) return { allowed: false, reason: 'Invalid parameters or unauthenticated' };

  const role = currentUser.role || ROLES.STUDENT;

  // 1. Executive / College Admin
  if (role === ROLES.SUPER_ADMIN || role === ROLES.PRINCIPAL || role === ROLES.ADMIN) {
    return { allowed: true, scope: 'ALL_COLLEGE', canViewSensitive: true };
  }

  // 2. Felo / Warden (Must verify block assignment scope)
  if (role === ROLES.WARDEN) {
    const studentBlock = studentRecord.block_name || studentRecord.block;
    const isAssigned = isBlockInList(studentBlock, wardenAssignedBlocks);
    if (isAssigned) {
      return { allowed: true, scope: 'ASSIGNED_BLOCK', canViewSensitive: true };
    }
    return {
      allowed: false,
      reason: `Akses Ditolak: Residen di Blok ${studentBlock || 'N/A'} di luar bidang kuasa blok jagaan anda (${wardenAssignedBlocks.join(', ') || 'Tiada'}).`,
    };
  }

  // 3. Administrative Staff
  if (role === ROLES.STAFF) {
    return { allowed: true, scope: 'OPERATIONAL_ONLY', canViewSensitive: false };
  }

  // 4. JAKMAS (Basic non-sensitive operational view only)
  if (role === ROLES.JAKMAS) {
    return { allowed: true, scope: 'BASIC_ONLY', canViewSensitive: false };
  }

  // 5. Student Self-Service (Own profile only)
  const isSelf = (currentUser.id && (currentUser.id === studentRecord.id || currentUser.id === studentRecord.user_id)) ||
                 (currentUser.email && studentRecord.email && currentUser.email === studentRecord.email) ||
                 (currentUser.student_id && studentRecord.student_id && currentUser.student_id === studentRecord.student_id) ||
                 (currentUser.matric_number && studentRecord.matric_number && currentUser.matric_number === studentRecord.matric_number);

  if (isSelf) {
    return { allowed: true, scope: 'OWN_RECORD', canViewSensitive: true };
  }

  return { allowed: false, reason: 'Akses Ditolak: Anda hanya dibenarkan mengakses profil diri anda sendiri.' };
}

/**
 * Leave Application Object-Level Authorization
 */
export function verifyLeaveAccess(currentUser, leaveRecord, wardenAssignedBlocks = []) {
  if (!currentUser || !leaveRecord) return false;
  const role = currentUser.role || ROLES.STUDENT;

  if (role === ROLES.SUPER_ADMIN || role === ROLES.PRINCIPAL || role === ROLES.ADMIN) return true;

  if (role === ROLES.WARDEN) {
    const block = leaveRecord.block_name || leaveRecord.block;
    return isBlockInList(block, wardenAssignedBlocks);
  }

  // Own leave application
  const isOwner = Boolean(
    (currentUser.id && (currentUser.id === leaveRecord.student_id || currentUser.id === leaveRecord.user_id)) ||
    (currentUser.email && leaveRecord.student_email && currentUser.email === leaveRecord.student_email)
  );
  return isOwner;
}

/**
 * Complaint / Welfare Case Object-Level Authorization
 */
export function verifyComplaintAccess(currentUser, complaintRecord, wardenAssignedBlocks = []) {
  if (!currentUser || !complaintRecord) return false;
  const role = currentUser.role || ROLES.STUDENT;

  // JAKMAS is strictly barred from private complaints / welfare cases
  if (role === ROLES.JAKMAS) return false;

  if (role === ROLES.SUPER_ADMIN || role === ROLES.PRINCIPAL || role === ROLES.ADMIN) return true;

  if (role === ROLES.WARDEN) {
    const block = complaintRecord.block_name || complaintRecord.block;
    return isBlockInList(block, wardenAssignedBlocks);
  }

  if (role === ROLES.STAFF) {
    // Staff can only view general maintenance complaints, not confidential welfare/psychological flags
    if (complaintRecord.welfare_flag || complaintRecord.psychological_flag) return false;
    return true;
  }

  // Student own complaint
  return Boolean(
    currentUser.id && (currentUser.id === complaintRecord.student_id || currentUser.id === complaintRecord.user_id)
  );
}

/**
 * Disciplinary Record Object-Level Authorization
 */
export function verifyDisciplineAccess(currentUser, disciplineRecord, wardenAssignedBlocks = []) {
  if (!currentUser || !disciplineRecord) return false;
  const role = currentUser.role || ROLES.STUDENT;

  // JAKMAS and Staff are strictly barred
  if (role === ROLES.JAKMAS || role === ROLES.STAFF) return false;

  if (role === ROLES.SUPER_ADMIN || role === ROLES.PRINCIPAL || role === ROLES.ADMIN) {
    return true;
  }

  if (role === ROLES.WARDEN) {
    const block = disciplineRecord.block_name || disciplineRecord.block;
    return isBlockInList(block, wardenAssignedBlocks);
  }

  // Student can only view their own resolved record
  return Boolean(
    (currentUser.id && currentUser.id === disciplineRecord.student_id) ||
    (currentUser.student_id && disciplineRecord.matric_number && currentUser.student_id === disciplineRecord.matric_number)
  );
}

/**
 * Audit Log Object-Level Authorization
 */
export function verifyAuditLogAccess(currentUser) {
  if (!currentUser) return false;
  return canViewAuditLog(currentUser.role);
}

/**
 * Uploaded Document / Attachment Object-Level Authorization
 */
export function verifyDocumentAccess(currentUser, documentRecord, studentOwnerRecord, wardenAssignedBlocks = []) {
  if (!currentUser || !documentRecord) return false;
  const role = currentUser.role || ROLES.STUDENT;

  // JAKMAS is strictly barred from confidential student attachments
  if (role === ROLES.JAKMAS) return false;

  if (role === ROLES.SUPER_ADMIN || role === ROLES.PRINCIPAL || role === ROLES.ADMIN) return true;

  if (role === ROLES.WARDEN && studentOwnerRecord) {
    const block = studentOwnerRecord.block_name || studentOwnerRecord.block;
    return isBlockInList(block, wardenAssignedBlocks);
  }

  // Student owner
  if (studentOwnerRecord) {
    return Boolean(
      (currentUser.id && (currentUser.id === studentOwnerRecord.id || currentUser.id === studentOwnerRecord.user_id)) ||
      (currentUser.email && studentOwnerRecord.email && currentUser.email === studentOwnerRecord.email)
    );
  }

  return false;
}

/**
 * Mass Assignment Defense: Whitelist allowed payload fields for mutations
 */
export function filterAllowedFields(payload, allowedFields) {
  if (!payload || typeof payload !== 'object') return {};
  const clean = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      clean[field] = payload[field];
    }
  }
  return clean;
}

/**
 * Sanitize User Input against script injection / HTML entities
 */
export function sanitizeInputString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
