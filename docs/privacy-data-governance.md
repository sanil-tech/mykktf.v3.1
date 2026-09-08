# MyKKTF Privacy, Personal Data Protection & Data Governance Framework

**System**: MyKKTF — Sistem Pengurusan Digital Kolej Kediaman Tun Fuad  
**Institution**: Kolej Kediaman Tun Fuad (KKTF), Universiti Malaysia Sabah (UMS)  
**Document Version**: 2.0 (Post-Audit Hardened Edition)  
**Effective Date**: September 2026  
**Statutory & Policy Alignment**: Malaysian Personal Data Protection Act 2010 (Act 709) & Personal Data Protection (Amendment) Act 2024  

---

## 1. Executive Summary & Governance Objectives

The MyKKTF platform processes personal data relating to university students (principally aged 18 and above) residing at Kolej Kediaman Tun Fuad, UMS. This framework embeds **Privacy by Design**, **Least Privilege**, **Purpose Limitation**, **Data Minimisation**, **Tamper-Resistant Auditability**, and **Breach Readiness** into the application architecture.

---

## 2. Core Privacy Principles Implemented

### 2.1 Least Privilege & Granular RBAC
- **Server-Side Capability Verification**: Access control does not rely solely on hiding frontend navigation items. Every data query, projection, and export operation validates actor permissions via `src/lib/permissions.js`.
- **JAKMAS Least-Privilege Rule**: The student representative body (JAKMAS) is strictly barred from accessing raw identification card numbers (`ic_passport`), confidential disciplinary logs, private welfare counseling cases, and bulk student data exports.
- **Warden (Felo) Block Scoping**: Wardens have operational visibility restricted to their designated residential blocks (`WardenBlock`).

### 2.2 Purpose Limitation & Field Minimisation
- Each field collected across the 29 system entities has a registered purpose and statutory basis.
- High-risk fields (such as identity card numbers and parent telephone numbers) are masked (`maskIC`, `maskPhone`) in all general operational directories and table projections.

### 2.3 Transparent Privacy Notice & Versioned Acknowledgement
- Users are presented with a clear Privacy Notice (`PrivacyNoticeModal.jsx`) detailing data collection, processing purposes, authorized recipient classes, and self-service correction rights.
- Explicit version tracking records `privacy_notice_version`, `privacy_notice_user_id`, and `acknowledged_at` in `PrivacyAcknowledgement` entity.

### 2.4 Tamper-Resistant Audit Logging
- High-risk operations (profile lookups, leave approvals, room reassignments, role changes, data exports, file downloads, and incident handling) generate non-repudiable audit trails via `src/lib/audit.js`.
- Audit logs contain `event_id`, `actor_role`, `resource_type`, `resource_id`, `affected_user_id`, `result`, and `session_context`.

### 2.5 Export Control
- Bulk CSV, Excel, and PDF exports are gated behind `canExportStudentData`.
- Sensitive fields are stripped or masked by default, and all exports trigger an automated audit log entry detailing actor, record count, and stated administrative purpose.

### 2.6 Data Subject Self-Service & Correction Requests
- Students can review their personal data via `MyProfile.jsx` and submit formal Data Correction Requests (`CorrectionRequest`) for authoritative records, preventing unauthorized direct mutations while ensuring data accuracy.

### 2.7 Incident Readiness & Escalation Protocol
- A structured Data Incident module (`src/lib/dataIncidents.js`) manages incident workflows (`DETECTED` ➔ `CONTAINED` ➔ `UNDER_INVESTIGATION` ➔ `ESCALATED` ➔ `REMEDIATED` ➔ `CLOSED`).
- Incidents can be escalated internally to designated UMS Data Protection Officers (DPO) and Jabatan Digital officers.

---

## 3. Institutional Governance Boundaries

> [!NOTE]
> - **Formal Legal Confirmation**: While this architecture aligns with good Malaysian data protection practices (PDPA Act 709 / Amendment Act 2024), formal legal applicability to UMS statutory bodies must be confirmed by authorized UMS Legal Advisers and Jabatan Digital officers.
> - **UMS IdP / SSO Integration**: Future integration with UMS centralized Single Sign-On (SAML 2.0 / OpenID Connect) is recommended when official APIs are provisioned by Jabatan Digital.
