import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon,
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Search, Printer, Smartphone,
  ShieldCheck, MapPin, QrCode, CheckCircle2, AlertCircle, HeartHandshake,
  Download, FileText, ChevronDown, ChevronUp, Share2, HelpCircle, Filter, Eye
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
  MapPin, QrCode, HeartHandshake, UserCog
};

// HANDBOOK CHAPTERS WITH STRICT ROLE-BASED ACCESS
const MANUAL_CHAPTERS = [
  {
    id: 'ch-intro',
    number: 'Bab 1',
    title: 'Pengenalan & Pemasangan Aplikasi PWA Telefon',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Smartphone',
    summary: 'Mengenali ekosistem MyKKTF dan cara memasang aplikasi pada telefon pintar tanpa melalui Google Play atau App Store.',
    sections: [
      {
        title: '1.1 Apa itu MyKKTF?',
        content: 'MyKKTF ialah Sistem Pengurusan Digital Rasmi Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah (UMS). Sistem ini mengintegrasikan pengurusan penghunian, permohonan cuti (E-Leave) ber-geofence, aduan kerosakan bersepadu UMS MyServ, kebajikan pelajar, serta pembantu kecerdasan buatan (KKTF Assistant AI).'
      },
      {
        title: '1.2 Cara Memasang Aplikasi pada Telefon Pintar (PWA)',
        steps: [
          'Pengguna iPhone (iOS Safari): Buka Safari → Layari pautan MyKKTF → Tekan ikon Kongsi (Share) di bawah → Pilih "Add to Home Screen" ➕ → Tekan "Add".',
          'Pengguna Android (Google Chrome): Buka Chrome → Layari pautan MyKKTF → Tekan spanduk "Install MyKKTF" atau menu 3 titik ⋮ → Pilih "Add to Home screen" / "Install App".',
          'Kelebihan: Ringan (<2MB), pantas, auto-update ke versi terkini tanpa perlu muat turun dari App Store.'
        ]
      },
      {
        title: '1.3 Log Masuk & Notifikasi Telefon',
        content: 'Log masuk dilakukan menggunakan e-mel rasmi universiti. Pengguna digalakkan membenarkan kebenaran "Push Notifications" pada telefon untuk menerima makluman status cuti dan kerosakan secara langsung.'
      }
    ]
  },
  {
    id: 'ch-eleave-student',
    number: 'Bab 2',
    title: 'Panduan Pelajar: Permohonan E-Leave & Pengesahan QR + GPS',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'CalendarOff',
    summary: 'Aliran lengkap permohonan kebenaran bermalam di luar kolej dan pengesahan kembali menggunakan kamera telefon serta GPS Geofencing.',
    sections: [
      {
        title: '2.1 Mengisi Permohonan Cuti Pelajar',
        steps: [
          'Buka menu E-Leave → Klik butang "Mohon Cuti / Keluar Bermalam".',
          'Pilih Jenis Cuti (Hujung Minggu, Cuti Semester, Urusan Keluarga, Rasmi UMS, Perubatan).',
          'Isi Destinasi, Sebab Permohonan, Tarikh Keluar & Tarikh Pulang yang dijangka.',
          'Permohonan akan dihantar terus kepada Felo/Warden blok kediaman anda untuk kelulusan.'
        ]
      },
      {
        title: '2.2 Pengesahan Kembali ke Kolej (Wajib)',
        steps: [
          'Setibanya di KKTF, buka aplikasi MyKKTF pada telefon anda.',
          'Tekan "Imbas QR Kembali" pada halaman E-Leave.',
          'Pastikan GPS telefon dihidupkan (sistem mengesahkan kedudukan dalam lingkungan 1.0km dari kolej).',
          'Halakan kamera pada poster kod QR fizikal yang ditampal di pintu masuk blok kediaman anda.',
          'Status cuti anda automatik bertukar kepada "TELAH KEMBALI".'
        ]
      },
      {
        title: '2.3 Peringatan Status Terlewat (Overdue)',
        content: 'Kegagalan mengimbas kod QR kembali selepas tarikh pulang yang diluluskan akan menyebabkan sistem mengaktifkan status "AMARAN TERLEWAT (OVERDUE)" dan direkodkan dalam laporan warden.'
      }
    ]
  },
  {
    id: 'ch-maintenance',
    number: 'Bab 3',
    title: 'Panduan Pelajar: Laporan Kerosakan & Pautan No. MyServ UMS',
    roleLabel: 'Pelajar & Staf',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Wrench',
    summary: 'Tatacara membuat aduan kerosakan fasiliti bilik dan cara memautkan nombor rujukan MyServ UMS untuk penjejakan SLA.',
    sections: [
      {
        title: '3.1 Melaporkan Kerosakan',
        steps: [
          'Buka modul Damage Reports (Kerosakan).',
          'Pilih Lokasi Kerosakan (Bilik Sendiri atau Ruang Awam Blok).',
          'Pilih Kategori Kerosakan (Elektrik, Paip/Air, Perabot/Pintu, Kebersihan, Awam).',
          'Tulis deskripsi ringkas kerosakan dan lampirkan gambar bukti.'
        ]
      },
      {
        title: '3.2 Pautan No. Rujukan MyServ UMS',
        content: 'Setelah membuat laporan rasmi di portal MyServ UMS, masukkan No. Rujukan MyServ (cth: REQ-2026-8812) ke dalam laporan MyKKTF anda. Sistem akan menjejak tempoh pembaikan sehingga siap.'
      }
    ]
  },
  {
    id: 'ch-welfare',
    number: 'Bab 4',
    title: 'Panduan Pelajar: Suara Mahasiswa & Whistleblowing',
    roleLabel: 'Pelajar',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'HeartHandshake',
    summary: 'Saluran rasmi menyuarakan isu kebajikan, keselesaan rakan sebilik, kafeteria, dan aduan tanpa nama.',
    sections: [
      {
        title: '4.1 Saluran Aduan & Kebajikan Residen',
        content: 'Modul Feedback & Welfare dikhaskan untuk isu bukan fizikal seperti: Isu Rakan Sebilik / Waktu Senyap, Kualiti Makanan Kafeteria, Keselamatan Blok, dan Cadangan Aktiviti Pelajar.'
      },
      {
        title: '4.2 Fungsi Identiti Dirahsiakan (Whistleblower)',
        content: 'Tandakan pilihan "Hantar Tanpa Nama (Anonymous)" sekiranya anda ingin melindungi identiti anda daripada paparan umum. Pihak Felo/Warden tetap akan menerima dan menyiasat isu tersebut.'
      }
    ]
  },
  {
    id: 'ch-events',
    number: 'Bab 5',
    title: 'Panduan Pelajar: Tempahan Fasiliti, Acara & Kehadiran QR',
    roleLabel: 'Pelajar & JAKMAS',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Building2',
    summary: 'Panduan menempah dewan/gelanggang kolej, mendaftar aktiviti JAKMAS, dan mengimbas QR kehadiran.',
    sections: [
      {
        title: '5.1 Tempahan Fasiliti Kolej',
        content: 'Pilih tarikh, masa, dan kemudahan yang ingin digunakan (Dewan Serbaguna, Bilik Diskusi, Gelanggang Sukan). Sistem mengelakkan pertembungan tempahan berganda secara automatik.'
      },
      {
        title: '5.2 Pendaftaran Acara & Kehadiran Kod QR',
        content: 'Semak senarai acara kolej pada modul Events. Semasa hari kejadian, imbas kod QR yang disediakan oleh pihak penganjur untuk merekodkan mata kehadiran merit kolej anda.'
      }
    ]
  },
  {
    id: 'ch-ai',
    number: 'Bab 6',
    title: 'KKTF Assistant AI: Panduan Pembantu Maya Pintar',
    roleLabel: 'Semua Pengguna',
    allowedRoles: ['student', 'warden', 'staff', 'college_admin', 'super_admin', 'jakmas'],
    icon: 'Sparkles',
    summary: 'Cara menggunakan pembantu kecerdasan buatan untuk mendapatkan maklumat pantas mengenai kolej 24/7.',
    sections: [
      {
        title: '6.1 Cara Bertanya kepada KKTF Assistant',
        content: 'Tekan butang ikon robot pintar di penjuru kanan bawah pada bila-bila masa. Anda boleh bertanya apa sahaja seperti: "Apakah peraturan jam malam?", "Berapa hari SLA baiki lampu?", atau "Siapa felo blok G?".'
      }
    ]
  },
  {
    id: 'ch-warden',
    number: 'Bab 7',
    title: 'Panduan Felo & Warden: Kelulusan E-Leave, Poster QR & Direktori',
    roleLabel: 'Warden & Pentadbir Sahaja',
    allowedRoles: ['warden', 'staff', 'college_admin', 'super_admin'],
    icon: 'ShieldCheck',
    summary: 'Aliran kerja felo: kelulusan cuti blok, pemantauan status terlewat, penjanaan poster QR A4, dan direktori residen (view-only).',
    sections: [
      {
        title: '7.1 Skop Blok Jagaan Felo',
        content: 'Warden hanya mempunyai akses terhadap data residen dan permohonan cuti bagi blok yang ditugaskan di bawah entiti WardenBlock. Privasi pelajar blok lain adalah dilindungi.'
      },
      {
        title: '7.2 Direktori Residen (Akses Paparan Sahaja)',
        content: 'Warden boleh mencari dan melihat butiran kontak/waris residen bilik bagi blok jagaan sendiri secara View-Only. Butang Tambah, Edit, dan Padam disekat demi keselamatan integriti rekod kolej.'
      },
      {
        title: '7.3 Menjana & Mencetak Poster Kod QR A4',
        steps: [
          'Buka modul E-Leave → Klik butang "Poster QR Blok".',
          'Pilih blok jagaan anda (hanya blok yang dibenarkan akan terpapar).',
          'Tekan butang "Cetak Poster A4 Rasmi" untuk membuka tetingkap cetakan resolusi tinggi berserta jata UMS dan arahan pelajar.',
          'Tampal poster fizikal di pintu masuk aras bawah blok kediaman atau pondok pengawal.'
        ]
      },
      {
        title: '7.4 Pengesahan Kembali Manual (Rondaan Blok)',
        content: 'Sekiranya pelajar mengalami masalah telefon atau ketiadaan bateri semasa tiba di kolej, warden boleh mengesahkan kepulangan pelajar secara manual semasa rondaan blok dengan butang "Sahkan Kembali Manual".'
      }
    ]
  },
  {
    id: 'ch-jakmas',
    number: 'Bab 8',
    title: 'Panduan EXCO JAKMAS: Pengurusan Acara, Notis & Tugasan',
    roleLabel: 'JAKMAS & Pentadbir Sahaja',
    allowedRoles: ['jakmas', 'staff', 'college_admin', 'super_admin'],
    icon: 'ClipboardList',
    summary: 'Panduan barisan EXCO Jawatankuasa Kebajikan Mahasiswa mengurus aktiviti kolej, draf pengumuman rasmi, dan kemajuan portfolio.',
    sections: [
      {
        title: '8.1 Pengurusan Acara & Kehadiran Pelajar',
        content: 'EXCO JAKMAS boleh mencipta program kolej, menetapkan had kuota peserta, dan menjana token / kod QR kehadiran program untuk diimbas oleh peserta.'
      },
      {
        title: '8.2 Draf Pengumuman Rasmi Kolej',
        content: 'JAKMAS boleh merangka notis pengumuman rasmi. Pengumuman akan melalui semakan pentadbiran kolej sebelum disiarkan secara umum kepada semua residen.'
      },
      {
        title: '8.3 Penyerahan Bukti Tugasan EXCO',
        content: 'Pada halaman "My JAKMAS Tasks", EXCO boleh mengemas kini status tugasan daripada "Ditugaskan" kepada "Sedang Dijalankan" dan memuat naik bukti kemajuan (evidence) kepada pihak penasihat kolej.'
      }
    ]
  },
  {
    id: 'ch-admin',
    number: 'Bab 9',
    title: 'Panduan Pentadbir & Staf: Penyelarasan Bilik, AI Knowledge & Audit',
    roleLabel: 'Pentadbir Utama & Staf Sahaja',
    allowedRoles: ['staff', 'college_admin', 'super_admin'],
    icon: 'ScrollText',
    summary: 'Pengurusan inventori bilik, penyelarasan kapasiti katil, pelantikan EXCO, muat naik dokumen AI, dan Audit Log forensik.',
    sections: [
      {
        title: '9.1 Penyelarasan Kapasiti Bilik (Bed Sync)',
        content: 'Pentadbir mengurus status bilik (Available, Occupied, Full, Maintenance). Menggunakan fungsi "Penyelarasan Kapasiti", sistem akan mengira semula bilangan katil terisi secara automatik mengikut rekod residen aktif.'
      },
      {
        title: '9.2 Pengurusan Pangkalan Pengetahuan AI (AI Knowledge Base)',
        content: 'Pentadbir boleh memuat naik fail dokumen (.txt, .doc, .md) mengandungi buku peraturan kolej atau SOP kemasukan. Kandungan dokumen akan disuntik terus ke memori Gemini AI untuk rujukan KKTF Assistant.'
      },
      {
        title: '9.3 Jejak Audit Log Forensik Data (Kotak Hitam)',
        content: 'Semua tindakan pendaftaran, kemas kini, pemadaman rekod, kelulusan cuti, dan pengesahan geofence GPS direkodkan bersama ID pengguna, alamat IP/metadata dan cap masa rasmi untuk kawalan tatakelola kolej.'
      }
    ]
  }
];

// ROLE-FILTERED SLIDES FOR PRESENTATION DECK
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
              Versi 3.1
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Kandungan panduan disesuaikan secara khusus mengikut peranan anda ({userRole === 'student' ? 'Pelajar Residen' : userRole === 'warden' ? 'Felo / Warden' : userRole})
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
                  <SelectItem value="all">Semua Bab (Master Guide)</SelectItem>
                  <SelectItem value="student">Pandangan Pelajar</SelectItem>
                  <SelectItem value="warden">Pandangan Warden</SelectItem>
                  <SelectItem value="jakmas">Pandangan JAKMAS</SelectItem>
                  <SelectItem value="staff">Pandangan Pentadbir</SelectItem>
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
                placeholder="Cari topik atau bab..." 
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
                  Buka <strong>KKTF Assistant AI</strong> di penjuru kanan bawah untuk bertanya sebarang soalan mengenai kolej secara terus.
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