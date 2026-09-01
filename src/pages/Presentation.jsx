import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon,
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Search, Printer, Smartphone,
  ShieldCheck, MapPin, QrCode, CheckCircle2, AlertCircle, HeartHandshake,
  Download, FileText, ChevronDown, ChevronUp, Share2, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const ICONS = {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList, BookOpen, Smartphone, ShieldCheck,
  MapPin, QrCode, HeartHandshake
};

// HANDBOOK CHAPTERS FOR READER MODE
const MANUAL_CHAPTERS = [
  {
    id: 'ch-intro',
    number: 'Bab 1',
    title: 'Pengenalan & Pemasangan Aplikasi PWA Telefon',
    role: 'Semua Pengguna',
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
        title: '1.3 Log Masuk & Peranan Pengguna',
        content: 'Log masuk dilakukan menggunakan e-mel rasmi universiti. Antara muka dashboard disesuaikan secara automatik mengikut peranan: Pelajar, Felo/Warden Blok, EXCO JAKMAS, Staf Pentadbiran, atau Pentadbir Utama (Super Admin).'
      }
    ]
  },
  {
    id: 'ch-eleave',
    number: 'Bab 2',
    title: 'Modul E-Leave & Pengesahan Kembali Ber-Geofence',
    role: 'Pelajar & Warden',
    icon: 'CalendarOff',
    summary: 'Aliran lengkap permohonan kebenaran bermalam di luar kolej, kelulusan warden, dan pengesahan kembali secara dwi-faktor (Kamera QR + GPS).',
    sections: [
      {
        title: '2.1 Aliran Permohonan Cuti Pelajar',
        steps: [
          'Pelajar membuka modul E-Leave → Klik "Mohon Cuti / Keluar Bermalam".',
          'Pilih Jenis Cuti (Hujung Minggu, Cuti Semester, Urusan Keluarga, Rasmi UMS, Perubatan).',
          'Isi Destinasi, Sebab Permohonan, Tarikh/Masa Keluar, dan Tarikh/Masa Pulang yang dijangka.',
          'Permohonan dihantar serta-merta ke dashboard Warden bagi blok kediaman pelajar.'
        ]
      },
      {
        title: '2.2 Kelulusan oleh Warden Blok',
        content: 'Warden blok menilai alasan dan rekod disiplin sebelum menekan butang "Luluskan" atau "Tolak". Notifikasi tolak telefon automatik dihantar kepada pelajar setelah keputusan dibuat.'
      },
      {
        title: '2.3 Pengesahan Kembali ke Kolej (Dwi-Faktor: QR + GPS)',
        steps: [
          'Pelajar tiba di Kolej Kediaman Tun Fuad (UMS).',
          'Buka aplikasi MyKKTF pada telefon → Klik "Imbas QR Kembali" (atau buka kamera telefon biasa).',
          'GPS telefon mengesahkan pelajar berada dalam lingkungan radius 1.0km dari koordinat pusat KKTF (6.035400, 116.121500).',
          'Kamera mengimbas kod QR fizikal pada poster rasmi di pintu masuk blok kediaman atau pondok pengawal.',
          'Status cuti pelajar automatik bertukar kepada "TELAH KEMBALI" dan rekod audit disimpan.'
        ]
      },
      {
        title: '2.4 Status Terlewat (Overdue Monitoring)',
        content: 'Jika pelajar gagal mengimbas kod QR kembali selepas tarikh pulang yang diluluskan berlalu, status rekod akan bertukar kepada AMARAN TERLEWAT (OVERDUE). Warden boleh menghubungi pelajar atau waris kecemasan yang tertera pada profil.'
      }
    ]
  },
  {
    id: 'ch-maintenance',
    number: 'Bab 3',
    title: 'Laporan Kerosakan & Integrasi MyServ UMS',
    role: 'Pelajar, Warden & Staf',
    icon: 'Wrench',
    summary: 'Panduan membuat aduan kerosakan bilik, pematuhan SLA pembaikan, dan peringatan harian pautan MyServ.',
    sections: [
      {
        title: '3.1 Melaporkan Kerosakan',
        steps: [
          'Buka modul Damage Reports (Kerosakan).',
          'Pilih Lokasi Kerosakan (Bilik Sendiri atau Ruang Awam Blok).',
          'Pilih Kategori (Elektrik, Paip, Perabot/Pintu, Kebersihan, Awam).',
          'Tulis deskripsi kerosakan dan lampirkan gambar bukti jika perlu.'
        ]
      },
      {
        title: '3.2 Pautan No. Rujukan UMS MyServ & Penjejakan SLA',
        content: 'Pelajar perlu membuat laporan pada portal MyServ UMS dan memasukkan No. Rujukan MyServ (cth: REQ-2026-8812) ke dalam MyKKTF. Sistem akan mengira jam penyelesaian (SLA Resolution Duration) secara automatik dari masa aduan dibuka hingga pengesahan siap kerja.'
      },
      {
        title: '3.3 Peringatan Harian Automatik',
        content: 'Sistem menyertakan penyekat peringatan (Throttler 1x sehari) yang memaparkan spanduk peringatan mesra di papan pemuka jika pelajar belum memautkan No. MyServ.'
      }
    ]
  },
  {
    id: 'ch-welfare',
    number: 'Bab 4',
    title: 'Suara Mahasiswa & Kebajikan (Feedback & Welfare)',
    role: 'Pelajar & Pentadbir',
    icon: 'HeartHandshake',
    summary: 'Saluran aduan bukan fizikal, keselesaan rakan sebilik, perkhidmatan kafeteria, dan whistleblowing tanpa nama.',
    sections: [
      {
        title: '4.1 Kategori Aduan & Cadangan Kebajikan',
        content: 'Modul ini dikhaskan untuk isu bukan kerosakan fizikal seperti: Kebajikan & Keselamatan Pelajar, Rakan Sebilik & Waktu Senyap, Perkhidmatan Makanan & Kafeteria, Layanan Kaunter/Staf, dan Idea Penambahbaikan Kolej.'
      },
      {
        title: '4.2 Fungsi Identiti Dirahsiakan (Whistleblowing)',
        content: 'Pelajar boleh menandakan kotak "Hantar Tanpa Nama (Anonymous Whistleblower)". Nama dan maklumat matrik pelajar akan disembunyikan daripada paparan umum demi melindungi privasi dan keselamatan pengadu.'
      }
    ]
  },
  {
    id: 'ch-ai',
    number: 'Bab 5',
    title: 'KKTF Assistant AI & Pangkalan Pengetahuan',
    role: 'Semua Pengguna & Admin',
    icon: 'Sparkles',
    summary: 'Penggunaan pembantu kecerdasan buatan dan cara pentadbir memuat naik dokumen rujukan rasmi.',
    sections: [
      {
        title: '5.1 Berinteraksi dengan KKTF Assistant',
        content: 'Klik ikon robot pintar di penjuru kanan bawah pada mana-mana halaman. Anda boleh bertanya soalan dalam Bahasa Melayu atau Bahasa Inggeris mengenai peraturan kolej, prosedur kemasukan, waktu pejabat, atau program terkini.'
      },
      {
        title: '5.2 Memuat Naik Dokumen Sumber (Pentadbir Sahaja)',
        steps: [
          'Masuk ke halaman Pengetahuan AI (AI Knowledge).',
          'Tekan "Muat Naik Dokumen" untuk mengimport fail teks, SOP, atau buku peraturan kolej (.txt, .md, .doc).',
          'Sistem mengekstrak kandungan dokumen dan menyuntiknya ke dalam memori model AI (Gemini RAG).',
          'AI akan menjawab soalan berpandukan dokumen rasmi tersebut secara berautoriti.'
        ]
      }
    ]
  },
  {
    id: 'ch-warden',
    number: 'Bab 6',
    title: 'Panduan Operasi Felo & Warden Blok',
    role: 'Warden & Felo',
    icon: 'ShieldCheck',
    summary: 'Hak akses khusus warden, sekatan paparan sahaja (view-only), dan penjanaan poster kod QR blok.',
    sections: [
      {
        title: '6.1 Skop Akses Blok Kediaman',
        content: 'Warden hanya mempunyai akses terhadap data residen dan permohonan cuti bagi blok yang ditugaskan di bawah entiti WardenBlock (cth: Warden Blok G hanya melihat Blok G).'
      },
      {
        title: '6.2 Direktori Residen (Akses Paparan Sahaja)',
        content: 'Direktori pelajar bagi warden beroperasi secara View-Only (Lihat Butiran). Butang Tambah, Edit, dan Padam pelajar disembunyikan untuk mengekalkan integriti rekod pendaftaran kolej.'
      },
      {
        title: '6.3 Penjanaan & Cetakan Poster Kod QR A4',
        content: 'Di halaman E-Leave, warden boleh menekan "Poster QR Blok" → "Cetak Poster A4 Rasmi" untuk menghasilkan poster bersaiz A4 yang lengkap dengan jata UMS, arahan 3 langkah pelajar, dan kod QR beresolusi tinggi.'
      }
    ]
  },
  {
    id: 'ch-admin',
    number: 'Bab 7',
    title: 'Tadbir Urus Kolej & Pengauditan (Admin & Audit)',
    role: 'Super Admin & College Admin',
    icon: 'ScrollText',
    summary: 'Penyelarasan bilik, pengurusan EXCO JAKMAS, arkib semester, dan pengawasan Audit Log.',
    sections: [
      {
        title: '7.1 Pengurusan Bilik & Penyelarasan Katil (Sync)',
        content: 'Admin mengawal inventori bilik (Single, Double, Triple, Quad). Butang "Penyelarasan Kapasiti" memastikan bilangan penghuni sebenar sentiasa selari dengan status bilik (Available, Occupied, Full).'
      },
      {
        title: '7.2 Pengurusan Pelantikan EXCO JAKMAS',
        content: 'Pentadbiran melantik barisan EXCO Jawatankuasa Kebajikan Mahasiswa (JAKMAS), menetapkan portfolio, serta memantau penyerahan tugasan dan bukti pelaksanaan aktiviti kolej.'
      },
      {
        title: '7.3 Jejak Audit Log Forensik (Black Box)',
        content: 'Setiap operasi kritikal (kemas kini pelajar, penghunian bilik, kelulusan cuti, verifikasi geofence) direkodkan dalam Audit Log dengan cap masa milisaat dan identiti pelaku untuk tujuan akauntabiliti tatakelola.'
      }
    ]
  }
];

