import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/roles';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Presentation } from 'lucide-react';

const SLIDES = [
  {
    title: 'Kolej Kediaman Tun Fuad — Sistem Pengurusan Resident (KKMS)',
    subtitle: 'Pembentangan Demo Sistem kepada Pengurusan',
    kind: 'cover',
  },
  {
    title: 'Agenda',
    bullets: [
      'Latar belakang & masalah',
      'Objektif sistem',
      'Modul utama & demo langsung',
      'Sistem pelantikan JAKMAS',
      'Keselamatan & kawalan akses',
      'Penyelarasan data & audit',
      'Manfaat kepada pengurusan',
      'Perancangan fasa seterusnya',
    ],
  },
  {
    title: 'Latar Belakang & Cabaran',
    bullets: [
      'Pengurusan resident secara manual dan bercelaru',
      'Rekod pelajar, bilik, daftar masuk/keluar dalam fail berasingan',
      'Proses pelantikan JAKMAS tiada jejak akauntabiliti',
      'Pengumuman lambat sampai kepada pelajar',
      'Tiada pemantauan status kemudahan & aduan secara real-time',
    ],
  },
  {
    title: 'Objektif Sistem',
    bullets: [
      'Memusatkan semua operasi kolej dalam satu platform',
      'Automasi pendaftaran masuk/keluar & pengagihan bilik',
      'Tadbir urus pelantikan JAKMAS telus & boleh diaudit',
      'Pengumuman & komunikasi tepat pada masa',
      'Pengurusan aduan, kemudahan, disiplin berstruktur',
      'Akses berasaskan peranan (Admin, Warden, Staff, Pelajar, JAKMAS)',
    ],
  },
  {
    title: 'Peranan Pengguna & Kawalan Akses',
    table: {
      head: ['Peranan', 'Skop Akses'],
      rows: [
        ['Super Admin', 'Kawalan penuh sistem & konfigurasi'],
        ['College Admin', 'Pengurusan resident, bilik, pengumuman, audit'],
        ['Warden', 'Pemantauan blok ditugaskan sahaja (baca sahaja profil)'],
        ['Staff', 'Operasi harian — daftar, kemudahan, aduan'],
        ['JAKMAS', 'Tugas pelantikan + fungsi pelajar (peranan dwi)'],
        ['Pelajar', 'Portal kendiri — profil, permohonan, tempahan'],
      ],
    },
  },
  {
    title: 'Modul Utama Sistem',
    columns: [
      {
        heading: 'Operasi Resident',
        items: ['Pengurusan Pelajar & Direktori', 'Pengurusan Bilik & Blok', 'Daftar Masuk / Keluar'],
      },
      {
        heading: 'Khidmat Pelajar',
        items: ['Permohonan Cuti', 'Aduan & Kerosakan', 'Tempahan Kemudahan', 'Pengumuman & Acara'],
      },
      {
        heading: 'Tadbir Urus',
        items: ['Pelantikan & Tugas JAKMAS', 'Inspeksi & Disiplin', 'Audit Log & Laporan', 'Pangkalan Pengetahuan AI'],
      },
    ],
  },
  {
    title: 'Dashboard Berperanan',
    bullets: [
      'Dashboard berbeza ikut peranan log masuk',
      'Admin: metrik resident, kadar penghunian, aduan, kutipan yuran',
      'Warden: hanya blok sendiri — penghunian, isu, pelajar di bawah jagaan',
      'Pelajar: status penghunian, permohonan aktif, pengumuman, acara',
    ],
    note: 'Demo: Log masuk College Admin → tunjuk kad metrik → akaun warden tunjuk perbezaan.',
  },
  {
    title: 'Pengurusan Resident & Bilik',
    bullets: [
      'Rekod pelajar dengan blok, nombor bilik, status (Active / Pending)',
      'Carian & penapisan mengikut blok / nombor bilik',
      'Auto: pelajar tanpa bilik = status "Pending"',
      'Pendaftaran masuk & keluar dengan penilaian keadaan bilik',
      'Arkib alumni automatik semasa daftar keluar',
    ],
    note: 'Demo: Tambah pelajar → agih bilik → daftar masuk → tunjuk audit log.',
  },
  {
    title: 'Sistem Pelantikan JAKMAS',
    bullets: [
      'Pelantikan formal: jawatan, portfolio, tempoh',
      'Pengagihan tugas dengan tarikh akhir & keutamaan',
      'Aliran status: Ditugaskan → Disahkan → Sedang Dijalankan → Dihantar → Diluluskan',
      'Pelajar JAKMAS kekal akses penuh fungsi pelajar (peranan dwi)',
      'Setiap tindakan direkod dalam audit log',
    ],
    note: 'Demo: Lantik EXCO → agih tugas → pelajar tugaskan → luluskan → audit.',
  },
  {
    title: 'Pengumuman & Komunikasi',
    bullets: [
      'Pengumuman dengan keutamaan (Umum / Penting / Kritikal)',
      'Jejak status "dibaca" setiap pelajar',
      'JAKMAS hantar notis rasmi → perlulusan Admin sebelum publish',
      'Kandungan tidak rasmi JAKMAS publish terus',
      'Pemberitahuan e-mel automatik untuk pengumuman & acara baru',
    ],
    note: 'Demo: Publish pengumuman Kritikal → senarai pembaca → acara dengan pendaftaran.',
  },
  {
    title: 'Aduan, Kemudahan & Inspeksi',
    bullets: [
      'Aduan & Kerosakan: pelajar hantar foto → staff jana kerja → kemas kini status',
      'Tempahan Kemudahan: validasi pertembongan masa → kelulusan staff',
      'Inspeksi Bilik: JAKMAS/Warden → bendera isu → kait daftar keluar',
      'Disiplin: rekod kes dengan kategori, bukti, tindakan',
    ],
    note: 'Demo: Hantar aduan paip bocor → agih kerja → selesai → audit log.',
  },
  {
    title: 'Keselamatan & Akauntabiliti',
    bullets: [
      'Kawalan Akses Berperanan (RLS): setiap rekad dilindungi ikut peranan',
      'Audit Log Menyeluruh: setiap CRUD direkod (pelajar, bilik, JAKMAS, yuran, disiplin, kehadiran)',
      'Warden dihadkan blok: hanya lihat & cari pelajar blok sendiri',
      'Profil warden baca-sahaja — tiada akses ubah',
      'E-mel berasaskan peranan khusus — tiada pendedahan data merentas pengguna',
    ],
  },
  {
    title: 'Pangkalan Pengetahuan AI',
    bullets: [
      'Repositori peraturan, proses, FAQ & pengumuman',
      'Pembantu AI menjawab soalan resident',
      'Akses terhad kepada Super Admin & College Admin',
      'Boleh tetapkan tarikh berkuatkuasa & luput untuk peraturan',
    ],
    note: 'Demo: Tanya AI "Bagaimana proses permohonan cuti?" → jawab berdasarkan KB.',
  },
  {
    title: 'Penyelarasan Data & Laporan',
    bullets: [
      'Pangkalan data berpusat — tiada fail berserak',
      'Laporan metrik: penghunian, aduan, kutipan, kehadiran, survei',
      'Pemantauan keluar/masuk pelajar (Leave Monitor)',
      'Analitik kepuasan pelajar (Survei keluar)',
      'Audit log boleh ditapis ikut modul, peranan, tarikh',
    ],
  },
  {
    title: 'Manfaat kepada Pengurusan',
    table: {
      head: ['Sebelum', 'Selepas'],
      rows: [
        ['Fail manual & berserak', 'Satu platform berpusat'],
        ['Pelantikan JAKMS tak telus', 'Tadbir urus boleh diaudit'],
        ['Pengumuman lambat & tak dijejak', 'Notis real-time + jejak baca'],
        ['Aduan sukar dijejak', 'Aliran status berstruktur'],
        ['Tiada pemantauan blok', 'Dashboard warden per blok'],
        ['Tiada akauntabiliti tindakan', 'Audit log menyeluruh'],
      ],
    },
  },
  {
    title: 'Pelan Pembangunan Fasa Seterusnya',
    bullets: [
      'Fasa 2: Notifikasi push aplikasi mudah alih asli',
      'Fasa 2: Integrasi yuran dengan gerbang pembayaran (Stripe)',
      'Fasa 3: Modul penerimaan parsel/bingkisan (kini dibekukan)',
      'Fasa 3: Aplikasi mudah alih iOS/Android (kod sama)',
      'Fasa 4: Integrasi kalendar & e-mel automatik lanjutan',
    ],
  },
  {
    title: 'Penutup & Cadangan',
    bullets: [
      'Sistem sedia untuk pelaksanaan rintis di KKTF',
      'Sokongan berbilang peranan & mesra mudah alih',
      'Akauntabiliti penuh melalui audit log',
      'Cadangan: luluskan ujian rintis satu blok sebelum pelaksanaan penuh',
    ],
    kind: 'closing',
  },
];

