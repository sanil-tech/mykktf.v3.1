import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon,
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Search, Printer, Smartphone,
  ShieldCheck, MapPin, QrCode, CheckCircle2, AlertCircle, HeartHandshake,
  Download, FileText, ChevronDown, ChevronUp, Share2, HelpCircle, Filter, Eye,
  Camera, Compass, Bell, Lock, KeyRound, Wrench as WrenchIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ICONS = {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Smartphone, ShieldCheck,
  MapPin, QrCode, HeartHandshake, KeyRound, Camera, Compass, Bell, HelpCircle
};

// COMPREHENSIVE STEP-BY-STEP HANDBOOK CHAPTERS WITH ROLE FILTERING
const MANUAL_CHAPTERS = [
  {
    id: 'ch-intro',
    number: 'Bab 1',
    title: 'Pengenalan & Pemasangan Aplikasi Telefon (PWA)',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Smartphone',
    summary: 'Mengenali ekosistem MyKKTF, panduan pemasangan pada telefon pintar (Android/iPhone), serta kebenaran kamera, GPS dan notifikasi.',
    sections: [
      {
        title: '1.1 Apa itu MyKKTF?',
        content: 'MyKKTF ialah Sistem Pengurusan Digital Bersepadu Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah (UMS). Sistem ini menghubungkan Pelajar, Felo/Warden, EXCO JAKMAS, dan Pentadbiran Kolej dalam satu platform digital untuk urusan penginapan, cuti E-Leave, kerosakan fasiliti, kebajikan, dan perkhidmatan pintar AI.'
      },
      {
        title: '1.2 Langkah Pemasangan pada iPhone / iPad (iOS Safari)',
        steps: [
          'Langkah 1: Buka pelayar Safari pada iPhone dan layari pautan rasmi aplikasi MyKKTF.',
          'Langkah 2: Tekan ikon Kongsi (Share Button) 📤 di bar navigasi bawah pelayar.',
          'Langkah 3: Skrol senarai menu ke bawah dan pilih "Add to Home Screen" (Tambah ke Skrin Utama) ➕.',
          'Langkah 4: Tekan butang "Add" di penjuru kanan atas.',
          'Hasil: Ikon rasmi MyKKTF akan muncul di skrin utama telefon anda dan sedia dibuka seperti aplikasi natif.'
        ]
      },
      {
        title: '1.3 Langkah Pemasangan pada Telefon Android (Google Chrome)',
        steps: [
          'Langkah 1: Buka pelayar Google Chrome pada telefon dan layari pautan MyKKTF.',
          'Langkah 2: Spanduk automatik "Add MyKKTF to Home Screen" akan muncul di bahagian bawah skrin. Tekan "Install" / "Pasang".',
          'Langkah 3: Sekiranya spanduk tidak muncul, tekan menu Tiga Titik (⋮) di penjuru kanan atas pelayar.',
          'Langkah 4: Pilih "Install app" atau "Add to Home screen".',
          'Hasil: Aplikasi dipasang terus ke laci aplikasi telefon anda.'
        ]
      },
      {
        title: '1.4 Mengaktifkan Kebenaran Penting (Notifikasi, Kamera & GPS)',
        steps: [
          'Notifikasi Tolak (Push Notifications): Apabila tetingkap dialog muncul, tekan "Benarkan / Allow" untuk menerima makluman kelulusan cuti dan kerosakan serta-merta.',
          'Kebenaran Kamera: Wajib dibenarkan semasa kali pertama membuka modul imbasan kod QR E-Leave / Kehadiran Acara.',
          'Kebenaran Lokasi (GPS): Wajib dibenarkan untuk membolehkan sistem mengesahkan anda berada dalam lingkungan 1.0km kampus KKTF semasa pulang dari cuti.'
        ]
      }
    ]
  },
  {
    id: 'ch-checkin-student',
    number: 'Bab 2',
    title: 'Panduan Pelajar: Pendaftaran Masuk (Check-In) & Pemeriksaan Bilik',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'KeyRound',
    summary: 'Tatacara mendaftar masuk bilik awal semester, melakukan pemeriksaan inventori fizikal bilik, dan pendaftaran keluar akhir semester.',
    sections: [
      {
        title: '2.1 Langkah Pendaftaran Masuk Bilik (Check-In)',
        steps: [
          'Langkah 1: Log masuk ke MyKKTF dan buka modul "Check-In / Out".',
          'Langkah 2: Semak maklumat blok kediaman dan nombor bilik yang ditugaskan kepada anda.',
          'Langkah 3: Ambil kunci bilik fizikal daripada kaunter pejabat pentadbiran kolej.',
          'Langkah 4: Tekan butang "Sahkan Daftar Masuk (Confirm Check-In)" untuk mengaktifkan status penghunian bilik anda.'
        ]
      },
      {
        title: '2.2 Pemeriksaan Keadaan Bilik (Room Inspection)',
        steps: [
          'Langkah 1: Buka modul "Room Inspections" dalam tempoh 48 jam selepas mendaftar masuk.',
          'Langkah 2: Periksa suis lampu, soket elektrik, tombol pintu, tingkap, tilam, katil, almari, dan meja belajar.',
          'Langkah 3: Tandakan status keadaan inventori (Baik / Perlu Pembaikan) dan muat naik gambar jika terdapat kerosakan sedia ada bagi mengelakkan pertikaian di akhir semester.'
        ]
      },
      {
        title: '2.3 Langkah Pendaftaran Keluar (Check-Out) Akhir Semester',
        steps: [
          'Langkah 1: Pastikan bilik telah dibersihkan dan barangan peribadi telah dikosongkan.',
          'Langkah 2: Buka modul "Check-In / Out" → Tekan "Mohon Daftar Keluar (Check-Out)".',
          'Langkah 3: Felo/Warden atau staf kolej akan membuat pemeriksaan fizikal bilik.',
          'Langkah 4: Serahkan kunci bilik di kaunter kolej untuk melengkapkan proses check-out rasmi.'
        ]
      }
    ]
  },
  {
    id: 'ch-eleave-student',
    number: 'Bab 3',
    title: 'Panduan Pelajar: Permohonan E-Leave & Pengesahan Kembali (QR + GPS)',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'CalendarOff',
    summary: 'Aliran lengkap permohonan keluar bermalam di luar kolej, pemantauan kelulusan warden, dan pengesahan kembali secara dwi-faktor.',
    sections: [
      {
        title: '3.1 Bila Pelajar Perlu Memohon E-Leave?',
        content: 'Mengikut Peraturan Kolej Kediaman UMS (AUKU), mana-mana pelajar yang ingin bermalam di luar kawasan kolej (sama ada pulang ke kampung, bercuti hujung minggu, urusan rasmi universiti, atau hal kecemasan keluarga) WAJIB mengemukakan permohonan E-Leave selewat-lewatnya 24 jam sebelum waktu keluar.'
      },
      {
        title: '3.2 Langkah Mengemukakan Permohonan E-Leave',
        steps: [
          'Langkah 1: Buka menu "E-Leave" pada menu sisi atau papan pemuka.',
          'Langkah 2: Klik butang "Mohon Cuti / Keluar Bermalam".',
          'Langkah 3: Pilih Jenis Cuti: Hujung Minggu, Cuti Semester, Urusan Keluarga, Aktiviti Rasmi UMS, atau Perubatan.',
          'Langkah 4: Masukkan Destinasi Cuti (cth: Ranau, Sandakan, Kota Kinabalu) dan Alasan Permohonan.',
          'Langkah 5: Tetapkan Tarikh/Masa Keluar dan Tarikh/Masa Pulang yang dijangka.',
          'Langkah 6: Tekan "Hantar Permohonan". Permohonan anda akan terus dipajukan ke dashboard Felo/Warden blok anda.'
        ]
      },
      {
        title: '3.3 Langkah Pengesahan Kembali ke Kolej (Dwi-Faktor QR + GPS)',
        steps: [
          'Langkah 1: Setibanya anda di KKTF, buka aplikasi MyKKTF pada telefon anda.',
          'Langkah 2: Pergi ke menu E-Leave dan tekan butang hijau "Imbas QR Kembali" (atau buka kamera telefon biasa).',
          'Langkah 3: Semakan Geofence GPS: Sistem radar automatik menyemak bahawa anda berada dalam lingkungan 1.0km kampus KKTF (Lampu radar bertukar hijau: 🟢 Di Dalam Kampus).',
          'Langkah 4: Halakan kamera telefon pada Poster Kod QR Fizikal yang ditampal di pintu masuk blok kediaman anda atau pondok pengawal.',
          'Langkah 5: Sistem memaparkan "Kehadiran Disahkan Berjaya!" dan status cuti anda bertukar automatik kepada "TELAH KEMBALI".'
        ]
      },
      {
        title: '3.4 Apa Nak Buat Jika Telefon Kehabisan Bateri / Tiada Data?',
        content: 'Sekiranya telefon anda kehabisan bateri atau mengalami masalah rangkaian internet semasa tiba, sila berjumpa terus dengan Felo/Warden bertugas di blok anda. Warden boleh melakukan "Pengesahan Kepulangan Manual" bagi pihak anda.'
      },
      {
        title: '3.5 Peringatan Status Terlewat (Overdue)',
        content: 'Sekiranya anda tidak mengimbas kod QR kembali selepas tarikh pulang yang diluluskan tamat, status cuti bertukar kepada "AMARAN TERLEWAT (OVERDUE)". Warden akan dimaklumkan untuk menghubungi anda atau waris kecemasan anda.'
      }
    ]
  },
  {
    id: 'ch-maintenance',
    number: 'Bab 4',
    title: 'Panduan Pelajar: Laporan Kerosakan & Pautan No. MyServ UMS (SLA)',
    roleLabel: 'Pelajar & Staf',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Wrench',
    summary: 'Tatacara melaporkan kerosakan fasiliti bilik, cara mendapatkan nombor rujukan MyServ UMS, dan penjejakan jam SLA pembaikan.',
    sections: [
      {
        title: '4.1 Langkah Melaporkan Kerosakan di MyKKTF',
        steps: [
          'Langkah 1: Buka modul "Damage Reports" (Laporan Kerosakan).',
          'Langkah 2: Tekan butang "Lapor Kerosakan".',
          'Langkah 3: Pilih Lokasi Kerosakan: Bilik Sendiri (cth: Bilik G-204) atau Kawasan Awam Blok (cth: Tandas Aras 2, Pantri).',
          'Langkah 4: Pilih Kategori: Elektrik (Lampu/Kipas/Suis), Paip & Sanitari, Perabot/Katil/Almari, Pintu/Kunci, atau Kebersihan.',
          'Langkah 5: Tulis huraian kerosakan dan lampirkan gambar foto kerosakan fizikal.',
          'Langkah 6: Tekan "Hantar Laporan".'
        ]
      },
      {
        title: '4.2 Langkah Memautkan No. Rujukan MyServ UMS',
        steps: [
          'Langkah 1: Layari portal Seksyen Penyelenggaraan UMS (portal MyServ rasmi).',
          'Langkah 2: Buat aduan kerosakan rasmi dan salin No. Rujukan MyServ yang dijana (cth: REQ-2026-8812).',
          'Langkah 3: Buka semula MyKKTF → Tekan "Pautkan No. MyServ" pada kad kerosakan anda.',
          'Langkah 4: Masukkan No. Rujukan tersebut dan tekan Simpan.',
          'Hasil: Penjejakan masa SLA kolej akan bermula secara automatik dan peringatan harian di papan pemuka akan dipadamkan.'
        ]
      },
      {
        title: '4.3 Pengesahan Siap Pembaikan (Verification)',
        content: 'Apabila kontraktor/staf penyelenggaraan UMS siap membaiki kerosakan di bilik anda, tekan butang "Sahkan Siap Dibaiki". Sistem akan mengira jumlah jam sebenar pembaikan (cth: Tempoh Selesai: 2 Hari 4 Jam) bagi tujuan rekod SLA kolej.'
      }
    ]
  },
  {
    id: 'ch-welfare',
    number: 'Bab 5',
    title: 'Panduan Pelajar: Suara Mahasiswa & Whistleblowing Sulit',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'HeartHandshake',
    summary: 'Saluran rasmi menyuarakan isu kebajikan, keselesaan rakan sebilik, perkhidmatan kafeteria, dan aduan sulit tanpa nama.',
    sections: [
      {
        title: '5.1 Kategori Aduan Kebajikan',
        content: 'Modul Feedback & Welfare diasingkan daripada kerosakan fizikal. Gunakan saluran ini untuk: Isu Kebajikan & Keselamatan Residen, Rakan Sebilik & Waktu Senyap (Quiet Hours), Kualiti Makanan & Kebersihan Kafeteria, Layanan Kaunter Staf/Penyelia, dan Cadangan Program/Kemudahan Baharu.'
      },
      {
        title: '5.2 Langkah Menghantar Aduan Sulit (Anonymous Whistleblower)',
        steps: [
          'Langkah 1: Buka modul "Feedback & Welfare" → Tekan "Hantar Maklum Balas / Aduan".',
          'Langkah 2: Pilih Kategori yang bersesuaian.',
          'Langkah 3: Tulis keterangan isu atau cadangan anda secara terperinci.',
          'Langkah 4: Tandakan kotak pilihan "🔒 Hantar Tanpa Nama (Anonymous Whistleblower)".',
          'Langkah 5: Tekan "Hantar Maklum Balas". Nama dan nombor matrik anda akan dirahsiakan sepenuhnya daripada paparan awam.'
        ]
      }
    ]
  },
  {
    id: 'ch-facilities-events',
    number: 'Bab 6',
    title: 'Panduan Pelajar: Tempahan Fasiliti, Acara Kolej & Kehadiran QR',
    roleLabel: 'Pelajar & JAKMAS',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Building2',
    summary: 'Panduan menempah dewan dan gelanggang kolej, mendaftar aktiviti anjuran JAKMAS, serta mengimbas kod QR kehadiran merit.',
    sections: [
      {
        title: '6.1 Langkah Menempah Kemudahan Kolej (Facilities)',
        steps: [
          'Langkah 1: Buka modul "Facilities" pada menu sisi.',
          'Langkah 2: Pilih fasiliti yang diingini: Dewan Serbaguna, Bilik Diskusi/Seminar, Gelanggang Futsal, atau Gelanggang Badminton.',
          'Langkah 3: Pilih Tarikh dan Slot Masa (Pagi / Petang / Malam). Sistem akan menolak slot yang telah ditempah secara automatik.',
          'Langkah 4: Nyatakan tujuan penggunaan (cth: Latihan Kebudayaan, Ulang Kaji Kumpulan) dan tekan "Hantar Tempahan".'
        ]
      },
      {
        title: '6.2 Langkah Mendaftar Acara & Mengimbas Kehadiran Kod QR',
        steps: [
          'Langkah 1: Buka modul "Events" untuk melihat senarai aktiviti anjuran JAKMAS dan pihak kolej.',
          'Langkah 2: Tekan "Daftar Acara" untuk menempah tempat anda sebelum kuota penuh.',
          'Langkah 3: Pada hari acara berlangsung, buka modul "Attendance" pada telefon anda.',
          'Langkah 4: Imbas Kod QR Acara yang dipaparkan di pintu masuk dewan oleh penganjur.',
          'Langkah 5: Kehadiran anda akan disahkan dan direkodkan ke dalam profil merit penginapan kolej anda.'
        ]
      }
    ]
  },
  {
    id: 'ch-ai',
    number: 'Bab 7',
    title: 'KKTF Assistant AI: Panduan Pembantu Maya Pintar Kolej 24/7',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Sparkles',
    summary: 'Cara memanfaatkan pembantu kecerdasan buatan untuk mendapatkan rujukan peraturan, panduan kolej, dan bantuan segera.',
    sections: [
      {
        title: '7.1 Berinteraksi dengan KKTF Assistant',
        steps: [
          'Langkah 1: Tekan butang ikon robot biru di penjuru kanan bawah pada mana-mana halaman aplikasi.',
          'Langkah 2: Taip soalan anda dalam Bahasa Melayu atau Bahasa Inggeris ringkas.',
          'Contoh Soalan: "Bila waktu senyap kolej bermula?", "Macam mana nak mohon cuti bermalam?", "Berapa lama tempoh baiki kipas rosak?", atau "Tunjuk panduan sistem".',
          'Langkah 3: AI akan merujuk pangkalan dokumen rasmi kolej dan menjawab soalan anda dengan tepat serta-merta.'
        ]
      }
    ]
  },
  {
    id: 'ch-warden',
    number: 'Bab 8',
    title: 'Panduan Felo & Warden: Kelulusan Cuti, Poster QR A4 & Direktori Blok',
    roleLabel: 'Warden & Pentadbir Sahaja',
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin'],
    icon: 'ShieldCheck',
    summary: 'Aliran kerja khusus felo: kelulusan cuti blok, pemantauan status terlewat (overdue), cetakan poster QR rasmi, dan semakan residen (view-only).',
    sections: [
      {
        title: '8.1 Skop Kuasa & Privasi Mengikut Blok',
        content: 'Felo/Warden hanya boleh melihat permohonan cuti, laporan kerosakan, dan rekod residen bagi blok yang ditugaskan kepada mereka di bawah entiti WardenBlock (cth: Felo Blok G hanya melihat residen Blok G).'
      },
      {
        title: '8.2 Langkah Memproses Kelulusan E-Leave',
        steps: [
          'Langkah 1: Buka modul "E-Leave" atau "Leave Monitor".',
          'Langkah 2: Semak senarai permohonan berstatus "Pending Approval".',
          'Langkah 3: Teliti destinasi, tarikh pulang, dan alasan cuti pelajar.',
          'Langkah 4: Tekan butang hijau "Luluskan (Approve)" atau butang merah "Tolak (Reject)". Pelajar akan menerima notifikasi tolak pada telefon mereka serta-merta.'
        ]
      },
      {
        title: '8.3 Langkah Menjana & Mencetak Poster Kod QR A4 Rasmi',
        steps: [
          'Langkah 1: Di modul E-Leave, tekan butang "Poster QR Blok".',
          'Langkah 2: Pilih blok jagaan anda daripada menu pilihan lokasi (cth: Blok G).',
          'Langkah 3: Tekan butang "Cetak Poster A4 Rasmi".',
          'Langkah 4: Tetingkap cetakan resolusi tinggi dibuka secara automatik dengan reka bentuk poster rasmi UMS, panduan 3 langkah pelajar, dan kod QR HD.',
          'Langkah 5: Cetak pada kertas A4 (atau laminate) dan tampal di papan kenyataan pintu masuk blok kediaman.'
        ]
      },
      {
        title: '8.4 Langkah Pengesahan Kepulangan Manual (Rondaan Blok)',
        steps: [
          'Langkah 1: Jika terdapat pelajar yang terlupa mengimbas atau kehabisan bateri, buka kad permohonan pelajar tersebut.',
          'Langkah 2: Tekan butang "Sahkan Kepulangan Pelajar (Manual Clearance)".',
          'Langkah 3: Status cuti pelajar akan dikemas kini kepada "TELAH KEMBALI" berserta catatan pengesahan felo.'
        ]
      },
      {
        title: '8.5 Direktori Residen (Akses Paparan Sahaja / View-Only)',
        content: 'Warden boleh mencari nama, no. bilik, dan kontak waris kecemasan pelajar di halaman Student Management melalui butang mata (👁️). Butang Tambah, Edit, dan Padam pelajar disembunyikan sepenuhnya demi mengekalkan integriti rekod pendaftaran kolej.'
      }
    ]
  },
  {
    id: 'ch-jakmas',
    number: 'Bab 9',
    title: 'Panduan EXCO JAKMAS: Pengurusan Acara, Notis & Portfolio',
    roleLabel: 'JAKMAS & Pentadbir Sahaja',
    allowedRoles: ['jakmas', 'staff', 'college_admin', 'super_admin'],
    icon: 'ClipboardList',
    summary: 'Panduan barisan EXCO Jawatankuasa Kebajikan Mahasiswa mengurus aktiviti kolej, draf pengumuman rasmi, dan kemajuan portfolio.',
    sections: [
      {
        title: '9.1 Langkah Mencipta Program / Acara Kolej',
        steps: [
          'Langkah 1: Buka modul "Events" → Tekan "Tambah Acara".',
          'Langkah 2: Masukkan Nama Acara, Tarikh, Masa Mula/Tamat, Tempat (Venue), dan Had Peserta.',
          'Langkah 3: Tulis keterangan program dan muat naik poster digital.',
          'Langkah 4: Selepas acara diterbitkan, sistem akan menjana Kod QR Kehadiran khusus untuk dipaparkan kepada peserta semasa hari kejadian.'
        ]
      },
      {
        title: '9.2 Langkah Merangka Draf Pengumuman Rasmi',
        steps: [
          'Langkah 1: Buka modul "Announcements" → Tekan "Draf Pengumuman".',
          'Langkah 2: Pilih Kategori: Acara, Sukan, Aktiviti Pelajar, atau Umum.',
          'Langkah 3: Tulis tajuk dan isi pengumuman.',
          'Langkah 4: Hantar draf untuk semakan dan kelulusan Pentadbir Kolej sebelum disiarkan kepada semua penghuni.'
        ]
      },
      {
        title: '9.3 Langkah Mengemaskini Tugasan Portfolio (JAKMAS Tasks)',
        steps: [
          'Langkah 1: Buka modul "My JAKMAS Tasks".',
          'Langkah 2: Semak tugasan yang diagihkan oleh penasihat kolej/pentadbir.',
          'Langkah 3: Tukar status tugasan kepada "Sedang Dijalankan (In Progress)".',
          'Langkah 4: Lampirkan nota laporan kemajuan serta pautan dokumen/gambar bukti pelaksanaan (Evidence) dan tekan "Hantar Tugasan".'
        ]
      }
    ]
  },
  {
    id: 'ch-admin',
    number: 'Bab 10',
    title: 'Panduan Pentadbir & Staf: Penyelarasan Bilik, AI Knowledge & Audit',
    roleLabel: 'Pentadbir Utama & Staf Sahaja',
    allowedRoles: ['staff', 'college_admin', 'super_admin'],
    icon: 'ScrollText',
    summary: 'Pengurusan inventori bilik, penyelarasan kapasiti katil, pelantikan EXCO, muat naik dokumen AI, dan Audit Log forensik.',
    sections: [
      {
        title: '10.1 Penyelarasan Kapasiti Bilik & Katil (Room Sync)',
        steps: [
          'Langkah 1: Buka modul "Rooms" (Pengurusan Bilik).',
          'Langkah 2: Klik butang "Penyelarasan Kapasiti (Sync Beds)".',
          'Langkah 3: Sistem menyelaraskan semula bilangan penghuni aktif dengan kapasiti katil sebenar setiap bilik secara automatik (Available / Occupied / Full).'
        ]
      },
      {
        title: '10.2 Pangkalan Pengetahuan AI (AI Knowledge Base) & Muat Naik Dokumen',
        steps: [
          'Langkah 1: Buka modul "AI Knowledge" (Pengetahuan AI).',
          'Langkah 2: Tekan butang "Muat Naik Dokumen" untuk mengimport fail dokumen peraturan atau SOP kemasukan (.txt, .doc, .md).',
          'Langkah 3: Sistem membaca kandungan fail secara automatik dan mengisi borang pengetahuan.',
          'Langkah 4: Tekan "Simpan ke Memori AI". AI Assistant akan terus merujuk dokumen tersebut dalam jawapan kepada pelajar.'
        ]
      },
      {
        title: '10.3 Pengurusan Pelantikan EXCO JAKMAS',
        content: 'Pada modul "JAKMAS Management", pentadbir boleh melantik pelajar menjadi barisan pimpinan kolej, menetapkan jawatan (Yang Dipertua, Setiausaha, Bendahari, EXCO Kebajikan, dll), serta mengagihkan tugasan mengikut portfolio.'
      },
      {
        title: '10.4 Jejak Audit Log Forensik Data (Kotak Hitam Keselamatan)',
        content: 'Buka modul "Audit Log" untuk menyiasat sebarang aktiviti penambahan, kemaskini, atau pemadaman data merentas semua modul. Setiap tindakan direkodkan dengan identiti pengguna dan cap masa milisaat yang tidak boleh dimanipulasi.'
      }
    ]
  },
  {
    id: 'ch-faq',
    number: 'Bab 11',
    title: 'Soalan Lazim (FAQ) & Penyelesaian Masalah (Troubleshooting)',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'HelpCircle',
    summary: 'Panduan pantas mengatasi isu teknikal seperti kamera tidak menyala, masalah GPS, atau notifikasi tidak masuk.',
    sections: [
      {
        title: 'S1: Kamera telefon tidak terbuka semasa hendak mengimbas Kod QR?',
        content: 'Penyelesaian: Buka tetapan pelayar telefon anda (Safari Settings atau Chrome Settings) → Cari kebenaran Laman Web (Permissions) → Pastikan "Kamera (Camera)" ditetapkan kepada "Benarkan (Allow)".'
      },
      {
        title: 'S2: GPS memaparkan status "Di Luar Kampus" padahal saya sudah berada di KKTF?',
        content: 'Penyelesaian: Pastikan perkhidmatan Lokasi Telefon (Location/GPS) dihidupkan dalam mod ketepatan tinggi (High Accuracy). Tekan butang "Kemas Kini Lokasi GPS" pada skrin pengimbas untuk menyegarkan bacaan satelit GPS anda.'
      },
      {
        title: 'S3: Saya tidak menerima notifikasi tolak pada telefon?',
        content: 'Penyelesaian: Buka aplikasi MyKKTF → Pastikan anda telah menekan "Benarkan" pada gesaan notifikasi. Pada iPhone, pastikan aplikasi telah ditambah ke Home Screen (PWA) untuk menyokong Web Push Notifications.'
      },
      {
        title: 'S4: Siapa yang perlu saya hubungi jika menghadapi masalah akaun?',
        content: 'Penyelesaian: Sila hubungi Kaunter Pentadbiran Kolej Kediaman Tun Fuad (UMS) pada waktu pejabat atau ajukan soalan anda terus kepada KKTF Assistant AI.'
      }
    ]
  }
];

