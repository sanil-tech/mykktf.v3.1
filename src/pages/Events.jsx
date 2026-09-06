import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Sparkles,
  Pencil,
  FileText,
  Camera,
  Keyboard,
  Loader2,
  Megaphone,
  TrendingUp,
  Send,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { computeEffectiveRole, fetchActiveJakmasAppointment } from '@/lib/jakmas';
import { logAudit } from '@/lib/audit';
import { showPhoneNotification } from '@/lib/pushNotifications';
import PrincipalEventDetailModal from '@/components/PrincipalEventDetailModal';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';

const MANAGE_ROLES = ['super_admin', 'principal', 'college_admin', 'warden', 'staff', 'jakmas'];

export function getEventModalityInfo(ev) {
  if (!ev) return {
    modality: 'Bersemuka',
    platform: '',
    meeting_link: '',
    label: '🏢 Bersemuka',
    colorClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
  };

  let rawModality = ev.modality;
  let rawPlatform = ev.platform;
  let rawLink = ev.meeting_link;

  // Semak cache localStorage sekiranya medan ini belum ada dalam skema lama Base44
  try {
    const meta = JSON.parse(localStorage.getItem(`mykktf_event_meta_${ev.id}`) || '{}');
    if (meta.modality) rawModality = meta.modality;
    if (meta.platform) rawPlatform = meta.platform;
    if (meta.meeting_link) rawLink = meta.meeting_link;
  } catch (e) {}

  // Semak jika terdapat tag modality dalam deskripsi
  if (!rawModality && ev.description) {
    const match = ev.description.match(/\[Modality:\s*([^\]]+)\]/i);
    if (match) rawModality = match[1];
  }

  const mStr = String(rawModality || '').trim().toLowerCase();
  const desc = String(ev.description || '').toLowerCase();
  const name = String(ev.event_name || '').toLowerCase();
  const venue = String(ev.venue || '').toLowerCase();

  // Pengesanan fleksibel format Hibrid (ejaan BM/BI, kata kunci, atau ada link Google Meet/Zoom berserta venue fizikal)
  const isHybrid = 
    mStr.includes('hibrid') || 
    mStr.includes('hybrid') || 
    desc.includes('hibrid') || 
    desc.includes('hybrid') || 
    name.includes('hibrid') || 
    name.includes('hybrid') ||
    Boolean(rawLink && venue && !venue.startsWith('atas talian') && !venue.startsWith('online'));

  const isOnline = 
    !isHybrid && (
      mStr.includes('talian') || 
      mStr.includes('online') || 
      mStr.includes('maya') || 
      desc.includes('dalam talian') || 
      venue.includes('atas talian') || 
      venue.includes('google meet') || 
      venue.includes('zoom')
    );

  if (isHybrid) {
    const plat = rawPlatform || (rawLink?.includes('zoom') ? 'Zoom' : 'Google Meet');
    return {
      modality: 'Hibrid',
      platform: plat,
      meeting_link: rawLink || ev.meeting_link,
      label: `🔄 Hibrid (${plat})`,
      colorClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40'
    };
  }

  if (isOnline) {
    const plat = rawPlatform || (rawLink?.includes('zoom') ? 'Zoom' : 'Google Meet');
    return {
      modality: 'Dalam Talian',
      platform: plat,
      meeting_link: rawLink || ev.meeting_link,
      label: `🌐 Dalam Talian (${plat})`,
      colorClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40'
    };
  }

  return {
    modality: 'Bersemuka',
    platform: '',
    meeting_link: '',
    label: '🏢 Bersemuka',
    colorClass: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
  };
}

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
  const [cancellingId, setCancellingId] = useState(null);

  // AJK & Committee Management Modal State
  const [ajkModalEvent, setAjkModalEvent] = useState(null);
  const [eventCommittees, setEventCommittees] = useState([]);
  const [ajkForm, setAjkForm] = useState({
    student_id: '',
    role_title: 'AJK Pelaksana / Urusetia',
    points: 20
  });

  // Attendance Management State (QR Attendance Only)
  const [attendanceModalEvent, setAttendanceModalEvent] = useState(null);
  const [eventAttendanceList, setEventAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceTab, setAttendanceTab] = useState('qr'); // 'qr' | 'roster'
  const [qrCopied, setQrCopied] = useState(false);
  const [filterParticipantSearch, setFilterParticipantSearch] = useState('');

  // Rejection Dialog State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Quick Modality Change Modal State
  const [quickModalityEvent, setQuickModalityEvent] = useState(null);
  const [quickModalityForm, setQuickModalityForm] = useState({
    modality: 'Hibrid',
    platform: 'Google Meet',
    meeting_link: ''
  });

  // Principal Event Dossier / Review Modal State
  const [selectedEventForReview, setSelectedEventForReview] = useState(null);

  // Organizer Announcement Blast Modal State (Hebahan Program Khas Sekiranya Kurang Peserta)
  const [blastModalOpen, setBlastModalOpen] = useState(false);
  const [blastingEvent, setBlastingEvent] = useState(null);
  const [blastMessage, setBlastMessage] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);

  function openBlastModal(ev) {
    if (!ev) return;
    const limit = Number(ev.registration_limit) || 50;
    const regCount = Number(ev.registered_count ?? ev.current_registrations ?? 0);
    const remaining = Math.max(0, limit - regCount);
    const meritValue = ev.merit_points ? Number(ev.merit_points) : 10;
    
    setBlastingEvent(ev);
    setBlastMessage(
      `Peringatan kepada semua residen KKTF!\n\nPendaftaran untuk program "${ev.event_name}" kini sedang dibuka. Masih terdapat ${remaining} kekosongan kuota (daripada sasaran ${limit} peserta).\n\n📅 Tarikh: ${ev.event_date || 'Akan Datang'}${ev.event_time ? ` · ${ev.event_time}` : ''}\n📍 Tempat: ${ev.venue || 'KKTF'}\n🏆 Ganjaran: +${meritValue} Mata Merit Kolej\n\nSila daftar segera dalam menu 'Events' aplikasi MyKKTF sebelum kuota penuh!`
    );
    setBlastModalOpen(true);
  }

  async function handleConfirmBlast() {
    if (!blastingEvent) return;
    setIsBlasting(true);
    try {
      const ev = blastingEvent;
      const meritValue = ev.merit_points ? Number(ev.merit_points) : 10;

      // 1. Cipta Hebahan Rasmi ke Papan Kenyataan / Announcement Board
      await base44.entities.Announcement.create({
        title: `📢 Peringatan Pendaftaran: ${ev.event_name}`,
        content: blastMessage,
        type: 'Event Notice',
        priority: 'Important',
        publish_date: new Date().toISOString().split('T')[0],
        published_by: user?.full_name || 'Urusetia Program KKTF',
        approval_status: 'published',
        poster_url: ev.poster_url || ''
      }).catch(e => console.warn('Announcement creation fallback:', e));

      // 2. Hantar Notifikasi Dalam Aplikasi (In-App Bell) kepada Pelajar
      const activeStudents = await base44.entities.Student.filter({ status: 'Active' }).catch(() => []);
      const notifiedUsers = new Set();
      if (user?.id) notifiedUsers.add(user.id);

      const targetStudents = (activeStudents || []).filter(s => s.user_id && !notifiedUsers.has(s.user_id));
      await Promise.allSettled(
        targetStudents.slice(0, 150).map(s => 
          base44.entities.Notification.create({
            user_id: s.user_id,
            title: `📢 Hebahan Peringatan: ${ev.event_name}`,
            message: `Kekosongan masih dibuka untuk "${ev.event_name}". Rebut +${meritValue} Merit Kolej sekarang!`,
            type: 'event',
            link: '/events'
          })
        )
      );

      // 3. Web Push Notification telefon
      showPhoneNotification(
        `📢 Peringatan: ${ev.event_name}`,
        `Kekosongan pendaftaran masih dibuka (+${meritValue} Merit). Sila daftar segera di MyKKTF!`,
        '/events'
      ).catch(() => {});

      await logAudit(user, 'EVENT_ANNOUNCEMENT_BLASTED', 'Events', {
        event_id: ev.id,
        event_name: ev.event_name,
        target_count: targetStudents.length
      });

      toast({
        title: '🎉 Hebahan Peringatan Berjaya Disiarkan!',
        description: `Notis hebahan untuk "${ev.event_name}" telah dipaparkan di Papan Kenyataan & notifikasi dihantar kepada ${targetStudents.length} residen.`
      });

      setBlastModalOpen(false);
      setBlastingEvent(null);
    } catch (err) {
      console.error('Ralat menyiarkan hebahan:', err);
      toast({
        title: 'Ralat menyiarkan hebahan',
        description: 'Sila cuba lagi atau hubungi pentadbir kolej.',
        variant: 'destructive'
      });
    } finally {
      setIsBlasting(false);
    }
  }

  // Student QR Scanner Modal State & Refs
  const [studentScanModalOpen, setStudentScanModalOpen] = useState(false);
  const [studentScannerTargetEvent, setStudentScannerTargetEvent] = useState(null);
  const [studentScannerMode, setStudentScannerMode] = useState('camera'); // 'camera' | 'manual'
  const [studentScannerActive, setStudentScannerActive] = useState(false);
  const [studentScannerError, setStudentScannerError] = useState('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [isProcessingStudentScan, setIsProcessingStudentScan] = useState(false);
  const studentHtml5QrCodeRef = useRef(null);
  const studentIsProcessingRef = useRef(false);

  function openStudentScannerModal(ev = null) {
    setStudentScannerTargetEvent(ev);
    setManualTokenInput(ev ? `KKTF-EVT|${ev.id}|${ev.event_name}|${ev.event_date}` : '');
    setStudentScannerMode('camera');
    setStudentScannerError('');
    setIsProcessingStudentScan(false);
    studentIsProcessingRef.current = false;
    setStudentScanModalOpen(true);
  }

  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const startStudentCamera = async () => {
    setStudentScannerError('');
    setStudentScannerActive(false);
    studentIsProcessingRef.current = false;

    try {
      await stopStudentCamera();
      const qrScanner = new Html5Qrcode('student-event-attendance-reader');
      studentHtml5QrCodeRef.current = qrScanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await qrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!studentIsProcessingRef.current) {
            studentIsProcessingRef.current = true;
            processStudentAttendanceQr(decodedText);
          }
        },
        () => {}
      );
      setStudentScannerActive(true);
    } catch (err) {
      console.error('Kamera gagal dimulakan:', err);
      setStudentScannerError('Kamera tidak dapat diakses atau kebenaran belum diberikan. Sila gunakan tab "Input Kod Manual".');
      setStudentScannerActive(false);
    }
  };

  const stopStudentCamera = async () => {
    const scanner = studentHtml5QrCodeRef.current;
    if (scanner) {
      studentHtml5QrCodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setStudentScannerActive(false);
  };

  const closeStudentScannerModal = () => {
    stopStudentCamera();
    setStudentScanModalOpen(false);
    setStudentScannerTargetEvent(null);
    setManualTokenInput('');
    setStudentScannerError('');
    setIsProcessingStudentScan(false);
    studentIsProcessingRef.current = false;
  };

  async function processStudentAttendanceQr(rawToken) {
    const token = (rawToken || '').trim();
    if (!token) {
      toast({ title: 'Sila masukkan kod QR / token acara', variant: 'destructive' });
      return;
    }

    setIsProcessingStudentScan(true);

    try {
      let parsedEventId = null;
      let parsedEventName = '';
      let parsedEventDate = new Date().toISOString().split('T')[0];

      if (token.startsWith('KKTF-EVT|')) {
        const parts = token.split('|');
        parsedEventId = parts[1];
        parsedEventName = parts[2] || '';
        parsedEventDate = parts[3] || parsedEventDate;
      } else if (token.includes('|')) {
        const parts = token.split('|');
        parsedEventName = parts[0];
        parsedEventDate = parts[2] || parsedEventDate;
      } else {
        parsedEventId = token;
      }

      // Cari acara padanan
      const targetEv = events.find(e => 
        (parsedEventId && e.id === parsedEventId) ||
        (parsedEventName && e.event_name && e.event_name.toLowerCase() === parsedEventName.toLowerCase()) ||
        (studentScannerTargetEvent && e.id === studentScannerTargetEvent.id)
      ) || studentScannerTargetEvent;

      if (!targetEv && !parsedEventName) {
        toast({
          title: 'Kod QR Tidak Sah',
          description: 'Kod QR ini bukan daripada program kolej yang berdaftar.',
          variant: 'destructive'
        });
        setIsProcessingStudentScan(false);
        studentIsProcessingRef.current = false;
        return;
      }

      const eventName = targetEv?.event_name || parsedEventName;
      const eventId = targetEv?.id || parsedEventId;
      const eventDate = targetEv?.event_date || parsedEventDate;
      const meritToAdd = Number(targetEv?.merit_points) || 10;

      const studentName = student?.full_name || user?.full_name || (user?.email ? user.email.split('@')[0] : 'Residen KKTF');
      const studentId = student?.id || user?.id;
      const studentMatric = student?.student_id || user?.student_id || user?.matric_no || (user?.id ? user.id.slice(0, 10).toUpperCase() : 'KKTF');

      // Semak jika kehadiran sudah direkodkan
      const existingAttendance = await base44.entities.Attendance.filter({
        event_name: eventName,
        student_id: studentId
      }).catch(() => []);

      if (existingAttendance && existingAttendance.length > 0) {
        toast({
          title: 'Kehadiran Telah Disahkan! ✓',
          description: `Anda telah pun direkodkan hadir bagi "${eventName}". Mata merit telah dikreditkan ke akaun anda.`
        });
        closeStudentScannerModal();
        return;
      }

      // 1. Rekod Kehadiran dalam Entity Attendance (dengan safe event_type enum)
      const validTypes = ["Assembly", "Briefing", "Emergency Drill", "Sports Activity", "Program Kolej", "Event", "Other"];
      const safeEventType = validTypes.includes(targetEv?.category) ? targetEv.category : "Program Kolej";

      await base44.entities.Attendance.create({
        student_id: studentId,
        student_name: studentName,
        event_id: eventId || '',
        event_type: safeEventType,
        event_name: eventName,
        attendance_date: eventDate,
        method: 'QR Code',
        status: 'Present'
      });

      // 2. Kemas kini rekod EventRegistration kepada 'Attended'
      let regToUpdate = myRegistrations.find(r => (eventId && r.event_id === eventId) || (r.event_name === eventName));
      if (regToUpdate?.id) {
        await base44.entities.EventRegistration.update(regToUpdate.id, { status: 'Attended' }).catch(() => {});
      } else if (eventId) {
        // Jika pelajar belum mendaftar awal tetapi terus hadir di lokasi imbas QR
        await base44.entities.EventRegistration.create({
          event_id: eventId,
          event_name: eventName,
          student_user_id: user?.id || studentId,
          student_name: studentName,
          student_id: studentMatric,
          registered_at: new Date().toISOString(),
          status: 'Attended'
        }).catch(() => null);
      }

      // 3. Tambah Merit pada Profil Pelajar
      if (student?.id) {
        const curMerit = Number(student.merit_points) || 0;
        await base44.entities.Student.update(student.id, {
          merit_points: curMerit + meritToAdd
        }).catch((err) => console.warn('Student merit update warning:', err));
        setStudent(prev => prev ? { ...prev, merit_points: (Number(prev.merit_points) || 0) + meritToAdd } : prev);
      }

      // 4. Kemas kini state myRegistrations tempatan
      setMyRegistrations(prev => {
        const exists = prev.some(r => r.event_id === eventId);
        if (exists) {
          return prev.map(r => r.event_id === eventId ? { ...r, status: 'Attended' } : r);
        } else {
          return [...prev, { event_id: eventId, event_name: eventName, status: 'Attended' }];
        }
      });

      await logAudit(user, 'ATTENDANCE_QR_SCANNED', 'Events', {
        event_id: eventId,
        event_name: eventName,
        student_name: studentName,
        merit_awarded: meritToAdd
      });

      // 5. Kesan bunyi & konfeti
      playSuccessChime();
      try {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      toast({
        title: '🎉 Kehadiran Berjaya Disahkan!',
        description: `Tahniah! +${meritToAdd} Mata Merit telah dikreditkan ke profil anda untuk "${eventName}".`
      });

      closeStudentScannerModal();
      init();
    } catch (err) {
      console.error('Ralat pemprosesan kehadiran QR:', err);
      toast({
        title: 'Ralat menyimpan kehadiran',
        description: 'Sila cuba lagi atau hubungi Felo / Urusetia bertugas.',
        variant: 'destructive'
      });
      setIsProcessingStudentScan(false);
      studentIsProcessingRef.current = false;
    }
  }

  useEffect(() => {
    if (studentScanModalOpen && studentScannerMode === 'camera') {
      studentIsProcessingRef.current = false;
      const timer = setTimeout(() => {
        startStudentCamera();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopStudentCamera();
    }
  }, [studentScanModalOpen, studentScannerMode]);

  useEffect(() => {
    return () => {
      stopStudentCamera();
    };
  }, []);

  function openQuickModalityModal(ev) {
    const info = getEventModalityInfo(ev);
    setQuickModalityEvent(ev);
    setQuickModalityForm({
      modality: info.modality,
      platform: info.platform || 'Google Meet',
      meeting_link: info.meeting_link || ev.meeting_link || ''
    });
  }

  async function handleSaveQuickModality() {
    if (!quickModalityEvent) return;
    try {
      const updatedFields = {
        modality: quickModalityForm.modality,
        platform: quickModalityForm.platform,
        meeting_link: quickModalityForm.meeting_link
      };
      await base44.entities.Event.update(quickModalityEvent.id, updatedFields).catch(() => {});
      localStorage.setItem(`mykktf_event_meta_${quickModalityEvent.id}`, JSON.stringify(updatedFields));
      setEvents(prev => prev.map(e => e.id === quickModalityEvent.id ? { ...e, ...updatedFields } : e));
      toast({
        title: 'Modaliti Acara Dikemas Kini! 🎉',
        description: `Format acara "${quickModalityEvent.event_name}" kini ditetapkan sebagai ${quickModalityForm.modality}.`
      });
      setQuickModalityEvent(null);
    } catch (err) {
      toast({ title: 'Ralat mengemas kini modaliti', variant: 'destructive' });
    }
  }

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const raw = await base44.auth.me();
      const appt = await fetchActiveJakmasAppointment(raw?.id);
      const u = raw ? { ...raw, effectiveRole: computeEffectiveRole(raw.role, appt), jakmasAppointment: appt } : null;
      setUser(u);
      
      const [evs, sList, wBlocks, allRegs, allAtts] = await Promise.all([
        base44.entities.Event.list('-event_date'),
        base44.entities.Student.list(),
        base44.entities.WardenBlock.list().catch(() => []),
        base44.entities.EventRegistration.list().catch(() => []),
        base44.entities.Attendance.list().catch(() => [])
      ]);
      
      // Petakan pendaftaran awal dan kehadiran sebenar mengikut event_id / event_name
      const regMap = {};
      const attMap = {};

      (allRegs || []).forEach(r => {
        if (r.status === 'Cancelled') return;
        const eId = r.event_id;
        const eName = (r.event_name || '').trim().toLowerCase();
        
        if (eId) {
          if (!regMap[eId]) regMap[eId] = [];
          regMap[eId].push(r);
        }
        if (eName) {
          if (!regMap[eName]) regMap[eName] = [];
          regMap[eName].push(r);
        }
      });

      (allAtts || []).forEach(a => {
        if (a.status !== 'Present') return;
        const eId = a.event_id;
        const eName = (a.event_name || '').trim().toLowerCase();

        if (eId) {
          if (!attMap[eId]) attMap[eId] = new Set();
          attMap[eId].add(a.student_id || a.student_name);
        }
        if (eName) {
          if (!attMap[eName]) attMap[eName] = new Set();
          attMap[eName].add(a.student_id || a.student_name);
        }
      });

      const enhancedEvs = (evs || []).map(ev => {
        let meta = {};
        try {
          meta = JSON.parse(localStorage.getItem(`mykktf_event_meta_${ev.id}`) || '{}');
        } catch (e) {}

        const evNameLower = (ev.event_name || '').trim().toLowerCase();
        
        // Pendaftaran awal: Kira rekod EventRegistration aktif yang unik
        const regsForEv = regMap[ev.id] || regMap[evNameLower] || [];
        const uniqueRegs = new Set();
        regsForEv.forEach(r => {
          const sKey = r.student_user_id || r.student_id || r.student_name;
          if (sKey) uniqueRegs.add(sKey);
        });
        const registeredCount = Math.max(uniqueRegs.size, Number(ev.current_registrations) || 0);

        // Kehadiran sebenar (Imbas Kod QR): Kira pelajar unik yang sah hadir
        const attendedSet = new Set(attMap[ev.id] || attMap[evNameLower] || []);
        regsForEv.forEach(r => {
          if (r.status === 'Attended') {
            const sKey = r.student_user_id || r.student_id || r.student_name;
            if (sKey) attendedSet.add(sKey);
          }
        });
        const attendedCount = attendedSet.size;

        // Sekiranya pendaftaran DB semasa berbeza daripada bilangan sebenar, kemas kini secara senyap
        if (ev.current_registrations !== registeredCount && ev.id && uniqueRegs.size > 0) {
          base44.entities.Event.update(ev.id, { current_registrations: registeredCount }).catch(() => {});
        }

        return {
          ...ev,
          modality: meta.modality || ev.modality,
          platform: meta.platform || ev.platform,
          meeting_link: meta.meeting_link || ev.meeting_link,
          registered_count: registeredCount,
          attended_count: attendedCount,
          current_registrations: registeredCount
        };
      });

      setEvents(enhancedEvs);
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

      // Cari profil pelajar secara komprehensif sama ada melalui sList atau query terus
      if (u) {
        let currentStudent = (sList || []).find(s => 
          (u.id && s.user_id === u.id) ||
          (u.email && s.email && s.email.toLowerCase() === u.email.toLowerCase()) ||
          (u.student_id && s.student_id && s.student_id.toLowerCase() === u.student_id.toLowerCase())
        );

        if (!currentStudent && u.id) {
          const byUserId = await base44.entities.Student.filter({ user_id: u.id }).catch(() => []);
          if (byUserId.length > 0) currentStudent = byUserId[0];
        }
        if (!currentStudent && u.email) {
          const byEmail = await base44.entities.Student.filter({ email: u.email }).catch(() => []);
          if (byEmail.length > 0) currentStudent = byEmail[0];
        }
        // Fallback data profil sekiranya belum wujud dalam table Student
        if (!currentStudent) {
          currentStudent = {
            id: u.id,
            user_id: u.id,
            full_name: u.full_name || u.name || (u.email ? u.email.split('@')[0] : 'Residen KKTF'),
            student_id: u.student_id || u.matric_no || (u.id ? u.id.slice(0, 10).toUpperCase() : 'KKTF'),
            email: u.email || '',
            merit_points: 0
          };
        }
        setStudent(currentStudent);

        // Muatkan pendaftaran acara pengguna ini (cepat melalui allRegs atau fallback filter)
        const userRegs = (allRegs || []).filter(r => 
          (u.id && r.student_user_id === u.id) ||
          (currentStudent.student_id && r.student_id === currentStudent.student_id)
        );
        setMyRegistrations(userRegs.length > 0 ? userRegs : (await base44.entities.EventRegistration.filter({ student_user_id: u.id }).catch(() => [])));
      }
    } catch (err) {
      console.error("Ralat memuatkan acara:", err);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // 1. ALIRAN KELULUSAN ACARA (EVENT APPROVAL & NOTIFICATION FLOW)
  // =========================================================================
  async function dispatchEventApprovalNotifications(ev, actorUser) {
    try {
      const eventName = ev.event_name || 'Acara Baharu';
      const eventDate = ev.event_date || 'Akan dimaklumkan';
      const eventTime = ev.event_time ? ` @ ${ev.event_time}` : '';
      const modalityStr = ev.modality || 'Bersemuka';
      const venueStr = ev.venue || (ev.modality === 'Dalam Talian' ? (ev.platform || 'Atas Talian') : 'KKTF');
      const meritStr = ev.merit_points ? `+${ev.merit_points} Mata Merit` : '+10 Mata Merit';

      // 1. Cipta Hebahan Rasmi ke Papan Kenyataan / Announcement Board (kategori 'Event Notice')
      // Secara automatik muncul di Dashboard Pelajar (StudentDashboard) & Halaman Announcements
      await base44.entities.Announcement.create({
        title: `Acara Baharu: ${eventName}`,
        content: `Acara kolej "${eventName}" telah diluluskan rasmi oleh pihak Pengurusan/Felo KKTF dan kini dibuka untuk pendaftaran residen.\n\n📅 Tarikh: ${eventDate}${eventTime}\n📍 Mod / Lokasi: ${modalityStr} (${venueStr})\n🏆 Ganjaran: ${meritStr} Kolej\n\nSila layari menu 'Events' dalam aplikasi MyKKTF untuk mendaftar sekarang sebelum kuota penuh!`,
        type: 'Event Notice',
        priority: 'Important',
        publish_date: new Date().toISOString().split('T')[0],
        published_by: actorUser?.full_name || 'Pentadbiran Kolej Kediaman Tun Fuad',
        approval_status: 'published',
        poster_url: ev.poster_url || ''
      }).catch(e => console.warn('Announcement creation fallback:', e));

      // 2. Notifikasi Terus kepada Penganjur / Pemohon Kertas Cadangan (Organizer)
      if (ev.organizer_user_id && ev.organizer_user_id !== actorUser?.id) {
        await base44.entities.Notification.create({
          user_id: ev.organizer_user_id,
          title: `🎉 Kertas Cadangan Diluluskan: ${eventName}`,
          message: `Tahniah! Acara "${eventName}" telah rasmi diluluskan oleh ${actorUser?.full_name || 'Felo Penyelaras'}. Hebahan telah disiarkan kepada semua residen dan sistem pendaftaran kini dibuka.`,
          type: 'event',
          link: '/events'
        }).catch(e => console.warn('Organizer notification error:', e));
      }

      // 3. Notifikasi Dalam Aplikasi (In-App Bell) kepada Pelajar / Residen
      const activeStudents = await base44.entities.Student.filter({ status: 'Active' }).catch(() => []);
      const notifiedUsers = new Set();
      if (ev.organizer_user_id) notifiedUsers.add(ev.organizer_user_id);
      if (actorUser?.id) notifiedUsers.add(actorUser.id);

      const targetStudents = (activeStudents || []).filter(s => s.user_id && !notifiedUsers.has(s.user_id));
      await Promise.allSettled(
        targetStudents.slice(0, 100).map(s => 
          base44.entities.Notification.create({
            user_id: s.user_id,
            title: `📢 Acara Baharu: ${eventName}`,
            message: `Acara "${eventName}" (${modalityStr}) sedia untuk pendaftaran. Rebut ${meritStr} sekarang!`,
            type: 'event',
            link: '/events'
          })
        )
      );

      // 4. Web Push Notification / Notifikasi Tolak Telefon
      showPhoneNotification(
        `Acara Baharu: ${eventName} 🎉`,
        `Tarikh: ${eventDate}. Dapatkan ${meritStr}! Daftar di MyKKTF.`,
        '/events'
      ).catch(() => {});

      // 5. Trigger broadcast email/cloud notification jika disokong
      if (base44?.functions?.invoke) {
        base44.functions.invoke('sendNotificationEmail', { 
          type: 'announcement', 
          title: `Acara Baharu: ${eventName}`, 
          message: `Acara "${eventName}" telah diluluskan rasmi dan dibuka untuk pendaftaran. Tarikh: ${eventDate}.` 
        }).catch(() => {});
      }
    } catch (dispatchErr) {
      console.warn('Dispatch notification warning:', dispatchErr);
    }
  }

  async function handleApproveEvent(ev, principalNotes = '') {
    try {
      const updatePayload = { 
        felo_approval_status: 'Approved',
        status: 'Upcoming'
      };
      if (principalNotes) {
        updatePayload.principal_notes = principalNotes;
      }
      await base44.entities.Event.update(ev.id, updatePayload);

      // Simpan juga ke cache tempatan
      try {
        const metaKey = `mykktf_event_meta_${ev.id}`;
        const existingMeta = JSON.parse(localStorage.getItem(metaKey) || '{}');
        localStorage.setItem(metaKey, JSON.stringify({
          ...existingMeta,
          principal_notes: principalNotes || existingMeta.principal_notes,
          felo_approval_status: 'Approved'
        }));
      } catch (e) {}

      await logAudit(user, 'EVENT_APPROVED', 'Events', { 
        id: ev.id, 
        name: ev.event_name,
        principal_notes: principalNotes || 'Diluluskan oleh Pengetua Kolej'
      });
      
      // Hantar notifikasi automatik kepada residen & penganjur
      await dispatchEventApprovalNotifications(ev, user);

      toast({ 
        title: 'Acara Diluluskan & Hebahan Dikeluarkan! 🎉', 
        description: `Acara "${ev.event_name}" telah diluluskan rasmi oleh Pengetua. Notifikasi dan hebahan telah dihantar kepada residen serta penganjur.` 
      });
      setSelectedEventForReview(null);
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

      // Beritahu penganjur / pemohon kertas cadangan tentang status penolakan
      if (rejectingEvent.organizer_user_id) {
        await base44.entities.Notification.create({
          user_id: rejectingEvent.organizer_user_id,
          title: `❌ Status Kertas Cadangan: ${rejectingEvent.event_name}`,
          message: `Kertas cadangan bagi "${rejectingEvent.event_name}" telah ditolak oleh ${user?.full_name || 'Felo Penyelaras / Pengetua'}. Sebab: ${rejectReason || 'Sila berhubung dengan pentadbiran kolej untuk perbincangan lanjut.'}`,
          type: 'event',
          link: '/events'
        }).catch(() => {});
      }

      toast({ 
        title: 'Kertas Cadangan Ditolak', 
        description: `Acara "${rejectingEvent.event_name}" telah ditandakan Ditolak dan pemohon telah dimaklumkan.` 
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

  // =========================================================================
  // 4. PENDAFTARAN ACARA (EVENT REGISTRATION / RSVP)
  // =========================================================================
  async function register(ev) {
    if (!student && !user) { 
      toast({ title: 'Sila log masuk terlebih dahulu', variant: 'destructive' }); 
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

    // Semak jika sudah berdaftar
    const isAlreadyRegistered = myRegistrations.some(r => r.event_id === ev.id && (r.status === 'Registered' || r.status === 'Attended'));
    if (isAlreadyRegistered) {
      toast({ title: 'Anda telah pun berdaftar untuk acara ini.' });
      return;
    }

    const studentName = student?.full_name || user?.full_name || (user?.email ? user.email.split('@')[0] : 'Residen KKTF');
    const studentMatric = student?.student_id || user?.student_id || user?.matric_no || (user?.id ? user.id.slice(0, 10).toUpperCase() : 'KKTF');
    const studentUserId = user?.id || student?.user_id || student?.id;

    try {
      const regPayload = {
        event_id: ev.id, 
        event_name: ev.event_name || 'Acara Kolej',
        student_user_id: studentUserId, 
        student_name: studentName,
        student_id: studentMatric, 
        registered_at: new Date().toISOString(),
        status: 'Registered'
      };

      const newReg = await base44.entities.EventRegistration.create(regPayload);
      await base44.entities.Event.update(ev.id, { 
        current_registrations: (Number(ev.current_registrations) || 0) + 1 
      }).catch(() => {});

      setMyRegistrations(prev => [...prev, newReg || regPayload]);
      setEvents(prev => prev.map(e => e.id === ev.id ? { 
        ...e, 
        registered_count: (Number(e.registered_count ?? e.current_registrations) || 0) + 1,
        current_registrations: (Number(e.current_registrations) || 0) + 1 
      } : e));

      toast({ 
        title: `Berjaya mendaftar untuk ${ev.event_name}! 🎉`,
        description: 'Sila imbas kod QR di lokasi program untuk mengesahkan kehadiran dan menuntut merit.'
      });
      init();
    } catch (err) {
      console.error('Ralat pendaftaran acara:', err);
      toast({ 
        title: 'Ralat pendaftaran acara', 
        description: 'Sila cuba lagi atau hubungi pentadbiran kolej.',
        variant: 'destructive' 
      });
    }
  }

  async function cancelRegistration(ev) {
    if (!ev?.id) return;
    setCancellingId(ev.id);
    try {
      // 1. Cari rekod pendaftaran aktif dalam state atau pangkalan data
      let reg = myRegistrations.find(r => r.event_id === ev.id && r.status !== 'Cancelled');
      const currentUserId = user?.id || student?.user_id;
      const currentMatric = student?.student_id || user?.student_id;

      if (!reg || !reg.id) {
        const fetched = await base44.entities.EventRegistration.filter({ event_id: ev.id }).catch(() => []);
        reg = fetched.find(r => 
          (currentUserId && r.student_user_id === currentUserId) ||
          (currentMatric && r.student_id === currentMatric)
        ) || reg;
      }

      // 2. Batalkan rekod EventRegistration (cuba kemas kini status 'Cancelled', jika gagal padam terus rekod)
      if (reg?.id) {
        try {
          await base44.entities.EventRegistration.update(reg.id, { status: 'Cancelled' });
        } catch (updateErr) {
          console.warn('Update EventRegistration status gagal, mencuba delete:', updateErr);
          await base44.entities.EventRegistration.delete(reg.id).catch((delErr) => {
            console.warn('Delete EventRegistration gagal:', delErr);
          });
        }
      } else if (currentUserId) {
        const allEvRegs = await base44.entities.EventRegistration.filter({ event_id: ev.id }).catch(() => []);
        for (const r of allEvRegs) {
          if (r.student_user_id === currentUserId || (currentMatric && r.student_id === currentMatric)) {
            await base44.entities.EventRegistration.update(r.id, { status: 'Cancelled' })
              .catch(() => base44.entities.EventRegistration.delete(r.id).catch(() => {}));
          }
        }
      }

      // 3. Kemas kini Event count jika dibenarkan (tangani sekatan RLS pelajar secara senyap)
      await base44.entities.Event.update(ev.id, { 
        current_registrations: Math.max(0, (Number(ev.current_registrations) || 1) - 1) 
      }).catch(() => {});

      // 4. Segerakkan state tempatan serta-merta tanpa perlu tunggu reload
      setMyRegistrations(prev => prev.filter(r => r.event_id !== ev.id));
      setEvents(prev => prev.map(e => e.id === ev.id ? { 
        ...e, 
        registered_count: Math.max(0, (Number(e.registered_count ?? e.current_registrations) || 1) - 1),
        current_registrations: Math.max(0, (Number(e.current_registrations) || 1) - 1) 
      } : e));

      toast({ 
        title: 'Pendaftaran Dibatalkan',
        description: `Penyertaan anda dalam "${ev.event_name || 'acara ini'}" telah dibatalkan.`
      });

      await logAudit(user, 'EVENT_REGISTRATION_CANCELLED', 'Events', {
        event_id: ev.id,
        event_name: ev.event_name,
        student_name: student?.full_name || user?.full_name
      }).catch(() => {});

      // Muat semula pendaftaran aktif di latar belakang
      init();
    } catch (err) {
      console.error('Ralat pembatalan pendaftaran:', err);
      toast({ 
        title: 'Ralat pembatalan', 
        description: 'Sila cuba lagi atau hubungi pentadbir kolej.',
        variant: 'destructive' 
      });
    } finally {
      setCancellingId(null);
    }
  }

  async function viewParticipants(ev) {
    const regs = await base44.entities.EventRegistration.filter({ event_id: ev.id });
    setParticipants((regs || []).filter(r => r.status !== 'Cancelled'));
    setViewingEvent(ev);
  }

  async function createEvent() {
    if (!form.event_name || !form.venue || !form.event_date) {
      toast({ title: 'Sila lengkapkan maklumat wajib (*)', variant: 'destructive' }); 
      return;
    }

    // Jika Pengetua atau Super Admin sendiri yang cipta, ia boleh diluluskan terus;
    // Jika Felo atau JAKMAS yang cipta, WAJIB berstatus 'Pending' untuk semakan & kelulusan Pengetua.
    const isPrincipalCreator = 
      user?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' ||
      user?.role === 'principal' ||
      user?.effectiveRole === 'principal' ||
      user?.role === 'super_admin' ||
      user?.effectiveRole === 'super_admin';

    const initialApproval = isPrincipalCreator ? 'Approved' : 'Pending';
    const creatorRole = user?.effectiveRole || user?.role || 'user';

    try {
      const createdEv = await base44.entities.Event.create({ 
        ...form, 
        organizer_user_id: user.id, 
        organizer: form.organizer || user.full_name || user.email,
        creator_role: creatorRole,
        creator_name: user?.full_name || user?.email || '',
        felo_approval_status: initialApproval,
        status: 'Upcoming',
        merit_points: Number(form.merit_points) || 10
      });

      if (createdEv?.id) {
        localStorage.setItem(`mykktf_event_meta_${createdEv.id}`, JSON.stringify({
          modality: form.modality,
          platform: form.platform,
          meeting_link: form.meeting_link
        }));
      }

      await logAudit(user, 'EVENT_CREATED', 'Events', { 
        name: form.event_name, 
        venue: form.venue, 
        date: form.event_date,
        approval: initialApproval,
        creator_role: creatorRole
      });

      if (initialApproval === 'Approved') {
        await dispatchEventApprovalNotifications(createdEv || { ...form, id: 'temp' }, user);
      } else {
        // Hantar notifikasi rasmi terus kepada Pengetua Kolej
        try {
          const principalUsers = await base44.entities.User?.filter?.({ role: 'principal' }).catch(() => []) || [];
          for (const pu of principalUsers) {
            await base44.entities.Notification.create({
              user_id: pu.id,
              title: `📑 Kertas Cadangan Acara Baharu: ${form.event_name}`,
              message: `Acara baharu telah dicadangkan oleh ${user?.full_name || 'Felo / JAKMAS'} (${creatorRole.toUpperCase()}) dan kini menunggu kelulusan rasmi Pengetua.`,
              type: 'event',
              link: '/admin'
            }).catch(() => {});
          }
        } catch (notifErr) {
          console.warn('Gagal hantar notifikasi kepada Pengetua:', notifErr);
        }
      }

      toast({ 
        title: initialApproval === 'Approved' ? 'Acara Berjaya Dicipta & Diterbitkan! 🎉' : 'Kertas Cadangan Acara Dihantar! ⏳',
        description: initialApproval === 'Approved' ? 'Acara sedia untuk pendaftaran dan hebahan rasmi telah disiarkan.' : 'Kertas cadangan telah dihantar dan kini menunggu kelulusan rasmi Pengetua Kolej.'
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
  const isPrincipal = 
    user?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' ||
    user?.role === 'principal' ||
    user?.effectiveRole === 'principal' ||
    user?.role === 'super_admin' ||
    user?.effectiveRole === 'super_admin';
  const isPrincipalOrAdmin = isPrincipal;
  // Kuasa mutlak kelulusan acara: Hanya Pengetua Kolej (dan Super Admin)
  const canApproveEvents = isPrincipal;

  // Senarai acara mengikut kebolehlihatan peranan:
  // Pelajar HANYA melihat acara yang telah diluluskan rasmi oleh Pengetua / Pentadbiran
  const accessibleEvents = events.filter(ev => {
    if (isStudent) {
      return ev.felo_approval_status === 'Approved' && ev.status !== 'Cancelled';
    }
    return true;
  });

  // Filter events based on statusFilter
  const filteredEvents = accessibleEvents.filter(ev => {
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
            Semua Acara ({accessibleEvents.length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'upcoming' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('upcoming')}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Akan Datang ({accessibleEvents.filter(e => { const s = getEventDateStatus(e); return s.key === 'upcoming' || s.key === 'ongoing'; }).length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'past' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('past')}
          >
            Sudah Berlalu ({accessibleEvents.filter(e => { const s = getEventDateStatus(e); return s.key === 'past'; }).length})
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'cancelled_postponed' ? 'default' : 'ghost'}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5"
            onClick={() => setStatusFilter('cancelled_postponed')}
          >
            Ditangguhkan / Batal ({accessibleEvents.filter(e => { const s = getEventDateStatus(e); return s.key === 'cancelled' || s.key === 'postponed'; }).length})
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
            const modalityInfo = getEventModalityInfo(ev);

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
                      {/* MODALITY BADGE & QUICK EDIT */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${modalityInfo.colorClass}`}>
                          {modalityInfo.label}
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => openQuickModalityModal(ev)}
                            title="Tukar Modaliti Program (Hibrid / Bersemuka / Online)"
                            className="p-1 hover:bg-muted-foreground/15 rounded-md text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{ev.event_date}{ev.event_time ? ` · ${ev.event_time}` : ''}</span>
                    </div>

                    {/* METRIK PENYERTAAN: DAFTAR AWAL VS KEHADIRAN SEBENAR */}
                    {(() => {
                      const regCount = Number(ev.registered_count ?? ev.current_registrations ?? 0);
                      const attCount = Number(ev.attended_count ?? 0);
                      const limit = Number(ev.registration_limit) || 50;
                      const regPct = limit > 0 ? Math.round((regCount / limit) * 100) : 0;
                      const attRate = regCount > 0 ? Math.round((attCount / regCount) * 100) : 0;

                      return (
                        <div className="pt-2 border-t border-border/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              Penyertaan Peserta
                            </span>
                            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 text-[10px] font-bold">
                              +{meritValue} Merit
                            </Badge>
                          </div>

                          {/* 2 KOTAK STATISTIK: DAFTAR AWAL & HADIR SEBENAR */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* KOTAK 1: PESERTA BERDAFTAR AWAL (RSVP) */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                                <span>Daftar Awal</span>
                                <UserCheck className="w-3 h-3 text-blue-500" />
                              </div>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-sm font-extrabold text-foreground font-mono">
                                  {regCount}
                                </span>
                                <span className="text-[10.5px] text-muted-foreground font-mono">
                                  / {limit}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div 
                                  className={`h-full transition-all rounded-full ${
                                    regPct >= 90 ? 'bg-rose-500' : regPct >= 50 ? 'bg-emerald-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(100, regPct)}%` }}
                                />
                              </div>
                              <p className="text-[9.5px] text-muted-foreground mt-1 truncate">
                                {isFull ? 'Kuota Penuh' : `${Math.max(0, limit - regCount)} kekosongan (${regPct}%)`}
                              </p>
                            </div>

                            {/* KOTAK 2: KEHADIRAN SEBENAR (IMBAS QR DI LOKASI) */}
                            <div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
                              <div className="flex items-center justify-between text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">
                                <span>Hadir Sebenar</span>
                                <QrCode className="w-3 h-3 text-emerald-600" />
                              </div>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                                  {attCount}
                                </span>
                                <span className="text-[10.5px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                                  Hadir
                                </span>
                              </div>
                              <div className="w-full bg-emerald-200/60 dark:bg-emerald-900/60 h-1.5 rounded-full overflow-hidden mt-1.5">
                                <div 
                                  className="h-full bg-emerald-600 dark:bg-emerald-400 transition-all rounded-full"
                                  style={{ width: `${Math.min(100, attRate)}%` }}
                                />
                              </div>
                              <p className="text-[9.5px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium truncate">
                                {statusInfo.key === 'upcoming' 
                                  ? (regCount > 0 ? 'Menunggu hari program' : 'Belum berlangsung')
                                  : `${attRate}% pendaftar hadir`}
                              </p>
                            </div>
                          </div>

                          {/* KHAS PENGANJUR / PENTADBIRAN: STATUS HEBAHAN & KUOTA */}
                          {canManage && isApproved && statusInfo.key === 'upcoming' && (
                            <div>
                              {regPct < 40 ? (
                                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      Pendaftaran Rendah ({regPct}%)
                                    </span>
                                    <Badge variant="outline" className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300">
                                      Perlu Hebahan
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground leading-snug">
                                    Pendaftar awal masih kurang. Disyorkan menyiarkan hebahan peringatan kepada residen.
                                  </p>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => openBlastModal(ev)}
                                    className="w-full h-7 text-[10.5px] bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg gap-1.5 shadow-2xs"
                                  >
                                    <Megaphone className="w-3.5 h-3.5" /> Hebahkan Program Sekarang
                                  </Button>
                                </div>
                              ) : regPct < 85 ? (
                                <div className="p-1.5 px-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-[10.5px]">
                                  <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                                    Sambutan Baik ({regCount}/{limit} terisi)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openBlastModal(ev)}
                                    className="text-blue-700 dark:text-blue-300 font-bold underline hover:opacity-80 text-[10px]"
                                  >
                                    Siar Hebahan
                                  </button>
                                </div>
                              ) : (
                                <div className="p-1.5 px-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-[10.5px]">
                                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    Kuota {isFull ? 'Penuh' : 'Hampir Penuh'} ({regPct}%)
                                  </span>
                                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Sedia Berlangsung</Badge>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* DIRECT JOIN LINK FOR ONLINE / HYBRID SESSIONS */}
                    {(modalityInfo.modality === 'Dalam Talian' || modalityInfo.modality === 'Hibrid') && (modalityInfo.meeting_link || ev.meeting_link) && (isRegistered || isAttended || canManage) && (
                      <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                        <a 
                          href={modalityInfo.meeting_link || ev.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" /> Sertai Sesi {modalityInfo.platform || ev.platform || 'Dalam Talian'}
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
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Kehadiran Disahkan • +{meritValue} Merit Telah Dikreditkan
                        </div>
                      ) : isRegistered ? (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-1.5 border-t border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Pendaftaran Berjaya • Sila imbas Kod QR semasa hari acara
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
                          <UserCog className="w-3.5 h-3.5 text-primary" /> Pengesahan & Kelulusan:
                        </span>
                        <Badge className={`text-[9px] font-bold ${
                          isApproved 
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40' 
                            : isRejected
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 animate-pulse'
                        }`}>
                          {isApproved ? '✓ Diluluskan Rasmi' : isRejected ? '✕ Ditolak' : '⏳ Menunggu Kelulusan'}
                        </Badge>
                      </div>

                      <p className="font-bold text-xs text-foreground">
                        {ev.felo_coordinator_name ? `Felo Penyelaras: ${ev.felo_coordinator_name}` : 'Pejabat Pentadbiran Felo KKTF'}
                      </p>

                      {isRejected && ev.rejection_reason && (
                        <p className="text-[11px] text-rose-700 dark:text-rose-300 italic">
                          Catatan Penolakan: "{ev.rejection_reason}"
                        </p>
                      )}

                      {/* BUTANG TINDAKAN KELULUSAN (PENGETUA KOLEJ SAHAJA) */}
                      {!isApproved && !isRejected ? (
                        canApproveEvents ? (
                          <div className="space-y-1.5 pt-1.5 border-t border-amber-200/50 dark:border-amber-900/40">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedEventForReview(ev)}
                              className="w-full h-8 text-xs font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-xl gap-1.5 border border-amber-300 shadow-2xs"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600" /> Semak Kertas Cadangan & Perakuan
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveEvent(ev)}
                                className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1 shadow-xs"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Lulus Pantas
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
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-amber-200/50 dark:border-amber-900/40">
                            <p className="text-[10px] text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-300/40 font-medium">
                              ⏳ Acara ini sedang menunggu perakuan & kelulusan rasmi Pengetua Kolej.
                            </p>
                          </div>
                        )
                      ) : (
                        canApproveEvents && (
                          <div className="pt-1 border-t border-border/50">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEventForReview(ev)}
                              className="w-full h-7 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> Papar Kertas Cadangan & Watikah Rasmi
                            </Button>
                          </div>
                        )
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
                          <div className="w-full space-y-2 pt-1 border-t border-border/60">
                            <Button
                              type="button"
                              size="default"
                              onClick={() => openStudentScannerModal(ev)}
                              className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 shadow-sm"
                            >
                              <Camera className="w-4 h-4" /> Imbas Kod QR Hadir (+{meritValue} Merit)
                            </Button>
                            <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" /> Anda Telah Berdaftar
                              </span>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                disabled={cancellingId === ev.id}
                                className="h-6 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-50" 
                                onClick={() => cancelRegistration(ev)}
                              >
                                {cancellingId === ev.id ? (
                                  <span className="flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Membatalkan...
                                  </span>
                                ) : (
                                  'Batal Pendaftaran'
                                )}
                              </Button>
                            </div>
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

              {/* TAB 2: ROSTER KEHADIRAN (IMBASAN QR SAHAJA - TIADA MANUAL KEY IN) */}
              {attendanceTab === 'roster' && (
                <div className="space-y-4">
                  {/* DASAR KEHADIRAN: IMBASAN QR SAHAJA */}
                  <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-300/60 dark:border-emerald-800 flex items-start gap-2.5">
                    <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs text-emerald-950 dark:text-emerald-200">
                        Dasar Kehadiran: Pengesahan Menggunakan Kod QR Sahaja
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                        Kehadiran dan merit hanya dikreditkan apabila pelajar mengimbas Kod QR rasmi program ini. Tiada pendaftaran kehadiran secara manual bagi memastikan integriti data aktiviti kolej.
                      </p>
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

                  {/* List Table (LIVE STATUS SEMAKAN IMBASAN QR) */}
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
                                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400 text-[10.5px] font-bold py-1 px-2.5">
                                  ✓ Hadir (Diimbas QR) &bull; +{attendanceModalEvent.merit_points || 10} Merit
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10.5px] text-muted-foreground bg-muted/40 py-1 px-2.5">
                                  ⏳ Belum Hadir
                                </Badge>
                              )}
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
      {viewingEvent && (() => {
        const vInfo = getEventModalityInfo(viewingEvent);
        return (
          <Dialog open={!!viewingEvent} onOpenChange={() => { setViewingEvent(null); setParticipants([]); }}>
            <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-6 bg-card border-border rounded-3xl shadow-xl">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-base">Senarai Peserta — {viewingEvent.event_name}</DialogTitle>
                <div className="flex items-center gap-2 pt-1 mb-2">
                  <span className="text-xs text-muted-foreground">{participants.length} orang telah mendaftar</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${vInfo.colorClass}`}>
                    {vInfo.label}
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
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL 6: KEMASKINI PANTAS MODALITI PROGRAM (HIBRID / ONLINE / BERSEMUKA) */}
      {/* ========================================================================= */}
      {quickModalityEvent && (
        <Dialog open={!!quickModalityEvent} onOpenChange={() => setQuickModalityEvent(null)}>
          <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl text-xs">
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-base text-primary flex items-center gap-2">
                <Pencil className="w-4 h-4 text-purple-600" /> Kemaskini Modaliti Acara
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ubah format bagi <strong>{quickModalityEvent.event_name}</strong> secara langsung.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-2">
              <div>
                <Label className="text-xs font-bold">Modaliti Acara *</Label>
                <Select 
                  value={quickModalityForm.modality}
                  onValueChange={(val) => setQuickModalityForm(f => ({ ...f, modality: val }))}
                >
                  <SelectTrigger className="h-9 text-xs mt-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bersemuka">🏢 Bersemuka (Fizikal Sahaja)</SelectItem>
                    <SelectItem value="Hibrid">🔄 Hibrid (Bersemuka & Online)</SelectItem>
                    <SelectItem value="Dalam Talian">🌐 Dalam Talian (Online Sahaja)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(quickModalityForm.modality === 'Hibrid' || quickModalityForm.modality === 'Dalam Talian') && (
                <>
                  <div>
                    <Label className="text-xs font-bold">Platform Sesi Atas Talian *</Label>
                    <Select 
                      value={quickModalityForm.platform}
                      onValueChange={(val) => setQuickModalityForm(f => ({ ...f, platform: val }))}
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

                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <Globe className="w-3.5 h-3.5" /> Pautan Pertemuan / Sesi (Meeting Link) *
                    </Label>
                    <Input 
                      value={quickModalityForm.meeting_link}
                      onChange={(e) => setQuickModalityForm(f => ({ ...f, meeting_link: e.target.value }))}
                      placeholder="cth: https://meet.google.com/abc-defg-hij"
                      className="h-9 text-xs mt-1 font-mono bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Pautan ini akan dipaparkan kepada residen berdaftar dengan butang "Sertai Sesi Dalam Talian".
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setQuickModalityEvent(null)} className="rounded-xl">
                  Batal
                </Button>
                <Button size="sm" onClick={handleSaveQuickModality} className="bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Simpan Modaliti
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: BORANG / DOSIER KERTAS CADANGAN RASMI KELULUSAN PENGETUA KOLEJ   */}
      {/* ========================================================================= */}
      <PrincipalEventDetailModal
        open={!!selectedEventForReview}
        onOpenChange={(isOpen) => !isOpen && setSelectedEventForReview(null)}
        event={selectedEventForReview}
        user={user}
        onApprove={handleApproveEvent}
        onReject={(ev) => {
          setSelectedEventForReview(null);
          openRejectModal(ev);
        }}
        onEditModality={(ev) => {
          setSelectedEventForReview(null);
          openQuickModalityModal(ev);
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 8: PENGIMBAS KOD QR KEHADIRAN PELAJAR (KAMERA & KOD TOKEN)         */}
      {/* ========================================================================= */}
      <Dialog open={studentScanModalOpen} onOpenChange={(open) => !open && closeStudentScannerModal()}>
        <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-2xl text-xs">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2 text-foreground">
              <ScanLine className="w-5 h-5 text-emerald-600" /> Imbas Kehadiran Acara Kolej
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {studentScannerTargetEvent 
                ? `Imbas kod QR di lokasi untuk mengesahkan kehadiran bagi: ${studentScannerTargetEvent.event_name}`
                : 'Imbas kod QR rasmi yang dipaparkan di dewan program atau lokasi aktiviti kolej untuk merekod kehadiran dan kredit merit.'}
            </DialogDescription>
          </DialogHeader>

          {/* TAB MODE: KAMERA LIVE ATAU KOD MANUAL */}
          <div className="flex border-b border-border pb-1 gap-2 mt-2">
            <Button
              size="sm"
              variant={studentScannerMode === 'camera' ? 'default' : 'ghost'}
              onClick={() => setStudentScannerMode('camera')}
              className="rounded-xl text-xs font-bold gap-1.5 h-8 flex-1"
            >
              <Camera className="w-3.5 h-3.5" /> Kamera Pengimbas
            </Button>
            <Button
              size="sm"
              variant={studentScannerMode === 'manual' ? 'default' : 'ghost'}
              onClick={() => setStudentScannerMode('manual')}
              className="rounded-xl text-xs font-bold gap-1.5 h-8 flex-1"
            >
              <Keyboard className="w-3.5 h-3.5" /> Input Kod Token
            </Button>
          </div>

          {/* MODE 1: LIVE CAMERA QR SCANNER */}
          {studentScannerMode === 'camera' && (
            <div className="space-y-3 mt-3">
              <div className="relative w-full aspect-square bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/40 flex items-center justify-center">
                <div id="student-event-attendance-reader" className="w-full h-full" />
                {!studentScannerActive && !studentScannerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <p className="text-xs font-medium">Memulakan kamera pengimbas...</p>
                  </div>
                )}
                {studentScannerError && (
                  <div className="absolute inset-0 p-4 flex flex-col items-center justify-center bg-slate-950/90 text-center text-rose-300 gap-2">
                    <AlertCircle className="w-6 h-6 text-rose-400" />
                    <p className="text-xs leading-relaxed">{studentScannerError}</p>
                    <Button 
                      size="sm" 
                      onClick={() => setStudentScannerMode('manual')} 
                      className="mt-2 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      Beralih ke Input Kod Manual
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-center text-muted-foreground">
                Halakan lensa kamera anda ke Kod QR di dewan atau skrin penganjur.
              </p>
            </div>
          )}

          {/* MODE 2: MANUAL TOKEN CODE INPUT (SEKIRANYA KAMERA TIDAK DAPAT DIAKSES) */}
          {studentScannerMode === 'manual' && (
            <div className="space-y-3 mt-3">
              <div>
                <Label className="text-xs font-bold text-foreground">Kod Token / Teks QR Acara *</Label>
                <Input
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="cth: KKTF-EVT|evt-123|Malam Pengenalan Kolej|2026-09-14"
                  className="h-10 text-xs mt-1.5 font-mono bg-background"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Masukkan rentetan kod token yang tertera di bawah kod QR di dewan program.
                </p>
              </div>

              <Button
                size="sm"
                disabled={isProcessingStudentScan || !manualTokenInput.trim()}
                onClick={() => processStudentAttendanceQr(manualTokenInput)}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5"
              >
                {isProcessingStudentScan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {isProcessingStudentScan ? 'Memproses Pengesahan...' : 'Sahkan Kehadiran & Tuntut Merit'}
              </Button>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border mt-3">
            <Button variant="outline" size="sm" onClick={closeStudentScannerModal} className="rounded-xl text-xs">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}