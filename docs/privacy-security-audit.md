# MYKKTF v3.1 — HISTORICAL BASELINE PRIVACY & SECURITY AUDIT REPORT

> [!NOTE]
> **Historical baseline audit — pre-Phase-2 findings**: This document represents the initial pre-remediation discovery baseline audit. For the active verified audit and forensic reconciliation, refer to [privacy-phase2-audit.md](file:///c:/Users/sanil/OneDrive/Desktop/studyquest-ai-1/quantumAI/scratch/mykktf.v3.1/docs/privacy-phase2-audit.md) and [phase2.1-security-reconciliation.md](file:///c:/Users/sanil/OneDrive/Desktop/studyquest-ai-1/quantumAI/scratch/mykktf.v3.1/docs/phase2.1-security-reconciliation.md).

**System**: MyKKTF (Digital Residential College Management System)  
**Institution**: Kolej Kediaman Tun Fuad (KKTF), Universiti Malaysia Sabah (UMS)  
**Framework Alignment**: Technical Privacy Baselines & Malaysian PDPA Principles (Act 709)  
**Date of Initial Audit**: September 2026  
**Auditor**: Antigravity Privacy & Security Engineering Subagent  

---

## 1. Executive Summary

This audit report evaluates the existing MyKKTF v3.1 application architecture, data flows, access controls, entity schemas, and user interfaces against standard Malaysian personal data protection principles (Least Privilege, Purpose Limitation, Data Minimisation, Secure Processing, Retention Control, Auditability, and Breach Readiness).

---

## 2. Detailed Audit by 20 Dimensions

### 1. Authentication Architecture
- **Current State**: Built around `@base44/sdk` authentication (`base44.auth.me()`) with localStorage caching (`mykktf_mapek_guest`, `mykktf_active_persona`).
- **Findings**:
  - `[HIGH]` Hardcoded persona switching override for specific development email addresses (`sanil@ums.edu.my`) in client-side config.
  - `[MEDIUM]` Lack of account lockout and rate-limiting on failed password attempts.
  - `[INFORMATIONAL]` Institutional SSO (e.g. UMS IdP / SAML 2.0 / OIDC) is not yet integrated; accounts rely on Base44 auth.

### 2. User Roles and Permissions
- **Current State**: Roles defined in `src/lib/roles.js`: `SUPER_ADMIN`, `PRINCIPAL`, `ADMIN` (`college_admin`), `WARDEN`, `STAFF`, `JAKMAS`, `STUDENT`.
- **Findings**:
  - `[HIGH]` RBAC was predominantly enforced at the navigation and view level (`hasAccess`) rather than granular, server-side / capability-level filters.
  - `[MEDIUM]` `SUPER_ADMIN` and `PRINCIPAL` bypass all checks indiscriminately, requiring separation of technical configuration from sensitive operational inspection.

### 3. Database Tables Containing Personal Data
- **Current State**: 29 Base44 entities.
- **Key Tables with Personal Data**:
  - `Student`: Full name, matric number, IC/passport, phone, email, room, gender, race, religion, date of birth, emergency contact, parent info.
  - `LeaveApplication`: Destination address, travel reasons, emergency contact, leave dates.
  - `Complaint`: Private grievances, welfare issues, emotional/mental distress notes, room-level conflicts.
  - `DisciplineRecord`: Offence type, penalty, warden notes, hearing transcripts, demit points.
  - `CheckIn` / `CheckOut` / `DropKey`: Timestamps, key returns, room keys, condition photos.
  - `Attendance`: Event and residential curfew check-in records.
  - `Survey`: Personal student opinions and satisfaction metrics.
  - `Visitor`: External visitor names, IC/passport numbers, contact numbers, vehicle plates.
- **Findings**:
  - `[CRITICAL]` High concentration of direct personal identifiers without unified classification tags.

### 4. Sensitive or High-Risk Data Fields
- **Identified Sensitive Fields**:
  - `ic_passport` (National Registration Identity Card / Passport numbers).
  - Emergency contact phone numbers, relationship, parent occupation, and income bracket.
  - Medical/disability notes in student profile and leave applications.
  - Confidential disciplinary records and investigation notes (`DisciplineRecord`).
  - Welfare complaint logs and mental health flags (`Complaint`).
- **Findings**:
  - `[CRITICAL]` `ic_passport` stored in plain text and rendered in raw form on general directory and reporting pages.

### 5. APIs and Endpoints Exposing Student Information
- **Current State**: Base44 entity client APIs (`base44.entities.Student.list()`, `.filter()`).
- **Findings**:
  - `[HIGH]` Base entity queries in frontend components retrieve complete student objects (over-fetching) including `ic_passport`, `parent_phone`, and `emergency_phone`.

### 6. Frontend Pages Displaying Student Information
- **Pages**: `Students.jsx`, `Reports.jsx`, `ResidentDirectory.jsx`, `CheckInOut.jsx`, `AttendancePage.jsx`, `MyProfile.jsx`, `ResidentScanner.jsx`.
- **Findings**:
  - `[HIGH]` `Students.jsx` and `Reports.jsx` displayed unmasked IC/passport numbers and personal telephone contacts in table rows.
  - `[MEDIUM]` `ResidentDirectory.jsx` exposes room numbers and phone numbers across general college residents if not strictly scoped.

### 7. Export and Download Functionality
- **Current State**: `Reports.jsx` and `MeritDemerit.jsx` provide client-side CSV, Excel, and PDF export functions (`jspdf`, table-to-CSV).
- **Findings**:
  - `[CRITICAL]` Exports included unmasked IC numbers, matric numbers, and phone numbers in raw CSV dumps.
  - `[HIGH]` Exports were not logged in the audit trail, meaning data exfiltration could not be tracked.
  - `[HIGH]` JAKMAS members could potentially trigger bulk student data exports.

### 8. Search Functionality Exposing Excessive Information
- **Current State**: Live client-side filtering on student names, IC numbers, matric numbers, and rooms.
- **Findings**:
  - `[MEDIUM]` Searching by partial IC number exposed full student profiles in live search dropdowns.

### 9. Audit Logging Currently Implemented
- **Current State**: Basic `AuditLog` entity (`user_id`, `user_name`, `action`, `module`, `details`, `timestamp`).
- **Findings**:
  - `[HIGH]` Missing actor role, resource type, resource ID, affected student ID, execution result status, and session IP/device context.
  - `[HIGH]` Read/view access to sensitive disciplinary or welfare records was not logged.
  - `[MEDIUM]` Audit log was vulnerable to omission if actions failed silently.

### 10. Data Deletion and Retention Behaviour
- **Current State**: No automated or manual retention management; records remain indefinitely.
- **Findings**:
  - `[HIGH]` No archival or retention classification for graduated alumni vs active residents.
  - `[MEDIUM]` Orphaned records exist across old checkout and room inspection records without lifecycle tags.

### 11. File and Document Upload Storage
- **Current State**: Uploads handled via Base44 storage/CDN for room damage photos, drop-key photos, and event attachments.
- **Findings**:
  - `[MEDIUM]` Filenames were original user filenames without UUID obfuscation.
  - `[LOW]` Missing explicit client-side MIME-type and maximum file-size validation guardrails.

### 12. Cloud Storage and Third-Party Services
- **Services Used**:
  - Base44 Backend & Storage Platform
  - Resend (Transactional Email)
  - OpenStreetMap / Leaflet (Geocoding tiles)
  - Google Fonts (Typography)
- **Findings**:
  - `[INFORMATIONAL]` Third-party data flows require formal documentation in a Data Processor Map.

### 13. Environment Variables and Credentials Handling
- **Current State**: Standard Vite `.env` variables for Base44 app keys.
- **Findings**:
  - `[LOW]` Secrets are kept client-safe; no private API tokens are leaked in frontend bundles.

### 14. Direct Database Access Paths
- **Current State**: Base44 SDK entity layer.
- **Findings**:
  - `[MEDIUM]` Client-side entity calls require centralized security wrappers to prevent Broken Object Level Authorisation (BOLA / IDOR).

### 15. Admin Access Privileges
- **Current State**: `super_admin` has blanket access.
- **Findings**:
  - `[MEDIUM]` Need principle of least privilege: technical admin should focus on system configuration, with sensitive student personal notes restricted to college management.

### 16. JAKMAS Access Privileges
- **Current State**: Student leadership body (JAKMAS) handles sports, events, voting, and residential tasks.
- **Findings**:
  - `[CRITICAL]` JAKMAS must never have access to full IC numbers, disciplinary hearings, confidential welfare records, or bulk student exports.

### 17. Felo (Warden) Access Privileges
- **Current State**: Wardens oversee specific residential blocks and welfare.
- **Findings**:
  - `[MEDIUM]` Felo access should follow block assignment scope where appropriate and restrict technical settings.

### 18. Staff Access Privileges
- **Current State**: Administrative staff handle check-ins, check-outs, drop-keys, and facilities.
- **Findings**:
  - `[MEDIUM]` Staff should not have access to private disciplinary deliberation transcripts or full medical records unless authorized.

### 19. Student Self-Service Access
- **Current State**: Students view their profile, register for rooms, submit leave and complaints.
- **Findings**:
  - `[HIGH]` Students lacked a formal Data Subject Request / Correction workflow for authoritative matriculation data.
  - `[HIGH]` No versioned Privacy Notice acknowledgement mechanism existed.

### 20. Summary of Weaknesses Discovered & Severity Matrix

| ID | Finding | Severity | Category |
|---|---|---|---|
| SEC-01 | Unmasked IC/Passport numbers in UI and CSV exports | **CRITICAL** | Data Protection / Masking |
| SEC-02 | Unaudited and unrestricted bulk student data exports | **CRITICAL** | Export Control / Leakage |
| SEC-03 | Missing granular capability permissions for JAKMAS/Staff | **CRITICAL** | Access Control (RBAC) |
| SEC-04 | Over-fetching of sensitive fields in student list queries | **HIGH** | Data Minimisation |
| SEC-05 | Incomplete audit logging schema (lacking actor role, target ID, result) | **HIGH** | Auditability |
| SEC-06 | Absence of versioned Privacy Notice acknowledgement mechanism | **HIGH** | Privacy Governance |
| SEC-07 | Lack of Data Subject Correction Request workflow | **HIGH** | Data Subject Rights |
| SEC-08 | No data retention lifecycle or archival framework | **HIGH** | Retention Management |
| SEC-09 | Potential IDOR risks on student profile and complaint lookups | **MEDIUM** | Authorization (BOLA) |
| SEC-10 | Raw filenames and unvalidated upload limits | **MEDIUM** | File Security |
| SEC-11 | Hardcoded dev email bypass checks in client configuration | **MEDIUM** | Auth Hardening |
| SEC-12 | Undocumented third-party cloud data processor flows | **INFORMATIONAL** | Governance / Mapping |

---
**Audit Status**: COMPLETED  
**Remediation Plan**: Proceed to Phases 2 through 20.
