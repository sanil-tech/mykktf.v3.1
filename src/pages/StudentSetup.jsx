import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  User, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Info, 
  Sparkles, 
  Building2, 
  ShieldCheck,
  DoorClosed
} from 'lucide-react';

const FACULTIES = [
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

const STEPS = [
  { id: 1, title: 'Maklumat Peribadi & Kontak', icon: User, description: 'Pengenalan diri, no. telefon & waris' },
  { id: 2, title: 'Akademik UMS', icon: BookOpen, description: 'Fakulti, program pengajian & No. Matrik' },
  { id: 3, title: 'Status Kunci & Bilik', icon: Building2, description: 'Penetapan bilik atau penangguhan kunci di kaunter' },
];

export default function StudentSetup({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [knowsRoom, setKnowsRoom] = useState(false);

  const [form, setForm] = useState({
    student_id: '',
    full_name: user?.full_name || '',
    ic_passport: '',
    gender: 'Male',
    date_of_birth: '',
    faculty: '',
    programme: '',
    year_of_study: '1',
    phone: '',
    email: user?.email || '',
    parent_name: '',
    parent_phone: '',
    emergency_contact: '',
    vehicle_reg: '',
    block_name: '',
    room_number: '',
    room_id: '',
    room_status: 'Pending Key',
    resident_status: 'Registered',
    status: 'Active',
    user_id: user?.id || '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    async function fetchHostelData() {
      setLoadingRooms(true);
      try {
        const [bList, rList] = await Promise.all([
          base44.entities.Block.list(),
          base44.entities.Room.list()
        ]);
        setBlocks(bList || []);
        setRooms(rList || []);
      } catch (err) {
        console.error('Failed to load blocks and rooms:', err);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchHostelData();
  }, []);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  // Filter blocks by student gender
  const availableBlocks = blocks.filter(b => {
    const restriction = (b.gender_restriction || '').toLowerCase();
    const studentGen = (form.gender || '').toLowerCase();
    if (!restriction || restriction === 'mixed') return true;
    if (studentGen === 'male' || studentGen === 'lelaki') return restriction === 'male' || restriction === 'lelaki';
    if (studentGen === 'female' || studentGen === 'perempuan') return restriction === 'female' || restriction === 'perempuan';
    return true;
  });

  // Filter rooms in selected block
  const availableRooms = rooms.filter(r => 
    r.block_name === form.block_name && r.status !== 'Maintenance'
  ).sort((a, b) => String(a.room_number).localeCompare(String(b.room_number)));

  function validateStep(s) {
    const errs = {};
    if (s === 1) {
      if (!form.full_name?.trim()) errs.full_name = 'Sila masukkan nama penuh';
      if (!form.ic_passport?.trim()) errs.ic_passport = 'Sila masukkan No. Kad Pengenalan / Pasport';
      if (!form.gender) errs.gender = 'Sila pilih jantina';
      if (!form.date_of_birth) errs.date_of_birth = 'Sila pilih tarikh lahir';
      if (!form.phone?.trim()) errs.phone = 'Sila masukkan nombor telefon anda';
      if (!form.parent_phone?.trim()) errs.parent_phone = 'Sila masukkan nombor telefon waris';
    }
    if (s === 2) {
      if (!form.student_id?.trim()) errs.student_id = 'Sila masukkan No. Matrik (cth: BP23110045)';
      if (!form.faculty) errs.faculty = 'Sila pilih fakulti pengajian';
      if (!form.programme?.trim()) errs.programme = 'Sila masukkan program pengajian';
      if (!form.year_of_study) errs.year_of_study = 'Sila pilih tahun pengajian';
    }
    if (s === 3) {
      if (knowsRoom) {
        if (!form.block_name) errs.block_name = 'Sila pilih blok kediaman yang telah ditawarkan';
        if (!form.room_number) errs.room_number = 'Sila pilih nombor bilik anda';
      }
    }
    return errs;
  }

  function nextStep() {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    const errs = validateStep(3);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const selectedRoom = rooms.find(r => r.room_number === form.room_number && r.block_name === form.block_name);
      const roomId = selectedRoom?.id || form.room_id || '';

      // 1. Create or Update Student Resident record (Pre-registration)
      const studentData = {
        ...form,
        user_id: user?.id || form.user_id || '',
        email: (user?.email || form.email || '').trim(),
        block_name: knowsRoom ? form.block_name : '',
        room_number: knowsRoom ? form.room_number : '',
        room_id: knowsRoom ? roomId : '',
        year_of_study: Number(form.year_of_study),
        room_status: knowsRoom ? 'Pending Verification' : 'Pending Key',
        resident_status: 'Registered',
        status: 'Active',
        qr_verified: false
      };

      // Pastikan sebarang cache pengesahan lama dipadamkan untuk mengelakkan bypass pintu utama
      if (studentData.student_id) localStorage.removeItem(`kktf_verified_${studentData.student_id}`);
      if (studentData.email) localStorage.removeItem(`kktf_verified_${studentData.email}`);
      if (user?.email) localStorage.removeItem(`kktf_verified_${user.email}`);

      // Cegah rekod duplikasi jika pengguna memadam akaun auth dan mendaftar semula dengan emel yang sama
      let existingStudents = [];
      if (studentData.email) {
        try {
          existingStudents = await base44.entities.Student.filter({ email: studentData.email });
        } catch (eFilter) {}
      }

      if (existingStudents && existingStudents.length > 0) {
        // Kemaskini rekod sedia ada kepada status pra-pendaftaran yang bersih (Wajib Pengaktifan QR)
        await base44.entities.Student.update(existingStudents[0].id, studentData);
        // Padam sebarang salinan duplikasi lama jika ada
        if (existingStudents.length > 1) {
          for (let i = 1; i < existingStudents.length; i++) {
            await base44.entities.Student.delete(existingStudents[i].id).catch(() => {});
          }
        }
      } else {
        await base44.entities.Student.create(studentData);
      }

      // 2. Update user role
      await base44.auth.updateMe({ role: 'student' });

      // Jika pelajar telah memilih bilik, sediakan isyarat untuk terus buka scanner QR di pintu utama
      if (knowsRoom && form.block_name && form.room_number) {
        sessionStorage.setItem('open_resident_qr_modal', 'true');
      }
    } catch (e) {
      console.error('Registration failed:', e);
    } finally {
      setSaving(false);
      onComplete();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1e36] via-[#132644] to-[#1e3a63] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl">
        {/* TOP INSTITUTIONAL HEADER */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <GraduationCap className="w-8 h-8 text-amber-300" />
          </div>
          <div className="inline-block bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            Pendaftaran Residen Baharu (Self-Service)
          </div>
          <h1 className="text-2xl font-bold text-white">Selamat Datang ke Kolej Kediaman Tun Fuad</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Lengkapkan maklumat dan sahkan bilik kediaman anda untuk mengaktifkan Pas Residen Digital, E-Leave QR, dan perkhidmatan kolej.
          </p>
        </div>

        {/* STEP INDICATORS */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === s.id 
                  ? 'bg-white text-[#0f1e36] shadow-md' 
                  : step > s.id 
                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40' 
                  : 'bg-white/10 text-white/50'
              }`}>
                {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <s.icon className="w-3.5 h-3.5" />}
                <span>{s.title}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-4 h-0.5 ${step > s.id ? 'bg-emerald-400/60' : 'bg-white/20'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* MAIN FORM CARD */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                  {step}
                </span>
                {STEPS[step - 1].title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{STEPS[step - 1].description}</p>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              Langkah {step} / 3
            </span>
          </div>

          {/* STEP 1: PERSONAL & CONTACT INFO */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nama Penuh (Mengikut MyKad / Pasport) *</Label>
                <Input 
                  value={form.full_name} 
                  onChange={e => set('full_name', e.target.value)} 
                  placeholder="Cth: SANIYIL BIN BANSAI" 
                  className={`h-10 text-xs ${errors.full_name ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.full_name && <p className="text-[11px] text-red-500">{errors.full_name}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Kad Pengenalan / Pasport *</Label>
                <Input 
                  value={form.ic_passport} 
                  onChange={e => set('ic_passport', e.target.value)} 
                  placeholder="Cth: 030514-12-5541" 
                  className={`h-10 text-xs ${errors.ic_passport ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.ic_passport && <p className="text-[11px] text-red-500">{errors.ic_passport}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Jantina *</Label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger className={`h-10 text-xs ${errors.gender ? 'border-red-500 bg-red-50/30' : ''}`}>
                    <SelectValue placeholder="Pilih Jantina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Lelaki (Male)</SelectItem>
                    <SelectItem value="Female">Perempuan (Female)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-[11px] text-red-500">{errors.gender}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tarikh Lahir *</Label>
                <Input 
                  type="date"
                  value={form.date_of_birth} 
                  onChange={e => set('date_of_birth', e.target.value)} 
                  className={`h-10 text-xs ${errors.date_of_birth ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.date_of_birth && <p className="text-[11px] text-red-500">{errors.date_of_birth}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Telefon Pelajar *</Label>
                <Input 
                  value={form.phone} 
                  onChange={e => set('phone', e.target.value)} 
                  placeholder="Cth: 011-23456789" 
                  className={`h-10 text-xs ${errors.phone ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nama Ibu Bapa / Waris</Label>
                <Input 
                  value={form.parent_name} 
                  onChange={e => set('parent_name', e.target.value)} 
                  placeholder="Cth: MAT BIN ALI" 
                  className="h-10 text-xs" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Telefon Waris / Kecemasan *</Label>
                <Input 
                  value={form.parent_phone} 
                  onChange={e => set('parent_phone', e.target.value)} 
                  placeholder="Cth: 019-8765432" 
                  className={`h-10 text-xs ${errors.parent_phone ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.parent_phone && <p className="text-[11px] text-red-500">{errors.parent_phone}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC & VEHICLE INFO */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Matrik Pelajar UMS *</Label>
                <Input 
                  value={form.student_id} 
                  onChange={e => set('student_id', e.target.value.toUpperCase())} 
                  placeholder="Cth: BP23110045" 
                  className={`h-10 text-xs uppercase font-mono font-semibold ${errors.student_id ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.student_id && <p className="text-[11px] text-red-500">{errors.student_id}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Fakulti Pengajian UMS *</Label>
                <Select value={form.faculty} onValueChange={v => set('faculty', v)}>
                  <SelectTrigger className={`h-10 text-xs ${errors.faculty ? 'border-red-500 bg-red-50/30' : ''}`}>
                    <SelectValue placeholder="Pilih Fakulti Anda" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACULTIES.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.faculty && <p className="text-[11px] text-red-500">{errors.faculty}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Program Pengajian *</Label>
                <Input 
                  value={form.programme} 
                  onChange={e => set('programme', e.target.value)} 
                  placeholder="Cth: Ijazah Sarjana Muda Sains Komputer" 
                  className={`h-10 text-xs ${errors.programme ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.programme && <p className="text-[11px] text-red-500">{errors.programme}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tahun Pengajian *</Label>
                <Select value={form.year_of_study} onValueChange={v => set('year_of_study', v)}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tahun 1 (Tahun Pertama)</SelectItem>
                    <SelectItem value="2">Tahun 2</SelectItem>
                    <SelectItem value="3">Tahun 3</SelectItem>
                    <SelectItem value="4">Tahun 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Pendaftaran Kenderaan (Pilihan)</Label>
                <Input 
                  value={form.vehicle_reg} 
                  onChange={e => set('vehicle_reg', e.target.value.toUpperCase())} 
                  placeholder="Cth: SAB 1234 A (Jika membawa kenderaan ke kolej)" 
                  className="h-10 text-xs uppercase" 
                />
              </div>
            </div>
          )}

          {/* STEP 3: ASSIGNED BLOCK & ROOM SELECTION OR PRE-REGISTRATION */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3 text-indigo-950">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Status Kunci & Bilik Kediaman KKTF</p>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Adakah anda mendaftar awal dari rumah (belum terima kunci), atau telah menerima kunci fizikal daripada pihak kolej?
                  </p>
                </div>
              </div>

              {/* DUA PILIHAN: BELUM TERIMA KUNCI VS SUDAH ADA KUNCI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div 
                  onClick={() => {
                    setKnowsRoom(false);
                    setForm(f => ({ ...f, block_name: '', room_number: '', room_id: '' }));
                    setErrors(e => ({ ...e, block_name: '', room_number: '' }));
                  }}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    !knowsRoom 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <DoorClosed className={`w-4 h-4 ${!knowsRoom ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <p className="font-bold text-slate-900 text-xs">Belum Ambil Kunci (Prapendaftaran)</p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Saya mendaftar awal dari rumah. Saya akan key-in bilik dan imbas Kod QR selepas mengambil kunci di kaunter kolej.
                  </p>
                </div>

                <div 
                  onClick={() => setKnowsRoom(true)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    knowsRoom 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className={`w-4 h-4 ${knowsRoom ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <p className="font-bold text-slate-900 text-xs">Sudah Tahu Bilik Kunci</p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Saya telah memegang kunci fizikal / tahu blok & nombor bilik dan ingin memilihnya sekarang.
                  </p>
                </div>
              </div>

              {knowsRoom && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Pilih Blok Kediaman *</Label>
                    <Select 
                      value={form.block_name} 
                      onValueChange={v => {
                        setForm(f => ({ ...f, block_name: v, room_number: '', room_id: '' }));
                        setErrors(e => ({ ...e, block_name: '', room_number: '' }));
                      }}
                    >
                      <SelectTrigger className={`h-10 text-xs ${errors.block_name ? 'border-red-500 bg-red-50/30' : ''}`}>
                        <SelectValue placeholder="Pilih Blok Anda" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBlocks.map(b => (
                          <SelectItem key={b.id} value={b.block_name}>
                            {b.block_name} ({b.gender_restriction || 'Semua'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.block_name && <p className="text-[11px] text-red-500">{errors.block_name}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Nombor Bilik *</Label>
                    <Select 
                      value={form.room_number} 
                      disabled={!form.block_name}
                      onValueChange={v => {
                        const selRoom = availableRooms.find(r => r.room_number === v);
                        setForm(f => ({ ...f, room_number: v, room_id: selRoom?.id || '' }));
                        setErrors(e => ({ ...e, room_number: '' }));
                      }}
                    >
                      <SelectTrigger className={`h-10 text-xs ${errors.room_number ? 'border-red-500 bg-red-50/30' : ''}`}>
                        <SelectValue placeholder={form.block_name ? "Pilih Nombor Bilik" : "Pilih blok dahulu"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map(r => (
                          <SelectItem key={r.id} value={r.room_number}>
                            Bilik {r.room_number} ({r.current_occupancy || 0}/{r.capacity || 4} orang)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.room_number && <p className="text-[11px] text-red-500">{errors.room_number}</p>}
                  </div>
                </div>
              )}

              {!knowsRoom ? (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    Profil anda akan disimpan. Selepas mengambil kunci fizikal di <strong>Kaunter Kunci (Dewan Serbaguna KKTF)</strong>, anda boleh masukkan bilik dan imbas Kod QR Pengaktifan Residen untuk mengaktifkan pas kolej.
                  </p>
                </div>
              ) : form.block_name && form.room_number ? (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300/80 rounded-2xl space-y-2 text-amber-950 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-slate-900">Bilik Dipilih: {form.block_name} - Bilik {form.room_number}</p>
                    </div>
                    <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                      Wajib Imbas QR
                    </Badge>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed pl-7">
                    ⚠️ <strong>Pintu Utama:</strong> Walaupun anda telah memegang kunci / memilih bilik, anda <strong>masih diwajibkan mengimbas Kod QR Rasmi Pengaktifan Residen</strong> di Kaunter Kunci atau pintu blok kolej untuk mengaktifkan Pas Digital anda.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
            {step > 1 ? (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setStep(s => s - 1)}
                className="gap-1.5 text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </Button>
            ) : <div />}

            {step < 3 ? (
              <Button 
                type="button" 
                size="sm" 
                onClick={nextStep}
                className="bg-[#132644] hover:bg-[#1e385f] text-white gap-1.5 text-xs font-semibold shadow-sm"
              >
                Seterusnya <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button 
                type="button" 
                size="sm" 
                disabled={saving}
                onClick={handleSubmit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-md px-5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Profil...
                  </>
                ) : knowsRoom && form.block_name && form.room_number ? (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Simpan & Teruskan ke Imbasan QR
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Simpan Profil & Teruskan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* FOOTER NOTICE */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Hak Cipta Terpelihara &bull; Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah
        </p>
      </div>
    </div>
  );
}
