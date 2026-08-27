import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { UserCog, Plus, Search, Pencil, Ban, CheckCircle2, RotateCcw, XCircle, ClipboardList, Eye, AlertTriangle } from 'lucide-react';
import {
  JAKMAS_POSITIONS, JAKMAS_PORTFOLIOS, JAKMAS_TASK_PRIORITIES,
  isActiveAppointment, isJakmasAdmin, logJakmasAudit, todayISO,
} from '@/lib/jakmas';

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-amber-100 text-amber-700',
  expired: 'bg-slate-200 text-slate-500',
  ended: 'bg-red-100 text-red-700',
};

const TASK_STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-700',
  acknowledged: 'bg-cyan-100 text-cyan-700',
  in_progress: 'bg-amber-100 text-amber-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-emerald-100 text-emerald-700',
  returned: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-500',
};

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function JakmasManagement() {
  const [tab, setTab] = useState('members');
  const [appointments, setAppointments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [appointOpen, setAppointOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState(null);
  const [viewTask, setViewTask] = useState(null);

  const [form, setForm] = useState({ student_user_id: '', position: JAKMAS_POSITIONS[0], portfolio: JAKMAS_PORTFOLIOS[0], term_start: '', term_end: '', notes: '' });
  const [studentQuery, setStudentQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const [taskForm, setTaskForm] = useState({ assigned_to_user_id: '', title: '', description: '', instructions: '', priority: 'medium', deadline: '', portfolio: '' });
  const [reviewForm, setReviewForm] = useState({ admin_feedback: '' });

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (!isJakmasAdmin(u.role)) { setLoading(false); return; }
      const [appts, tks, studs] = await Promise.all([
        base44.entities.JakmasAppointment.list('-appointed_at'),
        base44.entities.JakmasTask.list('-created_date'),
        base44.entities.Student.list(),
      ]);
      setAppointments(appts);
      setTasks(tks);
      setStudents(studs);
    } catch (e) {
      toast({ title: 'Gagal memuatkan data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const today = todayISO();
  const activeAppointments = appointments.filter((a) => isActiveAppointment(a, today));
  const overdueAppointments = appointments.filter((a) => a.status === 'active' && a.term_end && a.term_end < today);
  const historyAppointments = appointments.filter((a) => a.status === 'ended' || a.status === 'expired');

  async function expireOverdue() {
    if (overdueAppointments.length === 0) { toast({ title: 'No overdue appointments' }); return; }
    for (const a of overdueAppointments) {
      await base44.entities.JakmasAppointment.update(a.id, { status: 'expired', ended_at: today });
    }
    await logJakmasAudit(user, 'JAKMAS_EXPIRED', 'JAKMAS', { count: overdueAppointments.length });
    toast({ title: `${overdueAppointments.length} appointment(s) expired` });
    init();
  }

  function openAppoint() {
    setEditAppt(null);
    setForm({ student_user_id: '', position: JAKMAS_POSITIONS[0], portfolio: JAKMAS_PORTFOLIOS[0], term_start: '', term_end: '', notes: '' });
    setStudentQuery('');
    setAppointOpen(true);
  }

  function openEdit(a) {
    setEditAppt(a);
    setForm({
      student_user_id: a.student_user_id,
      position: a.position || JAKMAS_POSITIONS[0],
      portfolio: a.portfolio || JAKMAS_PORTFOLIOS[0],
      term_start: a.term_start || '',
      term_end: a.term_end || '',
      notes: a.notes || '',
    });
    setStudentQuery(a.student_name || '');
    setAppointOpen(true);
  }

  const filteredStudents = students.filter((s) => {
    const q = studentQuery.toLowerCase();
    return ((s.full_name || '').toLowerCase().includes(q) || (s.student_id || '').toLowerCase().includes(q)) && s.user_id;
  }).slice(0, 30);

  async function saveAppointment() {
    if (!form.student_user_id || !form.position || !form.term_start) {
      toast({ title: 'Sila pilih pelajar, jawatan & tarikh mula', variant: 'destructive' });
      return;
    }
    const dup = appointments.find((a) => a.student_user_id === form.student_user_id && isActiveAppointment(a, today) && a.id !== editAppt?.id);
    if (dup) {
      toast({ title: 'Pelajar ini sudah ada pelantikan JAKMAS aktif', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const stud = students.find((s) => s.user_id === form.student_user_id);
    const payload = {
      student_user_id: form.student_user_id,
      student_id: stud?.student_id || '',
      student_name: stud?.full_name || '',
      student_email: stud?.email || '',
      block_name: stud?.block_name || '',
      room_number: stud?.room_number || '',
      position: form.position,
      portfolio: form.portfolio,
      term_start: form.term_start,
      term_end: form.term_end || null,
      status: 'active',
      appointed_by_user_id: user.id,
      appointed_by_name: user.full_name || user.email,
      appointed_at: form.term_start,
      notes: form.notes || '',
    };
    try {
      if (editAppt) {
        await base44.entities.JakmasAppointment.update(editAppt.id, payload);
        await logJakmasAudit(user, 'JAKMAS_UPDATED', 'JAKMAS', { appointment_id: editAppt.id, student: payload.student_name });
        toast({ title: 'Pelantikan dikemas kini' });
      } else {
        const created = await base44.entities.JakmasAppointment.create(payload);
        await logJakmasAudit(user, 'JAKMAS_APPOINTED', 'JAKMAS', { appointment_id: created.id, student: payload.student_name, position: payload.position });
        toast({ title: 'JAKMAS dilantik' });
      }
      setAppointOpen(false);
      setSaving(false);
      init();
    } catch (e) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
      setSaving(false);
    }
  }

  async function changeStatus(appt, status, reason) {
    const updates = { status };
    if (status === 'suspended' || status === 'ended') {
      updates.ended_at = today;
      updates.ended_by_user_id = user.id;
      updates.ended_by_name = user.full_name || user.email;
      if (reason) updates.end_reason = reason;
    }
    if (status === 'active') {
      updates.ended_at = null;
      updates.ended_by_user_id = null;
      updates.ended_by_name = null;
      updates.end_reason = null;
    }
    await base44.entities.JakmasAppointment.update(appt.id, updates);
    const actionMap = { suspended: 'JAKMAS_SUSPENDED', active: 'JAKMAS_REACTIVATED', ended: 'JAKMAS_ENDED', expired: 'JAKMAS_EXPIRED' };
    await logJakmasAudit(user, actionMap[status] || 'JAKMAS_UPDATED', 'JAKMAS', { appointment_id: appt.id, student: appt.student_name });
    toast({ title: `Status: ${status}` });
    init();
  }

  function openTask() {
    setTaskForm({ assigned_to_user_id: '', title: '', description: '', instructions: '', priority: 'medium', deadline: '', portfolio: '' });
    setTaskOpen(true);
  }

  async function saveTask() {
    if (!taskForm.assigned_to_user_id || !taskForm.title) {
      toast({ title: 'Sila pilih ahli aktif & tajuk tugas', variant: 'destructive' });
      return;
    }
    const appt = activeAppointments.find((a) => a.student_user_id === taskForm.assigned_to_user_id);
    setSaving(true);
    try {
      const created = await base44.entities.JakmasTask.create({
        title: taskForm.title,
        description: taskForm.description || '',
        instructions: taskForm.instructions || '',
        priority: taskForm.priority,
        deadline: taskForm.deadline || null,
        portfolio: taskForm.portfolio || appt?.portfolio || '',
        assigned_to_user_id: taskForm.assigned_to_user_id,
        assigned_to_name: appt?.student_name || '',
        appointment_id: appt?.id || '',
        position: appt?.position || '',
        created_by_user_id: user.id,
        created_by_name: user.full_name || user.email,
        status: 'assigned',
      });
      await logJakmasAudit(user, 'JAKMAS_TASK_CREATED', 'JAKMAS', { task_id: created.id, assigned_to: created.assigned_to_name, title: created.title });
      toast({ title: 'Tugas ditugaskan' });
      setTaskOpen(false);
      setSaving(false);
      init();
    } catch (e) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
      setSaving(false);
    }
  }

  async function reviewAction(task, action) {
    const now = new Date().toISOString();
    const updates = { admin_feedback: reviewForm.admin_feedback || task.admin_feedback || '' };
    if (action === 'approve') { updates.status = 'approved'; updates.approved_at = now; }
    if (action === 'return') { updates.status = 'returned'; updates.returned_at = now; }
    if (action === 'cancel') { updates.status = 'cancelled'; updates.cancelled_at = now; }
    await base44.entities.JakmasTask.update(task.id, updates);
    const actionMap = { approve: 'JAKMAS_TASK_APPROVED', return: 'JAKMAS_TASK_RETURNED', cancel: 'JAKMAS_TASK_CANCELLED' };
    await logJakmasAudit(user, actionMap[action], 'JAKMAS', { task_id: task.id, title: task.title });
    toast({ title: `Tugas: ${action}` });
    setReviewTask(null);
    setReviewForm({ admin_feedback: '' });
    init();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!isJakmasAdmin(user?.role)) {
    return <EmptyState icon={AlertTriangle} title="Access denied" description="Hanya Super Admin / College Admin boleh menguruskan JAKMAS." />;
  }

  const ApptRow = ({ a, withActions = true }) => (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-2.5">
        <p className="text-sm font-medium">{a.student_name || '-'}</p>
        <p className="text-xs text-muted-foreground">{a.student_id || '-'}</p>
      </td>
      <td className="px-3 py-2.5 text-sm">{a.position || '-'}</td>
      <td className="px-3 py-2.5 text-sm hidden md:table-cell">{a.portfolio || '-'}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">{a.term_start || '-'} → {a.term_end || 'open'}</td>
      <td className="px-3 py-2.5"><Badge className={STATUS_COLORS[a.status]}>{a.status}</Badge></td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{a.appointed_by_name || '-'}</td>
      {withActions && (
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
            {a.status === 'active' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => changeStatus(a, 'suspended')} title="Suspend"><Ban className="w-3.5 h-3.5" /></Button>
            )}
            {a.status === 'suspended' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => changeStatus(a, 'active')} title="Reactivate"><RotateCcw className="w-3.5 h-3.5" /></Button>
            )}
            {(a.status === 'active' || a.status === 'suspended') && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => changeStatus(a, 'ended')} title="End"><XCircle className="w-3.5 h-3.5" /></Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  const TaskRow = ({ t }) => (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-3 py-2.5">
        <p className="text-sm font-medium">{t.title}</p>
        <p className="text-xs text-muted-foreground">{t.assigned_to_name || '-'}</p>
      </td>
      <td className="px-3 py-2.5"><Badge className={TASK_STATUS_COLORS[t.status]}>{t.status}</Badge></td>
      <td className="px-3 py-2.5 hidden sm:table-cell">{t.priority && <Badge className={PRIORITY_COLORS[t.priority]}>{t.priority}</Badge>}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{t.deadline || '-'}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">{t.created_by_name || '-'}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewTask(t)} title="View"><Eye className="w-3.5 h-3.5" /></Button>
          {t.status !== 'cancelled' && t.status !== 'approved' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setReviewTask(t); setReviewForm({ admin_feedback: t.admin_feedback || '' }); }} title="Review"><CheckCircle2 className="w-3.5 h-3.5" /></Button>
          )}
          {t.status !== 'cancelled' && t.status !== 'approved' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => reviewAction(t, 'cancel')} title="Cancel"><XCircle className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="JAKMAS Management"
        description="Lantik, urus & tugaskan ahli JAKMAS (Super Admin / College Admin)"
        actions={
          <div className="flex gap-2">
            {overdueAppointments.length > 0 && (
              <Button variant="outline" onClick={expireOverdue}><AlertTriangle className="w-4 h-4" /> Expire Overdue ({overdueAppointments.length})</Button>
            )}
            <Button onClick={openAppoint}><Plus className="w-4 h-4" /> Appoint JAKMAS</Button>
            <Button variant="secondary" onClick={openTask}><ClipboardList className="w-4 h-4" /> Assign Task</Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="members">Members ({activeAppointments.length})</TabsTrigger>
          <TabsTrigger value="appointments">Appointments ({appointments.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="history">History ({historyAppointments.length})</TabsTrigger>
        </TabsList>

        {/* MEMBERS */}
        <TabsContent value="members">
          {activeAppointments.length === 0 ? (
            <EmptyState icon={UserCog} title="No active JAKMAS members" description="Lantik pelajar sebagai JAKMAS menggunakan butang 'Appoint JAKMAS'." />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Position</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Portfolio</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Term</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Appointed By</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr></thead>
                  <tbody>{activeAppointments.map((a) => <ApptRow key={a.id} a={a} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* APPOINTMENTS */}
        <TabsContent value="appointments">
          {appointments.length === 0 ? (
            <EmptyState icon={UserCog} title="No appointments" description="Pelantikan JAKMAS akan dipaparkan di sini." />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Position</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Portfolio</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Term</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Appointed By</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr></thead>
                  <tbody>{appointments.map((a) => <ApptRow key={a.id} a={a} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No JAKMAS tasks" description="Tugaskan tugas kepada ahli JAKMAS aktif." />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Task / Assignee</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Priority</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Deadline</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Created By</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr></thead>
                  <tbody>{tasks.map((t) => <TaskRow key={t.id} t={t} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history">
          {historyAppointments.length === 0 ? (
            <EmptyState icon={UserCog} title="No appointment history" description="Pelantikan tamat / luput akan dipaparkan di sini untuk audit." />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Position</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Portfolio</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Term</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Appointed By</th>
                  </tr></thead>
                  <tbody>{historyAppointments.map((a) => <ApptRow key={a.id} a={a} withActions={false} />)}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* APPOINT / EDIT DIALOG */}
      <Dialog open={appointOpen} onOpenChange={(o) => !o && setAppointOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editAppt ? 'Edit Appointment' : 'Appoint JAKMAS'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Student *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Cari nama / no. matrik..."
                  value={studentQuery}
                  onChange={(e) => { setStudentQuery(e.target.value); setForm((f) => ({ ...f, student_user_id: '' })); }}
                  disabled={!!editAppt}
                />
              </div>
              {studentQuery && !form.student_user_id && (
                <div className="mt-1 border border-border rounded-md max-h-48 overflow-y-auto bg-popover">
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Tiada pelajar dijumpai.</p>
                  ) : filteredStudents.map((s) => (
                    <button key={s.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between" onClick={() => { setForm((f) => ({ ...f, student_user_id: s.user_id })); setStudentQuery(`${s.full_name} (${s.student_id || '-'})`); }}>
                      <span>{s.full_name}</span>
                      <span className="text-xs text-muted-foreground">{s.student_id || '-'} · {s.block_name || '-'} {s.room_number || ''}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Position *</Label>
                <Input list="jakmas-positions" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="mt-1" />
                <datalist id="jakmas-positions">{JAKMAS_POSITIONS.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
              <div>
                <Label className="text-xs">Portfolio</Label>
                <Input list="jakmas-portfolios" value={form.portfolio} onChange={(e) => setForm((f) => ({ ...f, portfolio: e.target.value }))} className="mt-1" />
                <datalist id="jakmas-portfolios">{JAKMAS_PORTFOLIOS.map((p) => <option key={p} value={p} />)}</datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Term Start *</Label>
                <Input type="date" value={form.term_start} onChange={(e) => setForm((f) => ({ ...f, term_start: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Term End</Label>
                <Input type="date" value={form.term_end} onChange={(e) => setForm((f) => ({ ...f, term_end: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Appointment Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointOpen(false)}>Cancel</Button>
            <Button onClick={saveAppointment} disabled={saving}>{saving ? 'Menyimpan...' : editAppt ? 'Update' : 'Appoint'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TASK DIALOG */}
      <Dialog open={taskOpen} onOpenChange={(o) => !o && setTaskOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign JAKMAS Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Active JAKMAS Member *</Label>
              <Select value={taskForm.assigned_to_user_id} onValueChange={(v) => setTaskForm((f) => ({ ...f, assigned_to_user_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih ahli aktif" /></SelectTrigger>
                <SelectContent>
                  {activeAppointments.map((a) => <SelectItem key={a.id} value={a.student_user_id}>{a.student_name} — {a.position || 'JAKMAS'}</SelectItem>)}
                </SelectContent>
              </Select>
              {activeAppointments.length === 0 && <p className="text-xs text-amber-600 mt-1">Tiada ahli JAKMAS aktif. Lantik dahulu.</p>}
            </div>
            <div>
              <Label className="text-xs">Task Title *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Instructions</Label>
              <Textarea value={taskForm.instructions} onChange={(e) => setTaskForm((f) => ({ ...f, instructions: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{JAKMAS_TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={taskForm.deadline} onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Portfolio</Label>
                <Input list="jakmas-portfolios" value={taskForm.portfolio} onChange={(e) => setTaskForm((f) => ({ ...f, portfolio: e.target.value }))} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button onClick={saveTask} disabled={saving}>{saving ? 'Menugaskan...' : 'Assign Task'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REVIEW DIALOG */}
      <Dialog open={!!reviewTask} onOpenChange={(o) => !o && setReviewTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Task</DialogTitle></DialogHeader>
          {reviewTask && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{reviewTask.title}</p>
                <p className="text-xs text-muted-foreground">{reviewTask.assigned_to_name} · {reviewTask.status}</p>
              </div>
              {reviewTask.progress_notes && <div className="text-xs"><span className="font-medium">Progress:</span> {reviewTask.progress_notes}</div>}
              {reviewTask.evidence_url && <a href={reviewTask.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View evidence</a>}
              <div>
                <Label className="text-xs">Admin Feedback</Label>
                <Textarea value={reviewForm.admin_feedback} onChange={(e) => setReviewForm({ admin_feedback: e.target.value })} rows={3} className="mt-1" placeholder="Maklum balas untuk ahli..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => reviewTask && reviewAction(reviewTask, 'return')}>Return for Revision</Button>
            <Button onClick={() => reviewTask && reviewAction(reviewTask, 'approve')} className="bg-emerald-600 hover:bg-emerald-700">Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DIALOG */}
      <Dialog open={!!viewTask} onOpenChange={(o) => !o && setViewTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Task Details</DialogTitle></DialogHeader>
          {viewTask && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{viewTask.title}</p>
              <p className="text-muted-foreground">{viewTask.description}</p>
              {viewTask.instructions && <div><span className="font-medium">Instructions:</span><p className="text-muted-foreground whitespace-pre-wrap">{viewTask.instructions}</p></div>}
              <div className="flex flex-wrap gap-2"><Badge className={TASK_STATUS_COLORS[viewTask.status]}>{viewTask.status}</Badge>{viewTask.priority && <Badge className={PRIORITY_COLORS[viewTask.priority]}>{viewTask.priority}</Badge>}</div>
              {viewTask.progress_notes && <div><span className="font-medium">Progress:</span> {viewTask.progress_notes}</div>}
              {viewTask.evidence_url && <a href={viewTask.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">View evidence</a>}
              {viewTask.admin_feedback && <div className="p-2 bg-muted/50 rounded"><span className="font-medium">Admin feedback:</span> {viewTask.admin_feedback}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}