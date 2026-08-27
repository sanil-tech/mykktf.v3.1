import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import { fetchActiveJakmasAppointment, computeEffectiveRole } from '@/lib/jakmas';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, MapPin, Info, Users, BedDouble, AlertCircle } from "lucide-react";
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
  const [currentUser, setCurrentUser] = useState(null);
  const [jakmasAppointment, setJakmasAppointment] = useState(null);
  const [hasStudentProfile, setHasStudentProfile] = useState(false);
  const [isRoomAssigned, setIsRoomAssigned] = useState(false); 
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
          const checkedIn = allStudents.filter(s => s.block_name && s.room_number).length;
          const pendingRoom = allStudents.filter(s => !s.block_name || !s.room_number).length;

          const allRooms = await base44.entities.Room.filter({});
          let availableRooms = 0;

          // Hanya bilik OPERATIONAL (Available / Occupied) dikira sebagai kosong.
          // Bilik Reserved, Maintenance & Not Available dikecualikan daripada
          // jumlah kapasiti sebenar yang sedia untuk diinap.
          const NON_OPERATIONAL_STATUSES = ['Reserved', 'Maintenance', 'Under Maintenance', 'Not Available'];
          allRooms.forEach(room => {
            if (NON_OPERATIONAL_STATUSES.includes(room.status)) return;
            const currentOccupants = allStudents.filter(s => 
              s.block_name === room.block_name && s.room_number === room.room_number
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

        // Non-resident roles (warden, staff, admin) must never be recorded or
        // counted as students. Remove any stray Student record linked to their
        // account so they don't appear in the student list / directory.
        if (
          effectiveRole === 'warden' ||
          effectiveRole === 'staff' ||
          effectiveRole === 'super_admin' ||
          effectiveRole === 'college_admin'
        ) {
          if (user?.id) {
            try {
              const stray = await base44.entities.Student.filter({ user_id: user.id });
              if (stray.length > 0) {
                await base44.entities.Student.deleteMany({ user_id: user.id });
              }
            } catch (e) { /* best-effort cleanup, must not block login */ }
          }
          setHasStudentProfile(true);
          setIsRoomAssigned(true);
          return;
        }

        // JAKMAS members ARE students — keep their Student record; skip onboarding.
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
          setHasStudentProfile(true);
          if (studs[0]?.block_name && studs[0]?.room_number) {
            setIsRoomAssigned(true);
          } else {
            setIsRoomAssigned(false);
          }
        } else {
          setHasStudentProfile(false);
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
  // 🎯 UI DENGAN IMPLEMENTASI LATAR BELAKANG GAMBAR KAMPUS UMS (OPACITY 30%)
  // ====================================================================
  
  // Taktik: Menggunakan kelas pseudo Tailwind 'before:' bersama relative untuk imej pudar yang tidak mengganggu teks.
  const umsBackgroundImageStyle = "relative before:content-[''] before:absolute before:inset-0 before:block before:bg-[url('https://images.unsplash.com/photo-1605538032432-a9f0c8d9baac?q=80&w=1200')] before:bg-cover before:bg-center before:opacity-30 before:z-0";

  if (!hasStudentProfile) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 ${umsBackgroundImageStyle}`}>
        <div className="max-w-xl w-full space-y-6 bg-white/95 backdrop-blur-md p-8 rounded-xl border border-slate-200 shadow-xl my-8 z-10">
          <div className="text-center space-y-2">
            <div className="inline-flex p-2 bg-blue-50 rounded-full text-[#002147] mb-1">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#002147] tracking-tight">Profil Pelajar Baru 👋</h1>
            <p className="text-slate-500 text-sm">
              Sila isikan maklumat lengkap di bawah untuk mengaktifkan portal kediaman KKTF UMS.
            </p>
          </div>

          <form onSubmit={handleCompleteProfile} className="space-y-5">
            {/* Maklumat Peribadi */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#002147] uppercase tracking-wider border-b border-slate-100 pb-1.5">Maklumat Peribadi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs text-slate-600">Nama Penuh *</Label>
                  <Input value={form.full_name} onChange={e => updateFormKey('full_name', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">No. Matrik Pelajar *</Label>
                  <Input placeholder="Contoh: BI21110043" value={form.student_id} onChange={e => updateFormKey('student_id', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">No. IC / Pasport</Label>
                  <Input value={form.ic_passport} onChange={e => updateFormKey('ic_passport', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">No. Telefon Bimbit *</Label>
                  <Input placeholder="Contoh: 0123456789" value={form.phone} onChange={e => updateFormKey('phone', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Jantina</Label>
                  <Select value={form.gender} onValueChange={v => updateFormKey('gender', v)} disabled={submitting}>
                    <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Tarikh Lahir</Label>
                  <Input type="date" value={form.date_of_birth} onChange={e => updateFormKey('date_of_birth', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
              </div>
            </div>

            {/* Maklumat Akademik */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#002147] uppercase tracking-wider border-b border-slate-100 pb-1.5">Maklumat Akademik</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-600">Fakulti</Label>
                  <Select value={form.faculty} onValueChange={v => updateFormKey('faculty', v)} disabled={submitting}>
                    <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Pilih Fakulti" /></SelectTrigger>
                    <SelectContent>
                      {UMS_FACULTIES.map(fc => <SelectItem key={fc} value={fc}>{fc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <Label className="text-xs text-slate-600">Program Pengajian</Label>
                    <Input placeholder="Contoh: Sains Komputer" value={form.programme} onChange={e => updateFormKey('programme', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Tahun Pengajian</Label>
                    <Select value={String(form.year_of_study)} onValueChange={v => updateFormKey('year_of_study', Number(v))} disabled={submitting}>
                      <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Maklumat Waris & Kecemasan */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-[#002147] uppercase tracking-wider border-b border-slate-100 pb-1.5">Maklumat Kecemasan & Kenderaan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs text-slate-600">Nama Ibu Bapa / Penjaga *</Label>
                  <Input value={form.parent_name} onChange={e => updateFormKey('parent_name', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">No. Telefon Ibu Bapa / Penjaga *</Label>
                  <Input placeholder="Contoh: 0134567890" value={form.parent_phone} onChange={e => updateFormKey('parent_phone', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Hubungan Kontak Kecemasan Lain</Label>
                  <Input placeholder="Contoh: Pakcik / Kakak" value={form.emergency_contact} onChange={e => updateFormKey('emergency_contact', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">No. Pendaftaran Kenderaan</Label>
                  <Input placeholder="Contoh: SAB 1234 X" value={form.vehicle_reg} onChange={e => updateFormKey('vehicle_reg', e.target.value)} className="h-10 mt-1" disabled={submitting} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 bg-[#002147] hover:bg-[#001833] text-white font-medium rounded-lg mt-2 transition-colors shadow-sm" disabled={submitting}>
              {submitting ? "Menghantar Profil Pelajar..." : "Sahkan Profil & Daftar Akaun"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (hasStudentProfile && !isRoomAssigned) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 ${umsBackgroundImageStyle}`}>
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md p-8 rounded-xl border border-slate-200 text-center shadow-xl space-y-6 z-10">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
            <ClipboardCheck className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#002147] tracking-tight">Tahniah! Pendaftaran Profil Berjaya! 🎉</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Akaun anda telah aktif, namun penempatan blok & bilik kolej anda masih belum dikemas kini oleh pentadbir.
            </p>
          </div>

          <div className="text-left space-y-3.5 bg-slate-50/80 p-5 rounded-xl border border-slate-100">
            <h3 className="text-xs font-bold text-[#002147] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" /> Langkah Seterusnya:
            </h3>

            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p>Hadir ke <strong>Pejabat Pentadbiran Kolej Kediaman Tun Fuad (KKTF)</strong>.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p>Kemukakan <strong>No. Matrik</strong> anda kepada pegawai bertugas untuk semakan.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="w-5 h-5 rounded-full bg-[#002147] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p>Pegawai akan menyerahkan kunci fizikal dan mengemas kini bilik anda secara langsung ke dalam portal.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-blue-50/80 border border-blue-100 p-3.5 rounded-lg text-left text-sm text-[#002147]">
            <MapPin className="w-5 h-5 shrink-0 text-[#990000]" />
            <p className="text-xs leading-normal"><strong>Lokasi:</strong> Kaunter Utama Pentadbiran KKTF, Kompleks Kediaman UMS.</p>
          </div>

          <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-10 text-xs text-slate-500 font-medium hover:bg-slate-50 border-slate-200">
            Semak Semula Status Bilik
          </Button>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🛡️ UTAMA: SUBSISTEM ROUTING DASHBOARD (STAFF/ADMIN)
  // ====================================================================
  const effectiveRole = computeEffectiveRole(currentUser?.role, jakmasAppointment);
  const dashboardProps = {
    user: currentUser,
    jakmasAppointment,
    checkedInCount,
    pendingRoomCount,
    availableRoomCount,
    statsComponent: renderStatsCards()
  };

  const tour = <WelcomeTour user={currentUser} role={effectiveRole} />;

  if (effectiveRole === 'warden') return <><WardenDashboard {...dashboardProps} />{tour}</>;
  if (effectiveRole === 'jakmas') return <><StudentDashboard user={currentUser} jakmasAppointment={jakmasAppointment} />{tour}</>;
  if (
    effectiveRole === 'super_admin' ||
    effectiveRole === 'college_admin' ||
    effectiveRole === 'staff'
  ) {
    return <><AdminDashboard {...dashboardProps} />{tour}</>;
  }

  if (hasStudentProfile && isRoomAssigned) {
    return <><StudentDashboard user={currentUser} />{tour}</>;
  }

  return <><AdminDashboard {...dashboardProps} />{tour}</>;
}