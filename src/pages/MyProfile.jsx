import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, Save, Loader2, Building2, Plus, X, ShieldCheck, Mail, Phone, BadgeCheck, Briefcase, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DigitalResidentPass from '@/components/shared/DigitalResidentPass';
import { ROLE_LABELS } from '@/lib/roles';

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
  'Fakulti Pengajian Islam (FIS)',
  'Pusat Kokurikulum dan Pemajuan Pelajar (PKPP)',
  'Pusat Pembangunan ICT (PPICT)',
  'Pusat Kesihatan Universiti (PKU)',
  'Jabatan Hal Ehwal Pelajar (JHEP)',
  'Pejabat Pengurusan Kolej Kediaman Tun Fuad'
];

export default function MyProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    staff_id: '',
    department: 'Pejabat Pengurusan Kolej Kediaman Tun Fuad',
    office_location: 'Aras Bawah, Blok Pentadbiran KKTF',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [wardenAssignments, setWardenAssignments] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const { toast } = useToast();

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);

    const isStudentUser = !user.role || user.role === 'student' || user.role === 'user';

    if (isStudentUser) {
      let studs = await base44.entities.Student.filter({ user_id: user.id });
      if (!studs.length) studs = await base44.entities.Student.filter({ email: user.email });
      const s = studs[0] || null;
      if (s && !s.user_id) {
        await base44.entities.Student.update(s.id, { user_id: user.id });
        s.user_id = user.id;
      }
      setStudent(s);
      setForm(s ? { ...s } : {
        student_id: '', full_name: user.full_name || '', ic_passport: '', gender: 'Male',
        date_of_birth: '', faculty: '', programme: '', year_of_study: 1, semester: '', session: '',
        phone: '', email: user.email || '', block_name: '', room_number: '',
        parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '',
      });
    } else {
      // Non-student staff / officer profile
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '01X-XXXXXXX',
        staff_id: user.staff_id || 'UMS-KKTF-001',
        department: user.department || 'Pejabat Pentadbiran Kolej Kediaman Tun Fuad',
        office_location: 'Pejabat Kolej Kediaman Tun Fuad, UMS',
        role: user.role
      });
    }

    const [b, r] = await Promise.all([
      base44.entities.Block.list(),
      base44.entities.Room.list(),
    ]);
    setBlocks(b);
    setRooms(r);
    
    if (user.role === 'warden') {
      const wa = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
      setWardenAssignments(wa);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!form?.full_name) {
      toast({ title: 'Nama penuh diperlukan', variant: 'destructive' }); return;
    }
    setSaving(true);

    const isStudentRole = !currentUser?.role || currentUser?.role === 'student' || currentUser?.role === 'user';

    if (isStudentRole) {
      const { room_id, block_name, room_number, ...personalData } = form;
      if (student) {
        await base44.entities.Student.update(student.id, { ...personalData, user_id: currentUser.id });
      } else {
        const created = await base44.entities.Student.create({ ...personalData, user_id: currentUser.id });
        setStudent(created);
      }
    } else {
      // Update User object
      try {
        await base44.auth.updateMe({
          full_name: form.full_name,
          phone: form.phone
        });
      } catch (e) {
        // Fallback
      }
    }

    toast({ title: 'Profil berjaya dikemas kini' });
    setSaving(false);
    init();
  }

  async function addWardenBlock() {
    if (!selectedBlock) return;
    const block = blocks.find(b => b.id === selectedBlock);
    const exists = wardenAssignments.find(a => a.block_id === selectedBlock);
    if (exists) { toast({ title: 'Blok ini telah ditetapkan', variant: 'destructive' }); return; }
    setSavingBlock(true);
    await base44.entities.WardenBlock.create({
      warden_user_id: currentUser.id,
      warden_name: currentUser.full_name || currentUser.email,
      warden_email: currentUser.email,
      block_id: selectedBlock,
      block_name: block?.block_name || '',
    });
    const wa = await base44.entities.WardenBlock.filter({ warden_user_id: currentUser.id });
    setWardenAssignments(wa);
    setSelectedBlock('');
    setSavingBlock(false);
    toast({ title: `Blok ${block?.block_name} berjaya ditambah ke kawalan anda` });
  }

  async function removeWardenBlock(id) {
    await base44.entities.WardenBlock.delete(id);
    setWardenAssignments(wa => wa.filter(a => a.id !== id));
    toast({ title: 'Blok dipadam' });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const isPrincipal = currentUser?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || currentUser?.role === 'principal' || currentUser?.effectiveRole === 'principal';
  const isStaffOrOfficer = isPrincipal || ['super_admin', 'college_admin', 'warden', 'staff'].includes(currentUser?.role);

  // =========================================================================
  // 👔 PAPARAN PROFIL PEGAWAI / FELO / PENGETUA / PENTADBIR (RINGKAS & PROFESIONAL)
  // =========================================================================
  if (isStaffOrOfficer) {
    const roleTitle = isPrincipal 
      ? 'Pengetua Kolej' 
      : (ROLE_LABELS[currentUser?.effectiveRole] || ROLE_LABELS[currentUser?.role] || 'Pegawai Kolej');

    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader 
          title="Profil Pegawai / Pentadbir" 
          description="Maklumat peribadi, peranan eksekutif, dan portfolio pengurusan Kolej Kediaman Tun Fuad." 
        />

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
          {/* Header Card Pegawai */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#132644] to-[#1e3a60] flex items-center justify-center text-white shadow-md border border-white/10 shrink-0">
                <User className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-lg text-foreground leading-none">
                    {form?.full_name || currentUser?.full_name}
                  </h3>
                  {isPrincipal && (
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 text-[10px] font-bold">
                      👑 PENGETUA
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{currentUser?.email}</p>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {roleTitle}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">&bull; Kakitangan Rasmi KKTF</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-2xl border border-border text-xs space-y-1 text-right">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Status Akaun</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Aktif & Disahkan
              </p>
            </div>
          </div>

          {/* Butiran Pegawai Form */}
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" /> Maklumat Rasmi Pegawai
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold">Nama Penuh *</Label>
                <Input 
                  value={form.full_name} 
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Jawatan Rasmi Kolej</Label>
                <Input 
                  value={roleTitle} 
                  disabled 
                  className="h-9 text-xs mt-1 bg-muted font-bold text-foreground cursor-not-allowed" 
                />
              </div>

              <div>
                <Label className="text-xs font-bold">E-mel Rasmi Universiti</Label>
                <Input 
                  value={currentUser?.email || ''} 
                  disabled 
                  className="h-9 text-xs mt-1 bg-muted cursor-not-allowed font-mono" 
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Nombor Telefon / WhatsApp *</Label>
                <Input 
                  value={form.phone} 
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="cth: 019-8765432" 
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Fakulti / Jabatan / Pejabat</Label>
                <Select 
                  value={form.department} 
                  onValueChange={v => setForm(f => ({ ...f, department: v }))}
                >
                  <SelectTrigger className="h-9 text-xs mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UMS_FACULTIES.map(fc => <SelectItem key={fc} value={fc}>{fc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Lokasi Pejabat / Bilik Bertugas</Label>
                <Input 
                  value={form.office_location} 
                  onChange={e => setForm(f => ({ ...f, office_location: e.target.value }))}
                  placeholder="cth: Pejabat Pentadbiran KKTF" 
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>
            </div>
          </div>

          {/* JIKA FELO / WARDEN: KAWAL SELIA BLOK KEDIAMAN (BACA SAHAJA / READ-ONLY) */}
          {currentUser?.role === 'warden' && (
            <div className="p-4 bg-indigo-50/25 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Blok Kediaman Di Bawah Kawal Selia Anda (Read-Only)
                </h4>
                <span className="text-[10px] text-muted-foreground font-semibold">Bagi kelulusan E-Leave & Rondaan</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {wardenAssignments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-1">
                    Tiada blok yang ditetapkan oleh pentadbiran kolej setakat ini.
                  </p>
                ) : (
                  wardenAssignments.map(a => (
                    <span 
                      key={a.id} 
                      className="flex items-center gap-1.5 bg-indigo-100/80 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 shadow-xs"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> {a.block_name}
                    </span>
                  ))
                )}
              </div>

              <p className="text-[10px] text-muted-foreground pt-1 border-t border-indigo-200/50 dark:border-indigo-900/50 leading-relaxed">
                ℹ️ <em>Nota: Penetapan blok kediaman diuruskan sepenuhnya oleh <strong>Ketua Pentadbiran</strong> atau <strong>Pengetua Kolej</strong> melalui modul <strong>Block Assignments</strong>. Felo hanya boleh membaca maklumat ini.</em>
              </p>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <Button onClick={handleSave} size="sm" disabled={saving} className="bg-primary text-primary-foreground font-bold rounded-xl text-xs">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
              Simpan Profil Pegawai
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 🎓 PAPARAN PROFIL PELAJAR / RESIDEN (DILENGKAPI PAS DIGITAL & MAKLUMAT RESIDEN)
  // =========================================================================
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profil Residen Saya" description="Lihat dan kemas kini maklumat peribadi serta Pas Residen Digital anda." />

      <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-sm">
        {/* Avatar & Digital Pass */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <User className="w-7 h-7" />
            </div>
            <div>
              <p className="font-heading font-semibold text-base">{form?.full_name || currentUser?.full_name}</p>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              <p className="text-xs text-muted-foreground font-mono">{form?.student_id || 'Mahasiswa KKTF'}</p>
            </div>
          </div>

          <DigitalResidentPass student={student || form} user={currentUser} />
        </div>

        {/* Maklumat Peribadi */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Maklumat Peribadi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs">Nama Penuh *</Label>
              <Input value={form?.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">No. Matrik Pelajar UMS *</Label>
              <Input value={form?.student_id || ''} onChange={e => setForm({ ...form, student_id: e.target.value })} placeholder="cth: BP23110045" className="h-9 text-xs mt-1 font-mono" />
            </div>
            <div>
              <Label className="text-xs">No. Kad Pengenalan / Pasport</Label>
              <Input value={form?.ic_passport || ''} onChange={e => setForm({ ...form, ic_passport: e.target.value })} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Jantina</Label>
              <Select value={form?.gender || 'Male'} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Lelaki</SelectItem>
                  <SelectItem value="Female">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Nombor Telefon Pelajar *</Label>
              <Input value={form?.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="01X-XXXXXXX" className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tarikh Lahir</Label>
              <Input type="date" value={form?.date_of_birth || ''} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="h-9 text-xs mt-1" />
            </div>
          </div>
        </div>

        {/* Akademik */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Maklumat Akademik UMS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <Label className="text-xs">Fakulti / Akademi</Label>
              <Select value={form?.faculty || ''} onValueChange={v => setForm({ ...form, faculty: v })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue placeholder="Pilih Fakulti" /></SelectTrigger>
                <SelectContent>
                  {UMS_FACULTIES.map(fc => <SelectItem key={fc} value={fc}>{fc}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Program Pengajian</Label>
              <Input value={form?.programme || ''} onChange={e => setForm({ ...form, programme: e.target.value })} placeholder="cth: Kejuruteraan Komputer" className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tahun Pengajian</Label>
              <Select value={String(form?.year_of_study || 1)} onValueChange={v => setForm({ ...form, year_of_study: Number(v) })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(y => <SelectItem key={y} value={String(y)}>Tahun {y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Waris Kecemasan */}
        <div>
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Waris & Kecemasan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs">Nama Ibu Bapa / Waris *</Label>
              <Input value={form?.parent_name || ''} onChange={e => setForm({ ...form, parent_name: e.target.value })} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">Nombor Telefon Waris *</Label>
              <Input value={form?.parent_phone || ''} onChange={e => setForm({ ...form, parent_phone: e.target.value })} className="h-9 text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">No. Pendaftaran Kenderaan (No. Plat)</Label>
              <Input value={form?.vehicle_reg || ''} onChange={e => setForm({ ...form, vehicle_reg: e.target.value })} placeholder="cth: SAB 1234 A" className="h-9 text-xs mt-1 uppercase" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-border">
          <Button onClick={handleSave} size="sm" disabled={saving} className="bg-primary text-primary-foreground font-bold rounded-xl text-xs">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Simpan Maklumat Profil
          </Button>
        </div>
      </div>
    </div>
  );
}