import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  CalendarOff, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  Users, 
  UserX, 
  Loader2, 
  MapPin, 
  Calendar, 
  User, 
  FileText,
  QrCode,
  CheckCircle2,
  Printer,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
  Camera
} from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { logAudit } from '@/lib/audit';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const STATUS_BADGE = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-blue-50 text-blue-800 border-blue-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  Returned: 'bg-emerald-50 text-emerald-800 border-emerald-200'
};

const BLOCKS = [
  'Pondok Pengawal (Pintu Utama)',
  'Blok A',
  'Blok B',
  'Blok C',
  'Blok D',
  'Blok E',
  'Blok F',
  'Blok G'
];

const REVIEWER_ROLES = ['warden', 'super_admin', 'college_admin', 'staff'];
const INITIAL_FORM = {
  leave_type: 'Weekend', destination: '', reason: '',
  departure_date: '', departure_time: '', return_date: '', return_time: ''
};

export default function Leave() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedBlockQr, setSelectedBlockQr] = useState('Pondok Pengawal (Pintu Utama)');
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ inCollege: 0, onLeave: 0, overdue: 0, pendingApproval: 0, returned: 0 });
  const [form, setForm] = useState(INITIAL_FORM);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isReviewer = currentUser && REVIEWER_ROLES.includes(currentUser.role);
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    if (!dialogOpen) setForm(INITIAL_FORM);
  }, [dialogOpen]);

  const fetchLeaveData = useCallback(async (user, student) => {
    try {
      let leaveList = [];
      const isRev = REVIEWER_ROLES.includes(user?.role);

      if (isRev) {
        leaveList = await base44.entities.LeaveApplication.list('-created_date');

        if (user.role === 'warden') {
          const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
          if (wb.length > 0) {
            const blockNames = wb.map(w => w.block_name);
            leaveList = leaveList.filter(l => blockNames.includes(l.block_name));
          }
        }

        const allStudents = await base44.entities.Student.filter({ status: 'Active' });
        
        // Active leaves: approved, departed, and not yet returned
        const approvedLeaves = leaveList.filter(l => 
          l.status === 'Approved' && 
          !l.returned_at && 
          l.departure_date <= today && 
          l.return_date >= today
        );
        
        // Overdue leaves: approved, return date passed, and not yet returned
        const overdueLeaves = leaveList.filter(l => 
          l.status === 'Approved' && 
          !l.returned_at && 
          l.return_date < today
        );
        
        const pendingLeaves = leaveList.filter(l => l.status === 'Pending');
        const returnedLeaves = leaveList.filter(l => l.status === 'Returned' || l.returned_at);

        setStats({
          inCollege: Math.max(0, allStudents.length - approvedLeaves.length - overdueLeaves.length),
          onLeave: approvedLeaves.length,
          overdue: overdueLeaves.length,
          pendingApproval: pendingLeaves.length,
          returned: returnedLeaves.length
        });
      } else if (student) {
        leaveList = await base44.entities.LeaveApplication.filter({ student_id: student.student_id }, '-created_date');
      }

      setApps(leaveList);
    } catch (error) {
      toast({ title: 'Ralat Sistem', description: error.message, variant: 'destructive' });
    }
  }, [today, toast]);

  async function init() {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      let studentProfile = null;
      if (user && !REVIEWER_ROLES.includes(user.role)) {
        let students = await base44.entities.Student.filter({ user_id: user.id });
        if (!students.length) students = await base44.entities.Student.filter({ email: user.email });
        studentProfile = students[0] || null;
        setMyStudent(studentProfile);
      }

      await fetchLeaveData(user, studentProfile);
    } catch (error) {
      toast({ title: 'Ralat Autentikasi', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { init(); }, []);

  async function handleSubmit() {
    if (!form.destination || !form.reason || !form.departure_date || !form.return_date) {
      toast({ title: 'Maklumat Tidak Lengkap', description: 'Sila isi semua ruangan bermarkah (*).', variant: 'destructive' }); 
      return;
    }
    if (!myStudent) { 
      toast({ title: 'Ralat Profil', description: 'Profil maklumat pelajar tidak ditemui.', variant: 'destructive' }); 
      return; 
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        student_id: myStudent.student_id,
        student_name: myStudent.full_name,
        block_name: myStudent.block_name || '',
        room_number: myStudent.room_number || '',
        status: 'Pending'
      };

      await base44.entities.LeaveApplication.create(payload);
      await logAudit(currentUser, 'LEAVE_APPLIED', 'Leave', {
        student: myStudent.full_name,
        destination: form.destination,
        dates: `${form.departure_date} - ${form.return_date}`
      });

      toast({ title: 'Permohonan Dihantar', description: 'Permohonan e-cuti anda telah dihantar untuk semakan Warden.' });
      setDialogOpen(false);
      init();
    } catch (err) {
      toast({ title: 'Gagal Memohon', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(app, status) {
    try {
      await base44.entities.LeaveApplication.update(app.id, {
        status,
        approved_by: currentUser?.full_name || currentUser?.email || 'Pentadbiran KKTF'
      });

      await logAudit(currentUser, 'LEAVE_STATUS_UPDATED', 'Leave', {
        id: app.id,
        status,
        student: app.student_name
      });

      toast({ title: 'Status Dikemaskini', description: `Permohonan telah ditukar kepada: ${status}` });
      init();
    } catch (err) {
      toast({ title: 'Ralat Kemaskini', description: err.message, variant: 'destructive' });
    }
  }

  async function handleManualWardenReturn(app) {
    try {
      const now = new Date();
      const todayStr = now.toLocaleDateString('en-CA');
      const timeStr = now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
      const isLate = app.return_date < todayStr;

      await base44.entities.LeaveApplication.update(app.id, {
        status: 'Returned',
        returned_at: now.toISOString(),
        returned_date: todayStr,
        returned_time: timeStr,
        return_method: 'MANUAL_WARDEN',
        return_status: isLate ? 'Late' : 'On-Time',
        return_scanned_block: `Disahkan oleh ${currentUser?.full_name || 'Warden'}`
      });

      await logAudit(currentUser, 'LEAVE_WARDEN_MANUAL_RETURN', 'Leave', {
        id: app.id,
        student: app.student_name,
        warden: currentUser?.full_name
      });

      toast({ title: 'Pengesahan Kembali Berjaya', description: `Pelajar ${app.student_name} disahkan telah kembali ke kolej.` });
      init();
    } catch (err) {
      toast({ title: 'Ralat', description: err.message, variant: 'destructive' });
    }
  }

  const filteredApps = apps.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'Pending';
    if (filter === 'approved') return a.status === 'Approved';
    if (filter === 'rejected') return a.status === 'Rejected';
    if (filter === 'returned') return a.status === 'Returned' || !!a.returned_at;
    if (filter === 'active_leave') return a.status === 'Approved' && !a.returned_at && a.departure_date <= today && a.return_date >= today;
    if (filter === 'overdue') return a.status === 'Approved' && !a.returned_at && a.return_date < today;
    return true;
  });

  const getReturnUrl = (blockName) => {
    const origin = window.location.origin;
    return `${origin}/return-leave?block=${encodeURIComponent(blockName)}`;
  };

  const getQrImageUrl = (url) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="E-Leave KKTF" description="Memuatkan rekod permohonan cuti..." />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 pb-12">
      <PageHeader
        title="E-Leave KKTF"
        description={isReviewer ? "Portal Kelulusan, Pemantauan dan Log Keluar/Masuk Pelajar KKTF" : "Sistem Permohonan Kebenaran Bermalam Di Luar Kolej"}
        actions={
          <div className="flex items-center gap-2">
            {isReviewer && (
              <Button size="sm" variant="outline" onClick={() => setQrModalOpen(true)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold gap-1.5 shadow-sm">
                <QrCode className="w-4 h-4" /> Poster QR Blok
              </Button>
            )}
            {!isReviewer && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-[#132644] hover:bg-[#1e385f] text-white shadow-sm font-semibold tracking-wide gap-1.5">
                <Plus className="w-4 h-4" /> MOHON SEKARANG
              </Button>
            )}
          </div>
        }
      />

      {/* STATS OVERVIEW FOR REVIEWERS */}
      {isReviewer && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Di Kolej', value: stats.inCollege, icon: Users, color: 'text-indigo-900 border-l-4 border-l-indigo-600' },
            { label: 'Sedang Cuti', value: stats.onLeave, icon: UserX, color: 'text-blue-700 border-l-4 border-l-blue-500' },
            { label: 'Lewat (Overdue)', value: stats.overdue, icon: AlertTriangle, color: 'text-rose-700 border-l-4 border-l-rose-600' },
            { label: 'Menunggu', value: stats.pendingApproval, icon: Clock, color: 'text-amber-700 border-l-4 border-l-amber-500' },
            { label: 'Telah Kembali', value: stats.returned, icon: CheckCircle2, color: 'text-emerald-700 border-l-4 border-l-emerald-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold tracking-tight mt-0.5 text-foreground">{s.value}</p>
                </div>
                <Icon className={`w-5 h-5 shrink-0 opacity-80 ${s.color}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* FILTER BUTTONS */}
      {isReviewer && (
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          {[
            { key: 'all', label: 'Semua Rekod' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'approved', label: 'Diluluskan' },
            { key: 'active_leave', label: 'Sedang Cuti' },
            { key: 'overdue', label: 'Amaran Lewat (Overdue)' },
            { key: 'returned', label: 'Telah Kembali' },
            { key: 'rejected', label: 'Ditolak' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key ? 'bg-[#132644] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* APPS LIST */}
      {filteredApps.length === 0 ? (
        <EmptyState 
          icon={CalendarOff} 
          title="Tiada Rekod E-Leave Ditemui" 
          description={isReviewer ? "Tiada permohonan log e-cuti dalam kategori ini." : "Anda belum menghantar sebarang permohonan e-cuti."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map(a => {
            const isReturned = a.status === 'Returned' || !!a.returned_at;
            const isOverdue = !isReturned && a.status === 'Approved' && a.return_date < today;
            const isActive = !isReturned && a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
            
            return (
              <div 
                key={a.id} 
                className={`bg-card rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
                  isReturned 
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : isOverdue 
                      ? 'border-rose-300 bg-rose-50/20' 
                      : 'border-border'
                }`}
              >
                <div>
                  {/* CARD HEADER */}
                  <div className="flex items-center justify-between border-b pb-3 mb-3">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{a.leave_type}</span>
                    <div>
                      {isReturned ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> TELAH KEMBALI
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-rose-100 text-rose-800 border-rose-300 uppercase tracking-wider animate-pulse">
                          OVERDUE
                        </span>
                      ) : isActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-800 border-blue-200 uppercase tracking-wider">
                          SEDANG CUTI
                        </span>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          a.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : STATUS_BADGE[a.status]
                        }`}>
                          {a.status === 'Pending' ? 'Menunggu' : a.status === 'Approved' ? 'Lulus' : 'Ditolak'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* STUDENT INFO */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{a.student_name}</p>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                          {a.student_id} {a.block_name ? `• Blok ${a.block_name} (${a.room_number})` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinasi</p>
                        <p className="text-sm text-slate-800 font-medium line-clamp-1">{a.destination}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tempoh Pergerakan</p>
                        <p className="text-xs text-slate-700 font-medium">
                          {a.departure_date} ({a.departure_time || 'N/A'}) &rarr; {a.return_date} ({a.return_time || 'N/A'})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-muted/40 p-2.5 rounded-xl border border-border/60">
                      <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sebab Kebenaran</p>
                        <p className="text-xs text-slate-700 mt-0.5 font-medium italic line-clamp-2">"{a.reason}"</p>
                      </div>
                    </div>

                    {/* RETURN DETAILS IF RETURNED */}
                    {isReturned && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-950">
                        <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Disahkan Kembali ke Kolej
                        </p>
                        <p className="text-[11px] text-emerald-800">
                          Masa: <span className="font-mono font-bold">{a.returned_date} ({a.returned_time || ''})</span>
                        </p>
                        {a.return_scanned_block && (
                          <p className="text-[11px] text-emerald-700">
                            Lokasi: <span className="font-semibold">{a.return_scanned_block}</span>
                          </p>
                        )}
                        {a.return_status && (
                          <Badge variant="outline" className={`text-[10px] mt-1 ${a.return_status === 'On-Time' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
                            {a.return_status === 'On-Time' ? 'Tepat Pada Masa' : 'Lewat'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM ACTION BUTTONS */}
                <div className="border-t border-border pt-3 mt-4 space-y-2">
                  {/* STUDENT ACTION: RETURN CHECK-IN BUTTON */}
                  {!isReviewer && !isReturned && (a.status === 'Approved' || isOverdue) && (
                    <Link to="/return-leave">
                      <Button className="w-full h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1.5 shadow-sm">
                        <Camera className="w-3.5 h-3.5" /> Buka Kamera & Imbas QR Blok
                      </Button>
                    </Link>
                  )}

                  {/* WARDEN / REVIEWER ACTIONS */}
                  {isReviewer && (
                    <div>
                      {a.status === 'Pending' ? (
                        <div className="flex items-center gap-2 w-full">
                          <Button variant="outline" size="sm" className="w-1/2 h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold" onClick={() => updateStatus(a, 'Approved')}>
                            <Check className="w-3.5 h-3.5 mr-1" /> Lulus
                          </Button>
                          <Button variant="outline" size="sm" className="w-1/2 h-8 border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold" onClick={() => updateStatus(a, 'Rejected')}>
                            <X className="w-3.5 h-3.5 mr-1" /> Tolak
                          </Button>
                        </div>
                      ) : !isReturned && a.status === 'Approved' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleManualWardenReturn(a)}
                          className="w-full h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sahkan Kembali (Manual)
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground italic font-medium text-right">
                          Disemak oleh: {a.approved_by || 'Pentadbiran KKTF'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT LEAVE APPLICATION MODAL */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#132644] tracking-tight border-b pb-2">
              Permohonan Bermalam di Luar Kolej
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Kategori Keluar</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger className="h-10 text-sm mt-1 bg-gray-50 border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent>{['Weekend','Semester Break','Emergency','Medical','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Destinasi Perjalanan *</Label>
              <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" placeholder="Alamat penuh destinasi dituju" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Sebab / Alasan Cuti *</Label>
              <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="text-sm mt-1 bg-gray-50 border-gray-300" rows={3} placeholder="Berikan kenyataan sebab rasmi..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tarikh Keluar *</Label>
                <Input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Keluar</Label>
                <Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tarikh Kembali *</Label>
                <Input type="date" value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Kembali</Label>
                <Input type="time" value={form.return_time} onChange={e => setForm({ ...form, return_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting}>Batal</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-[#132644] hover:bg-[#1e385f] text-white font-medium px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'MOHON'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WARDEN QR POSTER GENERATOR MODAL */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" /> Poster Kod QR Kembali ke Kolej
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cetak dan tampal kod QR ini di pintu masuk blok atau pondok pengawal untuk imbasan pelajar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700 text-left block mb-1">Pilih Lokasi Blok / Pintu Masuk</Label>
              <Select value={selectedBlockQr} onValueChange={setSelectedBlockQr}>
                <SelectTrigger className="h-10 text-xs bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKS.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PRINTABLE QR CARD DISPLAY */}
            <div className="bg-gradient-to-b from-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800 space-y-3">
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-widest text-indigo-300 font-bold uppercase">Kolej Kediaman Tun Fuad (UMS)</p>
                <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-400" /> {selectedBlockQr}
                </h3>
              </div>

              {/* LIVE QR CODE */}
              <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-inner">
                <img 
                  src={getQrImageUrl(getReturnUrl(selectedBlockQr))} 
                  alt="QR Return Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-xs text-indigo-200 font-medium">
                Imbas untuk Sahkan Kehadiran Kembali ke Kolej
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setQrModalOpen(false)}>
                Tutup
              </Button>
              <Button 
                size="sm" 
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Poster
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}