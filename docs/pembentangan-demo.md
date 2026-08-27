# Slaid Pembentangan Demo — KKTF Resident Management System (KKMS)
**Penyedia:** ____________________  |  **Tarikh:** 27 Ogos 2026  |  **Audiens:** Pengurusan Kolej Kediaman Tun Fuad, UMS

> Arahan: Salin setiap blok "SLAID" ke satu slide dalam PowerPoint. Nota pembentang (di bawah setiap slaid) sebagai panduan ucapan, bukan dipaparkan.

---

## SLAID 1 — Tajuk

**Kolej Kediaman Tun Fuad — Sistem Pengurusan Resident (KKMS)**
Pembentangan Demo Sistem kepada Pengurusan
Logo UMS / Kolej Kediaman Tun Fuad

*Nota pembentang:* "Selamat pagi/tengahari. Hari ini saya akan membentangkan sistem pengurusan kolej kediaman digital yang dibangunkan untuk Kolej Kediaman Tun Fuad."

---

## SLAID 2 — Agenda Pembentangan

1. Latar belakang & masalah
2. Objektif sistem
3. Modul utama & demo langsung
4. Sistem pelantikan JAKMAS
5. Keselamatan & kawalan akses
6. Penyelarasan data & audit
7. Manfaat kepada pengurusan
8. Perancangan fasa seterusnya

---

## SLAID 3 — Latar Belakang & Cabaran

- Pengurusan resident secara manual dan bercelaru
- Rekod pelajar, bilik, dan daftar masuk/keluar dalam fail berasingan
- Proses pelantikan JAKMAS tiada jejak akauntabiliti
- Pengumuman lambat sampai kepada pelajar
- Tiada pemantauan status kemudahan dan aduan secara real-time

*Nota:* "Pengurusan kolej kini bergantung kepada hampir 10 fail berbeza dan hantaran WhatsApp yang sukar dijejak."

---

## SLAID 4 — Objektif Sistem

- Memusatkan semua operasi kolej dalam satu platform
- Automasi pendaftaran masuk/keluar dan pengagihan bilik
- Tadbir urus pelantikan JAKMAS secara telus & boleh diaudit
- Pengumuman & komunikasi tepat pada masa
- Pengurusan aduan, kemudahan, dan disiplin berstruktur
- Akses berasaskan peranan (Admin, Warden, Staff, Pelajar, JAKMAS)

---

## SLAID 5 — Peranan Pengguna & Kawalan Akses

| Peranan | Skop Akses |
|---|---|
| Super Admin | Kawalan penuh sistem & konfigurasi |
| College Admin | Pengurusan resident, bilik, pengumuman, audit |
| Warden | Pemantauan blok ditugaskan sahaja (baca sahaja profil) |
| Staff | Operasi harian — daftar, kemudahan, aduan |
| JAKMAS | Tugas pelantikan + fungsi pelajar (peranan dwi) |
| Pelajar | Portal kendiri — profil, permohonan, tempahan |

*Keselamatan:* Setiap peranan hanya lihat data yang berkaitan. Warden dihadkan kepada blok masing-masing.

---

## SLAID 6 — Modul Utama (Peta Sistem)

**Operasi Resident**
- Pengurusan Pelajar & Direktori Resident
- Pengurusan Bilik & Blok
- Daftar Masuk / Daftar Keluar

**Khidmat Pelajar**
- Permohonan Cuti / Keluar Kolej
- Aduan & Laporan Kerosakan
- Tempahan Kemudahan
- Pengumuman & Acara

**Tadbir Urus**
- Pelantikan & Tugas JAKMAS
- Inspeksi Bilik & Disiplin
- Audit Log & Laporan
- Pangkalan Pengetahuan AI

---

## SLAID 7 — Demo: Dashboard Berperanan

*(Tunjukkan dashboard Admin dalam app)*

- Dashboard berbeza ikut peranan log masuk
- Admin: metrik resident, kadar penghunian, aduan tertangguh, kutipan yuran
- Warden: hanya blok sendiri — penghunian, isu, pelajar di bawah jagaan
- Pelajar: status penghunian, permohonan aktif, pengumuman, acara

*Demo:* Log masuk sebagai College Admin → tunjuk kad metrik → tukar ke akaun warden tunjuk perbezaan.

---

## SLAID 8 — Demo: Pengurusan Resident & Bilik

- Rekod pelajar dengan blok, nombor bilik, status (Active / Pending)
- Carian & penapisan mengikut blok / nombor bilik
- Auto: pelajar tanpa bilik = status "Pending"
- Pendaftaran masuk & keluar dengan penilaian keadaan bilik
- Arkib alumni automatik semasa daftar keluar

*Demo:* Tambah pelajar baru → agih bilik → daftar masuk → tunjuk audit log.

---

## SLAID 9 — Demo: Sistem Pelantikan JAKMAS

*(Pembangunan tadbir urus berasaskan perlembagaan)*

- Pelantikan formal: jawatan, portfolio, tempoh
- Pengagihan tugas dengan tarikh akhir & keutamaan
- Aliran status: Ditugaskan → Disahkan → Sedang Dijalankan → Dihantar → Diluluskan
- Pelajar JAKMAS kekal akses penuh fungsi pelajar (peranan dwi)
- **Setiap tindakan direkod dalam audit log**

