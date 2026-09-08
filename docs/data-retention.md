# MyKKTF Data Retention & Deletion Governance Policy

**Document Version**: 1.0  
**Effective Date**: September 2026  
**System**: MyKKTF — Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah  

---

## 1. Principles of Data Retention

In alignment with the Malaysian Personal Data Protection Act 2010 (Act 709) and institutional academic standards:
1. **Purpose Limitation**: Personal data must not be kept longer than necessary for the fulfillment of collegiate housing, welfare, disciplinary, and safety management.
2. **Safe Archival & Anonymisation**: Upon expiration of retention periods, records are transitioned from `ACTIVE` to `ARCHIVED` or `ANONYMIZED` state rather than destructive hard-deletions that could corrupt relational integrity.
3. **Auditability**: All lifecycle transitions and anonymization operations are recorded in the `AuditLog`.

---

## 2. Retention Schedule

| Data Category | Retention Period | Post-Expiry Action | Statutory / Operational Basis |
|---|:---:|:---:|---|
| **Active Student Profile** | Duration of active residence + 12 months | `ARCHIVE` | Residential management, key handover, emergency contact. |
| **Alumni / Former Resident** | 5 Years post-departure | `ANONYMIZE` | Historical merit verification and college alumni network. |
| **Curfew & Attendance Logs** | 2 Years | `ARCHIVE` | Disciplinary verification and merit calculation audit. |
| **Leave Applications** | 2 Years | `ARCHIVE` | Welfare safety audit and warden oversight. |
| **Disciplinary Records** | 7 Years | `RESTRICT` | University student disciplinary regulations. |
| **Confidential Welfare Cases** | 3 Years | `RESTRICT` | Student counseling and welfare support history. |
| **Security Audit Logs** | 7 Years | `ARCHIVE` | Cybersecurity compliance and legal dispute readiness. |

---

## 3. Orphaned Data & Missing Retention Mechanisms Report

Before this implementation, the following datasets lacked automated lifecycle and retention tags:
1. Historical Check-In/Check-Out logs from previous academic sessions.
2. Old room inspection photographic evidence stored without expiry metadata.
3. Obsolete temporary visitor check-in logs.

**Action Taken**:
- Implemented `RETENTION_LIFECYCLE_STATUS` flags across core entities.
- Prepared safe anonymisation routines (`anonymizeStudentRecord`) to scrub direct identifiers when triggered by authorized college administrators.
