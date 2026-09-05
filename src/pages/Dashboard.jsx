import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import StudentSetup from '@/pages/StudentSetup';
import StudentCheckInModal from '@/components/dashboard/StudentCheckInModal';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { Badge } from '@/components/ui/badge';
import { fetchActiveJakmasAppointment, computeEffectiveRole } from '@/lib/jakmas';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  MapPin, 
  Users, 
  BedDouble, 
  AlertCircle,
  KeyRound,
  Building2,
  ScanLine
} from "lucide-react";
import WelcomeTour from '@/components/onboarding/WelcomeTour';

const UMS_FACULTIES = [
  'Fakulti Sains dan Sumber Alam (FSSA)',
  'Fakulti Sains Sosial dan Kemanusiaan (FSSK)',
  'Fakulti Psikologi dan Pendidikan (FPP)',
  'Fakulti Komputeran dan Informatik (FKI)',
  'Fakulti Kejuruteraan (FKJ)',
  'Fakulti Perniagaan, Ekonomi dan Perakaunan (FPEP)',
  'Fakulti Perubatan dan Sains Kesihatan (FPSK)',
  'Fakulti Sains Makanan dan Pemakanan (FSMP)',
  'Akademi Seni dan Teknologi Kreatif (ASTiF)',
  'Fakulti Pengajian Islam (FIS)'
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [jakmasAppointment, setJakmasAppointment] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [hasStudentProfile, setHasStudentProfile] = useState(false);
  const [isRoomAssigned, setIsRoomAssigned] = useState(false); 
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // --- Real-Time Statistik State ---
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [pendingRoomCount, setPendingRoomCount] = useState(0);
  const [availableRoomCount, setAvailableRoomCount] = useState(0); 

  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    ic_passport: '',
    gender: 'Male',
    date_of_birth: '',
    phone: '',
    faculty: '',
    programme: '',
    year_of_study: 1,
    parent_name: '',
    parent_phone: '',
    emergency_contact: '',
    vehicle_reg: '',
    block_name: '', 
    room_number: '', 
  });

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Jika jemputan MAPEK masuk kali pertama, terus buka Buku Panduan MyKKTF
        if (user?.isGuestDemo && !sessionStorage.getItem('mapek_has_visited_guide')) {
          sessionStorage.setItem('mapek_has_visited_guide', 'true');
          navigate('/guide', { replace: true });
          return;
        }

        // JAKMAS capability is appointment-derived (mirrors WardenBlock pattern).
        let appt = null;
        if (!user?.role || user?.role === 'student' || user?.role === 'user') {
          appt = await fetchActiveJakmasAppointment(user.id);
        }
        setJakmasAppointment(appt);
        const effectiveRole = computeEffectiveRole(user?.role, appt);

        // --- PENGAMBILAN DATA REAL-TIME ---
        try {
          const allStudents = await base44.entities.Student.filter({});
          const checkedIn = allStudents.filter(s => s.block_name && s.room_number && s.room_status === 'Checked In').length;
          const pendingRoom = allStudents.filter(s => !s.block_name || !s.room_number || s.room_status !== 'Checked In').length;

          const allRooms = await base44.entities.Room.filter({});
          let availableRooms = 0;

          const NON_OPERATIONAL_STATUSES = ['Reserved', 'Maintenance', 'Under Maintenance', 'Not Available'];
          allRooms.forEach(room => {
            if (NON_OPERATIONAL_STATUSES.includes(room.status)) return;
            const currentOccupants = allStudents.filter(s => 
              s.block_name === room.block_name && s.room_number === room.room_number && s.room_status === 'Checked In'
            ).length;
            const roomCapacity = room.capacity || room.max_beds || 2;
            if (currentOccupants < roomCapacity) {
              availableRooms++;
            }
          });

          setCheckedInCount(checkedIn);
          setPendingRoomCount(pendingRoom);
          setAvailableRoomCount(availableRooms);
        } catch (countErr) {
          console.error("Gagal mengira statistik:", countErr);
        }

        // Non-resident roles (warden, staff, admin)
        if (
          effectiveRole === 'warden' ||
          effectiveRole === 'staff' ||
          effectiveRole === 'super_admin' ||
          effectiveRole === 'college_admin' ||
          effectiveRole === 'principal' ||
          user?.role === 'principal' ||
          user?.isGuestDemo
        ) {
          if (user?.id) {
            try {
              const stray = await base44.entities.Student.filter({ user_id: user.id });
              if (stray.length > 0) {
                await base44.entities.Student.deleteMany({ user_id: user.id });
              }
            } catch (e) { /* best-effort cleanup */ }
          }
          setHasStudentProfile(true);
          setIsRoomAssigned(true);
          return;
        }

        // JAKMAS members ARE students
        if (effectiveRole === 'jakmas') {
          setHasStudentProfile(true);
          setIsRoomAssigned(true);
          return;
        }

        let studs = [];
        if (user?.id) {
          studs = await base44.entities.Student.filter({ user_id: user.id });
        }
        if (!studs.length && user?.email) {
          studs = await base44.entities.Student.filter({ email: user.email });
        }
        
        if (studs.length > 0 && studs[0]?.student_id) {
          const s = studs[0];
          setStudentProfile(s);
          setHasStudentProfile(true);

          // PENGESAHAN KETAT (ANTI-BYPASS):
          // Pelajar HANYA dibenarkan masuk ke Dashboard Residen Aktif jika:
          // 1. Status bilik ialah 'Checked In' & status residen ialah 'Active'
          // 2. Blok dan bilik telah ditetapkan
          // 3. Telah melalui imbasan QR fizikal kolej yang sah (qr_verified === true)
          // Jika pelajar belum imbas QR, refresh halaman, atau tekan 'Back', mereka
          // KEKAL disekat di 'Pusat Pengaktifan Residen KKTF' sehingga imbasan QR berjaya!
          const isStrictlyVerified = 
            s.room_status === 'Checked In' && 
            s.resident_status === 'Active' && 
            Boolean(s.block_name && s.room_number) &&
            (s.qr_verified === true);

          setIsRoomAssigned(isStrictlyVerified);
        } else {
          setHasStudentProfile(false);
          setStudentProfile(null);
          setForm(prev => ({
            ...prev,
            full_name: user?.full_name || '',
            email: user?.email || ''
          }));
        }
      } catch (err) {
        console.error("Gagal memuatkan peranan:", err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();
  }, []);

  const updateFormKey = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.student_id.trim() || !form.phone.trim() || !form.parent_name.trim() || !form.parent_phone.trim()) {
      toast({ title: "Maklumat Tidak Lengkap", description: "Sila isi maklumat wajib (*).", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Student.create({ 
        ...form, 
        user_id: currentUser.id,
        email: currentUser.email
      });
      toast({ title: "Profil Berjaya Disimpan" });
      setHasStudentProfile(true);
      setIsRoomAssigned(false);
      setPendingRoomCount(prev => prev + 1);
    } catch (err) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#002147] mx-auto" />
          <p className="text-sm font-medium text-slate-600">Menghubungkan ke Sistem Kediaman UMS...</p>
        </div>
      </div>
    );
  }

  // --- RENDERING KAD METRIK UTAMA (TULISAN & SUSUNAN DIPERTINGKATKAN) ---
  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-8">
      
      {/* Kad 1: Sudah Check-In */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-start justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
        <div className="flex flex-col space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Status Semasa
          </span>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            Sudah Check-In
          </h3>
          <div className="flex items-baseline space-x-1.5 pt-1">
            <span className="text-4xl font-extrabold tracking-tight text-[#002147]">
              {checkedInCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              residen
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-600 flex items-center gap-1 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Aktif mendiami blok
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-blue-50/80 border border-blue-100/50 flex items-center justify-center text-[#002147] shrink-0">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* Kad 2: Belum Tetap Bilik */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-start justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
        <div className="flex flex-col space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Tindakan Segera
          </span>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            Belum Tetap Bilik
          </h3>
          <div className="flex items-baseline space-x-1.5 pt-1">
            <span className="text-4xl font-extrabold tracking-tight text-[#990000]">
              {pendingRoomCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              pelajar
            </span>
          </div>
          <p className="text-xs font-medium text-amber-600 flex items-center gap-1 pt-1">
            ⚠️ Perlu penempatan bilik
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-red-50/80 border border-red-100/50 flex items-center justify-center text-[#990000] shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
      </div>

      {/* Kad 3: Kekosongan Katil */}
      <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-start justify-between transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
        <div className="flex flex-col space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Inventori Bilik
          </span>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            Kekosongan Katil
          </h3>
          <div className="flex items-baseline space-x-1.5 pt-1">
            <span className="text-4xl font-extrabold tracking-tight text-emerald-700">
              {availableRoomCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              slot katil
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1 pt-1">
            🛏️ Sedia untuk diinap
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
          <BedDouble className="w-5 h-5" />
        </div>
      </div>

    </div>
  );

  // ====================================================================
  // 🛡️ UTAMA: SUBSISTEM ROUTING DASHBOARD (STAFF/ADMIN/PRINCIPAL/GUEST)
  // ====================================================================
  const effectiveRole = computeEffectiveRole(currentUser?.role, jakmasAppointment);
  const isExecutiveOrGuest = 
    effectiveRole === 'principal' ||
    effectiveRole === 'super_admin' ||
    effectiveRole === 'college_admin' ||
    effectiveRole === 'staff' ||
    currentUser?.role === 'principal' ||
    Boolean(currentUser?.isGuestDemo);

  const dashboardProps = {
    user: currentUser,
    jakmasAppointment,
    checkedInCount,
    pendingRoomCount,
    availableRoomCount,
    statsComponent: renderStatsCards()
  };

  const tour = <WelcomeTour user={currentUser} role={effectiveRole} />;

  // PENTING: Pengetua, Pentadbir, Staf dan Tetamu Jemputan MAPEK terus ke Executive Dashboard tanpa melalui borang profil pelajar!
  if (isExecutiveOrGuest) {
    return <><AdminDashboard {...dashboardProps} />{tour}</>;
  }

  if (effectiveRole === 'warden') return <><WardenDashboard {...dashboardProps} />{tour}</>;
  if (effectiveRole === 'jakmas') return <><StudentDashboard user={currentUser} jakmasAppointment={jakmasAppointment} />{tour}</>;

  // ====================================================================
  // 🎯 UI PELAJAR DENGAN IMPLEMENTASI LATAR BELAKANG GAMBAR KAMPUS UMS (OPACITY 30%)
  // ====================================================================
  
  // Taktik: Menggunakan kelas pseudo Tailwind 'before:' bersama relative untuk imej pudar yang tidak mengganggu teks.
  const umsBackgroundImageStyle = "relative before:content-[''] before:absolute before:inset-0 before:block before:bg-[url('https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?q=80&w=1200')] before:bg-cover before:bg-center before:opacity-30 before:z-0";

  if (!hasStudentProfile) {
    return <StudentSetup user={currentUser} onComplete={() => window.location.reload()} />;
  }

  if (hasStudentProfile && !isRoomAssigned) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-slate-900 ${umsBackgroundImageStyle}`}>
        <div className="max-w-lg w-full bg-slate-950/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-800 text-center shadow-2xl space-y-6 z-10 text-white animate-in fade-in zoom-in-95">
          
          {/* Header with Logos & Badge */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <InstitutionalDualLogo />
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[10px] font-mono font-bold px-2.5 py-1">
              {studentProfile?.room_status === 'Pending Verification' ? '● MENUNGGU PENGAKTIFAN QR' : '● MENUNGGU KUNCI'}
            </Badge>
          </div>

          {/* Greeting & Identity */}
          <div className="space-y-1.5 pt-1">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-lime-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight pt-2">
              Pusat Pengaktifan Residen KKTF
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">
              Hai <strong className="text-amber-300">{studentProfile?.full_name || currentUser?.full_name}</strong> ({studentProfile?.student_id || 'Pelajar'}), lengkapkan pengesahan di bawah untuk mengaktifkan status residen dan Pas Digital anda.
            </p>
          </div>

          {/* Room Status Box */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-lime-400" /> Penempatan Bilik Kunci:
              </span>
              {studentProfile?.block_name && studentProfile?.room_number ? (
                <Badge className="bg-lime-500/20 text-lime-300 border-lime-400/40 text-[10px]">
                  Ditetapkan
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px]">
                  Belum Ditetapkan
                </Badge>
              )}
            </div>

            {studentProfile?.block_name && studentProfile?.room_number ? (
              <div className="flex items-center justify-between pt-1">
                <p className="text-sm font-bold text-white font-mono">
                  {studentProfile.block_name} &bull; Bilik {studentProfile.room_number}
                </p>
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(true)}
                  className="text-[11px] text-lime-400 hover:text-lime-300 font-bold underline cursor-pointer"
                >
                  Tukar Bilik
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-300/90 font-medium pt-1">
                ⚠️ Sila ambil kunci fizikal di <strong>Kaunter Kunci</strong> untuk mengetahui blok & nombor bilik anda.
              </p>
            )}
          </div>

          {/* Prosedur Pengaktifan Ringkas */}
          <div className="text-left space-y-2.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 text-xs text-slate-300">
            <p className="font-bold text-slate-200 text-[11px] uppercase tracking-wider">3 Langkah Pengaktifan Residen:</p>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">1</span>
              <p>Ambil kunci fizikal di <strong>Kaunter Kunci</strong>.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">2</span>
              <p>Masukkan nombor bilik kunci anda pada sistem.</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-lime-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-700">3</span>
              <p>Imbas <strong>Kod QR Pengaktifan Residen</strong> di kaunter/blok untuk mengaktifkan pas!</p>
            </div>
          </div>

          {/* Main Call to Action Button */}
          <Button 
            onClick={() => setShowCheckInModal(true)}
            className="w-full min-h-12 py-3 px-4 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(132,204,22,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
          >
            {studentProfile?.block_name ? (
              <>
                <ScanLine className="w-4 h-4 shrink-0 text-slate-950" />
                <span>Imbas Kod QR Pengaktifan Residen</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 shrink-0 text-slate-950" />
                <span>Tetapkan Bilik & Aktifkan Residen</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center px-2">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Lokasi: Dewan Serbaguna Kolej Kediaman Tun Fuad (KKTF), UMS</span>
          </div>
        </div>

        {/* Resident Activation Modal */}
        <StudentCheckInModal 
          isOpen={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          student={studentProfile}
          user={currentUser}
          onCheckInSuccess={(updated) => {
            setStudentProfile(prev => ({ ...prev, ...updated }));
            setIsRoomAssigned(true);
            setShowCheckInModal(false);
          }}
        />
      </div>
    );
  }

  if (hasStudentProfile && isRoomAssigned) {
    return <><StudentDashboard user={currentUser} studentProfile={studentProfile} />{tour}</>;
  }

  return <><StudentDashboard user={currentUser} studentProfile={studentProfile} />{tour}</>;
}