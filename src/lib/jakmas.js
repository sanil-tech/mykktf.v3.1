import { base44 } from '@/api/base44Client';
import { logAudit } from '@/lib/audit';

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

// Official JAKMAS Exco Portfolios KKTF Sesi 2025/2026 (Watikah Pengetua)
export const DEFAULT_EXCO_PORTFOLIOS = [
  'Exco Kebajikan dan Keselamatan (YDP)',
  'Exco Akademik dan Kepimpinan (NYDP)',
  'Exco Perhubungan Korporat dan Antarabangsa (SU)',
  'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)',
  'Exco Keusahawanan',
  'Exco Kesukarelawanan dan Kemasyarakatan',
  'Exco Media dan Publisiti',
  'Exco Sukan dan Rekreasi',
  'Exco Kesenian dan Kebudayaan'
];

export const OFFICIAL_EXCO_METADATA = [
  { id: 'exco_1', name: 'Exco Kebajikan dan Keselamatan (YDP)', shortName: 'Kebajikan & Keselamatan', attachedRole: 'YDP', icon: 'HeartHandshake', color: 'emerald' },
  { id: 'exco_2', name: 'Exco Akademik dan Kepimpinan (NYDP)', shortName: 'Akademik & Kepimpinan', attachedRole: 'NYDP', icon: 'GraduationCap', color: 'blue' },
  { id: 'exco_3', name: 'Exco Perhubungan Korporat dan Antarabangsa (SU)', shortName: 'Perhubungan Korporat & Antarabangsa', attachedRole: 'SU', icon: 'Globe', color: 'cyan' },
  { id: 'exco_4', name: 'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)', shortName: 'Kerohanian & Pembangunan Sahsiah', attachedRole: 'Bendahari', icon: 'Sparkles', color: 'amber' },
  { id: 'exco_5', name: 'Exco Keusahawanan', shortName: 'Keusahawanan', attachedRole: 'Exco', icon: 'Briefcase', color: 'indigo' },
  { id: 'exco_6', name: 'Exco Kesukarelawanan dan Kemasyarakatan', shortName: 'Kesukarelawanan & Kemasyarakatan', attachedRole: 'Exco', icon: 'Users', color: 'rose' },
  { id: 'exco_7', name: 'Exco Media dan Publisiti', shortName: 'Media & Publisiti', attachedRole: 'Exco', icon: 'Megaphone', color: 'purple' },
  { id: 'exco_8', name: 'Exco Sukan dan Rekreasi', shortName: 'Sukan & Rekreasi', attachedRole: 'Exco', icon: 'Medal', color: 'orange' },
  { id: 'exco_9', name: 'Exco Kesenian dan Kebudayaan', shortName: 'Kesenian & Kebudayaan', attachedRole: 'Exco', icon: 'Award', color: 'pink' }
];

