import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { printDocument } from '@/lib/printUtils';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon,
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Search, Printer, Smartphone,
  ShieldCheck, MapPin, QrCode, CheckCircle2, HeartHandshake, FileText, HelpCircle, Eye,
  Camera, Compass, Bell, KeyRound, Award, Trophy,
  PhoneCall, Phone, BadgeCheck, FileCheck, Crown, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';

const ICONS = {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Smartphone, ShieldCheck,
  MapPin, QrCode, HeartHandshake, KeyRound, Camera, Compass, Bell, HelpCircle,
  Award, Trophy, PhoneCall, Phone, BadgeCheck, FileCheck
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
      },
      {
        title: '1.5 Pendaftaran Kali Pertama Pelajar (First-Time Onboarding Wizard & Pengaktifan QR)',
        steps: [
          'Langkah 1 (Persediaan Dokumen): Sediakan maklumat penting sebelum mula: No. Kad Pengenalan / Pasport, No. Matrik UMS (cth: BP23110045), Fakulti & Program Pengajian, No. Telefon Sendiri, serta Nombor Telefon Waris / Kecemasan.',
          'Langkah 2 (Log Masuk Universiti): Log masuk kali pertama menggunakan e-mel rasmi universiti. Sistem akan mengunci paparan aplikasi dan memaparkan wisel "Pendaftaran Residen Baharu (Self-Service 3 Langkah)".',
          'Langkah 3 (Lengkapkan 3 Langkah): Isi Maklumat Peribadi & Kontak → Isi Maklumat Akademik UMS & No. Plat Kenderaan → Tetapkan Status Kunci & Bilik (Pilihan A: "Belum Ambil Kunci - Prapendaftaran dari Rumah" ATAU Pilihan B: "Sudah Tahu Bilik Kunci" dengan penapis blok jantina).',
          'Langkah 4 (Pusat Pengaktifan Residen & Wajib Imbas QR): Selepas menekan simpan, sistem membawa anda ke "Pusat Pengaktifan Residen KKTF" dengan lencana "● MENUNGGU PENGAKTIFAN QR". Pelajar WAJIB mengimbas Kod QR Rasmi Pengaktifan Residen di Kaunter Kunci Dewan Serbaguna atau pintu blok kediaman untuk mengesahkan kehadiran fizikal dan membuka Dashboard Penuh.'
        ]
      }
    ]
  },
  {
    id: 'ch-digital-pass',
    number: 'Bab 2',
    title: 'Pas Residen Digital KKTF: Kad Pengenalan Digital & Pengesahan QR',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'ShieldCheck',
    summary: 'Pengenalan kepada Pas Residen Digital rasmi KKTF, gandingan protokol logo UMS & KKTF, kod QR pengesahan, dan maklumat waris 2 muka.',
    sections: [
      {
        title: '2.1 Apa itu Pas Residen Digital KKTF?',
        content: 'Pas Residen Digital KKTF ialah kad pengenalan pintar rasmi bagi setiap mahasiswa yang menghuni Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah (UMS). Kad digital ini menggantikan keperluan membawa kad fizikal yang mudah hilang atau rosak.'
      },
      {
        title: '2.2 Susunan Protokol Rasmi Logo',
        content: 'Kad digital ini mematuhi protokol institusi rasmi: Logo Universiti Malaysia Sabah (UMS) dipaparkan di kedudukan utama (sebelah kiri) selaku universiti induk, digandingkan dengan Logo Rasmi Kolej Kediaman Tun Fuad di sebelah kanan, berserta lencana status "● RESIDEN AKTIF".'
      },
      {
        title: '2.3 Cara Pelajar Mengakses & Menunjukkan Pas',
        steps: [
          'Langkah 1: Buka aplikasi MyKKTF pada telefon anda.',
          'Langkah 2: Pada spanduk utama Student Dashboard atau pada halaman My Profile, tekan butang "🪪 Tunjuk Pas Residen Digital".',
          'Langkah 3: Kad digital beresolusi tinggi akan dipaparkan berserta Kod QR Pengesahan, Nama Penuh, No. Matrik, Fakulti, serta Blok & Bilik Kediaman anda.',
          'Langkah 4: Tunjukkan skrin ini kepada Pengawal Keselamatan di pos kawalan, Felo semasa rondaan, atau AJK JAKMAS semasa memasuki aktiviti kolej.'
        ]
      },
      {
        title: '2.4 Ciri Pusing Kad (Flip Card) & Maklumat Waris',
        steps: [
          'Tekan butang "Lihat Info Waris / Flip" untuk memusingkan kad ke muka belakang.',
          'Muka belakang memaparkan: Nombor telefon pelajar, nombor telefon ibu bapa / waris kecemasan, nombor pendaftaran kenderaan kolej (No. Plat), dan peringatan keselamatan rasmi kolej.'
        ]
      },
      {
        title: '2.5 Simpan ke Galeri Telefon',
        content: 'Pelajar boleh menekan butang "Simpan / Kongsi" atau mengambil tangkap layar (screenshot) kad untuk disimpan di dalam galeri telefon pintar bagi kegunaan ketika tiada sambungan internet.'
      }
    ]
  },
  {
    id: 'ch-qr-scanner',
    number: 'Bab 3',
    title: 'Pengimbas QR Pas Residen: Semakan Rondaan Felo & Kehadiran Program JAKMAS',
    roleLabel: 'Felo, Admin, Staf & JAKMAS Sahaja',
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'ScanLine',
    summary: 'Panduan operasi pengimbas QR menggunakan telefon petugas: semakan keselamatan, rondaan bilik, dan imbasan berterusan pantas (Continuous Fast Scan) untuk aktiviti kolej.',
    sections: [
      {
        title: '3.1 Siapa Yang Boleh Mengakses Pengimbas QR?',
        content: 'Fungsi pengimbas QR (`/scan-resident`) adalah modul khas bertaraf keselamatan yang hanya boleh diakses oleh Pentadbir Kolej, Felo/Warden, Staf, dan Barisan EXCO JAKMAS. Pelajar biasa tidak mempunyai akses ke modul ini.'
      },
      {
        title: '3.2 Cara Membuka Pengimbas QR',
        steps: [
          'Langkah 1: Log masuk menggunakan akaun Felo, Staf atau JAKMAS.',
          'Langkah 2: Tekan butang pintas "📷 Imbas Pas QR" pada bar atas aplikasi (TopBar) atau pilih menu "Imbas Pas Residen" di menu navigasi.',
          'Langkah 3: Pilih mod operasi yang diingini: Mod 1 (Semakan Keselamatan & Rondaan) ATAU Mod 2 (Kehadiran Program/Event).'
        ]
      },
      {
        title: '3.3 Mod 1: Semakan Keselamatan & Rondaan Felo (Spot-Check)',
        steps: [
          'Langkah 1: Pilih tab "1. Semakan Keselamatan & Rondaan" dan tekan "Buka Kamera Pengimbas".',
          'Langkah 2: Halakan kamera telefon ke QR pas pelajar.',
          'Langkah 3: Sistem mengesahkan data secara masa nyata: Foto, No. Matrik, Blok & Bilik sah, serta status pematuhan residen.',
          'Langkah 4: Felo boleh merekodkan status pemeriksaan (cth: Patuh Peraturan, Amaran Jam Malam, Pelawat Tanpa Kebenaran) berserta catatan ringkas dan tekan "Simpan Log Rondaan".'
        ]
      },
      {
        title: '3.4 Mod 2: Kehadiran Aktiviti Kolej (Imbasan Berterusan Pantas / Continuous Scan)',
        steps: [
          'Langkah 1: Pilih tab "2. Kehadiran Program / Event".',
          'Langkah 2: Pilih acara kolej daripada senarai (cth: Majlis Makan Malam KKTF, Perhimpunan Kolej, Gotong-Royong) atau taip nama acara baharu.',
          'Langkah 3: Petugas memegang telefon di pintu masuk. Pelajar beratur dan menghalakan QR pas mereka ke kamera.',
          'Langkah 4: Setiap imbasan disahkan dalam <0.5 saat berserta nada bunyi "Beep" hijau dan kehadiran direkodkan secara automatik ke pangkalan data.',
          'Langkah 5 (Cegah Duplikasi): Jika pelajar yang sama diimbas semula, sistem mengeluarkan amaran kuning "Pelajar Sudah Didaftarkan Hadir".',
          'Langkah 6: Kaunter kehadiran langsung (Live Attendee Counter) memaparkan jumlah kehadiran terkini secara masa nyata.'
        ]
      },
      {
        title: '3.5 Carian Manual (Sandaran Jika Bateri Telefon Pelajar Habis)',
        content: 'Sekiranya pelajar kehabisan bateri telefon, petugas boleh menaip No. Matrik (cth: BP23110045) atau nama pelajar di ruangan "Carian Manual" di sebelah kanan untuk menyemak profil dan merekodkan kehadiran.'
      }
    ]
  },
  {
    id: 'ch-checkin-student',
    number: 'Bab 4',
    title: 'Pendaftaran Masuk Residen, Pengesahan QR Kaunter Kunci & Pendaftaran Keluar',
    roleLabel: 'Pelajar & Pentadbir',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'KeyRound',
    summary: 'Aliran pendaftaran masuk kendiri tanpa beban kerja staf kolej: prapendaftaran dalam talian, pengesahan kehadiran fizikal melalui imbasan Kod QR Kaunter Kunci, pemeriksaan bilik 48 jam, dan pendaftaran keluar.',
    sections: [
      {
        title: '4.1 Peringkat 1: Prapendaftaran Dalam Talian (Self-Service Wizard 3 Langkah)',
        steps: [
          'Langkah 1 (Maklumat Peribadi & Kontak): Pelajar mengisi Nama Penuh (MyKad/Pasport), No. Kad Pengenalan, Jantina, Tarikh Lahir, No. Telefon Sendiri, dan No. Telefon Waris / Kecemasan.',
          'Langkah 2 (Akademik UMS & Kenderaan): Masukkan No. Matrik UMS (cth: BP23110045), pilih Fakulti Pengajian, masukkan Program Pengajian, Tahun Pengajian, serta No. Pendaftaran Kenderaan jika membawa kenderaan ke kolej.',
          'Langkah 3 (Status Kunci & Bilik): Pelajar memilih salah satu daripada dua keadaan: Pilihan A ("Belum Ambil Kunci - Prapendaftaran dari Rumah") di mana status ditetapkan kepada "Pending Key"; ATAU Pilihan B ("Sudah Tahu Bilik Kunci") di mana pelajar memilih Blok Kediaman (ditapis mengikut jantina secara automatik) dan Nombor Bilik yang tertera pada surat tawaran UMS.',
          'Langkah 4: Tekan "Sahkan & Teruskan". Data profil disimpan secara selamat ke pangkalan data kolej.'
        ]
      },
      {
        title: '4.2 Peringkat 2: Pusat Pengaktifan Residen KKTF (Pintu Kawalan Wajib Imbas QR)',
        steps: [
          'Kunci Akses Keselamatan: Selepas melengkapkan prapendaftaran, sistem mengunci akses aplikasi dan memaparkan skrin "Pusat Pengaktifan Residen KKTF" dengan lencana amaran kuning ("● MENUNGGU PENGAKTIFAN QR" atau "● MENUNGGU KUNCI"). Pelajar TIDAK boleh melangkaui skrin ini tanpa imbasan fizikal.',
          'Langkah 1: Setibanya di kampus KKTF, pelajar mengambil kunci fizikal di Kaunter Kunci (Dewan Serbaguna Kolej Kediaman Tun Fuad).',
          'Langkah 2: Jika pelajar mendaftar awal tanpa bilik, masukkan nombor bilik kunci yang diterima pada paparan skrin.',
          'Langkah 3: Tekan butang hijau "Imbas Kod QR Pengaktifan Residen" (kamera pengimbas telefon dibuka secara automatik).',
          'Langkah 4: Halakan kamera telefon ke Poster Kod QR Rasmi Pengaktifan Residen yang dipamerkan di Kaunter Kunci Dewan Serbaguna atau pintu masuk blok kediaman.',
          'Langkah 5 (Pengaktifan Penuh): Sistem mengesahkan kehadiran fizikal serta-merta, menukar status residen kepada "Checked In" & "● RESIDEN AKTIF", menambah kapasiti bilik (+1), menjana Pas Residen Digital rasmi, dan membuka akses penuh ke Student Dashboard.'
        ]
      },
      {
        title: '4.3 Peringkat 3: Pemeriksaan Keadaan Bilik (Room Inspection Checklist - 48 Jam)',
        steps: [
          'Langkah 1: Buka modul "Room Inspections" pada menu sisi dalam tempoh 48 jam selepas menduduki bilik.',
          'Langkah 2: Periksa 8 komponen inventori bilik: suis lampu, soket elektrik, tombol pintu, selak tingkap, tilam, katil bertingkat, almari pakaian, dan meja belajar.',
          'Langkah 3: Tandakan status keadaan inventori (Baik / Perlu Pembaikan) bagi setiap item.',
          'Langkah 4: Muat naik gambar bukti kerosakan sedia ada (jika ada) dan tekan "Hantar Laporan Pemeriksaan". Rekod ini melindungi pelajar daripada tuntutan gantirugi di akhir semester.'
        ]
      },
      {
        title: '4.4 Peringkat 4: Langkah Pendaftaran Keluar (Check-Out) Akhir Semester',
        steps: [
          'Langkah 1: Pastikan bilik telah dibersihkan sepenuhnya dan barangan peribadi telah dikosongkan.',
          'Langkah 2: Buka modul "Check-In / Out" → Tekan butang "Mohon Daftar Keluar (Check-Out)".',
          'Langkah 3: Felo bertugas atau staf pentadbiran membuat pemeriksaan fizikal inventori bilik berasaskan rekod Room Inspection awal semester.',
          'Langkah 4: Serahkan kunci fizikal bilik di kaunter pejabat kolej.',
          'Langkah 5: Lengkapkan borang Tinjauan Kepuasan Residen (Survey Analytics) dalam talian untuk menamatkan status penghunian sesi secara rasmi.'
        ]
      }
    ]
  },
  {
    id: 'ch-eleave-student',
    number: 'Bab 5',
    title: 'Panduan Pelajar: Permohonan E-Leave & Pengesahan Kembali (QR + GPS)',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'CalendarOff',
    summary: 'Aliran lengkap permohonan keluar bermalam di luar kolej, pemantauan kelulusan warden, dan pengesahan kembali secara dwi-faktor.',
    sections: [
      {
        title: '5.1 Bila Pelajar Perlu Memohon E-Leave?',
        content: 'Mengikut Peraturan Kolej Kediaman UMS (AUKU), mana-mana pelajar yang ingin bermalam di luar kawasan kolej (sama ada pulang ke kampung, bercuti hujung minggu, urusan rasmi universiti, atau hal kecemasan keluarga) WAJIB mengemukakan permohonan E-Leave selewat-lewatnya 24 jam sebelum waktu keluar.'
      },
      {
        title: '5.2 Langkah Mengemukakan Permohonan E-Leave',
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
        title: '5.3 Langkah Pengesahan Kembali ke Kolej (Dwi-Faktor QR + GPS)',
        steps: [
          'Langkah 1: Setibanya anda di KKTF, buka aplikasi MyKKTF pada telefon anda.',
          'Langkah 2: Pergi ke menu E-Leave dan tekan butang hijau "Imbas QR Kembali" (atau buka kamera telefon biasa).',
          'Langkah 3: Semakan Geofence GPS: Sistem radar automatik menyemak bahawa anda berada dalam lingkungan 1.0km kampus KKTF (Lampu radar bertukar hijau: 🟢 Di Dalam Kampus).',
          'Langkah 4: Halakan kamera telefon pada Poster Kod QR Fizikal yang ditampal di pintu masuk blok kediaman anda atau pondok pengawal.',
          'Langkah 5: Sistem memaparkan "Kehadiran Disahkan Berjaya!" dan status cuti anda bertukar automatik kepada "TELAH KEMBALI".'
        ]
      },
      {
        title: '5.4 Apa Nak Buat Jika Telefon Kehabisan Bateri / Tiada Data?',
        content: 'Sekiranya telefon anda kehabisan bateri atau mengalami masalah rangkaian internet semasa tiba, sila berjumpa terus dengan Felo/Warden bertugas di blok anda. Warden boleh melakukan "Pengesahan Kepulangan Manual" bagi pihak anda.'
      },
      {
        title: '5.5 Pemantauan Cuti Terlewat (Overdue Leave Alert) & Tindakan Felo',
        content: 'Sekiranya pelajar gagal mengesahkan kepulangan melepasi tarikh & masa yang diluluskan, sistem secara automatik menandakan status cuti sebagai "TERLEWAT / OVERDUE" berserta lencana merah berdenyut pada Papan Pemuka Warden. Ini membolehkan felo bertugas segera menghubungi pelajar atau nombor telefon waris kecemasan bagi memastikan keselamatan residen.'
      }
    ]
  },
  {
    id: 'ch-maintenance',
    number: 'Bab 6',
    title: 'Aliran Aduan Kerosakan & Pemantauan WhatsApp Group Penyelenggaraan JPP',
    roleLabel: 'Pelajar, Felo & Staf',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'Wrench',
    summary: 'Aliran pemantauan kerosakan baharu: integrasi portal MyServ UMS dan pemajuan aduan ke WhatsApp Group Penyelenggaraan KKTF bersama PIC JPP & Kontraktor.',
    sections: [
      {
        title: '6.1 Aliran Baharu Penyelenggaraan & JPP UMS',
        content: 'Bahagian pentadbiran dan Felo kolej bertindak sebagai pemantau (Monitoring Only) bagi aduan yang dilaporkan ke sistem MyServ UMS. Sistem MyKKTF kini diintegrasikan dengan WhatsApp Group Rasmi Aduan Penyelenggaraan KKTF yang mengandungi PIC JPP Kolej, Kontraktor M&E, Awam/Civil, Kebersihan (Cleaner), Felo, dan Pentadbir Kolej.'
      },
      {
        title: '6.2 Langkah Pelajar Melaporkan Kerosakan',
        steps: [
          'Langkah 1: Pelajar membuat aduan di MyKKTF (menu Damage Reports) dengan memilih lokasi kerosakan, kategori, dan memuat naik gambar.',
          'Langkah 2: Pelajar membuat laporan rasmi di portal MyServ UMS (aset.ums.edu.my/myserv/) dan memautkan No. Rujukan REQ di MyKKTF.',
          'Langkah 3: Peringatan SLA kerosakan mula berjalan secara automatik di papan pemuka kolej.'
        ]
      },
      {
        title: '6.3 Langkah Felo/Staf Memajukan Aduan ke WhatsApp Group KKTF',
        steps: [
          'Langkah 1: Felo atau staf membuka modul "Damage Reports".',
          'Langkah 2: Pada kad kerosakan pelajar, tekan butang hijau "📱 Majukan ke WhatsApp JPP".',
          'Langkah 3: Tetingkap pratonton mesej rasmi akan dibuka dengan teks yang telah diformat secara pintar mengikut unit (cth: @M&E Elektrik, @Awam & Paip, @Cleaner / Kebersihan).',
          'Langkah 4: Tekan "Buka WhatsApp Sekarang" untuk terus menghantar mesej ke WhatsApp Group Penyelenggaraan KKTF bagi tindakan pantas juruteknik bertugas.',
          'Langkah 5: Catat nota susulan (Follow-Up Note) di MyKKTF untuk merekodkan status perbincangan dengan pihak JPP.'
        ]
      },
      {
        title: '6.4 Peringatan SLA Automatik & Penutupan Aduan Selesai',
        steps: [
          'Langkah 1: Sistem memantau tempoh aduan secara automatik (Peringatan harian dicetuskan jika aduan melebihi 24 jam tanpa tindakan).',
          'Langkah 2: Selepas kerja pembaikan fizikal disiapkan oleh pihak kontraktor JPP di bilik pelajar, staf kolej atau felo menyemak hasil kerja.',
          'Langkah 3: Buka kad aduan berkenaan → Tukar status kepada "Completed" berserta catatan ulasan pembaikan dan gambar hasil siap bagi menutup tiket laporan.'
        ]
      }
    ]
  },
  {
    id: 'ch-merit-demerit',
    number: 'Bab 7',
    title: 'Sistem Merit, Tuntutan Sukan, Lantikan AJK & Matriks Pemilih Residen',
    roleLabel: 'Semua Pengguna (Pelajar, JAKMAS, Felo & Pentadbir)',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'Trophy',
    summary: 'Panduan lengkap pengumpulan merit aktiviti, tuntutan merit sukan mahasiswa (atlet kolej/negeri/negara), skala pingat, tangga mata AJK JAKMAS, penapis blok jagaan felo, simulator kuota penempatan, dan semakan jawatankuasa pemilih residen.',
    sections: [
      {
        title: '7.1 Matriks Jawatankuasa Pemilih Residen (Pengetua & Felo)',
        content: 'Matriks Pemilih Residen (`/merit-demerit`) adalah papan kawalan strategi kolej untuk menentukan kelayakan penghunian bilik sesi hadapan secara adil dan telus. Sistem ini menggabungkan kehadiran aktiviti rasmi, markah pelantikan kepimpinan JAKMAS/AJK, inisiatif sukarelawan Dapur Siswa, pengiktirafan atlit sukan kolej, serta penalti pemotongan dimerit tatatertib.'
      },
      {
        title: '7.2 Langkah Pelajar Menuntut Merit Sukan (Sports Merit Claim)',
        steps: [
          'Langkah 1: Pelajar membuka modul "Merit & Dimerit" (/merit-demerit) pada telefon pintar atau komputer.',
          'Langkah 2: Pada spanduk utama atau bar tajuk, tekan butang "🏆 Tuntut Merit Sukan".',
          'Langkah 3: Masukkan Nama Acara / Kejohanan Sukan, Jenis Sukan (cth: Bola Sepak, Badminton, Olahraga, Catur), dan Tarikh Kejohanan.',
          'Langkah 4: Pilih Peringkat Pertandingan: Kolej / Zon Dalaman (+10 hingga +25 mata), Antara Universiti / SUKUM (+15 hingga +35 mata), Negeri / Daerah (+25 hingga +50 mata), Kebangsaan (+40 hingga +80 mata), atau Antarabangsa (+60 hingga +100 mata).',
          'Langkah 5: Pilih Pencapaian Pingat: 🥇 Pingat Emas (Juara), 🥈 Pingat Perak (Naib Juara), 🥉 Pingat Gangsa (Ketiga), atau 🎖️ Sijil Penyertaan Rasmi.',
          'Langkah 6: Wajib lampirkan Dokumen Bukti Sah (format PDF, PNG, JPG atau WebP) seperti Sijil Kejohanan Rasmi, Surat Pelepasan Pusat Sukan UMS, atau Gambar Naik Podium / Kalungan Pingat.',
          'Langkah 7: Tekan butang "Hantar Tuntutan Merit". Permohonan akan dihantar secara masa nyata ke peti masuk pengesahan Felo Penyelaras Exco Sukan & Rekreasi serta Warden Bertugas.'
        ]
      },
      {
        title: '7.3 Skala & Rubrik Rasmi Mata Merit Sukan KKTF',
        steps: [
          'Peringkat Antarabangsa: Emas (+100 Mata) | Perak (+85 Mata) | Gangsa (+75 Mata) | Penyertaan (+60 Mata)',
          'Peringkat Kebangsaan (cth: SUKMA / Kejohanan Terbuka Kebangsaan): Emas (+80 Mata) | Perak (+65 Mata) | Gangsa (+55 Mata) | Penyertaan (+40 Mata)',
          'Peringkat Negeri / Daerah (cth: SAGA / Kejohanan Terbuka Sabah): Emas (+50 Mata) | Perak (+40 Mata) | Gangsa (+35 Mata) | Penyertaan (+25 Mata)',
          'Peringkat Antara Universiti (cth: SUKUM / MASUM / Karnival Sukan IPT): Emas (+35 Mata) | Perak (+30 Mata) | Gangsa (+25 Mata) | Penyertaan (+15 Mata)',
          'Peringkat Kolej Kediaman (cth: Sukan Antara Blok KKTF / SUKOL): Emas (+25 Mata) | Perak (+20 Mata) | Gangsa (+15 Mata) | Penyertaan (+10 Mata)',
          'Nota Aliran Pengesahan: Merit sukan hanya akan dikreditkan ke dalam Buku Log Merit dan Transkrip Sahsiah selepas disahkan dan diluluskan oleh Felo Penyelaras Exco Sukan & Rekreasi atau Warden.'
        ]
      },
      {
        title: '7.4 Penapis Blok Jagaan Felo (1-Klik Fokus)',
        steps: [
          'Langkah 1: Felo/Warden log masuk ke dalam sistem.',
          'Langkah 2: Pada bahagian atas jadual matriks, tekan butang "⭐ Blok Saya (Block B, Block G)".',
          'Langkah 3: Sistem secara automatik menapis senarai hanya kepada mahasiswa yang mendiami blok di bawah kawal selia felo berkenaan.',
          'Langkah 4: Felo boleh menyemak rekod setiap pelajar dan membuat pelarasan status pemohon.'
        ]
      },
      {
        title: '7.5 Simulator Kuota Katil & Kriteria Keutamaan Bertingkat (Priority Buckets)',
        steps: [
          'Langkah 1: Pengetua atau Pentadbir membuka tetingkap "Tetapan Kuota & Simulasi".',
          'Langkah 2: Masukkan had kuota fizikal katil (Lelaki & Perempuan).',
          'Langkah 3: Tetapkan hierarki kriteria keutamaan: Tier 1 (EXCO JAKMAS & Ketua Blok), Tier 2 (Sukarelawan Dapur Siswa & Atlit), Tier 3 (Pengarah, Setiausaha & AJK Program), dan Sekatan Automatik Dimerit Disiplin.',
          'Langkah 4: Tekan "⚡ Jalankan Simulasi Automatik". Sistem akan menjana status Draf Simulasi Sedang Disemak mengikut urutan merit merit bersih tanpa mengubah keputusan muktamad secara melulu.'
        ]
      },
      {
        title: '7.6 Semakan Jawatankuasa Pemilih & Pelarasan Budi Bicara Felo',
        steps: [
          'Langkah 1: Felo dan Pengetua menyemak setiap baris calon dalam jadual matriks.',
          'Langkah 2: Pada lajur "Pelarasan Panel", felo boleh menggunakan budi bicara untuk melaraskan status individu: "✓ Layak (Budi Bicara)", "⏳ Senarai Menunggu", atau "✕ Tolak Permohonan".',
          'Langkah 3: Selepas persetujuan penuh mesyuarat jawatankuasa dicapai, Pengetua menekan butang "🏛️ Muktamadkan Panel".'
        ]
      },
      {
        title: '7.7 Skala Markah Lantikan AJK JAKMAS & Urusetia',
        steps: [
          'Pengarah / Timbalan Pengarah Program Kolej: +35 Mata',
          'Setiausaha / Bendahari Acara: +30 Mata',
          'Ketua Biro (Protokol, Makanan, Teknikal, dll): +25 Mata',
          'AJK Pelaksana / Sekretariat / Urusetia: +20 Mata',
          'Peserta Program Kolej: +10 Mata (Melalui Imbasan QR Pas Residen)',
          'Gotong-Royong Perdana / Khidmat Blok: +15 Mata'
        ]
      },
      {
        title: '7.8 Kategori Potongan Dimerit Disiplin & Jam Malam',
        content: 'Pemotongan markah dikenakan oleh felo bertugas: Lewat Jam Malam / Curfew (-10 Mata), Membawa Pelawat Tanpa Kebenaran (-20 Mata), Merokok / Vape (-30 Mata), Bising Waktu Senyap (-10 Mata), dan Bilik Kotor Semasa Spot-Check (-10 Mata).'
      }
    ]
  },
  {
    id: 'ch-transcript',
    number: 'Bab 8',
    title: 'Transkrip Sahsiah & Merit Rasmi Kolej (Print & PDF-Ready dengan Kod QR)',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'Award',
    summary: 'Pengenalan kepada dokumen rasmi Transkrip Sahsiah & Merit KKTF UMS, kepala surat berlogo rasmi, rumusan markah, perakuan Pengetua, dan kod QR verifikasi sijil.',
    sections: [
      {
        title: '8.1 Apa itu Transkrip Sahsiah & Merit KKTF?',
        content: 'Transkrip Sahsiah & Rekod Merit Residen ialah dokumen rasmi universiti yang memperakui penglibatan kokurikulum, aktiviti pembangunan sahsiah, jawatan kepimpinan, dan rekod tatatertib mahasiswa sepanjang menetap di Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah.'
      },
      {
        title: '8.2 Ciri Keselamatan & Pengesahan Digital Pengetua',
        steps: [
          'Letterhead Rasmi: Gandingan Logo Universiti Malaysia Sabah (UMS) di sebelah kiri dan Logo Kolej Kediaman Tun Fuad (KKTF) di sebelah kanan berserta Nombor Siri Rujukan Rasmi Kolej.',
          'Penilaian Bertingkat (Tiering): Pengiktirafan 🥇 Tier Emas (≥80 Mata), 🥈 Tier Perak (50-79 Mata), dan 🥉 Tier Gangsa (<50 Mata).',
          'Perakuan Rasmi Pengetua: Ditandatangani secara digital dengan tandatangan dan cop rasmi Pengetua Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah.',
          'Kod QR Pengesahan Ketulenan Sijil: Mengandungi pautan pengesahan keselamatan terus ke portal MyKKTF bagi rujukan majikan temuduga kerja atau penaja biasiswa.'
        ]
      },
      {
        title: '8.3 Cara Menjana & Mencetak Transkrip (Format A4 PDF)',
        steps: [
          'Langkah 1 (Pelajar): Buka halaman "My Profile" atau tab "Buku Log Merit Saya" pada menu Merit & Dimerit.',
          'Langkah 2: Tekan butang "📄 Jana & Cetak Transkrip Sahsiah & Merit Rasmi KKTF (PDF)".',
          'Langkah 3: Tetingkap dokumen beresolusi tinggi akan dipaparkan berserta jadual perincian semua program dan peranan AJK anda.',
          'Langkah 4: Tekan butang "Cetak / Muat Turun PDF" untuk mencetak terus atau menyimpan sebagai fail PDF rasmi pada telefon/komputer anda.'
        ]
      }
    ]
  },
  {
    id: 'ch-contact',
    number: 'Bab 9',
    title: 'Hab Perhubungan & Talian Bantuan Hotline 24 Jam KKTF (/contact)',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'PhoneCall',
    summary: 'Saluran perhubungan rasmi: Felo Blok Jagaan Anda (Templat WhatsApp 1-Klik), Pos Jaga 24 Jam, Ambulans PKU UMS, Pejabat Pentadbiran dan Borang Bantuan Sehenti.',
    sections: [
      {
        title: '9.1 Hab Perhubungan Sehenti (/contact)',
        content: 'Bagi memastikan kebajikan dan keselamatan mahasiswa sentiasa terpelihara, MyKKTF menyediakan Hab Perhubungan & Hotline 24 Jam yang memusatkan semua saluran bantuan penting universiti dalam satu skrin.'
      },
      {
        title: '9.2 Kad Pintar Felo Blok Jagaan Mahasiswa (WhatsApp 1-Klik)',
        steps: [
          'Sistem secara pintar mengesan blok kediaman pelajar yang sedang log masuk (contoh: Pelajar Blok G ➔ memaparkan maklumat Felo Blok G yang bertugas).',
          'Tekan butang "💬 WhatsApp Felo (1-Klik)": Aplikasi membuka WhatsApp dengan templat mesej rasmi yang siap diisi dengan Nama Penuh, No. Matrik, Blok dan No. Bilik pelajar.',
          'Pelajar juga boleh menekan "Chat Dalam App" untuk berhubung terus melalui saluran sembang dalaman kolej.'
        ]
      },
      {
        title: '9.3 Talian Kecemasan & Hotline 24 Jam',
        steps: [
          '🚨 Pondok Keselamatan KKTF (Pos Jaga 24 Jam): Panggilan telefon terus dan WhatsApp kecemasan kepada pengawal bertugas di pos masuk.',
          '🚑 Pusat Kesihatan Universiti (PKU UMS): Talian ambulans dan rawatan kecemasan kampus 24 jam.',
          '✉️ Kaunter Pejabat Pentadbiran KKTF: Saluran e-mel rasmi pentadbiran kolej dan waktu operasi perkhidmatan kaunter pentadbiran.',
          '💜 Biro Kebajikan JAKMAS: Saluran aduan kebajikan pelajar dan inisiatif Dapur Siswa.'
        ]
      },
      {
        title: '9.4 Borang Pertanyaan & Aduan Sehenti',
        content: 'Mahasiswa boleh mengisi borang terus dalam talian dengan memilih kategori (Kebajikan, Fasiliti, E-Leave, Merit, Pertanyaan Umum) untuk dihantar terus ke peti masuk urus setia pentadbiran kolej.'
      }
    ]
  },
  {
    id: 'ch-principal',
    number: 'Bab 10',
    title: 'Suite Eksekutif Pengetua & Matriks Tadbir Urus Felo Kolej',
    roleLabel: 'Pengetua & Pentadbir Utama Sahaja',
    allowedRoles: ['principal', 'super_admin', 'college_admin'],
    icon: 'ShieldCheck',
    summary: 'Pusat kawalan strategik Pengetua Kolej: watikah pelantikan Felo Penyelaras EXCO JAKMAS secara dinamik, pengesahan lantikan Felo Penyelaras Acara, kawalan penugasan blok felo berpusat, dan KPI masa nyata pangkalan data.',
    sections: [
      {
        title: '10.1 Papan Pemuka Suite Eksekutif Pengetua',
        content: 'Suite Eksekutif Pengetua di papan pemuka pentadbir menyediakan visualisasi berprestij tinggi khusus untuk Pengurusan Eksekutif Kolej. Papan ini menggabungkan tindakan berkepentingan tinggi dengan pemantauan strategik kolej.'
      },
      {
        title: '10.2 Watikah Pelantikan Felo Penyelaras EXCO JAKMAS oleh Pengetua Kolej',
        steps: [
          'Kuasa Mutlak Pengetua: Pengetua Kolej Kediaman Tun Fuad memegang kuasa mutlak melantik Felo Penyelaras bagi memimpin dan membimbing portfolio EXCO JAKMAS kolej.',
          'Pelantikan Fleksibel & Berbilang Portfolio: Seorang felo boleh diberi amanah menyelaras satu atau beberapa Portfolio EXCO mengikut kepakaran dan keperluan pengurusan kolej.',
          'Pelantikan Dinamik Berasaskan Felo Berdaftar: Senarai pemilihan pegawai dijana secara dinamik daripada felo sebenar yang berdaftar dengan sistem kolej. Ini mengelakkan senarai kaku dan mengelakkan kekeliruan sekiranya terdapat felo terdahulu yang telah tamat perkhidmatan atau berpindah.',
          'Pengurusan Status Felo: Pentadbir dan Pengetua boleh memantau status Felo ("Aktif Bertugas" vs "Tamat Perkhidmatan") secara telus pada direktori kolej.',
          'Watikah Pentauliahan Rasmi: Felo yang dilantik menerima pentauliahan digital rasmi berserta cop mohor kolej dan pengiktirafan lencana khas "Felo Penyelaras EXCO" di bar atas serta papan pemuka mereka.'
        ]
      },
      {
        title: '10.3 Pengesahan Lantikan Felo Penyelaras Program (1-Klik Kelulusan)',
        steps: [
          'Langkah 1: Acara yang dicadangkan oleh JAKMAS dengan cadangan nama Felo Penyelaras akan muncul di Pusat Tindakan Eksekutif Pengetua.',
          'Langkah 2: Pengetua menyemak nama program dan felo yang dicadangkan.',
          'Langkah 3: Tekan butang "Sahkan Lantikan (Pengetua)". Felo berkenaan diberi kuasa rasmi untuk mengesahkan dan mengkreditkan mata merit AJK program tersebut.'
        ]
      },
      {
        title: '10.4 Matriks Tadbir Urus Felo & Kawalan Blok Berpusat',
        steps: [
          'Penetapan Blok Berpusat: Pengetua dan Ketua Pentadbiran menetapkan blok kawalan felo di modul Block Assignment (`/block-assignment`).',
          'Paparan Profil Felo: Di halaman My Profile, felo mempunyai paparan baca-sahaja (Read-Only) bagi blok jagaan mereka demi mengekalkan integriti arahan pentadbiran.',
          'Jadual Komunikasi Felo: Pengetua boleh menyemak senarai lengkap semua felo, e-mel, blok jagaan, dan pautan komunikasi terus pegawai.'
        ]
      },
      {
        title: '10.5 Indeks Prestasi Strategik Kolej (KPI Pulse Dinamik Sebenar)',
        content: 'Semua angka pada KPI Pengetua dijana 100% secara masa nyata dari pangkalan data: Kadar Penghunian Katil (%), Program Aktif & Kehadiran Mahasiswa, Sukarelawan Kebajikan Dapur Siswa Berdaftar, dan Demografi Jantina Siswa/Siswi.'
      }
    ]
  },
  {
    id: 'ch-welfare',
    number: 'Bab 11',
    title: 'Panduan Pelajar: Suara Mahasiswa & Whistleblowing Sulit',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'HeartHandshake',
    summary: 'Saluran rasmi menyuarakan isu kebajikan, keselesaan rakan sebilik, perkhidmatan kafeteria, dan aduan sulit tanpa nama.',
    sections: [
      {
        title: '11.1 Kategori Aduan Kebajikan',
        content: 'Modul Feedback & Welfare diasingkan daripada kerosakan fizikal. Gunakan saluran ini untuk: Isu Kebajikan & Keselamatan Residen, Rakan Sebilik & Waktu Senyap (Quiet Hours), Kualiti Makanan & Kebersihan Kafeteria, Layanan Kaunter Staf/Penyelia, dan Cadangan Program/Kemudahan Baharu.'
      },
      {
        title: '11.2 Langkah Menghantar Aduan Sulit (Anonymous Whistleblower)',
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
    number: 'Bab 12',
    title: 'Panduan Pelajar: Tempahan Fasiliti, Acara Kolej & Kehadiran QR',
    roleLabel: 'Pelajar & JAKMAS',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'Building2',
    summary: 'Panduan menempah dewan dan gelanggang kolej, mendaftar aktiviti anjuran JAKMAS, serta mengimbas kod QR kehadiran merit.',
    sections: [
      {
        title: '12.1 Langkah Menempah Kemudahan Kolej (Facilities)',
        steps: [
          'Langkah 1: Buka modul "Facilities" pada menu sisi.',
          'Langkah 2: Pilih fasiliti yang diingini: Dewan Serbaguna, Bilik Diskusi/Seminar, Gelanggang Futsal, atau Gelanggang Badminton.',
          'Langkah 3: Pilih Tarikh dan Slot Masa (Pagi / Petang / Malam). Sistem akan menolak slot yang telah ditempah secara automatik.',
          'Langkah 4: Nyatakan tujuan penggunaan (cth: Latihan Kebudayaan, Ulang Kaji Kumpulan) dan tekan "Hantar Tempahan".'
        ]
      },
      {
        title: '12.2 Langkah Mendaftar Acara di Modul Events',
        steps: [
          'Langkah 1: Buka modul "Events" (/events) untuk melihat takwim aktiviti anjuran JAKMAS dan pihak pengurusan kolej.',
          'Langkah 2: Teliti butiran program (Tarikh, Masa, Lokasi, Penganjur, dan Had Kuota Peserta).',
          'Langkah 3: Tekan "Daftar Acara" untuk menempah tempat anda. Pengesahan pendaftaran akan disimpan ke dalam rekod aktiviti anda.'
        ]
      },
      {
        title: '12.3 Langkah Mengesahkan Kehadiran QR & Kod Token Manual (/attendance)',
        steps: [
          'Langkah 1: Pada hari program berlangsung, buka modul "Attendance" (/attendance) pada telefon pintar anda.',
          'Langkah 2: Pilih mod pengesahan: Mod Kamera Pengimbas QR ATAU Mod Masukkan Kod Token Manual.',
          'Langkah 3 (Mod Kamera): Tekan "Buka Kamera Pengimbas" dan halakan lensa telefon ke Kod QR Acara rasmi yang dipamerkan oleh urusetia di pintu dewan.',
          'Langkah 4 (Mod Kod Token Manual): Sekiranya kamera telefon anda bermasalah atau pencahayaan malap, pilih tab manual dan masukkan 6-digit Kod Token Acara yang disediakan.',
          'Langkah 5 (Pengesahan Masa Nyata): Sistem mengesahkan kehadiran anda dalam masa nyata berserta nada bunyi pengesahan dan animasi konfeti 🎊 (Status: Present).',
          'Langkah 6 (Kredit Merit Serta-Merta): Mata merit aktiviti kolej (+10 Mata Peserta) dikreditkan secara automatik ke dalam profil merit residen dan Transkrip Sahsiah anda.'
        ]
      },
      {
        title: '12.4 Pemantauan Langsung Kehadiran oleh Urusetia JAKMAS',
        steps: [
          'Langkah 1: Urusetia program atau EXCO JAKMAS membuka modul "Attendance".',
          'Langkah 2: Sistem memaparkan Kaunter Kehadiran Langsung (Live Attendee Counter) yang bertambah secara masa nyata setiap kali mahasiswa mengimbas.',
          'Langkah 3: Urusetia boleh menyemak senarai nama penghuni yang telah hadir, atau membuat carian No. Matrik manual sekiranya terdapat pelajar yang memerlukan bantuan pendaftaran.'
        ]
      }
    ]
  },
  {
    id: 'ch-ai',
    number: 'Bab 13',
    title: 'KKTF Assistant AI: Panduan Pembantu Maya Pintar Kolej 24/7',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
    icon: 'Sparkles',
    summary: 'Cara memanfaatkan pembantu kecerdasan buatan untuk mendapatkan rujukan peraturan, panduan kolej, dan bantuan segera.',
    sections: [
      {
        title: '13.1 Berinteraksi dengan KKTF Assistant',
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
    number: 'Bab 14',
    title: 'Panduan Felo & Warden: Kelulusan Cuti, Pusat Tindakan Penyelaras & Tuntutan Sukan',
    roleLabel: 'Warden & Pentadbir Sahaja',
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin'],
    icon: 'ShieldCheck',
    summary: 'Aliran kerja khusus felo: kelulusan cuti blok, pusat tindakan felo penyelaras EXCO, semakan & pengesahan tuntutan merit sukan mahasiswa, cetakan poster QR rasmi, dan semakan residen (view-only).',
    sections: [
      {
        title: '14.1 Skop Kuasa & Privasi Mengikut Blok',
        content: 'Felo/Warden hanya boleh melihat permohonan cuti, laporan kerosakan, dan rekod residen bagi blok yang ditugaskan kepada mereka di bawah entiti WardenBlock (cth: Felo Blok G hanya melihat residen Blok G).'
      },
      {
        title: '14.2 Pusat Tindakan Felo Penyelaras EXCO & Pengesahan Merit Sukan',
        steps: [
          'Lencana Felo Penyelaras: Felo yang menerima watikah lantikan Pengetua akan dipaparkan lencana berprestij "Felo Penyelaras EXCO" pada bar atas aplikasi (TopBar) dan Papan Pemuka Felo.',
          'Paparan Portfolio Diselia: Papan Pemuka memaparkan senarai portfolio EXCO yang berada di bawah bimbingan felo berkenaan.',
          'Pusat Tuntutan Merit Sukan Menunggu Pengesahan: Felo Penyelaras Exco Sukan & Rekreasi serta Warden boleh melihat kad notifikasi tuntutan merit sukan yang dikemukakan oleh atlet kolej.',
          'Semakan Bukti Dokumen: Felo meneliti nama kejohanan, sukan, peringkat pertandingan, pencapaian pingat, dan membuka lampiran bukti (sijil/surat pelepasan/foto).',
          'Kelulusan & Pengkreditan 1-Klik: Felo menekan "Luluskan Tuntutan" untuk memasukkan markah merit secara automatik ke profil pelajar berserta catatan pengesahan rasmi felo.'
        ]
      },
      {
        title: '14.3 Langkah Memproses Kelulusan E-Leave',
        steps: [
          'Langkah 1: Buka modul "E-Leave" atau "Leave Monitor".',
          'Langkah 2: Semak senarai permohonan berstatus "Pending Approval".',
          'Langkah 3: Teliti destinasi, tarikh pulang, dan alasan cuti pelajar.',
          'Langkah 4: Tekan butang hijau "Luluskan (Approve)" atau butang merah "Tolak (Reject)". Pelajar akan menerima notifikasi tolak pada telefon mereka serta-merta.'
        ]
      },
      {
        title: '14.4 Langkah Menjana & Mencetak Poster Kod QR A4 Rasmi',
        steps: [
          'Langkah 1: Di modul E-Leave, tekan butang "Poster QR Blok".',
          'Langkah 2: Pilih blok jagaan anda daripada menu pilihan lokasi (cth: Blok G).',
          'Langkah 3: Tekan butang "Cetak Poster A4 Rasmi".',
          'Langkah 4: Tetingkap cetakan resolusi tinggi dibuka secara automatik dengan reka bentuk poster rasmi UMS, panduan 3 langkah pelajar, dan kod QR HD.',
          'Langkah 5: Cetak pada kertas A4 (atau laminate) dan tampal di papan kenyataan pintu masuk blok kediaman.'
        ]
      },
      {
        title: '14.5 Langkah Pengesahan Kepulangan Manual (Rondaan Blok)',
        steps: [
          'Langkah 1: Jika terdapat pelajar yang terlupa mengimbas atau kehabisan bateri, buka kad permohonan pelajar tersebut.',
          'Langkah 2: Tekan butang "Sahkan Kepulangan Pelajar (Manual Clearance)".',
          'Langkah 3: Status cuti pelajar akan dikemas kini kepada "TELAH KEMBALI" berserta catatan pengesahan felo.'
        ]
      },
      {
        title: '14.6 Direktori Residen (Akses Paparan Sahaja / View-Only)',
        content: 'Warden boleh mencari nama, no. bilik, dan kontak waris kecemasan pelajar di halaman Student Management melalui butang mata (👁️). Butang Tambah, Edit, dan Padam pelajar disembunyikan sepenuhnya demi mengekalkan integriti rekod pendaftaran kolej.'
      }
    ]
  },
  {
    id: 'ch-jakmas',
    number: 'Bab 15',
    title: 'Panduan EXCO JAKMAS: Struktur 9 Portfolio Rasmi Sesi 2025/2026 & Pengurusan Acara',
    roleLabel: 'JAKMAS & Pentadbir Sahaja',
    allowedRoles: ['jakmas', 'staff', 'college_admin', 'super_admin'],
    icon: 'ClipboardList',
    summary: 'Panduan struktur 9 portfolio EXCO JAKMAS KKTF sesi 2025/2026, hubungan bimbingan Felo Penyelaras, pengurusan aktiviti kolej, draf pengumuman rasmi, dan kemajuan tugasan.',
    sections: [
      {
        title: '15.1 Struktur Rasmi 9 Portfolio EXCO JAKMAS KKTF Sesi 2025/2026',
        steps: [
          '1. Exco Kebajikan dan Keselamatan (Dipimpin oleh Yang Dipertua - YDP): Menjaga hal ehwal kebajikan, bantuan makanan/Dapur Siswa, rondaan keselamatan blok, dan penginapan residen.',
          '2. Exco Akademik dan Kepimpinan (Dipimpin oleh Naib Yang Dipertua - NYDP): Bengkel kecemerlangan akademik, program pembangunan modal insan, dan latihan kepimpinan mahasiswa.',
          '3. Exco Perhubungan Korporat dan Antarabangsa (Dipimpin oleh Setiausaha Kehormat - SU): Surat-menyurat rasmi, kolaborasi agensi luar, jaringan alumni, dan program mahasiswa antarabangsa.',
          '4. Exco Kerohanian dan Pembangunan Sahsiah (Dipimpin oleh Bendahari Kehormat): Pengurusan kewangan kolej, aktiviti keagamaan, tazkirah, kuliah moral, dan pembentukan sahsiah murni.',
          '5. Exco Keusahawanan: Karnival keusahawanan, gerai jualan siswa, bengkel perniagaan digital, dan dana pusingan mahasiswa.',
          '6. Exco Kesukarelawanan dan Kemasyarakatan: Misi bantuan bencana, khidmat komuniti luar bandar, aktiviti alam sekitar, dan gotong-royong perdana.',
          '7. Exco Media dan Publisiti: Reka bentuk grafik poster digital, siaran media sosial rasmi KKTF, liputan fotografi acara, dan montaj video.',
          '8. Exco Sukan dan Rekreasi: Kejohanan sukan antara blok (SUKOL), riadah residen, kejohanan e-sukan, dan penyelarasan tuntutan merit atlet sukan kolej.',
          '9. Exco Kesenian dan Kebudayaan: Malam kebudayaan KKTF, persembahan seni tari/muzik tradisional, teater, dan karnival warisan etnik Sabah.'
        ]
      },
      {
        title: '15.2 Hubungan Bimbingan Bersama Felo Penyelaras Portfolio',
        content: 'Setiap EXCO JAKMAS dibimbing secara langsung oleh Felo Penyelaras yang ditauliahkan oleh Pengetua Kolej. EXCO perlu berhubung dengan Felo Penyelaras portfolio masing-masing sebelum memulakan perancangan aktiviti, menyediakan kertas kerja, dan menyemak kelayakan peserta program.'
      },
      {
        title: '15.3 Langkah Mencipta Program / Acara Kolej',
        steps: [
          'Langkah 1: Buka modul "Events" → Tekan "Tambah Acara".',
          'Langkah 2: Masukkan Nama Acara, Tarikh, Masa Mula/Tamat, Tempat (Venue), dan Had Peserta.',
          'Langkah 3: Tulis keterangan program dan muat naik poster digital.',
          'Langkah 4: Selepas acara diterbitkan, sistem akan menjana Kod QR Kehadiran khusus untuk dipaparkan kepada peserta semasa hari kejadian.'
        ]
      },
      {
        title: '15.4 Langkah Merangka Draf Pengumuman Rasmi',
        steps: [
          'Langkah 1: Buka modul "Announcements" → Tekan "Draf Pengumuman".',
          'Langkah 2: Pilih Kategori: Acara, Sukan, Aktiviti Pelajar, atau Umum.',
          'Langkah 3: Tulis tajuk dan isi pengumuman.',
          'Langkah 4: Hantar draf untuk semakan dan kelulusan Pentadbir Kolej sebelum disiarkan kepada semua penghuni.'
        ]
      },
      {
        title: '15.5 Langkah Mengemaskini Tugasan Portfolio (JAKMAS Tasks)',
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
    number: 'Bab 16',
    title: 'Panduan Pentadbir & Staf: Penyelarasan Bilik, Pengurusan Felo, AI & Audit',
    roleLabel: 'Pentadbir Utama & Staf Sahaja',
    allowedRoles: ['staff', 'college_admin', 'super_admin'],
    icon: 'ScrollText',
    summary: 'Pengurusan inventori bilik, penyelarasan kapasiti katil, pengurusan direktori felo berdaftar, pelantikan EXCO, muat naik dokumen AI, dan Audit Log forensik.',
    sections: [
      {
        title: '16.1 Penyelarasan Kapasiti Bilik & Katil (Room Sync)',
        steps: [
          'Langkah 1: Buka modul "Rooms" (Pengurusan Bilik).',
          'Langkah 2: Klik butang "Penyelarasan Kapasiti (Sync Beds)".',
          'Langkah 3: Sistem menyelaraskan semula bilangan penghuni aktif dengan kapasiti katil sebenar setiap bilik secara automatik (Available / Occupied / Full).'
        ]
      },
      {
        title: '16.2 Pengurusan Direktori Warden & Felo Berdaftar',
        steps: [
          'Jemputan & Pendaftaran Felo Baharu: Pentadbir boleh menjana pautan jemputan atau mendaftarkan pegawai felo/warden baharu yang melapor diri bertugas di kolej.',
          'Status Perkhidmatan: Membolehkan penetapan status felo kepada "Aktif Bertugas" atau "Tamat Perkhidmatan" sekiranya felo berkenaan telah tamat tempoh perkhidmatan atau bertukar kolej/jabatan.',
          'Pencegahan Kekeliruan: Mengelakkan nama pegawai yang sudah tidak berkhidmat daripada terpilih dalam senarai lantikan Felo Penyelaras EXCO atau penugasan blok kediaman.'
        ]
      },
      {
        title: '16.3 Pangkalan Pengetahuan AI (AI Knowledge Base) & Muat Naik Dokumen',
        steps: [
          'Langkah 1: Buka modul "AI Knowledge" (Pengetahuan AI).',
          'Langkah 2: Tekan butang "Muat Naik Dokumen" untuk mengimport fail dokumen peraturan atau SOP kemasukan (.txt, .doc, .md).',
          'Langkah 3: Sistem membaca kandungan fail secara automatik dan mengisi borang pengetahuan.',
          'Langkah 4: Tekan "Simpan ke Memori AI". AI Assistant akan terus merujuk dokumen tersebut dalam jawapan kepada pelajar.'
        ]
      },
      {
        title: '16.4 Pengurusan Pelantikan EXCO JAKMAS & Felo Penyelaras',
        content: 'Pada modul pentadbiran, pegawai boleh melantik mahasiswa ke dalam 9 Portfolio EXCO JAKMAS, menyemak watikah lantikan Felo Penyelaras yang dikeluarkan oleh Pengetua Kolej, serta memantau KPI tugasan setiap biro.'
      },
      {
        title: '16.5 Jejak Audit Log Forensik Data (Kotak Hitam Keselamatan)',
        content: 'Buka modul "Audit Log" untuk menyiasat sebarang aktiviti penambahan, kemaskini, atau pemadaman data merentas semua modul. Setiap tindakan direkodkan dengan identiti pengguna dan cap masa milisaat yang tidak boleh dimanipulasi.'
      }
    ]
  },
  {
    id: 'ch-faq',
    number: 'Bab 17',
    title: 'Soalan Lazim (FAQ) & Penyelesaian Masalah (Troubleshooting)',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'],
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
        title: 'S4: Kenapa saya terkunci pada paparan "Pusat Pengaktifan Residen" dan tidak boleh membuka Student Dashboard?',
        content: 'Penyelesaian: Ini adalah pintu kawalan keselamatan rasmi kolej bagi memastikan anda benar-benar telah melapor diri dan tiba secara fizikal di kampus. Sila ambil kunci bilik di Kaunter Kunci (Dewan Serbaguna KKTF) dan tekan butang "Imbas Kod QR Pengaktifan Residen" untuk mengimbas poster QR yang dipamerkan di kaunter/pintu blok. Selepas imbasan berjaya, Pas Residen Digital dan Student Dashboard anda akan terbuka serta-merta.'
      },
      {
        title: 'S5: Berapa lama tempoh semakan tuntutan merit sukan mahasiswa?',
        content: 'Penyelesaian: Permohonan tuntutan merit sukan disemak terus oleh Felo Penyelaras Exco Sukan & Rekreasi atau Warden bertugas. Pegawai akan meneliti dokumen bukti yang anda lampirkan (sijil/surat pelepasan/foto podium). Kelulusan biasanya mengambil masa 1-3 hari bekerja dan merit akan dikreditkan secara automatik ke Buku Log Merit dan Transkrip Sahsiah anda.'
      },
      {
        title: 'S6: Siapa yang perlu saya hubungi jika menghadapi masalah akaun atau teknikal?',
        content: 'Penyelesaian: Sila hubungi Kaunter Pentadbiran Kolej Kediaman Tun Fuad (UMS) pada waktu pejabat atau ajukan soalan anda terus melalui modul Hab Perhubungan (/contact) atau tanya pembantu maya KKTF Assistant AI di penjuru kanan bawah.'
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
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 1', title: 'Pemasangan Aplikasi & Pengalaman Pengguna', icon: 'Smartphone',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
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
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 2', title: 'Pas Residen Digital & Pengimbas Keselamatan', icon: 'ShieldCheck',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  {
    kind: 'feature', icon: 'ShieldCheck', tone: 'lime',
    title: 'Pas Residen Digital KKTF',
    tagline: 'Kad pengenalan digital rasmi dengan gandingan protokol logo UMS & KKTF.',
    does: [
      'Gandingan protokol rasmi: Logo UMS (Induk) di kiri & Logo KKTF di kanan',
      'Kod QR Pengesahan masa nyata untuk kawalan pintu pos keselamatan & jam malam',
      'Paparan blok kediaman dan nombor bilik sah berserta status RESIDEN AKTIF',
      'Ciri pusing kad 2 muka untuk paparan telefon waris, kecemasan dan no. plat kenderaan',
      'Boleh diakses pantas dari Student Dashboard atau My Profile pada bila-bila masa'
    ],
    roles: ['Semua Pengguna'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  {
    kind: 'feature', icon: 'ScanLine', tone: 'emerald',
    title: 'Pengimbas QR Pas Residen & Kehadiran Acara',
    tagline: 'Semakan rondaan felo & imbasan berterusan pantas (Continuous Fast Scan).',
    does: [
      'Akses keselamatan eksklusif untuk Felo, Admin, Staf dan EXCO JAKMAS',
      'Mod Semakan Rondaan: Pengesahan identiti penghuni sah & rekod log pemeriksaan blok',
      'Mod Kehadiran Program: Imbasan berterusan <0.5 saat tanpa henti menggunakan kamera telefon',
      'Maklum balas audio nada "Beep", getaran, dan pencegahan imbasan berganda (Duplicate Check)',
      'Kaunter kehadiran langsung (Live Attendee Counter) dan carian manual no. matrik'
    ],
    roles: ['Felo', 'Admin', 'JAKMAS'],
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 3', title: 'E-Leave & Keselamatan Residen', icon: 'CalendarOff',
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
    kind: 'section', label: 'Modul 4', title: 'Penyelenggaraan & WhatsApp Group JPP', icon: 'Wrench',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  {
    kind: 'feature', icon: 'Wrench', tone: 'amber',
    title: 'Pemantauan Kerosakan & WhatsApp Group JPP',
    tagline: 'Format pintar mengikut unit kerosakan & pemantauan MyServ UMS.',
    does: [
      'Aliran pemantauan kolej (Monitoring Only) berpusat ke sistem MyServ UMS',
      'Format pintar 1-klik siap tag unit (@M&E Elektrik, @Awam & Paip, @Cleaner / Kebersihan)',
      'Pemajuan terus aduan ke WhatsApp Group Penyelenggaraan KKTF bersama PIC JPP',
      'Penjejakan nota susulan (Follow-Up Note) dan peringatan SLA kerosakan'
    ],
    roles: ['Pelajar', 'Felo', 'Staf', 'Admin'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 5', title: 'Suite Eksekutif Pengetua & Matriks Pemilih Residen', icon: 'Trophy',
    allowedRoles: ['principal', 'super_admin', 'college_admin', 'warden', 'staff']
  },
  {
    kind: 'feature', icon: 'ShieldCheck', tone: 'indigo',
    title: 'Suite Eksekutif Pengetua & Tadbir Urus Felo',
    tagline: 'Pusat kelulusan lantikan felo acara, kawalan blok berpusat & KPI dinamik.',
    does: [
      'Pusat Tindakan Eksekutif: 1-klik sahkan permohonan pelantikan Felo Penyelaras Program',
      'Matriks Tadbir Urus Felo: Kawalan penugasan blok berpusat & paparan read-only bagi felo',
      'Indeks Prestasi Strategik (KPI Pulse): Kadar penghunian, merit, kebajikan & demografi 100% masa nyata',
      'Papan pemuka eksklusif direka khas untuk Pengurusan Eksekutif Kolej'
    ],
    roles: ['Pengetua', 'Pentadbir Utama'],
    allowedRoles: ['principal', 'super_admin', 'college_admin']
  },
  {
    kind: 'feature', icon: 'Trophy', tone: 'amber',
    title: 'Tuntutan Merit Sukan Mahasiswa & Verifikasi Felo Sukan',
    tagline: 'Aliran tuntutan merit atlet kolej/negeri/negara berserta semakan bukti.',
    does: [
      'Pelajar menuntut merit sukan mengikut 5 peringkat: Kolej, Universiti, Negeri, Kebangsaan, Antarabangsa',
      'Pengiktirafan merit bertingkat berasaskan pingat Emas, Perak, Gangsa atau Penyertaan Rasmi',
      'Muat naik dokumen sokongan wajib: Sijil kejohanan rasmi, surat pelepasan sukan & foto podium',
      'Notifikasi segera kepada Felo Penyelaras Exco Sukan & Rekreasi untuk verifikasi & kelulusan 1-klik'
    ],
    roles: ['Pelajar', 'Felo Sukan', 'Warden'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  {
    kind: 'feature', icon: 'BadgeCheck', tone: 'indigo',
    title: 'Struktur 9 Portfolio EXCO JAKMAS & Watikah Felo Penyelaras',
    tagline: 'Tadbir urus 9 portfolio rasmi 2025/2026 & pentauliahan Felo Penyelaras oleh Pengetua.',
    does: [
      '9 Portfolio Rasmi: Kebajikan, Akademik, Korporat, Kerohanian, Keusahawanan, Sukarelawan, Media, Sukan & Kebudayaan',
      'Watikah Pelantikan Rasmi oleh Pengetua Kolej kepada Felo Penyelaras berdaftar',
      'Satu Felo boleh membimbing satu atau beberapa portfolio mengikut keperluan dan kepakaran kolej',
      'Lencana eksklusif Felo Penyelaras pada TopBar & Pusat Tindakan Penyelaras di Dashboard Felo'
    ],
    roles: ['Pengetua', 'Felo', 'JAKMAS', 'Admin'],
    allowedRoles: ['principal', 'warden', 'jakmas', 'staff', 'college_admin', 'super_admin']
  },
  {
    kind: 'feature', icon: 'Trophy', tone: 'amber',
    title: 'Matriks Pemilihan Residen & Simulator Kuota SMP',
    tagline: 'Simulator agihan kuota bertingkat & pelarasan budi bicara jawatankuasa pemilih.',
    does: [
      'Penapis Blok Jagaan Felo: 1-klik fokus kepada mahasiswa dalam blok kawalan felo bertugas',
      'Simulator Kuota Bertingkat: Agihan katil mengikut Tier 1 (JAKMAS), Tier 2 (Dapur Siswa), Tier 3 (AJK) & Merit',
      'Sekatan Tatatertib: Penolakan automatik calon yang mempunyai rekod dimerit jam malam/tatatertib',
      'Pelarasan Budi Bicara Felo (Layak/Menunggu/Tolak) sebelum dimuktamadkan rasmi oleh Pengetua Kolej'
    ],
    roles: ['Pengetua', 'Felo', 'Admin'],
    allowedRoles: ['principal', 'super_admin', 'college_admin', 'warden']
  },
  { 
    kind: 'section', label: 'Modul 6', title: 'Transkrip Sahsiah Digital & Hab Perhubungan 24 Jam', icon: 'Award',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  {
    kind: 'feature', icon: 'Award', tone: 'purple',
    title: 'Transkrip Sahsiah & Merit Rasmi Kolej (PDF)',
    tagline: 'Format cetakan A4 rasmi dengan kod QR pengesahan ketulenan & perakuan Pengetua.',
    does: [
      'Kepala surat rasmi dengan gandingan Logo Universiti Malaysia Sabah (UMS) & Logo KKTF',
      'Rumusan markah aktiviti, lantikan AJK kepimpinan, penalti dimerit & skor bersih sahsiah',
      'Pengiktirafan rasmi bertingkat: 🥇 Tier Emas (≥80), 🥈 Tier Perak (50-79), 🥉 Tier Gangsa (<50)',
      'Perakuan rasmi ditandatangani secara digital oleh Pengetua Kolej Kediaman Tun Fuad',
      'Kod QR Pengesahan Keselamatan digital yang boleh diimbas oleh majikan temuduga'
    ],
    roles: ['Semua Pengguna'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  {
    kind: 'feature', icon: 'PhoneCall', tone: 'emerald',
    title: 'Hab Perhubungan & Hotline 24 Jam KKTF (/contact)',
    tagline: 'Saluran bantuan kecemasan sehenti & templat WhatsApp 1-klik felo blok.',
    does: [
      'Kad Pintar Felo Blok: Pengesanan automatik blok residen berserta pautan templat WhatsApp 1-klik',
      'Hotline Pos Jaga 24 Jam: Bantuan kecemasan terus kepada pengawal keselamatan bertugas',
      'Pusat Kesihatan UMS (PKU): Talian rawatan kecemasan & panggilan ambulans kampus 24 jam',
      'Borang Maklum Balas Sehenti: Hantar pertanyaan dan aduan kebajikan terus ke peti urus setia'
    ],
    roles: ['Semua Pengguna'],
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas']
  },
  { 
    kind: 'section', label: 'Modul 7', title: 'Tadbir Urus & Audit Forensik', icon: 'ScrollText',
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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('handbook'); // 'handbook' or 'slides'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState('ch-intro');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // Determine user's effective role (defaulting 'user' to 'student')
  const rawRole = user?.role;
  const userRole = (!rawRole || rawRole === 'user') ? 'student' : rawRole;
  const isJakmas = Boolean(user?.jakmasAppointment);
  const effectiveRole = isJakmas ? 'jakmas' : userRole;
  const isAdmin = userRole === 'super_admin' || userRole === 'college_admin' || userRole === 'principal' || Boolean(user?.isGuestDemo);

  // Role filter preview (Admins & MAPEK Guests can toggle view perspective - default 'all' for guest)
  const [rolePerspective, setRolePerspective] = useState(user?.isGuestDemo ? 'all' : 'auto');

  const activePerspective = rolePerspective === 'auto' ? effectiveRole : rolePerspective;
  const normalizedPerspective = (!activePerspective || activePerspective === 'user') ? 'student' : activePerspective;

  // Filter chapters based on role perspective
  const roleFilteredChapters = MANUAL_CHAPTERS.filter(ch => {
    if (normalizedPerspective === 'all') return true;
    return ch.allowedRoles.includes(normalizedPerspective) || 
           (normalizedPerspective === 'student' && ch.allowedRoles.includes('student'));
  });

  // Further filter by search query
  const displayChapters = roleFilteredChapters.filter(ch => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ch.title.toLowerCase().includes(q) || 
           ch.summary.toLowerCase().includes(q) ||
           ch.sections.some(s => s.title.toLowerCase().includes(q) || (s.content && s.content.toLowerCase().includes(q)));
  });

  // Ensure activeChapter is valid within current displayChapters
  useEffect(() => {
    if (displayChapters.length > 0 && !displayChapters.some(c => c.id === activeChapter)) {
      setActiveChapter(displayChapters[0].id);
    }
  }, [displayChapters, activeChapter]);

  // Active chapter helpers & mobile navigation
  const currentChapterIndex = displayChapters.findIndex(c => c.id === activeChapter);
  const activeChapterObj = (currentChapterIndex >= 0 ? displayChapters[currentChapterIndex] : displayChapters[0]) || null;

  const handleSelectChapter = (chId) => {
    setActiveChapter(chId);
    setMobileTocOpen(false);
    setTimeout(() => {
      const el = document.getElementById(chId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      handleSelectChapter(displayChapters[currentChapterIndex - 1].id);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < displayChapters.length - 1) {
      handleSelectChapter(displayChapters[currentChapterIndex + 1].id);
    }
  };

  // Scroll spy to update activeChapter as user scrolls
  useEffect(() => {
    if (viewMode !== 'handbook' || displayChapters.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveChapter(entry.target.id);
          }
        });
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );

    displayChapters.forEach((ch) => {
      const el = document.getElementById(ch.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [viewMode, displayChapters]);

  // Filter slides based on active perspective
  const displaySlides = ALL_SLIDES.filter(sl => {
    if (normalizedPerspective === 'all') return true;
    return sl.allowedRoles.includes(normalizedPerspective) ||
           (normalizedPerspective === 'student' && sl.allowedRoles.includes('student'));
  });

  // Ensure currentSlide is within bounds when switching perspective
  useEffect(() => {
    setCurrentSlide(0);
  }, [normalizedPerspective]);

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
    printDocument();
  }

  const slide = displaySlides[currentSlide] || displaySlides[0];
  const Icon = slide?.icon ? (ICONS[slide.icon] || PresentationIcon) : PresentationIcon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 👑 VIP GUEST SHOWCASE BANNER FOR MAPEK */}
      {user?.isGuestDemo && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-indigo-500/10 border-2 border-amber-400/80 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 shadow-sm">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] px-2.5 py-0.5">
                  👑 MAJLIS PENGETUA MAPEK
                </Badge>
                <span className="text-xs text-amber-900 dark:text-amber-200 font-semibold">
                  Akses Demonstrasi Khas — Kolej Kediaman Tun Fuad, UMS
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                Buku Panduan & Manual Operasi Sistem MyKKTF v3.1
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
                Yang Berbahagia Pengetua-Pengetua dijemput meneliti struktur dan aliran kerja modul MyKKTF di bawah. Selepas meneliti panduan, anda boleh menekan butang untuk terus menguji dan merasai pengalaman <strong>Dashboard Eksekutif Pengetua</strong> secara interaktif.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => {
                sessionStorage.setItem('mapek_has_visited_guide', 'true');
                navigate('/');
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm h-10 px-4 rounded-xl shadow-md gap-2 cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" /> Masuk Ke Dashboard Eksekutif <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

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
                  <SelectItem value="all">Semua Bab (Master Guide - 17 Bab)</SelectItem>
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
        <div className="space-y-4">
          {/* 📱 MOBILE QUICK TOP BAR: CHAPTER SELECTOR & PREV/NEXT ARROWS */}
          <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md pb-2 pt-1 border-b border-border/80 shadow-xs">
            <div className="flex items-center gap-2">
              <Sheet open={mobileTocOpen} onOpenChange={setMobileTocOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-between text-xs h-10 font-semibold bg-card border-indigo-200 text-indigo-950 shadow-xs px-3 min-w-0"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate text-left">
                        <span className="text-indigo-600 font-bold mr-1.5">{activeChapterObj?.number || 'Bab'}:</span>
                        {activeChapterObj?.title || 'Pilih Bab Panduan'}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] ml-1.5 shrink-0 bg-indigo-50 text-indigo-700 font-bold border-indigo-200">
                      {displayChapters.length} Bab ▾
                    </Badge>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] sm:max-w-md p-0 flex flex-col h-full z-50">
                  <SheetHeader className="p-4 border-b border-border text-left">
                    <SheetTitle className="text-sm font-bold flex items-center gap-2 text-indigo-950">
                      <BookOpen className="w-4 h-4 text-indigo-600" /> Bab Panduan ({displayChapters.length})
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                      Pilih bab untuk membaca nota panduan operasi Kolej Kediaman Tun Fuad.
                    </SheetDescription>
                    <div className="relative pt-2">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 translate-y-1 text-muted-foreground" />
                      <Input 
                        placeholder="Cari kata kunci (cth: QR, GPS, MyServ)..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs bg-muted/40"
                      />
                    </div>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {displayChapters.map(ch => {
                      const ChIcon = ICONS[ch.icon] || BookOpen;
                      const isActive = activeChapter === ch.id;
                      return (
                        <button
                          key={ch.id}
                          onClick={() => handleSelectChapter(ch.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                            isActive 
                              ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200' 
                              : 'text-slate-600 hover:bg-slate-50 font-medium'
                          }`}
                        >
                          <ChIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <div className="truncate">
                            <span className="text-[10px] text-muted-foreground block font-semibold">{ch.number}</span>
                            <span className="truncate block">{ch.title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Quick prev/next arrow buttons for mobile */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  disabled={currentChapterIndex <= 0}
                  onClick={handlePrevChapter}
                  className="h-10 w-10 shrink-0 border-border bg-card"
                  title="Bab Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  disabled={currentChapterIndex >= displayChapters.length - 1}
                  onClick={handleNextChapter}
                  className="h-10 w-10 shrink-0 border-border bg-card"
                  title="Bab Seterusnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* SIDEBAR TABLE OF CONTENTS (DESKTOP ONLY) */}
            <div className="hidden lg:block lg:col-span-1 space-y-4 lg:sticky lg:top-6 lg:self-start">
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
                  {normalizedPerspective === 'student' && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Pelajar</span>
                  )}
                </div>

                {displayChapters.map(ch => {
                  const ChIcon = ICONS[ch.icon] || BookOpen;
                  const isActive = activeChapter === ch.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChapter(ch.id)}
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
            <div className="col-span-1 lg:col-span-3 space-y-6 lg:space-y-8 w-full min-w-0">
              {displayChapters.map((ch, chIdx) => {
                const ChIcon = ICONS[ch.icon] || BookOpen;
                const prevCh = chIdx > 0 ? displayChapters[chIdx - 1] : null;
                const nextCh = chIdx < displayChapters.length - 1 ? displayChapters[chIdx + 1] : null;

                return (
                  <div 
                    key={ch.id} 
                    id={ch.id} 
                    className="bg-card border border-border rounded-2xl lg:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xs space-y-5 lg:space-y-6 scroll-mt-24 lg:scroll-mt-6"
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
                      <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <ChIcon className="w-4 h-4" />
                        </div>
                        <span>{ch.title}</span>
                      </h2>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {ch.summary}
                      </p>
                    </div>

                    <div className="space-y-4 sm:space-y-5">
                      {ch.sections.map((sec, sIdx) => (
                        <div key={sIdx} className="space-y-2 bg-slate-50/70 border border-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-4">
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

                    {/* CHAPTER BOTTOM NAVIGATION */}
                    <div className="border-t border-border/70 pt-3.5 mt-4 flex items-center justify-between gap-2 text-xs">
                      {prevCh ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectChapter(prevCh.id)}
                          className="text-xs text-slate-600 hover:text-indigo-600 gap-1.5 px-2.5 h-8 font-semibold"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" /> {prevCh.number}
                        </Button>
                      ) : <div />}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const mainEl = document.querySelector('main');
                          if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                          else window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-[11px] h-7 px-2.5 text-muted-foreground font-normal border-slate-200"
                      >
                        ↑ Ke Atas
                      </Button>

                      {nextCh ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSelectChapter(nextCh.id)}
                          className="text-xs text-slate-600 hover:text-indigo-600 gap-1.5 px-2.5 h-8 font-semibold"
                        >
                          {nextCh.number} <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : <div />}
                    </div>
                  </div>
                );
              })}
            </div>
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