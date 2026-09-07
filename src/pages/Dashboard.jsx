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
import PostCheckOutDashboard from '@/components/dashboard/PostCheckOutDashboard';
import SurveyModal from '@/components/SurveyModal';
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
  const [isStudentCheckedOut, setIsStudentCheckedOut] = useState(false);
  const [checkoutRecord, setCheckoutRecord] = useState(null);
  const [surveyRecord, setSurveyRecord] = useState(null);
  const [hasCompletedSurvey, setHasCompletedSurvey] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
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
    let isMounted = true;
    // Safety timer: ensure loading is turned off even on slow networks / hanging requests
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 4500);

    async function initDashboard() {
      try {
        setLoading(true);
        const user = await base44.auth.me().catch(() => null);
        if (!isMounted) return;
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
          appt = await fetchActiveJakmasAppointment(user?.id).catch(() => null);
        }
        if (!isMounted) return;
        setJakmasAppointment(appt);
        const effectiveRole = computeEffectiveRole(user?.role, appt);

        const isStaffOrAdmin = 
          effectiveRole === 'warden' ||
          effectiveRole === 'staff' ||
          effectiveRole === 'super_admin' ||
          effectiveRole === 'college_admin' ||
          effectiveRole === 'principal' ||
          user?.role === 'principal' ||
          Boolean(user?.isGuestDemo);

        // --- PENGAMBILAN DATA REAL-TIME (HANYA UNTUK PENTADBIR/FELO) ---
        // Pelajar biasa TIDAK memerlukan allStudents & allRooms; elakkan RLS bottleneck & loading tersekat
        if (isStaffOrAdmin) {
          try {
            const [allStudentsRes, allRoomsRes] = await Promise.all([
              base44.entities.Student.filter({}).catch(() => []),
              base44.entities.Room.filter({}).catch(() => [])
            ]);
            const allStudents = Array.isArray(allStudentsRes) ? allStudentsRes : [];
            const allRooms = Array.isArray(allRoomsRes) ? allRoomsRes : [];

            const checkedIn = allStudents.filter(s => s.block_name && s.room_number && s.room_status === 'Checked In').length;
            const pendingRoom = allStudents.filter(s => !s.block_name || !s.room_number || s.room_status !== 'Checked In').length;

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

            if (isMounted) {
              setCheckedInCount(checkedIn);
              setPendingRoomCount(pendingRoom);
              setAvailableRoomCount(availableRooms);
            }
          } catch (countErr) {
            console.warn("Gagal mengira statistik pentadbir:", countErr);
          }

          if (user?.id) {
            try {
              const stray = await base44.entities.Student.filter({ user_id: user.id }).catch(() => []);
              if (stray.length > 0) {
                await base44.entities.Student.deleteMany({ user_id: user.id }).catch(() => {});
              }
            } catch (e) { /* best-effort cleanup */ }
          }
          if (isMounted) {
            setHasStudentProfile(true);
            setIsRoomAssigned(true);
          }
          return;
        }

        // JAKMAS members ARE students
        if (effectiveRole === 'jakmas') {
          if (isMounted) {
            setHasStudentProfile(true);
            setIsRoomAssigned(true);
          }
          return;
        }

        // --- CARIAN PROFIL PELAJAR (MULTI-STRATEGI TEGUH) ---
        let studs = [];
        if (user?.id) {
          try {
            studs = await base44.entities.Student.filter({ user_id: user.id });
          } catch (e) {
            studs = [];
          }
        }
        if (!studs.length && user?.email) {
          const cleanEmail = user.email.trim();
          try {
            studs = await base44.entities.Student.filter({ email: cleanEmail });
          } catch (e) {
            studs = [];
          }
          // Jika huruf besar/kecil berbeza, cuba versi huruf kecil
          if (!studs.length && cleanEmail.toLowerCase() !== cleanEmail) {
            try {
              studs = await base44.entities.Student.filter({ email: cleanEmail.toLowerCase() });
            } catch (e) {
              studs = [];
            }
          }
        }

        // Fallback 1: Ambil senarai Student (akses pengguna) dan padankan dalam JS (case-insensitive & nama penuh)
        if (!studs.length) {
          try {
            const listStudents = await base44.entities.Student.list().catch(() => []);
            if (Array.isArray(listStudents) && listStudents.length > 0) {
              const userEmailClean = (user?.email || '').trim().toLowerCase();
              const userNameClean = (user?.full_name || '').trim().toLowerCase();
              studs = listStudents.filter(s => 
                (user?.id && s.user_id === user.id) || 
                (userEmailClean && (s.email || '').trim().toLowerCase() === userEmailClean) ||
                (userNameClean && (s.full_name || '').trim().toLowerCase() === userNameClean)
              );
            }
          } catch (e) {
            studs = [];
          }
        }

        // Fallback 2: Cuba Student.filter({}) jika list() tidak memulangkan rekod
        if (!studs.length) {
          try {
            const allStudentsFallback = await base44.entities.Student.filter({}).catch(() => []);
            if (Array.isArray(allStudentsFallback) && allStudentsFallback.length > 0) {
              const userEmailClean = (user?.email || '').trim().toLowerCase();
              const userNameClean = (user?.full_name || '').trim().toLowerCase();
              studs = allStudentsFallback.filter(s => 
                (user?.id && s.user_id === user.id) || 
                (userEmailClean && (s.email || '').trim().toLowerCase() === userEmailClean) ||
                (userNameClean && (s.full_name || '').trim().toLowerCase() === userNameClean)
              );
            }
          } catch (e) {
            studs = [];
          }
        }
        
        if (studs.length > 0 && (studs[0]?.student_id || studs[0]?.id)) {
          // Cari rekod yang sudah disahkan atau rekod terkini
          const s = studs.find(st => 
            (st.qr_verified === true || st.qr_verified === 'true' || st.qr_verified === 1 || st.qr_verified === '1') &&
            String(st.room_status || '').trim().toLowerCase() === 'checked in'
          ) || studs[0];

          // Auto-link user_id ke akaun pengguna semasa jika belum terhubung
          if (s && user?.id && (!s.user_id || s.user_id !== user.id)) {
            s.user_id = user.id;
            base44.entities.Student.update(s.id, { user_id: user.id }).catch(() => {});
          }

          if (!isMounted) return;
          setStudentProfile(s);
          setHasStudentProfile(true);

          // PENGESAHAN STATUS RESIDEN (PINTU UTAMA - IMBASAN QR WAJIB):
          const hasRoom = Boolean(s.block_name && s.room_number);
          const isQrVerified = Boolean(
            s.qr_verified === true || 
            s.qr_verified === 'true' || 
            s.qr_verified === 1 || 
            s.qr_verified === '1'
          );
          const isRoomCheckedIn = String(s.room_status || '').trim().toLowerCase() === 'checked in';
          const isPending = String(s.room_status || '').trim().toLowerCase() === 'pending verification' ||
                            String(s.room_status || '').trim().toLowerCase() === 'pending key';

          const isStrictlyVerified = hasRoom && isQrVerified && isRoomCheckedIn && !isPending;

          // Semak checkout dan survey secara selari (non-blocking)
          let latestCheckout = null;
          let latestSurvey = null;
          try {
            const [checkoutsRes, surveysRes] = await Promise.all([
              s.student_id ? base44.entities.CheckOut.filter({ student_id: s.student_id }, '-check_out_date').catch(() => []) : Promise.resolve([]),
              s.student_id ? base44.entities.Survey.filter({ student_id: s.student_id }, '-created_date').catch(() => []) : Promise.resolve([])
            ]);
            if (Array.isArray(checkoutsRes) && checkoutsRes.length > 0) {
              latestCheckout = checkoutsRes[0];
            }
            if (Array.isArray(surveysRes) && surveysRes.length > 0) {
              latestSurvey = surveysRes[0];
            }
          } catch (chkErr) {
            console.warn('Gagal memuat turun rekod checkout/survey:', chkErr);
          }

          if (!latestCheckout) {
            try {
              const rawDropKeys = localStorage.getItem('kktf_drop_key_requests');
              if (rawDropKeys) {
                const parsed = JSON.parse(rawDropKeys);
                const myReq = parsed.find(r => 
                  (r.student_matric === s.student_id || r.student_id === s.id) &&
                  r.status === 'approved'
                );
                if (myReq) {
                  latestCheckout = {
                    student_id: s.student_id,
                    student_name: s.full_name,
                    block_name: myReq.block_name,
                    room_number: myReq.room_number,
                    check_out_date: myReq.checkout_date,
                    check_out_time: myReq.checkout_time,
                    status: 'approved'
                  };
                }
              }
            } catch (e) {}
          }

          if (!isMounted) return;
          setCheckoutRecord(latestCheckout);
          setSurveyRecord(latestSurvey);
          setHasCompletedSurvey(Boolean(latestSurvey));

          const studentCheckedOut = String(s.room_status || '').trim().toLowerCase() === 'checked out' ||
            (Boolean(latestCheckout) && !isStrictlyVerified);

          setIsStudentCheckedOut(studentCheckedOut);

          // Selaraskan status di database jika sudah sah melalui imbasan QR
          if (isStrictlyVerified) {
            const isResidentActive = String(s.resident_status || '').trim().toLowerCase() === 'active';
            const isStatusActive = String(s.status || '').trim().toLowerCase() === 'active';
            
            if (!isResidentActive || !isStatusActive || !s.user_id) {
              s.resident_status = 'Active';
              s.status = 'Active';
              if (user?.id) s.user_id = user.id;
              base44.entities.Student.update(s.id, {
                resident_status: 'Active',
                status: 'Active',
                user_id: s.user_id || user?.id || ''
              }).catch(e => console.warn('Sync verified status error:', e));
            }

            // Pastikan peranan auth dan user sentiasa 'student'
            if (user?.role !== 'student') {
              base44.auth.updateMe({ role: 'student' }).catch(() => {});
              if (user?.id) {
                base44.entities.User.update(user.id, { role: 'student' }).catch(() => {});
              }
            }
          } else if (!studentCheckedOut) {
            // Jika belum disahkan (dan bukan checkout) tetapi datang dari prapendaftaran/setup,
            // automatik buka popup pengimbas QR pintu utama untuk kemudahan pelajar
            if (sessionStorage.getItem('open_resident_qr_modal') === 'true') {
              sessionStorage.removeItem('open_resident_qr_modal');
              setShowCheckInModal(true);
            }
          }

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
        if (safetyTimer) clearTimeout(safetyTimer);
        if (isMounted) setLoading(false);
      }
    }

    initDashboard();

    const handleGlobalRefresh = () => {
      initDashboard();
    };

    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    window.addEventListener('DROP_KEY_UPDATED', handleGlobalRefresh);
    return () => {
      isMounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
      window.removeEventListener('DROP_KEY_UPDATED', handleGlobalRefresh);
    };
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
      const pPhone = form.parent_phone || form.emergency_contact || '';
      await base44.entities.Student.create({ 
        ...form, 
        parent_phone: pPhone,
        emergency_contact: pPhone,
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

  // ====================================================================
  // 🎓 JIKA PELAJAR TELAH CHECK-OUT (PASCA CHECK-OUT & PERALIHAN SEMESTER)
  // ====================================================================
  // Mengelakkan paparan kembali kepada 'Pusat Pengaktifan Residen' yang mengelirukan!
  // Memaparkan Hub Maklum Balas Kajian Kepuasan Pelajar dan Portal Kemasukan Semula Sem 2.
  if (hasStudentProfile && isStudentCheckedOut && !isRoomAssigned) {
    return (
      <>
        <PostCheckOutDashboard
          user={currentUser}
          student={studentProfile}
          checkoutRecord={checkoutRecord}
          surveyRecord={surveyRecord}
          hasCompletedSurvey={hasCompletedSurvey}
          onOpenSurvey={() => setShowSurveyModal(true)}
          onOpenCheckInSem2={() => setShowCheckInModal(true)}
        />
        <SurveyModal
          open={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          onComplete={async () => {
            setHasCompletedSurvey(true);
            setShowSurveyModal(false);
            try {
              const updatedSurv = await base44.entities.Survey.filter({ student_id: studentProfile?.student_id }, '-created_date');
              if (updatedSurv?.length > 0) setSurveyRecord(updatedSurv[0]);
            } catch (e) {}
          }}
          user={currentUser}
          student={studentProfile}
          checkoutId={checkoutRecord?.id || ''}
        />
        <StudentCheckInModal 
          isOpen={showCheckInModal}
          onClose={() => setShowCheckInModal(false)}
          student={studentProfile}
          user={currentUser}
          onCheckInSuccess={(updated) => {
            setStudentProfile(prev => ({ ...prev, ...updated }));
            setIsRoomAssigned(true);
            setIsStudentCheckedOut(false);
            setShowCheckInModal(false);
          }}
        />
        {tour}
      </>
    );
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