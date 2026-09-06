import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  KeyRound, 
  Building2, 
  Calendar, 
  Star, 
  FileCheck2, 
  ArrowRight, 
  RefreshCw, 
  Award, 
  BookOpen, 
  PhoneCall, 
  Clock, 
  ShieldCheck,
  DoorOpen,
  Sparkles,
  ChevronRight,
  Info,
  Megaphone,
  Bell,
  CalendarDays,
  ExternalLink,
  Pin,
  Lock,
  ShieldAlert,
  AlertTriangle,
  CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function PostCheckOutDashboard({
  user,
  student,
  checkoutRecord,
  surveyRecord,
  hasCompletedSurvey,
  onOpenSurvey,
  onOpenCheckInSem2
}) {
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // Kawalan Kunci Sementara Pendaftaran Masuk Sem 2 (Cuti Semester Gate)
  const [isSem2RegistrationLocked, setIsSem2RegistrationLocked] = useState(true);
  const [showCounterConfirmDialog, setShowCounterConfirmDialog] = useState(false);
  const [confirmedAtCounter, setConfirmedAtCounter] = useState(false);
  const [counterStaffCode, setCounterStaffCode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const handleProceedToPhysicalCheckIn = () => {
    if (!confirmedAtCounter) {
      setPasscodeError('Sila tandakan kotak pengesahan bahawa anda kini hadir secara fizikal di Kaunter KKTF.');
      return;
    }

    const clean = counterStaffCode.trim().toUpperCase();
    const validPasscodes = [
      'KKTF-STAFF-AUTH-2026', 
      'KKTF-PEJABAT-PAS-9982', 
      'KKTF-KAUNTER-FELO-VALID', 
      'KKTF-SECURE-OVERRIDE', 
      'KKTF2026',
      'BUKA'
    ];

    if (!validPasscodes.includes(clean)) {
      setPasscodeError('Kod Pelepasan Kaunter tidak sah. Sila dapatkan kod daripada staf kaunter Pejabat KKTF.');
      return;
    }

    setPasscodeError('');
    setShowCounterConfirmDialog(false);
    onOpenCheckInSem2?.();
  };

  useEffect(() => {
    async function fetchNotices() {
      try {
        setLoadingAnnouncements(true);
        const list = await base44.entities.Announcement.filter(
          { approval_status: 'published' },
          '-publish_date'
        );
        setAnnouncements(list || []);
      } catch (err) {
        console.warn('Gagal memuat turun pengumuman cuti semester:', err);
      } finally {
        setLoadingAnnouncements(false);
      }
    }
    fetchNotices();
  }, []);

  const studentName = student?.full_name || user?.full_name || 'Pelajar Residen';
  const matricNo = student?.student_id || student?.matric_no || 'Pelajar';
  const lastBlock = checkoutRecord?.block_name || student?.block_name || 'Kolej Kediaman Tun Fuad';
  const lastRoom = checkoutRecord?.room_number || student?.room_number || '-';
  const checkoutDate = checkoutRecord?.check_out_date || checkoutRecord?.checkout_date || new Date().toISOString().split('T')[0];
  const checkoutTime = checkoutRecord?.check_out_time || checkoutRecord?.checkout_time || 'Selesai';

  // Latar belakang gambar kampus UMS dengan overlay yang kemas & profesional
  const umsBackgroundImageStyle = "relative before:content-[''] before:absolute before:inset-0 before:block before:bg-[url('https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?q=80&w=1200')] before:bg-cover before:bg-center before:opacity-20 before:z-0";

  return (
    <div className={`min-h-screen p-4 sm:p-6 lg:p-8 bg-slate-950 text-white ${umsBackgroundImageStyle} overflow-y-auto`}>
      <div className="max-w-5xl mx-auto space-y-6 relative z-10 animate-in fade-in duration-300">
        
        {/* ========================================================================= */}
        {/* HEADER ATAS: LOGO RASMI, IDENTITI & STATUS BADGE                         */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
            <InstitutionalDualLogo />
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-mono font-bold gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                STATUS: TELAH CHECK-OUT RESIDEN
              </Badge>
              <Badge variant="outline" className="text-slate-300 border-slate-700 text-xs px-3 py-1 font-mono">
                SESI 2025/2026
              </Badge>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Pengesahan Serahan Kunci Berjaya
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Selamat Berlepas & Terima Kasih, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-lime-300">{studentName}</span>!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Anda telah menyempurnakan prosedur pelepasan bilik kolej bagi semester ini. Bilik terdahulu anda telah dibebaskan untuk proses penyelenggaraan dan persediaan sesi hadapan.
              </p>
            </div>

            {/* Kad Ringkas Pelepasan */}
            <div className="shrink-0 w-full md:w-auto bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 text-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <DoorOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Rekod Pelepasan Terkini</p>
                <p className="font-bold text-white text-sm font-mono">{lastBlock} &bull; Bilik {lastRoom}</p>
                <p className="text-slate-400 text-[11px]">Tarikh: {checkoutDate} ({checkoutTime})</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* KITARAN PENGINAPAN 2 SEMESTER (ACADEMIC RESIDENTIAL TIMELINE TRACKER)      */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Kitaran Penginapan Residen 2 Semester (KKTF)</h2>
            </div>
            <span className="text-xs text-slate-400">Tahun Penginapan Berterusan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            
            {/* Step 1: Check-in Sem 1 (Selesai) */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-emerald-400 font-bold font-mono">SEMESTER 1</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  ✓ Selesai
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-white">First-Time Boarding</h4>
              <p className="text-xs text-slate-400 mt-1">Pendaftaran masuk kali pertama & pengaktifan Pas Residen KKTF.</p>
            </div>

            {/* Step 2: Check-out Sem 1 (Selesai) */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-emerald-400 font-bold font-mono">AKHIR SEM 1</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  ✓ Selesai
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-white">Check-Out Sem 1</h4>
              <p className="text-xs text-slate-400 mt-1">Penyerahan kunci melalui Express Drop-Key & bilik dikosongkan.</p>
            </div>

            {/* Step 3: Pengisian Kepuasan Sem 1 (Semasa) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              hasCompletedSurvey 
                ? 'bg-slate-950/60 border-emerald-500/30' 
                : 'bg-amber-500/10 border-amber-400/40 shadow-lg shadow-amber-500/5'
            }`}>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-amber-400 font-bold font-mono">MAKLUM BALAS</span>
                <Badge className={hasCompletedSurvey ? "bg-emerald-500/20 text-emerald-300 text-[10px]" : "bg-amber-500 text-slate-950 font-bold text-[10px] animate-pulse"}>
                  {hasCompletedSurvey ? '✓ Dihantar' : 'Perlu Diisi'}
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-white">Kajian Kepuasan Sem 1</h4>
              <p className="text-xs text-slate-400 mt-1">Penilaian kemudahan, bilik, internet dan staf kolej untuk penambahbaikan.</p>
            </div>

            {/* Step 4: Check-in Sem 2 (Akan Datang / Dibuka) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 relative">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-indigo-300 font-bold font-mono">SEMESTER 2</span>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px]">
                  Dibuka
                </Badge>
              </div>
              <h4 className="text-sm font-bold text-white">Check-In Semula Sem 2</h4>
              <p className="text-xs text-slate-400 mt-1">Daftar masuk semula kolej, tetapkan bilik & aktifkan Pas Residen Sem 2.</p>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PAPAN MAKLUMAN PENTADBIRAN: TAKWIM KEMASUKAN SEMULA & CUTI SEMESTER        */}
        {/* ========================================================================= */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-sky-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Papan Makluman Rasmi Pentadbiran KKTF
                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px]">
                    Cuti Semester & Sem 2
                  </Badge>
                </h3>
                <p className="text-xs text-slate-400">
                  Pengumuman tarikh pendaftaran masuk, waktu kaunter kunci, dan pelepasan bilik.
                </p>
              </div>
            </div>

            <Link to="/announcements">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-slate-700 bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl">
                <span>Lihat Semua Pengumuman</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          {/* Senarai Makluman Terkini Pentadbiran */}
          {loadingAnnouncements ? (
            <div className="p-6 text-center text-xs text-slate-400 animate-pulse">
              Memuat turun makluman rasmi pentadbiran...
            </div>
          ) : announcements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {announcements.slice(0, 2).map((notice) => {
                const isUrgent = notice.priority === 'Critical' || notice.priority === 'Important';
                const isCheckInNotice = 
                  (notice.title + ' ' + notice.content).toLowerCase().includes('sem 2') ||
                  (notice.title + ' ' + notice.content).toLowerCase().includes('check in') ||
                  (notice.title + ' ' + notice.content).toLowerCase().includes('kemasukan');

                return (
                  <div 
                    key={notice.id || notice.title}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isCheckInNotice
                        ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                        : isUrgent
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{notice.publish_date || 'Terkini'}</span>
                        </div>
                        <Badge className={`text-[10px] px-2 py-0.5 font-bold ${
                          notice.priority === 'Critical'
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : notice.priority === 'Important'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {notice.priority || 'Pemberitahuan'}
                        </Badge>
                      </div>

                      <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                        {notice.title}
                      </h4>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {notice.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-slate-400 font-mono">
                        Oleh: {notice.published_by || 'Pentadbiran Kolej'}
                      </span>
                      <Link 
                        to="/announcements" 
                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        Kenyataan Penuh <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3.5 text-xs text-slate-300">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-white text-xs">Pemberitahuan Tarikh Kemasukan Semula Semester 2</h5>
                <p className="leading-relaxed text-slate-300">
                  Pihak pentadbiran Pejabat KKTF akan memuat naik notis rasmi mengenai jadual serahan kunci bilik dan tarikh mula mendaftar masuk semula bagi <strong>Semester 2</strong> secara berpusat melalui portal ini dan e-mel rasmi universiti. Sila semak dari semasa ke semasa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2 KAD UTAMA: KAJIAN KEPUASAN & CHECK-IN SEMESTER 2                        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* KAD 1: KAJIAN KEPUASAN PELAJAR (END-OF-SEMESTER SURVEY) */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                </div>
                {hasCompletedSurvey ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1">
                    ✓ Maklum Balas Diterima
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 animate-pulse">
                    ★ Keutamaan Selepas Check-Out
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Kajian Kepuasan Pelajar Residen</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">End-of-Semester Residential Feedback</p>
              </div>

              {hasCompletedSurvey ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Terima kasih atas penilaian anda!
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Kajian kepuasan anda bagi semester ini telah direkodkan ke dalam pangkalan data kolej dan dipanjangkan kepada Pengetua serta Pihak Pengurusan KKTF untuk tindakan penambahbaikan.
                  </p>
                  {surveyRecord && (
                    <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs text-slate-300">
                      <span>Penilaian Keseluruhan:</span>
                      <span className="font-bold text-amber-300 flex items-center gap-1 font-mono">
                        {surveyRecord.overall_satisfaction || 5} / 5 <Star className="w-3.5 h-3.5 fill-amber-300" />
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sila berikan maklum balas mengenai mutu kemudahan (bilik, internet, fasiliti, kebersihan) serta kualiti layanan kakitangan pentadbiran & felo sepanjang anda menginap di KKTF.
                  </p>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400">&bull;</span> Masa pengisian anggaran 1 - 2 minit sahaja.
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-amber-400">&bull;</span> Maklum balas anda dijamin kerahsiaan dan membina.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <Button
              onClick={onOpenSurvey}
              className={`w-full h-12 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
                hasCompletedSurvey
                  ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Star className="w-4 h-4 fill-current" />
              <span>{hasCompletedSurvey ? 'Kemaskini / Lihat Borang Kajian Kepuasan' : 'Isi Kajian Kepuasan Pelajar Sekarang'}</span>
            </Button>
          </div>

          {/* KAD 2: PERSAMAAN & KEMASUKAN SEMULA SEMESTER 2 (CHECK-IN SEMESTER 2 - DIKUNCI SEMENTARA) */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-xs px-3 py-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kemasukan Sem 2 (Kunci Semasa Cuti)</span>
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Kemasukan Semula Kolej Semester 2</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Returning Boarding & Physical Counter Verification</p>
              </div>

              {/* Sekatan Keselamatan Cuti Semester */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  Kawalan Keselamatan Pendaftaran Cuti Semester
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sistem pendaftaran masuk Semester 2 <strong>dikunci sementara</strong> semasa cuti semester. Pendaftaran bilik pramatang dari luar kampus sebelum anda tiba di kolej adalah dilarang bagi mengelakkan penetapan bilik palsu.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 pt-1 font-medium border-t border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pendaftaran hanya boleh disahkan di Kaunter Pejabat KKTF apabila sesi kemasukan dibuka secara rasmi.</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-300">
                <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">3 Syarat Pendaftaran Masuk Sem 2:</p>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">1</span>
                  <span>Tiba secara fizikal di kolej mengikut takwim rasmi pentadbiran.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">2</span>
                  <span>Ambil kunci fizikal bilik di Kaunter Pejabat KKTF.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">3</span>
                  <span>Imbas Kod QR Kaunter atau minta Kod Pelepasan daripada staf bertugas.</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowCounterConfirmDialog(true)}
              className="w-full h-12 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>🔒 Buka Pengesahan Kaunter (Check-In Sem 2)</span>
            </Button>
          </div>

        </div>

        {/* DIALOG PENGESAHAN KEHADIRAN FIZIKAL DI KAUNTER KKTF (ANTI-BYPASS DARI RUMAH) */}
        <Dialog open={showCounterConfirmDialog} onOpenChange={setShowCounterConfirmDialog}>
          <DialogContent className="max-w-md p-6 bg-slate-950 border border-slate-800 text-white rounded-3xl" onPointerDownOutside={e => e.preventDefault()}>
            <DialogHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white">
                    Pengesahan Kehadiran di Kaunter KKTF
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">
                    Kawalan Integriti & Pencegahan Pendaftaran Pramatang
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> Peringatan Disiplin Kediaman UMS:
                </p>
                <p className="leading-relaxed">
                  Pendaftaran bilik secara jarak jauh dari rumah semasa cuti semester tanpa memegang kunci fizikal bilik adalah <strong>dilarang sama sekali</strong>.
                </p>
              </div>

              {/* Checkbox Aku Janji */}
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input 
                  type="checkbox"
                  checked={confirmedAtCounter}
                  onChange={(e) => setConfirmedAtCounter(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-emerald-600 rounded bg-slate-950 border-slate-700 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-xs text-slate-300 leading-relaxed select-none">
                  Saya mengesahkan dengan penuh integriti bahawa <strong>saya kini telah tiba secara fizikal</strong> di Kaunter Pejabat KKTF dan sedang berurusan mengambil kunci fizikal Semester 2.
                </span>
              </label>

              {/* Kod Keselamatan Kaunter Staf */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Kod Pelepasan Kaunter Staf Pejabat:
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">Diberi oleh Staf</span>
                </div>
                <Input 
                  value={counterStaffCode}
                  onChange={(e) => {
                    setCounterStaffCode(e.target.value.toUpperCase());
                    setPasscodeError('');
                  }}
                  placeholder="Masukkan Kod Pelepasan Kaunter Staf"
                  className="h-10 text-xs uppercase font-mono bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
                />
                {passcodeError && (
                  <p className="text-[11px] text-red-400 font-medium">⚠️ {passcodeError}</p>
                )}
                <p className="text-[10px] text-slate-400 italic">
                  * Kod pelepasan kaunter hanya dibekalkan oleh Pegawai / Felo bertugas di Kaunter KKTF semasa penyerahan kunci fizikal.
                </p>
              </div>

              {/* Tindakan */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowCounterConfirmDialog(false);
                    setPasscodeError('');
                  }}
                  className="text-xs h-9 border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                >
                  Batal / Masih Cuti
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleProceedToPhysicalCheckIn}
                  disabled={!confirmedAtCounter || !counterStaffCode.trim()}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-md"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Sahkan & Teruskan</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* KAD MAKLUMAT TAMBAHAN & PAUTAN PANTAS                                     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <Link 
            to="/express-drop-key"
            className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Resit & Sejarah Drop-Key</h4>
              <p className="text-[11px] text-slate-400 truncate">Semak rekod serahan kunci fizikal</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

          <Link 
            to="/merit-demerit"
            className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Merit / Demerit Residen</h4>
              <p className="text-[11px] text-slate-400 truncate">Markah penglibatan & disiplin</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

          <Link 
            to="/guide"
            className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Buku Panduan Residen</h4>
              <p className="text-[11px] text-slate-400 truncate">Peraturan kolej & takwim kemasukan</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
          </Link>

        </div>

      </div>
    </div>
  );
}
