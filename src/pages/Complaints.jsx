import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Lightbulb, 
  HeartHandshake, 
  MessageSquare, 
  Eye, 
  CheckCircle, 
  ShieldAlert, 
  Wrench, 
  Lock, 
  User, 
  Sparkles, 
  Building2, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ListSkeleton } from '@/components/shared/ListSkeletons';
import { toast } from 'sonner';
import { validateAttachment } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

const CATEGORIES = [
  'Student Welfare & Safety',
  'Roommate & Quiet Hours',
  'Cafeteria & Food Services',
  'Staff & Counter Service',
  'College Activities & JAKMAS',
  'General Idea & Suggestion',
  'Others'
];

const STATUS_FLOW = ['Submitted', 'Under Review', 'Resolved', 'Closed'];

const STATUS_COLORS = {
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Closed: 'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_CONFIG = {
  Suggestion: { 
    label: 'Cadangan & Idea', 
    icon: Lightbulb, 
    badge: 'bg-blue-50 text-blue-700 border-blue-200', 
    iconBg: 'bg-blue-100 text-blue-600' 
  },
  'Welfare Concern': { 
    label: 'Isu Kebajikan & Keselamatan', 
    icon: HeartHandshake, 
    badge: 'bg-rose-50 text-rose-700 border-rose-200', 
    iconBg: 'bg-rose-100 text-rose-600' 
  },
  'General Feedback': { 
    label: 'Maklum Balas Umum', 
    icon: MessageSquare, 
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
    iconBg: 'bg-indigo-100 text-indigo-600' 
  },
  Complaint: { 
    label: 'Aduan Khusus', 
    icon: ShieldAlert, 
    badge: 'bg-amber-50 text-amber-700 border-amber-200', 
    iconBg: 'bg-amber-100 text-amber-600' 
  }
};

const STAFF_ROLES = ['super_admin', 'college_admin', 'warden', 'staff', 'jakmas'];

