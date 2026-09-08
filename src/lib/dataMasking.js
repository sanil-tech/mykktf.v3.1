/**
 * Data Masking & Sanitization Utilities for MyKKTF v3.1
 * Implements privacy-by-design masking for IC, telephone, email, and sensitive student records.
 */

import { ROLES } from './roles.js';
import { canViewSensitiveProfile, canAccessMedicalData } from './permissions.js';

/**
 * Mask IC / Passport Number
 * Example: '980101-12-1234' -> '******-**-1234'
 * Example: '980101121234' -> '********1234'
 * Example: 'A12345678' -> '*****5678'
 */
export function maskIC(ic) {
  if (!ic || typeof ic !== 'string') return '-';
  const trimmed = ic.trim();
  if (trimmed.length <= 4) return '****';
  
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      return `******-**-${parts[2]}`;
    }
  }
  
  const lastFour = trimmed.slice(-4);
  const maskedPrefix = '*'.repeat(Math.max(trimmed.length - 4, 4));
  return `${maskedPrefix}${lastFour}`;
}

/**
 * Mask Phone Number
 * Example: '+60123456789' -> '+6012-***-6789'
 * Example: '0123456789' -> '012-***-6789'
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '-';
  const clean = phone.trim().replace(/\s+/g, '');
  if (clean.length <= 4) return '***';
  
  const suffix = clean.slice(-4);
  const prefix = clean.slice(0, 4);
  return `${prefix}-***-${suffix}`;
}

/**
 * Mask Email Address
 * Example: 'sanil@ums.edu.my' -> 's***l@ums.edu.my'
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || '-';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

/**
 * Sanitize a single Student record based on the user's role and identity.
 * Prevents over-fetching and field exposure.
 */
export function sanitizeStudentData(student, userRole, currentUserId = null) {
  if (!student) return null;
  
  const isSelf = currentUserId && (
    student.id === currentUserId || 
    student.email === currentUserId || 
    student.user_id === currentUserId ||
    student.student_id === currentUserId
  );
  const hasSensitiveAccess = canViewSensitiveProfile(userRole) || isSelf;
  const hasMedicalAccess = canAccessMedicalData(userRole) || isSelf;

  const sanitized = { ...student };

  // Mask or strip sensitive identification and contact data
  if (!hasSensitiveAccess) {
    if (student.ic_passport) sanitized.ic_passport = maskIC(student.ic_passport);
    if (student.ic_no) sanitized.ic_no = maskIC(student.ic_no);
    if (student.parent_phone) sanitized.parent_phone = maskPhone(student.parent_phone);
    if (student.emergency_contact) sanitized.emergency_contact = maskPhone(student.emergency_contact);
    if (student.emergency_contact_phone) sanitized.emergency_contact_phone = maskPhone(student.emergency_contact_phone);
    sanitized.parent_income = '[RESTRICTED]';
  }

  // Mask primary phone (both phone and phone_number) for JAKMAS or general non-management peer views
  if (userRole === ROLES.JAKMAS || (!hasSensitiveAccess && userRole !== ROLES.WARDEN)) {
    if (student.phone) sanitized.phone = maskPhone(student.phone);
    if (student.phone_number) sanitized.phone_number = maskPhone(student.phone_number);
  }

  // JAKMAS specific restrictions: parent and emergency contacts must be completely restricted
  if (userRole === ROLES.JAKMAS) {
    sanitized.parent_phone = '[RESTRICTED]';
    sanitized.emergency_contact = '[RESTRICTED]';
    sanitized.emergency_contact_phone = '[RESTRICTED]';
    sanitized.parent_name = '[RESTRICTED]';
  }

  // Strip or redact medical and disability data if unauthorized
  if (!hasMedicalAccess) {
    sanitized.medical_condition = '[CONFIDENTIAL / RESTRICTED]';
    sanitized.disability_info = '[CONFIDENTIAL / RESTRICTED]';
    sanitized.allergies = '[CONFIDENTIAL / RESTRICTED]';
    sanitized.blood_type = '[CONFIDENTIAL / RESTRICTED]';
  }

  return sanitized;
}

/**
 * Sanitize an array of Student records
 */
export function sanitizeStudentList(students, userRole, currentUserId = null) {
  if (!Array.isArray(students)) return [];
  return students.map(student => sanitizeStudentData(student, userRole, currentUserId));
}