// PRESENTATION SLIDES DECK WITH ROLE FILTERING
const ALL_SLIDES = [
  {
    kind: 'cover',
    title: 'MyKKTF v3.1',
    subtitle: 'Sistem Pengurusan Digital Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah',
    meta: 'Buku Panduan & Slaid Pembentangan Rasmi',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 1', title: 'Pemasangan Aplikasi & Pengalaman Pengguna', icon: 'Smartphone',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  {
    kind: 'feature', icon: 'Smartphone', tone: 'indigo',
    title: 'Aplikasi Web Progresif (PWA)',
    tagline: 'Pasang pada telefon pintar Android & iOS dalam 2 klik.',
    does: [
      'Pemasangan terus dari pelayar (Add to Home Screen) tanpa Play Store / App Store',
      'Saiz ultra-ringan (<2MB) dengan ikon rasmi MyKKTF pada skrin utama telefon',
      'Sokongan notifikasi tolak telefon asli (Native Web Push Notifications)',
      'Akses kamera lancar untuk imbasan QR dan penentu lokasi GPS Geofencing'
    ],
    roles: ['Semua Pengguna'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 2', title: 'E-Leave & Keselamatan Residen', icon: 'CalendarOff',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  {
    kind: 'feature', icon: 'CalendarOff', tone: 'emerald',
    title: 'E-Leave Dwi-Faktor (QR + GPS)',
    tagline: 'Permohonan keluar dan pengesahan kembali ber-geofence.',
    does: [
      'Pelajar mohon cuti bermalam secara atas talian berserta tarikh dan destinasi',
      'Warden blok meluluskan permohonan melalui dashboard khusus',
      'Pengesahan kembali wajib imbas kamera QR fizikal di blok kediaman',
      'Geofence GPS mengesahkan kedudukan pelajar berada dalam 1.0km kampus KKTF UMS',
      'Amaran automatik bagi status terlewat kembali (Overdue Leave)'
    ],
    roles: ['Pelajar', 'Warden', 'Admin'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  {
    kind: 'feature', icon: 'QrCode', tone: 'indigo',
    title: 'Penjana Poster Kod QR A4',
    tagline: 'Poster rasmi sedia cetak bagi setiap blok kediaman.',
    does: [
      'Penjanaan automatik poster A4 beresolusi tinggi dengan jata UMS & KKTF',
      'Warden disekat secara selamat — hanya boleh menjana poster bagi blok jagaan sendiri',
      'Dilengkapi panduan bergambar 3 langkah imbasan bagi memudahkan pelajar',
      'Format cetakan bersih tanpa elemen navigasi pelayar web'
    ],
    roles: ['Warden', 'Admin'],
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin']
  },
  { 
    kind: 'section', label: 'Modul 3', title: 'Penyelenggaraan & SLA Kerosakan', icon: 'Wrench',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  {
    kind: 'feature', icon: 'Wrench', tone: 'amber',
    title: 'Laporan Kerosakan & MyServ UMS',
    tagline: 'Penjejakan masa pembaikan (SLA) & peringatan harian.',
    does: [
      'Pelajar laporkan kerosakan bilik atau fasiliti blok berserta gambar bukti',
      'Integrasi nombor rujukan MyServ UMS (cth: REQ-2026-XXXX)',
      'Pengiraan automatik jam penyelesaian pembaikan (SLA Resolution Duration)',
      'Spanduk peringatan harian pintar di papan pemuka pelajar'
    ],
    roles: ['Pelajar', 'Warden', 'Staf'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 4', title: 'Tadbir Urus & Audit Forensik', icon: 'ScrollText',
    allowedRoles: ['staff', 'college_admin', 'super_admin']
  },
  {
    kind: 'feature', icon: 'ScrollText', tone: 'indigo',
    title: 'Pengurusan Bilik & Audit Log Forensik',
    tagline: 'Penyelarasan kapasiti katil & jejak akauntabiliti data.',
    does: [
      'Penyelarasan automatik kapasiti bilik dengan bilangan katil sebenar',
      'Rekod Audit Log milisaat bagi setiap tindakan data (Cipta/Kemas kini/Padam)',
      'Pengurusan pelantikan EXCO JAKMAS dan tugasan portfolio',
      'Pangkalan Pengetahuan AI dengan fungsi import dokumen rasmi (.doc/.txt)'
    ],
    roles: ['Pentadbir Utama', 'Staf'],
    allowedRoles: ['staff', 'college_admin', 'super_admin']
  }
];

export default function PresentationPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('handbook'); // 'handbook' or 'slides'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState('ch-intro');

  // Determine user's effective role
  const userRole = user?.role || 'student';
  const isJakmas = Boolean(user?.jakmasAppointment);
  const effectiveRole = isJakmas ? 'jakmas' : userRole;
  const isAdmin = userRole === 'super_admin' || userRole === 'college_admin';

  // Role filter preview (Admins can toggle view perspective)
  const [rolePerspective, setRolePerspective] = useState('auto');

  const activePerspective = rolePerspective === 'auto' ? effectiveRole : rolePerspective;

  // Filter chapters based on role perspective
  const roleFilteredChapters = MANUAL_CHAPTERS.filter(ch => {
    if (activePerspective === 'all') return true;
    return ch.allowedRoles.includes(activePerspective);
  });

  // Further filter by search query
  const displayChapters = roleFilteredChapters.filter(ch => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ch.title.toLowerCase().includes(q) || 
           ch.summary.toLowerCase().includes(q) ||
           ch.sections.some(s => s.title.toLowerCase().includes(q) || (s.content && s.content.toLowerCase().includes(q)));
  });

  // Filter slides based on active perspective
  const displaySlides = ALL_SLIDES.filter(sl => {
    if (activePerspective === 'all') return true;
    return sl.allowedRoles.includes(activePerspective);
  });

  // Ensure currentSlide is within bounds when switching perspective
  useEffect(() => {
    setCurrentSlide(0);
  }, [activePerspective]);

  // Keyboard navigation for slide deck
  const handleKeyDown = useCallback((e) => {
    if (viewMode !== 'slides') return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      setCurrentSlide(prev => Math.min(prev + 1, displaySlides.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setCurrentSlide(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  }, [viewMode, displaySlides.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  function handlePrintManual() {
    window.print();
  }

  const slide = displaySlides[currentSlide] || displaySlides[0];
  const Icon = slide?.icon ? (ICONS[slide.icon] || PresentationIcon) : PresentationIcon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" /> Buku Panduan Penggunaan Sistem MyKKTF
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
              Versi 3.1 Rasmi
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manual Lengkap Bergambar, Aliran Kerja Langkah Demi Langkah & Panduan Operasi Kolej Kediaman Tun Fuad, UMS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PERSPECTIVE FILTER FOR ADMINS */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-600">Panduan:</span>
              <Select value={rolePerspective} onValueChange={setRolePerspective}>
                <SelectTrigger className="h-7 text-xs border-none bg-transparent shadow-none px-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Peranan Saya ({userRole})</SelectItem>
                  <SelectItem value="all">Semua Bab (Master Guide - 11 Bab)</SelectItem>
                  <SelectItem value="student">Panduan Pelajar</SelectItem>
                  <SelectItem value="warden">Panduan Warden / Felo</SelectItem>
                  <SelectItem value="jakmas">Panduan EXCO JAKMAS</SelectItem>
                  <SelectItem value="staff">Panduan Pentadbir & Staf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <Button
              size="sm"
              variant={viewMode === 'handbook' ? 'default' : 'ghost'}
              onClick={() => setViewMode('handbook')}
              className={`h-8 text-xs font-semibold gap-1.5 ${viewMode === 'handbook' ? 'bg-[#132644] text-white shadow-xs' : 'text-slate-600'}`}
            >
              <FileText className="w-3.5 h-3.5" /> Mod Buku Panduan
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'slides' ? 'default' : 'ghost'}
              onClick={() => setViewMode('slides')}
              className={`h-8 text-xs font-semibold gap-1.5 ${viewMode === 'slides' ? 'bg-[#132644] text-white shadow-xs' : 'text-slate-600'}`}
            >
              <PresentationIcon className="w-3.5 h-3.5" /> Mod Slaid Pembentangan
            </Button>
          </div>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={handlePrintManual}
            className="h-8 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak Panduan
          </Button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE HANDBOOK / READER VIEW */}
      {viewMode === 'handbook' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* SIDEBAR TABLE OF CONTENTS */}
          <div className="lg:col-span-1 space-y-4 sticky top-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Cari kata kunci (cth: QR, GPS, MyServ)..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-card"
              />
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 shadow-xs space-y-1">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Bab Panduan ({displayChapters.length})
                </p>
                {activePerspective === 'student' && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Pelajar</span>
                )}
              </div>

              {displayChapters.map(ch => {
                const ChIcon = ICONS[ch.icon] || BookOpen;
                const isActive = activeChapter === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChapter(ch.id);
                      const el = document.getElementById(ch.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200' 
                        : 'text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <ChIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <span className="text-[10px] text-muted-foreground block">{ch.number}</span>
                      <span className="truncate block">{ch.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-4 border-none shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold">Perlu Bantuan Lanjut?</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Buka <strong>KKTF Assistant AI</strong> di penjuru kanan bawah untuk bertanya sebarang soalan mengenai kolej secara terus 24/7.
                </p>
              </div>
            </Card>
          </div>

          {/* MAIN HANDBOOK CHAPTER CONTENT */}
          <div className="lg:col-span-3 space-y-8">
            {displayChapters.map(ch => {
              const ChIcon = ICONS[ch.icon] || BookOpen;
              return (
                <div 
                  key={ch.id} 
                  id={ch.id} 
                  className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-xs space-y-6 scroll-mt-6"
                >
                  <div className="border-b border-border pb-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest">
                        {ch.number}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                        Sasaran: {ch.roleLabel}
                      </Badge>
                    </div>
                    <h2 className="text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <ChIcon className="w-4 h-4" />
                      </div>
                      {ch.title}
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ch.summary}
                    </p>
                  </div>

                  <div className="space-y-5">
                    {ch.sections.map((sec, sIdx) => (
                      <div key={sIdx} className="space-y-2 bg-slate-50/70 border border-slate-100 rounded-2xl p-4">
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {sec.title}
                        </h3>
                        {sec.content && (
                          <p className="text-xs text-slate-600 leading-relaxed pl-5.5">
                            {sec.content}
                          </p>
                        )}
                        {sec.steps && (
                          <div className="space-y-2 pt-1 pl-5.5">
                            {sec.steps.map((st, stIdx) => (
                              <div key={stIdx} className="text-xs text-slate-700 flex items-start gap-2">
                                <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                  {stIdx + 1}
                                </span>
                                <span className="leading-relaxed">{st}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULLSCREEN SLIDE DECK VIEW */}
      {viewMode === 'slides' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground">
              Slaid {currentSlide + 1} daripada {displaySlides.length}
            </span>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={toggleFullscreen} 
                className="h-8 text-xs gap-1.5"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                {isFullscreen ? 'Keluar Skrin Penuh' : 'Skrin Penuh'}
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#0f1e36] via-[#132644] to-slate-900 text-white rounded-3xl p-8 lg:p-14 min-h-[460px] flex flex-col justify-between shadow-xl relative overflow-hidden border border-indigo-900">
            {/* BACKGROUND ACCENT BLUR */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {slide.kind === 'cover' ? (
              <div className="my-auto text-center space-y-4 max-w-2xl mx-auto">
                <div className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                  {slide.meta}
                </div>
                <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white">
                  {slide.title}
                </h1>
                <p className="text-sm lg:text-base text-slate-300 leading-relaxed font-medium">
                  {slide.subtitle}
                </p>
                <div className="pt-4 flex items-center justify-center gap-3 text-xs text-slate-400">
                  <span>Gunakan butang <strong>←</strong> dan <strong>→</strong> papan kekunci untuk navigasi slaid</span>
                </div>
              </div>
            ) : slide.kind === 'section' ? (
              <div className="my-auto text-center space-y-3 max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-indigo-300 mb-2">
                  <Icon className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
                  {slide.label}
                </span>
                <h2 className="text-2xl lg:text-4xl font-black text-white">
                  {slide.title}
                </h2>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-bold text-white">{slide.title}</h3>
                      <p className="text-xs text-slate-300 font-medium">{slide.tagline}</p>
                    </div>
                  </div>
                  {slide.roles && (
                    <div className="flex flex-wrap gap-1">
                      {slide.roles.map((r, i) => (
                        <span key={i} className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {slide.does.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-200 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SLIDE NAVIGATION CONTROLS */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10 mt-6">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
                className="text-slate-300 hover:text-white hover:bg-white/10 text-xs gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Slaid Sebelumnya
              </Button>

              {/* DOTS INDICATOR */}
              <div className="flex items-center gap-1.5">
                {displaySlides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentSlide ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={currentSlide === displaySlides.length - 1}
                onClick={() => setCurrentSlide(prev => Math.min(prev + 1, displaySlides.length - 1))}
                className="text-slate-300 hover:text-white hover:bg-white/10 text-xs gap-1"
              >
                Seterusnya <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}