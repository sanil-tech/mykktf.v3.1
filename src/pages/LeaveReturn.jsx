import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  MapPin, 
  QrCode, 
  Clock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  Building, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';

export default function LeaveReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const blockParam = searchParams.get('block') || 'Kolej Kediaman Tun Fuad (Pondok Pengawal)';
  const locationParam = searchParams.get('location') || blockParam;

  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [activeLeave, setActiveLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmedData, setConfirmedData] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      let students = await base44.entities.Student.filter({ user_id: user.id });
      if (!students.length) students = await base44.entities.Student.filter({ email: user.email });
      const studentProfile = students[0] || null;
      setStudent(studentProfile);

      if (studentProfile) {
        // Find active unreturned leave applications
        const leaves = await base44.entities.LeaveApplication.filter({ 
          student_id: studentProfile.student_id 
        }, '-created_date');

        // Look for approved or overdue leaves that have not yet been marked returned
        const active = leaves.find(l => (l.status === 'Approved' || l.status === 'Pending') && l.status !== 'Returned' && !l.returned_at);
        setActiveLeave(active || null);
      }
    } catch (err) {
      console.error('Error fetching return data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReturn() {
    if (!student) {
      toast.error('Profil pelajar tidak ditemui');
      return;
    }

    setConfirming(true);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = now.toLocaleDateString('en-CA');
      const timeStr = now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      let isLate = false;
      if (activeLeave && activeLeave.return_date) {
        isLate = activeLeave.return_date < todayStr;
      }

      const returnStatus = isLate ? 'Late' : 'On-Time';

      if (activeLeave) {
        await base44.entities.LeaveApplication.update(activeLeave.id, {
          status: 'Returned',
          returned_at: nowIso,
          returned_date: todayStr,
          returned_time: timeStr,
          return_method: 'QR_BLOCK_SCAN',
          return_status: returnStatus,
          return_scanned_block: locationParam
        });

        await logAudit(currentUser, 'LEAVE_RETURN_CHECKIN', 'Leave', {
          leave_id: activeLeave.id,
          student: student.full_name,
          matric: student.student_id,
          scanned_location: locationParam,
          return_status: returnStatus,
          timestamp: nowIso
        });
      }

      setConfirmedData({
        timestamp: `${todayStr} (${timeStr})`,
        location: locationParam,
        returnStatus,
        leave: activeLeave
      });

      toast.success(`Daftar masuk kembali berjaya! Selamat pulang ke ${locationParam}.`);
    } catch (err) {
      console.error('Failed to confirm return:', err);
      toast.error('Gagal mengesahkan kehadiran kembali ke kolej');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground mt-3">Mengesahkan data kehadiran...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-5">
      {/* HEADER CARD */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-heading font-bold text-slate-900">
          Daftar Masuk Kembali ke Kolej
        </h1>
        <p className="text-xs text-muted-foreground">
          Kolej Kediaman Tun Fuad &bull; Universiti Malaysia Sabah
        </p>
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {confirmedData ? (
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-sm text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <Badge className="bg-emerald-500 text-white font-bold text-[11px] px-3 py-0.5">
              TELAH KEMBALI KE KOLEJ
            </Badge>
            <h2 className="text-base font-bold text-slate-900 pt-1">
              Selamat Kembali, {student?.full_name || currentUser?.full_name}!
            </h2>
            <p className="text-xs text-slate-500">
              Kehadiran fizikal anda telah disahkan dan direkodkan dalam sistem kolej.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Lokasi Imbasan:</span>
              <span className="font-bold text-slate-900">{confirmedData.location}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Masa Direkodkan:</span>
              <span className="font-mono font-bold text-slate-900">{confirmedData.timestamp}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Ketibaan:</span>
              <Badge variant="outline" className={confirmedData.returnStatus === 'On-Time' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}>
                {confirmedData.returnStatus === 'On-Time' ? 'Tepat Pada Masa' : 'Lewat'}
              </Badge>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link to="/leave">
              <Button className="w-full bg-[#132644] hover:bg-[#1e385f] text-white text-xs font-semibold h-10 rounded-xl">
                Lihat Rekod E-Leave
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full text-xs h-10 rounded-xl">
                Kembali ke Dashboard Utama
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* PENDING VERIFICATION STATE */
        <div className="space-y-4">
          {/* LOCATION ANCHOR CARD */}
          <div className="bg-indigo-950 text-white rounded-2xl p-4 border border-indigo-800 shadow-sm space-y-1">
            <div className="flex items-center gap-2 text-xs text-indigo-300">
              <MapPin className="w-3.5 h-3.5" />
              <span>Lokasi Kod QR Fizikal:</span>
            </div>
            <p className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <Building className="w-4 h-4 text-indigo-400" /> {locationParam}
            </p>
          </div>

          {/* STUDENT IDENTIFICATION CARD */}
          {student && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Identiti Residen</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{student.full_name}</p>
                  <p className="text-xs font-mono text-slate-500">{student.student_id}</p>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 font-mono text-xs">
                  {student.block_name || 'Blok'} - {student.room_number || 'Bilik'}
                </Badge>
              </div>
            </div>
          )}

          {/* ACTIVE LEAVE RECORD IF ANY */}
          {activeLeave ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Rekod Cuti Aktif
                </span>
                <Badge className={activeLeave.return_date < new Date().toLocaleDateString('en-CA') ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-600 text-white'}>
                  {activeLeave.return_date < new Date().toLocaleDateString('en-CA') ? 'OVERDUE' : 'AKTIF'}
                </Badge>
              </div>

              <div className="text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Destinasi:</span>
                  <span className="font-semibold text-slate-900">{activeLeave.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dijadualkan Pulang:</span>
                  <span className="font-semibold text-slate-900">{activeLeave.return_date} ({activeLeave.return_time || '23:00'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sebab:</span>
                  <span className="italic text-slate-600 truncate max-w-[200px]">"{activeLeave.reason}"</span>
                </div>
              </div>

              {activeLeave.return_date < new Date().toLocaleDateString('en-CA') && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Anda lewat daripada tarikh jadual asal. Imbas sekarang untuk menyelesaikan rekod overdue.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-600 space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="font-bold text-slate-900">Tiada Permohonan Cuti Yang Sedang Berjalan</p>
              <p className="text-slate-500">Status anda telah sedia ada sebagai <strong>"Di Dalam Kolej"</strong>.</p>
            </div>
          )}

          {/* CONFIRMATION ACTION BUTTON */}
          <div className="pt-2">
            <Button
              onClick={handleConfirmReturn}
              disabled={confirming}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              {confirming ? 'Merekodkan Kehadiran...' : 'Sahkan Saya Telah Tiba di Kolej'}
            </Button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Masa dan lokasi tepat anda akan direkodkan ke dalam log audit pengurusan KKTF.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
