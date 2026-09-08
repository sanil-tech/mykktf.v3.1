export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PRINCIPAL: 'principal',
  ADMIN: 'college_admin',
  WARDEN: 'warden',
  STAFF: 'staff',
  JAKMAS: 'jakmas',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  super_admin: 'Pentadbir Sistem (IT)',
  principal: 'Pengetua Kolej',
  college_admin: 'Ketua Pentadbiran',
  warden: 'Felo / Warden',
  staff: 'Staf Pentadbiran',
  jakmas: 'JAKMAS',
  student: 'Pelajar / Residen',
  user: 'Pelajar / Residen',
};

export function hasAccess(userRole, allowedRoles) {
  if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PRINCIPAL) {
    // Super Admin & Principal have full access to executive and administrative views
    return true;
  }
  const effective = (!userRole || userRole === 'user') ? ROLES.STUDENT : userRole;
  return allowedRoles.includes(effective);
}

export function getNavItems(role, hasJakmas = false) {
  const all = [
    // =========================================================================
    // 1. UTAMA (Daily / Kekerapan Tertinggi untuk Semua Peranan)
    // =========================================================================
    { label: 'Dashboard', path: '/', icon: 'LayoutDashboard', section: 'Utama', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'E-Voting Calon JAKMAS', path: '/voting', icon: 'Vote', section: 'Utama', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Pengumuman & Hebahan', path: '/announcements', icon: 'Megaphone', section: 'Utama', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Acara & Program Kolej', path: '/events', icon: 'CalendarDays', section: 'Utama', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Mata Merit & Dimerit', path: '/merit-demerit', icon: 'Award', section: 'Utama', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },

    // =========================================================================
    // 2. KEDIAMAN & KEBAJIKAN (Operasi Harian & Keselesaan Residen)
    // =========================================================================
    { label: 'Pemeriksaan Bilik (48 Jam)', path: '/room-inspections', icon: 'CheckSquare', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Aduan & Pembaikan Kerosakan', path: '/maintenance', icon: 'Wrench', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Permohonan Keluar Kolej', path: '/leave', icon: 'CalendarOff', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STUDENT] },
    { label: 'Pemantauan Keluar Kolej', path: '/leave-monitor', icon: 'CalendarCheck', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Tempahan Kemudahan', path: '/facilities', icon: 'Building2', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Saluran Kebajikan & Aduan', path: '/complaints', icon: 'HeartHandshake', section: 'Kediaman & Kebajikan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },

    // =========================================================================
    // 3. OPERASI & PENTADBIRAN (Pengurusan Bilik, Pelajar & Verifikasi)
    // =========================================================================
    { label: 'Imbas Pas Residen', path: '/scan-resident', icon: 'ScanLine', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS] },
    { label: 'Daftar Masuk / Keluar', path: '/check-in-out', icon: 'ArrowLeftRight', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Peti Drop-Key (Express)', path: '/drop-key', icon: 'KeyRound', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Senarai Pelajar (Students)', path: '/students', icon: 'GraduationCap', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Pengurusan Bilik & Blok', path: '/rooms', icon: 'DoorOpen', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Pengesahan Kehadiran Kolej', path: '/attendance', icon: 'ClipboardCheck', section: 'Operasi & Pentadbiran', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Tugasan JAKMAS Saya', path: '/jakmas-tasks', icon: 'ClipboardList', section: 'Operasi & Pentadbiran', roles: [], jakmasOnly: true },

    // =========================================================================
    // 4. PENGURUSAN & ANALISIS (Eksekutif, Tadbir Urus & Laporan Kolej)
    // =========================================================================
    { label: 'Laporan & Statistik', path: '/reports', icon: 'FileBarChart', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Analisis Maklum Balas', path: '/survey-analytics', icon: 'Star', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Agihan Blok Felo', path: '/block-assignment', icon: 'UserCog', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Pengurusan JAKMAS', path: '/jakmas-management', icon: 'UserCog', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Pangkalan Pengetahuan AI', path: '/ai-knowledge', icon: 'Sparkles', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Tadbir Urus Data & Privasi', path: '/privacy-dashboard', icon: 'ShieldCheck', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Log Audit Keselamatan', path: '/audit-log', icon: 'ScrollText', section: 'Pengurusan & Analisis', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL] },

    // =========================================================================
    // 5. KOMUNITI & BANTUAN (Komunikasi, SOP & Rujukan Rasmi)
    // =========================================================================
    { label: 'Sembang Komuniti', path: '/chat', icon: 'MessagesSquare', section: 'Komuniti & Bantuan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Hab Perhubungan & Hotline', path: '/contact', icon: 'PhoneCall', section: 'Komuniti & Bantuan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Buku Panduan MyKKTF', path: '/guide', icon: 'BookOpen', section: 'Komuniti & Bantuan', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
  ];
  const base = all.filter(item => hasAccess(role, item.roles));
  if (!hasJakmas) return base;
  return [...base, ...all.filter(item => item.jakmasOnly)];
}