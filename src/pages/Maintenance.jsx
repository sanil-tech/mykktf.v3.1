import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Wrench, 
  ExternalLink, 
  MapPin, 
  User, 
  CheckCircle2, 
  Clock, 
  Hash, 
  ArrowRight, 
  AlertCircle, 
  FileEdit,
  Sparkles,
  CheckCircle,
  ThumbsUp,
  Timer,
  CalendarCheck,
  Copy,
  MessageCircle,
  Send,
  Search,
  Check,
  AlertTriangle,
  Flame,
  Printer,
  FileText,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { toast } from 'sonner';
import { validateAttachment } from '@/lib/validators';
import { logAudit } from '@/lib/audit';
import DamageReportModal from '@/components/DamageReportModal';
import BlockInspectionDossierModal from '@/components/BlockInspectionDossierModal';
import { stampInspectionWatermark } from '@/lib/imageWatermark';

const UMS_MYSERV_URL = 'https://aset.ums.edu.my/myserv/';

// Smart Unit Routing for WhatsApp Group Dispatch
const CATEGORY_UNIT_MAP = {
  'Electrical': { unit: 'UNIT M&E (ELEKTRIKAL)', tag: '@M&E Elektrik', icon: '⚡', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  'Plumbing': { unit: 'UNIT AWAM & M&E (PAIP/PLUMBING)', tag: '@Awam & Paip', icon: '💧', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  'Furniture': { unit: 'UNIT AWAM (CIVIL / PERABOT)', tag: '@Awam Perabot', icon: '🪑', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  'Internet': { unit: 'UNIT PTM / ICT & RANGKAIAN', tag: '@Unit ICT', icon: '📶', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  'Cleaning': { unit: 'UNIT KEBERSIHAN (CLEANER)', tag: '@Cleaner / Kebersihan', icon: '🧹', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  'Doors & Windows': { unit: 'UNIT AWAM (CIVIL)', tag: '@Awam Civil', icon: '🚪', color: 'text-stone-600 bg-stone-50 border-stone-200' },
  'Air Conditioning / Fan': { unit: 'UNIT M&E (MEKANIKAL & KIPAS)', tag: '@M&E Mekanikal', icon: '❄️', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  'Structural / Roof': { unit: 'UNIT AWAM (CIVIL & STRUKTUR)', tag: '@Awam Struktur', icon: '🏢', color: 'text-rose-600 bg-rose-50 border-rose-200' },
  'Pest Control': { unit: 'UNIT KEBERSIHAN & KAWALAN MAKHLUK', tag: '@Pest Control', icon: '🐜', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  'Others': { unit: 'UNIT PENYELENGGARAAN AM', tag: '@Penyelenggaraan Am', icon: '🔧', color: 'text-slate-600 bg-slate-50 border-slate-200' }
};

const statusBadge = { 
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
  'Reported to MyServ': 'bg-blue-50 text-blue-700 border-blue-200',
  'Followed Up': 'bg-purple-50 text-purple-700 border-purple-200',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200', 
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
};

const STATUS_LABELS = {
  Submitted: 'Menunggu No. TAMS',
  'Reported to MyServ': 'Telah Lapor TAMS/JPP',
  'Followed Up': 'Dihebahkan / Susulan JPP',
  'In Progress': 'Tindakan JPP Berjalan',
  Completed: 'Disahkan Selesai'
};

const COMMON_FACILITIES = [
  'Toilet / Washroom (Tandas)',
  'Pantry / Kitchen (Pantri)',
  'Laundry Room (Bilik Basuh)',
  'Study Room (Bilik Bacaan)',
  'Surau / Musolla',
  'Corridor / Staircase (Koridor / Tangga)',
  'Multipurpose Hall (Dewan)',
  'Cafeteria (Kafeteria)',
  'Foyer / Main Entrance',
  'Hostel Compound / Street Lighting'
];

const STAFF_ROLES = ['warden', 'staff', 'college_admin', 'super_admin', 'principal', 'jakmas'];

const COLLEGE_BLOCKS = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Block G',
  'Block H'
];

function formatResolutionTime(hours) {
  if (!hours || isNaN(hours)) return null;
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins} Minit`;
  }
  if (hours < 24) {
    return `${hours.toFixed(1)} Jam`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days} Hari ${remainingHours} Jam (${hours.toFixed(1)} Jam)` : `${days} Hari`;
}

function getDaysElapsed(submittedIso) {
  if (!submittedIso) return 0;
  const start = new Date(submittedIso).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function formatDateTime(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ms-MY', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return isoStr;
  }
}

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [assignedBlocks, setAssignedBlocks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [selectedReqForRef, setSelectedReqForRef] = useState(null);
  const [inputRefNumber, setInputRefNumber] = useState('');
  const [updatingRef, setUpdatingRef] = useState(false);

  // WhatsApp Group Dispatch Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedReqForWa, setSelectedReqForWa] = useState(null);
  const [copiedWa, setCopiedWa] = useState(false);
  const [waFollowupNote, setWaFollowupNote] = useState('');

  // Student / Staff Self-Verification Modal States
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedReqForComplete, setSelectedReqForComplete] = useState(null);
  const [completeRemarks, setCompleteRemarks] = useState('Kerosakan telah dibaiki dan diuji dengan baik oleh juruteknik JPP.');
  const [completePhoto, setCompletePhoto] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Quick Follow-up Log Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedReqForLog, setSelectedReqForLog] = useState(null);
  const [quickLogText, setQuickLogText] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Damage Report Printable Modal States
  const [damageReportModalOpen, setDamageReportModalOpen] = useState(false);
  const [selectedReqForReport, setSelectedReqForReport] = useState(null);

  // Block Inspection Dossier Modal State
  const [dossierModalOpen, setDossierModalOpen] = useState(false);

  // Photo Stamping Indicators
  const [stampingPhoto, setStampingPhoto] = useState(false);
  const [stampingCompletePhoto, setStampingCompletePhoto] = useState(false);

  // New Request Form
  const [form, setForm] = useState({
    location_type: 'My Room',
    room_number: '',
    block_name: '',
    specific_location: '',
    category: 'Electrical',
    urgency: 'Normal',
    description: '',
    photo: null
  });

  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    const isStaffRole = STAFF_ROLES.includes(user?.role);
    let reqs;
    if (isStaffRole) {
      reqs = await base44.entities.MaintenanceRequest.list('-created_date');
      if (user.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
        if (wb.length > 0) {
          const blockNames = wb.map(w => w.block_name);
          setAssignedBlocks(blockNames);
          reqs = reqs.filter(r => !r.block_name || blockNames.includes(r.block_name));
        }
      }
    } else {
      let student = null;
      if (user?.id) {
        const byUid = await base44.entities.Student.filter({ user_id: user.id });
        if (byUid.length > 0) student = byUid[0];
      }
      if (!student && user?.email) {
        const byEmail = await base44.entities.Student.filter({ email: user.email });
        if (byEmail.length > 0) student = byEmail[0];
      }
      setMyStudent(student);

      // Multi-key query to fetch all complaints created by this student
      const queryPromises = [];
      if (student?.id) {
        queryPromises.push(base44.entities.MaintenanceRequest.filter({ student_id: student.id }));
      }
      if (student?.student_id && student.student_id !== student.id) {
        queryPromises.push(base44.entities.MaintenanceRequest.filter({ student_id: student.student_id }));
      }
      if (user?.id && user.id !== student?.id) {
        queryPromises.push(base44.entities.MaintenanceRequest.filter({ student_id: user.id }));
      }

      const queryResults = await Promise.all(queryPromises);
      const combined = [];
      const seenIds = new Set();
      queryResults.flat().forEach(item => {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
      });

      // Strict client-side isolation filter: ONLY allow requests owned by this student
      const validStudentKeys = [
        String(user?.id || '').toLowerCase(),
        String(user?.email || '').toLowerCase(),
        String(student?.id || '').toLowerCase(),
        String(student?.student_id || '').toLowerCase()
      ].filter(Boolean);

      reqs = combined.filter(r => {
        const rId = String(r.student_id || '').toLowerCase();
        const rName = String(r.student_name || '').toLowerCase();
        const rCreatedBy = String(r.created_by || '').toLowerCase();
        return validStudentKeys.some(k => 
          rId === k || 
          rCreatedBy === k || 
          rName.includes(k)
        );
      });

      // Sort newest first
      reqs.sort((a, b) => new Date(b.submitted_at || b.created_date || 0) - new Date(a.submitted_at || a.created_date || 0));
      
      // Auto-dispatch daily reminder notification to student if active unconfirmed report > 24 hours
      const now = Date.now();
      const todayDateStr = new Date().toISOString().split('T')[0];
      reqs.filter(r => r.status !== 'Completed').forEach(async (r) => {
        const createTime = r.submitted_at ? new Date(r.submitted_at).getTime() : (r.created_date ? new Date(r.created_date).getTime() : now);
        const hoursPassed = (now - createTime) / (1000 * 60 * 60);
        const lastRemDate = r.last_reminder_sent_at ? r.last_reminder_sent_at.split('T')[0] : null;

        if (hoursPassed >= 24 && lastRemDate !== todayDateStr) {
          try {
            await base44.entities.Notification.create({
              user_id: user.id,
              title: `🔔 Peringatan Harian: Semakan Pembaikan [${r.myserv_ticket_no || r.specific_location}]`,
              message: `Adakah kerosakan di ${r.specific_location || 'bilik anda'} telah siap dibaiki oleh JPP? Sila sahkan di menu Damage Reports jika telah selesai.`,
              type: 'general',
              link: '/maintenance'
            });
            await base44.entities.MaintenanceRequest.update(r.id, {
              last_reminder_sent_at: new Date().toISOString()
            });
          } catch (e) {
            console.error('Reminder notification error:', e);
          }
        }
      });
    }
    setRequests(reqs);
    setLoading(false);
  }

  const handleOpenDialog = () => {
    const isStaffUser = currentUser && STAFF_ROLES.includes(currentUser.role);
    const defaultBlock = assignedBlocks.length > 0 ? assignedBlocks[0] : (myStudent?.block_name || 'Block B');
    setForm({
      location_type: isStaffUser ? 'Student Room' : 'My Room',
      room_number: myStudent?.room_number || '',
      block_name: defaultBlock,
      specific_location: myStudent ? `Bilik ${myStudent.room_number}, ${myStudent.block_name}` : '',
      category: 'Electrical',
      urgency: 'Normal',
      description: '',
      photo: null
    });
    setDialogOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      setForm(f => ({ ...f, photo: null }));
      return;
    }

    setStampingPhoto(true);
    const toastId = toast.loading('Menjana cop masa & lokasi rasmi pada foto...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawBase64 = event.target.result;
        let locName = form.specific_location;
        if (form.location_type === 'My Room') {
          locName = myStudent?.room_number ? `Bilik ${myStudent.room_number} (${myStudent.block_name || 'KKTF'})` : form.specific_location;
        } else if (form.location_type === 'Student Room') {
          locName = `Bilik ${form.room_number || '-'} (${form.block_name || 'KKTF'})`;
        }

        const reporterName = currentUser?.full_name || myStudent?.full_name || currentUser?.email;

        const stamped = await stampInspectionWatermark(rawBase64, {
          location: locName || 'Fasiliti Kolej KKTF',
          category: form.category || 'Penyelenggaraan',
          stage: 'PEMERIKSAAN KEROSAKAN TAPAK',
          inspectorName: reporterName,
          ticketRef: 'DRAF-KKTF'
        });

        setForm(f => ({ ...f, photo: stamped }));
        toast.success('Foto berjaya dicap dengan cop masa & lokasi rasmi!', { id: toastId });
      } catch (err) {
        console.error('Failed to stamp photo:', err);
        setForm(f => ({ ...f, photo: event.target.result }));
        toast.dismiss(toastId);
      } finally {
        setStampingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompletePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      setCompletePhoto(null);
      return;
    }

    setStampingCompletePhoto(true);
    const toastId = toast.loading('Menjana cop masa pengesahan siap pembaikan...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawBase64 = event.target.result;
        const loc = selectedReqForComplete?.specific_location || selectedReqForComplete?.room_number || 'Fasiliti KKTF';
        const verifierName = currentUser?.full_name || currentUser?.email || 'Felo Pemeriksa';
        const tamsRef = selectedReqForComplete?.myserv_ticket_no || '';

        const stamped = await stampInspectionWatermark(rawBase64, {
          location: loc,
          category: selectedReqForComplete?.category || 'Penyelenggaraan',
          stage: 'PENGESAHAN SIAP PEMBAIKAN',
          inspectorName: verifierName,
          ticketRef: tamsRef || 'SELESAI'
        });

        setCompletePhoto(stamped);
        toast.success('Foto pembaikan siap dicap dengan cop masa rasmi!', { id: toastId });
      } catch (err) {
        console.error('Failed to stamp completion photo:', err);
        setCompletePhoto(event.target.result);
        toast.dismiss(toastId);
      } finally {
        setStampingCompletePhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick Copy Helper for TAMS Portal Data Entry
  const copyTamsFormat = (r) => {
    if (!r) return;
    const unitInfo = CATEGORY_UNIT_MAP[r.category] || CATEGORY_UNIT_MAP['Others'];
    const isUrgent = r.urgency === 'Urgent';
    const formattedDate = r.submitted_at 
      ? new Date(r.submitted_at).toLocaleDateString('ms-MY', { 
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
        })
      : new Date().toLocaleDateString('ms-MY');

    const ticketYear = r.submitted_at ? new Date(r.submitted_at).getFullYear() : new Date().getFullYear();
    const internalKktfRef = `KKTF/MNT/${ticketYear}/${r.id ? String(r.id).slice(-5).toUpperCase() : 'REQ-01'}`;

    const tamsText = `[LAPORAN KEROSAKAN FASILITI KKTF - TAMS UMS]
No. Rujukan MyKKTF: ${internalKktfRef}
Lokasi: ${r.specific_location || `Bilik ${r.room_number || '-'}`} (${r.location_type || 'Bilik Mahasiswa'})
Kategori: ${r.category || 'Penyelenggaraan Am'}
Unit Pelaksana JPP: ${unitInfo.unit}
Tahap Keutamaan: ${isUrgent ? 'KECEMASAN / TINGGI' : 'BIASA (Standard SLA)'}
Nama Pengadu / Felo: ${r.student_name || 'Felo Pemeriksa'} (ID/Matrik: ${r.student_id || '-'})
No. Telefon Pengadu: ${r.phone_number || '-'}
Tarikh Pemeriksaan: ${formattedDate}

KETERANGAN KEROSAKAN:
${r.description || '-'}

CATATAN SUSULAN / PEMERIKSAAN TAPAK:
${r.latest_followup_note || 'Telah disahkan dalam pemeriksaan fizikal di lokasi oleh pihak kolej.'}`;

    navigator.clipboard.writeText(tamsText);
    toast.success('Teks format TAMS berjaya disalin ke papan klip!', {
      description: 'Sedia untuk ditampal ke sistem TAMS UMS.'
    });
  };

  // STEP 1 & 2: Save to MyKKTF with exact timestamp and Launch MyServ
  async function handleSubmitAndLaunchMyServ() {
    if (!form.description) { 
      toast.error('Sila isi penerangan kerosakan'); 
      return; 
    }

    let reporterName = currentUser?.full_name || currentUser?.name || currentUser?.email || 'Pelapor';
    let reporterRoleTag = 'Pelajar';
    if (currentUser?.role === 'warden') reporterRoleTag = 'Felo / Warden';
    else if (currentUser?.role === 'staff') reporterRoleTag = 'Staf Pentadbiran';
    else if (currentUser?.role === 'jakmas') reporterRoleTag = 'JAKMAS';
    else if (currentUser?.role === 'college_admin' || currentUser?.role === 'super_admin') reporterRoleTag = 'Pentadbir';

    let locationDisplay = '';
    let roomNumber = form.room_number || '';
    let blockName = form.block_name || '';

    if (form.location_type === 'My Room') {
      locationDisplay = myStudent?.room_number ? `Bilik ${myStudent.room_number} (${myStudent.block_name || 'Blok'})` : form.specific_location || 'Bilik Sendiri';
      roomNumber = myStudent?.room_number || 'Bilik Sendiri';
      blockName = myStudent?.block_name || '';
    } else if (form.location_type === 'Student Room') {
      locationDisplay = `Bilik ${form.room_number || '-'} (${form.block_name || 'KKTF'})`;
      roomNumber = form.room_number || 'Bilik Pelajar';
      blockName = form.block_name || '';
    } else if (form.location_type === 'Common Area') {
      locationDisplay = form.specific_location || 'Fasiliti Bersama';
      roomNumber = 'Fasiliti Bersama';
    } else {
      locationDisplay = form.specific_location || form.location_type;
      roomNumber = 'Kawasan Kolej';
    }

    const nowIso = new Date().toISOString();

    const payload = {
      student_id: myStudent?.id || currentUser?.id,
      student_name: `${reporterName} [${reporterRoleTag}${blockName ? ` - ${blockName}` : ''}]`,
      room_number: roomNumber,
      block_name: blockName,
      location_type: form.location_type,
      specific_location: locationDisplay,
      category: form.category,
      urgency: form.urgency || 'Normal',
      description: form.description,
      myserv_ticket_no: '',
      photo: form.photo || null,
      status: 'Submitted',
      submitted_at: nowIso
    };

    const newRecord = await base44.entities.MaintenanceRequest.create(payload);
    await logAudit(currentUser, 'MAINTENANCE_SUBMITTED', 'Maintenance', { 
      reporter: reporterName, 
      role: reporterRoleTag,
      category: form.category, 
      location: locationDisplay,
      submitted_at: nowIso
    });

    toast.success('Aduan / Rekod kerosakan disimpan! Membuka portal UMS MyServ...');
    setDialogOpen(false);

    // Open UMS MyServ in new window
    window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer');

    // Immediately prompt student to prepare No. Rujukan
    setSelectedReqForRef(newRecord);
    setInputRefNumber('');
    setRefModalOpen(true);
    init();
  }

  // STEP 3: Save No Rujukan with Timestamp
  async function handleSaveRefNumber() {
    if (!selectedReqForRef) return;
    if (!inputRefNumber.trim()) {
      toast.error('Sila masukkan No. Rujukan MyServ (cth: REQ-2026-3938)');
      return;
    }

    setUpdatingRef(true);
    try {
      const cleanRef = inputRefNumber.trim().toUpperCase();
      const nowIso = new Date().toISOString();

      await base44.entities.MaintenanceRequest.update(selectedReqForRef.id, {
        myserv_ticket_no: cleanRef,
        myserv_linked_at: nowIso,
        status: selectedReqForRef.status === 'Submitted' ? 'Reported to MyServ' : selectedReqForRef.status
      });

      await logAudit(currentUser, 'MAINTENANCE_REF_UPDATED', 'Maintenance', { 
        id: selectedReqForRef.id, 
        myserv_ticket_no: cleanRef,
        myserv_linked_at: nowIso
      });

      toast.success(`No. Rujukan ${cleanRef} berjaya dipautkan!`);
      setRefModalOpen(false);
      setSelectedReqForRef(null);
      setInputRefNumber('');
      init();
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengemaskini No. Rujukan');
    } finally {
      setUpdatingRef(false);
    }
  }

  // BUILD STANDARDIZED WHATSAPP MESSAGE FOR KKTF MAINTENANCE GROUP
  function generateWhatsAppMessage(req) {
    if (!req) return '';
    const unitInfo = CATEGORY_UNIT_MAP[req.category] || CATEGORY_UNIT_MAP['Others'];
    const daysElapsed = getDaysElapsed(req.submitted_at || req.created_date);
    const urgencyHeader = req.urgency === 'Urgent' 
      ? '🚨 *[KECEMASAN / URGENT]*' 
      : (daysElapsed >= 3 ? `⚠️ *[SUSULAN - TERTUNGGAK ${daysElapsed} HARI]*` : '📢 *[ADUAN KEROSAKAN KKTF]*');

    const refLine = req.myserv_ticket_no 
      ? `📋 *No. MyServ:* ${req.myserv_ticket_no}` 
      : '📋 *No. MyServ:* (Menunggu kemaskini pemohon)';

    const reporterLine = `👤 *Pelapor:* ${req.student_name || 'Residen KKTF'}`;

    return `${urgencyHeader}
🎯 *TINDAKAN: ${unitInfo.unit}*
━━━━━━━━━━━━━━━━━━━━━━━
🏢 *Lokasi:* ${req.specific_location || `Bilik ${req.room_number}`} (${req.block_name || 'KKTF'})
🔧 *Kategori:* ${unitInfo.icon} ${req.category}
${refLine}
${reporterLine}
⏱️ *Tarikh Aduan:* ${formatDateTime(req.submitted_at || req.created_date) || 'Baru'}

📝 *Keterangan Kerosakan:*
"${req.description}"

${req.latest_followup_note ? `💬 *Catatan Susulan Terkini:* ${req.latest_followup_note}\n` : ''}Mohon semakan dan tindakan pihak bertugas/kontraktor JPP dalam kumpulan ini. Terima kasih.
— *Diselaras melalui Sistem MyKKTF (${currentUser?.full_name || 'Pentadbiran / Felo KKTF'})*`;
  }

  // DISPATCH TO WHATSAPP
  async function handleOpenWhatsAppGroup(req) {
    const text = generateWhatsAppMessage(req);
    const encoded = encodeURIComponent(text);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Auto-log the dispatch if staff
    if (isStaff) {
      try {
        const nowIso = new Date().toISOString();
        const actor = currentUser?.full_name || currentUser?.email || 'Felo/Staf';
        const note = waFollowupNote.trim() 
          ? `Dihebahkan ke Group WhatsApp oleh ${actor}: "${waFollowupNote.trim()}"`
          : `Dihebahkan ke Group WhatsApp Penyelenggaraan KKTF oleh ${actor}`;

        await base44.entities.MaintenanceRequest.update(req.id, {
          status: req.status === 'Completed' ? 'Completed' : 'Followed Up',
          last_followed_up_at: nowIso,
          latest_followup_note: note,
          followed_up_by: actor
        });

        await logAudit(currentUser, 'MAINTENANCE_WA_DISPATCHED', 'Maintenance', {
          id: req.id,
          unit: CATEGORY_UNIT_MAP[req.category]?.unit,
          note
        });

        toast.success('Mesej dibuka di WhatsApp! Rekod susulan telah dikemaskini.');
        setWaModalOpen(false);
        init();
      } catch (e) {
        console.error('Error logging WA dispatch:', e);
      }
    }
  }

  // COPY WHATSAPP TEXT
  function handleCopyWhatsAppText(req) {
    const text = generateWhatsAppMessage(req);
    navigator.clipboard.writeText(text);
    setCopiedWa(true);
    toast.success('Format mesej WhatsApp disalin ke papan keratan (clipboard)!');
    setTimeout(() => setCopiedWa(false), 2500);
  }

  // QUICK LOG SAVE
  async function handleSaveQuickLog() {
    if (!selectedReqForLog || !quickLogText.trim()) {
      toast.error('Sila masukkan catatan susulan');
      return;
    }

    setSavingLog(true);
    try {
      const nowIso = new Date().toISOString();
      const actor = currentUser?.full_name || currentUser?.email || 'Felo/Staf';
      const fullNote = `${quickLogText.trim()} (oleh ${actor})`;

      await base44.entities.MaintenanceRequest.update(selectedReqForLog.id, {
        latest_followup_note: fullNote,
        last_followed_up_at: nowIso,
        followed_up_by: actor,
        status: selectedReqForLog.status === 'Submitted' ? 'Followed Up' : selectedReqForLog.status
      });

      await logAudit(currentUser, 'MAINTENANCE_LOG_ADDED', 'Maintenance', {
        id: selectedReqForLog.id,
        note: fullNote
      });

      toast.success('Catatan susulan berjaya disimpan!');
      setLogModalOpen(false);
      setSelectedReqForLog(null);
      setQuickLogText('');
      init();
    } catch (e) {
      console.error(e);
      toast.error('Gagal menyimpan catatan susulan');
    } finally {
      setSavingLog(false);
    }
  }

  // STUDENT / STAFF GROUND VERIFICATION CONFIRMATION
  async function handleConfirmCompletion() {
    if (!selectedReqForComplete) return;

    setCompleting(true);
    try {
      const verifierName = myStudent?.full_name || currentUser?.full_name || currentUser?.email;
      const now = new Date();
      const nowIso = now.toISOString();
      const todayDate = nowIso.split('T')[0];

      // Calculate exact resolution SLA duration in hours
      const startTime = selectedReqForComplete.submitted_at 
        ? new Date(selectedReqForComplete.submitted_at).getTime()
        : (selectedReqForComplete.created_date ? new Date(selectedReqForComplete.created_date).getTime() : now.getTime());
      
      const durationHours = Math.max(0.1, Number(((now.getTime() - startTime) / (1000 * 60 * 60)).toFixed(1)));

      await base44.entities.MaintenanceRequest.update(selectedReqForComplete.id, {
        status: 'Completed',
        completion_date: todayDate,
        completed_at: nowIso,
        resolution_duration_hours: durationHours,
        completion_remarks: completeRemarks.trim() || 'Pembaikan telah disahkan siap oleh residen / felo.',
        completion_photo: completePhoto || null,
        verified_by: isStaff ? `Felo/Staf: ${verifierName}` : `Residen: ${verifierName}`
      });

      await logAudit(currentUser, 'MAINTENANCE_VERIFIED_COMPLETED', 'Maintenance', {
        id: selectedReqForComplete.id,
        verified_by: verifierName,
        duration_hours: durationHours,
        remarks: completeRemarks
      });

      toast.success(`Pengesahan siap direkodkan! Tempoh penyelesaian: ${formatResolutionTime(durationHours)}`);
      setCompleteModalOpen(false);
      setSelectedReqForComplete(null);
      setCompleteRemarks('Kerosakan telah dibaiki dan diuji dengan baik oleh juruteknik JPP.');
      setCompletePhoto(null);
      init();
    } catch (err) {
      console.error(err);
      toast.error('Gagal merekod pengesahan pembaikan');
    } finally {
      setCompleting(false);
    }
  }

  // SEARCH AND FILTER LOGIC
  const filtered = requests.filter(r => {
    // STRICT SECURITY ISOLATION FOR STUDENTS:
    // A student MUST ONLY EVER see their own complaints
    if (!isStaff) {
      const studentKeys = [
        String(currentUser?.id || '').toLowerCase(),
        String(currentUser?.email || '').toLowerCase(),
        String(myStudent?.id || '').toLowerCase(),
        String(myStudent?.student_id || '').toLowerCase()
      ].filter(Boolean);

      const rStudentId = String(r.student_id || '').toLowerCase();
      const rStudentName = String(r.student_name || '').toLowerCase();
      const rCreatedBy = String(r.created_by || '').toLowerCase();

      const isOwner = studentKeys.some(k => 
        rStudentId === k || 
        rCreatedBy === k || 
        rStudentName.includes(k)
      );

      if (!isOwner) return false;
    }

    if (filter === 'all') {
      // keep
    } else if (filter === 'pending_ref') {
      if (r.status === 'Completed' || r.myserv_ticket_no) return false;
    } else if (filter === 'has_ref') {
      if (!r.myserv_ticket_no) return false;
    } else if (filter === 'overdue') {
      const days = getDaysElapsed(r.submitted_at || r.created_date);
      if (r.status === 'Completed' || days < 3) return false;
    } else if (filter !== r.status) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLoc = (r.specific_location || '').toLowerCase().includes(q);
      const matchRoom = (r.room_number || '').toLowerCase().includes(q);
      const matchBlock = (r.block_name || '').toLowerCase().includes(q);
      const matchStudent = (r.student_name || '').toLowerCase().includes(q);
      const matchRef = (r.myserv_ticket_no || '').toLowerCase().includes(q);
      const matchCat = (r.category || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchLoc && !matchRoom && !matchBlock && !matchStudent && !matchRef && !matchCat && !matchDesc) {
        return false;
      }
    }
    return true;
  });

  // KPI STATS FOR MONITORING
  const totalActive = requests.filter(r => r.status !== 'Completed').length;
  const totalWithRef = requests.filter(r => r.status !== 'Completed' && r.myserv_ticket_no).length;
  const totalOverdue = requests.filter(r => r.status !== 'Completed' && getDaysElapsed(r.submitted_at || r.created_date) >= 3).length;
  const totalCompleted = requests.filter(r => r.status === 'Completed').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Laporan Kerosakan & Pemantauan JPP" description="Memuatkan data pemantauan kerosakan..." />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SINGLE CLEAN HEADER */}
      <PageHeader
        title={isStaff ? "Laporan Kerosakan & Pemantauan JPP" : "Aduan Kerosakan Saya"}
        description={isStaff 
          ? "Pantau aduan kerosakan kolej, selaras bersama kumpulan WhatsApp Penyelenggaraan (M&E, Civil, Cleaner, Felo) & semak No. MyServ" 
          : "Pantau status aduan kerosakan anda sendiri, semak No. MyServ & buat pengesahan siap pembaikan di bilik anda."}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isStaff && (
              <Button 
                variant="outline"
                size="sm" 
                onClick={() => setDossierModalOpen(true)}
                className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40 shadow-xs font-semibold text-xs h-9"
              >
                <FileText className="w-4 h-4 text-indigo-600" /> Dossier Blok (A4)
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleOpenDialog} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm font-semibold text-xs h-9"
            >
              <Plus className="w-4 h-4" /> 
              {isStaff ? 'Rekod Aduan / Kerosakan Tapak' : 'Lapor Kerosakan Baru'}
            </Button>
          </div>
        }
      />

      {/* WHATSAPP GROUP & JPP MONITORING BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/20 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-emerald-500/30 text-emerald-300 border-emerald-400/30 text-[11px] px-2.5 py-0.5 font-medium flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-emerald-400" /> WhatsApp Group Penyelenggaraan KKTF
              </Badge>
              <span className="text-xs text-indigo-200 font-mono">Cleaner • M&E • Civil • Admin • Felo</span>
            </div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-white">
              Aliran Pemantauan & Tindakan Susulan JPP (UMS MyServ)
            </h3>
            <p className="text-xs text-indigo-200/90 max-w-2xl">
              Pentadbiran & Felo KKTF bertindak sebagai pemantau dan penyelaras susulan. Setiap aduan dihebahkan ke unit bertugas melalui format WhatsApp rasmi bersepadu.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs w-full lg:w-auto shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
              <div>
                <p className="font-semibold text-white">Rekod di MyKKTF</p>
                <p className="text-[10px] text-slate-300">Dapatkan REQ MyServ</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
              <div>
                <p className="font-semibold text-white">Hebah ke Group WA</p>
                <p className="text-[10px] text-slate-300">Tag M&E / Civil / Cleaner</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
              <div>
                <p className="font-semibold text-white">Sahkan di Lokasi</p>
                <p className="text-[10px] text-slate-300">Selesai & Catat SLA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MONITORING STATS TILES (STAFF & ADMIN) vs STUDENT PERSONAL STATS */}
      {isStaff ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Jumlah Aktif</span>
              <Wrench className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-heading font-bold text-foreground mt-1">{totalActive}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sedang dipantau di kolej</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Ada No. MyServ</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-heading font-bold text-blue-600 mt-1">{totalWithRef}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Telah dihantar ke portal JPP</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Perlu Susulan (&ge;3 Hari)</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl font-heading font-bold text-amber-600 mt-1">{totalOverdue}</p>
            <p className="text-[10px] text-amber-700 mt-0.5 font-medium">Saranan heboh ke WhatsApp</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Disahkan Selesai</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-heading font-bold text-emerald-600 mt-1">{totalCompleted}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Telah siap & diuji di lokasi</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Aduan Aktif Saya</span>
                <Wrench className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-xl font-heading font-bold text-foreground mt-1">{totalActive}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sedang diproses / dibaiki</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Ada No. TAMS / MyServ</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xl font-heading font-bold text-blue-600 mt-1">{totalWithRef}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Telah didaftar ke JPP</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-3.5 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Selesai & Berjaya</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-heading font-bold text-emerald-600 mt-1">{totalCompleted}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Kerosakan telah siap dibaiki</p>
            </div>
          </div>

          <div className="p-3 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 rounded-2xl flex items-center justify-between text-xs text-sky-900 dark:text-sky-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>Paparan Privasi Pelajar:</strong> Anda hanya melihat status bagi aduan kerosakan yang didaftarkan atas akaun anda sendiri.
              </span>
            </div>
            <Badge className="bg-sky-200/70 dark:bg-sky-900/60 text-sky-900 dark:text-sky-200 border-none text-[10px] font-mono font-bold">
              {requests.length} Rekod Anda
            </Badge>
          </div>
        </div>
      )}

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Cari bilik, blok, pelapor, no. REQ..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-56 h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Tapis Status & Keutamaan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isStaff ? `Semua Laporan (${requests.length})` : `Semua Aduan Saya (${requests.length})`}</SelectItem>
              <SelectItem value="overdue">🚨 Perlu Susulan (&ge;3 Hari) ({totalOverdue})</SelectItem>
              <SelectItem value="pending_ref">Menunggu No. TAMS</SelectItem>
              <SelectItem value="has_ref">Telah Ada No. TAMS</SelectItem>
              <SelectItem value="Submitted">Status: Submitted</SelectItem>
              <SelectItem value="Followed Up">Status: Followed Up</SelectItem>
              <SelectItem value="In Progress">Status: In Progress</SelectItem>
              <SelectItem value="Completed">Status: Completed ({totalCompleted})</SelectItem>
            </SelectContent>
          </Select>

          {isStaff && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setDossierModalOpen(true)}
              className="h-9 text-xs gap-1.5 text-[#132644] border-slate-300 hover:bg-slate-100 font-semibold shrink-0"
              title="Jana Dokumen Ringkasan Pemeriksaan Blok A4 (Dossier)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> Dossier Blok (A4)
            </Button>
          )}

          {!isStaff && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer')}
              className="h-9 text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Portal MyServ
            </Button>
          )}
        </div>
      </div>

      {/* REQUESTS LIST / CARDS */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={Wrench} 
          title="Tiada Laporan Kerosakan Ditemui" 
          description={isStaff ? "Semua aduan kerosakan telah diselesaikan atau tiada padanan carian." : "Anda belum menghantar sebarang laporan kerosakan."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const hasRef = Boolean(r.myserv_ticket_no);
            const isCompleted = r.status === 'Completed';
            const unitInfo = CATEGORY_UNIT_MAP[r.category] || CATEGORY_UNIT_MAP['Others'];
            const daysElapsed = getDaysElapsed(r.submitted_at || r.created_date);
            const isOverdue = !isCompleted && daysElapsed >= 3;
            const isUrgent = r.urgency === 'Urgent';

            return (
              <div 
                key={r.id} 
                className={`bg-card border rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between space-y-3 relative ${
                  isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : isUrgent 
                      ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-300' 
                      : isOverdue 
                        ? 'border-amber-300 bg-amber-50/10' 
                        : 'border-border hover:border-indigo-200'
                }`}
              >
                <div>
                  {/* Top Location, Unit Badge & Status Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{r.specific_location || `Bilik ${r.room_number}`}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Pelapor: <span className="font-medium text-slate-700">{r.student_name}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${statusBadge[r.status] || 'bg-slate-100'}`}>
                        {STATUS_LABELS[r.status] || r.status}
                      </Badge>
                      {isUrgent && (
                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                          <Flame className="w-2.5 h-2.5" /> Kecemasan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category, Smart Unit Routing & Aging Counter */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {/* Unit Tag for WhatsApp routing */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 ${unitInfo.color}`}>
                      <span>{unitInfo.icon}</span>
                      <span>{unitInfo.tag}</span>
                    </span>

                    {r.location_type && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-600">
                        {r.location_type}
                      </span>
                    )}

                    {/* Aging / Days Elapsed Badge */}
                    {!isCompleted && (
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md flex items-center gap-1 ml-auto font-medium ${
                        isOverdue 
                          ? 'bg-amber-100 text-amber-800 font-bold border border-amber-200' 
                          : 'text-slate-500 bg-slate-50'
                      }`}>
                        <Clock className="w-3 h-3" /> {daysElapsed === 0 ? 'Hari ini' : `${daysElapsed} hari`}
                      </span>
                    )}
                  </div>

                  {/* Description Box */}
                  <p className="text-xs text-foreground/90 line-clamp-3 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                    {r.description}
                  </p>

                  {/* Photo Attachment if available */}
                  {r.photo && (
                    <div className="mt-2.5 overflow-hidden rounded-xl border border-border">
                      <img src={r.photo} alt="Lampiran Kerosakan" className="w-full h-28 object-cover hover:scale-105 transition-transform" />
                    </div>
                  )}

                  {/* LATEST FOLLOW-UP NOTE (IF ANY) */}
                  {r.latest_followup_note && (
                    <div className="mt-2.5 p-2 bg-purple-50/70 rounded-xl border border-purple-200/80 text-[11px] text-purple-950 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-purple-900">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-purple-600" /> Catatan Susulan Terkini:
                        </span>
                        {r.last_followed_up_at && (
                          <span className="text-[9px] font-mono text-purple-700 font-normal">
                            {formatDateTime(r.last_followed_up_at)}
                          </span>
                        )}
                      </div>
                      <p className="italic text-[10.5px] leading-relaxed text-purple-900">
                        "{r.latest_followup_note}"
                      </p>
                    </div>
                  )}

                  {/* UMS TAMS / MYSERV REFERENCE NUMBER BOX */}
                  <div className="mt-3 pt-2.5 border-t border-border">
                    {hasRef ? (
                      <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide flex items-center gap-1 truncate">
                            <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" /> No. Rujukan TAMS / JPP:
                          </p>
                          <a 
                            href={UMS_MYSERV_URL} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-mono font-bold text-blue-950 hover:underline flex items-center gap-1 mt-0.5 truncate"
                          >
                            {r.myserv_ticket_no} <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />
                          </a>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-blue-700 hover:bg-blue-100"
                            title="Salin butiran terformat untuk TAMS"
                            onClick={() => copyTamsFormat(r)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-blue-700 hover:bg-blue-100"
                            title="Kemaskini No. Rujukan TAMS"
                            onClick={() => {
                              setSelectedReqForRef(r);
                              setInputRefNumber(r.myserv_ticket_no || '');
                              setRefModalOpen(true);
                            }}
                          >
                            <FileEdit className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 truncate">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Belum Ada No. TAMS
                          </p>
                          <p className="text-[10px] text-amber-700 truncate">Daftar ke TAMS & masukkan no. tiket</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button 
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg px-2"
                            title="Salin Format TAMS"
                            onClick={() => copyTamsFormat(r)}
                          >
                            <Copy className="w-3 h-3 text-amber-700" />
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg px-2.5"
                            onClick={() => {
                              setSelectedReqForRef(r);
                              setInputRefNumber('');
                              setRefModalOpen(true);
                            }}
                          >
                            + No. TAMS
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* IF COMPLETED: DISPLAY TIMESTAMP & RESOLUTION SLA & DETAILS */}
                  {isCompleted && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Pembaikan Selesai
                        </span>
                        {r.completed_at ? (
                          <span className="text-[10px] text-emerald-800 font-mono font-medium flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3 text-emerald-600" /> {formatDateTime(r.completed_at)}
                          </span>
                        ) : r.completion_date ? (
                          <span className="text-[11px] text-emerald-700 font-medium">{r.completion_date}</span>
                        ) : null}
                      </div>

                      {/* RESOLUTION SLA DURATION */}
                      {r.resolution_duration_hours && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-900 bg-emerald-100/70 px-2 py-1 rounded-md">
                          <Timer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Tempoh Selesai: <strong>{formatResolutionTime(r.resolution_duration_hours)}</strong></span>
                        </div>
                      )}

                      {r.verified_by && (
                        <p className="text-[11px] text-emerald-800 pt-0.5">
                          Disahkan oleh: <span className="font-semibold">{r.verified_by}</span>
                        </p>
                      )}
                      {r.completion_remarks && (
                        <p className="text-[11px] text-emerald-900 bg-white/80 p-2 rounded-lg border border-emerald-200/60 mt-1 italic">
                          "{r.completion_remarks}"
                        </p>
                      )}
                      {r.completion_photo && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-emerald-200">
                          <img src={r.completion_photo} alt="Foto Selepas Pembaikan" className="w-full h-24 object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="pt-2 border-t border-border flex flex-col gap-2">
                  {/* JANA BORANG LAPORAN A4 BUTTON (AVAILABLE FOR EVERY REPORT) */}
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReqForReport(r);
                      setDamageReportModalOpen(true);
                    }}
                    className="w-full h-8 text-xs text-[#132644] border-slate-300 hover:bg-slate-100 font-semibold flex items-center justify-center gap-1.5 rounded-xl shadow-2xs"
                    title="Jana Borang Pemeriksaan Fizikal & Arahan Kerja A4 (PDF / Cetak)"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" /> Jana Borang Laporan A4
                  </Button>

                  {/* WHATSAPP GROUP DISPATCH BUTTON (STAFF / WARDEN ONLY) */}
                  {!isCompleted && isStaff && (
                    <div className="flex gap-1.5">
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedReqForWa(r);
                          setWaFollowupNote('');
                          setWaModalOpen(true);
                        }}
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm rounded-xl"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Hantar ke Group WA
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline"
                        title="Catat Maklum Balas / Susulan Dalaman"
                        onClick={() => {
                          setSelectedReqForLog(r);
                          setQuickLogText(r.latest_followup_note || '');
                          setLogModalOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* STUDENT NOTICE */}
                  {!isCompleted && !isStaff && (
                    <div className="p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Laporan anda dipantau oleh Felo Blok untuk tindakan susulan JPP.</span>
                    </div>
                  )}

                  {/* STUDENT SELF-CONFIRMATION OR STAFF VERIFY BUTTON */}
                  {!isCompleted && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedReqForComplete(r);
                        setCompleteRemarks(isStaff ? 'Kerosakan disahkan siap oleh felo/staf kolej.' : 'Kerosakan telah dibaiki dan diuji dengan baik oleh juruteknik JPP.');
                        setCompletePhoto(null);
                        setCompleteModalOpen(true);
                      }}
                      variant="outline"
                      className="w-full h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold flex items-center justify-center gap-1.5 rounded-xl"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Sahkan Siap di Lokasi
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: NEW DAMAGE REPORT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" /> Borang Laporan Kerosakan Kolej
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Langkah 1: Lengkapkan maklumat kerosakan sebelum dihantar ke portal UMS MyServ dan kumpulan WhatsApp penyelenggaraan.
            </DialogDescription>
          </DialogHeader>

          {isStaff ? (
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Pelapor Rasmi: <strong>{currentUser?.full_name || currentUser?.name || currentUser?.email}</strong></span>
              </div>
              <Badge className="bg-emerald-600 text-white border-none text-[11px] font-semibold">
                {currentUser?.role === 'warden' ? 'Felo / Warden' : (currentUser?.role === 'jakmas' ? 'JAKMAS' : 'Staf Kolej')}
                {assignedBlocks.length > 0 && ` (${assignedBlocks.join(', ')})`}
              </Badge>
            </div>
          ) : (
            myStudent && (
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Mikro-Alamat: <strong>{myStudent.full_name}</strong></span>
                </div>
                <Badge className="bg-indigo-200/60 text-indigo-800 border-none font-mono text-[11px]">
                  {myStudent.block_name || 'Blok'} - {myStudent.room_number ? `Bilik ${myStudent.room_number}` : 'Tiada Bilik'}
                </Badge>
              </div>
            )
          )}

          <div className="space-y-4 mt-2">
            {/* LOKASI KEROSAKAN */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Skop Lokasi Kerosakan *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {(isStaff ? [
                  { id: 'Student Room', label: 'Bilik Pelajar' },
                  { id: 'Common Area', label: 'Fasiliti Bersama' },
                  { id: 'Other Facility', label: 'Kawasan Blok / Lain' }
                ] : [
                  { id: 'My Room', label: 'Bilik Sendiri' },
                  { id: 'Common Area', label: 'Fasiliti Bersama' },
                  { id: 'Other Facility', label: 'Lokasi Lain' }
                ]).map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        location_type: type.id,
                        specific_location: type.id === 'My Room' && myStudent?.room_number 
                          ? `Bilik ${myStudent.room_number} (${myStudent.block_name || 'Blok'})` 
                          : ''
                      }));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      form.location_type === type.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-card border-border text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {form.location_type === 'Common Area' ? (
              <div>
                <Label className="text-xs font-medium">Pilih Fasiliti Bersama *</Label>
                <Select 
                  value={form.specific_location} 
                  onValueChange={v => setForm({ ...form, specific_location: v })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1 bg-card">
                    <SelectValue placeholder="Pilih Fasiliti / Kawasan Awam" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_FACILITIES.map(fac => (
                      <SelectItem key={fac} value={fac}>{fac}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : form.location_type === 'Other Facility' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Blok (Jika Berkaitan)</Label>
                  <Input 
                    placeholder="cth: Blok B Aras 2" 
                    value={form.block_name} 
                    onChange={e => setForm({ ...form, block_name: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Perincian Lokasi *</Label>
                  <Input 
                    placeholder="cth: Lampu Tangga Belakang" 
                    value={form.specific_location} 
                    onChange={e => setForm({ ...form, specific_location: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                  />
                </div>
              </div>
            ) : isStaff ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Pilih Blok Kediaman *</Label>
                  <Select 
                    value={form.block_name} 
                    onValueChange={v => setForm({ ...form, block_name: v })}
                  >
                    <SelectTrigger className="h-9 text-xs mt-1 bg-card">
                      <SelectValue placeholder="Pilih Blok" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLEGE_BLOCKS.map(blk => (
                        <SelectItem key={blk} value={blk}>
                          {blk} {assignedBlocks.includes(blk) ? '★ (Blok Jagaan)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Nombor Bilik Pelajar *</Label>
                  <Input 
                    value={form.room_number} 
                    onChange={e => setForm({ ...form, room_number: e.target.value })} 
                    className="h-9 text-xs mt-1 font-mono uppercase" 
                    placeholder="cth: 204 atau B-2-04" 
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Nombor Bilik *</Label>
                  <Input 
                    value={form.room_number} 
                    onChange={e => setForm({ ...form, room_number: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                    placeholder="cth: 204" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Blok Kediaman</Label>
                  <Input 
                    value={form.block_name} 
                    onChange={e => setForm({ ...form, block_name: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                    placeholder="cth: Blok A" 
                  />
                </div>
              </div>
            )}

            {/* KATEGORI & KEUTAMAAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Kategori Kerosakan *</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_UNIT_MAP).map(c => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_UNIT_MAP[c].icon} {c} ({CATEGORY_UNIT_MAP[c].tag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium">Tahap Keutamaan</Label>
                <Select value={form.urgency} onValueChange={v => setForm({ ...form, urgency: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Biasa (Standard)</SelectItem>
                    <SelectItem value="Urgent">🚨 Kecemasan (Paip Utama / Tiada Elektrik)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PENERANGAN */}
            <div>
              <Label className="text-xs font-medium">Penerangan Kerosakan *</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                className="text-xs mt-1" 
                rows={3} 
                placeholder="Nyatakan dengan terperinci kerosakan yang dialami..." 
              />
            </div>

            {/* LAMPIRAN FOTO DENGAN AUTO-TIMESTAMP */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Muat Naik Foto Kerosakan (Pilihan)</Label>
                {stampingPhoto && (
                  <span className="text-[10px] text-amber-600 font-semibold animate-pulse">Menjana cop masa...</span>
                )}
              </div>
              <Input 
                type="file" 
                onChange={handleFileChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp" 
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Foto akan secara automatik dicap dengan cop masa rasmi, lokasi bilik & pengesahan KKTF.
              </p>
              {form.photo && (
                <div className="mt-2 rounded-xl overflow-hidden border border-border shadow-xs">
                  <img src={form.photo} alt="Foto Kerosakan Bercop Masa" className="w-full h-36 object-contain bg-slate-950" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              type="button" 
              size="sm" 
              onClick={handleSubmitAndLaunchMyServ}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
            >
              Simpan & Buka Portal TAMS / MyServ <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: WHATSAPP GROUP DISPATCH & FORMAT PREVIEW */}
      <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2 text-emerald-800">
              <MessageCircle className="w-5 h-5 text-emerald-600" /> Hebah ke WhatsApp Group Penyelenggaraan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Mesej berstruktur ini akan dihantar ke WhatsApp Group KKTF (Cleaner, M&E, Civil, Admin, Felo) dengan tag unit yang tepat.
            </DialogDescription>
          </DialogHeader>

          {selectedReqForWa && (
            <div className="space-y-3 mt-2">
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-950">
                <span className="font-semibold">
                  Unit Bertanggungjawab: {CATEGORY_UNIT_MAP[selectedReqForWa.category]?.unit || 'UNIT AM'}
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px]">
                  {CATEGORY_UNIT_MAP[selectedReqForWa.category]?.tag}
                </Badge>
              </div>

              {/* MESSAGE PREVIEW BOX */}
              <div>
                <Label className="text-xs font-medium text-slate-700">Pratonton Mesej WhatsApp:</Label>
                <div className="mt-1 p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto selection:bg-emerald-500 selection:text-black">
                  {generateWhatsAppMessage(selectedReqForWa)}
                </div>
              </div>

              {/* OPTIONAL FOLLOW-UP NOTE FOR STAFF AUDIT */}
              {isStaff && (
                <div>
                  <Label className="text-xs font-medium text-slate-700">
                    Catatan Tambahan untuk Rekod Sistem (Pilihan)
                  </Label>
                  <Input 
                    placeholder="cth: Telah maklumkan kepada En. Razif (JPP) secara lisan juga"
                    value={waFollowupNote}
                    onChange={e => setWaFollowupNote(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t border-border mt-3">
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={() => handleCopyWhatsAppText(selectedReqForWa)}
              className="w-full sm:w-auto text-xs gap-1.5"
            >
              {copiedWa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedWa ? 'Disalin!' : 'Salin Mesej'}
            </Button>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setWaModalOpen(false)}>
                Tutup
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleOpenWhatsAppGroup(selectedReqForWa)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Buka WhatsApp Sekarang
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: UPDATE NO RUJUKAN MYSERV */}
      <Dialog open={refModalOpen} onOpenChange={setRefModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600" /> Kemaskini No. Rujukan TAMS / MyServ
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan No. Tiket TAMS (Total Asset Management System) atau No. REQ MyServ selepas pendaftaran dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-semibold text-slate-900">
                Lokasi: {selectedReqForRef?.specific_location || selectedReqForRef?.room_number}
              </p>
              <p className="text-slate-500 line-clamp-1">{selectedReqForRef?.description}</p>
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">
                No. Rujukan TAMS / MyServ (Contoh: TAMS-2026-0842 atau REQ-2026-3938) *
              </Label>
              <Input 
                placeholder="TAMS-2026-0842" 
                value={inputRefNumber} 
                onChange={e => setInputRefNumber(e.target.value)} 
                className="h-10 text-sm font-mono mt-1 font-semibold uppercase tracking-wider"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Format: <span className="font-mono font-medium text-indigo-600">TAMS-YYYY-XXXX</span> atau <span className="font-mono font-medium text-indigo-600">REQ-YYYY-XXXX</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t border-border mt-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1 w-full sm:w-auto"
                onClick={() => copyTamsFormat(selectedReqForRef)}
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" /> Salin Format TAMS
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                size="sm" 
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0"
                onClick={() => window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Portal
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRefModalOpen(false)}>
                Nanti
              </Button>
              <Button 
                size="sm" 
                disabled={updatingRef}
                onClick={handleSaveRefNumber}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {updatingRef ? 'Menyimpan...' : 'Simpan No. Rujukan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: QUICK FOLLOW-UP NOTE (STAFF) */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-purple-600" /> Catat Tindakan Susulan JPP / Kontraktor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Rekod maklumat lisan, panggilan, atau semakan kontraktor untuk rujukan pihak kolej dan felo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <p className="font-semibold text-slate-800">
                {selectedReqForLog?.specific_location || selectedReqForLog?.room_number} — {selectedReqForLog?.category}
              </p>
              {selectedReqForLog?.myserv_ticket_no && (
                <p className="text-blue-700 font-mono font-medium">{selectedReqForLog.myserv_ticket_no}</p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Catatan Susulan *</Label>
              <Textarea 
                value={quickLogText}
                onChange={e => setQuickLogText(e.target.value)}
                placeholder="cth: Dihubungi juruteknik elektrik JPP. Bahan gantian telah dipesan dan dijangka siap esok."
                rows={3}
                className="text-xs mt-1"
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-3">
            <Button variant="outline" size="sm" onClick={() => setLogModalOpen(false)}>
              Batal
            </Button>
            <Button 
              size="sm"
              disabled={savingLog}
              onClick={handleSaveQuickLog}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
            >
              {savingLog ? 'Menyimpan...' : 'Simpan Catatan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: PENGESAHAN PEMBAIKAN SELESAI DI LOKASI */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Pengesahan Pembaikan Kerosakan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sahkan bahawa pihak juruteknik/kontraktor JPP telah menyelesaikan kerja pembaikan di lokasi dan berfungsi dengan baik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs space-y-1 text-emerald-950">
              <p className="font-semibold text-slate-900">
                Lokasi: {selectedReqForComplete?.specific_location || selectedReqForComplete?.room_number}
              </p>
              <p className="text-slate-600 line-clamp-2">{selectedReqForComplete?.description}</p>
              {selectedReqForComplete?.myserv_ticket_no && (
                <p className="font-mono text-emerald-800 font-bold pt-1">
                  No. Rujukan MyServ: {selectedReqForComplete.myserv_ticket_no}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Catatan Pengesahan *</Label>
              <Textarea 
                value={completeRemarks} 
                onChange={e => setCompleteRemarks(e.target.value)} 
                className="text-xs mt-1" 
                rows={2} 
                placeholder="cth: Lampu dan suis telah diganti baru dan diuji berfungsi dengan baik." 
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-slate-700">Foto Selepas Pembaikan (Pilihan)</Label>
                {stampingCompletePhoto && (
                  <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">Menjana cop masa...</span>
                )}
              </div>
              <Input 
                type="file" 
                onChange={handleCompletePhotoChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp" 
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Foto akan secara automatik dicap dengan status siap, cop masa & lokasi pengesahan.
              </p>
              {completePhoto && (
                <div className="mt-2 rounded-xl overflow-hidden border border-emerald-300 shadow-xs">
                  <img src={completePhoto} alt="Foto Pengesahan Siap" className="w-full h-36 object-contain bg-slate-950" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border mt-3">
            <Button variant="outline" size="sm" onClick={() => setCompleteModalOpen(false)}>
              Batal
            </Button>
            <Button 
              size="sm" 
              disabled={completing}
              onClick={handleConfirmCompletion}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
            >
              <ThumbsUp className="w-3.5 h-3.5" /> {completing ? 'Mengesahkan...' : 'Sahkan Selesai Sekarang'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 6: OFFICIAL DAMAGE REPORT / WORK-ORDER MODAL (A4 PRINTABLE / PDF) */}
      <DamageReportModal 
        open={damageReportModalOpen}
        onOpenChange={setDamageReportModalOpen}
        request={selectedReqForReport}
        categoryUnitMap={CATEGORY_UNIT_MAP}
      />

      {/* MODAL 7: CONSOLIDATED BLOCK INSPECTION DOSSIER MODAL (A4 PRINTABLE / PDF) */}
      <BlockInspectionDossierModal 
        open={dossierModalOpen}
        onOpenChange={setDossierModalOpen}
        requests={requests}
        currentBlockFilter={filter}
        categoryUnitMap={CATEGORY_UNIT_MAP}
        assignedBlocks={assignedBlocks}
        currentUser={currentUser}
      />
    </div>
  );
}