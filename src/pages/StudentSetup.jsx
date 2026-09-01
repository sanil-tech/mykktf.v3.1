import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, User, Phone, BookOpen, Users, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Info, Sparkles, Building, ShieldCheck } from 'lucide-react';

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
  { id: 1, title: 'Maklumat Peribadi', icon: User, description: 'Maklumat asas pengenalan diri anda' },
  { id: 2, title: 'Akademik UMS', icon: BookOpen, description: 'Fakulti, program pengajian & No. Matrik' },
  { id: 3, title: 'Kontak & Waris', icon: Phone, description: 'No. telefon & maklumat waris kecemasan' },
];

export default function StudentSetup({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    full_name: user?.full_name || '',
    ic_passport: '',
    gender: '',
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
    status: 'Active',
    user_id: user?.id || '',
  });
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validateStep(s) {
    const errs = {};
    if (s === 1) {
      if (!form.full_name?.trim()) errs.full_name = 'Sila masukkan nama penuh';
      if (!form.ic_passport?.trim()) errs.ic_passport = 'Sila masukkan No. Kad Pengenalan / Pasport';
      if (!form.gender) errs.gender = 'Sila pilih jantina';
      if (!form.date_of_birth) errs.date_of_birth = 'Sila pilih tarikh lahir';
    }
    if (s === 2) {
      if (!form.student_id?.trim()) errs.student_id = 'Sila masukkan No. Matrik (cth: BP23110045)';
      if (!form.faculty) errs.faculty = 'Sila pilih fakulti pengajian';
      if (!form.programme?.trim()) errs.programme = 'Sila masukkan program pengajian';
      if (!form.year_of_study) errs.year_of_study = 'Sila pilih tahun pengajian';
    }
    if (s === 3) {
      if (!form.phone?.trim()) errs.phone = 'Sila masukkan nombor telefon pelajar';
      if (!form.parent_name?.trim()) errs.parent_name = 'Sila masukkan nama ibu bapa / waris';
      if (!form.parent_phone?.trim()) errs.parent_phone = 'Sila masukkan nombor telefon waris';
      if (!form.emergency_contact?.trim()) errs.emergency_contact = 'Sila masukkan kontak kecemasan';
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
      await base44.entities.Student.create({ ...form, year_of_study: Number(form.year_of_study) });
      await base44.auth.updateMe({ role: 'student' });
    } catch (e) {
      console.error(e);
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
            <GraduationCap className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2">
            Pendaftaran Residen Baharu (Onboarding)
          </div>
          <h1 className="text-2xl font-bold text-white">Selamat Datang ke Kolej Kediaman Tun Fuad</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            Lengkapkan profil residen anda dalam 3 langkah mudah untuk mengaktifkan akses bilik, permohonan E-Leave, dan perkhidmatan kolej.
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

          {/* STEP 1: PERSONAL INFO */}
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

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Tarikh Lahir *</Label>
                <Input 
                  type="date"
                  value={form.date_of_birth} 
                  onChange={e => set('date_of_birth', e.target.value)} 
                  className={`h-10 text-xs ${errors.date_of_birth ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.date_of_birth && <p className="text-[11px] text-red-500">{errors.date_of_birth}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC INFO */}
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
            </div>
          )}

          {/* STEP 3: CONTACT & EMERGENCY INFO */}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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
                <Label className="text-xs font-semibold text-slate-700">No. Pendaftaran Kenderaan (Pilihan)</Label>
                <Input 
                  value={form.vehicle_reg} 
                  onChange={e => set('vehicle_reg', e.target.value.toUpperCase())} 
                  placeholder="Cth: SAB 1234 A (Jika bawa kereta/motor)" 
                  className="h-10 text-xs uppercase" 
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nama Ibu Bapa / Penjaga *</Label>
                <Input 
                  value={form.parent_name} 
                  onChange={e => set('parent_name', e.target.value)} 
                  placeholder="Cth: BANSAI BIN MAT" 
                  className={`h-10 text-xs ${errors.parent_name ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.parent_name && <p className="text-[11px] text-red-500">{errors.parent_name}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">No. Telefon Waris / Penjaga *</Label>
                <Input 
                  value={form.parent_phone} 
                  onChange={e => set('parent_phone', e.target.value)} 
                  placeholder="Cth: 019-8765432" 
                  className={`h-10 text-xs ${errors.parent_phone ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.parent_phone && <p className="text-[11px] text-red-500">{errors.parent_phone}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Kontak / Talian Kecemasan Tambahan *</Label>
                <Input 
                  value={form.emergency_contact} 
                  onChange={e => set('emergency_contact', e.target.value)} 
                  placeholder="Cth: Abang Kandung (013-5551234)" 
                  className={`h-10 text-xs ${errors.emergency_contact ? 'border-red-500 bg-red-50/30' : ''}`} 
                />
                {errors.emergency_contact && <p className="text-[11px] text-red-500">{errors.emergency_contact}</p>}
              </div>
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
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Lengkapkan Pendaftaran & Masuk
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
