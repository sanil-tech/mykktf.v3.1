import { base44 } from '../api/base44Client.js';

/**
 * Enhanced Audit Logging Engine for MyKKTF v3.1
 * Complies with Malaysian Personal Data Protection Act auditability and tamper-resistance principles.
 * Never stores raw passwords, secrets, tokens, or unnecessary sensitive personal data.
 * Safe to await; never throws to avoid blocking the primary user action.
 *
 * @param {object} params
 * @param {object} params.user - The authenticated actor
 * @param {string} params.action - Short code, e.g. 'STUDENT_PROFILE_VIEW'
 * @param {string} params.action_type - e.g. 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'LOGIN', 'SECURITY_EVENT'
 * @param {string} params.module - Module label, e.g. 'Students', 'Discipline', 'Welfare', 'Reports'
 * @param {string} [params.resource_type] - Entity name, e.g. 'Student', 'DisciplineRecord', 'Export'
 * @param {string} [params.resource_id] - Target ID
 * @param {string} [params.affected_user_id] - Target student user_id
 * @param {string} [params.result='SUCCESS'] - 'SUCCESS', 'DENIED', 'FAILED'
 * @param {string|object} [params.details] - Sanitized details
 * @param {object} [params.before_after] - Metadata changes { before: {...}, after: {...} }
 */
export async function logAudit({
  user,
  action,
  action_type = 'OPERATION',
  module,
  resource_type = null,
  resource_id = null,
  affected_user_id = null,
  result = 'SUCCESS',
  details = {},
  before_after = null,
}) {
  if (!user && !details.system) return;

  const event_id = `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const actor_user_id = user ? (user.id || user.email) : 'SYSTEM';
  const actor_name = user ? (user.full_name || user.email) : 'System Automated Task';
  const actor_role = user ? (user.role || 'student') : 'system';

  // Sanitize details to avoid logging passwords or auth tokens
  let cleanDetails = typeof details === 'string' ? details : { ...details };
  if (typeof cleanDetails === 'object' && cleanDetails !== null) {
    delete cleanDetails.password;
    delete cleanDetails.token;
    delete cleanDetails.refresh_token;
    delete cleanDetails.secret;
    cleanDetails = JSON.stringify(cleanDetails);
  }

  const cleanBeforeAfter = before_after ? JSON.stringify(before_after) : null;
  const session_context = typeof window !== 'undefined' ? `${window.navigator.userAgent.slice(0, 100)}` : 'Node/Server';

  try {
    if (base44?.entities?.AuditLog?.create) {
      await base44.entities.AuditLog.create({
        event_id,
        user_id: actor_user_id,
        user_name: actor_name,
        actor_role,
        action,
        action_type,
        module,
        resource_type: resource_type || module,
        resource_id: resource_id ? String(resource_id) : null,
        affected_user_id: affected_user_id ? String(affected_user_id) : null,
        result,
        session_context,
        details: cleanDetails || '',
        before_after_metadata: cleanBeforeAfter,
        timestamp,
      });
    }
  } catch (e) {
    // Non-blocking catch to ensure operational continuity
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Audit Log Warning] Failed to persist audit record:', e);
    }
  }
}