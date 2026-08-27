import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/roles';
import {
  ChevronLeft, ChevronRight, Maximize, Minimize, Presentation as PresentationIcon,
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList,
} from 'lucide-react';

const ICONS = {
  LayoutDashboard, GraduationCap, DoorOpen, ArrowLeftRight, CalendarOff,
  Wrench, Building2, ClipboardCheck, Megaphone, CalendarDays, MessageSquare,
  MessagesSquare, FileBarChart, Star, UserCog, Sparkles, ScrollText,
  CalendarCheck, Users, ClipboardList,
};

// Each feature slide: icon, title, tagline, "Apa ia buat" bullets, "Siapa guna" roles, accent tone
const SLIDES = [
  {
    kind: 'cover',
    title: 'KKMS — Kolej Kediaman Tun Fuad',
    subtitle: 'Panduan Fungsi Sistem Pengurusan Resident',
    meta: 'Pembentangan Modul & Ciri Aplikasi',
  },

  { kind: 'section', label: 'Bahagian 1', title: 'Pengenalan & Pengalaman Pengguna', icon: 'LayoutDashboard' },

  {
    kind: 'feature', icon: 'LayoutDashboard', tone: 'indigo',
    title: 'Dashboard Berperanan',
    tagline: 'Rumah utama setiap pengguna selepas log masuk.',
    does: [
      'Paparan berbeza ikut peranan: Super Admin, College Admin, Warden, Staff, JAKMAS, Pelajar',
      'Metrik real-time — jumlah resident, kadar penghunian, aduan aktif, permohonan menunggu',
      'Warden hanya nampak data blok yang ditugaskan',
      'Pelajar nampak status penghunian, permohonan aktif & pengumuman terkini',
    ],
    roles: ['Semua peranan'],
  },

  {
    kind: 'feature', icon: 'Users', tone: 'sky',
    title: 'Resident Directory',
    tagline: 'Direktori pelajar untuk rujukan warden & staff.',
    does: [
      'Carian & penapisan ikut blok, nombor bilik, nama pelajar',
      'Warden dihadkan kepada pelajar dalam blok sendiri (baca sahaja)',
      'Status automatik "Pending" untuk pelajar tanpa bilik',
      'Paparan kontak kecemasan & maklumat akademik',
    ],
    roles: ['Warden', 'Staff', 'Admin'],
  },

  {
    kind: 'feature', icon: 'ScrollText', tone: 'emerald',
    title: 'Audit Log',
    tagline: 'Jejak akauntabiliti setiap tindakan penting.',
    does: [
      'Merekod setiap cipta / kemas kini / padam merentas semua modul',
      'Boleh ditapis ikut modul, pengguna, peranan & tarikh',
      'Membantu siasatan isu & pematuhan tatakelola',
    ],
    roles: ['Super Admin'],
  },

  { kind: 'section', label: 'Bahagian 2', title: 'Pengurusan Resident & Bilik', icon: 'GraduationCap' },

  {
    kind: 'feature', icon: 'GraduationCap', tone: 'indigo',
    title: 'Pengurusan Pelajar',
    tagline: 'Rekod lengkap setiap resident kolej.',
    does: [
      'Profil pelajar: matrik, IC, fakulti, program, tahun, kontak & penjaga',
      'Pautan akaun pengguna — pelajar urus profil sendiri',
      'Jejak blok & bilik ditugaskan, status daftar masuk/keluar',
      'Arkib automatik ke Alumni semasa daftar keluar',
    ],
    roles: ['Admin', 'Staff'],
  },

  {
    kind: 'feature', icon: 'DoorOpen', tone: 'sky',
    title: 'Pengurusan Bilik & Blok',
    tagline: 'Peta penghunian kolej secara visual.',
    does: [
      'Blok dengan sekatan jantina & jumlah tingkat',
      'Bilik ikut jenis (Single, Double, Triple, Quad) & kapasiti',
      'Status bilik: Available, Occupied, Full, Maintenance',
      'Penghunian semasa dikira automatik daripada profil pelajar',
    ],
    roles: ['Admin'],
  },

  {
    kind: 'feature', icon: 'ArrowLeftRight', tone: 'emerald',
    title: 'Daftar Masuk / Keluar',
    tagline: 'Pengurusan pergerakan resident secara rasmi.',
    does: [
      'Daftar masuk: kunci pelajar ke bilik, kemas kini status penghunian',
      'Daftar keluar: penilaian keadaan bilik & kerosakan',
      'Pengiraan bayaran balik & pengesahan oleh warden/staff',
      'Arkib rekod ke Alumni dengan keadaan bilik terakhir',
    ],
    roles: ['Admin', 'Staff', 'Warden'],
  },

  { kind: 'section', label: 'Bahagian 3', title: 'Khidmat & Permohonan Pelajar', icon: 'CalendarDays' },

  {
    kind: 'feature', icon: 'CalendarOff', tone: 'amber',
    title: 'Permohonan Cuti',
    tagline: 'Pelajar mohon keluar kolej secara berstruktur.',
    does: [
      'Jenis cuti: Hujung Minggu, Cuti Semester, Kecemasan, Perubatan',
      'Butiran destinasi, sebab, tarikh & masa keluar/balik',
      'Warden/Admin lulus atau tolak dengan catatan',
      'Pemberitahuan e-mel automatik kepada warden blok',
    ],
    roles: ['Pelajar', 'Warden', 'Admin'],
  },

  {
    kind: 'feature', icon: 'CalendarCheck', tone: 'amber',
    title: 'Leave Monitor',
    tagline: 'Pemantauan pelajar yang sedang bercuti.',
    does: [
      'Senarai pelajar keluar aktif ikut blok',
      'Tarikh jangka balik & status pengembalian',
      'Bantuan warden mengesan pelajar lewat balik',
    ],
    roles: ['Warden', 'Admin'],
  },

  {
    kind: 'feature', icon: 'Wrench', tone: 'rose',
    title: 'Aduan & Kerosakan (Maintenance)',
    tagline: 'Saluran pelajar laporkan kerosakan bilik.',
    does: [
      'Kategori: Elektrik, Paip, Perabot, Internet, Pembersihan, Lain-lain',
      'Pelajar lampirkan foto bukti kerosakan',
      'Staff agih kerja & kemas kini status: Submitted → Assigned → In Progress → Completed',
      'Jejak penyiapan dengan tarikh & catatan',
    ],
    roles: ['Pelajar', 'Staff', 'Warden', 'Admin'],
  },

  {
    kind: 'feature', icon: 'Building2', tone: 'sky',
    title: 'Tempahan Kemudahan (Facilities)',
    tagline: 'Pelajar tempah dewan, bilik aktiviti & padang.',
    does: [
      'Pemilih kemudahan, tarikh & slot masa',
      'Sistem tolak pertembongan masa secara automatik',
      'Staff lulus atau tolak permohonan',
      'Status tempahan & sejarah kegunaan',
    ],
    roles: ['Pelajar', 'Staff', 'Admin'],
  },

  {
    kind: 'feature', icon: 'ClipboardCheck', tone: 'emerald',
    title: 'Kehadiran (Attendance)',
    tagline: 'Rekod kehadiran acara & aktiviti.',
    does: [
      'Admin log kehadiran manual untuk acara',
      'Pelajar semak diri melalui kod QR / token acara',
      'Pengesahan kehadiran & statistik penyertaan',
      'Pencegah pendaftaran berganda',
    ],
    roles: ['Admin', 'Staff', 'Pelajar'],
  },

  { kind: 'section', label: 'Bahagian 4', title: 'Komunikasi & Komuniti', icon: 'Megaphone' },

  {
    kind: 'feature', icon: 'Megaphone', tone: 'amber',
    title: 'Pengumuman',
    tagline: 'Penyampaian notis kepada resident dengan jejak baca.',
    does: [
      'Jenis: Umum, Kecemasan, Acara, Aktiviti Pelajar, Sukan & lain-lain',
      'Keutamaan: General, Important, Critical (pengesahan wajib)',
      'JAKMAS hantar notis rasmi → perlulusan Admin sebelum publish',
      'Jejak "dibaca" & analitik pembaca setiap pengumuman',
    ],
    roles: ['Pelajar', 'JAKMAS', 'Warden', 'Admin'],
  },

  {
    kind: 'feature', icon: 'CalendarDays', tone: 'rose',
    title: 'Acara (Events)',
    tagline: 'Penganjuran & pendaftaran acara kolej.',
    does: [
      'Cipta acara dengan poster, tempat, tarikh, masa & had peserta',
      'Pelajar daftar & batal penyertaan, kiraan peserta automatik',
      'Status pendaftaran: Open, Closed, Full',
      'Senarai peserta & status kehadiran untuk penganjur',
    ],
    roles: ['Pelajar', 'JAKMAS', 'Warden', 'Staff', 'Admin'],
  },

  {
    kind: 'feature', icon: 'MessageSquare', tone: 'rose',
    title: 'Aduan (Complaints)',
    tagline: 'Saluran maklum balas pelajar kepada pihak kolej.',
    does: [
      'Kategori aduan & aliran status berstruktur',
      'Pelajar hantar, staff kemas kini & beri maklum balas',
      'Sejarah penyelesaian boleh dijejak',
    ],
    roles: ['Pelajar', 'Staff', 'Warden', 'Admin'],
  },

  {
    kind: 'feature', icon: 'MessagesSquare', tone: 'sky',
    title: 'Community Chat',
    tagline: 'Perbualan ikut blok, bilik & komuniti.',
    does: [
      'Saluran: bilik, blok, komuniti KKTf, & mesej terus (DM)',
      'DM pelajar ↔ warden dihadkan blok ditugaskan',
      'Pemberitahuan e-mel automatik untuk DM baharu',
      'Moderasi oleh warden/staff/admin',
    ],
    roles: ['Semua peranan'],
  },

  { kind: 'section', label: 'Bahagian 5', title: 'Tadbir Urus & Pelantikan JAKMAS', icon: 'UserCog' },

  {
    kind: 'feature', icon: 'UserCog', tone: 'indigo',
    title: 'Pengurusan JAKMAS',
    tagline: 'Sistem pelantikan EXCO pentadbiran kolej.',
    does: [
      'Pelantikan formal: jawatan, portfolio & tempoh perkhidmatan',
      'Pautan ke akaun pelajar — JAKMAS kekal akses fungsi pelajar (peranan dwi)',
      'Status: pending, active, suspended, expired, ended',
      'Tamat pelantikan dengan sebab & jejak akauntabiliti',
    ],
    roles: ['Admin'],
  },

  {
    kind: 'feature', icon: 'ClipboardList', tone: 'amber',
    title: 'Tugas JAKMAS',
    tagline: 'Pengagihan & pantauan tugas EXCO.',
    does: [
      'Tugas dengan arahan, keutamaan & tarikh akhir',
      'Aliran status: Ditugaskan → Disahkan → Sedang Dijalankan → Dihantar → Diluluskan',
      'Pelajar lampir nota kemajuan & bukti (evidence)',
      'Admin beri maklum balas, lulus atau pulih semula',
    ],
    roles: ['JAKMAS', 'Admin'],
  },

  {
    kind: 'feature', icon: 'UserCog', tone: 'sky',
    title: 'Block Assignment',
    tagline: 'Menugaskan warden ke blok pengawasan.',
    does: [
      'Pemilih pelbagai blok untuk setiap warden',
      'Warden hanya nampak data & pelajar blok sendiri',
      'Pencegah tugasan berganda',
      'Pengurusan penugasan semula oleh Admin',
    ],
    roles: ['Admin'],
  },

  { kind: 'section', label: 'Bahagian 6', title: 'Analitik & Kecerdasan Buatan', icon: 'Sparkles' },

  {
    kind: 'feature', icon: 'FileBarChart', tone: 'emerald',
    title: 'Laporan (Reports)',
    tagline: 'Metrik operasi kolej dalam satu paparan.',
    does: [
      'Kadar penghunian & kekosongan bilik',
      'Statistik aduan, kehadiran & permohonan cuti',
      'Tren kutipan yuran & status bayaran',
      'Bantuan pengurusan buat keputusan berasaskan data',
    ],
    roles: ['Admin'],
  },

  {
    kind: 'feature', icon: 'Star', tone: 'amber',
    title: 'Survey Analytics',
    tagline: 'Analisis kepuasan pelajar selepas daftar keluar.',
    does: [
      'Kepuasan bilik, kemudahan, internet, staff & keselamatan',
      'Skor kepuasan keseluruhan & komen cadangan',
      'Bantu kolej naik taraf kualiti perkhidmatan',
    ],
    roles: ['Admin'],
  },

  {
    kind: 'feature', icon: 'Sparkles', tone: 'violet',
    title: 'Pangkalan Pengetahuan AI',
    tagline: 'Pembantu AI jawab soalan resident tentang peraturan & proses.',
    does: [
      'Repositori peraturan, proses, FAQ & pengumuman',
      'Pembantu AI menjawab soalan berasaskan pengetahuan ini',
      'Tarikh berkuatkuasa & luput untuk peraturan',
      'Akses terhad kepada Super Admin & College Admin',
    ],
    roles: ['Super Admin', 'Admin'],
  },

  {
    kind: 'closing',
    title: 'Terima Kasih',
    subtitle: 'KKMS — Sistem Pengurusan Resident Kolej Kediaman Tun Fuad',
    meta: 'Setiap fungsi dibina untuk memudahkan operasi kolej & pengalaman resident.',
  },
];

