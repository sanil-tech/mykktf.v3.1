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
    { label: 'Dashboard', path: '/', icon: 'LayoutDashboard', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Imbas Pas Residen', path: '/scan-resident', icon: 'ScanLine', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS] },
    { label: 'Students', path: '/students', icon: 'GraduationCap', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Resident Directory', path: '/directory', icon: 'Users', roles: [] },
    { label: 'Rooms', path: '/rooms', icon: 'DoorOpen', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Check-In/Out', path: '/check-in-out', icon: 'ArrowLeftRight', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Pemeriksaan Bilik (48 Jam)', path: '/room-inspections', icon: 'CheckSquare', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Leave', path: '/leave', icon: 'CalendarOff', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STUDENT] },
    { label: 'Leave Monitor', path: '/leave-monitor', icon: 'CalendarCheck', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Damage Reports', path: '/maintenance', icon: 'Wrench', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Facilities', path: '/facilities', icon: 'Building2', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Attendance', path: '/attendance', icon: 'ClipboardCheck', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Merit & Dimerit', path: '/merit-demerit', icon: 'Award', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Announcements', path: '/announcements', icon: 'Megaphone', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Events', path: '/events', icon: 'CalendarDays', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Feedback & Welfare', path: '/complaints', icon: 'HeartHandshake', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Community Chat', path: '/chat', icon: 'MessagesSquare', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Reports', path: '/reports', icon: 'FileBarChart', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Survey Analytics', path: '/survey-analytics', icon: 'Star', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'Block Assignments', path: '/block-assignment', icon: 'UserCog', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'JAKMAS Management', path: '/jakmas-management', icon: 'UserCog', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'AI Knowledge', path: '/ai-knowledge', icon: 'Sparkles', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN] },
    { label: 'My JAKMAS Tasks', path: '/jakmas-tasks', icon: 'ClipboardList', roles: [], jakmasOnly: true },
    { label: 'Audit Log', path: '/audit-log', icon: 'ScrollText', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL] },
    { label: 'Buku Panduan MyKKTF', path: '/guide', icon: 'BookOpen', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Hab Perhubungan & Hotline', path: '/contact', icon: 'PhoneCall', roles: [ROLES.SUPER_ADMIN, ROLES.PRINCIPAL, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
  ];
  const base = all.filter(item => hasAccess(role, item.roles));
  if (!hasJakmas) return base;
  return [...base, ...all.filter(item => item.jakmasOnly)];
}