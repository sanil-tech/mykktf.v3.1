import { canExportStudentData } from './permissions.js';
import { maskIC, maskPhone } from './dataMasking.js';
import { logAudit } from './audit.js';

/**
 * Filter and sanitize data before export to CSV / Excel / PDF
 * Ensures high-risk / sensitive fields are not leaked in bulk exports
 * and logs every export action.
 *
 * @param {object} params
 * @param {object} params.user - Current user attempting the export
 * @param {Array<object>} params.data - Array of data rows to export
 * @param {string} params.exportType - 'CSV', 'EXCEL', 'PDF', 'PRINT'
 * @param {string} params.module - Module origin, e.g. 'Reports', 'MeritDemerit', 'Students'
 * @param {string} [params.purpose='Official College Management'] - Stated purpose
 * @param {Array<string>} [params.allowedFields] - Specific fields to include
 * @returns {Array<object>|null} Sanitized array of objects or null if denied
 */
export async function secureExportData({
  user,
  data,
  exportType = 'CSV',
  module = 'Reports',
  purpose = 'Official College Management',
  allowedFields = null,
}) {
  const role = user?.role || 'student';

  // 1. Capability Verification
  if (!canExportStudentData(role)) {
    await logAudit({
      user,
      action: 'EXPORT_STUDENT_DATA_DENIED',
      action_type: 'EXPORT',
      module,
      result: 'DENIED',
      details: { exportType, recordCount: data?.length || 0, reason: 'Insufficient role permissions' },
    });
    throw new Error('Akses Ditolak: Anda tidak mempunyai kebenaran untuk mengeksport data pelajar secara pukal.');
  }

  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  // 2. Data Minimisation and Field Masking
  const sanitizedRows = data.map(item => {
    const row = { ...item };

    // Never export unmasked IC numbers in standard exports unless explicitly required by Principal
    if (row.ic_passport) {
      row.ic_passport = maskIC(row.ic_passport);
    }
    if (row.parent_phone) {
      row.parent_phone = maskPhone(row.parent_phone);
    }
    if (row.emergency_contact_phone) {
      row.emergency_contact_phone = maskPhone(row.emergency_contact_phone);
    }
    if (row.parent_income) {
      delete row.parent_income;
    }
    if (row.medical_condition) {
      delete row.medical_condition;
    }

    // Filter only allowed fields if specified
    if (allowedFields && Array.isArray(allowedFields)) {
      const filtered = {};
      for (const field of allowedFields) {
        if (field in row) filtered[field] = row[field];
      }
      return filtered;
    }

    return row;
  });

  // 3. Mandatory Audit Trail Logging
  await logAudit({
    user,
    action: `EXPORT_STUDENT_DATA_${exportType.toUpperCase()}`,
    action_type: 'EXPORT',
    module,
    resource_type: 'BulkExport',
    result: 'SUCCESS',
    details: {
      exportType,
      recordCount: sanitizedRows.length,
      purpose,
      timestamp: new Date().toISOString(),
    },
  });

  return sanitizedRows;
}
