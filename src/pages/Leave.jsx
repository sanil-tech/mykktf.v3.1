import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, CalendarOff, Check, X, Clock, AlertTriangle, Users, UserX, Loader2, MapPin, Calendar, User, FileText } from 'lucide-react';

// Dikemaskini: Mengandungi tiga peringkat kelulusan utama
const STATUS_BADGE = {
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rejected: 'bg-rose-50 text-rose-800 border-rose-200',
};

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
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ inCollege: 0, onLeave: 0, overdue: 0, pendingApproval: 0 });
  const [form, setForm] = useState(INITIAL_FORM);
  const { toast } = useToast();

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
        const approvedLeaves = leaveList.filter(l => l.status === 'Approved' && l.departure_date <= today && l.return_date >= today);
        const overdueLeaves = leaveList.filter(l => l.status === 'Approved' && l.return_date < today);
        const pendingLeaves = leaveList.filter(l => l.status === 'Pending');

        setStats({
          inCollege: Math.max(0, allStudents.length - approvedLeaves.length),
          onLeave: approvedLeaves.length,
          overdue: overdueLeaves.length,
          pendingApproval: pendingLeaves.length,
        });
      } else if (student) {
        leaveList = await base44.entities.LeaveApplication.filter({ student_id: student.student_id });
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
      await base44.entities.LeaveApplication.create({
        ...form,
        student_id: myStudent.student_id,
        student_name: myStudent.full_name,
        block_name: myStudent.block_name || '',
        room_number: myStudent.room_number || '',
        status: 'Pending',
      });

      if (myStudent.block_name) {
        const wardenBlocks = await base44.entities.WardenBlock.filter({ block_name: myStudent.block_name });
        await Promise.all(wardenBlocks.map(wb => 
          base44.entities.Notification.create({
            user_id: wb.warden_user_id,
            title: 'Permohonan E-Cuti Baharu KKTF',
            message: `${myStudent.full_name} (${myStudent.student_id}) Blok ${myStudent.block_name} telah menyerahkan permohonan kebenaran cuti.`,
            type: 'leave',
            is_read: false,
          })
        ));
      }

      toast({ title: 'Permohonan berjaya dihantar ke pentadbiran KKTF.' });
      setDialogOpen(false);
      await fetchLeaveData(currentUser, myStudent);
    } catch (error) {
      toast({ title: 'Ralat Penghantaran', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(app, status) {
    try {
      await base44.entities.LeaveApplication.update(app.id, {
        status,
        approved_by: currentUser?.full_name || currentUser?.email
      });

      const students = await base44.entities.Student.filter({ student_id: app.student_id });
      if (students.length && students[0].user_id) {
        await base44.entities.Notification.create({
          user_id: students[0].user_id,
          title: `Kemaskini Permohonan E-Cuti KKTF [${status.toUpperCase()}]`,
          message: `Permohonan pergerakan e-cuti anda bertarikh ${app.departure_date} telah ${status === 'Approved' ? 'DILULUSKAN' : 'DITOLAK'} oleh Warden / Pentadbiran Kolej Kediaman Tun Fuad.`,
          type: 'leave',
          is_read: false,
        });
      }

      toast({ title: `Status permohonan dikemaskini kepada: ${status}` });
      await fetchLeaveData(currentUser, myStudent);
    } catch (error) {
      toast({ title: 'Gagal Mengemaskini Log', description: error.message, variant: 'destructive' });
    }
  }

  const filteredApps = apps.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'Pending';
    if (filter === 'approved') return a.status === 'Approved';
    if (filter === 'rejected') return a.status === 'Rejected';
    if (filter === 'active_leave') return a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
    if (filter === 'overdue') return a.status === 'Approved' && a.return_date < today;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#132644] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 pb-12">
      <PageHeader
        title="E-Leave KKTF"
        description={isReviewer ? "Portal Kelulusan dan Log Keluar Pelajar Kolej Kediaman Tun Fuad" : "Sistem Permohonan Kebenaran Bermalam Di Luar Kolej"}
        actions={!isReviewer && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-[#132644] hover:bg-[#1e385f] text-white shadow-sm font-medium tracking-wide">
            <Plus className="w-4 h-4 mr-2" /> MOHON SEKARANG
          </Button>
        )}
      />

      {isReviewer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pelajar Di Kolej', value: stats.inCollege, icon: Users, color: 'border-l-4 border-l-[#132644] text-[#132644]' },
            { label: 'Sedang Cuti Luar', value: stats.onLeave, icon: UserX, color: 'border-l-4 border-l-emerald-600 text-emerald-700' },
            { label: 'Lewat Kembali (Overdue)', value: stats.overdue, icon: AlertTriangle, color: 'border-l-4 border-l-[#A31D1D] text-[#A31D1D]' },
            { label: 'Menunggu Kelulusan', value: stats.pendingApproval, icon: Clock, color: 'border-l-4 border-l-amber-500 text-amber-700' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white border border-gray-100 rounded-lg p-5 flex items-center justify-between shadow-xs">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{s.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-1">{s.value}</p>
                </div>
                <Icon className={`w-6 h-6 shrink-0 opacity-80 ${s.color}`} />
              </div>
            );
          })}
        </div>
      )}

      {isReviewer && (
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit border border-gray-200">
          {[
            { key: 'all', label: 'Semua Rekod' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'approved', label: 'Diluluskan' },
            { key: 'rejected', label: 'Ditolak' },
            { key: 'active_leave', label: 'Sedang Cuti' },
            { key: 'overdue', label: 'Amaran Lewat' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f.key ? 'bg-[#132644] text-white shadow-sm' : 'text-gray-600 hover:text-[#132644]'}`}
            >{f.label}</button>
          ))}
        </div>
      )}

      {filteredApps.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Tiada Permohonan Rekod" description="Tiada sebarang permohonan log e-cuti ditemui setakat ini." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredApps.map(a => {
            const isOverdue = a.status === 'Approved' && a.return_date < today;
            const isActive = a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
            
            return (
              <div 
                key={a.id} 
                className={`bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden ${
                  isOverdue ? 'border-rose-200 bg-rose-50/10' : ''
                }`}
              >
                <div className="flex items-center justify-between border-b pb-3 mb-4 min-h-[36px]">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{a.leave_type}</span>
                  <div>
                    {/* Dikemaskini: Memaparkan semua 3 peringkat kelulusan (Menunggu, Lulus, Ditolak) */}
                    {isOverdue ? (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold border bg-rose-50 text-[#A31D1D] border-rose-200 uppercase tracking-wider animate-pulse">Overdue</span>
                    ) : isActive ? (
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold border bg-blue-50 text-[#132644] border-blue-200 uppercase tracking-wider">Luar Kampus</span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${
                        a.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200' : STATUS_BADGE[a.status]
                      }`}>
                        {a.status === 'Pending' ? 'Menunggu' : a.status === 'Approved' ? 'Lulus' : 'Ditolak'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{a.student_name}</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{a.student_id} {a.block_name ? `• Blok ${a.block_name} (${a.room_number})` : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Destinasi</p>
                      <p className="text-sm text-gray-700 font-medium line-clamp-1">{a.destination}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tempoh Pergerakan</p>
                      <p className="text-sm text-gray-700 font-medium">
                        {a.departure_date} <span className="text-gray-400 text-xs">({a.departure_time || 'N/A'})</span> sehingga {a.return_date} <span className="text-gray-400 text-xs">({a.return_time || 'N/A'})</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sebab Kebenaran</p>
                      <p className="text-xs text-gray-600 mt-0.5 font-medium italic line-clamp-2">"{a.reason}"</p>
                    </div>
                  </div>
                </div>

                {isReviewer && (
                  <div className="border-t pt-4 mt-4 flex items-center justify-between">
                    {a.status === 'Pending' ? (
                      <div className="flex items-center gap-2 w-full">
                        <Button variant="outline" size="sm" className="w-1/2 h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold" onClick={() => updateStatus(a, 'Approved')}><Check className="w-3.5 h-3.5 mr-1" /> Lulus</Button>
                        <Button variant="outline" size="sm" className="w-1/2 h-9 border-rose-300 text-[#A31D1D] hover:bg-rose-50 text-xs font-bold" onClick={() => updateStatus(a, 'Rejected')}><X className="w-3.5 h-3.5 mr-1" /> Tolak</Button>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic font-medium w-full text-right">Disemak oleh: {a.approved_by || 'Pentadbiran KKTF'}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-xl shadow-2xl border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#132644] tracking-tight border-b pb-2">Permohonan Bermalam di Luar Kolej</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Kategori Keluar</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger className="h-10 text-sm mt-1 bg-gray-50 border-gray-300 focus:ring-[#132644]"><SelectValue /></SelectTrigger>
                <SelectContent>{['Weekend','Semester Break','Emergency','Medical','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Destinasi Perjalanan *</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" placeholder="Alamat penuh destinasi dituju" /></div>
            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Sebab / Alasan Cuti *</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="text-sm mt-1 bg-gray-50 border-gray-300" rows={3} placeholder="Berikan kenyataan sebab rasmi..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tarikh Keluar *</Label><Input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Keluar</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tarikh Kembali *</Label><Input type="date" value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Jam Kembali</Label><Input type="time" value={form.return_time} onChange={e => setForm({ ...form, return_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting} className="border-gray-300 text-gray-700">Batal</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-[#132644] hover:bg-[#1e385f] text-white font-medium px-6">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'MOHON'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}