import { base44 } from '@/api/base44Client';

// Appointment statuses
export const JAKMAS_STATUSES = ['pending', 'active', 'suspended', 'expired', 'ended'];

// Configurable JAKMAS positions (free-text accepted; these are suggested defaults)
export const JAKMAS_POSITIONS = [
  'JAKMAS Chairperson',
  'JAKMAS Vice Chairperson',
  'JAKMAS Secretary',
  'JAKMAS Treasurer',
  'JAKMAS Exco Member',
  'JAKMAS Committee Member',
];

// Configurable portfolios (free-text accepted)
export const JAKMAS_PORTFOLIOS = [
  'Student Welfare',
  'Student Activities',
  'Sports',
  'Academic',
  'Communication',
  'Community',
  'Religious / Spiritual',
  'Events',
  'Student Engagement',
  'Other',
];

// Task workflow
export const JAKMAS_TASK_STATUSES = [
  'assigned', 'acknowledged', 'in_progress', 'submitted', 'approved', 'returned', 'cancelled',
];

export const JAKMAS_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export function isJakmasAdmin(role) {
  return role === 'super_admin' || role === 'college_admin';
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Authoritative active check: status === 'active' AND within term dates.
 * This is what grants JAKMAS capability. An expired term_end means NOT active
 * regardless of stored status (automatic functional expiration).
 */
export function isActiveAppointment(appt, today = todayISO()) {
  if (!appt) return false;
  if (appt.status !== 'active') return false;
  if (appt.term_end && appt.term_end < today) return false;
  // term_start is the official start-of-term date (record only). A status of
  // 'active' grants JAKMAS capability immediately upon appointment, even if
  // term_start is in the future — the admin has appointed them now.
  return true;
}

/**
 * Whether the official term has started. Used to show a "term starts on" label
 * when an active appointment's term_start is still in the future.
 */
export function isTermStarted(appt, today = todayISO()) {
  if (!appt?.term_start) return true;
  return appt.term_start <= today;
}

/**
 * Compute the effective role used for UI routing/navigation.
 * Only students (base_role student/user/none) can gain JAKMAS capability via
 * an active appointment. Wardens/staff/admins keep their base role.
 */
export function computeEffectiveRole(baseRole, appointment) {
  // JAKMAS is appointment-gated, not a permanent role. A user whose base role is
  // student/user/jakmas gains JAKMAS capability ONLY via an active appointment;
  // without one they behave as a normal student. Wardens/staff/admins keep their
  // base role (JAKMAS appointment never grants warden/staff/admin authority).
  if (!baseRole || baseRole === 'student' || baseRole === 'user' || baseRole === 'jakmas') {
    return isActiveAppointment(appointment) ? 'jakmas' : 'student';
  }
  return baseRole;
}

export async function fetchActiveJakmasAppointment(userId) {
  if (!userId) return null;
  try {
    const appts = await base44.entities.JakmasAppointment.filter({ student_user_id: userId });
    const today = todayISO();
    return appts.find((a) => isActiveAppointment(a, today)) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch the most relevant appointment (active preferred, else latest) for display.
 */
export async function fetchCurrentJakmasAppointment(userId) {
  if (!userId) return null;
  try {
    const appts = await base44.entities.JakmasAppointment.filter({ student_user_id: userId });
    const today = todayISO();
    const active = appts.find((a) => isActiveAppointment(a, today));
    if (active) return active;
    // newest by appointed_at
    return appts.sort((a, b) => (b.appointed_at || '').localeCompare(a.appointed_at || ''))[0] || null;
  } catch (e) {
    return null;
  }
}

export async function logJakmasAudit(user, action, module, details) {
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