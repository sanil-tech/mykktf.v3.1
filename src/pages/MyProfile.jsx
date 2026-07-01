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

  // States untuk pilihan Blok & Bilik
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Form State
  const [form, setForm] = useState({
    full_name: '',
    student_id: '',
    ic_passport: '',
    gender: 'Male',
    phone: '',
    faculty: '',
    programme: '',
    year_of_study: 1,
    block_name: '',
    block_id: '',
    room_number: '',
    room_id: '',
  });

  useEffect(() => {
    async function initDashboard() {
      try {
        setLoading(true);
        const user = await base44.auth.me();
        setCurrentUser(user);

        // Langkau sekatan jika pengguna ialah Warden, Jakmas atau Admin tegar
        if (user?.role === 'warden' || user?.role === 'jakmas' || user?.role === 'super_admin' || user?.role === 'college_admin') {
          setHasStudentProfile(true); // Benarkan mereka lepas terus ke dashboard masing-masing
          setLoading(false);
          return;
        }

        // Cari profil pelajar dalam entiti Student secara agresif
        let studs = [];
        if (user?.id) {
          studs = await base44.entities.Student.filter({ user_id: user.id });
        }
        if (!studs.length && user?.email) {
          studs = await base44.entities.Student.filter({ email: user.email });
        }
        
        // Memastikan rekod yang dijumpai mempunyai data sah (bukan rekod kosong)
        if (studs.length > 0 && studs[0]?.student_id) {
          setHasStudentProfile(true);
        } else {
          setHasStudentProfile(false);
          // Ambil data blok & bilik daripada pangkalan data
          const [b, r] = await Promise.all([
            base44.entities.Block.list().catch(() => []),
            base44.entities.Room.list().catch(() => []),
          ]);
          setBlocks(b);
          setRooms(r);
          
          setForm(prev => ({
            ...prev,
            full_name: user?.full_name || '',
            email: user?.email || ''
          }));
        }
      } catch (err) {
        console.error("Gagal memuatkan sistem dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    initDashboard();
  }, []);

  const handleCompleteProfile = async (e) => {
    e.preventDefault();
    
    if (!form.full_name.trim() || !form.student_id.trim() || !form.phone.trim() || !form.block_id || !form.room_id) {
      toast({ title: "Maklumat Tidak Lengkap", description: "Sila isikan Nama, No. Matrik, No. Telefon serta pilihan Blok & Bilik.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Cipta rekod Student baru
      await base44.entities.Student.create({ 
        ...form, 
        user_id: currentUser.id,
        email: currentUser.email
      });

      // 2. Kemaskini jumlah occupancy bilik
      const selectedRoom = rooms.find(r => r.id === form.room_id);
      if (selectedRoom) {
        const newOcc = (selectedRoom.current_occupancy || 0) + 1;
        const newStatus = newOcc >= selectedRoom.capacity ? 'Full' : 'Occupied';
        await base44.entities.Room.update(form.room_id, { current_occupancy: newOcc, status: newStatus });
      }

      toast({ title: "Pendaftaran Berjaya", description: "Profil kediaman anda telah diaktifkan!" });
      window.location.reload(); 
    } catch (err) {
      toast({ title: "Gagal Mendaftar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuatkan peranan portal...</p>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🎯 VERIFIKASI UTAMA: JIKA TIADA PROFIL STUDENT, PAKSA ISI BORANG INI
  // ====================================================================
  if (!hasStudentProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-xl w-full space-y-6 bg-card p-8 rounded-xl border shadow-sm my-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Pendaftaran Kediaman (KKMS) 👋</h1>
            <p className="text-muted-foreground text-sm">
              Akaun anda dikesan belum mempunyai rekod bilik. Sila sahkan profil pelajar anda untuk mengaktifkan dashboard utama.
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
                  <Label className="text-xs">No. Matrik / ID Pelajar *</Label>
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

            {/* Bahagian 3: Pilihan Bilik */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">Kemasukan Bilik Kolej *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Blok Kediaman</Label>
                  <Select value={form.block_name} onValueChange={v => {
                    const block = blocks.find(b => b.block_name === v);
                    setForm({ ...form, block_name: v, block_id: block?.id || '', room_number: '', room_id: '' });
                  }} disabled={submitting}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Pilih Blok" /></SelectTrigger>
                    <SelectContent>
                      {blocks.map(b => <SelectItem key={b.id} value={b.block_name}>{b.block_name} ({b.gender_restriction})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Nombor Bilik</Label>
                  <Select value={form.room_number} onValueChange={v => {
                    const room = rooms.find(r => r.room_number === v && r.block_name === form.block_name);
                    setForm({ ...form, room_number: v, room_id: room?.id || '' });
                  }} disabled={!form.block_name || submitting}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Pilih Bilik" /></SelectTrigger>
                    <SelectContent>
                      {rooms.filter(r => r.block_name === form.block_name && r.status !== 'Maintenance').map(r => (
                        <SelectItem key={r.id} value={r.room_number}>{r.room_number} ({r.room_type}, {r.current_occupancy}/{r.capacity})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 mt-4" disabled={submitting}>
              {submitting ? "Mengaktifkan Akaun Pelajar..." : "Sahkan Profil & Ambil Bilik"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🛡️ DASHBOARD PERANAN UTAMA (Hanya jika profil Student wujud / Staff Sah)
  // ====================================================================
  if (currentUser?.role === 'warden') return <WardenDashboard user={currentUser} />;
  if (currentUser?.role === 'jakmas') return <JakmasDashboard user={currentUser} />;
  if (currentUser?.role === 'student') return <StudentDashboard user={currentUser} />;
  
  // Jika tiada role sepadan tetapi ia lepas sekatan profil di atas, paparkan AdminDashboard
  return <AdminDashboard user={currentUser} />;
}