// PRESENTATION SLIDES DECK
const SLIDES = [
  {
    kind: 'cover',
    title: 'MyKKTF v3.1',
    subtitle: 'Sistem Pengurusan Digital Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah',
    meta: 'Buku Panduan & Slaid Pembentangan Rasmi',
  },
  { kind: 'section', label: 'Modul 1', title: 'Pemasangan Aplikasi & Pengalaman Pengguna', icon: 'Smartphone' },
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
    roles: ['Semua Pengguna']
  },
  { kind: 'section', label: 'Modul 2', title: 'E-Leave & Keselamatan Residen', icon: 'CalendarOff' },
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
    roles: ['Pelajar', 'Warden', 'Admin']
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
    roles: ['Warden', 'Admin']
  },
  { kind: 'section', label: 'Modul 3', title: 'Penyelenggaraan & SLA Kerosakan', icon: 'Wrench' },
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
    roles: ['Pelajar', 'Warden', 'Staf']
  },
  { kind: 'section', label: 'Modul 4', title: 'Kebajikan & Kecerdasan Buatan AI', icon: 'HeartHandshake' },
  {
    kind: 'feature', icon: 'HeartHandshake', tone: 'rose',
    title: 'Suara Mahasiswa & Kebajikan',
    tagline: 'Saluran maklum balas & whistleblowing tanpa nama.',
    does: [
      'Pengasingan isu kebajikan, rakan sebilik, dan kafeteria daripada isu kerosakan',
      'Pilihan hantar tanpa nama (Anonymous Whistleblowing) untuk keselamatan pengadu',
      'Maklum balas rasmi daripada warden dan pihak kolej dengan notifikasi segera'
    ],
    roles: ['Pelajar', 'Warden', 'Admin']
  },
  {
    kind: 'feature', icon: 'Sparkles', tone: 'sky',
    title: 'KKTF Assistant AI & Pengetahuan',
    tagline: 'Pembantu pintar berasaskan dokumen peraturan kolej.',
    does: [
      'AI menjawab soalan peraturan kolej, jam malam, dan kemudahan 24/7',
      'Pentadbir boleh import fail dokumen/SOP (.txt, .doc, .md) terus ke pangkalan pengetahuan',
      'Suntikan konteks masa nyata (RAG) menjamin ketepatan jawapan mengikut dokumen rasmi'
    ],
    roles: ['Semua Pengguna']
  }
];