function SlideBody({ slide }) {
  if (slide.kind === 'cover' || slide.kind === 'closing') {
    return (
      <div className="flex flex-col justify-center h-full text-center px-10">
        <h1 className="text-3xl md:text-5xl font-heading font-bold text-white leading-tight">{slide.title}</h1>
        {slide.subtitle && <p className="mt-4 text-lg md:text-xl text-white/70">{slide.subtitle}</p>}
        {slide.bullets && (
          <ul className="mt-8 space-y-3 max-w-2xl mx-auto text-left">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-white/90 text-base md:text-lg">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-white/60 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (slide.table) {
    return (
      <div className="h-full flex flex-col px-8 md:px-12 py-6">
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-6">{slide.title}</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm md:text-base">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                {slide.table.head.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slide.table.rows.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-muted/40' : 'bg-background'}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 border-t border-border">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (slide.columns) {
    return (
      <div className="h-full flex flex-col px-8 md:px-12 py-6">
        <h2 className="text-2xl md:text-3xl font-heading font-bold mb-6">{slide.title}</h2>
        <div className="grid md:grid-cols-3 gap-5 flex-1">
          {slide.columns.map((col, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-heading font-semibold text-primary mb-3">{col.heading}</h3>
              <ul className="space-y-2">
                {col.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm md:text-base">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-8 md:px-12 py-6">
      <h2 className="text-2xl md:text-3xl font-heading font-bold mb-6">{slide.title}</h2>
      <ul className="space-y-4 flex-1">
        {slide.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-3 text-base md:text-lg">
            <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {slide.note && (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-primary">Demo: </span>{slide.note}
        </div>
      )}
    </div>
  );
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

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const toggleFullscreen = () => {
    const el = document.getElementById('pres-stage');
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Presentation className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Halaman pembentangan hanya tersedia untuk Super Admin.</p>
        </div>
      </div>
    );
  }

  const isAccent = slide.kind === 'cover' || slide.kind === 'closing';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold">Pembentangan Demo KKMS</h1>
          <p className="text-sm text-muted-foreground">Slaid {idx + 1} / {total} — kekunci ← → untuk navigasi, F untuk skrin penuh</p>
        </div>
        <button onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          {fullscreen ? 'Keluar Skrin Penuh' : 'Skrin Penuh'}
        </button>
      </div>

      <div
        id="pres-stage"
        className={`relative rounded-2xl overflow-hidden shadow-lg border ${isAccent ? 'bg-primary' : 'bg-background'} ${fullscreen ? 'h-screen rounded-none border-0' : 'h-[70vh]'}`}
      >
        <SlideBody slide={slide} />
        <div className={`absolute bottom-4 right-6 text-xs opacity-70 ${isAccent ? 'text-white/70' : 'text-muted-foreground'}`}>
          {idx + 1} / {total}
        </div>
        <button
          onClick={prev}
          disabled={idx === 0}
          className={`absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2 ${isAccent ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-muted hover:bg-accent'} disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={next}
          disabled={idx === total - 1}
          className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 ${isAccent ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-muted hover:bg-accent'} disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            title={s.title}
            className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
          />
        ))}
      </div>
    </div>
  );
}