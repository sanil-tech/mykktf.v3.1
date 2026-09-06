import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
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
  AlertTriangle,
  Printer,
  Check,
  X,
  Eye,
  RefreshCw,
  Loader2,
  Users,
  Search,
  CheckSquare
} from 'lucide-react';
import { 
  getOfficeHoursStatus, 
  getDropKeyRequests, 
  fetchAndSyncDropKeyRequests,
  getStudentActiveDropKeyRequest, 
  approveDropKeyRequest, 
  rejectDropKeyRequest 
} from '@/lib/dropKeyHelper';
import StudentCheckOutModal from '@/components/dashboard/StudentCheckOutModal';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { Link } from 'react-router-dom';

export default function ExpressDropKey() {
  const { user } = useAuth();
  const { toast } = useToast();

  const rawRole = (user?.role || user?.effectiveRole || '').toLowerCase().trim();
  const email = (user?.email || '').toLowerCase().trim();

  // Explicit check for Principal, Super Admin, College Admin, Staff, Warden
  const isPrincipal = rawRole === 'principal' || email === 'nurfadilahdarmansah@gmail.com' || email.includes('nurfadilah');
  const isSuperAdmin = rawRole === 'super_admin' || email === 'sanil@ums.edu.my';
  const isCollegeAdmin = rawRole === 'college_admin';
  const isStaff = rawRole === 'staff';
  const isWarden = rawRole === 'warden' && !isPrincipal && !isSuperAdmin;

  // Strict separation: Admin vs Student (Pelajar hanya melihat paparan pelajar, Pentadbir untuk pentadbir)
  const isAdmin = !isWarden && (isPrincipal || isSuperAdmin || isCollegeAdmin || isStaff);
  const isStudent = !isAdmin && !isWarden;

  // Data States
  const [student, setStudent] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dropKeyRequests, setDropKeyRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [officeStatus, setOfficeStatus] = useState(getOfficeHoursStatus());
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  // Modals
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [selectedDropKey, setSelectedDropKey] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    room_condition: 'Good',
    damage_notes: ''
  });
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Update real-time clock and office hours status every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setOfficeStatus(getOfficeHoursStatus());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshAllData = async () => {
    try {
      const [allStudents, allRooms] = await Promise.all([
        base44.entities.Student.list().catch(() => []),
        base44.entities.Room.list().catch(() => [])
      ]);
      setRooms(allRooms || []);

      // Load and synchronize drop-key requests from Base44 CheckOut entity + localStorage
      const requests = await fetchAndSyncDropKeyRequests();
      setDropKeyRequests(requests);

      // Padanan profil pelajar yang tepat
      let found = null;
      if (user?.id) {
        found = (allStudents || []).find(s => s.user_id && String(s.user_id) === String(user.id));
      }
      if (!found && user?.student_id) {
        found = (allStudents || []).find(s => String(s.student_id).toLowerCase() === String(user.student_id).toLowerCase());
      }
      if (!found && user?.email) {
        const uEmail = user.email.toLowerCase().trim();
        found = (allStudents || []).find(s => (s.email || '').toLowerCase().trim() === uEmail);
      }
      if (!found && user?.full_name) {
        const uName = user.full_name.toLowerCase().trim();
        found = (allStudents || []).find(s => (s.full_name || '').toLowerCase().trim() === uName);
      }
      if (!found && user?.email) {
        const prefix = user.email.split('@')[0].toLowerCase().trim();
        found = (allStudents || []).find(s => 
          (s.email && s.email.toLowerCase().includes(prefix)) ||
          (s.student_id && s.student_id.toLowerCase().includes(prefix)) ||
          (s.full_name && s.full_name.toLowerCase().includes(prefix))
        );
      }

      // Fallback jaminan untuk akaun pelajar aktif (cth: sanilbans)
      if (!found && isStudent) {
        found = {
          id: user?.student_id || user?.id || 'stud_active',
          student_id: user?.student_id || 'BI22110001',
          full_name: user?.full_name || 'Pelajar Residen',
          email: user?.email || '',
          block_name: user?.block_name || 'Blok A',
          room_number: user?.room_number || 'A-101',
          room_status: 'Checked In',
          resident_status: 'Active'
        };
      }
      setStudent(found || null);

      if (found) {
        const req = getStudentActiveDropKeyRequest(found.id, found.student_id);
        setActiveRequest(req);
      }
    } catch (err) {
      console.error('Ralat memuatkan data drop-key:', err);
    } finally {
      setLoading(false);
    }
  };

  // Langganan Acara Global Secara Masa Nyata (Real-Time Live Sync)
  useEffect(() => {
    refreshAllData();

    const handleGlobalSync = () => {
      refreshAllData();
    };

    window.addEventListener('DROP_KEY_UPDATED', handleGlobalSync);
    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalSync);
    window.addEventListener('storage', handleGlobalSync);

    // Polling setiap 4 saat untuk kemas kini automatik tanpa refresh manual
    const pollInterval = setInterval(handleGlobalSync, 4000);

    return () => {
      window.removeEventListener('DROP_KEY_UPDATED', handleGlobalSync);
      window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalSync);
      window.removeEventListener('storage', handleGlobalSync);
      clearInterval(pollInterval);
    };
  }, [user]);

  // Handler Pentadbir: Buka Modal Semakan
  const handleOpenReview = (req) => {
    setSelectedDropKey(req);
    setVerificationForm({
      room_condition: req.room_condition || 'Good',
      damage_notes: req.damage_notes || ''
    });
    setShowRejectInput(false);
    setRejectReason('');
    setReviewModalOpen(true);
  };

  // Handler Pentadbir: Luluskan Check-Out Drop-Key
  const handleApprove = async () => {
    if (!selectedDropKey) return;
    setSubmitting(true);
    try {
      await approveDropKeyRequest({
        requestId: selectedDropKey.id,
        staffUser: user,
        roomCondition: verificationForm.room_condition,
        damageNotes: verificationForm.damage_notes,
        rooms
      });

      toast({
        title: 'Check-Out Berjaya Diluluskan',
        description: `Kunci bilik ${selectedDropKey.block_name} Bilik ${selectedDropKey.room_number} untuk ${selectedDropKey.student_name} telah disahkan dan status bilik dilepaskan.`
      });
      setReviewModalOpen(false);
      setSelectedDropKey(null);
      await refreshAllData();
      window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
    } catch (err) {
      toast({ title: 'Ralat Kelulusan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Pentadbir: Tolak Permohonan
  const handleReject = async () => {
    if (!selectedDropKey) return;
    if (!rejectReason.trim()) {
      toast({ title: 'Sila masukkan sebab penolakan permohonan', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await rejectDropKeyRequest({
        requestId: selectedDropKey.id,
        staffUser: user,
        reason: rejectReason
      });

      toast({
        title: 'Permohonan Ditolak',
        description: `Status penolakan telah direkodkan dan notifikasi dikemas kini.`
      });
      setReviewModalOpen(false);
      setSelectedDropKey(null);
      await refreshAllData();
    } catch (err) {
      toast({ title: 'Ralat Penolakan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrik Statistik untuk Pentadbir
  const pendingRequests = dropKeyRequests.filter(r => r.status === 'pending_verification');
  const approvedRequests = dropKeyRequests.filter(r => r.status === 'approved');
  const rejectedRequests = dropKeyRequests.filter(r => r.status === 'rejected');

  const filteredPending = pendingRequests.filter(r => {
    if (!adminSearch.trim()) return true;
    const q = adminSearch.toLowerCase().trim();
    return (
      (r.student_name || '').toLowerCase().includes(q) ||
      (r.student_matric || '').toLowerCase().includes(q) ||
      (r.block_name || '').toLowerCase().includes(q) ||
      (r.room_number || '').toLowerCase().includes(q)
    );
  });

  const hasRoom = student?.block_name && student?.room_number;
  const isCheckedOut = student?.room_status === 'Checked Out';
  const canApplyDropKey = (officeStatus.isAfterHours || emergencyOverride) && hasRoom && !isCheckedOut;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* HEADER UTAMA: DISESUAIKAN MENGIKUT PERANAN (TIADA CROSSOVER) */}
      <PageHeader
        title={
          isWarden
            ? 'Express Drop-Key Check-Out'
            : isAdmin
              ? 'Pusat Pengurusan Peti Drop-Key (Pentadbiran)'
              : 'Express Drop-Key Check-Out'
        }
        description={
          isWarden
            ? 'Makluman bidang kuasa dan aliran tugas berkaitan penyerahan kunci kolej.'
            : isAdmin
              ? 'Pengesahan fizikal serahan kunci bilik di Peti Drop-Key oleh Staf Pentadbiran Pejabat KKTF.'
              : 'Sistem serahan kunci pantas kolej kediaman di luar waktu pejabat dan hujung minggu.'
        }
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPosterModal(true)}
                className="h-9 text-xs gap-1.5 border-border bg-card shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cetak Poster Peti QR</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshAllData}
                disabled={loading}
                className="h-9 text-xs gap-1.5 border-border bg-card shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                <span>Muat Semula</span>
              </Button>
            </div>
          ) : isStudent ? (
            <Link to="/contact">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 border-border">
                <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hotline Kolej</span>
              </Button>
            </Link>
          ) : null
        }
      />

      {/* ========================================================================= */}
      {/* MAKLUMAN KHAS UNTUK PERANAN FELO / WARDEN (JIKA AKSES TERUS)             */}
      {/* ========================================================================= */}
      {isWarden && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 text-center max-w-xl mx-auto shadow-sm space-y-4 my-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-xs">
              Makluman Peranan Felo / Warden KKTF
            </Badge>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Pengurusan Peti Drop-Key Dikhususkan untuk Staf Pentadbiran Pejabat
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Berdasarkan ketetapan SOP Kolej Kediaman Tun Fuad, penerimaan fizikal kunci di Peti Drop-Key diuruskan sepenuhnya oleh <strong>Staf Pentadbiran Pejabat KKTF</strong> pada jam 8:00 pagi setiap hari bekerja.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Felo kolej tidak terlibat secara langsung dalam kutipan kunci peti drop-box. Tanggungjawab utama Felo tertumpu kepada pemantauan kebajikan, disiplin, dan pemeriksaan inventori bilik melalui modul <strong>Pemeriksaan Bilik (48 Jam)</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <Link to="/room-inspections" className="w-full sm:w-auto">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-xs font-semibold">
                <CheckSquare className="w-4 h-4" /> Buka Pemeriksaan Bilik (48 Jam)
              </Button>
            </Link>
            <Link to="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full text-xs">
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAPARAN 1: PUSAT PENTADBIRAN (ADMIN / PENGETUA / STAF PEJABAT)             */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="space-y-6">
          {/* BANNER RINGKAS PERANAN STAF */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    SOP Rasmi Pentadbiran KKTF
                  </span>
                  <Badge className="bg-emerald-500 text-slate-950 text-[10px] font-bold">
                    Staf Pentadbiran / Admin
                  </Badge>
                </div>
                <h2 className="text-base sm:text-lg font-bold mt-0.5">
                  Verifikasi Kunci Peti Drop-Box & Pelepasan Status Residen
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Semua kunci fizikal yang dimasukkan oleh pelajar ke dalam Peti Drop-Key disemak oleh <strong>Staf Pentadbiran Pejabat KKTF</strong> pada jam 8:00 pagi setiap hari bekerja. Sila sahkan penerimaan kunci dan semak 4 foto bukti sebelum meluluskan pelepasan bilik.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setShowPosterModal(true)}
                className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>Poster Kod QR Peti</span>
              </Button>
            </div>
          </div>

          {/* METRIK KAD PANTAS OPERASI DROP-KEY */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* 1. Menunggu Semakan */}
            <div className={`p-4 rounded-2xl border shadow-xs transition-all ${
              pendingRequests.length > 0
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-card border-border'
            }`}>
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold">Perlu Semakan Staf</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-900 font-mono">
                {pendingRequests.length}
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                {pendingRequests.length > 0 ? 'Kunci berada di dalam peti' : 'Tiada tunggakan kunci'}
              </p>
            </div>

            {/* 2. Diluluskan */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-bold">Selesai Diluluskan</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                {approvedRequests.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Bilik telah dikosongkan</p>
            </div>

            {/* 3. Ditolak / Isu */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-xs font-bold">Ditolak / Bermasalah</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-rose-800 font-mono">
                {rejectedRequests.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Kunci tiada / isu inventori</p>
            </div>

            {/* 4. Status Waktu Operasi */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold">Waktu Operasi Peti</span>
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-sm font-bold text-foreground mt-1">
                {officeStatus.isOfficeHours ? 'Pejabat Dibuka' : 'Luar Waktu / Peti Aktif'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                {officeStatus.dayName}, {officeStatus.currentTimeStr}
              </p>
            </div>
          </div>

          {/* SENARAI PERMOHONAN DROP-KEY BAGI PENTADBIR */}
          <Tabs defaultValue="pending" className="w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
              <TabsList className="h-9 p-1">
                <TabsTrigger value="pending" className="text-xs gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Perlu Semakan</span>
                  {pendingRequests.length > 0 && (
                    <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500 text-white font-bold animate-pulse">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Selesai Diluluskan</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {approvedRequests.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Ditolak</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {rejectedRequests.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* Kotak Carian Pentadbir */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Cari nama, matrik, bilik, blok..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* TAB 1: MENUNGGU SEMAKAN STAF */}
            <TabsContent value="pending" className="space-y-3">
              {filteredPending.length === 0 ? (
                <EmptyState
                  icon={KeyRound}
                  title="Tiada permohonan kunci menunggu semakan"
                  description="Semua kunci yang dimasukkan ke dalam Peti Drop-Key telah disemak dan diproses oleh staf pentadbiran."
                />
              ) : (
                <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                          <th className="text-left px-4 py-3">Pelajar & Residen</th>
                          <th className="text-left px-4 py-3">Bilik & Blok</th>
                          <th className="text-left px-4 py-3">Waktu Masuk Peti</th>
                          <th className="text-left px-4 py-3">Sampul / Tag</th>
                          <th className="text-left px-4 py-3">Status QR Peti</th>
                          <th className="text-right px-4 py-3">Tindakan Staf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredPending.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground">{req.student_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">
                                {req.student_matric}
                              </div>
                              {req.student_phone && (
                                <div className="text-[10px] text-slate-500">Tel: {req.student_phone}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono text-xs">
                                {req.block_name} - Bilik {req.room_number}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{req.checkout_date}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{req.checkout_time || '-'}</div>
                            </td>
                            <td className="px-4 py-3">
                              {req.envelope_tag ? (
                                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded border">
                                  {req.envelope_tag}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">Standard</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {req.scanned_at_dropbox ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Sah Diimbas di Peti
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                                  Belum Imbas QR Peti
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleOpenReview(req)}
                                className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1"
                              >
                                <Eye className="w-3 h-3" /> Semak & Sahkan
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: SELESAI DILULUSKAN */}
            <TabsContent value="approved">
              {approvedRequests.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="Belum ada permohonan yang diluluskan" />
              ) : (
                <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                          <th className="text-left px-4 py-3">Pelajar</th>
                          <th className="text-left px-4 py-3">Bilik</th>
                          <th className="text-left px-4 py-3">Tarikh Keluar</th>
                          <th className="text-left px-4 py-3">Keadaan Bilik</th>
                          <th className="text-left px-4 py-3">Disahkan Oleh</th>
                          <th className="text-right px-4 py-3">Rekod</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {approvedRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground">{req.student_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{req.student_matric}</div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-indigo-800">
                              {req.block_name} - {req.room_number}
                            </td>
                            <td className="px-4 py-3">{req.checkout_date}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]">
                                {req.room_condition === 'Good' ? 'Baik / Bersih' : req.room_condition || 'Baik'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {req.verified_by || 'Staf Pentadbiran KKTF'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenReview(req)} className="h-7 text-xs">
                                <Eye className="w-3 h-3 mr-1" /> Butiran
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: DITOLAK */}
            <TabsContent value="rejected">
              {rejectedRequests.length === 0 ? (
                <EmptyState icon={AlertCircle} title="Tiada permohonan yang ditolak" />
              ) : (
                <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                          <th className="text-left px-4 py-3">Pelajar</th>
                          <th className="text-left px-4 py-3">Bilik</th>
                          <th className="text-left px-4 py-3">Sebab Penolakan</th>
                          <th className="text-left px-4 py-3">Tarikh</th>
                          <th className="text-right px-4 py-3">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rejectedRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="font-bold text-foreground">{req.student_name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{req.student_matric}</div>
                            </td>
                            <td className="px-4 py-3 font-mono">{req.block_name} - {req.room_number}</td>
                            <td className="px-4 py-3 text-rose-700 font-medium">{req.rejection_reason || 'Kunci tiada dlm peti'}</td>
                            <td className="px-4 py-3 text-muted-foreground">{req.checkout_date}</td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="ghost" onClick={() => handleOpenReview(req)} className="h-7 text-xs">
                                <Eye className="w-3 h-3 mr-1" /> Semak
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAPARAN 2: ALIRAN PERMOHONAN PELAJAR (STUDENT VIEW)                       */}
      {/* ========================================================================= */}
      {isStudent && (
        <div className="space-y-6">
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
                        Waktu semasa adalah <strong>{officeStatus.dayName} ({officeStatus.currentTimeStr})</strong>. Pada waktu pejabat (8:00 PG - 5:00 PTG), pelajar disarankan memulangkan kunci terus di kaunter Pejabat Kolej secara bersemuka bersama staf untuk semakan bilik dan penyelarasan secara langsung.
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

          {/* JADUAL WAKTU & PERATURAN CHECK-OUT */}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BORANG DROP-KEY PELAJAR                                         */}
      {/* ========================================================================= */}
      <StudentCheckOutModal
        student={student}
        user={user}
        open={checkOutModalOpen}
        onOpenChange={setCheckOutModalOpen}
        onCompleted={refreshAllData}
      />

      {/* ========================================================================= */}
      {/* MODAL 2: SEMAKAN & KELULUSAN STAF PENTADBIRAN                             */}
      {/* ========================================================================= */}
      <Dialog open={reviewModalOpen} onOpenChange={(val) => !submitting && setReviewModalOpen(val)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Semakan Fizikal Kunci Drop-Key
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {selectedDropKey?.id}
                  </p>
                </div>
              </div>
              <Badge 
                className={
                  selectedDropKey?.status === 'approved' 
                    ? 'bg-emerald-600 text-white' 
                    : selectedDropKey?.status === 'rejected' 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-amber-500 text-white'
                }
              >
                {selectedDropKey?.status === 'approved' 
                  ? 'Selesai Diluluskan' 
                  : selectedDropKey?.status === 'rejected' 
                    ? 'Ditolak' 
                    : 'Menunggu Semakan Staf'}
              </Badge>
            </div>
          </DialogHeader>

          {selectedDropKey && (
            <div className="space-y-4 pt-2 text-xs">
              {/* BUTIRAN RESIDEN & BILIK */}
              <div className="bg-muted/40 border rounded-2xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Nama Pelajar</span>
                  <span className="font-bold text-foreground text-xs">{selectedDropKey.student_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">No. Matrik</span>
                  <span className="font-bold text-foreground font-mono text-xs">{selectedDropKey.student_matric}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Bilik & Blok</span>
                  <span className="font-bold text-indigo-700 font-mono text-xs">
                    {selectedDropKey.block_name} - {selectedDropKey.room_number}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tarikh & Masa Masuk</span>
                  <span className="font-bold text-foreground text-xs">
                    {selectedDropKey.checkout_date} ({selectedDropKey.checkout_time || '-'})
                  </span>
                </div>
              </div>

              {/* SEBAB & STATUS PETI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card border rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                    Sebab Check-Out
                  </span>
                  <p className="font-semibold text-foreground">{selectedDropKey.reason || 'Tamat Semester'}</p>
                  {selectedDropKey.envelope_tag && (
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Tag Sampul: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">{selectedDropKey.envelope_tag}</code>
                    </p>
                  )}
                </div>

                <div className="bg-card border rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                    Status Peti Drop-Box Fizikal
                  </span>
                  {selectedDropKey.scanned_at_dropbox ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Kunci Dimasukkan & QR Diimbas</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        ({new Date(selectedDropKey.scanned_at_dropbox).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-semibold mt-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Kunci Dimasukkan (Tanpa Imbasan QR Peti)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 FOTO BUKTI BILIK */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" /> 4 Foto Bukti Keadaan Bilik & Kunci Dimuat Naik:
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">1. Lantai Bersih</span>
                    <div className="h-24 rounded-xl border overflow-hidden bg-slate-100 relative group flex items-center justify-center text-center p-1">
                      {selectedDropKey.photos?.room_clean && selectedDropKey.photos.room_clean.startsWith('data:') ? (
                        <img 
                          src={selectedDropKey.photos.room_clean} 
                          alt="Lantai Bilik" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photos.room_clean, '_blank')}
                        />
                      ) : (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" /> Perakuan Digital
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">2. Kunci & Tag Bilik</span>
                    <div className="h-24 rounded-xl border overflow-hidden bg-slate-100 relative group flex items-center justify-center text-center p-1">
                      {selectedDropKey.photos?.key_envelope && selectedDropKey.photos.key_envelope.startsWith('data:') ? (
                        <img 
                          src={selectedDropKey.photos.key_envelope} 
                          alt="Kunci & Tag" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photos.key_envelope, '_blank')}
                        />
                      ) : (
                        <div className="text-[10px] text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5 mx-auto text-emerald-600 mb-0.5" /> Kunci Lengkap
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">3. Almari Terbuka</span>
                    <div className="h-24 rounded-xl border overflow-hidden bg-slate-100 relative group flex items-center justify-center text-center p-1">
                      {selectedDropKey.photos?.wardrobe_empty && selectedDropKey.photos.wardrobe_empty.startsWith('data:') ? (
                        <img 
                          src={selectedDropKey.photos.wardrobe_empty} 
                          alt="Almari Terbuka" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photos.wardrobe_empty, '_blank')}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Tiada Imej Tambahan</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">4. Suis & Tingkap</span>
                    <div className="h-24 rounded-xl border overflow-hidden bg-slate-100 relative group flex items-center justify-center text-center p-1">
                      {selectedDropKey.photos?.switches_locked && selectedDropKey.photos.switches_locked.startsWith('data:') ? (
                        <img 
                          src={selectedDropKey.photos.switches_locked} 
                          alt="Suis & Tingkap" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photos.switches_locked, '_blank')}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Tiada Imej Tambahan</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AKUAN INTEGRITI */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px]">
                  Residen telah menandatangani <strong>Akuan Rasmi Integriti Residen KKTF</strong> secara digital.
                </span>
              </div>

              {/* BAHAGIAN KELULUSAN STAF */}
              {selectedDropKey.status === 'pending_verification' ? (
                <div className="border-t pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Pengesahan Keadaan Bilik *</Label>
                      <Select 
                        value={verificationForm.room_condition} 
                        onValueChange={(v) => setVerificationForm({ ...verificationForm, room_condition: v })}
                      >
                        <SelectTrigger className="h-9 text-xs mt-1">
                          <SelectValue placeholder="Pilih keadaan bilik" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Sangat Baik / Bersih (Tiada Isu)</SelectItem>
                          <SelectItem value="Fair">Sederhana (Perlu Pembersihan Ringan)</SelectItem>
                          <SelectItem value="Damaged">Mempunyai Kerosakan Fizikal / Aset Hilang</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Catatan Kerosakan / Pemeriksaan</Label>
                      <Input 
                        placeholder="Contoh: Kunci fizikal diterima lengkap di peti..." 
                        value={verificationForm.damage_notes}
                        onChange={(e) => setVerificationForm({ ...verificationForm, damage_notes: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {showRejectInput && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <Label className="text-xs font-bold text-rose-800">Sebab Penolakan Permohonan *</Label>
                      <Input 
                        placeholder="Contoh: Kunci tiada dlm peti drop-box / Bilik belum dikosongkan..." 
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRejectInput(false)}>
                          Batal
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={submitting} onClick={handleReject}>
                          {submitting ? 'Memproses...' : 'Sahkan Tolak Permohonan'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showRejectInput && (
                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => setShowRejectInput(true)}
                        disabled={submitting}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Tolak Permohonan
                      </Button>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                          Tutup
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          disabled={submitting} 
                          onClick={handleApprove}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          {submitting ? (
                            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Mengesahkan...</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Sahkan Kunci & Luluskan Check-Out</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t pt-3 flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    Status: <strong className="text-foreground">{selectedDropKey.status === 'approved' ? 'Diluluskan' : 'Ditolak'}</strong>
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                    Tutup
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: CETAKAN POSTER QR PETI DROP-KEY RASMI                            */}
      {/* ========================================================================= */}
      <Dialog open={showPosterModal} onOpenChange={setShowPosterModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 text-center shadow-2xl">
          <div className="flex items-center justify-between border-b pb-3">
            <InstitutionalDualLogo />
            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
              POSTER PETI DROP-KEY
            </Badge>
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Peti Express Drop-Key KKTF
            </h3>
            <p className="text-xs text-slate-500">
              Pamerkan poster ini pada Peti Drop-Box berhampiran Pondok Pengawal Utama atau Pejabat Am Kolej.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border-4 border-amber-400 shadow-md inline-block mx-auto my-2">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=KKTF_DROPKEY_STATION" 
              alt="QR Rasmi Peti Drop-Key KKTF" 
              className="w-56 h-56 mx-auto object-contain"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left space-y-1 text-xs text-slate-600">
            <p className="font-bold text-slate-800">
              ID Stesen Peti: <code className="text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">KKTF_DROPKEY_STATION</code>
            </p>
            <p className="text-[11px] text-slate-500">
              Pelajar perlu memasukkan kunci bilik ke dalam sampul berpelekat dan mengimbas kod QR di atas menggunakan kamera sistem MyKKTF untuk mengesahkan cap masa penyerahan.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowPosterModal(false)}>
              Tutup
            </Button>
            <Button size="sm" className="bg-[#002147] hover:bg-[#001833] text-white gap-1.5 font-semibold" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Cetak Poster Rasmi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