*Demo:* Lantik pelajar sebagai EXCO → agih tugas → pelajar tugaskan → luluskan → tunjuk audit.

---

## SLAID 10 — Demo: Pengumuman & Komunikasi

- Pengumuman dengan keutamaan (Umum / Penting / Kritikal)
- Jejak status "dibaca" setiap pelajar
- JAKMAS hantar notis rasmi → perlulusan Admin sebelum publish
- Kandungan tidak rasmi JAKMAS publish terus
- Pemberitahuan e-mel automatik untuk pengumuman & acara baru

*Demo:* Admin publish pengumuman Kritikal → tunjuk senarai pembaca → buat acara dengan pendaftaran.

---

## SLAID 11 — Demo: Aduan, Kemudahan & Inspeksi

- **Aduan & Kerosakan:** pelajar hantar dengan foto → staff jana kerja → warden/staff kemas kini status
- **Tempahan Kemudahan:** validasi pertembongan masa → kelulusan staff
- **Inspeksi Bilik:** dilakukan oleh JAKMAS/Warden → bendera isu → kait dengan daftar keluar
- **Disiplin:** rekod kes dengan kategori, bukti, tindakan

*Demo:* Pelajar hantar aduan paip bocor → staff agih kerja → tanda selesai → audit log.

---

## SLAID 12 — Keselamatan & Akauntabiliti

- **Kawalan Akses Berperanan (RLS):** setiap rekad dilindungi ikut peranan
- **Audit Log Menyeluruh:** setiap CRUD (pelajar, bilik, pengumuman, daftar, JAKMAS, yuran, disiplin, kehadiran) direkod
- **Warden dihadkan blok:** hanya lihat & cari pelajar blok sendiri
- **Profil warden baca-sahaja** — tiada akses ubah
- **E-mel berasaskan peranan khusus** — tiada pendedahan data merentas pengguna

---

## SLAID 13 — Pangkalan Pengetahuan AI

- Repositori peraturan, proses, FAQ & pengumuman
- Pembantu AI untuk menjawab soalan resident
- Akses terhad kepada Super Admin & College Admin
- Boleh ditetapkan tarikh berkuatkuasa & luput untuk peraturan

*Demo:* Tanya AI: "Bagaimana proses permohonan cuti?" → jawab berdasarkan pangkalan pengetahuan.

---

## SLAID 14 — Penyelarasan Data & Laporan

- Pangkalan data berpusat — tiada fail berserak
- Penjanaan laporan metrik: penghunian, aduan, kutipan, kehadiran, survei
- Pemantauan keluar/masuk pelajar (Leave Monitor)
- Analitik kepuasan pelajar (Survei keluar)
- Audit log boleh ditapis ikut modul, peranan, tarikh

---

## SLAID 15 — Manfaat kepada Pengurusan

| Sebelum | Selepas |
|---|---|
| Fail manual & berserak | Satu platform berpusat |
| Pelantikan JAKMS tak telus | Tadbir urus boleh diaudit |
| Pengumuman lambat & tak dijejak | Notis real-time + jejak baca |
| Aduan sukar dijejak | Aliran status berstruktur |
| Tiada pemantauan blok | Dashboard warden per blok |
| Tiada akauntabiliti tindakan | Audit log menyeluruh |

---

## SLAID 16 — Pelan Pembangunan Fasa Seterusnya

- **Fasa 2:** Notifikasi push aplikasi mudah alih asli
- **Fasa 2:** Integrasi sistem yuran dengan gerbang pembayaran (Stripe)
- **Fasa 3:** Modul penerimaan parsel/bingkisan (kini dibekukan)
- **Fasa 3:** Aplikasi mudah alih iOS/Android (kod sama diterbitkan)
- **Fasa 4:** Integrasi kalendar & e-mel automatik lanjutan

---

## SLAID 17 — Penutup & Cadangan

- Sistem sedia untuk pelaksanaan rintis di KKTF
- Sokongan berbilang peranan & mesra mudah alih
- Akauntabiliti penuh melalui audit log
- **Cadangan:** luluskan ujian rintis satu blok sebelum pelaksanaan penuh

**Terima kasih.**
Soalan & perbincangan.

---

## SLAID 18 (Lampiran) — Pautan & Maklumat Demo

- URL sistem: https://kktfresidentmanagement.base44.app
- Akaun demo:
  - College Admin — pengurusan penuh
  - Warden — blok ditugaskan
  - Pelajar / JAKMAS — portal kendiri
- Penyeliaan: Pengurusan Kolej Kediaman Tun Fuad

---

### Tip Pembentangan
- Jumlah slaid: 18 (≈25 minit dengan demo langsung)
- Slaid 7–13 disyorkan untuk demo langsung dalam app
- Gunakan peranti tablet untuk demo — UI dioptimumkan tablet & desktop
- Sediakan akaun demo sekurang-kurangnya: 1 College Admin, 1 Warden, 1 Pelajar JAKMAS