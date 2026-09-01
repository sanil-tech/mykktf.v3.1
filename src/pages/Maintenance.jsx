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
  Image as ImageIcon
} from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { toast } from 'sonner';
import { validateAttachment } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

const UMS_MYSERV_URL = 'https://aset.ums.edu.my/myserv/';

const statusBadge = { 
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200', 
  Assigned: 'bg-blue-50 text-blue-700 border-blue-200', 
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200', 
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
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

const STAFF_ROLES = ['warden', 'staff', 'college_admin', 'super_admin'];

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [filter, setFilter] = useState('all');

  // Modal States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refModalOpen, setRefModalOpen] = useState(false);
  const [selectedReqForRef, setSelectedReqForRef] = useState(null);
  const [inputRefNumber, setInputRefNumber] = useState('');
  const [updatingRef, setUpdatingRef] = useState(false);

  // Student Self-Verification Modal States
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedReqForComplete, setSelectedReqForComplete] = useState(null);
  const [completeRemarks, setCompleteRemarks] = useState('Kerosakan telah dibaiki dan diuji dengan baik oleh juruteknik JPP.');
  const [completePhoto, setCompletePhoto] = useState(null);
  const [completing, setCompleting] = useState(false);

  // New Request Form
  const [form, setForm] = useState({
    location_type: 'My Room',
    room_number: '',
    block_name: '',
    specific_location: '',
    category: 'Electrical',
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
          reqs = reqs.filter(r => !r.block_name || blockNames.includes(r.block_name));
        }
      }
    } else {
      const students = await base44.entities.Student.filter({ email: user.email });
      const student = students[0] || null;
      setMyStudent(student);
      reqs = student
        ? await base44.entities.MaintenanceRequest.filter({ student_id: student.id })
        : [];
    }
    setRequests(reqs);
    setLoading(false);
  }

  const handleOpenDialog = () => {
    setForm({
      location_type: 'My Room',
      room_number: myStudent?.room_number || '',
      block_name: myStudent?.block_name || '',
      specific_location: myStudent ? `Bilik ${myStudent.room_number}, ${myStudent.block_name}` : '',
      category: 'Electrical',
      description: '',
      photo: null
    });
    setDialogOpen(true);
  };

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

  const handleCompletePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      setCompletePhoto(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCompletePhoto(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // STEP 1 & 2: Save to MyKKTF and Launch MyServ
  async function handleSubmitAndLaunchMyServ() {
    if (!form.description) { 
      toast.error('Sila isi penerangan kerosakan'); 
      return; 
    }

    const studentName = myStudent?.full_name || currentUser?.full_name || currentUser?.email;
    const studentId = myStudent?.id || currentUser?.id;
    const studentMicroAddress = myStudent?.room_number ? `${myStudent.block_name || 'Blok'} - Bilik ${myStudent.room_number}` : 'N/A';

    const locationDisplay = form.location_type === 'My Room'
      ? (myStudent?.room_number ? `Bilik ${myStudent.room_number} (${myStudent.block_name})` : form.specific_location || 'Bilik Sendiri')
      : (form.specific_location || form.location_type);

    const payload = {
      student_id: studentId,
      student_name: `${studentName} [${studentMicroAddress}]`,
      room_number: form.location_type === 'My Room' ? (myStudent?.room_number || 'My Room') : (form.room_number || 'Common Area'),
      block_name: form.block_name || myStudent?.block_name || '',
      location_type: form.location_type,
      specific_location: locationDisplay,
      category: form.category,
      description: form.description,
      myserv_ticket_no: '',
      photo: form.photo || null,
      status: 'Submitted'
    };

    const newRecord = await base44.entities.MaintenanceRequest.create(payload);
    await logAudit(currentUser, 'MAINTENANCE_SUBMITTED', 'Maintenance', { 
      student: studentName, 
      category: form.category, 
      location: locationDisplay
    });

    toast.success('Laporan asas disimpan! Membuka portal UMS MyServ...');
    setDialogOpen(false);

    // Open UMS MyServ in new window
    window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer');

    // Immediately prompt student to prepare No. Rujukan
    setSelectedReqForRef(newRecord);
    setInputRefNumber('');
    setRefModalOpen(true);
    init();
  }

  // STEP 3: Save No Rujukan (e.g. REQ-2026-3938)
  async function handleSaveRefNumber() {
    if (!selectedReqForRef) return;
    if (!inputRefNumber.trim()) {
      toast.error('Sila masukkan No. Rujukan MyServ (cth: REQ-2026-3938)');
      return;
    }

    setUpdatingRef(true);
    try {
      const cleanRef = inputRefNumber.trim().toUpperCase();
      await base44.entities.MaintenanceRequest.update(selectedReqForRef.id, {
        myserv_ticket_no: cleanRef
      });

      await logAudit(currentUser, 'MAINTENANCE_REF_UPDATED', 'Maintenance', { 
        id: selectedReqForRef.id, 
        myserv_ticket_no: cleanRef 
      });

      toast.success(`No. Rujukan ${cleanRef} berjaya dikemaskini!`);
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

  // STUDENT SELF-CONFIRMATION OF COMPLETION
  async function handleConfirmCompletion() {
    if (!selectedReqForComplete) return;

    setCompleting(true);
    try {
      const verifierName = myStudent?.full_name || currentUser?.full_name || currentUser?.email;
      const todayDate = new Date().toISOString().split('T')[0];

      await base44.entities.MaintenanceRequest.update(selectedReqForComplete.id, {
        status: 'Completed',
        completion_date: todayDate,
        completion_remarks: completeRemarks.trim() || 'Pembaikan telah disahkan siap oleh residen.',
        completion_photo: completePhoto || null,
        verified_by: isStaff ? `Staf/Warden: ${verifierName}` : `Residen: ${verifierName}`
      });

      await logAudit(currentUser, 'MAINTENANCE_VERIFIED_COMPLETED', 'Maintenance', {
        id: selectedReqForComplete.id,
        verified_by: verifierName,
        remarks: completeRemarks
      });

      toast.success('Pengesahan pembaikan berjaya direkodkan! Terima kasih atas kerjasama anda.');
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

  async function updateStatus(id, status) {
    await base44.entities.MaintenanceRequest.update(id, { status });
    await logAudit(currentUser, 'MAINTENANCE_UPDATED', 'Maintenance', { id, status });
    toast.success(`Status dikemaskini kepada: ${status}`);
    init();
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) {
    return (
      <div>
        <PageHeader title="Damage & Maintenance Reports" description="Memuatkan laporan kerosakan..." />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SINGLE CLEAN HEADER */}
      <PageHeader
        title="Damage & Maintenance Reports"
        description={isStaff ? "Pantau dan urus aduan kerosakan fasiliti kolej serta No. Rujukan MyServ UMS" : "Lapor kerosakan bilik atau kawasan awam kolej untuk tindakan UMS MyServ"}
        actions={
          !isStaff && (
            <Button size="sm" onClick={handleOpenDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm font-semibold">
              <Plus className="w-4 h-4" /> Lapor Kerosakan Baru
            </Button>
          )
        }
      />

      {/* SINGLE STREAMLINED PIPELINE GUIDE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/20 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/30 text-indigo-300 border-indigo-400/30 text-[11px] px-2.5 py-0.5 font-medium">
                Aliran Bersepadu UMS MyServ
              </Badge>
              <span className="text-xs text-indigo-200 font-mono">aset.ums.edu.my/myserv</span>
            </div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-white">
              3 Langkah Mudah Laporan Kerosakan & Pengesahan Pembaikan
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs w-full lg:w-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
              <span>Isi info di MyKKTF</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
              <span>Hantar di UMS MyServ</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
              <span>Kemas No. REQ & Sahkan</span>
            </div>
          </div>
        </div>
      </div>

      {isStaff && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48 h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Tapis Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status ({requests.length})</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Assigned">Assigned</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* REQUESTS LIST / CARDS */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={Wrench} 
          title="Tiada Laporan Kerosakan Ditemui" 
          description={isStaff ? "Semua aduan kerosakan telah diselesaikan." : "Anda belum menghantar sebarang laporan kerosakan."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const hasRef = Boolean(r.myserv_ticket_no);
            const isCompleted = r.status === 'Completed';

            return (
              <div key={r.id} className={`bg-card border rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between space-y-3 ${isCompleted ? 'border-emerald-200 bg-emerald-50/10' : 'border-border hover:border-indigo-200'}`}>
                <div>
                  {/* Top Location & Status Header */}
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
                    <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${statusBadge[r.status] || 'bg-slate-100'}`}>
                      {r.status}
                    </Badge>
                  </div>

                  {/* Category & Location Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                      {r.category}
                    </span>
                    {r.location_type && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-medium text-indigo-700 border border-indigo-100">
                        {r.location_type}
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

                  {/* UMS MYSERV REFERENCE NUMBER BOX */}
                  <div className="mt-3 pt-2.5 border-t border-border">
                    {hasRef ? (
                      <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> No. Rujukan MyServ:
                          </p>
                          <a 
                            href={UMS_MYSERV_URL} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-mono font-bold text-emerald-950 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            {r.myserv_ticket_no} <ExternalLink className="w-3 h-3 text-emerald-600" />
                          </a>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-emerald-700 hover:bg-emerald-100"
                          title="Kemaskini No. Rujukan"
                          onClick={() => {
                            setSelectedReqForRef(r);
                            setInputRefNumber(r.myserv_ticket_no || '');
                            setRefModalOpen(true);
                          }}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 truncate">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Belum Ada No. Rujukan
                          </p>
                          <p className="text-[10px] text-amber-700 truncate">Sila masukkan selepas selesai di MyServ</p>
                        </div>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium shrink-0 rounded-lg px-2.5"
                          onClick={() => {
                            setSelectedReqForRef(r);
                            setInputRefNumber('');
                            setRefModalOpen(true);
                          }}
                        >
                          + No. Rujukan
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* IF COMPLETED: DISPLAY VERIFICATION DETAILS */}
                  {isCompleted && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Pembaikan Selesai
                        </span>
                        {r.completion_date && (
                          <span className="text-[11px] text-emerald-700 font-medium">{r.completion_date}</span>
                        )}
                      </div>
                      {r.verified_by && (
                        <p className="text-[11px] text-emerald-800">
                          Disahkan oleh: <span className="font-semibold">{r.verified_by}</span>
                        </p>
                      )}
                      {r.completion_remarks && (
                        <p className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-emerald-200/60 mt-1 italic">
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
                  {/* STUDENT SELF-CONFIRMATION BUTTON */}
                  {!isCompleted && !isStaff && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedReqForComplete(r);
                        setCompleteRemarks('Kerosakan telah dibaiki dan diuji dengan baik oleh juruteknik JPP.');
                        setCompletePhoto(null);
                        setCompleteModalOpen(true);
                      }}
                      className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm rounded-xl"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" /> Sahkan Pembaikan Selesai (JPP)
                    </Button>
                  )}

                  {/* STAFF CONTROLS */}
                  {isStaff && (
                    <div className="flex gap-1.5 flex-wrap">
                      {r.status === 'Submitted' && (
                        <Button size="sm" variant="outline" className="text-xs h-7 text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => updateStatus(r.id, 'Assigned')}>
                          Tugaskan Staf
                        </Button>
                      )}
                      {r.status === 'Assigned' && (
                        <Button size="sm" variant="outline" className="text-xs h-7 text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => updateStatus(r.id, 'In Progress')}>
                          Mula Kerja
                        </Button>
                      )}
                      {!isCompleted && (
                        <Button 
                          size="sm" 
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white" 
                          onClick={() => {
                            setSelectedReqForComplete(r);
                            setCompleteRemarks('Kerosakan disahkan siap oleh staf/warden kolej.');
                            setCompletePhoto(null);
                            setCompleteModalOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Sahkan Selesai
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STEP 1 MODAL: NEW DAMAGE REPORT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" /> Borang Laporan Kerosakan Kolej
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Langkah 1 daripada 2: Lengkapkan maklumat kerosakan sebelum dihantar ke portal UMS MyServ.
            </DialogDescription>
          </DialogHeader>

          {myStudent && (
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Mikro-Alamat Residen: <strong>{myStudent.full_name}</strong></span>
              </div>
              <Badge className="bg-indigo-200/60 text-indigo-800 border-none font-mono text-[11px]">
                {myStudent.block_name || 'Blok'} - {myStudent.room_number ? `Bilik ${myStudent.room_number}` : 'Tiada Bilik'}
              </Badge>
            </div>
          )}

          <div className="space-y-4 mt-2">
            {/* LOKASI KEROSAKAN */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Skop Lokasi Kerosakan *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'My Room', label: 'Bilik Sendiri' },
                  { id: 'Common Area', label: 'Fasiliti Bersama' },
                  { id: 'Other Facility', label: 'Lokasi Lain' }
                ].map((type) => (
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

            {/* KATEGORI */}
            <div>
              <Label className="text-xs font-medium">Kategori Kerosakan *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleaning', 'Others'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* LAMPIRAN FOTO */}
            <div>
              <Label className="text-xs font-medium">Muat Naik Foto Kerosakan (Pilihan)</Label>
              <Input 
                type="file" 
                onChange={handleFileChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" 
              />
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
              Simpan & Teruskan ke UMS MyServ <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* STEP 3 MODAL: UPDATE NO RUJUKAN MYSERV */}
      <Dialog open={refModalOpen} onOpenChange={setRefModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-600" /> Kemaskini No. Rujukan UMS MyServ
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan No. Rujukan yang tertera di sistem MyServ selepas anda menghantar aduan.
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
                No. Rujukan MyServ (Contoh: REQ-2026-3938) *
              </Label>
              <Input 
                placeholder="REQ-2026-3938" 
                value={inputRefNumber} 
                onChange={e => setInputRefNumber(e.target.value)} 
                className="h-10 text-sm font-mono mt-1 font-semibold uppercase tracking-wider"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Format: <span className="font-mono font-medium text-indigo-600">REQ-YYYY-XXXX</span> (cth: REQ-2026-3938, REQ-2026-0368)
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border mt-3">
            <Button 
              type="button"
              variant="ghost" 
              size="sm" 
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              onClick={() => window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka MyServ Semula
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setRefModalOpen(false)}>
                Nanti
              </Button>
              <Button 
                size="sm" 
                disabled={updatingRef}
                onClick={handleSaveRefNumber}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                {updatingRef ? 'Menyimpan...' : 'Simpan No. Rujukan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL PENGESAHAN PEMBAIKAN SELESAI (PELAJAR / STAF) */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-600" /> Pengesahan Pembaikan Kerosakan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sahkan bahawa pihak juruteknik/kontraktor JPP telah menyelesaikan kerja pembaikan di lokasi anda.
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
                placeholder="cth: Lampu dan tombol pintu telah diganti dan berfungsi dengan baik." 
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700">Foto Selepas Pembaikan (Pilihan)</Label>
              <Input 
                type="file" 
                onChange={handleCompletePhotoChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp" 
              />
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
    </div>
  );
}