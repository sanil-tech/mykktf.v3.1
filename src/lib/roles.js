export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'college_admin',
  WARDEN: 'warden',
  STAFF: 'staff',
  JAKMAS: 'jakmas',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  college_admin: 'College Administrator',
  warden: 'Warden',
  staff: 'Staff',
  jakmas: 'JAKMAS',
  student: 'Student',
};

export function hasAccess(userRole, allowedRoles) {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return allowedRoles.includes(userRole);
}

export function getNavItems(role) {
  const all = [
    { label: 'Dashboard', path: '/', icon: 'LayoutDashboard', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Students', path: '/students', icon: 'GraduationCap', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Resident Directory', path: '/directory', icon: 'Users', roles: [ROLES.JAKMAS] },
    { label: 'Rooms', path: '/rooms', icon: 'DoorOpen', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Check-In/Out', path: '/check-in-out', icon: 'ArrowLeftRight', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Leave', path: '/leave', icon: 'CalendarOff', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STUDENT] },
    { label: 'Leave Monitor', path: '/leave-monitor', icon: 'CalendarCheck', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Maintenance', path: '/maintenance', icon: 'Wrench', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Facilities', path: '/facilities', icon: 'Building2', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Attendance', path: '/attendance', icon: 'ClipboardCheck', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Announcements', path: '/announcements', icon: 'Megaphone', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Events', path: '/events', icon: 'CalendarDays', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Complaints', path: '/complaints', icon: 'MessageSquare', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Community Chat', path: '/chat', icon: 'MessagesSquare', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.JAKMAS, ROLES.STUDENT] },
    { label: 'Reports', path: '/reports', icon: 'FileBarChart', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Survey Analytics', path: '/survey-analytics', icon: 'Star', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Block Assignments', path: '/block-assignment', icon: 'UserCog', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'JAKMAS Management', path: '/jakmas-management', icon: 'UserCog', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'AI Knowledge', path: '/ai-knowledge', icon: 'Sparkles', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'My JAKMAS Tasks', path: '/jakmas-tasks', icon: 'ClipboardList', roles: [ROLES.JAKMAS] },
    { label: 'Audit Log', path: '/audit-log', icon: 'ScrollText', roles: [ROLES.SUPER_ADMIN] },
  ];
  return all.filter(item => hasAccess(role, item.roles));
}