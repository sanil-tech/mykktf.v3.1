import { base44 } from '@/api/base44Client';

/**
 * Generic audit logger. Writes a record to the AuditLog entity for any
 * significant system action. Safe to await; never throws (audit must not
 * break the operation it is recording).
 *
 * @param {object} user  - the authenticated user performing the action
 * @param {string} action - short uppercase code, e.g. 'STUDENT_CREATED'
 * @param {string} module - module label, e.g. 'Students'
 * @param {string|object} details - free-text or structured details
 */
export async function logAudit(user, action, module, details) {
  if (!user) return;
  try {
    await base44.entities.AuditLog.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      action,
      module,
      details: typeof details === 'string' ? details : JSON.stringify(details || {}),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    /* audit must never break the operation */
  }
}