export default function Complaints() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [response, setResponse] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [form, setForm] = useState({ 
    type: 'Suggestion', 
    category: 'Student Welfare & Safety', 
    title: '', 
    description: '', 
    is_anonymous: false, 
    photo: null 
  });

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const isStaff = STAFF_ROLES.includes(u.role);
    let data = [];
    if (isStaff) {
      if (u.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: u.id });
        const all = await base44.entities.Complaint.list('-created_date');
        const blockNames = wb.map(w => w.block_name);
        data = blockNames.length > 0 ? all.filter(c => !c.block_name || blockNames.includes(c.block_name)) : all;
      } else {
        data = await base44.entities.Complaint.list('-created_date');
      }
    } else {
      data = await base44.entities.Complaint.filter({ student_user_id: u.id }, '-created_date');
      let sp = await base44.entities.Student.filter({ user_id: u.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
      if (sp.length) setStudent(sp[0]);
    }
    setItems(data);
    setLoading(false);
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      setForm(f => ({ ...f, photo: null }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(f => ({ ...f, photo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  async function submit() {
    if (!form.title.trim() || !form.description.trim()) { 
      toast.error('Sila isi tajuk dan penerangan maklum balas'); 
      return; 
    }

    const payload = {
      ...form,
      student_user_id: user.id,
      student_id: student?.student_id || '',
      student_name: form.is_anonymous ? 'Anonymous Resident' : (student?.full_name || user.full_name || user.email),
      block_name: form.is_anonymous ? '' : (student?.block_name || ''),
      room_number: form.is_anonymous ? '' : (student?.room_number || ''),
      status: 'Submitted'
    };

    await base44.entities.Complaint.create(payload);
    await logAudit(user, 'FEEDBACK_SUBMITTED', 'Feedback', { 
      type: form.type, 
      category: form.category,
      title: form.title,
      is_anonymous: form.is_anonymous 
    });

    toast.success('Maklum balas anda berjaya dihantar kepada pihak pengurusan kolej!');
    setShowForm(false);
    setForm({ 
      type: 'Suggestion', 
      category: 'Student Welfare & Safety', 
      title: '', 
      description: '', 
      is_anonymous: false, 
      photo: null 
    });
    init();
  }

  async function updateStatus(id, status) {
    await base44.entities.Complaint.update(id, { 
      status, 
      resolved_by: user.full_name || user.email, 
      resolved_at: new Date().toISOString() 
    });
    await logAudit(user, 'FEEDBACK_UPDATED', 'Feedback', { id, status });
    if (viewing?.id === id) setViewing(v => ({ ...v, status }));
    toast.success(`Status dikemaskini kepada: ${status}`);
    init();
  }

  async function saveResponse(id) {
    const isWarden = user.role === 'warden';
    const isJakmas = user.role === 'jakmas';
    
    let update = { admin_response: response };
    if (isWarden) update = { warden_response: response };
    
    await base44.entities.Complaint.update(id, update);
    await logAudit(user, 'FEEDBACK_RESPONDED', 'Feedback', { id });
    
    const item = items.find(i => i.id === id);
    if (item?.student_user_id && !item.is_anonymous) {
      await base44.entities.Notification.create({ 
        user_id: item.student_user_id, 
        title: 'Maklum Balas Residen Diterima', 
        message: `Maklum balas "${item.title}" telah menerima jawapan rasmi daripada pihak kolej.`, 
        type: 'general', 
        link: '/complaints' 
      });
    }
    toast.success('Maklum balas rasmi berjaya disimpan!');
    setResponse('');
    setViewing(null);
    init();
  }

  const isStaff = user && STAFF_ROLES.includes(user.role);
  const filtered = filterType === 'all' ? items : items.filter(i => i.type === filterType);

  if (loading) {
    return (
      <div>
        <PageHeader title="Student Feedback & Welfare" description="Memuatkan maklum balas & cadangan..." />
        <ListSkeleton count={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Feedback & Welfare"
        description="Saluran rasmi cadangan penambahbaikan, isu kebajikan, dan suara mahasiswa KKTF"
        actions={
          !isStaff && (
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm font-semibold">
              <Plus className="w-4 h-4" /> Hantar Cadangan / Maklum Balas
            </Button>
          )
        }
      />

      {/* NOTICE: REDIRECT DAMAGE/FACILITIES TO DAMAGE REPORTS */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Ingin melapor kerosakan fizikal bilik (lampu, paip, tombol pintu)?</p>
            <p className="text-slate-500">Sila gunakan modul <strong>Damage & Maintenance Reports</strong> untuk pendaftaran automatik bersama UMS MyServ.</p>
          </div>
        </div>
        <Link to="/maintenance">
          <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 gap-1.5">
            Buka Damage Reports <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* FILTER TABS */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'Suggestion', label: '💡 Cadangan & Idea' },
          { id: 'Welfare Concern', label: '🛡️ Isu Kebajikan' },
          { id: 'General Feedback', label: '🗣️ Maklum Balas Umum' }
        ].map(t => (
          <Button 
            key={t.id} 
            size="sm" 
            variant={filterType === t.id ? 'default' : 'outline'} 
            onClick={() => setFilterType(t.id)}
            className={`text-xs rounded-xl ${filterType === t.id ? 'bg-indigo-600 text-white font-semibold' : 'bg-card text-slate-600'}`}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground space-y-2">
          <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Tiada Maklum Balas Ditemui</p>
          <p className="text-xs text-slate-400">Jadilah yang pertama berkongsi cadangan membina untuk Kolej Kediaman Tun Fuad.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG['Suggestion'];
            const TypeIcon = typeConf.icon;
            const isAnon = item.is_anonymous;

            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-all flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${typeConf.iconBg}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-bold text-sm text-foreground">{item.title}</p>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${typeConf.badge}`}>
                        {typeConf.label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${STATUS_COLORS[item.status] || 'bg-slate-100'}`}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-slate-700">{item.category}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        {isAnon ? (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                            <Lock className="w-3 h-3 text-slate-400" /> Anonim
                          </span>
                        ) : (
                          <span>{item.student_name}</span>
                        )}
                      </span>
                      {item.block_name && <span>({item.block_name})</span>}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 pt-0.5">{item.description}</p>

                    {(item.admin_response || item.warden_response) && (
                      <div className="mt-2 text-xs bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="line-clamp-1 font-medium">
                          Jawapan Rasmi: {item.admin_response || item.warden_response}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="shrink-0 h-8 gap-1 text-xs text-indigo-700 hover:bg-indigo-50" 
                  onClick={() => { setViewing(item); setResponse(''); }}
                >
                  <Eye className="w-3.5 h-3.5" /> Perincian
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW SUBMISSION MODAL */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-indigo-600" /> Suara Mahasiswa & Maklum Balas KKTF
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kongsi cadangan, maklum balas makanan/staf, atau kemukakan isu kebajikan anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* TYPE SELECTOR */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Jenis Maklum Balas *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'Suggestion', label: '💡 Cadangan', desc: 'Idea penambahbaikan' },
                  { id: 'Welfare Concern', label: '🛡️ Kebajikan', desc: 'Keselamatan & bilik' },
                  { id: 'General Feedback', label: '🗣️ Maklum Balas', desc: 'Perkhidmatan & kafe' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.id }))}
                    className={`p-2.5 rounded-xl text-left border transition-all ${
                      form.type === t.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-card border-border text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-bold">{t.label}</p>
                    <p className={`text-[10px] mt-0.5 ${form.type === t.id ? 'text-indigo-100' : 'text-slate-400'}`}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Kategori Topik *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-xs mt-1 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TITLE */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Tajuk Maklum Balas *</Label>
              <Input 
                placeholder="cth: Cadangan Menambah Meja Belajar di Bilik Bacaan Blok B" 
                value={form.title} 
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                className="h-9 text-xs mt-1" 
              />
            </div>

            {/* DESCRIPTION */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Penerangan Lengkap *</Label>
              <Textarea 
                className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-24 mt-1" 
                placeholder="Huraikan idea, situasi atau kebajikan anda secara terperinci..." 
                value={form.description} 
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
              />
            </div>

            {/* ATTACHMENT */}
            <div>
              <Label className="text-xs font-medium text-slate-700">Lampiran (Pilihan)</Label>
              <Input 
                type="file" 
                onChange={handleFileChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" 
              />
            </div>

            {/* ANONYMOUS OPTION */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Hantar Secara Tanpa Nama (Anonymous)</p>
                  <p className="text-[10px] text-slate-500">Nama dan nombor bilik anda tidak akan dipaparkan.</p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={form.is_anonymous} 
                onChange={e => setForm(f => ({ ...f, is_anonymous: e.target.checked }))} 
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
              Hantar Maklum Balas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEWING / RESPONSE MODAL */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-heading font-bold">{viewing.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Kategori: {viewing.category} &bull; Dihantar oleh: {viewing.is_anonymous ? 'Anonymous Resident' : viewing.student_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs mt-2">
              <div className="flex gap-1.5 flex-wrap">
                <Badge variant="outline" className={STATUS_COLORS[viewing.status]}>{viewing.status}</Badge>
                <Badge variant="outline" className="bg-muted">{viewing.type}</Badge>
                {viewing.block_name && <Badge variant="outline">{viewing.block_name} - Bilik {viewing.room_number}</Badge>}
              </div>

              <div className="bg-muted/30 p-3 rounded-xl border border-border">
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{viewing.description}</p>
              </div>

              {viewing.photo && (
                <div className="rounded-xl overflow-hidden border border-border">
                  <img src={viewing.photo} alt="Lampiran" className="max-w-full rounded-md" />
                </div>
              )}

              {/* RESPONSES */}
              {viewing.admin_response && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Jawapan Pentadbiran Kolej / JAKMAS:
                  </p>
                  <p className="text-slate-800 leading-relaxed">{viewing.admin_response}</p>
                </div>
              )}

              {viewing.warden_response && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Jawapan Warden Blok:
                  </p>
                  <p className="text-slate-800 leading-relaxed">{viewing.warden_response}</p>
                </div>
              )}

              {/* STAFF CONTROLS */}
              {isStaff && (
                <div className="pt-3 border-t border-border space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-slate-800">Tulis Maklum Balas Rasmi</Label>
                    <Textarea 
                      className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-20 mt-1" 
                      placeholder="Tulis jawapan atau tindakan yang telah diambil oleh pihak kolej..." 
                      value={response} 
                      onChange={e => setResponse(e.target.value)} 
                    />
                  </div>

                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUS_FLOW.filter(s => s !== viewing.status).map(s => (
                        <Button key={s} size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(viewing.id, s)}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> {s}
                        </Button>
                      ))}
                    </div>

                    {response && (
                      <Button size="sm" onClick={() => saveResponse(viewing.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                        Simpan Jawapan
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}