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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  UserCog, UserCheck, Plus, Search, Pencil, Ban, CheckCircle2, RotateCcw, XCircle, ClipboardList, Eye, AlertTriangle,
  ShieldCheck, Award, HeartHandshake, Briefcase, GraduationCap, Medal, Sparkles, Layers, Trash2, Calendar, FileText,
  Users, Globe, Megaphone, Check, CheckSquare, Square, Building2, BookmarkCheck, ExternalLink, UserPlus, UserX, AlertCircle, Phone
} from 'lucide-react';
import {
  JAKMAS_POSITIONS, JAKMAS_PORTFOLIOS, JAKMAS_TASK_PRIORITIES, DEFAULT_EXCO_PORTFOLIOS, OFFICIAL_EXCO_METADATA,
  isActiveAppointment, isJakmasAdmin, logJakmasAudit, todayISO,
  getStoredFeloExcoAppointments, saveStoredFeloExcoAppointment, deleteStoredFeloExcoAppointment,
  getStoredCustomWardensFelos, saveStoredCustomWardenFelo, terminateFeloService, reactivateFeloService
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
  const [tab, setTab] = useState('felo_coordinators');
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

  const [feloCoordinators, setFeloCoordinators] = useState([]);
  const [availableFelos, setAvailableFelos] = useState([]);
  const [feloModalOpen, setFeloModalOpen] = useState(false);
  const [editingFeloAppt, setEditingFeloAppt] = useState(null);
  const [feloViewMode, setFeloViewMode] = useState('by_exco'); // 'by_exco' or 'by_felo'
  const [feloStatusFilter, setFeloStatusFilter] = useState('all'); // 'all', 'active', 'ended'
  const [feloSearchQuery, setFeloSearchQuery] = useState('');
  
  // Modal Jemput / Tambah Felo Baharu
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role_title: 'Felo Kolej Kediaman',
    block: 'Blok F',
    phone: '',
    academic_session: 'Sesi 2025/2026',
    notes: ''
  });

  const [feloForm, setFeloForm] = useState({
    fellow_user_id: '',
    portfolios: [],
    academic_session: 'Sesi 2025/2026',
    appointment_date: todayISO(),
    term_end: '2026-07-31',
    letter_ref: '',
    notes: '',
    customPortfolioInput: ''
  });
  const [excoPortfoliosList, setExcoPortfoliosList] = useState(DEFAULT_EXCO_PORTFOLIOS);

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
      if (!isJakmasAdmin(u?.role)) { setLoading(false); return; }
      const [appts, tks, studs, wBlocks, wardensRes] = await Promise.all([
        base44.entities.JakmasAppointment.list('-appointed_at'),
        base44.entities.JakmasTask.list('-created_date'),
        base44.entities.Student.list(),
        base44.entities.WardenBlock.list().catch(() => []),
        base44.functions.invoke('getAllWardens', {}).catch(() => ({ wardens: [] }))
      ]);
      setAppointments(appts || []);
      setTasks(tks || []);
      setStudents(studs || []);

      const fetchedWardens = wardensRes?.data?.wardens || wardensRes?.wardens || [];
      const distinctFelos = [];
      fetchedWardens.forEach(w => {
        if (w.id && !distinctFelos.some(df => df.id === w.id)) {
          distinctFelos.push({ id: w.id, name: w.full_name || w.email, email: w.email, status: 'active' });
        }
      });
      (wBlocks || []).forEach(wb => {
        const id = wb.warden_user_id || wb.id;
        if (wb.warden_name && !distinctFelos.some(df => df.name === wb.warden_name || df.id === id)) {
          distinctFelos.push({ id: id, name: wb.warden_name, email: wb.warden_email, block: wb.block_name, status: 'active' });
        }
      });

      // Muatkan felo/warden baharu yang didaftarkan / dijemput mengikut pendaftaran sebenar
      const customFelos = getStoredCustomWardensFelos();
      customFelos.forEach(cf => {
        if (!distinctFelos.some(df => df.id === cf.id || (df.email && df.email.toLowerCase() === (cf.email || '').toLowerCase()))) {
          distinctFelos.push({
            id: cf.id,
            name: cf.name,
            email: cf.email,
            block: cf.block || 'KKTF',
            phone: cf.phone || '',
            role_title: cf.role_title || 'Felo Kolej',
            is_custom: true,
            status: cf.status || 'active'
          });
        }
      });

      setAvailableFelos(distinctFelos);
      setFeloCoordinators(getStoredFeloExcoAppointments());
    } catch (e) {
      toast({ title: 'Gagal memuatkan data', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function openAppointFelo(appt = null) {
    if (appt) {
      setEditingFeloAppt(appt);
      setFeloForm({
        fellow_user_id: appt.fellow_user_id,
        portfolios: [...(appt.portfolios || [])],
        academic_session: appt.academic_session || 'Sesi 2025/2026',
        appointment_date: appt.appointment_date || todayISO(),
        term_end: appt.term_end || '2026-07-31',
        letter_ref: appt.letter_ref || '',
        notes: appt.notes || '',
        customPortfolioInput: ''
      });
    } else {
      setEditingFeloAppt(null);
      setFeloForm({
        fellow_user_id: availableFelos[0]?.id || '',
        portfolios: ['Exco Sukan & Rekreasi'],
        academic_session: 'Sesi 2025/2026',
        appointment_date: todayISO(),
        term_end: '2026-07-31',
        letter_ref: `UMS/KKTF/WATIKAH-FELO/${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`,
        notes: '',
        customPortfolioInput: ''
      });
    }
    setFeloModalOpen(true);
  }

  function toggleFeloPortfolio(p) {
    setFeloForm(prev => {
      const exists = prev.portfolios.includes(p);
      return {
        ...prev,
        portfolios: exists ? prev.portfolios.filter(item => item !== p) : [...prev.portfolios, p]
      };
    });
  }

  function handleAddCustomExco() {
    const trimmed = feloForm.customPortfolioInput?.trim();
    if (!trimmed) return;
    const formatted = trimmed.startsWith('Exco ') ? trimmed : `Exco ${trimmed}`;
    if (!excoPortfoliosList.includes(formatted)) {
      setExcoPortfoliosList(prev => [...prev, formatted]);
    }
    if (!feloForm.portfolios.includes(formatted)) {
      setFeloForm(prev => ({
        ...prev,
        portfolios: [...prev.portfolios, formatted],
        customPortfolioInput: ''
      }));
    } else {
      setFeloForm(prev => ({ ...prev, customPortfolioInput: '' }));
    }
  }

  async function saveFeloAppointment() {
    if (!feloForm.fellow_user_id) {
      toast({ title: 'Sila pilih Felo Kolej', variant: 'destructive' });
      return;
    }
    if (feloForm.portfolios.length === 0) {
      toast({ title: 'Sila pilih sekurang-kurangnya satu portfolio Exco', variant: 'destructive' });
      return;
    }
    const feloObj = availableFelos.find(f => f.id === feloForm.fellow_user_id);
    const payload = {
      id: editingFeloAppt ? editingFeloAppt.id : `felo-exco-${Date.now()}`,
      fellow_user_id: feloForm.fellow_user_id,
      fellow_name: feloObj?.name || 'Felo KKTF',
      fellow_email: feloObj?.email || '',
      block_assigned: feloObj?.block || 'KKTF',
      portfolios: feloForm.portfolios,
      appointed_by: user?.role === 'principal' ? `Pengetua Kolej (${user.full_name || 'Pengetua KKTF'})` : 'Pengetua Kolej Kediaman Tun Fuad',
      appointment_date: feloForm.appointment_date || todayISO(),
      academic_session: feloForm.academic_session || 'Sesi 2025/2026',
      term_end: feloForm.term_end || '',
      letter_ref: feloForm.letter_ref || `UMS/KKTF/WATIKAH-FELO/${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`,
      notes: feloForm.notes || '',
      status: 'active'
    };

    const updated = saveStoredFeloExcoAppointment(payload, user);
    setFeloCoordinators(updated);
    await logJakmasAudit(user, 'FELO_EXCO_APPOINTED', 'JAKMAS', {
      fellow: payload.fellow_name,
      portfolios: payload.portfolios,
      appointed_by: payload.appointed_by
    });

    toast({
      title: editingFeloAppt ? 'Lantikan Felo Dikemaskini! ✓' : 'Watikah Lantikan Felo Penyelaras Disahkan! 📜',
      description: `${payload.fellow_name} dilantik sebagai Felo Penyelaras bagi ${payload.portfolios.length} portfolio Exco JAKMAS oleh Pengetua Kolej.`
    });

    setFeloModalOpen(false);
    setEditingFeloAppt(null);
  }

  async function handleTerminateFeloService(felo) {
    const reason = prompt(
      `Sila masukkan sebab penamatan perkhidmatan bagi ${felo.fellow_name} (cth: Berpindah tugas / Tidak bertugas lagi di KKTF):`,
      'Tamat perkhidmatan di KKTF. Menunggu pelantikan Felo baharu.'
    );
    if (reason === null) return;
    const updated = terminateFeloService(felo.id, reason, user);
    setFeloCoordinators(updated);
    await logJakmasAudit(user, 'FELO_SERVICE_ENDED', 'JAKMAS', {
      fellow: felo.fellow_name,
      reason
    });
    toast({
      title: 'Perkhidmatan Felo Ditamatkan',
      description: `${felo.fellow_name} telah ditandakan sebagai tamat perkhidmatan. Portfolio sedia untuk diselaraskan semula kepada felo baharu.`
    });
  }

  async function handleReactivateFeloService(felo) {
    if (!confirm(`Aktifkan semula perkhidmatan ${felo.fellow_name} sebagai Felo Penyelaras KKTF?`)) return;
    const updated = reactivateFeloService(felo.id, user);
    setFeloCoordinators(updated);
    await logJakmasAudit(user, 'FELO_SERVICE_REACTIVATED', 'JAKMAS', {
      fellow: felo.fellow_name
    });
    toast({
      title: 'Felo Diaktifkan Semula',
      description: `${felo.fellow_name} kini aktif semula berkhidmat di KKTF.`
    });
  }

  async function handleSaveInvitedFelo() {
    if (!inviteForm.name?.trim() || !inviteForm.email?.trim()) {
      toast({ title: 'Sila lengkapkan nama penuh dan emel Felo', variant: 'destructive' });
      return;
    }
    const newEntry = {
      id: `felo-invited-${Date.now()}`,
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      role_title: inviteForm.role_title || 'Felo Kolej Kediaman',
      block: inviteForm.block || 'Blok F',
      phone: inviteForm.phone || '',
      status: 'active'
    };
    saveStoredCustomWardenFelo(newEntry, user);
    setAvailableFelos(prev => [newEntry, ...prev]);
    await logJakmasAudit(user, 'WARDEN_FELO_INVITED', 'JAKMAS', {
      name: newEntry.name,
      email: newEntry.email,
      block: newEntry.block
    });
    toast({
      title: 'Warden / Felo Baharu Berjaya Didaftarkan! 🎉',
      description: `${newEntry.name} kini berada dalam senarai rasmi dan sedia untuk dilantik ke portfolio Exco JAKMAS.`
    });
    setInviteModalOpen(false);

    // Buka terus dialog lantikan watikah untuk felo baharu ini
    setEditingFeloAppt(null);
    setFeloForm({
      fellow_user_id: newEntry.id,
      portfolios: ['Exco Sukan dan Rekreasi', 'Exco Kesukarelawanan dan Kemasyarakatan'],
      academic_session: 'Sesi 2025/2026',
      appointment_date: todayISO(),
      term_end: '2026-07-31',
      letter_ref: `UMS/KKTF/WATIKAH-FELO/${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`,
      notes: `Lantikan Felo baharu (${newEntry.name}) menggantikan perjawatan yang telah tamat perkhidmatan.`,
      customPortfolioInput: ''
    });
    setFeloModalOpen(true);
  }

  async function removeFeloAppointment(id, name) {
    if (!confirm(`Adakah anda pasti untuk memadam rekod pelantikan bagi ${name}?`)) return;
    const updated = deleteStoredFeloExcoAppointment(id);
    setFeloCoordinators(updated);
    await logJakmasAudit(user, 'FELO_EXCO_TERMINATED', 'JAKMAS', { id, fellow: name });
    toast({ title: 'Rekod pelantikan telah dipadam' });
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

  const activeFelos = feloCoordinators.filter(f => f.status === 'active');
  const endedFelos = feloCoordinators.filter(f => f.status === 'ended');

  return (
    <div className="space-y-6">
      <PageHeader
        title="JAKMAS Management & Penyelarasan Felo"
        description="Lantik & urus Felo Penyelaras Exco (Watikah Pengetua) serta pentadbiran pimpinan mahasiswa JAKMAS KKTF."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm font-semibold text-xs rounded-xl" onClick={() => openAppointFelo()}>
              <ShieldCheck className="w-4 h-4" /> Lantik Felo Penyelaras Exco
            </Button>
            <Button variant="outline" className="text-xs font-semibold rounded-xl h-9 gap-1.5 border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" /> Jemput / Daftar Felo Baharu
            </Button>
            {overdueAppointments.length > 0 && (
              <Button variant="outline" size="sm" onClick={expireOverdue}><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Expire Overdue ({overdueAppointments.length})</Button>
            )}
            <Button variant="outline" size="sm" onClick={openAppoint}><Plus className="w-3.5 h-3.5 mr-1" /> Lantik Mahasiswa JAKMAS</Button>
            <Button variant="secondary" size="sm" onClick={openTask}><ClipboardList className="w-3.5 h-3.5 mr-1" /> Tugaskan Task</Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full sm:w-auto h-auto p-1 gap-1 bg-muted/70 rounded-2xl">
          <TabsTrigger value="felo_coordinators" className="gap-1.5 py-2 text-xs font-semibold rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Felo Penyelaras ({feloCoordinators.length})</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5 py-2 text-xs font-medium rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Mahasiswa ({activeAppointments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="appointments" className="gap-1.5 py-2 text-xs font-medium rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Rekod Lantikan ({appointments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5 py-2 text-xs font-medium rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Tugasan ({tasks.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 py-2 text-xs font-medium rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Arkib ({historyAppointments.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: FELO PENYELARAS EXCO JAKMAS (SESI 2025/2026) */}
        <TabsContent value="felo_coordinators" className="space-y-5 pt-2">
          {/* HEADER BANNER WATIKAH */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-200/60 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 text-xs font-semibold">
                <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Watikah Pelantikan Rasmi Sesi 2025/2026</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-white leading-snug">
                Senarai Penyelarasan Felo Mengikut Exco JAKMAS
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
                Struktur rasmi 9 Portfolio Exco JAKMAS Kolej Kediaman Tun Fuad. 
                Pelantikan rasmi Felo Penyelaras akan diselaraskan oleh Pengetua Kolej mengikut senarai Felo dan Warden sebenar yang berdaftar dengan sistem ini kelak bagi memastikan ketepatan dan mengelakkan sebarang kekeliruan.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {activeFelos.length} Felo Penyelaras Dilantik
                </span>
                {endedFelos.length > 0 && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 text-amber-200 font-medium flex items-center gap-1.5">
                    <UserX className="w-3.5 h-3.5 text-amber-300" /> {endedFelos.length} Tamat Perkhidmatan
                  </span>
                )}
                <span className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white font-medium flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" /> 9 Portfolio Exco JAKMAS
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" /> Kuasa: Pengetua KKTF
                </span>
              </div>
            </div>
            {/* Ambient Background decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/20 to-transparent pointer-events-none" />
            <ShieldCheck className="absolute -right-6 -bottom-6 w-56 h-56 text-white/5 pointer-events-none" />
          </div>

          {/* FILTER & VIEW SWITCHER BAR */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 rounded-2xl border border-border">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={feloViewMode === 'by_exco' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeloViewMode('by_exco')}
                className={`text-xs font-semibold rounded-xl h-9 gap-1.5 ${feloViewMode === 'by_exco' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                <Layers className="w-3.5 h-3.5" /> Susunan Mengikut 9 Exco
              </Button>
              <Button
                variant={feloViewMode === 'by_felo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeloViewMode('by_felo')}
                className={`text-xs font-semibold rounded-xl h-9 gap-1.5 ${feloViewMode === 'by_felo' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                <Users className="w-3.5 h-3.5" /> Susunan Mengikut Felo
              </Button>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 pl-1 sm:pl-2 border-l border-border">
                <button
                  type="button"
                  onClick={() => setFeloStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    feloStatusFilter === 'all' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Semua ({feloCoordinators.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFeloStatusFilter('active')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    feloStatusFilter === 'active' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Aktif ({activeFelos.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFeloStatusFilter('ended')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    feloStatusFilter === 'ended' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Tamat ({endedFelos.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  value={feloSearchQuery}
                  onChange={(e) => setFeloSearchQuery(e.target.value)}
                  placeholder="Cari Exco / nama Felo..."
                  className="pl-8 h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <Button
                size="sm"
                onClick={() => setInviteModalOpen(true)}
                variant="outline"
                className="text-xs rounded-xl h-9 shrink-0 gap-1.5 border-indigo-200 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
              >
                <UserPlus className="w-3.5 h-3.5" /> Jemput Felo
              </Button>
              <Button
                size="sm"
                onClick={() => openAppointFelo()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-xl h-9 shrink-0 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Lantik
              </Button>
            </div>
          </div>

          {/* VIEW 1: MENGIKUT 9 EXCO JAKMAS */}
          {feloViewMode === 'by_exco' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {OFFICIAL_EXCO_METADATA.filter(exco => {
                  if (!feloSearchQuery) return true;
                  const q = feloSearchQuery.toLowerCase();
                  if (exco.name.toLowerCase().includes(q)) return true;
                  const matchingFelos = feloCoordinators.filter(fc => 
                    (fc.portfolios || []).some(p => p.toLowerCase().includes(exco.name.toLowerCase()) || exco.name.toLowerCase().includes(p.toLowerCase()))
                  );
                  return matchingFelos.some(mf => (mf.fellow_name || '').toLowerCase().includes(q));
                }).map((exco, idx) => {
                  const matchingFelos = feloCoordinators.filter(fc => 
                    (fc.portfolios || []).some(p => {
                      const pClean = p.toLowerCase().replace(/exco\s+/i, '').trim();
                      const eClean = exco.name.toLowerCase().replace(/exco\s+/i, '').trim();
                      return pClean.includes(eClean) || eClean.includes(pClean) || p.toLowerCase().includes(exco.shortName.toLowerCase());
                    })
                  );

                  const activeMatchingFelos = matchingFelos.filter(mf => mf.status === 'active');
                  const hasEndedFelo = matchingFelos.some(mf => mf.status === 'ended');

                  return (
                    <div 
                      key={exco.id} 
                      className={`bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group ${
                        hasEndedFelo ? 'border-amber-300 dark:border-amber-900/60' : 'border-border/80 hover:border-indigo-300 dark:hover:border-indigo-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
                            Bil. {idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                            {exco.attachedRole}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-foreground font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {exco.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Bidang Fokus: {exco.shortName}
                          </p>
                        </div>

                        {hasEndedFelo && (
                          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[10.5px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>Felo sebelum ini telah tamat perkhidmatan. Sedia untuk dilantik Felo baharu yang dijemput.</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-border/60">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between mb-2">
                            <span>Felo Penyelaras Dilantik</span>
                            <div className="flex gap-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300">
                                {activeMatchingFelos.length} Aktif
                              </Badge>
                              {matchingFelos.length > activeMatchingFelos.length && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300">
                                  {matchingFelos.length - activeMatchingFelos.length} Tamat
                                </Badge>
                              )}
                            </div>
                          </p>

                          {matchingFelos.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic py-2">
                              Belum ada Felo dilantik (Menunggu pendaftaran Felo sebenar).
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {matchingFelos.map((mf) => {
                                const isEnded = mf.status === 'ended';
                                return (
                                <div 
                                  key={mf.id} 
                                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                                    isEnded 
                                      ? 'bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40' 
                                      : 'bg-muted/40 hover:bg-muted/70'
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEnded ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                      <p className={`text-xs font-semibold truncate ${isEnded ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {mf.fellow_name}
                                      </p>
                                      {isEnded ? (
                                        <span className="text-[9px] px-1.5 py-0 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold">
                                          Tamat
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                          Aktif
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate pl-3">
                                      {mf.fellow_email} {mf.block_assigned ? `• ${mf.block_assigned}` : ''}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-indigo-600 shrink-0"
                                    title="Kemaskini Lantikan Felo"
                                    onClick={() => openAppointFelo(mf)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingFeloAppt(null);
                            // Pilih felo aktif pertama atau felo baharu
                            const defaultFelo = availableFelos.find(f => f.status === 'active')?.id || availableFelos[0]?.id || '';
                            setFeloForm({
                              fellow_user_id: defaultFelo,
                              portfolios: [exco.name],
                              academic_session: 'Sesi 2025/2026',
                              appointment_date: todayISO(),
                              term_end: '2026-07-31',
                              letter_ref: `UMS/KKTF/WATIKAH-FELO/${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`,
                              notes: `Penyelaras bagi ${exco.name}.`,
                              customPortfolioInput: ''
                            });
                            setFeloModalOpen(true);
                          }}
                          className="w-full text-xs h-8 rounded-xl border-dashed border-border hover:border-indigo-400 hover:text-indigo-600 gap-1"
                        >
                          <Plus className="w-3 h-3" /> Tambah / Ganti Penyelaras Exco Ini
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* JADUAL PENUH PENYELARASAN */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm mt-6">
                <div className="p-4 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-heading text-foreground">
                      Jadual Rasmi Penyelarasan Felo Mengikut Exco JAKMAS Sesi 2025/2026
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Format salinan dokumen rasmi Watikah Pengetua Kolej Kediaman Tun Fuad
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Sesi 2025/2026 Berkuat Kuasa
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/20 text-muted-foreground uppercase tracking-wider font-semibold">
                        <th className="px-4 py-3 text-center w-16">Bil.</th>
                        <th className="px-4 py-3 text-left">Exco JAKMAS</th>
                        <th className="px-4 py-3 text-left">Felo Penyelaras Rasmi</th>
                        <th className="px-4 py-3 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {OFFICIAL_EXCO_METADATA.map((exco, idx) => {
                        const matchingFelos = feloCoordinators.filter(fc => 
                          (fc.portfolios || []).some(p => {
                            const pClean = p.toLowerCase().replace(/exco\s+/i, '').trim();
                            const eClean = exco.name.toLowerCase().replace(/exco\s+/i, '').trim();
                            return pClean.includes(eClean) || eClean.includes(pClean) || p.toLowerCase().includes(exco.shortName.toLowerCase());
                          })
                        );

                        return (
                          <tr key={exco.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 text-center font-bold font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-bold text-foreground text-sm">{exco.name}</p>
                              <span className="text-[10px] text-muted-foreground">Peranan Dilampir: {exco.attachedRole}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              {matchingFelos.length === 0 ? (
                                <span className="text-muted-foreground italic">Belum dilantik (Menunggu pendaftaran Felo sebenar)</span>
                              ) : (
                                <ul className="space-y-1">
                                  {matchingFelos.map((mf) => {
                                    const isEnded = mf.status === 'ended';
                                    return (
                                    <li key={mf.id} className="font-medium text-foreground flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full ${isEnded ? 'bg-red-500' : 'bg-indigo-500'}`} />
                                      <span className={isEnded ? 'line-through text-muted-foreground' : ''}>{mf.fellow_name}</span>
                                      {isEnded && (
                                        <span className="text-[9px] px-1 py-0 rounded bg-red-100 text-red-700 font-semibold">(Tamat Perkhidmatan)</span>
                                      )}
                                      {mf.block_assigned && (
                                        <span className="text-[10px] text-muted-foreground font-normal">({mf.block_assigned})</span>
                                      )}
                                    </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (matchingFelos.length > 0) {
                                    openAppointFelo(matchingFelos[0]);
                                  } else {
                                    openAppointFelo();
                                  }
                                }}
                                className="h-7 text-[11px] rounded-lg gap-1"
                              >
                                {matchingFelos.length > 0 ? 'Urus Lantikan' : <><Plus className="w-3 h-3" /> Lantik Felo</>}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: MENGIKUT FELO PENYELARAS */}
          {feloViewMode === 'by_felo' && (
            feloCoordinators.length === 0 ? (
              <div className="p-10 text-center bg-card border border-dashed border-border rounded-3xl space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h4 className="text-base font-bold text-foreground">Belum Ada Felo Penyelaras Dilantik</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Sistem bersedia menerima pendaftaran Felo dan Warden sebenar. Pengetua Kolej boleh membuat lantikan rasmi sebaik sahaja Felo berdaftar dalam sistem bagi mengelakkan sebarang kekeliruan nama atau portfolio.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <Button onClick={() => openAppointFelo()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs gap-1.5 font-bold h-9">
                    <Plus className="w-4 h-4" /> Lantik Felo Berdaftar
                  </Button>
                  <Button variant="outline" onClick={() => setInviteModalOpen(true)} className="rounded-xl text-xs gap-1.5 h-9">
                    <UserPlus className="w-4 h-4" /> Jemput / Daftar Felo Baharu
                  </Button>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feloCoordinators.filter(fc => {
                if (feloStatusFilter === 'active' && fc.status !== 'active') return false;
                if (feloStatusFilter === 'ended' && fc.status !== 'ended') return false;
                if (!feloSearchQuery) return true;
                const q = feloSearchQuery.toLowerCase();
                return (fc.fellow_name || '').toLowerCase().includes(q) ||
                       (fc.fellow_email || '').toLowerCase().includes(q) ||
                       (fc.portfolios || []).some(p => p.toLowerCase().includes(q));
              }).map((felo) => {
                const isEnded = felo.status === 'ended';
                return (
                <div 
                  key={felo.id}
                  className={`border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                    isEnded 
                      ? 'bg-red-50/20 dark:bg-red-950/10 border-red-200/80 dark:border-red-900/50' 
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl border font-bold flex items-center justify-center text-sm shadow-inner ${
                          isEnded
                            ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {felo.fellow_name ? felo.fellow_name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'FP'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`text-sm font-bold font-heading ${isEnded ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                              {felo.fellow_name}
                            </h4>
                            {isEnded ? (
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200">
                                Tamat Perkhidmatan di KKTF
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                Aktif Berkhidmat
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{felo.fellow_email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                              {felo.block_assigned || 'Semua Blok'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-indigo-600"
                          onClick={() => openAppointFelo(felo)}
                          title="Kemaskini Portfolio Felo"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isEnded ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => handleReactivateFeloService(felo)}
                            title="Aktifkan Semula Felo"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                            onClick={() => handleTerminateFeloService(felo)}
                            title="Tamatkan Perkhidmatan Felo"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => removeFeloAppointment(felo.id, felo.fellow_name)}
                          title="Padam Rekod"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {isEnded && (
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-[11px] text-red-800 dark:text-red-300 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">⚠️ Tidak Bertugas di KKTF Lagi</p>
                          <p className="text-[10px] text-red-700/80 dark:text-red-300/80 mt-0.5">
                            {felo.notes || 'Portfolio yang dipegang sedia untuk diselaraskan semula kepada Warden / Felo baharu yang dimasukkan.'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingFeloAppt(null);
                            const activeCandidate = availableFelos.find(af => af.status === 'active')?.id || '';
                            setFeloForm({
                              fellow_user_id: activeCandidate,
                              portfolios: [...(felo.portfolios || [])],
                              academic_session: 'Sesi 2025/2026',
                              appointment_date: todayISO(),
                              term_end: '2026-07-31',
                              letter_ref: `UMS/KKTF/WATIKAH-FELO/${new Date().getFullYear()}/${Math.floor(Math.random() * 90 + 10)}`,
                              notes: `Pengganti portfolio bagi ${felo.fellow_name} yang telah tamat perkhidmatan.`,
                              customPortfolioInput: ''
                            });
                            setFeloModalOpen(true);
                          }}
                          className="h-7 text-[10.5px] bg-red-600 hover:bg-red-700 text-white rounded-lg shrink-0"
                        >
                          Tugaskan Semula
                        </Button>
                      </div>
                    )}

                    <div className="pt-2 border-t border-border">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Portfolio Exco Diselaras ({felo.portfolios?.length || 0}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(felo.portfolios || []).map((port, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary"
                            className={`text-[11px] py-1 px-2.5 rounded-lg border ${
                              isEnded
                                ? 'bg-muted text-muted-foreground border-border/80'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60'
                            }`}
                          >
                            <ShieldCheck className={`w-3 h-3 mr-1 ${isEnded ? 'text-muted-foreground' : 'text-indigo-600 dark:text-indigo-400'}`} />
                            {port}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {!isEnded && felo.notes && (
                      <p className="text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl italic">
                        &ldquo;{felo.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>No. Watikah: <strong className="text-foreground">{felo.letter_ref || '-'}</strong></span>
                    <span>Lantikan: <strong className="text-foreground">{felo.appointed_by || 'Pengetua KKTF'}</strong></span>
                  </div>
                </div>
                );
              })}
            </div>
            )
          )}
        </TabsContent>

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

      {/* DIALOG LANTIKAN FELO PENYELARAS EXCO (WATIKAH PENGETUA) */}
      <Dialog open={feloModalOpen} onOpenChange={(o) => !o && setFeloModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card rounded-3xl border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
              <DialogTitle className="text-lg font-bold font-heading">
                {editingFeloAppt ? 'Kemaskini Portfolio Felo Penyelaras' : 'Watikah Lantikan Felo Penyelaras Exco JAKMAS'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Lantikan rasmi di bawah bidang kuasa Pengetua Kolej Kediaman Tun Fuad bagi Sesi 2025/2026. 
              Pilih felo dan tandakan satu atau lebih portfolio Exco yang diselaraskan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* PILIH FELO */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Pilih Felo Penyelaras *
              </Label>
              <Select 
                value={feloForm.fellow_user_id} 
                onValueChange={(val) => setFeloForm(f => ({ ...f, fellow_user_id: val }))}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                  <SelectValue placeholder="Pilih Felo KKTF..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableFelos.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.name} {f.block ? `(${f.block})` : ''} {f.email ? `• ${f.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PILIH SATU ATAU LEBIH PORTFOLIO EXCO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Portfolio Exco Diselaras * ({feloForm.portfolios.length} dipilih)
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  Boleh pilih lebih daripada satu Exco mengikut watikah
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-border/70 rounded-2xl bg-muted/20">
                {excoPortfoliosList.map((portfolio) => {
                  const isChecked = feloForm.portfolios.includes(portfolio);
                  return (
                    <button
                      key={portfolio}
                      type="button"
                      onClick={() => toggleFeloPortfolio(portfolio)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        isChecked 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 text-indigo-950 dark:text-indigo-200 shadow-xs' 
                          : 'bg-card border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium leading-tight ${isChecked ? 'font-bold text-foreground' : ''}`}>
                          {portfolio}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* TAMBAH EXCO KASTAM JIKA PERLU */}
              <div className="flex gap-2 pt-1">
                <Input
                  value={feloForm.customPortfolioInput || ''}
                  onChange={(e) => setFeloForm(f => ({ ...f, customPortfolioInput: e.target.value }))}
                  placeholder="Tambah portfolio Exco baharu jika tiada dalam senarai..."
                  className="h-8 text-xs rounded-xl bg-background"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddCustomExco}
                  className="h-8 text-xs rounded-xl shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                </Button>
              </div>
            </div>

            {/* SESI & TARIKH WATIKAH */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Sesi Akademik</Label>
                <Input 
                  value={feloForm.academic_session} 
                  onChange={(e) => setFeloForm(f => ({ ...f, academic_session: e.target.value }))}
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Tarikh Kuat Kuasa</Label>
                <Input 
                  type="date"
                  value={feloForm.appointment_date} 
                  onChange={(e) => setFeloForm(f => ({ ...f, appointment_date: e.target.value }))}
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-foreground">Tarikh Tamat Tempoh</Label>
                <Input 
                  type="date"
                  value={feloForm.term_end} 
                  onChange={(e) => setFeloForm(f => ({ ...f, term_end: e.target.value }))}
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* RUJUKAN SURAT WATIKAH */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">No. Rujukan Surat Watikah Pengetua</Label>
              <Input 
                value={feloForm.letter_ref} 
                onChange={(e) => setFeloForm(f => ({ ...f, letter_ref: e.target.value }))}
                placeholder="Cth: UMS/KKTF/WATIKAH-FELO/2025/01"
                className="h-9 text-xs rounded-xl bg-background font-mono"
              />
            </div>

            {/* CATATAN PENGETUA */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">Catatan / Skop Penyelarasan Khas</Label>
              <Textarea 
                value={feloForm.notes} 
                onChange={(e) => setFeloForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Cth: Bertanggungjawab mengesahkan permohonan tuntutan merit sukan kolej dan menyelia aktiviti kebajikan..."
                rows={2}
                className="text-xs rounded-xl bg-background"
              />
            </div>

            {/* INFO CALLOUT */}
            <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/60 flex items-start gap-2 text-indigo-900 dark:text-indigo-300">
              <BookmarkCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Watikah lantikan ini akan disahkan secara automatik di bawah autoriti <strong>Pengetua Kolej Kediaman Tun Fuad</strong>. Felo yang dilantik akan mempunyai akses pengesahan program dan tuntutan merit bagi Exco berkaitan.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setFeloModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button onClick={saveFeloAppointment} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5">
              <Check className="w-4 h-4" />
              {editingFeloAppt ? 'Simpan Kemaskini' : 'Sahkan Watikah Lantikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG JEMPUT & DAFTAR WARDEN / FELO BAHARU */}
      <Dialog open={inviteModalOpen} onOpenChange={(o) => !o && setInviteModalOpen(false)}>
        <DialogContent className="max-w-lg p-6 bg-card rounded-3xl border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <UserPlus className="w-6 h-6" />
              <DialogTitle className="text-lg font-bold font-heading">
                Jemput & Daftar Warden / Felo Baharu
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Daftarkan Felo atau Warden baharu yang dijemput bertugas di Kolej Kediaman Tun Fuad. Profil ini akan serta-merta tersedia untuk menerima watikah lantikan Pengetua bagi mana-mana portfolio Exco JAKMAS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nama Penuh Warden / Felo *</Label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Cth: Dr. Mohd Firdaus bin Ramli / Cik Siti Aisyah"
                className="h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Emel Rasmi UMS *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="firdaus@ums.edu.my"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">No. Telefon / WhatsApp</Label>
                <Input
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+6012-3456789"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Peranan / Jawatan</Label>
                <Select
                  value={inviteForm.role_title}
                  onValueChange={(val) => setInviteForm(f => ({ ...f, role_title: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Felo Kolej Kediaman">Felo Kolej Kediaman</SelectItem>
                    <SelectItem value="Warden Blok">Warden Blok</SelectItem>
                    <SelectItem value="Ketua Warden / Felo Kanan">Ketua Warden / Felo Kanan</SelectItem>
                    <SelectItem value="Felo Penyelaras Khas">Felo Penyelaras Khas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Blok Bertugas Utama</Label>
                <Select
                  value={inviteForm.block}
                  onValueChange={(val) => setInviteForm(f => ({ ...f, block: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Blok A', 'Blok B', 'Blok C', 'Blok D', 'Blok E', 'Blok F', 'Blok G', 'Pentadbiran Kolej'].map(blk => (
                      <SelectItem key={blk} value={blk}>{blk}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Catatan Pengambilan / Portfolio Sasaran</Label>
              <Textarea
                value={inviteForm.notes}
                onChange={(e) => setInviteForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Cth: Felo Penyelaras Blok F dan Exco Sukan & Rekreasi..."
                rows={2}
                className="text-xs rounded-xl bg-background"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setInviteModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button onClick={handleSaveInvitedFelo} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-1.5">
              <UserPlus className="w-4 h-4" /> Daftar & Terus Lantik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}