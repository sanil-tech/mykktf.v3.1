import { logAudit } from './audit.js';

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validate an uploaded file for security compliance
 */
export function validateUploadFile(file) {
  if (!file) {
    return { valid: false, error: 'Fail tidak sah atau tiada fail dipilih.' };
  }

  // 1. MIME Type check
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Jenis fail '${file.type || 'tidak diketahui'}' tidak dibenarkan. Sila muat naik format JPEG, PNG, WebP atau PDF sahaja.`,
    };
  }

  // 2. Size limit check
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Saiz fail (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi had maksimum 5MB.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Generate a safe, obfuscated storage identifier to avoid predictable path traversal
 */
export function generateSafeFilename(originalFilename) {
  const ext = originalFilename.split('.').pop()?.toLowerCase() || 'dat';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext) ? ext : 'dat';
  const uuid = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  return `${uuid}.${cleanExt}`;
}

/**
 * Log download or access to sensitive documents
 */
export async function logFileDownload({ user, fileId, documentType, affectedStudentId }) {
  await logAudit({
    user,
    action: 'SENSITIVE_FILE_DOWNLOADED',
    action_type: 'READ',
    module: 'FileStorage',
    resource_type: documentType,
    resource_id: fileId,
    affected_user_id: affectedStudentId,
    result: 'SUCCESS',
    details: { fileId, documentType },
  });
}
