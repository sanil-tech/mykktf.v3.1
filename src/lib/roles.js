export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'college_admin',
  WARDEN: 'warden',
  STAFF: 'staff',
  STUDENT: 'student',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  college_admin: 'College Administrator',
  warden: 'Warden',
  staff: 'Staff',
  student: 'Student',
};

export function hasAccess(userRole, allowedRoles) {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return allowedRoles.includes(userRole);
}

export function getNavItems(role) {
  const all = [
    { label: 'Dashboard', path: '/', icon: 'LayoutDashboard', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Students', path: '/students', icon: 'GraduationCap', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Rooms', path: '/rooms', icon: 'DoorOpen', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Check-In/Out', path: '/check-in-out', icon: 'ArrowLeftRight', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Leave', path: '/leave', icon: 'CalendarOff', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STUDENT] },
    { label: 'Maintenance', path: '/maintenance', icon: 'Wrench', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Visitors', path: '/visitors', icon: 'UserCheck', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Parcels', path: '/parcels', icon: 'Package', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Discipline', path: '/discipline', icon: 'ShieldAlert', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN] },
    { label: 'Facilities', path: '/facilities', icon: 'Building2', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.STUDENT] },
    { label: 'Attendance', path: '/attendance', icon: 'ClipboardCheck', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF] },
    { label: 'Announcements', path: '/announcements', icon: 'Megaphone', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.WARDEN, ROLES.STUDENT] },
    { label: 'Fees', path: '/fees', icon: 'CreditCard', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Reports', path: '/reports', icon: 'FileBarChart', roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN] },
    { label: 'Audit Log', path: '/audit-log', icon: 'ScrollText', roles: [ROLES.SUPER_ADMIN] },
  ];
  return all.filter(item => hasAccess(role, item.roles));
}