export default function PresentationPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('handbook'); // 'handbook' or 'slides'
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChapter, setActiveChapter] = useState('ch-intro');

  // Keyboard navigation for slide deck
  const handleKeyDown = useCallback((e) => {
    if (viewMode !== 'slides') return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      setCurrentSlide(prev => Math.min(prev + 1, SLIDES.length - 1));
    } else if (e.key === 'ArrowLeft') {
      setCurrentSlide(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  }, [viewMode]);

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

  const filteredChapters = MANUAL_CHAPTERS.filter(ch => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ch.title.toLowerCase().includes(q) || 
           ch.summary.toLowerCase().includes(q) ||
           ch.sections.some(s => s.title.toLowerCase().includes(q) || (s.content && s.content.toLowerCase().includes(q)));
  });

  const slide = SLIDES[currentSlide];
  const Icon = slide?.icon ? (ICONS[slide.icon] || PresentationIcon) : PresentationIcon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
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
            Manual Pengguna Rasmi, Aliran Operasi & Slaid Taklimat Kolej Kediaman Tun Fuad, UMS
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              <p className="text-[11px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider">
                Isi Kandungan Panduan
              </p>
              {MANUAL_CHAPTERS.map(ch => {
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
            {filteredChapters.map(ch => {
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
                        Sasaran: {ch.role}
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
              Slaid {currentSlide + 1} daripada {SLIDES.length}
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
                {SLIDES.map((_, i) => (
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
                disabled={currentSlide === SLIDES.length - 1}
                onClick={() => setCurrentSlide(prev => Math.min(prev + 1, SLIDES.length - 1))}
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