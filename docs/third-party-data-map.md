# MyKKTF Third-Party & Cloud Data Processing Map

**Document Version**: 1.0  
**Effective Date**: September 2026  
**System**: MyKKTF — Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah  

---

## 1. Cloud & Third-Party Processors Registry

| Service Name | Purpose | Data Sent / Processed | Data Sensitivity | Hosting / Geographic Region | Encryption in Transit & Rest | Retention & Deletion Control |
|---|---|---|---|---|---|---|
| **Base44 Cloud Platform** | Core Backend, DB & Auth Engine | User accounts, student profiles, residential records, complaints, audit logs. | **CONFIDENTIAL & SENSITIVE** | Cloud (Managed Infrastructure) | TLS 1.3 / AES-256 | Controlled via Base44 entity lifecycle and retention policies. |
| **Resend (Email Gateway)** | System notifications, password resets & announcement alerts | Student name, recipient email, college announcement summaries. | **INTERNAL & CONFIDENTIAL** | US / Global (Cloud Gateway) | TLS in transit | Retained temporarily in delivery log (approx. 30 days) then purged. |
| **OpenStreetMap / Leaflet** | Residential navigation & college map rendering | Client coordinates for map tile requests only (no PII sent). | **PUBLIC** | Global CDN / OpenStreetMap Foundation | HTTPS | Stateless; no personal data retained. |
| **Google Fonts** | Application UI typography (Outfit / Inter fonts) | Browser IP and User-Agent on initial stylesheet request (no PII sent). | **PUBLIC** | Global CDN | HTTPS | Cached by browser client. |

---

## 2. Cross-Border Data Transfer Considerations

- Under the Malaysian Personal Data Protection Act 2010 (Act 709) and the 2024 Amendments:
  - Personal student data should ideally reside within servers operating in Malaysia or jurisdictions offering adequate data protection standards.
  - Institutional confirmation: UMS Jabatan Digital should confirm and approve the cloud hosting regions and ensure appropriate Data Processing Agreements (DPA) are executed with third-party vendors.
