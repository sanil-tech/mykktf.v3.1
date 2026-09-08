# MyKKTF Data Classification Framework

**Document Version**: 1.0  
**Effective Date**: September 2026  
**System**: MyKKTF — Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah  
**Standards Reference**: Malaysian Personal Data Protection Act 2010 (Act 709) & Personal Data Protection (Amendment) Act 2024  

---

## 1. Classification Tiers

| Tier | Category Name | Description | Handling & Access Controls | Examples |
|---|---|---|---|---|
| **Tier 1** | **PUBLIC** | Information freely accessible to any member of the public without privacy impact. | No special encryption or masking required. Free distribution. | General college announcements, public events, building locations, college guide. |
| **Tier 2** | **INTERNAL** | College operational records that do not contain personal student identifiers. | Authenticated users only. Role-based restriction. | Room inventory counts, block maintenance status, task schedules, facility capacities. |
| **Tier 3** | **CONFIDENTIAL** | Direct student personal information identifiable to an individual. | Restricted to authorized staff, felo, and the data subject. Protected from unauthorized export. | Student full name, matric number, telephone number, email, faculty, room assignment, leave dates, attendance. |
| **Tier 4** | **SENSITIVE** | High-risk, sensitive personal data requiring enhanced safeguards and strict purpose limitation. | Least-privilege access only. Masked by default in general views. Restricted from JAKMAS and third parties. Full audit logging on access. | Identity card / Passport numbers (`ic_passport`), medical & disability conditions, emergency contact numbers, parent income, disciplinary records, private welfare case notes. |

---

## 2. Field-by-Field Entity Mapping

### Entity: `Student`
- `id`: INTERNAL
- `full_name`: CONFIDENTIAL
- `matric_number`: CONFIDENTIAL
- `ic_passport`: **SENSITIVE** (Masked as `******-**-1234` in general views)
- `email`: CONFIDENTIAL
- `phone_number`: CONFIDENTIAL (Masked for peer/JAKMAS views)
- `gender` / `race` / `religion` / `date_of_birth`: CONFIDENTIAL
- `faculty` / `programme` / `year_of_study`: CONFIDENTIAL
- `block` / `room_number` / `bed_letter`: CONFIDENTIAL
- `emergency_contact_name`: CONFIDENTIAL
- `emergency_contact_phone`: **SENSITIVE**
- `parent_name`: CONFIDENTIAL
- `parent_phone`: **SENSITIVE**
- `parent_income`: **SENSITIVE**
- `medical_condition` / `disability_info` / `allergies`: **SENSITIVE**

### Entity: `DisciplineRecord`
- `student_name` / `matric_number`: CONFIDENTIAL
- `offence_type` / `offence_date` / `penalty`: **SENSITIVE**
- `warden_notes` / `hearing_details`: **SENSITIVE**
- `appeal_status`: **SENSITIVE**

### Entity: `Complaint` (Welfare & Grievances)
- `category` / `subject`: CONFIDENTIAL
- `description`: **SENSITIVE**
- `welfare_flag` / `psychological_flag`: **SENSITIVE**

### Entity: `CheckOut` & `Deposit`
- `deposit_refund_status`: **SENSITIVE**
- `bank_account_number`: **SENSITIVE**

---

## 3. Masking & Export Rules

1. **IC/Passport (`ic_passport`)**:
   - `PELAJAR`: Can view own unmasked IC.
   - `PENGETUA` & `PENGURUSAN_ADMIN`: Can view unmasked IC when authorized for official registration.
   - `FELO` & `STAFF`: Masked in general list; full IC visible only on dedicated detail verification with audit log.
   - `JAKMAS`: Strictly masked at all times (`******-**-1234`).
2. **Exports (CSV/Excel/PDF)**:
   - High-risk / SENSITIVE fields are excluded or masked by default unless explicit executive export permission is granted.
