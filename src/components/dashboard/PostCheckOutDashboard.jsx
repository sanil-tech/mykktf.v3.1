import React from 'react';
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
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';

export default function PostCheckOutDashboard({
  user,
  student,
  checkoutRecord,
  surveyRecord,
  hasCompletedSurvey,
  onOpenSurvey,
  onOpenCheckInSem2
}) {
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

          {/* KAD 2: PERSAMAAN & KEMASUKAN SEMULA SEMESTER 2 (CHECK-IN SEMESTER 2) */}
          <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-500/20 to-emerald-500/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <Badge className="bg-lime-500/20 text-lime-300 border-lime-400/40 text-xs px-3 py-1">
                  Kemasukan Semula (Sem 2)
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Kemasukan Semula Kolej Semester 2</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Returning Boarding & Room Re-Check-In</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apabila sesi cuti semester tamat dan anda kembali ke kampus untuk memulakan <strong>Semester 2</strong>, anda boleh mendaftar masuk semula ke kolej kediaman.
                </p>
                
                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">1</span>
                    <span>Dapatkan kunci fizikal bilik Semester 2 di Kaunter Pejabat KKTF.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">2</span>
                    <span>Klik butang di bawah untuk mendaftar masuk dan mengaktifkan bilik Semester 2.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 font-bold flex items-center justify-center shrink-0 border border-slate-700 text-[11px]">3</span>
                    <span>Imbas Kod QR pintu masuk rasmi kolej untuk mengaktifkan Pas Residen Semester 2!</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={onOpenCheckInSem2}
              className="w-full h-12 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(132,204,22,0.25)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
            >
              <KeyRound className="w-4 h-4 text-slate-950" />
              <span>Daftar Masuk Semula Kolej (Check-In Semester 2)</span>
            </Button>
          </div>

        </div>

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
