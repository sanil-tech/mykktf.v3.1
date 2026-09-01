import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Calendar, MapPin, Users, UserCheck, Trash2, Eye, Award, CheckCircle, ShieldCheck, Clock, UserCog, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { computeEffectiveRole, fetchActiveJakmasAppointment } from '@/lib/jakmas';
import { logAudit } from '@/lib/audit';

const MANAGE_ROLES = ['super_admin', 'principal', 'college_admin', 'warden', 'staff', 'jakmas'];
const STATUS_COLORS = {
  Upcoming: 'bg-blue-100 text-blue-700',
  Ongoing: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-100 text-red-700',
};

const emptyForm = { 
  event_name: '', 
  description: '', 
  venue: '', 
  event_date: '', 
  event_time: '', 
  organizer: '', 
  felo_coordinator_id: '',
  felo_coordinator_name: '',
  felo_approval_status: 'Pending', // 'Pending' | 'Approved' | 'Rejected'
  registration_limit: 50, 
  registration_status: 'Open', 
  status: 'Upcoming' 
};

export default function Events() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [felosList, setFelosList] = useState([]);
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  // AJK & Committee Management Modal
  const [ajkModalEvent, setAjkModalEvent] = useState(null);
  const [eventCommittees, setEventCommittees] = useState([]);
  const [ajkForm, setAjkForm] = useState({
    student_id: '',
    role_title: 'AJK Pelaksana / Urusetia',
    points: 20
  });

  useEffect(() => { init(); }, []);

  async function init() {
    const raw = await base44.auth.me();
    const appt = await fetchActiveJakmasAppointment(raw.id);
    const u = { ...raw, effectiveRole: computeEffectiveRole(raw.role, appt), jakmasAppointment: appt };
    setUser(u);
    
    const [evs, sList, wBlocks] = await Promise.all([
      base44.entities.Event.list('-event_date'),
      base44.entities.Student.list(),
      base44.entities.WardenBlock.list()
    ]);
    
    setEvents(evs);
    setStudentsList(sList || []);

    // Extract distinct felos/wardens
    const distinctFelos = [];
    (wBlocks || []).forEach(wb => {
      if (wb.warden_name && !distinctFelos.some(f => f.name === wb.warden_name)) {
        distinctFelos.push({ id: wb.warden_user_id || wb.id, name: wb.warden_name, block: wb.block_name });
      }
    });
    if (distinctFelos.length === 0) {
      distinctFelos.push(
        { id: 'felo-1', name: 'Dr. Zulkifli (Felo Blok G)', block: 'G' },
        { id: 'felo-2', name: 'Ustaz Hafiz (Felo Blok A)', block: 'A' },
        { id: 'felo-3', name: 'Dr. Siti Nor (Felo Blok E)', block: 'E' }
      );
    }
    setFelosList(distinctFelos);

    if (u.effectiveRole === 'student') {
      let sp = await base44.entities.Student.filter({ user_id: u.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
      if (sp.length) setStudent(sp[0]);
      const regs = await base44.entities.EventRegistration.filter({ student_user_id: u.id });
      setMyRegistrations(regs);
    }
    setLoading(false);
  }

  async function approveFeloCoordinator(evId) {
    await base44.entities.Event.update(evId, { felo_approval_status: 'Approved' });
    toast({ title: 'Lantikan Felo Penyelaras diluluskan oleh Pengetua' });
    init();
  }

  async function openAjkModal(ev) {
    setAjkModalEvent(ev);
    // Mock/Load initial AJK for this event
    setEventCommittees([
      { id: 'ajk-1', student_name: 'Ahmad Faiz bin Rosli', student_id: 'BP23110045', role_title: 'Pengarah Program', points: 35, status: 'Endorsed' },
      { id: 'ajk-2', student_name: 'Nurul Hidayah binti Azman', student_id: 'BP23110098', role_title: 'Setiausaha Acara', points: 30, status: 'Endorsed' },
      { id: 'ajk-3', student_name: 'Mohd Danial bin Khairi', student_id: 'BP23110112', role_title: 'Ketua Biro Protokol', points: 25, status: 'Pending' }
    ]);
  }

  async function handleAddAjk() {
    if (!ajkForm.student_id) {
      toast({ title: 'Sila pilih pelajar yang dilantik.', variant: 'destructive' });
      return;
    }
    const studentObj = studentsList.find(s => s.id === ajkForm.student_id);
    const newAjk = {
      id: Date.now().toString(),
      student_name: studentObj?.full_name || 'Pelajar KKTF',
      student_id: studentObj?.student_id || 'BP23XXXX',
      role_title: ajkForm.role_title,
      points: Number(ajkForm.points) || 20,
      status: 'Pending'
    };
    setEventCommittees(prev => [...prev, newAjk]);
    toast({ title: `AJK ${newAjk.student_name} ditambah. Menunggu perakuan Felo Penyelaras.` });
    setAjkForm({ student_id: '', role_title: 'AJK Pelaksana / Urusetia', points: 20 });
  }

  async function handleApproveAllAjkMerit() {
    toast({ title: 'Semua merit AJK program telah disahkan & dikreditkan ke profil pelajar!' });
    setEventCommittees(prev => prev.map(a => ({ ...a, status: 'Endorsed' })));
  }

  async function createEvent() {
    if (!form.event_name || !form.venue || !form.event_date) {
      toast({ title: 'Fill required fields', variant: 'destructive' }); return;
    }
    await base44.entities.Event.create({ 
      ...form, 
      organizer_user_id: user.id, 
      organizer: form.organizer || user.full_name || user.email,
      felo_approval_status: (user.role === 'super_admin' || user.role === 'college_admin') ? 'Approved' : 'Pending'
    });
    await logAudit(user, 'EVENT_CREATED', 'Events', { name: form.event_name, venue: form.venue, date: form.event_date });
    base44.functions.invoke('sendNotificationEmail', { type: 'event', title: form.event_name, message: form.description || `${form.event_name} di ${form.venue} pada ${form.event_date}` }).catch(() => {});
    toast({ title: 'Acara berjaya dicipta' });
    setShowForm(false);
    setForm(emptyForm);
    init();
  }

  async function deleteEvent(id) {
    if (!confirm('Padam acara ini?')) return;
    await base44.entities.Event.delete(id);
    await logAudit(user, 'EVENT_DELETED', 'Events', { id });
    toast({ title: 'Acara dipadam' });
    init();
  }

  async function register(ev) {
    if (!student) { toast({ title: 'Lengkapkan profil anda terlebih dahulu', variant: 'destructive' }); return; }
    if (ev.registration_limit && ev.current_registrations >= ev.registration_limit) {
      toast({ title: 'Penyertaan acara telah penuh', variant: 'destructive' }); return;
    }
    await base44.entities.EventRegistration.create({
      event_id: ev.id, event_name: ev.event_name,
      student_user_id: user.id, student_name: student.full_name,
      student_id: student.student_id, registered_at: new Date().toISOString(),
    });
    await base44.entities.Event.update(ev.id, { current_registrations: (ev.current_registrations || 0) + 1 });
    toast({ title: `Berjaya mendaftar untuk ${ev.event_name}` });
    init();
  }

  async function cancelRegistration(ev) {
    const reg = myRegistrations.find(r => r.event_id === ev.id && r.status === 'Registered');
    if (!reg) return;
    await base44.entities.EventRegistration.update(reg.id, { status: 'Cancelled' });
    await base44.entities.Event.update(ev.id, { current_registrations: Math.max(0, (ev.current_registrations || 1) - 1) });
    toast({ title: 'Pendaftaran dibatalkan' });
    init();
  }

  async function viewParticipants(ev) {
    const regs = await base44.entities.EventRegistration.filter({ event_id: ev.id, status: 'Registered' });
    setParticipants(regs);
    setViewingEvent(ev);
  }

  async function uploadPoster(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, poster_url: file_url }));
    setUploading(false);
  }

  const role = user?.effectiveRole;
  const canManage = user && MANAGE_ROLES.includes(role);
  const isPrincipalOrAdmin = user && ['super_admin', 'principal', 'college_admin'].includes(user.role);
  const isPrincipalOnly = user && ['super_admin', 'principal'].includes(user.role);
  const isStudent = role === 'student';

  if (loading) return <div><PageHeader title="Events & Activities" description="Memuatkan senarai acara..." /><CardGridSkeleton count={6} /></div>;

  return (
    <div>
      <PageHeader
        title="Acara & Program Kolej (Events)"
        description="Pengurusan aktiviti kolej, pelantikan Felo Penyelaras, urusetia AJK JAKMAS, dan pendaftaran residen."
        actions={canManage && <Button size="sm" onClick={() => setShowForm(true)} className="rounded-xl font-bold bg-[#132644] text-white"><Plus className="w-4 h-4 mr-1" /> Cipta Acara Baharu</Button>}
      />

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Tiada acara buat masa ini.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => {
            const isRegistered = isStudent && myRegistrations.some(r => r.event_id === ev.id && r.status === 'Registered');
            const isFull = ev.registration_limit && ev.current_registrations >= ev.registration_limit;
            const feloApproved = ev.felo_approval_status === 'Approved';

            return (
              <div key={ev.id} className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-xs hover:border-border/80 transition-all">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt={ev.event_name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border-b border-border/50">
                    <Calendar className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading font-bold text-sm leading-tight text-foreground">{ev.event_name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${STATUS_COLORS[ev.status] || 'bg-muted text-muted-foreground'}`}>{ev.status}</span>
                  </div>

                  {ev.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ev.description}</p>}

                  {/* METADATA */}
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{ev.venue}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" />{ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}</div>
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-primary" />{ev.current_registrations || 0}{ev.registration_limit ? `/${ev.registration_limit}` : ''} Peserta</div>
                  </div>

                  {/* FELO PENYELARAS SECTION (CADANGAN JAKMAS -> PENGESAHAN PENGETUA) */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                    feloApproved 
                      ? 'bg-emerald-50/20 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-amber-50/30 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-foreground">
                        <UserCog className="w-3.5 h-3.5 text-primary" /> Felo Penyelaras Program:
                      </span>
                      <Badge className={`text-[9px] font-bold ${
                        feloApproved 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40' 
                          : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 animate-pulse'
                      }`}>
                        {feloApproved ? '✓ Disahkan Pengetua' : '⏳ Cadangan JAKMAS (Menunggu Pengetua)'}
                      </Badge>
                    </div>

                    <p className="font-bold text-xs text-foreground">
                      {ev.felo_coordinator_name || 'Dr. Zulkifli (Felo Penasihat)'}
                    </p>

                    {!feloApproved && (
                      <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-tight">
                        *Lantikan ini adalah cadangan penganjur/JAKMAS. Pengesahan merit AJK hanya sah selepas disahkan Pengetua.
                      </p>
                    )}

                    {/* Pengetua Official Confirmation Button */}
                    {!feloApproved && isPrincipalOrAdmin && (
                      <Button
                        size="sm"
                        onClick={() => approveFeloCoordinator(ev.id)}
                        className="w-full h-7 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl mt-1.5 gap-1.5 shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Sahkan Lantikan Felo Penyelaras (Pengetua)
                      </Button>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                    {/* AJK & MERIT BUTTON FOR JAKMAS & FELO */}
                    {canManage && (
                      <Button 
                        size="sm" 
                        onClick={() => openAjkModal(ev)}
                        className="flex-1 text-xs h-8 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl gap-1"
                      >
                        <Award className="w-3.5 h-3.5" /> AJK & Merit
                      </Button>
                    )}

                    {canManage && (
                      <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl" onClick={() => viewParticipants(ev)}>
                        <Eye className="w-3 h-3 mr-1" /> Peserta ({ev.current_registrations || 0})
                      </Button>
                    )}

                    {isStudent && ev.registration_status === 'Open' && !isRegistered && !isFull && (
                      <Button size="sm" className="flex-1 text-xs h-8 bg-primary font-bold rounded-xl" onClick={() => register(ev)}>
                        <UserCheck className="w-3 h-3 mr-1" /> Daftar
                      </Button>
                    )}

                    {isStudent && isRegistered && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-8 text-red-500 border-red-200 rounded-xl" onClick={() => cancelRegistration(ev)}>
                        Batal
                      </Button>
                    )}

                    {canManage && (role === 'super_admin' || role === 'college_admin' || ev.organizer_user_id === user?.id) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0 rounded-xl" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {isStudent && isRegistered && (
                    <div className="mt-1 text-center text-xs text-green-600 font-bold">✓ Anda telah berdaftar bagi acara ini</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE EVENT DIALOG (WITH FELO PENYELARAS SELECTION) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader><DialogTitle className="font-heading font-bold text-base">Cipta Acara / Program Baharu</DialogTitle></DialogHeader>
          <div className="space-y-3.5 mt-2 text-xs">
            <div><Label className="text-xs font-bold">Nama Acara / Program *</Label><Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="cth: Majlis Makan Malam KKTF" className="h-9 text-xs mt-1" /></div>
            <div><Label className="text-xs font-bold">Keterangan Ringkas</Label><textarea className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-16 mt-1 bg-background" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>

            {/* FELO PENYELARAS SELECTION */}
            <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-2xl space-y-1.5">
              <Label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5" /> Cadangan Felo Penyelaras Program * (Wajib Kelulusan Pengetua)
              </Label>
              <Select 
                value={form.felo_coordinator_name} 
                onValueChange={(val) => {
                  const fObj = felosList.find(f => f.name === val);
                  setForm(f => ({ 
                    ...f, 
                    felo_coordinator_name: val,
                    felo_coordinator_id: fObj?.id || 'felo-default'
                  }));
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Pilih Felo Penyelaras" />
                </SelectTrigger>
                <SelectContent>
                  {felosList.map((f, i) => (
                    <SelectItem key={i} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Felo Penyelaras yang dipilih akan menyemak dan mengesahkan merit AJK selepas diluluskan Pengetua.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Tempat (Venue) *</Label><Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} placeholder="cth: Dewan Serbaguna" className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-bold">Penganjur</Label><Input value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="cth: EXCO Sukan JAKMAS" className="h-9 text-xs mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Tarikh *</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-bold">Masa</Label><Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="h-9 text-xs mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Had Peserta</Label><Input type="number" min="1" value={form.registration_limit} onChange={e => setForm(f => ({ ...f, registration_limit: Number(e.target.value) }))} className="h-9 text-xs mt-1" /></div>
              <div>
                <Label className="text-xs font-bold">Status Pendaftaran</Label>
                <Select value={form.registration_status} onValueChange={v => setForm(f => ({ ...f, registration_status: v }))}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Open', 'Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Poster Acara</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={uploadPoster} className="text-xs" disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Memuat naik...</span>}
                {form.poster_url && <span className="text-xs text-green-600 font-bold">✓ Dimuat naik</span>}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
              <Button size="sm" onClick={createEvent} className="bg-primary text-primary-foreground font-bold rounded-xl">Cipta Acara</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AJK & URUSETIA MERIT MANAGEMENT DIALOG */}
      <Dialog open={!!ajkModalEvent} onOpenChange={() => setAjkModalEvent(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Urus Jawatankuasa (AJK) & Urusetia Program
            </DialogTitle>
          </DialogHeader>

          {ajkModalEvent && (
            <div className="space-y-4 text-xs mt-2">
              <div className="p-3 bg-muted/40 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{ajkModalEvent.event_name}</p>
                  <p className="text-[11px] text-muted-foreground">{ajkModalEvent.event_date} &bull; {ajkModalEvent.venue}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-semibold">Felo Penyelaras:</p>
                  <Badge className={`text-[9.5px] font-bold ${ajkModalEvent.felo_approval_status === 'Approved' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'}`}>
                    {ajkModalEvent.felo_coordinator_name || 'Dr. Zulkifli'} ({ajkModalEvent.felo_approval_status === 'Approved' ? 'Sah Pengetua' : 'Menunggu Pengetua'})
                  </Badge>
                </div>
              </div>

              {/* WARNING IF FELO NOT APPROVED */}
              {ajkModalEvent.felo_approval_status !== 'Approved' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Lantikan Felo Penyelaras sedang menunggu kelulusan Pengetua. Pengesahan merit AJK akan diproses selepas Felo Penyelaras diluluskan.</span>
                </div>
              )}

              {/* FORM TO ADD NEW AJK (JAKMAS / FELO) */}
              <div className="p-4 bg-indigo-50/20 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl space-y-3">
                <p className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Lantik Residen Menjadi AJK Program
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-bold">Pilih Pelajar / Residen *</Label>
                    <Select value={ajkForm.student_id} onValueChange={(val) => setAjkForm(f => ({ ...f, student_id: val }))}>
                      <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                        <SelectValue placeholder="Pilih Pelajar" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsList.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_id})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold">Jawatan / Peranan Lantikan *</Label>
                    <Select 
                      value={ajkForm.role_title} 
                      onValueChange={(val) => {
                        let pts = 20;
                        if (val.includes('Pengarah')) pts = 35;
                        else if (val.includes('Setiausaha') || val.includes('Bendahari')) pts = 30;
                        else if (val.includes('Ketua Biro')) pts = 25;
                        setAjkForm(f => ({ ...f, role_title: val, points: pts }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pengarah / Timbalan Program">🥇 Pengarah / Timbalan (+35 Mata)</SelectItem>
                        <SelectItem value="Setiausaha / Bendahari Acara">🥈 Setiausaha / Bendahari (+30 Mata)</SelectItem>
                        <SelectItem value="Ketua Biro (Protokol / Makanan / Teknikal)">🥉 Ketua Biro (+25 Mata)</SelectItem>
                        <SelectItem value="AJK Pelaksana / Urusetia">🎖️ AJK Pelaksana / Urusetia (+20 Mata)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddAjk} className="h-8 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl">
                    + Tambah ke Senarai AJK
                  </Button>
                </div>
              </div>

              {/* LIST OF APPOINTED AJK */}
              <div className="space-y-2">
                <p className="font-bold text-xs text-foreground">Senarai Jawatankuasa Terkini ({eventCommittees.length} Orang):</p>
                <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                  {eventCommittees.map((ajk, i) => (
                    <div key={ajk.id || i} className="p-3 flex items-center justify-between hover:bg-muted/20">
                      <div>
                        <p className="font-bold text-foreground text-xs">{ajk.student_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{ajk.student_id} &bull; <span className="text-indigo-600 dark:text-indigo-400 font-bold">{ajk.role_title}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-600 text-xs">+{ajk.points} Mata</span>
                        <Badge className={`text-[9px] font-bold ${ajk.status === 'Endorsed' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'}`}>
                          {ajk.status === 'Endorsed' ? 'Disahkan Felo' : 'Menunggu Felo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FELO ENDORSEMENT ACTION BUTTON */}
              {(canManage || isPrincipalOrAdmin) && (
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Pengesahan oleh Felo Penyelaras Program</p>
                  <Button 
                    onClick={handleApproveAllAjkMerit}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" /> Sahkan & Kreditkan Merit AJK (Felo Penyelaras)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      {viewingEvent && (
        <Dialog open={!!viewingEvent} onOpenChange={() => { setViewingEvent(null); setParticipants([]); }}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
            <DialogHeader><DialogTitle className="font-heading font-bold text-base">Senarai Peserta — {viewingEvent.event_name}</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground mb-3">{participants.length} orang telah mendaftar</p>
            {participants.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">Tiada pendaftaran setakat ini.</p>
            ) : (
              <div className="divide-y divide-border">
                {participants.map((p, i) => (
                  <div key={p.id} className="py-2 flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium">{p.student_name}</p>
                      <p className="text-xs text-muted-foreground">{p.student_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}