export function isJakmasAdmin(role) {
  return role === 'super_admin' || role === 'college_admin' || role === 'principal';
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// Helpers for Felo Penyelaras Exco JAKMAS (Appointed directly by Pengetua Kolej Kediaman Tun Fuad)
export function getStoredCustomWardensFelos() {
  try {
    const raw = localStorage.getItem('kktf_custom_wardens_felos');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoredCustomWardenFelo(felo, actorUser) {
  const current = getStoredCustomWardensFelos();
  const existsIdx = current.findIndex(f => f.id === felo.id || (f.email && f.email.toLowerCase() === (felo.email || '').toLowerCase()));
  let updated;
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = {
      ...updated[existsIdx],
      ...felo,
      updated_at: new Date().toISOString(),
      updated_by: actorUser?.full_name || actorUser?.email
    };
  } else {
    const newEntry = {
      ...felo,
      id: felo.id || `felo-custom-${Date.now()}`,
      created_at: new Date().toISOString(),
      invited_by: actorUser?.full_name || 'Pengetua Kolej Kediaman Tun Fuad',
      status: felo.status || 'active'
    };
    updated = [newEntry, ...current];
  }
  try {
    localStorage.setItem('kktf_custom_wardens_felos', JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function getStoredFeloExcoAppointments() {
  try {
    const raw = localStorage.getItem('kktf_felo_exco_appointments');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 7) {
        // Semak status felo yang telah tamat perkhidmatan (cth: Cik Noor Aznadira)
        let changed = false;
        parsed.forEach(p => {
          if (p.id === 'felo-aznadira' || p.fellow_user_id === 'felo-aznadira') {
            if (p.status !== 'ended') {
              p.status = 'ended';
              p.notes = 'Tamat perkhidmatan di KKTF. Portfolio sedia untuk diselaraskan semula kepada Felo baharu yang dijemput.';
              changed = true;
            }
          }
        });
        if (changed) {
          localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(parsed));
        }
        return parsed;
      }
    }
  } catch (e) {}

  // Senarai Rasmi Penyelarasan Felo Mengikut Exco JAKMAS KKTF Sesi 2025/2026
  const officialAppointments = [
    {
      id: 'felo-saniyil',
      fellow_user_id: 'felo-saniyil',
      fellow_name: 'En. Saniyil Bansai',
      fellow_email: 'saniyil@ums.edu.my',
      block_assigned: 'Blok A',
      portfolios: [
        'Exco Kebajikan dan Keselamatan (YDP)',
        'Exco Sukan dan Rekreasi'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/01',
      notes: 'Penyelaras Kebajikan & Keselamatan serta Pengesah Tuntutan Merit Sukan Kolej.'
    },
    {
      id: 'felo-an-shaharizuan',
      fellow_user_id: 'felo-an-shaharizuan',
      fellow_name: 'Ts. Dr. An Mohd Shaharizuan',
      fellow_email: 'shaharizuan@ums.edu.my',
      block_assigned: 'Blok D',
      portfolios: [
        'Exco Kebajikan dan Keselamatan (YDP)',
        'Exco Akademik dan Kepimpinan (NYDP)',
        'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)',
        'Exco Keusahawanan'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/02',
      notes: 'Penyelaras Kepimpinan, Akademik, Sahsiah & Keusahawanan Mahasiswa.'
    },
    {
      id: 'felo-hafizie',
      fellow_user_id: 'felo-hafizie',
      fellow_name: 'En. Hafizie Potera',
      fellow_email: 'hafizie@ums.edu.my',
      block_assigned: 'Blok C',
      portfolios: [
        'Exco Kebajikan dan Keselamatan (YDP)',
        'Exco Perhubungan Korporat dan Antarabangsa (SU)',
        'Exco Kesenian dan Kebudayaan'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/03',
      notes: 'Penyelaras Kebajikan, Hubungan Korporat/Antarabangsa & Seni Budaya.'
    },
    {
      id: 'felo-norazilah',
      fellow_user_id: 'felo-norazilah',
      fellow_name: 'Puan Norazilah Tuman',
      fellow_email: 'norazilah@ums.edu.my',
      block_assigned: 'Blok B',
      portfolios: [
        'Exco Akademik dan Kepimpinan (NYDP)',
        'Exco Perhubungan Korporat dan Antarabangsa (SU)',
        'Exco Keusahawanan',
        'Exco Kesukarelawanan dan Kemasyarakatan'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/04',
      notes: 'Penyelaras Akademik, Kesukarelawanan, Keusahawanan & Perhubungan Korporat.'
    },
    {
      id: 'felo-narvinna',
      fellow_user_id: 'felo-narvinna',
      fellow_name: 'Cik Narvinna',
      fellow_email: 'narvinna@ums.edu.my',
      block_assigned: 'Blok E',
      portfolios: [
        'Exco Kerohanian dan Pembangunan Sahsiah (Bendahari)',
        'Exco Kesukarelawanan dan Kemasyarakatan',
        'Exco Sukan dan Rekreasi'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/05',
      notes: 'Penyelaras Kerohanian, Kesukarelawanan & Pengesah Sukan/Rekreasi.'
    },
    {
      id: 'felo-aznadira',
      fellow_user_id: 'felo-aznadira',
      fellow_name: 'Cik Noor Aznadira',
      fellow_email: 'aznadira@ums.edu.my',
      block_assigned: 'Blok F',
      portfolios: [
        'Exco Kesukarelawanan dan Kemasyarakatan',
        'Exco Sukan dan Rekreasi'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2025-12-31',
      status: 'ended', // Tidak bertugas di KKTF lagi
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/06',
      notes: 'Tamat perkhidmatan di KKTF. Portfolio sedia untuk diselaraskan semula kepada Felo baharu yang dijemput.'
    },
    {
      id: 'felo-asru',
      fellow_user_id: 'felo-asru',
      fellow_name: 'En. Asru Lakmal',
      fellow_email: 'asru@ums.edu.my',
      block_assigned: 'Blok G',
      portfolios: [
        'Exco Media dan Publisiti',
        'Exco Sukan dan Rekreasi',
        'Exco Kesenian dan Kebudayaan'
      ],
      appointed_by: 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: '2025-08-01',
      academic_session: 'Sesi 2025/2026',
      term_end: '2026-07-31',
      status: 'active',
      letter_ref: 'UMS/KKTF/WATIKAH-FELO/2025/07',
      notes: 'Penyelaras Media, Seni Budaya & Pengesah Rasmi Sukan/Rekreasi Kolej.'
    }
  ];

  try {
    localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(officialAppointments));
  } catch (e) {}

  return officialAppointments;
}

export function saveStoredFeloExcoAppointment(appointment, actorUser) {
  const current = getStoredFeloExcoAppointments();
  const existsIdx = current.findIndex(a => a.id === appointment.id);
  let updated;
  if (existsIdx >= 0) {
    updated = [...current];
    updated[existsIdx] = { 
      ...updated[existsIdx], 
      ...appointment, 
      updated_at: new Date().toISOString(),
      updated_by: actorUser?.full_name || actorUser?.email
    };
  } else {
    const newEntry = {
      ...appointment,
      id: appointment.id || `felo-exco-${Date.now()}`,
      appointed_by: actorUser?.full_name || 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: appointment.appointment_date || todayISO(),
      created_at: new Date().toISOString(),
      status: appointment.status || 'active'
    };
    updated = [newEntry, ...current];
  }
  try {
    localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed saving felo exco appointment:', e);
  }
  return updated;
}

export function deleteStoredFeloExcoAppointment(id) {
  const current = getStoredFeloExcoAppointments();
  const updated = current.filter(a => a.id !== id);
  try {
    localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(updated));
  } catch (e) {}
  return updated;
}

export function terminateFeloService(feloId, reason, actorUser) {
  const current = getStoredFeloExcoAppointments();
  const idx = current.findIndex(f => f.id === feloId || f.fellow_user_id === feloId);
  if (idx >= 0) {
    const updated = [...current];
    updated[idx] = {
      ...updated[idx],
      status: 'ended',
      service_ended_at: todayISO(),
      notes: reason ? `${reason} (Disahkan oleh ${actorUser?.full_name || 'Pengetua KKTF'})` : 'Tamat perkhidmatan di KKTF.'
    };
    try {
      localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
}

export function reactivateFeloService(feloId, actorUser) {
  const current = getStoredFeloExcoAppointments();
  const idx = current.findIndex(f => f.id === feloId || f.fellow_user_id === feloId);
  if (idx >= 0) {
    const updated = [...current];
    updated[idx] = {
      ...updated[idx],
      status: 'active',
      reactivated_at: todayISO(),
      notes: `Diaktifkan semula berkhidmat di KKTF oleh ${actorUser?.full_name || 'Pengetua KKTF'}.`
    };
    try {
      localStorage.setItem('kktf_felo_exco_appointments', JSON.stringify(updated));
    } catch (e) {}
    return updated;
  }
  return current;
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
export function computeEffectiveRole(baseRole, appointment, userOrEmail = '') {
  const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail?.email;
  
  // Specific Principal mapping for Kolej Kediaman Tun Fuad
  if (baseRole === 'principal' || email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com') {
    return 'principal';
  }

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
  return logAudit(user, action, module, details);
}