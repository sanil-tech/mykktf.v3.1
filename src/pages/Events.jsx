import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  UserCheck, 
  Trash2, 
  Eye, 
  Award, 
  CheckCircle, 
  ShieldCheck, 
  Clock, 
  UserCog, 
  UserPlus,
  QrCode,
  ScanLine,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Search,
  AlertCircle,
  Globe,
  Video,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { computeEffectiveRole, fetchActiveJakmasAppointment } from '@/lib/jakmas';
import { logAudit } from '@/lib/audit';

const MANAGE_ROLES = ['super_admin', 'principal', 'college_admin', 'warden', 'staff', 'jakmas'];

export function getEventDateStatus(ev) {
  // 1. Manually Cancelled or Rejected
  if (ev.status === 'Cancelled' || ev.status === 'Dibatalkan' || ev.felo_approval_status === 'Rejected') {
    return {
      key: 'cancelled',
      label: 'Dibatalkan',
      badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
    };
  }

  // 2. Manually Postponed
  if (ev.status === 'Postponed' || ev.status === 'Ditangguhkan') {
    return {
      key: 'postponed',
      label: 'Ditangguhkan',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
    };
  }

  // 3. Manually marked Completed
  if (ev.status === 'Completed' || ev.status === 'Selesai') {
    return {
      key: 'past',
      label: 'Sudah Berlalu',
      badgeClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
    };
  }

  if (!ev.event_date) {
    return {
      key: 'upcoming',
      label: 'Akan Datang',
      badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const eventDateStr = ev.event_date;

  // 4. Tarikh sudah berlalu (sebelum hari ini)
  if (eventDateStr < todayStr) {
    return {
      key: 'past',
      label: 'Sudah Berlalu',
      badgeClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
    };
  }

  // 5. Hari Ini (Bandingkan waktu jika ada)
  if (eventDateStr === todayStr) {
    if (ev.event_time) {
      const [evH, evM] = ev.event_time.split(':').map(Number);
      const [curH, curM] = [now.getHours(), now.getMinutes()];
      const diffMinutes = (curH * 60 + curM) - (evH * 60 + evM);
      // Jika telah tamat lebih 4 jam dari waktu mula
      if (diffMinutes > 240) {
        return {
          key: 'past',
          label: 'Sudah Berlalu',
          badgeClass: 'bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
        };
      }
    }
    return {
      key: 'ongoing',
      label: 'Sedang Berlangsung',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 animate-pulse'
    };
  }

  // 6. Tarikh masa hadapan
  return {
    key: 'upcoming',
    label: 'Akan Datang',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800'
  };
}

const emptyForm = { 
  event_name: '', 
  description: '', 
  venue: '', 
  modality: 'Bersemuka', // 'Bersemuka' | 'Dalam Talian' | 'Hibrid'
  platform: 'Google Meet', // 'Google Meet' | 'Zoom' | 'Cisco Webex' | 'YouTube Live' | 'Microsoft Teams' | 'Lain-lain'
  meeting_link: '',
  event_date: '', 
  event_time: '', 
  organizer: '', 
  felo_coordinator_id: '',
  felo_coordinator_name: '',
  felo_approval_status: 'Pending', // 'Pending' | 'Approved' | 'Rejected'
  registration_limit: 50, 
  registration_status: 'Open', 
  status: 'Upcoming',
  merit_points: 10
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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'upcoming' | 'past' | 'cancelled_postponed'
  const [viewModeOverride, setViewModeOverride] = useState('auto'); // 'auto' | 'student' | 'admin'

  // AJK & Committee Management Modal State
  const [ajkModalEvent, setAjkModalEvent] = useState(null);
  const [eventCommittees, setEventCommittees] = useState([]);
  const [ajkForm, setAjkForm] = useState({
    student_id: '',
    role_title: 'AJK Pelaksana / Urusetia',
    points: 20
  });

  // Attendance Management State
  const [attendanceModalEvent, setAttendanceModalEvent] = useState(null);
  const [eventAttendanceList, setEventAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [walkInStudentId, setWalkInStudentId] = useState('');
  const [attendanceTab, setAttendanceTab] = useState('qr'); // 'qr' | 'roster'
  const [qrCopied, setQrCopied] = useState(false);
  const [filterParticipantSearch, setFilterParticipantSearch] = useState('');

  // Rejection Dialog State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const raw = await base44.auth.me();
      const appt = await fetchActiveJakmasAppointment(raw?.id);
      const u = raw ? { ...raw, effectiveRole: computeEffectiveRole(raw.role, appt), jakmasAppointment: appt } : null;
      setUser(u);
      
      const [evs, sList, wBlocks] = await Promise.all([
        base44.entities.Event.list('-event_date'),
        base44.entities.Student.list(),
        base44.entities.WardenBlock.list().catch(() => [])
      ]);
      
      setEvents(evs || []);
      setStudentsList(sList || []);

      // Extract distinct felos/wardens from real database
      const distinctFelos = [];
      (wBlocks || []).forEach(wb => {
        if (wb.warden_name && !distinctFelos.some(f => f.name === wb.warden_name)) {
          distinctFelos.push({ 
            id: wb.warden_user_id || wb.id, 
            name: `${wb.warden_name} (Felo ${wb.block_name || 'KKTF'})`, 
            block: wb.block_name 
          });
        }
      });
      // Institutional fellow fallback if DB has no assignments yet
      if (distinctFelos.length === 0) {
        distinctFelos.push(
          { id: 'felo-norazilah', name: 'Puan Norazilah binti Tuman (Felo Blok B)', block: 'Block B' }
        );
      }
      setFelosList(distinctFelos);

      if (u?.effectiveRole === 'student') {
        let sp = await base44.entities.Student.filter({ user_id: u.id });
        if (!sp.length) sp = await base44.entities.Student.filter({ email: u.email });
        if (sp.length) setStudent(sp[0]);
        const regs = await base44.entities.EventRegistration.filter({ student_user_id: u.id });
        setMyRegistrations(regs || []);
      }
    } catch (err) {
      console.error("Ralat memuatkan acara:", err);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // 1. ALIRAN KELULUSAN ACARA (EVENT APPROVAL FLOW)
  // =========================================================================
  async function handleApproveEvent(ev) {
    try {
      await base44.entities.Event.update(ev.id, { 
        felo_approval_status: 'Approved',
        status: 'Upcoming'
      });
      await logAudit(user, 'EVENT_APPROVED', 'Events', { id: ev.id, name: ev.event_name });
      toast({ 
        title: 'Acara Diluluskan! 🎉', 
        description: `Acara "${ev.event_name}" telah diluluskan rasmi oleh pihak Pengetua/Felo.` 
      });
      init();
    } catch (err) {
      toast({ title: 'Ralat meluluskan acara', variant: 'destructive' });
    }
  }

  function openRejectModal(ev) {
    setRejectingEvent(ev);
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function handleConfirmReject() {
    if (!rejectingEvent) return;
    try {
      await base44.entities.Event.update(rejectingEvent.id, {
        felo_approval_status: 'Rejected',
        status: 'Cancelled',
        rejection_reason: rejectReason || 'Tidak diluluskan oleh pihak Felo Penyelaras / Pengetua.'
      });
      await logAudit(user, 'EVENT_REJECTED', 'Events', { 
        id: rejectingEvent.id, 
        name: rejectingEvent.event_name,
        reason: rejectReason 
      });
      toast({ 
        title: 'Kertas Cadangan Ditolak', 
        description: `Acara "${rejectingEvent.event_name}" telah ditandakan Ditolak.` 
      });
      setRejectModalOpen(false);
      setRejectingEvent(null);
      setRejectReason('');
      init();
    } catch (err) {
      toast({ title: 'Ralat menolak acara', variant: 'destructive' });
    }
  }

  // =========================================================================
  // 2. MODAL AJK PROGRAM & PENGESAHAN MERIT AJK
  // =========================================================================
  function openAjkModal(ev) {
    setAjkModalEvent(ev);
    try {
      const saved = localStorage.getItem(`event_ajk_${ev.id}`);
      if (saved) {
        setEventCommittees(JSON.parse(saved));
      } else {
        setEventCommittees([]);
      }
    } catch (e) {
      setEventCommittees([]);
    }
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
      student_entity_id: studentObj?.id,
      role_title: ajkForm.role_title,
      points: Number(ajkForm.points) || 20,
      status: 'Pending'
    };
    const updated = [...eventCommittees, newAjk];
    setEventCommittees(updated);
    if (ajkModalEvent) {
      localStorage.setItem(`event_ajk_${ajkModalEvent.id}`, JSON.stringify(updated));
    }
    toast({ title: `AJK ${newAjk.student_name} ditambah. Menunggu perakuan Felo Penyelaras.` });
    setAjkForm({ student_id: '', role_title: 'AJK Pelaksana / Urusetia', points: 20 });
  }

  async function handleApproveAllAjkMerit() {
    if (!ajkModalEvent) return;
    const pendingList = eventCommittees.filter(a => a.status !== 'Endorsed');
    if (pendingList.length === 0) {
      toast({ title: 'Semua AJK telah disahkan sebelum ini.' });
      return;
    }

    try {
      for (const ajk of pendingList) {
        const studentObj = studentsList.find(s => s.student_id === ajk.student_id || s.id === ajk.student_entity_id);
        const targetId = studentObj?.id || ajk.student_entity_id || ajk.student_id;
        
        // Rekod merit dalam entiti Attendance
        await base44.entities.Attendance.create({
          student_id: targetId,
          student_name: ajk.student_name,
          event_type: 'Other',
          event_name: `${ajkModalEvent.event_name} (AJK - ${ajk.role_title})`,
          attendance_date: ajkModalEvent.event_date || new Date().toISOString().split('T')[0],
          method: 'Event',
          status: 'Present'
        });

        // Kemaskini mata merit terkumpul pada profil pelajar
        if (studentObj) {
          const currentPts = Number(studentObj.merit_points) || 0;
          await base44.entities.Student.update(studentObj.id, {
            merit_points: currentPts + ajk.points
          }).catch(() => {});
        }
      }

      const updated = eventCommittees.map(a => ({ ...a, status: 'Endorsed' }));
      setEventCommittees(updated);
      localStorage.setItem(`event_ajk_${ajkModalEvent.id}`, JSON.stringify(updated));
      toast({ 
        title: 'Merit AJK Disahkan & Dikreditkan! 🎉', 
        description: `Merit bagi ${pendingList.length} AJK telah disahkan dan dikreditkan ke profil residen.` 
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat mengesahkan merit AJK', variant: 'destructive' });
    }
  }

  // =========================================================================
  // 3. PENGAMBILAN KEHADIRAN (ATTENDANCE MANAGEMENT: QR & LIVE ROSTER)
  // =========================================================================
  async function openAttendanceModal(ev) {
    setAttendanceModalEvent(ev);
    setLoadingAttendance(true);
    setAttendanceTab('qr');
    try {
      const [regs, atts] = await Promise.all([
        base44.entities.EventRegistration.filter({ event_id: ev.id }),
        base44.entities.Attendance.filter({ event_name: ev.event_name })
      ]);

      const list = (regs || []).map(r => {
        const isPresent = (atts || []).some(a => 
          a.status === 'Present' && 
          (a.student_id === r.student_user_id || a.student_name === r.student_name || a.student_id === r.student_id)
        );
        return {
          ...r,
          isPresent: isPresent || r.status === 'Attended'
        };
      });
      setEventAttendanceList(list);
    } catch (err) {
      console.error("Ralat membuka kehadiran:", err);
    } finally {
      setLoadingAttendance(false);
    }
  }

  async function toggleParticipantAttendance(regItem, makePresent) {
    if (!attendanceModalEvent) return;
    try {
      const studentObj = studentsList.find(s => s.student_id === regItem.student_id || s.user_id === regItem.student_user_id || s.full_name === regItem.student_name);
      const studentId = studentObj?.id || regItem.student_user_id || regItem.student_id;
      const studentName = regItem.student_name || studentObj?.full_name;
      const meritToAdd = Number(attendanceModalEvent.merit_points) || 10;

      if (makePresent) {
        // Cipta rekod kehadiran jika belum ada
        const existingAtt = await base44.entities.Attendance.filter({
          event_name: attendanceModalEvent.event_name,
          student_id: studentId
        });
        if (!existingAtt || existingAtt.length === 0) {
          await base44.entities.Attendance.create({
            student_id: studentId,
            student_name: studentName,
            event_type: 'Other',
            event_name: attendanceModalEvent.event_name,
            attendance_date: attendanceModalEvent.event_date || new Date().toISOString().split('T')[0],
            method: 'Event',
            status: 'Present'
          });
        }
        // Kemaskini EventRegistration kepada 'Attended'
        await base44.entities.EventRegistration.update(regItem.id, { status: 'Attended' }).catch(() => {});

        // Kemaskini merit_points pelajar secara automatik
        if (studentObj) {
          const currentPts = Number(studentObj.merit_points) || 0;
          await base44.entities.Student.update(studentObj.id, {
            merit_points: currentPts + meritToAdd
          }).catch(() => {});
        }

        toast({
          title: 'Kehadiran Disahkan! ✓',
          description: `${studentName} disahkan hadir. +${meritToAdd} Mata Merit telah dikreditkan secara automatik!`
        });
      } else {
        // Batalkan kehadiran
        const existingAtt = await base44.entities.Attendance.filter({
          event_name: attendanceModalEvent.event_name,
          student_id: studentId
        });
        for (const a of existingAtt) {
          await base44.entities.Attendance.delete(a.id).catch(() => {});
        }
        await base44.entities.EventRegistration.update(regItem.id, { status: 'Registered' }).catch(() => {});

        if (studentObj) {
          const currentPts = Number(studentObj.merit_points) || 0;
          await base44.entities.Student.update(studentObj.id, {
            merit_points: Math.max(0, currentPts - meritToAdd)
          }).catch(() => {});
        }

        toast({ title: 'Status kehadiran dibatalkan' });
      }

      setEventAttendanceList(prev => prev.map(p => p.id === regItem.id ? { ...p, isPresent: makePresent, status: makePresent ? 'Attended' : 'Registered' } : p));
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat mengemas kini kehadiran', variant: 'destructive' });
    }
  }

  async function handleAddWalkInAttendance() {
    if (!walkInStudentId || !attendanceModalEvent) {
      toast({ title: 'Sila pilih pelajar walk-in', variant: 'destructive' });
      return;
    }
    const s = studentsList.find(st => st.id === walkInStudentId);
    if (!s) return;
    const meritToAdd = Number(attendanceModalEvent.merit_points) || 10;

    const existing = eventAttendanceList.find(p => p.student_id === s.student_id || p.student_name === s.full_name);
    if (existing) {
      if (existing.isPresent) {
        toast({ title: 'Pelajar ini telah pun disahkan hadir.' });
        return;
      }
      await toggleParticipantAttendance(existing, true);
      setWalkInStudentId('');
      return;
    }

    try {
      const newReg = await base44.entities.EventRegistration.create({
        event_id: attendanceModalEvent.id,
        event_name: attendanceModalEvent.event_name,
        student_user_id: s.user_id || s.id,
        student_name: s.full_name,
        student_id: s.student_id,
        registered_at: new Date().toISOString(),
        status: 'Attended'
      });

      await base44.entities.Attendance.create({
        student_id: s.id,
        student_name: s.full_name,
        event_type: 'Other',
        event_name: attendanceModalEvent.event_name,
        attendance_date: attendanceModalEvent.event_date || new Date().toISOString().split('T')[0],
        method: 'Event',
        status: 'Present'
      });

      const currentPts = Number(s.merit_points) || 0;
      await base44.entities.Student.update(s.id, {
        merit_points: currentPts + meritToAdd
      }).catch(() => {});

      await base44.entities.Event.update(attendanceModalEvent.id, {
        current_registrations: (attendanceModalEvent.current_registrations || 0) + 1
      }).catch(() => {});

      setEventAttendanceList(prev => [...prev, { ...newReg, isPresent: true }]);
      setWalkInStudentId('');
      toast({
        title: 'Walk-In Disahkan Hadir! 🎉',
        description: `${s.full_name} disahkan hadir. +${meritToAdd} Mata Merit telah dikreditkan!`
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat mendaftar walk-in', variant: 'destructive' });
    }
  }

  // =========================================================================
  // 4. PENDAFTARAN ACARA (EVENT REGISTRATION / RSVP)
  // =========================================================================
  async function register(ev) {
    if (!student) { 
      toast({ title: 'Lengkapkan profil anda terlebih dahulu', variant: 'destructive' }); 
      return; 
    }
    if (ev.felo_approval_status !== 'Approved') {
      toast({ title: 'Pendaftaran belum dibuka', description: 'Acara ini sedang menunggu kelulusan rasmi pentadbiran/felo.', variant: 'destructive' });
      return;
    }
    if (ev.registration_limit && ev.current_registrations >= ev.registration_limit) {
      toast({ title: 'Penyertaan acara telah penuh', variant: 'destructive' }); 
      return;
    }

    try {
      await base44.entities.EventRegistration.create({
        event_id: ev.id, 
        event_name: ev.event_name,
        student_user_id: user.id, 
        student_name: student.full_name,
        student_id: student.student_id, 
        registered_at: new Date().toISOString(),
        status: 'Registered'
      });
      await base44.entities.Event.update(ev.id, { current_registrations: (ev.current_registrations || 0) + 1 });
      toast({ title: `Berjaya mendaftar untuk ${ev.event_name}! 🎉` });
      init();
    } catch (err) {
      toast({ title: 'Ralat pendaftaran acara', variant: 'destructive' });
    }
  }

  async function cancelRegistration(ev) {
    const reg = myRegistrations.find(r => r.event_id === ev.id && r.status === 'Registered');
    if (!reg) return;
    try {
      await base44.entities.EventRegistration.update(reg.id, { status: 'Cancelled' });
      await base44.entities.Event.update(ev.id, { current_registrations: Math.max(0, (ev.current_registrations || 1) - 1) });
      toast({ title: 'Pendaftaran acara dibatalkan' });
      init();
    } catch (err) {
      toast({ title: 'Ralat pembatalan', variant: 'destructive' });
    }
  }

  async function viewParticipants(ev) {
    const regs = await base44.entities.EventRegistration.filter({ event_id: ev.id });
    setParticipants(regs || []);
    setViewingEvent(ev);
  }

  async function createEvent() {
    if (!form.event_name || !form.venue || !form.event_date) {
      toast({ title: 'Sila lengkapkan maklumat wajib (*)', variant: 'destructive' }); 
      return;
    }

    const isAdminRole = ['super_admin', 'college_admin', 'principal'].includes(user?.role);
    const initialApproval = isAdminRole ? 'Approved' : 'Pending';

    try {
      await base44.entities.Event.create({ 
        ...form, 
        organizer_user_id: user.id, 
        organizer: form.organizer || user.full_name || user.email,
        felo_approval_status: initialApproval,
        status: initialApproval === 'Approved' ? 'Upcoming' : 'Upcoming',
        merit_points: Number(form.merit_points) || 10
      });

      await logAudit(user, 'EVENT_CREATED', 'Events', { 
        name: form.event_name, 
        venue: form.venue, 
        date: form.event_date,
        approval: initialApproval
      });

      toast({ 
        title: initialApproval === 'Approved' ? 'Acara Berjaya Dicipta & Diluluskan! 🎉' : 'Kertas Cadangan Acara Dihantar! ⏳',
        description: initialApproval === 'Approved' ? 'Acara sedia untuk pendaftaran peserta.' : 'Menunggu kelulusan Felo Penyelaras & Pengetua Kolej.'
      });

      setShowForm(false);
      setForm(emptyForm);
      init();
    } catch (err) {
      toast({ title: 'Ralat mencipta acara', variant: 'destructive' });
    }
  }

  async function deleteEvent(id) {
    if (!confirm('Adakah anda pasti untuk memadam acara ini?')) return;
    try {
      await base44.entities.Event.delete(id);
      await logAudit(user, 'EVENT_DELETED', 'Events', { id });
      toast({ title: 'Acara berjaya dipadam' });
      init();
    } catch (err) {
      toast({ title: 'Ralat memadam acara', variant: 'destructive' });
    }
  }

  async function uploadPoster(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, poster_url: file_url }));
      toast({ title: 'Poster berjaya dimuat naik' });
    } catch (err) {
      toast({ title: 'Ralat muat naik poster', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function handleUpdateEventStatus(eventId, newStatus) {
    try {
      await base44.entities.Event.update(eventId, { status: newStatus });
      toast({ title: `Status acara dikemas kini kepada: ${newStatus}` });
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e));
    } catch (err) {
      toast({ title: 'Ralat mengemas kini status', variant: 'destructive' });
    }
  }

  const role = user?.effectiveRole || user?.role;
  const isRealStudent = user?.role === 'student' || user?.effectiveRole === 'student';
  const isStudent = viewModeOverride === 'student' || (viewModeOverride === 'auto' && isRealStudent);
  const canManage = !isStudent && user && MANAGE_ROLES.includes(role);
  const isPrincipalOrAdmin = user && ['super_admin', 'principal', 'college_admin'].includes(user?.role);
  const isFeloCoordinatorOrAdmin = user && ['super_admin', 'principal', 'college_admin', 'warden'].includes(user?.role);

  // Filter events based on statusFilter
  const filteredEvents = events.filter(ev => {
    const s = getEventDateStatus(ev);
    if (statusFilter === 'upcoming') return s.key === 'upcoming' || s.key === 'ongoing';
    if (statusFilter === 'past') return s.key === 'past';
    if (statusFilter === 'cancelled_postponed') return s.key === 'cancelled' || s.key === 'postponed';
    return true;
  });

  if (loading) return <div><PageHeader title="Acara & Program Kolej" description="Memuatkan senarai acara..." /><CardGridSkeleton count={6} /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acara & Program Kolej (Events)"
        description={
          canManage 
            ? "Pengurusan aktiviti kolej, kelulusan Felo Penyelaras & Pengetua, semakan kehadiran QR, dan merit automatik."
            : "Sertai program kolej, kumpul mata merit residen untuk tawaran penginapan kolej, dan semak status penyertaan anda."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {user && MANAGE_ROLES.includes(user.role) && (
              <Button
                size="sm"
                variant="outline"
                className={`rounded-xl font-semibold text-xs h-9 gap-1.5 transition-all ${
                  viewModeOverride === 'student' 
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400 shadow-xs' 
                    : 'hover:bg-primary/5 text-primary border-primary/30'
                }`}
                onClick={() => setViewModeOverride(prev => prev === 'student' ? 'admin' : 'student')}
              >
                <Eye className="w-3.5 h-3.5" />
                {viewModeOverride === 'student' ? 'Kembali ke Paparan Pentadbir' : 'Pratonton Paparan Pelajar'}
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={() => setShowForm(true)} className="rounded-xl font-bold bg-[#132644] hover:bg-[#1a335c] text-white gap-1.5 shadow-xs h-9">
                <Plus className="w-4 h-4" /> Cipta Acara Baharu
              </Button>
            )}
          </div>
        }
      />

      {/* STATUS FILTER TABS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border/80 p-2.5 rounded-2xl shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl"
            onClick={() => setStatusFilter('all')}
          >
            Semua Acara ({events.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'upcoming' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('upcoming')}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Akan Datang ({events.filter(e => { const s = getEventDateStatus(e); return s.key === 'upcoming' || s.key === 'ongoing'; }).length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'past' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('past')}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
            Sudah Berlalu ({events.filter(e => getEventDateStatus(e).key === 'past').length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'cancelled_postponed' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('cancelled_postponed')}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Dibatalkan / Ditangguhkan ({events.filter(e => { const s = getEventDateStatus(e); return s.key === 'cancelled' || s.key === 'postponed'; }).length})
          </Button>
        </div>

        {viewModeOverride === 'student' && (
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-400/30 flex items-center gap-1.5">
            <span>👁️ Paparan Residen/Pelajar Aktif (Merit Ditekankan)</span>
          </div>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-3xl text-muted-foreground p-6">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-bold text-base text-foreground">Tiada acara dalam kategori ini</p>
          <p className="text-xs text-muted-foreground mt-1">Sila tukar penapis status di atas untuk melihat acara lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(ev => {
            const isRegistered = isStudent && myRegistrations.some(r => r.event_id === ev.id && r.status === 'Registered');
            const isAttended = isStudent && myRegistrations.some(r => r.event_id === ev.id && r.status === 'Attended');
            const isFull = ev.registration_limit && ev.current_registrations >= ev.registration_limit;
            const isApproved = ev.felo_approval_status === 'Approved';
            const isRejected = ev.felo_approval_status === 'Rejected';
            const meritValue = ev.merit_points || 10;
            const statusInfo = getEventDateStatus(ev);

            return (
              <div key={ev.id} className="bg-card border border-border hover:border-indigo-300 dark:hover:border-indigo-800 rounded-3xl overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all">
                {ev.poster_url ? (
                  <img src={ev.poster_url} alt={ev.event_name} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-[#132644]/15 via-indigo-500/10 to-primary/5 flex items-center justify-center border-b border-border/50">
                    <Calendar className="w-12 h-12 text-primary/40" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-heading font-bold text-base leading-snug text-foreground">{ev.event_name}</h3>
                      <p className="text-[11px] text-muted-foreground">Penganjur: <span className="font-semibold text-foreground">{ev.organizer || 'Kolej Kediaman Tun Fuad'}</span></p>
                    </div>
                    {/* DYNAMIC STATUS BADGE MENGIKUT TARIKH & STATUS */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${statusInfo.badgeClass}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ev.description}</p>
                  )}

                  {/* METADATA INFO */}
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-3.5 rounded-2xl border border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{ev.venue}</span>
                      </div>
                      {/* MODALITY BADGE */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                        ev.modality === 'Dalam Talian'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                          : ev.modality === 'Hibrid'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40'
                          : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {ev.modality === 'Dalam Talian' 
                          ? `🌐 Dalam Talian (${ev.platform || 'Meet'})` 
                          : ev.modality === 'Hibrid' 
                          ? `🔄 Hibrid (${ev.platform || 'Online'})` 
                          : '🏢 Bersemuka'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        {ev.current_registrations || 0}{ev.registration_limit ? `/${ev.registration_limit}` : ''} Peserta
                      </span>
                      <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 text-[10px] font-bold">
                        +{meritValue} Merit
                      </Badge>
                    </div>

                    {/* DIRECT JOIN LINK FOR ONLINE / HYBRID SESSIONS */}
                    {(ev.modality === 'Dalam Talian' || ev.modality === 'Hibrid') && ev.meeting_link && (isRegistered || isAttended || canManage) && (
                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                        <a 
                          href={ev.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" /> Sertai Sesi {ev.platform || 'Dalam Talian'}
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* KHAS PAPARAN PELAJAR: GANJARAN & SUMBANGAN MATA MERIT (TANPA MAKLUMAT FELO PENYELARAS) */}
                  {!canManage && (
                    <div className="p-3.5 rounded-2xl border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Sumbangan Mata Merit
                        </span>
                        <Badge className="bg-emerald-600 text-white dark:bg-emerald-500 font-extrabold text-xs px-2.5 py-0.5 shadow-xs">
                          +{meritValue} Merit
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Penyertaan aktif dalam program ini menyumbang <span className="font-bold text-foreground">+{meritValue} mata merit</span> bagi memenuhi syarat kelayakan tawaran bilik Kolej Kediaman Tun Fuad semester hadapan.
                      </p>
                      {isAttended ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pt-1.5 border-t border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Kehadiran Disahkan • +{meritValue} Merit Telah Dikreditkan
                        </div>
                      ) : isRegistered ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 pt-1.5 border-t border-emerald-500/20">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Pendaftaran Berjaya • Sila imbas Kod QR di lokasi acara untuk tuntut merit
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* KHAS PENTADBIR / FELO / PENGETUA / JAKMAS: STATUS KELULUSAN FELO / PENGETUA */}
                  {canManage && (
                    <div className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                      isApproved 
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : isRejected
                        ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                        : 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-foreground">
                          <UserCog className="w-3.5 h-3.5 text-primary" /> Felo Penyelaras:
                        </span>
                        <Badge className={`text-[9px] font-bold ${
                          isApproved 
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40' 
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 animate-pulse'
                        }`}>
                          {isApproved ? '✓ Diluluskan' : isRejected ? '✕ Ditolak' : '⏳ Menunggu Kelulusan'}
                        </Badge>
                      </div>

                      <p className="font-bold text-xs text-foreground">
                        {ev.felo_coordinator_name || 'Pejabat Pentadbiran Felo KKTF'}
                      </p>

                      {isRejected && ev.rejection_reason && (
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 italic">
                          Catatan Penolakan: "{ev.rejection_reason}"
                        </p>
                      )}

                      {/* BUTANG TINDAKAN KELULUSAN (PENGETUA / FELO / ADMIN) */}
                      {!isApproved && !isRejected && isFeloCoordinatorOrAdmin && (
                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-amber-200/50 dark:border-amber-900/40">
                          <Button
                            size="sm"
                            onClick={() => handleApproveEvent(ev)}
                            className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1 shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Luluskan
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRejectModal(ev)}
                            className="h-8 text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Tolak
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTION BUTTONS (PENGANJUR & PESERTA) */}
                  <div className="flex flex-wrap gap-2 mt-auto pt-2">
                    {/* BUTTON 1: URUS KEHADIRAN & KOD QR (KHAS PENGANJUR/FELO/ADMIN) */}
                    {canManage && isApproved && (
                      <Button 
                        size="sm" 
                        onClick={() => openAttendanceModal(ev)}
                        className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-xs"
                      >
                        <QrCode className="w-4 h-4" /> Kehadiran & Kod QR
                      </Button>
                    )}

                    {/* BUTTON 2: AJK & MERIT MODAL */}
                    {canManage && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openAjkModal(ev)}
                        className="text-xs h-9 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold rounded-xl gap-1"
                      >
                        <Award className="w-3.5 h-3.5" /> AJK ({(() => {
                          try {
                            const ajk = JSON.parse(localStorage.getItem(`event_ajk_${ev.id}`) || '[]');
                            return ajk.length;
                          } catch(e) { return 0; }
                        })()})
                      </Button>
                    )}

                    {/* BUTTON 3: SENARAI PENDAFTAR */}
                    {canManage && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-9 rounded-xl text-muted-foreground" 
                        onClick={() => viewParticipants(ev)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> {ev.current_registrations || 0}
                      </Button>
                    )}

                    {/* STATUS AWARE ACTIONS (PELAJAR & STATUS PROGRAM) */}
                    {statusInfo.key === 'past' && (
                      <div className="w-full space-y-1.5">
                        {isAttended ? (
                          <div className="w-full p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-700 text-center">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" /> Kehadiran Disahkan (+{meritValue} Merit Dikreditkan)
                            </span>
                          </div>
                        ) : isRegistered ? (
                          <div className="w-full p-2 bg-muted rounded-xl border border-border text-center text-xs text-muted-foreground font-semibold">
                            Program Telah Selesai (Tidak Hadir)
                          </div>
                        ) : (
                          <div className="w-full p-2 bg-muted/60 rounded-xl border border-border/60 text-center text-xs text-muted-foreground font-medium">
                            Program Telah Selesai (Sudah Berlalu)
                          </div>
                        )}
                      </div>
                    )}

                    {statusInfo.key === 'cancelled' && (
                      <div className="w-full p-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-center text-xs text-rose-700 dark:text-rose-400 font-semibold">
                        Program Telah Dibatalkan
                      </div>
                    )}

                    {statusInfo.key === 'postponed' && (
                      <div className="w-full p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-center text-xs text-amber-700 dark:text-amber-400 font-semibold">
                        Program Ditangguhkan ke Tarikh Baharu
                      </div>
                    )}

                    {/* REGISTRATION ACTIONS FOR ACTIVE UPCOMING/ONGOING EVENTS */}
                    {(statusInfo.key === 'upcoming' || statusInfo.key === 'ongoing') && (
                      <>
                        {isStudent && isApproved && ev.registration_status === 'Open' && !isRegistered && !isAttended && !isFull && (
                          <Button size="sm" className="w-full text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl gap-1.5 shadow-xs" onClick={() => register(ev)}>
                            <UserCheck className="w-4 h-4" /> Daftar Program (+{meritValue} Merit)
                          </Button>
                        )}

                        {isStudent && !isApproved && (
                          <div className="w-full text-center p-2 rounded-xl bg-muted/60 text-muted-foreground text-xs font-medium">
                            Pendaftaran akan dibuka setelah kelulusan rasmi pentadbiran kolej.
                          </div>
                        )}

                        {isStudent && isApproved && isFull && !isRegistered && (
                          <div className="w-full text-center p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-xs font-semibold">
                            Kouta penyertaan program telah penuh ({ev.current_registrations}/{ev.registration_limit})
                          </div>
                        )}

                        {isStudent && isRegistered && !isAttended && (
                          <div className="w-full flex items-center justify-between gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Anda Telah Berdaftar
                            </span>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50" onClick={() => cancelRegistration(ev)}>
                              Batal
                            </Button>
                          </div>
                        )}

                        {isStudent && isAttended && (
                          <div className="w-full p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl border border-emerald-300 dark:border-emerald-700 text-center">
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" /> Kehadiran Disahkan (+{meritValue} Merit Dikreditkan)
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* ADMIN / PENYELARAS QUICK STATUS MANAGEMENT BUTTONS */}
                    {canManage && (
                      <div className="w-full pt-2 border-t border-border/60 flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-muted-foreground font-semibold text-[10px]">Tukar Status:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Kembali ke status automatik mengikut tarikh"
                            onClick={() => handleUpdateEventStatus(ev.id, 'Upcoming')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              statusInfo.key === 'upcoming' || statusInfo.key === 'past' || statusInfo.key === 'ongoing'
                                ? 'bg-primary text-primary-foreground shadow-xs' 
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            Auto Tarikh
                          </button>
                          <button
                            type="button"
                            title="Tangguhkan acara"
                            onClick={() => handleUpdateEventStatus(ev.id, 'Postponed')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              statusInfo.key === 'postponed' 
                                ? 'bg-amber-600 text-white shadow-xs' 
                                : 'bg-muted text-muted-foreground hover:bg-amber-100 dark:hover:bg-amber-950'
                            }`}
                          >
                            Tangguh
                          </button>
                          <button
                            type="button"
                            title="Batalkan acara"
                            onClick={() => handleUpdateEventStatus(ev.id, 'Cancelled')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                              statusInfo.key === 'cancelled' 
                                ? 'bg-rose-600 text-white shadow-xs' 
                                : 'bg-muted text-muted-foreground hover:bg-rose-100 dark:hover:bg-rose-950'
                            }`}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DELETE BUTTON */}
                    {canManage && (role === 'super_admin' || role === 'college_admin' || ev.organizer_user_id === user?.id) && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl shrink-0 ml-auto" onClick={() => deleteEvent(ev.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CIPTA ACARA BAHARU DENGAN CADANGAN FELO PENYELARAS               */}
      {/* ========================================================================= */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base">Cipta Acara / Kertas Cadangan Program</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Acara yang dicipta akan disemak dan diluluskan oleh Felo Penyelaras & Pengetua Kolej sebelum pendaftaran dibuka.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-2 text-xs">
            <div>
              <Label className="text-xs font-bold">Nama Acara / Program *</Label>
              <Input value={form.event_name} onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))} placeholder="cth: Karnival Sukan Kolej Tun Fuad" className="h-9 text-xs mt-1" />
            </div>

            <div>
              <Label className="text-xs font-bold">Keterangan Ringkas</Label>
              <textarea className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-16 mt-1 bg-background" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Penerangan aktiviti, objektif, dan syarat penyertaan..." />
            </div>

            {/* FELO PENYELARAS SELECTION (DARI PANGKALAN DATA SEBENAR) */}
            <div className="p-3.5 bg-indigo-50/30 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-2xl space-y-1.5">
              <Label className="text-xs font-bold text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-indigo-600" /> Cadangan Felo Penyelaras Program *
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
                  <SelectValue placeholder="Pilih Felo Penyelaras Rasmi" />
                </SelectTrigger>
                <SelectContent>
                  {felosList.map((f, i) => (
                    <SelectItem key={i} value={f.name}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Felo Penyelaras bertugas akan menyemak kertas kerja, memantau acara dan mengesahkan merit urusetia.</p>
            </div>

            {/* MODALITI & PLATFORM ACARA */}
            <div className="p-3.5 bg-muted/40 border border-border rounded-2xl space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold">Modaliti Program *</Label>
                  <Select 
                    value={form.modality || 'Bersemuka'} 
                    onValueChange={(val) => setForm(f => ({ 
                      ...f, 
                      modality: val,
                      venue: val === 'Dalam Talian' && (!f.venue || f.venue === 'Dewan Serbaguna KKTF')
                        ? `Atas Talian (${f.platform || 'Google Meet'})`
                        : f.venue
                    }))}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bersemuka">🏢 Bersemuka (Fizikal)</SelectItem>
                      <SelectItem value="Dalam Talian">🌐 Dalam Talian (Online)</SelectItem>
                      <SelectItem value="Hibrid">🔄 Hibrid (Bersemuka & Online)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(form.modality === 'Dalam Talian' || form.modality === 'Hibrid') ? (
                  <div>
                    <Label className="text-xs font-bold">Platform Sesi *</Label>
                    <Select 
                      value={form.platform || 'Google Meet'} 
                      onValueChange={(val) => setForm(f => ({ 
                        ...f, 
                        platform: val,
                        venue: f.modality === 'Dalam Talian' ? `Atas Talian (${val})` : f.venue
                      }))}
                    >
                      <SelectTrigger className="h-9 text-xs mt-1 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Google Meet">Google Meet</SelectItem>
                        <SelectItem value="Zoom">Zoom Meeting</SelectItem>
                        <SelectItem value="Cisco Webex">Cisco Webex</SelectItem>
                        <SelectItem value="YouTube Live">YouTube Live</SelectItem>
                        <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                        <SelectItem value="Lain-lain">Lain-lain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs font-bold">Penganjur</Label>
                    <Input value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="cth: JAKMAS KKTF" className="h-9 text-xs mt-1" />
                  </div>
                )}
              </div>

              {/* PAUTAN SESI DALAM TALIAN JIKA ONLINE ATAU HIBRID */}
              {(form.modality === 'Dalam Talian' || form.modality === 'Hibrid') && (
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <Label className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" /> Pautan Pertemuan / Sesi (Meeting URL) *
                  </Label>
                  <Input 
                    value={form.meeting_link || ''} 
                    onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} 
                    placeholder="cth: https://meet.google.com/abc-defg-hij atau https://zoom.us/j/..." 
                    className="h-9 text-xs bg-background font-mono" 
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Pelajar yang berdaftar akan menerima butang terus "Sertai Sesi Dalam Talian" untuk menyertai program.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold">
                  {form.modality === 'Dalam Talian' ? 'Lokasi Maya / Platform *' : 'Tempat (Venue Fizikal) *'}
                </Label>
                <Input 
                  value={form.venue} 
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} 
                  placeholder={form.modality === 'Dalam Talian' ? 'cth: Google Meet' : 'cth: Dewan Serbaguna KKTF'} 
                  className="h-9 text-xs mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Penganjur</Label>
                <Input value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="cth: JAKMAS KKTF" className="h-9 text-xs mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Tarikh *</Label><Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="h-9 text-xs mt-1" /></div>
              <div><Label className="text-xs font-bold">Masa</Label><Input type="time" value={form.event_time} onChange={e => setForm(f => ({ ...f, event_time: e.target.value }))} className="h-9 text-xs mt-1" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-bold">Had Peserta (Kuota)</Label><Input type="number" min="1" value={form.registration_limit} onChange={e => setForm(f => ({ ...f, registration_limit: Number(e.target.value) }))} className="h-9 text-xs mt-1" /></div>
              <div>
                <Label className="text-xs font-bold">Mata Merit Penyertaan</Label>
                <Input type="number" min="1" value={form.merit_points} onChange={e => setForm(f => ({ ...f, merit_points: Number(e.target.value) }))} className="h-9 text-xs mt-1" placeholder="cth: 10" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold">Poster Acara (Pilihan)</Label>
              <div className="mt-1 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={uploadPoster} className="text-xs" disabled={uploading} />
                {uploading && <span className="text-xs text-muted-foreground">Memuat naik...</span>}
                {form.poster_url && <span className="text-xs text-emerald-600 font-bold">✓ Poster sedia</span>}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="rounded-xl">Batal</Button>
              <Button size="sm" onClick={createEvent} className="bg-primary text-primary-foreground font-bold rounded-xl">Hantar Cadangan Acara</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: PENGURUSAN KEHADIRAN ACARA (KOD QR & LIVE ROSTER PESERTA)        */}
      {/* ========================================================================= */}
      <Dialog open={!!attendanceModalEvent} onOpenChange={() => setAttendanceModalEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" /> Urus Kehadiran & Kod QR Acara
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {attendanceModalEvent?.event_name} &bull; {attendanceModalEvent?.event_date} &bull; +{attendanceModalEvent?.merit_points || 10} Merit Kehadiran
            </DialogDescription>
          </DialogHeader>

          {attendanceModalEvent && (
            <div className="space-y-4 text-xs mt-2">
              {/* Tab Navigation */}
              <div className="flex border-b border-border pb-1 gap-2">
                <Button
                  size="sm"
                  variant={attendanceTab === 'qr' ? 'default' : 'ghost'}
                  onClick={() => setAttendanceTab('qr')}
                  className="rounded-xl text-xs font-bold gap-1.5 h-8"
                >
                  <ScanLine className="w-3.5 h-3.5" /> Papar Kod QR Acara
                </Button>
                <Button
                  size="sm"
                  variant={attendanceTab === 'roster' ? 'default' : 'ghost'}
                  onClick={() => setAttendanceTab('roster')}
                  className="rounded-xl text-xs font-bold gap-1.5 h-8"
                >
                  <Users className="w-3.5 h-3.5" /> Senarai Semak Kehadiran ({eventAttendanceList.filter(p => p.isPresent).length}/{eventAttendanceList.length})
                </Button>
              </div>

              {/* TAB 1: KOD QR KEHADIRAN */}
              {attendanceTab === 'qr' && (
                <div className="p-5 bg-gradient-to-br from-card to-muted/30 border border-border rounded-3xl text-center space-y-4">
                  <div>
                    <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-1">
                      KOD QR KEHADIRAN RASMI KKTF
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Pancarkan kod QR ini di skrin dewan atau paparkan kepada peserta untuk check-in kehadiran secara kendiri.
                    </p>
                  </div>

                  {/* QR Image Container */}
                  <div className="inline-block p-4 bg-white rounded-3xl shadow-lg border-2 border-emerald-500/30">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`KKTF-EVT|${attendanceModalEvent.id}|${attendanceModalEvent.event_name}|${attendanceModalEvent.event_date}`)}&color=0f172a&bgcolor=ffffff`}
                      alt="Event Attendance QR Code"
                      className="w-52 h-52 mx-auto"
                    />
                  </div>

                  {/* Token & Copy helper */}
                  <div className="max-w-md mx-auto p-3 bg-muted rounded-2xl border border-border flex items-center justify-between gap-2 text-left">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">Token Acara (Bagi Pendaftaran Manual/Kod):</p>
                      <code className="text-xs font-mono font-bold text-foreground break-all">
                        {`KKTF-EVT|${attendanceModalEvent.id}|${attendanceModalEvent.event_name}|${attendanceModalEvent.event_date}`}
                      </code>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`KKTF-EVT|${attendanceModalEvent.id}|${attendanceModalEvent.event_name}|${attendanceModalEvent.event_date}`);
                        setQrCopied(true);
                        setTimeout(() => setQrCopied(false), 2000);
                        toast({ title: 'Token acara disalin ke papan keratan!' });
                      }}
                      className="rounded-xl h-8 px-2.5 text-xs shrink-0"
                    >
                      {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                    ⚡ Apabila pelajar mengimbas kod ini, merit (+{attendanceModalEvent.merit_points || 10} mata) akan dikreditkan secara automatik ke profil mereka.
                  </p>
                </div>
              )}

              {/* TAB 2: ROSTER KEHADIRAN & WALK-IN */}
              {attendanceTab === 'roster' && (
                <div className="space-y-4">
                  {/* Walk-in quick register */}
                  <div className="p-3.5 bg-muted/40 rounded-2xl border border-border space-y-2">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-primary" /> Tambah Pelajar Walk-in & Sahkan Kehadiran Terus:
                    </p>
                    <div className="flex gap-2">
                      <Select value={walkInStudentId} onValueChange={setWalkInStudentId}>
                        <SelectTrigger className="h-8 text-xs bg-background flex-1">
                          <SelectValue placeholder="Pilih Pelajar daripada Senarai Kolej" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {studentsList.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name} ({s.student_id}) — {s.block_name || 'KKTF'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={handleAddWalkInAttendance} className="h-8 text-xs font-bold rounded-xl bg-primary gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> + Tandakan Hadir
                      </Button>
                    </div>
                  </div>

                  {/* Filter / Search Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        value={filterParticipantSearch}
                        onChange={e => setFilterParticipantSearch(e.target.value)}
                        placeholder="Cari nama atau no. matrik peserta..."
                        className="h-8 text-xs pl-8 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* List Table */}
                  <div className="border border-border rounded-2xl overflow-hidden bg-card divide-y divide-border max-h-72 overflow-y-auto">
                    {eventAttendanceList.length === 0 ? (
                      <p className="p-6 text-center text-muted-foreground text-xs">Tiada pendaftar bagi acara ini setakat ini.</p>
                    ) : (
                      eventAttendanceList
                        .filter(p => !filterParticipantSearch || p.student_name?.toLowerCase().includes(filterParticipantSearch.toLowerCase()) || p.student_id?.toLowerCase().includes(filterParticipantSearch.toLowerCase()))
                        .map(item => (
                          <div key={item.id} className="p-3 flex items-center justify-between hover:bg-muted/20">
                            <div>
                              <p className="font-bold text-xs text-foreground">{item.student_name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{item.student_id}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              {item.isPresent ? (
                                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400 text-[10px] font-bold">
                                  ✓ Hadir (+{attendanceModalEvent.merit_points || 10} Merit)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                  Belum Hadir
                                </Badge>
                              )}

                              <Button
                                size="sm"
                                variant={item.isPresent ? 'outline' : 'default'}
                                onClick={() => toggleParticipantAttendance(item, !item.isPresent)}
                                className={`h-7 text-[11px] font-bold rounded-xl px-2.5 ${
                                  item.isPresent 
                                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {item.isPresent ? 'Batal Hadir' : 'Tandakan Hadir'}
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PENGESAHAN MERIT AJK OLEH FELO PENYELARAS                        */}
      {/* ========================================================================= */}
      <Dialog open={!!ajkModalEvent} onOpenChange={() => setAjkModalEvent(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Urus Jawatankuasa (AJK) & Pengesahan Merit
            </DialogTitle>
          </DialogHeader>

          {ajkModalEvent && (
            <div className="space-y-4 text-xs mt-2">
              <div className="p-3.5 bg-muted/40 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground text-sm">{ajkModalEvent.event_name}</p>
                  <p className="text-[11px] text-muted-foreground">{ajkModalEvent.event_date} &bull; {ajkModalEvent.venue}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground font-semibold">Felo Penyelaras:</p>
                  <Badge className={`text-[9.5px] font-bold ${ajkModalEvent.felo_approval_status === 'Approved' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'}`}>
                    {ajkModalEvent.felo_coordinator_name || 'Felo KKTF'} ({ajkModalEvent.felo_approval_status === 'Approved' ? 'Sah Pengetua' : 'Menunggu Pengetua'})
                  </Badge>
                </div>
              </div>

              {/* FORM TO ADD NEW AJK */}
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
                      <SelectContent className="max-h-56">
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
                  {eventCommittees.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground text-xs">Belum ada lantikan AJK bagi acara ini.</p>
                  ) : (
                    eventCommittees.map((ajk, i) => (
                      <div key={ajk.id || i} className="p-3 flex items-center justify-between hover:bg-muted/20">
                        <div>
                          <p className="font-bold text-foreground text-xs">{ajk.student_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{ajk.student_id} &bull; <span className="text-indigo-600 dark:text-indigo-400 font-bold">{ajk.role_title}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-600 text-xs">+{ajk.points} Mata</span>
                          <Badge className={`text-[9px] font-bold ${ajk.status === 'Endorsed' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'}`}>
                            {ajk.status === 'Endorsed' ? 'Disahkan Felo' : 'Menunggu Perakuan Felo'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* FELO ENDORSEMENT ACTION BUTTON */}
              {(isFeloCoordinatorOrAdmin) && (
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Pengesahan oleh Felo Penyelaras Program</p>
                  <Button 
                    onClick={handleApproveAllAjkMerit}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" /> Sahkan & Kreditkan Merit AJK
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: PENOLAKAN KERTAS KERJA / CADANGAN ACARA                           */}
      {/* ========================================================================= */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl text-xs">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Penolakan Kertas Cadangan Acara
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nyatakan sebab penolakan atau perkara yang perlu ditambah baik oleh penganjur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs font-bold">Catatan / Sebab Penolakan *</Label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="cth: Tarikh bertembung dengan program universiti, mohon pinda jadual..."
                className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-20 mt-1 bg-background"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="rounded-xl">Batal</Button>
              <Button size="sm" onClick={handleConfirmReject} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
                Sahkan Penolakan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: SENARAI PESERTA BERDAFTAR                                        */}
      {/* ========================================================================= */}
      {viewingEvent && (
        <Dialog open={!!viewingEvent} onOpenChange={() => { setViewingEvent(null); setParticipants([]); }}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-base">Senarai Peserta — {viewingEvent.event_name}</DialogTitle>
              <div className="flex items-center gap-2 pt-1 mb-2">
                <span className="text-xs text-muted-foreground">{participants.length} orang telah mendaftar</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                  viewingEvent.modality === 'Dalam Talian'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40'
                    : viewingEvent.modality === 'Hibrid'
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40'
                    : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300'
                }`}>
                  {viewingEvent.modality === 'Dalam Talian' 
                    ? `🌐 Dalam Talian (${viewingEvent.platform || 'Meet'})` 
                    : viewingEvent.modality === 'Hibrid' 
                    ? `🔄 Hibrid (${viewingEvent.platform || 'Online'})` 
                    : '🏢 Bersemuka'}
                </span>
              </div>
            </DialogHeader>
            {participants.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-6">Tiada pendaftaran setakat ini.</p>
            ) : (
              <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden bg-card">
                {participants.map((p, i) => (
                  <div key={p.id || i} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground">{p.student_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.student_id}</p>
                    </div>
                    <Badge className={`text-[9.5px] ${p.status === 'Attended' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                      {p.status === 'Attended' ? '✓ Hadir' : 'Berdaftar'}
                    </Badge>
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