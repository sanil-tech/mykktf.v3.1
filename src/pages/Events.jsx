import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { Plus, Calendar, MapPin, Users, UserCheck, Trash2, Eye } from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { computeEffectiveRole, fetchActiveJakmasAppointment } from '@/lib/jakmas';

const MANAGE_ROLES = ['super_admin', 'college_admin', 'warden', 'staff', 'jakmas'];
const STATUS_COLORS = {
  Upcoming: 'bg-blue-100 text-blue-700',
  Ongoing: 'bg-green-100 text-green-700',
  Completed: 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-100 text-red-700',
};

const emptyForm = { event_name: '', description: '', venue: '', event_date: '', event_time: '', organizer: '', registration_limit: 50, registration_status: 'Open', status: 'Upcoming' };

export default function Events() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const raw = await base44.auth.me();
    const appt = await fetchActiveJakmasAppointment(raw.id);
    const u = { ...raw, effectiveRole: computeEffectiveRole(raw.role, appt), jakmasAppointment: appt };
    setUser(u);
    const [evs] = await Promise.all([base44.entities.Event.list('-event_date')]);
    setEvents(evs);
    if (u.effectiveRole === 'student') {
      let sp = await base44.entities.Student.filter({ user_id: u.id });
      if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
      if (sp.length) setStudent(sp[0]);
      const regs = await base44.entities.EventRegistration.filter({ student_user_id: u.id });
      setMyRegistrations(regs);
    }
    setLoading(false);
  }

  async function createEvent() {
    if (!form.event_name || !form.venue || !form.event_date) {
      toast({ title: 'Fill required fields', variant: 'destructive' }); return;
    }
    await base44.entities.Event.create({ ...form, organizer_user_id: user.id, organizer: form.organizer || user.full_name || user.email });
    await base44.entities.AuditLog.create({ user_id: user.id, user_name: user.full_name || user.email, action: 'Event Created', module: 'Events', details: form.event_name, timestamp: new Date().toISOString() });
    base44.functions.invoke('sendNotificationEmail', { type: 'event', title: form.event_name, message: form.description || `${form.event_name} di ${form.venue} pada ${form.event_date}` }).catch(() => {});
    toast({ title: 'Event created' });
    setShowForm(false);
    setForm(emptyForm);
    init();
  }

  async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    await base44.entities.Event.delete(id);
    toast({ title: 'Event deleted' });
    init();
  }

  async function register(ev) {
    if (!student) { toast({ title: 'Complete your profile first', variant: 'destructive' }); return; }
    if (ev.registration_limit && ev.current_registrations >= ev.registration_limit) {
      toast({ title: 'Event is full', variant: 'destructive' }); return;
    }
    await base44.entities.EventRegistration.create({
      event_id: ev.id, event_name: ev.event_name,
      student_user_id: user.id, student_name: student.full_name,
      student_id: student.student_id, registered_at: new Date().toISOString(),
    });
    await base44.entities.Event.update(ev.id, { current_registrations: (ev.current_registrations || 0) + 1 });
    toast({ title: `Registered for ${ev.event_name}` });
    init();
  }

  async function cancelRegistration(ev) {
    const reg = myRegistrations.find(r => r.event_id === ev.id && r.status === 'Registered');
    if (!reg) return;
    await base44.entities.EventRegistration.update(reg.id, { status: 'Cancelled' });
    await base44.entities.Event.update(ev.id, { current_registrations: Math.max(0, (ev.current_registrations || 1) - 1) });
    toast({ title: 'Registration cancelled' });
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
  const isStudent = role === 'student';

  if (loading) return <div><PageHeader title="Events & Activities" description="Loading events..." /><CardGridSkeleton count={6} /></div>;

  return (
    <div>
      <PageHeader
        title="Events & Activities"
        description="College events and student activities"
        actions={canManage && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Create Event</Button>}
      />

      {events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No events yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map(ev => {
            const isRegistered = isStudent && myRegistrations.some(r => r.event_id === ev.id && r.status === 'Registered');
            const isFull = ev.registration_limit && ev.current_registrations >= ev.registration_limit;
            return (
              <div key={ev.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt={ev.event_name} className="w-full h-36 object-cover" />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Calendar className="w-10 h-10 text-primary/40" />
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading font-semibold text-sm leading-tight">{ev.event_name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[ev.status]}`}>{ev.status}</span>
                  </div>
                  {ev.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{ev.description}</p>}
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{ev.venue}</div>
                    <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}</div>
                    <div className="flex items-center gap-1.5"><Users className="w-3 h-3" />{ev.current_registrations || 0}{ev.registration_limit ? `/${ev.registration_limit}` : ''} registered</div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    {canManage && (
                      <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={() => viewParticipants(ev)}>
                        <Eye className="w-3 h-3 mr-1" /> Participants
                      </Button>
                    )}
                    {isStudent && ev.registration_status === 'Open' && !isRegistered && !isFull && (
                      <Button size="sm" className="flex-1 text-xs h-7" onClick={() => register(ev)}>
                        <UserCheck className="w-3 h-3 mr-1" /> Register
                      </Button>
                    )}
                    {isStudent && isRegistered && (
                      <Button size="sm" variant="outline" className="flex-1 text-xs h-7 text-red-500 border-red-200" onClick={() => cancelRegistration(ev)}>
                        Cancel
                      </Button>
                    )}
                    {isStudent && isFull && !isRegistered && (
                      <span className="flex-1 text-center text-xs text-muted-foreground py-1">Full</span>
                    )}
                    {canManage && (role === 'super_admin' || role === 'college_admin' || ev.organizer_user_id === user?.id) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {isStudent && isRegistered && (
                    <div className="mt-2 text-center text-xs text-green-600 font-medium">✓ Registered</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Event Name *</Label><Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Description</Label><textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none h-20 mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Venue *</Label><Input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Organizer</Label><Input value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date *</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Time</Label><Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="h-9 text-sm mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Registration Limit</Label><Input type="number" min="1" value={form.registration_limit} onChange={e => setForm(f => ({ ...f, registration_limit: Number(e.target.value) }))} className="h-9 text-sm mt-1" /></div>
              <div>
                <Label className="text-xs">Registration Status</Label>
                <Select value={form.registration_status} onValueChange={v => setForm(f => ({ ...f, registration_status: v }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{['Open', 'Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Event Poster</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={uploadPoster} className="text-xs" disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
                {form.poster_url && <span className="text-xs text-green-600">✓ Uploaded</span>}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={createEvent}>Create Event</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Participants Dialog */}
      {viewingEvent && (
        <Dialog open={!!viewingEvent} onOpenChange={() => { setViewingEvent(null); setParticipants([]); }}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Participants — {viewingEvent.event_name}</DialogTitle></DialogHeader>
            <p className="text-xs text-muted-foreground mb-3">{participants.length} registered</p>
            {participants.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">No registrations yet.</p>
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