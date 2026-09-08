/**
 * Centralized Permission Engine for MyKKTF v3.1
 * Enforces Least Privilege, Purpose Limitation, and Server-Side Capability Checks.
 */

import { ROLES } from './roles.js';

export const PERMISSIONS = {
  // Student Profile Permissions
  VIEW_BASIC_PROFILE: 'canViewStudentBasicProfile',
  VIEW_SENSITIVE_PROFILE: 'canViewSensitiveProfile',
  VIEW_MEDICAL_DATA: 'canAccessMedicalData',
  
  // Student Operational Records
  VIEW_DISCIPLINARY: 'canViewDisciplinaryRecord',
  MANAGE_DISCIPLINARY: 'canManageDisciplinaryRecord',
  VIEW_WELFARE: 'canViewWelfareRecord',
  MANAGE_WELFARE: 'canManageWelfareRecord',
  
  // Residential Operations
  MANAGE_ROOM: 'canManageRoom',
  APPROVE_LEAVE: 'canApproveLeave',
  SCAN_RESIDENTS: 'canScanResidents',
  CHECK_IN_OUT: 'canManageCheckInOut',
  
  // Data Governance & Privacy
  EXPORT_STUDENT_DATA: 'canExportStudentData',
  VIEW_AUDIT_LOG: 'canViewAuditLog',
  MANAGE_PRIVACY_NOTICES: 'canManagePrivacyNotices',
  MANAGE_INCIDENTS: 'canManageIncidents',
  REQUEST_DATA_CORRECTION: 'canRequestDataCorrection',
  APPROVE_DATA_CORRECTION: 'canApproveDataCorrection',
  PERFORM_DATA_RETENTION: 'canPerformDataRetention',
  
  // System & Role Administration
  MANAGE_USERS: 'canManageUsers',
  MODIFY_ROLES: 'canModifyRoles',
};

/**
 * Standard Capability Matrix per Role
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.VIEW_SENSITIVE_PROFILE,
    PERMISSIONS.VIEW_DISCIPLINARY,
    PERMISSIONS.MANAGE_DISCIPLINARY,
    PERMISSIONS.VIEW_WELFARE,
    PERMISSIONS.MANAGE_WELFARE,
    PERMISSIONS.MANAGE_ROOM,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.SCAN_RESIDENTS,
    PERMISSIONS.CHECK_IN_OUT,
    PERMISSIONS.EXPORT_STUDENT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.MANAGE_PRIVACY_NOTICES,
    PERMISSIONS.MANAGE_INCIDENTS,
    PERMISSIONS.APPROVE_DATA_CORRECTION,
    PERMISSIONS.PERFORM_DATA_RETENTION,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MODIFY_ROLES,
  ],
  [ROLES.PRINCIPAL]: [
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.VIEW_SENSITIVE_PROFILE,
    PERMISSIONS.VIEW_MEDICAL_DATA,
    PERMISSIONS.VIEW_DISCIPLINARY,
    PERMISSIONS.MANAGE_DISCIPLINARY,
    PERMISSIONS.VIEW_WELFARE,
    PERMISSIONS.MANAGE_WELFARE,
    PERMISSIONS.MANAGE_ROOM,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.SCAN_RESIDENTS,
    PERMISSIONS.CHECK_IN_OUT,
    PERMISSIONS.EXPORT_STUDENT_DATA,
    PERMISSIONS.VIEW_AUDIT_LOG,
    PERMISSIONS.MANAGE_PRIVACY_NOTICES,
    PERMISSIONS.MANAGE_INCIDENTS,
    PERMISSIONS.APPROVE_DATA_CORRECTION,
    PERMISSIONS.PERFORM_DATA_RETENTION,
  ],
  [ROLES.ADMIN]: [ // PENGURUSAN_ADMIN
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.VIEW_SENSITIVE_PROFILE,
    PERMISSIONS.VIEW_DISCIPLINARY,
    PERMISSIONS.VIEW_WELFARE,
    PERMISSIONS.MANAGE_ROOM,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.SCAN_RESIDENTS,
    PERMISSIONS.CHECK_IN_OUT,
    PERMISSIONS.EXPORT_STUDENT_DATA,
    PERMISSIONS.MANAGE_PRIVACY_NOTICES,
    PERMISSIONS.MANAGE_INCIDENTS,
    PERMISSIONS.APPROVE_DATA_CORRECTION,
  ],
  [ROLES.WARDEN]: [ // FELO
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.VIEW_SENSITIVE_PROFILE,
    PERMISSIONS.VIEW_MEDICAL_DATA,
    PERMISSIONS.VIEW_DISCIPLINARY,
    PERMISSIONS.MANAGE_DISCIPLINARY,
    PERMISSIONS.VIEW_WELFARE,
    PERMISSIONS.MANAGE_WELFARE,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.SCAN_RESIDENTS,
  ],
  [ROLES.STAFF]: [ // STAFF PENTADBIRAN
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.SCAN_RESIDENTS,
    PERMISSIONS.CHECK_IN_OUT,
    PERMISSIONS.MANAGE_ROOM,
  ],
  [ROLES.JAKMAS]: [ // MAJLIS PERWAKILAN KOLEJ
    PERMISSIONS.VIEW_BASIC_PROFILE,
    PERMISSIONS.SCAN_RESIDENTS,
  ],
  [ROLES.STUDENT]: [ // PELAJAR / RESIDEN
    PERMISSIONS.REQUEST_DATA_CORRECTION,
  ],
};

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role, permission) {
  const normalizedRole = (!role || role === 'user') ? ROLES.STUDENT : role;
  const permissions = ROLE_PERMISSIONS[normalizedRole] || [];
  return permissions.includes(permission);
}

// Convenience Capability Helpers
export const canViewStudentBasicProfile = (role) => hasPermission(role, PERMISSIONS.VIEW_BASIC_PROFILE);
export const canViewSensitiveProfile = (role) => hasPermission(role, PERMISSIONS.VIEW_SENSITIVE_PROFILE);
export const canViewDisciplinaryRecord = (role) => hasPermission(role, PERMISSIONS.VIEW_DISCIPLINARY);
export const canViewWelfareRecord = (role) => hasPermission(role, PERMISSIONS.VIEW_WELFARE);
export const canManageRoom = (role) => hasPermission(role, PERMISSIONS.MANAGE_ROOM);
export const canApproveLeave = (role) => hasPermission(role, PERMISSIONS.APPROVE_LEAVE);
export const canExportStudentData = (role) => hasPermission(role, PERMISSIONS.EXPORT_STUDENT_DATA);
export const canViewAuditLog = (role) => hasPermission(role, PERMISSIONS.VIEW_AUDIT_LOG);
export const canManageUsers = (role) => hasPermission(role, PERMISSIONS.MANAGE_USERS);
export const canModifyRoles = (role) => hasPermission(role, PERMISSIONS.MODIFY_ROLES);
export const canAccessMedicalData = (role) => hasPermission(role, PERMISSIONS.VIEW_MEDICAL_DATA);
export const canManagePrivacyNotices = (role) => hasPermission(role, PERMISSIONS.MANAGE_PRIVACY_NOTICES);
export const canManageIncidents = (role) => hasPermission(role, PERMISSIONS.MANAGE_INCIDENTS);
export const canRequestDataCorrection = (role) => hasPermission(role, PERMISSIONS.REQUEST_DATA_CORRECTION);
export const canApproveDataCorrection = (role) => hasPermission(role, PERMISSIONS.APPROVE_DATA_CORRECTION);
export const canPerformDataRetention = (role) => hasPermission(role, PERMISSIONS.PERFORM_DATA_RETENTION);
