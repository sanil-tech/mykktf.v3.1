# MyKKTF Role-Based Access Control (RBAC) Matrix

**Document Version**: 1.0  
**Effective Date**: September 2026  
**System**: MyKKTF — Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah  

---

## 1. Supported Roles

1. `SYSTEM_ADMIN` (`super_admin`): System configuration, audit logs, technical security management.
2. `PENGETUA` (`principal`): College Executive, disciplinary oversight, welfare governance, institutional reports.
3. `PENGURUSAN_ADMIN` (`college_admin`): Residential administration, check-ins, room allotments, leave governance.
4. `FELO` (`warden`): Residential block welfare, student care, leave approvals, disciplinary hearings.
5. `STAFF` (`staff`): Operational tasks, key reception, facility bookings, room inspections.
6. `JAKMAS` (`jakmas`): Student committee for events, activities, voting, and student assistance.
7. `PELAJAR` (`student` / `user`): Residing student with self-service access to own data.

---

## 2. Granular Capability Enforcement Matrix

| Capability / Permission | SYSTEM_ADMIN | PENGETUA | PENGURUSAN_ADMIN | FELO | STAFF | JAKMAS | PELAJAR |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `canViewStudentBasicProfile` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Own Only |
| `canViewSensitiveProfile` (Unmasked IC/Parent) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Own Only |
| `canAccessMedicalData` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | Own Only |
| `canViewDisciplinaryRecord` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Own Only |
| `canManageDisciplinaryRecord` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `canViewWelfareRecord` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | Own Only |
| `canManageWelfareRecord` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `canManageRoom` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `canApproveLeave` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canScanResidents` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `canManageCheckInOut` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | Own Only |
| `canExportStudentData` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canViewAuditLog` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `canManagePrivacyNotices` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canManageIncidents` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canRequestDataCorrection` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `canApproveDataCorrection` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `canPerformDataRetention` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `canManageUsers` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `canModifyRoles` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. Strict Least-Privilege Rules for JAKMAS

- JAKMAS members are student leaders and MUST NEVER be granted access to:
  1. Full IC or Passport numbers of other students (`ic_passport`).
  2. Disciplinary infractions or warning letters (`DisciplineRecord`).
  3. Confidential welfare case files or counselor notes (`Complaint`).
  4. Medical, allergy, or disability disclosures.
  5. Bulk data export (CSV/Excel/PDF) of student rosters.
