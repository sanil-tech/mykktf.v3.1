import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, User, Phone, BookOpen, Car, Users, CheckCircle2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

const FACULTIES = [
  'Faculty of Computing and Informatics (FCI)',
  'Faculty of Business, Economics and Accountancy (FBEA)',
  'Faculty of Engineering (FE)',
  'Faculty of Science and Natural Resources (FSNR)',
  'Faculty of Social Sciences and Humanities (FSSH)',
  'Faculty of Education (FPEND)',
  'Faculty of Medicine (FM)',
  'Faculty of Law (FL)',
  'Faculty of Humanities, Arts and Heritage (FKAB)',
  'Faculty of Food Technology and Nutrition Sciences (FSTMN)',
  'Faculty of Pharmacy (FP)',
  'Academy of Language Studies (APB)',
  'Centre for the Promotion of Knowledge and Language Learning (PPIB)',
];

const STEPS = [
  { id: 1, title: 'Personal Info', icon: User, description: 'Your basic personal details' },
  { id: 2, title: 'Academic Info', icon: BookOpen, description: 'Your university & programme details' },
  { id: 3, title: 'Room & Contact', icon: Phone, description: 'Room assignment and emergency information' },
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
    year_of_study: '',
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
      if (!form.full_name) errs.full_name = 'Required';
      if (!form.ic_passport) errs.ic_passport = 'Required';
      if (!form.gender) errs.gender = 'Required';
      if (!form.date_of_birth) errs.date_of_birth = 'Required';
    }
    if (s === 2) {
      if (!form.student_id) errs.student_id = 'Required';
      if (!form.faculty) errs.faculty = 'Required';
      if (!form.programme) errs.programme = 'Required';
      if (!form.year_of_study) errs.year_of_study = 'Required';
    }
    if (s === 3) {
      if (!form.phone) errs.phone = 'Required';
      if (!form.parent_name) errs.parent_name = 'Required';
      if (!form.parent_phone) errs.parent_phone = 'Required';
      if (!form.emergency_contact) errs.emergency_contact = 'Required';
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
    await base44.entities.Student.create({ ...form, year_of_study: Number(form.year_of_study) });
    await base44.auth.updateMe({ role: 'student' });
    setSaving(false);
    onComplete();
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222,47%,15%)] to-[hsl(222,47%,28%)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-white">Complete Your Profile</h1>
          <p className="text-sm text-white/70 mt-1">Fill in your resident profile to access all features</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === s.id ? 'bg-white text-[hsl(222,47%,21%)]' : step > s.id ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'}`}>
                {step > s.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                {s.title}
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-px ${step > s.id ? 'bg-white/60' : 'bg-white/20'}`} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="mb-5">
            <h2 className="font-heading font-semibold text-foreground">{STEPS[step - 1].title}</h2>
            <p className="text-xs text-muted-foreground">{STEPS[step - 1].description}</p>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-[hsl(222,47%,21%)] rounded-full transition-all duration-500" style={{ width: `${((step) / STEPS.length) * 100}%` }} />
            </div>
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Full Name <span className="text-red-500">*</span></Label>
                <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="As per IC/Passport" className={`mt-1 h-10 text-sm ${errors.full_name ? 'border-red-400' : ''}`} />
                {errors.full_name && <p className="text-xs text-red-500 mt-0.5">{errors.full_name}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">IC / Passport No. <span className="text-red-500">*</span></Label>
                <Input value={form.ic_passport} onChange={e => set('ic_passport', e.target.value)} placeholder="e.g. 010523-01-1234" className={`mt-1 h-10 text-sm ${errors.ic_passport ? 'border-red-400' : ''}`} />
                {errors.ic_passport && <p className="text-xs text-red-500 mt-0.5">{errors.ic_passport}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Gender <span className="text-red-500">*</span></Label>
                <Select value={form.gender} onValueChange={v => set('gender', v)}>
                  <SelectTrigger className={`mt-1 h-10 text-sm ${errors.gender ? 'border-red-400' : ''}`}><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500 mt-0.5">{errors.gender}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Date of Birth <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={`mt-1 h-10 text-sm ${errors.date_of_birth ? 'border-red-400' : ''}`} />
                {errors.date_of_birth && <p className="text-xs text-red-500 mt-0.5">{errors.date_of_birth}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Email</Label>
                <Input value={form.email} disabled className="mt-1 h-10 text-sm bg-muted/50" />
                <p className="text-xs text-muted-foreground mt-0.5">From your account</p>
              </div>
            </div>
          )}

          {/* Step 2: Academic Info */}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Student ID <span className="text-red-500">*</span></Label>
                <Input value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="e.g. A21CS0101" className={`mt-1 h-10 text-sm ${errors.student_id ? 'border-red-400' : ''}`} />
                {errors.student_id && <p className="text-xs text-red-500 mt-0.5">{errors.student_id}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Faculty <span className="text-red-500">*</span></Label>
                <Select value={form.faculty} onValueChange={v => set('faculty', v)}>
                  <SelectTrigger className={`mt-1 h-10 text-sm ${errors.faculty ? 'border-red-400' : ''}`}><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>{FACULTIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
                {errors.faculty && <p className="text-xs text-red-500 mt-0.5">{errors.faculty}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Programme / Course <span className="text-red-500">*</span></Label>
                <Input value={form.programme} onChange={e => set('programme', e.target.value)} placeholder="e.g. Computer Science" className={`mt-1 h-10 text-sm ${errors.programme ? 'border-red-400' : ''}`} />
                {errors.programme && <p className="text-xs text-red-500 mt-0.5">{errors.programme}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Year of Study <span className="text-red-500">*</span></Label>
                <Select value={String(form.year_of_study)} onValueChange={v => set('year_of_study', v)}>
                  <SelectTrigger className={`mt-1 h-10 text-sm ${errors.year_of_study ? 'border-red-400' : ''}`}><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent>
                </Select>
                {errors.year_of_study && <p className="text-xs text-red-500 mt-0.5">{errors.year_of_study}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Vehicle Registration No.</Label>
                <Input value={form.vehicle_reg} onChange={e => set('vehicle_reg', e.target.value)} placeholder="e.g. SAB1234 (optional)" className="mt-1 h-10 text-sm" />
              </div>
            </div>
          )}

          {/* Step 3: Room & Contact */}
          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Block Name</Label>
                <Input value={form.block_name} onChange={e => set('block_name', e.target.value)} placeholder="e.g. Block A" className="mt-1 h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium">Room Number</Label>
                <Input value={form.room_number} onChange={e => set('room_number', e.target.value)} placeholder="e.g. A-101" className="mt-1 h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium">Phone Number <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. 011-1234567" className={`mt-1 h-10 text-sm ${errors.phone ? 'border-red-400' : ''}`} />
                {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
              </div>
              <div className="sm:col-span-2 border-t pt-3 mt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Parent / Guardian</p>
              </div>
              <div>
                <Label className="text-xs font-medium">Parent / Guardian Name <span className="text-red-500">*</span></Label>
                <Input value={form.parent_name} onChange={e => set('parent_name', e.target.value)} placeholder="Full name" className={`mt-1 h-10 text-sm ${errors.parent_name ? 'border-red-400' : ''}`} />
                {errors.parent_name && <p className="text-xs text-red-500 mt-0.5">{errors.parent_name}</p>}
              </div>
              <div>
                <Label className="text-xs font-medium">Parent Phone <span className="text-red-500">*</span></Label>
                <Input value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} placeholder="e.g. 019-9876543" className={`mt-1 h-10 text-sm ${errors.parent_phone ? 'border-red-400' : ''}`} />
                {errors.parent_phone && <p className="text-xs text-red-500 mt-0.5">{errors.parent_phone}</p>}
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Emergency Contact (name & phone) <span className="text-red-500">*</span></Label>
                <Input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="e.g. Razak bin Ali - 019-5556677" className={`mt-1 h-10 text-sm ${errors.emergency_contact ? 'border-red-400' : ''}`} />
                {errors.emergency_contact && <p className="text-xs text-red-500 mt-0.5">{errors.emergency_contact}</p>}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}
            {step < STEPS.length ? (
              <Button size="sm" onClick={nextStep} className="bg-[hsl(222,47%,21%)] hover:bg-[hsl(222,47%,28%)]">
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSubmit} disabled={saving} className="bg-[hsl(162,63%,41%)] hover:bg-[hsl(162,63%,35%)]">
                {saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete Setup</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}