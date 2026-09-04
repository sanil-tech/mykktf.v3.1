import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  X, ChevronRight, ChevronLeft, Check, Sparkles,
  LayoutDashboard, Wrench, CalendarOff, Megaphone, MessagesSquare,
  Building2, UserCog, GraduationCap, DoorOpen, ArrowLeftRight,
  CalendarDays, ClipboardList, FileBarChart, Users, Star
} from 'lucide-react';

const STORAGE_KEY = (userId) => `kkms_tour_done_${userId || 'anon'}`;

const ROLE_STEPS = {
  student: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang ke KKMS! 👋', body: 'Portal Kolej Kediaman Tun Fuad UMS. Mari kita kenali fungsi utama dalam masa seminit.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard Pelajar', body: 'Pantau status penghunian, pengumuman penting & aktiviti terkini anda di satu skrin.' },
    { icon: Wrench, color: 'from-amber-500 to-orange-600', title: 'Laporan Penyelenggaraan', body: 'Kerosakan paip, elektrik atau internet? Hantar laporan terus dari menu Maintenance.' },
    { icon: CalendarOff, color: 'from-rose-500 to-red-600', title: 'Permohonan Cuti', body: 'Mohon keluar kolej hujung minggu / cuti semester melalui modul Leave untuk kelulusan warden.' },
    { icon: Megaphone, color: 'from-violet-500 to-purple-600', title: 'Pengumuman', body: 'Notis rasmi & kecemasan kolej. Pengumuman kritikal perlu diakui (acknowledge).' },
    { icon: MessagesSquare, color: 'from-emerald-500 to-teal-600', title: 'Sembang Komuniti', body: 'Berinteraksi dengan rasa seblock & komuniti KKTF secara langsung.' },
    { icon: Building2, color: 'from-cyan-500 to-sky-600', title: 'Tempahan Fasiliti', body: 'Tempah dewan serbaguna & gelanggang badminton melalui modul Facilities.' },
    { icon: UserCog, color: 'from-slate-500 to-slate-700', title: 'Profil Saya', body: 'Kemas kini maklumat peribadi & kontak kecemasan di My Profile (bar atas).' },
  ],
  warden: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang, Warden 👋', body: 'Portal KKTF untuk warden. Akses anda dikunci kepada blok yang diamanahkan.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard Warden', body: 'Statistik blok, permohonan cuti tertunggak & laporan kerosakan baharu dipaparkan di sini.' },
    { icon: CalendarOff, color: 'from-rose-500 to-red-600', title: 'Kelulusan Cuti & Pemantauan', body: 'Luluskan/tolak permohonan cuti pelajar blok anda di Leave & Leave Monitor.' },
    { icon: Wrench, color: 'from-amber-500 to-orange-600', title: 'Penyelenggaraan Blok', body: 'Semak & tambahkan laporan kerosakan bilik dalam blok anda.' },
    { icon: Megaphone, color: 'from-violet-500 to-purple-600', title: 'Pengumuman', body: 'Terbitkan notis rasmi kepada pelajar blok anda.' },
  ],
  jakmas: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang, Ahli JAKMAS 👋', body: 'Portal KKTF untuk Jawatankuasa Kolej. Fungsi anda ditentukan oleh pelantikan aktif.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard JAKMAS', body: 'Pantau pelantikan, tugasan & acara yang diberikan pentadbir.' },
    { icon: ClipboardList, color: 'from-amber-500 to-orange-600', title: 'Tugasan Saya', body: 'Terima & kemajui tugasan administratif dari pentadbir di My JAKMAS Tasks.' },
    { icon: Megaphone, color: 'from-violet-500 to-purple-600', title: 'Pengumuman Bukan Rasmi', body: 'Terbitkan aktiviti/sukan/komuniti. Notis rasmi perlu kelulusan pentadbir.' },
    { icon: CalendarDays, color: 'from-emerald-500 to-teal-600', title: 'Acara & Pendaftaran', body: 'Cipta & urus pendaftaran acara pelajar.' },
  ],
  staff: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang, Staf 👋', body: 'Portal KKTF untuk staf pentadbiran kolej.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard', body: 'Pantau penghunian, kekosongan bilik & status residen.' },
    { icon: ArrowLeftRight, color: 'from-amber-500 to-orange-600', title: 'Check-In / Check-Out', body: 'Urus pendaftaran masuk & keluar pelajar secara digital.' },
    { icon: Wrench, color: 'from-rose-500 to-red-600', title: 'Penyelenggaraan', body: 'Tindak laporan kerosakan & kemajuan kerja.' },
    { icon: CalendarOff, color: 'from-violet-500 to-purple-600', title: 'Cuti & Fasiliti', body: 'Bantu lulus permohonan cuti & tempahan fasiliti.' },
  ],
  admin: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang, Pentadbir 👋', body: 'Portal KKTF untuk pentadbir kolej. Kawalan penuh sistem di hujung anda.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard Pentadbiran', body: 'Statistik residen, kapasiti sebenar & ketersediaan bilik per blok.' },
    { icon: GraduationCap, color: 'from-emerald-500 to-teal-600', title: 'Pengurusan Pelajar', body: 'Onboarding & direktori pelajar, penempatan blok/bilik.' },
    { icon: DoorOpen, color: 'from-amber-500 to-orange-600', title: 'Bilik & Daftar Masuk/Keluar', body: 'Urus inventori bilik, check-in/out & "Tutup Sesi" ke alumni.' },
    { icon: Users, color: 'from-violet-500 to-purple-600', title: 'Pentadbiran JAKMAS & Warden', body: 'Lantik ahli JAKMAS & tugaskan warden ke blok.' },
    { icon: FileBarChart, color: 'from-cyan-500 to-sky-600', title: 'Laporan', body: 'Jana & eksport laporan sistem dalam format PDF, Excel & CSV.' },
    { icon: Star, color: 'from-rose-500 to-red-600', title: 'Analitik Tinjauan', body: 'Pantau kepuasan pelajar dari tinjauan check-out di Survey Analytics.' },
  ],
  super_admin: [
    { icon: Sparkles, color: 'from-blue-500 to-indigo-600', title: 'Selamat Datang, Super Admin 👋', body: 'Anda mempunyai akses penuh & tanpa had ke seluruh sistem KKTF.' },
    { icon: LayoutDashboard, color: 'from-sky-500 to-blue-600', title: 'Dashboard', body: 'Pandang keseluruhan operasi kediaman.' },
    { icon: FileBarChart, color: 'from-cyan-500 to-sky-600', title: 'Laporan & Audit', body: 'Jana laporan & jejak semua aktiviti penting dalam Audit Log.' },
    { icon: UserCog, color: 'from-violet-500 to-purple-600', title: 'Tugasan & Pelantikan', body: 'Urus warden, JAKMAS & penempatan blok.' },
  ],
};

