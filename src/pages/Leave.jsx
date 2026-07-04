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
import { Plus, CalendarOff, Check, X, Clock, AlertTriangle, Users, UserX, Loader2 } from 'lucide-react';

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
        // SECURITY SANDBOX: Enforces strict data-isolation so students ONLY view their records
        leaveList = await base44.entities.LeaveApplication.filter({ student_id: student.student_id });
      }

      setApps(leaveList);
    } catch (error) {
      toast({ title: 'System Error', description: error.message, variant: 'destructive' });
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
      toast({ title: 'Authentication Exception', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { init(); }, []);

  async function handleSubmit() {
    if (!form.destination || !form.reason || !form.departure_date || !form.return_date) {
      toast({ title: 'Validation Warning', description: 'Please fill out all mandatory components.', variant: 'destructive' }); 
      return;
    }
    if (!myStudent) { 
      toast({ title: 'Profile Error', description: 'No active student matric record found.', variant: 'destructive' }); 
      return; 
    }

    setSubmitting(true); // Double click mitigation guard active
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
            title: 'Action Required: New Leave Submission',
            message: `${myStudent.full_name} (${myStudent.student_id}) has filed an application for residential exit clearance.`,
            type: 'leave',
            is_read: false,
          })
        ));
      }

      toast({ title: 'Application registered successfully.' });
      setDialogOpen(false);
      await fetchLeaveData(currentUser, myStudent);
    } catch (error) {
      toast({ title: 'Execution Failure', description: error.message, variant: 'destructive' });
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

      // NOTIFICATION TRIGGER: Queries and dispatches real-time review results directly to the applicant
      const students = await base44.entities.Student.filter({ student_id: app.student_id });
      if (students.length && students[0].user_id) {
        await base44.entities.Notification.create({
          user_id: students[0].user_id,
          title: `E-Leave Application Update [${status.toUpperCase()}]`,
          message: `Your requested leave exit from ${app.departure_date} to ${app.return_date} has been officially ${status.toLowerCase()} by UMS Residential Services.`,
          type: 'leave',
          is_read: false,
        });
      }

      toast({ title: `Application status altered to: ${status}` });
      await fetchLeaveData(currentUser, myStudent);
    } catch (error) {
      toast({ title: 'Data Mutate Error', description: error.message, variant: 'destructive' });
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
    <div className="space-y-6 max-w-7xl mx-auto px-2">
      <PageHeader
        title="Sistem E-Cuti Pelajar UMS"
        description={isReviewer ? "Residential College Administration Leave Tracking Portal" : "Submit and monitor formal university exit passes."}
        actions={!isReviewer && (
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-[#132644] hover:bg-[#1e385f] text-white shadow-sm font-medium tracking-wide">
            <Plus className="w-4 h-4 mr-2" /> Request Exit Authorization
          </Button>
        )}
      />

      {/* UMS Corporate Identity Status Cards */}
      {isReviewer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'In College Campus', value: stats.inCollege, icon: Users, color: 'border-l-4 border-l-[#132644] text-[#132644]' },
            { label: 'Active Leave Exits', value: stats.onLeave, icon: UserX, color: 'border-l-4 border-l-emerald-600 text-emerald-700' },
            { label: 'Overdue Returns Tracked', value: stats.overdue, icon: AlertTriangle, color: 'border-l-4 border-l-[#A31D1D] text-[#A31D1D]' },
            { label: 'Pending Assessment', value: stats.pendingApproval, icon: Clock, color: 'border-l-4 border-l-amber-500 text-amber-700' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`bg-white border rounded-lg p-5 flex items-center justify-between shadow-xs transition-all ${s.color}`}>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold tracking-tight mt-1">{s.value}</p>
                </div>
                <Icon className="w-6 h-6 opacity-40 shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Corporate Filter Badges */}
      {isReviewer && (
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit border border-gray-200">
          {[
            { key: 'all', label: 'All Entries' },
            { key: 'pending', label: 'Pending Action' },
            { key: 'approved', label: 'Approved Logs' },
            { key: 'rejected', label: 'Rejected Logs' },
            { key: 'active_leave', label: 'Active Exits' },
            { key: 'overdue', label: 'Overdue Alerts' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f.key ? 'bg-[#132644] text-white shadow-sm' : 'text-gray-600 hover:text-[#132644]'}`}
            >{f.label}</button>
          ))}
        </div>
      )}

      {/* Main Records Table Presentation */}
      {filteredApps.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No Records Tracked" description="There are currently no exit authorizations linked with your account parameters." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-4">Student Identity</th>
                  {isReviewer && <>
                    <th className="text-left px-6 py-4 hidden lg:table-cell">Matric Number</th>
                    <th className="text-left px-6 py-4 hidden md:table-cell">Block / Room</th>
                  </>}
                  <th className="text-left px-6 py-4 hidden sm:table-cell">Classification</th>
                  <th className="text-left px-6 py-4 hidden md:table-cell">Departure Date</th>
                  <th className="text-left px-6 py-4 hidden md:table-cell">Return Date</th>
                  {isReviewer && <th className="text-left px-6 py-4 hidden lg:table-cell">Destination</th>}
                  <th className="text-left px-6 py-4">Status</th>
                  {isReviewer && <th className="text-right px-6 py-4">Workflow Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.map(a => {
                  const isOverdue = a.status === 'Approved' && a.return_date < today;
                  const isActive = a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
                  return (
                    <tr key={a.id} className={`hover:bg-gray-50/50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{a.student_name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{a.reason}</p>
                      </td>
                      {isReviewer && <>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600 hidden lg:table-cell">{a.student_id}</td>
                        <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{a.block_name || '—'} / {a.room_number || '—'}</td>
                      </>}
                      <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{a.leave_type}</td>
                      <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{a.departure_date}</td>
                      <td className="px-6 py-4 text-gray-600 hidden md:table-cell">{a.return_date}</td>
                      {isReviewer && <td className="px-6 py-4 text-gray-600 hidden lg:table-cell max-w-[140px] truncate">{a.destination}</td>}
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="px-2.5 py-1 rounded text-[11px] font-bold border bg-rose-50 text-[#A31D1D] border-rose-100 uppercase tracking-wide">Overdue Alert</span>
                        ) : isActive ? (
                          <span className="px-2.5 py-1 rounded text-[11px] font-bold border bg-blue-50 text-[#132644] border-blue-100 uppercase tracking-wide">Off Campus</span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold border uppercase tracking-wide ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                        )}
                      </td>
                      {isReviewer && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {a.status === 'Pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold px-3" onClick={() => updateStatus(a, 'Approved')}><Check className="w-3.5 h-3.5 mr-1" /> Approve</Button>
                              <Button variant="outline" size="sm" className="h-8 border-rose-300 text-[#A31D1D] hover:bg-rose-50 text-xs font-semibold px-3" onClick={() => updateStatus(a, 'Rejected')}><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                            </div>
                          )}
                          {a.status !== 'Pending' && <span className="text-xs font-medium text-gray-500 italic">Audited by: {a.approved_by || '—'}</span>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Input Dialog Window */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-white rounded-lg shadow-xl border border-gray-200">
          <DialogHeader><DialogTitle className="text-lg font-bold text-[#132644] tracking-tight border-b pb-2">UMS Exit Clearance Request Form</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Classification Category</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger className="h-10 text-sm mt-1 bg-gray-50 border-gray-300 focus:ring-[#132644]"><SelectValue /></SelectTrigger>
                <SelectContent>{['Weekend','Semester Break','Emergency','Medical','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Target Destination *</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" placeholder="Address destination coordinates" /></div>
            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Comprehensive Reason *</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="text-sm mt-1 bg-gray-50 border-gray-300" rows={3} placeholder="Provide academic, personal, or clinical reasoning..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Departure Date *</Label><Input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Departure Time</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expected Return *</Label><Input type="date" value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
              <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Return Time</Label><Input type="time" value={form.return_time} onChange={e => setForm({ ...form, return_time: e.target.value })} className="h-10 text-sm mt-1 bg-gray-50 border-gray-300" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} disabled={submitting} className="border-gray-300 text-gray-700">Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-[#132644] hover:bg-[#1e385f] text-white font-medium px-5">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'File Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}