const TONES = {
  indigo: { bg: 'from-indigo-500 to-indigo-700', chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500', soft: 'bg-indigo-50' },
  sky: { bg: 'from-sky-500 to-sky-700', chip: 'bg-sky-100 text-sky-700', dot: 'bg-sky-500', soft: 'bg-sky-50' },
  emerald: { bg: 'from-emerald-500 to-emerald-700', chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', soft: 'bg-emerald-50' },
  amber: { bg: 'from-amber-500 to-amber-600', chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', soft: 'bg-amber-50' },
  rose: { bg: 'from-rose-500 to-rose-700', chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', soft: 'bg-rose-50' },
  violet: { bg: 'from-violet-500 to-violet-700', chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', soft: 'bg-violet-50' },
};

function CoverSlide({ slide }) {
  return (
    <div className="relative h-full flex flex-col justify-center items-center text-center px-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-indigo-900" />
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-xs font-medium text-white/90 mb-6">
          <PresentationIcon className="h-3.5 w-3.5" /> {slide.meta}
        </div>
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-white leading-tight max-w-3xl">{slide.title}</h1>
        <p className="mt-5 text-lg md:text-xl text-white/75 max-w-2xl">{slide.subtitle}</p>
      </div>
    </div>
  );
}

function SectionSlide({ slide }) {
  const Icon = ICONS[slide.icon] || PresentationIcon;
  return (
    <div className="relative h-full flex flex-col justify-center px-12 md:px-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-indigo-800" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-15">
        <Icon className="h-72 w-72 text-white" />
      </div>
      <div className="relative z-10">
        <span className="text-sm font-semibold tracking-widest text-white/70 uppercase">{slide.label}</span>
        <h2 className="mt-3 text-3xl md:text-5xl font-heading font-bold text-white max-w-2xl">{slide.title}</h2>
      </div>
    </div>
  );
}

function FeatureSlide({ slide }) {
  const Icon = ICONS[slide.icon] || PresentationIcon;
  const tone = TONES[slide.tone] || TONES.indigo;
  return (
    <div className="h-full flex flex-col px-10 md:px-14 py-8 bg-background">
      <div className="flex items-center gap-4 mb-6">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${tone.bg} text-white shadow-md shrink-0`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold leading-tight">{slide.title}</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5">{slide.tagline}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="md:col-span-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Apa yang ia buat</h3>
          <ul className="space-y-2.5">
            {slide.does.map((d, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${tone.dot} shrink-0`} />
                <span className="text-sm md:text-base text-foreground/90">{d}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-3">Siapa yang guna</h3>
          <div className="flex flex-wrap gap-2">
            {slide.roles.map((r, i) => (
              <span key={i} className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${tone.chip}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClosingSlide({ slide }) {
  return (
    <div className="relative h-full flex flex-col justify-center items-center text-center px-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-primary to-emerald-700" />
      <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        <h1 className="text-4xl md:text-6xl font-heading font-bold text-white">{slide.title}</h1>
        <p className="mt-4 text-lg md:text-xl text-white/80">{slide.subtitle}</p>
        <p className="mt-6 max-w-xl text-sm text-white/60 mx-auto">{slide.meta}</p>
      </div>
    </div>
  );
}

function SlideBody({ slide }) {
  switch (slide.kind) {
    case 'cover': return <CoverSlide slide={slide} />;
    case 'section': return <SectionSlide slide={slide} />;
    case 'closing': return <ClosingSlide slide={slide} />;
    default: return <FeatureSlide slide={slide} />;
  }
}

export default function PresentationPage() {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const total = SLIDES.length;
  const slide = SLIDES[idx];

  const next = useCallback(() => setIdx((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);
  const go = (i) => setIdx(i);

  const toggleFullscreen = () => {
    const el = document.getElementById('pres-stage');
    if (!document.fullscreenElement) el?.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    else document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <PresentationIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Halaman pembentangan hanya tersedia untuk Super Admin.</p>
        </div>
      </div>
    );
  }

  const isFull = slide.kind === 'cover' || slide.kind === 'section' || slide.kind === 'closing';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold">Pembentangan Fungsi Sistem</h1>
          <p className="text-sm text-muted-foreground">Slaid {idx + 1} / {total} — kekunci ← → untuk navigasi, F untuk skrin penuh</p>
        </div>
        <button onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          {fullscreen ? 'Keluar Skrin Penuh' : 'Skrin Penuh'}
        </button>
      </div>

      <div
        id="pres-stage"
        className={`relative rounded-2xl overflow-hidden shadow-xl border border-border ${fullscreen ? 'h-screen rounded-none border-0' : 'h-[72vh]'}`}
      >
        <SlideBody slide={slide} />
        <div className={`absolute bottom-4 right-6 text-xs ${isFull ? 'text-white/70' : 'text-muted-foreground'}`}>
          {idx + 1} / {total}
        </div>
        <button onClick={prev} disabled={idx === 0}
          className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 shadow ${isFull ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-muted hover:bg-accent'} disabled:opacity-30 disabled:pointer-events-none`}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={next} disabled={idx === total - 1}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2.5 shadow ${isFull ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-muted hover:bg-accent'} disabled:opacity-30 disabled:pointer-events-none`}>
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center max-w-3xl mx-auto">
        {SLIDES.map((s, i) => (
          <button key={i} onClick={() => go(i)} title={s.title || s.label}
            className={`h-2 rounded-full transition-all ${i === idx ? 'w-7 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`} />
        ))}
      </div>
    </div>
  );
}