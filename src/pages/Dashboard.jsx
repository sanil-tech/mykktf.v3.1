import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import JakmasDashboard from '@/components/dashboard/JakmasDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ClipboardCheck, MapPin, Info, ArrowRight } from "lucide-react";

const UMS_FACULTIES = [
  'Faculty of Business, Economics and Accountancy (FPEP)',
  'Faculty of Computing and Informatics (FKI)',
  'Faculty of Engineering (FKJ)',
  'Faculty of Food, Agriculture and Bioresources (FPPK)',
  'Faculty of Humanities, Arts and Heritage (FKSW)',
  'Faculty of Law (FU)',
  'Faculty of Medicine and Health Sciences (FPSK)',
  'Faculty of Psychology and Education (FPP)',
  'Faculty of Science and Natural Resources (FSSA)',
  'Faculty of Social Sciences and Liberal Arts (FOSSLA)',
  'Faculty of Sustainable Agriculture (FPL)',
  'School of Engineering and Information Technology (SEEIT)',
  'School of International Tropical Forestry (SITF)',
  'Other',
];

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [hasStudentProfile, setHasStudentProfile] = useState(false);
  const [isRoomAssigned, setIsRoomAssigned] = useState(false); // State baharu untuk semak bilik
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

        // Jika staf pengurusan kolej, lepaskan terus ke dashboard masing-masing
        if (
          user?.role === 'warden' || 
          user?.role === 'jakmas' || 
          user?.role === 'super_admin' || 
          user?.role === 'college_admin'
        ) {
          setHasStudentProfile(true);
          setIsRoomAssigned(true); // Lepas sekatan bilik untuk admin/warden
          return;
        }

        // Semak kewujudan profile di entiti Student
        let studs = [];
        if (user?.id) {
          studs = await base44.entities.Student.filter({ user_id: user.id });
        }
        if (!studs.length && user?.email) {
          studs = await base44.entities.Student.filter({ email: user.email });
        }
        
        if (studs.length > 0 && studs[0]?.student_id) {
          setHasStudentProfile(true);
          
          // Sahkan sama ada Admin sudah assign Blok & Bilik atau belum
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

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    if (!form.full_name.trim() || !form.student_id.trim() || !form.phone.trim() || !form.parent_name.trim() || !form.parent_phone.trim()) {
      toast({ 
        title: "Maklumat Tidak Lengkap", 
        description: "Sila isi sekurang-kurangnya Nama Penuh, No. Matrik, No. Telefon Pelajar, serta Nama & Telefon Ibu Bapa/Penjaga.", 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Student.create({ 
        ...form, 
        user_id: currentUser.id,
        email: currentUser.email
      });

      toast({ title: "Profil Berjaya Disimpan", description: "Sila rujuk arahan check-in di skrin anda." });
      window.location.reload(); 
    } catch (err) {
      toast({ title: "Gagal Mengaktifkan Profil", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Mengesahkan sesi kediaman...</p>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🎯 SKRIN 1: LENGKAPKAN PROFIL BARU (TIADA BLOK & BILIK)
  // ====================================================================
  if (!hasStudentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-xl w-full space-y-6 bg-card p-8 rounded-xl border shadow-sm my-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Profil Pelajar Baru 👋</h1>
            <p className="text-muted-foreground text-sm">
              Sila isikan maklumat peribadi, akademik, dan kecemasan anda di bawah untuk mengaktifkan akaun portal KKMS.
            </p>
          </div>

          <form onSubmit={handleCompleteProfile} className="space-y-4">
            {/* Bahagian 1: Profil Peribadi */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">Maklumat Peribadi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nama Penuh *</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">No. Matrik Pelajar *</Label>
                  <Input placeholder="Contoh: BI21110043" value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">No. IC / Pasport</Label>
                  <Input value={form.ic_passport} onChange={e => setForm({ ...form, ic_passport: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">No. Telefon Bimbit *</Label>
                  <Input placeholder="Contoh: 0123456789" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">Jantina</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })} disabled={submitting}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tarikh Lahir</Label>
                  <Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
              </div>
            </div>

            {/* Bahagian 2: Akademik */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">Maklumat Akademik</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Fakulti</Label>
                  <Select value={form.faculty} onValueChange={v => setForm({ ...form, faculty: v })} disabled={submitting}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Pilih Fakulti" /></SelectTrigger>
                    <SelectContent>
                      {UMS_FACULTIES.map(fc => <SelectItem key={fc} value={fc}>{fc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Program Pengajian</Label>
                    <Input placeholder="Contoh: Sains Komputer" value={form.programme} onChange={e => setForm({ ...form, programme: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                  </div>
                  <div>
                    <Label className="text-xs">Tahun Pengajian</Label>
                    <Select value={String(form.year_of_study)} onValueChange={v => setForm({ ...form, year_of_study: Number(v) })} disabled={submitting}>
                      <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bahagian 3: Waris & Kecemasan */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">Maklumat Kecemasan & Kenderaan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nama Ibu Bapa / Penjaga *</Label>
                  <Input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">No. Telefon Ibu Bapa / Penjaga *</Label>
                  <Input placeholder="Contoh: 0134567890" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">Hubungan / Kontak Kecemasan Lain</Label>
                  <Input placeholder="Contoh: Pakcik / Kakak" value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
                <div>
                  <Label className="text-xs">No. Pendaftaran Kenderaan (Jika Ada)</Label>
                  <Input placeholder="Contoh: SAB 1234 X (Optional)" value={form.vehicle_reg} onChange={e => setForm({ ...form, vehicle_reg: e.target.value })} className="h-9 mt-1" disabled={submitting} />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-4" disabled={submitting}>
              {submitting ? "Menghantar Profil Pelajar..." : "Sahkan Profil & Daftar Akaun"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🎯 SKRIN 2: HALAMAN ARAHAN CHECK-IN (JIKA PROFIL WUJUD, TAPI TIADA BILIK)
  // ====================================================================
  if (hasStudentProfile && !isRoomAssigned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-6 bg-card p-8 rounded-xl border shadow-md">
          
          {/* Ikon Header */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <ClipboardCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Pendaftaran Profil Berjaya! 🎉</h1>
            <p className="text-sm text-muted-foreground">
              Akaun anda telah diaktifkan, namun penempatan blok & bilik kolej anda masih belum ditentukan.
            </p>
          </div>

          <hr />

          {/* Kotak Panduan Langkah */}
          <div className="text-left space-y-4 bg-muted/50 p-4 rounded-lg border">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary" /> Langkah Seterusnya Sila:
            </h3>

            <div className="flex gap-3 items-start text-sm">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">1</div>
              <p className="text-foreground">Sila hadir ke <strong>Pejabat Pentadbiran Kolej Kediaman (KKMS)</strong> atau kaunter meja pendaftaran utama.</p>
            </div>

            <div className="flex gap-3 items-start text-sm">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">2</div>
              <p className="text-foreground">Maklumkan <strong>Nama Penuh</strong> atau <strong>No. Matrik</strong> anda kepada pegawai yang bertugas untuk semakan.</p>
            </div>

            <div className="flex gap-3 items-start text-sm">
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">3</div>
              <p className="text-foreground">Pegawai pentadbir akan memberikan kunci fizikal dan mengemas kini nombor blok/bilik anda ke dalam sistem ini secara langsung.</p>
            </div>
          </div>

          {/* Lokasi Pejabat */}
          <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 p-3 rounded-lg text-left text-sm text-primary">
            <MapPin className="w-5 h-5 shrink-0" />
            <p><strong>Lokasi:</strong> Kaunter Utama Pentadbiran Kompleks Kolej Kediaman Mustapha Som (KKMS), UMS.</p>
          </div>

          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="w-full h-10 text-xs text-muted-foreground"
          >
            Semak Semula Status Penempatan Bilik
          </Button>

        </div>
      </div>
    );
  }

  // ====================================================================
  // 🛡️ UTAMA: SUBSISTEM ROUTING DASHBOARD ASAL (DIPERBAIKI & ADA BILIK)
  // ====================================================================
  if (currentUser?.role === 'warden') return <WardenDashboard user={currentUser} />;
  if (currentUser?.role === 'jakmas') return <JakmasDashboard user={currentUser} />;
  if (currentUser?.role === 'super_admin' || currentUser?.role === 'college_admin') {
    return <AdminDashboard user={currentUser} />;
  }
  
  // Jika profil Student wujud, DAN bilik sudah di-assign oleh Admin, tunjuk StudentDashboard
  if (hasStudentProfile && isRoomAssigned) {
    return <StudentDashboard user={currentUser} />;
  }
  
  return <AdminDashboard user={currentUser} />;
}