const FINAL_STEP = { icon: Check, color: 'from-emerald-500 to-green-600', title: 'Sedia untuk Mula! 🚀', body: 'Itulah ringkasan utama. Anda boleh mulakan menggunakan portal sekarang. Jangan teragak-agak hubungi pejabat KKTF jika perlu bantuan.' };

function stepsFor(role) {
  const base = ROLE_STEPS[role] || ROLE_STEPS.admin;
  return [...base, FINAL_STEP];
}

export default function WelcomeTour({ user, role }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const effectiveRole = role || (user?.role === 'super_admin' ? 'super_admin'
    : user?.role === 'college_admin' ? 'admin'
    : user?.role === 'warden' ? 'warden'
    : user?.role === 'staff' ? 'staff'
    : user?.role === 'jakmas' ? 'jakmas'
    : 'student');

  const steps = stepsFor(effectiveRole);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const done = localStorage.getItem(STORAGE_KEY(user.id));
      if (!done) {
        // Small delay so the dashboard renders first
        const t = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(t);
      }
    } catch (e) { /* localStorage may be unavailable */ }
  }, [user?.id]);

  // Allow the AI assistant (or any other component) to re-open the tour on demand.
  useEffect(() => {
    function onRestart() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener('kkms:restart-tour', onRestart);
    return () => window.removeEventListener('kkms:restart-tour', onRestart);
  }, []);

  function close(persist = true) {
    setOpen(false);
    if (persist && user?.id) {
      try { localStorage.setItem(STORAGE_KEY(user.id), '1'); } catch (e) {}
    }
  }

  function next() {
    if (step < steps.length - 1) setStep(s => s + 1);
    else close(true);
  }
  function back() { if (step > 0) setStep(s => s - 1); }

  if (!user || user?.isGuestDemo || !open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Skip */}
          <button
            onClick={() => close(true)}
            className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Gradient hero */}
          <div className={`bg-gradient-to-br ${current.color} px-6 pt-8 pb-10`}>
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
              >
                <Icon className="w-8 h-8 text-white" />
              </motion.div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pt-5 pb-6 -mt-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-5 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span>Langkah {step + 1} / {steps.length}</span>
                {!isLast && <button onClick={() => close(true)} className="hover:text-slate-700">Langkau</button>}
              </div>

              <h2 className="text-lg font-heading font-bold text-slate-800 leading-snug">{current.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{current.body}</p>

              {/* Progress dots */}
              <div className="flex items-center gap-1.5 pt-1">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-slate-300'}`}
                  />
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={back}
                  disabled={step === 0}
                  className="text-slate-500 hover:text-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                </Button>
                <Button size="sm" onClick={next} className="bg-primary hover:bg-primary/90">
                  {isLast ? (<><Check className="w-4 h-4 mr-1.5" /> Mula</>) : (<span className="flex items-center">Seterusnya <ChevronRight className="w-4 h-4 ml-1" /></span>)}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}