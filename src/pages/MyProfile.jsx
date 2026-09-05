import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, Save, Loader2, Building2, ShieldCheck, Briefcase, Camera, Trash2, Upload, Printer, MessageCircle, ExternalLink, Lock, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DigitalResidentPass from '@/components/shared/DigitalResidentPass';
import CollegeTranscriptModal from '@/components/CollegeTranscriptModal';
import { ROLE_LABELS } from '@/lib/roles';

export function toWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/^(\+60|60|0)/, '').replace(/\D/g, '');
  return digits ? `60${digits}` : '';
}

function compressImage(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

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
    notes: '',
    profile_photo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const staffFileInputRef = useRef(null);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [wardenAssignments, setWardenAssignments] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const [attendances, setAttendances] = useState([]);
  const [merits, setMerits] = useState([]);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const { toast } = useToast();

  async function handlePhotoUpload(e, isStaff = false) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format fail tidak sah', description: 'Sila pilih fail gambar (JPG, PNG, WebP).', variant: 'destructive' });
      return;
    }

    setUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressImage(file, 400, 400, 0.85);

      if (student?.id) {
        await base44.entities.Student.update(student.id, { profile_photo: compressedDataUrl });
      }

      try {
        await base44.auth.updateMe({ profile_photo: compressedDataUrl });
      } catch (err) {}

      setStudent(prev => prev ? ({ ...prev, profile_photo: compressedDataUrl }) : prev);
      setForm(prev => ({ ...prev, profile_photo: compressedDataUrl }));
      setCurrentUser(prev => prev ? ({ ...prev, profile_photo: compressedDataUrl }) : prev);

      toast({
        title: 'Foto Profil Berjaya Dikemaskini! 🎉',
        description: 'Foto anda kini dipaparkan pada Pas Residen Digital.'
      });
    } catch (err) {
      console.error('Photo upload error:', err);
      toast({ title: 'Ralat memuat naik foto', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (staffFileInputRef.current) staffFileInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setUploadingPhoto(true);
    try {
      if (student?.id) {
        await base44.entities.Student.update(student.id, { profile_photo: '' });
      }
      try {
        await base44.auth.updateMe({ profile_photo: '' });
      } catch (err) {}

      setStudent(prev => prev ? ({ ...prev, profile_photo: '' }) : prev);
      setForm(prev => ({ ...prev, profile_photo: '' }));
      setCurrentUser(prev => prev ? ({ ...prev, profile_photo: '' }) : prev);

      toast({ title: 'Foto Profil Dipadam' });
    } catch (err) {
      console.error('Photo remove error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  }

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
      const syncEmergency = s ? (s.emergency_contact || s.parent_phone || '') : '';
      const syncParentPhone = s ? (s.parent_phone || s.emergency_contact || '') : '';
      const hydratedStudent = s ? {
        ...s,
        parent_phone: syncParentPhone,
        emergency_contact: syncEmergency
      } : null;

      // Auto update entity jika salah satu field belum tersimpan dalam DB
      if (s && ((!s.emergency_contact && s.parent_phone) || (!s.parent_phone && s.emergency_contact))) {
        base44.entities.Student.update(s.id, {
          parent_phone: syncParentPhone,
          emergency_contact: syncEmergency
        }).catch(() => {});
      }

      setStudent(hydratedStudent);
      setForm(hydratedStudent ? { ...hydratedStudent } : {
        student_id: '', full_name: user.full_name || '', ic_passport: '', gender: 'Male',
        date_of_birth: '', faculty: '', programme: '', year_of_study: 1, semester: '', session: '',
        phone: '', email: user.email || '', block_name: '', room_number: '',
        parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '',
      });
    } else {
      // Non-student staff / officer profile
      const savedTerm = localStorage.getItem(`warden_term_${user.id}`) || user.appointment_term || 'Sesi 2025/2026 (1 Ogos 2025 – 31 Julai 2026)';
      const savedPhone = localStorage.getItem(`warden_phone_${user.id}`) || user.phone || '0165097489';
      setForm({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: savedPhone,
        staff_id: user.staff_id || 'UMS-KKTF-001',
        department: user.department || 'Pejabat Pentadbiran Kolej Kediaman Tun Fuad',
        office_location: user.office_location || 'Pejabat Kolej Kediaman Tun Fuad, UMS',
        role: user.role,
        appointment_term: savedTerm
      });
    }

    const [b, r, attList, discList] = await Promise.all([
      base44.entities.Block.list(),
      base44.entities.Room.list(),
      base44.entities.Attendance.list(),
      base44.entities.DisciplineRecord.list()
    ]);
    setBlocks(b);
    setRooms(r);
    setAttendances(attList || []);
    setMerits(discList || []);
    
    if (user.role === 'warden') {
      const wa = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
      setWardenAssignments(wa);
      const termFromWb = wa.find(a => a.appointment_term)?.appointment_term;
      if (termFromWb) {
        setForm(f => ({ ...f, appointment_term: termFromWb }));
      }
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
      const phoneSync = form.parent_phone || form.emergency_contact || '';
      const finalPersonalData = {
        ...personalData,
        parent_phone: phoneSync,
        emergency_contact: phoneSync,
        user_id: currentUser.id
      };
      if (student) {
        await base44.entities.Student.update(student.id, finalPersonalData);
      } else {
        const created = await base44.entities.Student.create(finalPersonalData);
        setStudent(created);
      }
    } else {
      // Update User object
      try {
        const isPrincipalOrAdmin = currentUser?.role === 'principal' || currentUser?.role === 'super_admin';
        const updatePayload = {
          full_name: form.full_name,
          phone: form.phone,
          department: form.department,
          office_location: form.office_location,
        };
        if (isPrincipalOrAdmin && form.appointment_term) {
          updatePayload.appointment_term = form.appointment_term;
          localStorage.setItem(`warden_term_${currentUser.id}`, form.appointment_term);
        }
        await base44.auth.updateMe(updatePayload);

        // Jika Felo / Warden, selaraskan nombor telefon dan pautan whatsapp ke WardenBlock
        if (currentUser?.role === 'warden') {
          const cleanWA = toWhatsAppNumber(form.phone);
          localStorage.setItem(`warden_phone_${currentUser.id}`, form.phone);
          const wa = await base44.entities.WardenBlock.filter({ warden_user_id: currentUser.id });
          for (const wb of wa) {
            await base44.entities.WardenBlock.update(wb.id, {
              warden_name: form.full_name,
              phone: form.phone,
              whatsapp_number: cleanWA
            }).catch(() => {});
          }
        }
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
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Nombor Telefon / WhatsApp *</Label>
                  {toWhatsAppNumber(form.phone) && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Serasi WhatsApp
                    </span>
                  )}
                </div>
                <Input 
                  value={form.phone || ''} 
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="cth: 016-509 7489 atau 0165097489" 
                  className="h-9 text-xs mt-1 bg-background font-mono" 
                />
                <div className="flex flex-wrap items-center justify-between gap-1 mt-1.5 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pautan WhatsApp Pelajar: <strong className="font-mono">wa.me/{toWhatsAppNumber(form.phone) || '601X-XXXXXXX'}</strong></span>
                  </div>
                  {toWhatsAppNumber(form.phone) && (
                    <a 
                      href={`https://wa.me/${toWhatsAppNumber(form.phone)}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 hover:underline bg-emerald-200/70 dark:bg-emerald-800/50 px-2 py-0.5 rounded-md transition-colors"
                      title="Uji pautan terus WhatsApp"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> Uji Pautan
                    </a>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold">Fakulti / Jabatan / Pejabat (Manual Entry)</Label>
                <Input 
                  value={form.department || ''} 
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="cth: Fakulti Kejuruteraan (FKJ) / Bahagian Hal Ehwal Pelajar" 
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>

              <div>
                <Label className="text-xs font-bold">Lokasi Pejabat / Bilik Bertugas</Label>
                <Input 
                  value={form.office_location || ''} 
                  onChange={e => setForm(f => ({ ...f, office_location: e.target.value }))}
                  placeholder="cth: Pejabat Pentadbiran KKTF" 
                  className="h-9 text-xs mt-1 bg-background" 
                />
              </div>

              {/* TERM LANTIKAN PEGAWAI / WARDEN (KUASA PENGETUA) */}
              <div className="sm:col-span-2 p-3.5 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Term Lantikan Rasmi Pegawai / Warden
                    </Label>
                  </div>
                  <Badge variant="outline" className="w-fit text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> Kuasa Penetapan: Pengetua Kolej
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <Input 
                    value={form.appointment_term || 'Sesi 2025/2026'} 
                    disabled={!(currentUser?.role === 'principal' || currentUser?.role === 'super_admin')} 
                    onChange={e => setForm(f => ({ ...f, appointment_term: e.target.value }))}
                    placeholder="cth: Sesi 2025/2026 (1 Ogos 2025 – 31 Julai 2026)" 
                    className={`h-9 text-xs flex-1 ${
                      !(currentUser?.role === 'principal' || currentUser?.role === 'super_admin')
                        ? 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed border-dashed' 
                        : 'bg-background font-medium border-indigo-400 focus-visible:ring-indigo-400'
                    }`} 
                  />
                  {(currentUser?.role === 'principal' || currentUser?.role === 'super_admin') && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold shrink-0 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      Mod Pengetua (Boleh Ubah)
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 leading-tight">
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  <em>
                    {(currentUser?.role === 'principal' || currentUser?.role === 'super_admin')
                      ? 'Sebagai Pengetua Kolej / Pentadbir Utama, anda mempunyai kuasa untuk menetapkan dan mengemas kini tempoh term lantikan ini.' 
                      : 'Nota: Penetapan tempoh term lantikan staf / felo adalah di bawah kuasa mutlak Pengetua Kolej Kediaman Tun Fuad (BACA SAHAJA).'}
                  </em>
                </p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-5 border-b border-border">
          <div className="flex items-center gap-4">
            {/* Clickable Avatar with Camera badge */}
            <div className="relative group shrink-0">
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#0c182c] to-[#1e3a60] border-2 border-lime-500/40 p-0.5 shadow-md flex items-center justify-center text-primary-foreground overflow-hidden cursor-pointer hover:border-lime-400 transition-all"
                title="Tekan untuk muat naik atau tukar foto profil (Pilihan)"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
                ) : (form?.profile_photo || student?.profile_photo || currentUser?.profile_photo) ? (
                  <img 
                    src={form?.profile_photo || student?.profile_photo || currentUser?.profile_photo} 
                    alt={form?.full_name || 'Foto Pelajar'} 
                    className="w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
                )}
              </div>

              {/* Mini Camera Button badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-lime-500 hover:bg-lime-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-card cursor-pointer transition-transform hover:scale-110"
                title="Muat naik foto profil (Pilihan)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="font-heading font-bold text-base leading-tight">{form?.full_name || currentUser?.full_name}</p>
              </div>
              <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              <p className="text-xs text-lime-600 dark:text-lime-400 font-mono font-bold">{form?.student_id || 'Mahasiswa KKTF'}</p>
              
              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="h-7 text-[11px] px-2.5 rounded-lg border-dashed gap-1 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Upload className="w-3 h-3 text-lime-600 dark:text-lime-400" />
                  {(form?.profile_photo || student?.profile_photo) ? 'Tukar Foto' : 'Muat Naik Foto (Pilihan)'}
                </Button>

                {(form?.profile_photo || student?.profile_photo) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="h-7 text-[11px] px-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                    title="Padam foto profil"
                  >
                    <Trash2 className="w-3 h-3" /> Padam
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:self-center self-start">
            <Button 
              size="sm" 
              onClick={() => setTranscriptOpen(true)}
              className="bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" /> Transkrip Merit (PDF)
            </Button>
            <DigitalResidentPass student={student || form} user={currentUser} />
          </div>
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
              <Input 
                value={form?.parent_phone || form?.emergency_contact || ''} 
                onChange={e => {
                  const val = e.target.value;
                  setForm({ ...form, parent_phone: val, emergency_contact: val });
                }} 
                placeholder="cth: 01X-XXXXXXX"
                className="h-9 text-xs mt-1" 
              />
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

      {/* MODAL TRANSKRIP MERIT DIGITAL RESIDEN */}
      <CollegeTranscriptModal 
        open={transcriptOpen} 
        onOpenChange={setTranscriptOpen} 
        student={student || form} 
        attendanceRecords={attendances} 
        meritTransactions={merits} 
      />
    </div>
  );
}