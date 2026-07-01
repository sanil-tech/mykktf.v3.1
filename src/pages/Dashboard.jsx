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
import { Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State mengikut keperluan field entiti Student asal anda
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
    block_name: '', // Kekal kosong untuk tugasan Admin kemudian
    room_number: '', // Kekal kosong untuk tugasan Admin kemudian
  });

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Jika staf pengurusan kolej, lepaskan terus ke dashboard masing-masing
        if (user?.role === 'warden' || user?.role === 'jakmas' || user?.role === 'super_admin' || user?.role === 'college_admin') {
          setHasStudentProfile(true);
          setLoading(false);
          return;
        }

        // Semak kewujudan profile secara agresif di entiti Student
        let studs = [];
        if (user?.id) {
          studs = await base44.entities.Student.filter({ user_id: user.id });
        }
        if (!studs.length && user?.email) {
          studs = await base44.entities.Student.filter({ email: user.email });
        }
        
        // Lepas ke dashboard utama pelajar jika data profil student_id sudah sedia wujud
        if (studs.length > 0 && studs[0]?.student_id) {
          setHasStudentProfile(true);
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
      } finaly {
        setLoading(false);
      }
    }
    initDashboard();
  }, []);

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    // Validasi Mandatori (Nama, No. Matrik, No. Telefon, Maklumat Waris)
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
      // Cipta profil pelajar baru dalam pangkalan data
      await base44.entities.Student.create({ 
        ...form, 
        user_id: currentUser.id,
        email: currentUser.email
      });

      toast({ title: "Profil Berjaya Disimpan", description: "Pendaftaran awal selesai. Pentadbir akan menugaskan blok bilik anda tidak lama lagi." });
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
  // 🎯 SKRIN LENGKAPKAN PROFIL BARU (TIADA BLOK & BILIK)
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

            <Button type="