import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  KeyRound, 
  Clock, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Sparkles, 
  QrCode, 
  ShieldCheck, 
  PhoneCall, 
  FileText, 
  ArrowRight, 
  DoorOpen, 
  Info,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { getOfficeHoursStatus, getStudentActiveDropKeyRequest } from '@/lib/dropKeyHelper';
import StudentCheckOutModal from '@/components/dashboard/StudentCheckOutModal';
import { Link } from 'react-router-dom';

export default function ExpressDropKey() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [officeStatus, setOfficeStatus] = useState(getOfficeHoursStatus());
  const [emergencyOverride, setEmergencyOverride] = useState(false);

  // Update real-time clock and office hours status every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setOfficeStatus(getOfficeHoursStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Fetch current student profile & active drop-key request
  const loadStudentData = async () => {
    try {
      setLoading(true);
      const students = await base44.entities.Student.list();
      let found = null;
      if (user?.student_id) {
        found = students.find(s => s.student_id === user.student_id);
      }
      if (!found && user?.email) {
        found = students.find(s => (s.email || '').toLowerCase() === user.email.toLowerCase());
      }
      if (!found && user?.full_name) {
        found = students.find(s => (s.full_name || '').toLowerCase() === user.full_name.toLowerCase());
      }
      setStudent(found || null);

      if (found) {
        const req = getStudentActiveDropKeyRequest(found.id, found.student_id);
        setActiveRequest(req);
      }
    } catch (err) {
      console.error('Ralat memuatkan profil residen:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const hasRoom = student?.block_name && student?.room_number;
  const isCheckedOut = student?.room_status === 'Checked Out';
  const canApplyDropKey = (officeStatus.isAfterHours || emergencyOverride) && hasRoom && !isCheckedOut;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HEADER UTAMA */}
      <PageHeader
        title="Express Drop-Key Check-Out"
        description="Sistem serahan kunci pantas kolej kediaman di luar waktu pejabat dan hujung minggu."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/contact">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hotline Kolej</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* BANNER STATUS WAKTU OPERASI (PEJABAT VS LUAR WAKTU PEJABAT) */}
      <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs transition-all ${
        officeStatus.isOfficeHours
          ? 'bg-amber-50/60 border-amber-200 text-amber-950 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-100'
          : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-100'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              officeStatus.isOfficeHours
                ? 'bg-amber-500 text-white shadow-amber-500/20'
                : 'bg-emerald-600 text-white shadow-emerald-600/20'
            }`}>
              {officeStatus.isOfficeHours ? <Clock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xs font-black uppercase tracking-wider">
                  {officeStatus.isOfficeHours ? 'Status: Waktu Pejabat Dibuka' : 'Status: Waktu Drop-Key Aktif'}
                </span>
                <Badge className={`text-[10px] font-bold px-2 py-0.5 ${
                  officeStatus.isOfficeHours 
                    ? 'bg-amber-600 text-white hover:bg-amber-600' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-600 animate-pulse'
                }`}>
                  {officeStatus.isOfficeHours ? 'Pejabat Beroperasi' : 'Luar Waktu / Hujung Minggu'}
                </Badge>
              </div>

              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {officeStatus.isOfficeHours 
                  ? 'Sila Hadir ke Kaunter Pejabat Pentadbiran KKTF untuk Check-Out' 
                  : 'Sistem Express Drop-Key Kini Dibuka untuk Penyerahan Kunci'}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                {officeStatus.isOfficeHours ? (
                  <>
                    Waktu semasa adalah <strong>{officeStatus.dayName} ({officeStatus.currentTimeStr})</strong>. Pada waktu pejabat (8:00 PG - 5:00 PTG), pelajar disarankan memulangkan kunci terus di kaunter Pejabat Kolej secara bersemuka bersama staf untuk semakan bilik dan penyelarasan deposit secara langsung.
                  </>
                ) : (
                  <>
                    Waktu semasa adalah <strong>{officeStatus.dayName} ({officeStatus.currentTimeStr})</strong> iaitu di luar waktu operasi pejabat. Anda boleh menyerahkan kunci bilik ke dalam Peti Drop-Key berhampiran pondok kawalan keselamatan kolej.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* BUTANG TINDAKAN KELULUSAN / OVERRIDE */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {activeRequest ? (
              <Button
                onClick={() => setCheckOutModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>Lihat Resit / Imbas Peti</span>
              </Button>
            ) : canApplyDropKey ? (
              <Button
                onClick={() => setCheckOutModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs"
              >
                <KeyRound className="w-4 h-4" />
                <span>Mohon Check-Out Drop-Key</span>
              </Button>
            ) : officeStatus.isOfficeHours && !isCheckedOut ? (
              <div className="space-y-1.5 text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmergencyOverride(!emergencyOverride)}
                  className="text-[11px] h-8 text-amber-800 border-amber-300 hover:bg-amber-100"
                >
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  {emergencyOverride ? 'Batal Permohonan Khas' : 'Pengecualian / Kecemasan Luar Waktu?'}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {/* NOTIS TAMBAHAN JIKA OVERRIDE DIAKTIFKAN PADA WAKTU PEJABAT */}
        {emergencyOverride && (
          <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-amber-800 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-600" />
              <strong>Mod Kecemasan Diaktifkan:</strong> Anda dibenarkan menghantar drop-key sekiranya mempunyai urusan luar jangka atau pelepasan segera.
            </span>
            <Button 
              size="sm" 
              onClick={() => setCheckOutModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 rounded-lg"
            >
              Teruskan Borang Drop-Key
            </Button>
          </div>
        )}
      </div>

      {/* KAD STATUS RESIDEN & PERMOHONAN AKTIF */}
      {activeRequest ? (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">Permohonan Drop-Key Anda Sedang Diproses</h3>
                  <Badge className="bg-amber-500 text-white text-[10px]">Menunggu Pengesahan Staf</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Bilik: <strong className="text-foreground">{activeRequest.block_name} - Bilik {activeRequest.room_number}</strong> &bull; Tarikh Serahan: {activeRequest.checkout_date} ({activeRequest.checkout_time})
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {activeRequest.scanned_at_dropbox ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Kunci disahkan telah dimasukkan & diimbas di peti drop-box.
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-600" /> Sila letakkan kunci bilik ke dalam peti dan imbas kod QR peti.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setCheckOutModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-4 rounded-xl gap-1.5 shrink-0 font-medium"
            >
              <QrCode className="w-4 h-4" /> Buka Resit & Pengimbas Peti
            </Button>
          </div>
        </div>
      ) : isCheckedOut ? (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">Status Check-Out: Selesai</h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Anda telah selamat mendaftar keluar daripada Kolej Kediaman Tun Fuad. Terima kasih atas kerjasama anda sepanjang menetap di kolej.
            </p>
          </div>
        </div>
      ) : null}

      {/* MAKLUMAT JADUAL WAKTU & PERATURAN CHECK-OUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* KAD WAKTU PEJABAT */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-foreground">Waktu Pejabat Pentadbiran</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-indigo-700 border-indigo-200">
                Check-Out Kaunter
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pada waktu pejabat dibuka, pelajar dikehendaki check out secara manual di kaunter untuk memudahkan pemeriksaan inventori bersama staf bertugas:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground font-medium">
              <li className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span>Isnin – Khamis:</span>
                <span className="font-mono text-muted-foreground">8:00 PG – 1:00 PTG | 2:00 PTG – 5:00 PTG</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                <span>Jumaat:</span>
                <span className="font-mono text-muted-foreground">8:00 PG – 12:15 TGH | 2:45 PTG – 5:00 PTG</span>
              </li>
            </ul>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 italic">
            *Kaunter ditutup pada cuti umum dan waktu rehat tengah hari.
          </p>
        </div>

        {/* KAD WAKTU DROP-KEY */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">Waktu Operasi Peti Drop-Key</h3>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200">
                Luar Waktu / 24 Jam
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Khusus bagi pelajar yang perlu pulang awal pagi, lewat malam, atau pada cuti hujung minggu:
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-foreground font-medium">
              <li className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <span>Hari Bekerja (Malam/Awal):</span>
                <span className="font-mono text-emerald-800">5:00 PTG – 8:00 PG (Keesokan)</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <span>Sabtu & Ahad (Hujung Minggu):</span>
                <span className="font-mono text-emerald-800">Dibuka 24 Jam</span>
              </li>
            </ul>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 italic">
            *Lokasi Peti Drop-Key: Lobi Pejabat Kolej / Bersebelahan Pondok Pengawal Utama KKTF.
          </p>
        </div>
      </div>

      {/* PANDUAN LANGKAH DEMI LANGKAH (SOP 4 LANGKAH) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              Panduan SOP Express Drop-Key Check-Out
            </h2>
            <p className="text-xs text-muted-foreground">
              Ikuti 4 langkah mudah ini untuk memastikan pemulangan kunci anda sah dan bebas daripada denda kehilangan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* LANGKAH 1 */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                1
              </div>
              <h4 className="text-xs font-bold text-foreground">Kemaskan Bilik & Tutup Suis</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pastikan lantai bilik disapu bersih, sampah dibuang ke tong luar, almari dikosongkan dan semua suis lampu/kipas serta tingkap ditutup rapat.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bilik bersih & selamat
            </div>
          </div>

          {/* LANGKAH 2 */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                2
              </div>
              <h4 className="text-xs font-bold text-foreground">Muat Naik 4 Foto Bukti</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Ambil 4 foto wajib dalam borang sistem: (1) Lantai bersih, (2) Kunci & tag bilik, (3) Almari terbuka kosong, dan (4) Suis/tingkap tertutup.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <Camera className="w-3.5 h-3.5 text-sky-500" /> Bukti visual kebersihan
            </div>
          </div>

          {/* LANGKAH 3 */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                3
              </div>
              <h4 className="text-xs font-bold text-foreground">Serah Kunci & Imbas Peti</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Masukkan kunci ke dalam sampul dan masukkan ke Peti Drop-Key. Buka kamera dalam sistem dan imbas Kod QR yang ditampal pada peti.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Imbasan lokasi peti sah
            </div>
          </div>

          {/* LANGKAH 4 */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                4
              </div>
              <h4 className="text-xs font-bold text-foreground">Pengesahan Staf Pentadbiran & Selesai</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Staf Pentadbiran (Admin Pejabat KKTF) akan membuka peti dan memeriksa fizikal kunci pada jam 8:00 pagi hari bekerja berikutnya. Status bilik anda dilepaskan kepada 'Checked Out'.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Staf Pentadbiran KKTF
            </div>
          </div>
        </div>
      </div>

      {/* SOALAN LAZIM (FAQ) & PERINGATAN INTEGRITI */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-foreground">Soalan Lazim & Peringatan Penting</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="font-bold text-foreground">Siapakah yang menyemak dan mengesahkan kunci di Peti Drop-Key?</p>
            <p className="text-muted-foreground">
              Penyemakan fizikal dan kelulusan check-out drop-key dilakukan sepenuhnya oleh <strong>Staf Pentadbiran (Admin Pejabat KKTF)</strong> yang menguruskan aset kolej, bukannya felo blok.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="font-bold text-foreground">Bilakah status bilik saya akan bertukar kepada 'Checked Out'?</p>
            <p className="text-muted-foreground">
              Sebaik Staf Pentadbiran Pejabat KKTF membuka peti kunci pada jam 8:00 pagi hari bekerja berikutnya dan meluluskan borang drop-key anda, sistem akan menghantar notifikasi dan membebaskan status bilik serta-merta.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="font-bold text-foreground">Bagaimanakah jika saya tertinggal barang selepas memasukkan kunci?</p>
            <p className="text-muted-foreground">
              Kunci yang telah dimasukkan ke dalam Peti Drop-Key tidak boleh diambil semula oleh pelajar. Sila berhubung dengan felo bertugas atau pegawai keselamatan untuk bantuan membuka pintu bilik jika berlaku kecemasan.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
            <p className="font-bold text-foreground">Bolehkah saya meminta rakan serahkan kunci bagi pihak saya?</p>
            <p className="text-muted-foreground">
              Pelajar bertanggungjawab sepenuhnya atas kunci masing-masing. Gambar dan perakuan integriti perlu disahkan menggunakan akaun MyKKTF rasmi anda sendiri.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL CHECK-OUT DROP-KEY PELAJAR */}
      {student && (
        <StudentCheckOutModal
          student={student}
          user={user}
          open={checkOutModalOpen}
          onOpenChange={setCheckOutModalOpen}
          onCompleted={() => {
            loadStudentData();
          }}
        />
      )}
    </div>
  );
}
