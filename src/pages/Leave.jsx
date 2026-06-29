import React, { useState, useEffect } from 'react';
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
import { Plus, CalendarOff, Check, X, Clock, AlertTriangle, Users, UserCheck, UserX } from 'lucide-react';

const STATUS_BADGE = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
};

const REVIEWER_ROLES = ['warden', 'super_admin', 'college_admin', 'staff'];

function getLeaveStatus(app) {
  const today = new Date().toISOString().split('T')[0];
  if (app.status === 'Approved') {
    if (app.departure_date <= today && app.return_date >= today) return 'active_leave';
    if (app.return_date < today) return 'overdue';
  }
  return app.status?.toLowerCase().replace(' ', '_');
}

export default function Leave() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ inCollege: 0, onLeave: 0, overdue: 0, pendingApproval: 0 });
  const [form, setForm] = useState({
    leave_type: 'Weekend', destination: '', reason: '',
    departure_date: '', departure_time: '', return_date: '', return_time: ''
  });
  const { toast } = useToast();

  const isReviewer = currentUser && REVIEWER_ROLES.includes(currentUser.role);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    const isRev = REVIEWER_ROLES.includes(user?.role);

    let leaveList = [];
    let student = null;

    if (isRev) {
      leaveList = await base44.entities.LeaveApplication.list('-created_date');

      // Wardens: filter by assigned blocks using block_name stored on leave record
      if (user.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
        if (wb.length > 0) {
          const blockNames = wb.map(w => w.block_name);
          // Filter by block_name stored directly on the leave application
          leaveList = leaveList.filter(l => blockNames.includes(l.block_name));
        }
      }

      // Compute dashboard stats
      const today = new Date().toISOString().split('T')[0];
      const allStudents = isRev ? await base44.entities.Student.filter({ status: 'Active' }) : [];
      const approvedLeaves = leaveList.filter(l => l.status === 'Approved' && l.departure_date <= today && l.return_date >= today);
      const overdueLeaves = leaveList.filter(l => l.status === 'Approved' && l.return_date < today);
      const pendingLeaves = leaveList.filter(l => l.status === 'Pending');
      setStats({
        inCollege: allStudents.length - approvedLeaves.length,
        onLeave: approvedLeaves.length,
        overdue: overdueLeaves.length,
        pendingApproval: pendingLeaves.length,
      });
    } else {
      // Students: look up by user_id first, fallback to email
      let students = await base44.entities.Student.filter({ user_id: user.id });
      if (!students.length) students = await base44.entities.Student.filter({ email: user.email });
      student = students[0] || null;
      setMyStudent(student);
      if (student) {
        leaveList = await base44.entities.LeaveApplication.filter({ student_id: student.student_id });
      }
    }

    setApps(leaveList);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.destination || !form.reason || !form.departure_date || !form.return_date) {
      toast({ title: 'Fill all required fields', variant: 'destructive' }); return;
    }
    if (!myStudent) { toast({ title: 'Student profile not found. Complete your profile first.', variant: 'destructive' }); return; }

    await base44.entities.LeaveApplication.create({
      ...form,
      student_id: myStudent.student_id,   // use matric number consistently
      student_name: myStudent.full_name,
      block_name: myStudent.block_name || '',
      room_number: myStudent.room_number || '',
      status: 'Pending',
    });

    // Notify wardens of this student's block
    if (myStudent.block_name) {
      const wardenBlocks = await base44.entities.WardenBlock.filter({ block_name: myStudent.block_name });
      for (const wb of wardenBlocks) {
        await base44.entities.Notification.create({
          user_id: wb.warden_user_id,
          title: 'New Leave Application',
          message: `${myStudent.full_name} (${myStudent.student_id}) from Block ${myStudent.block_name} has submitted a leave application.`,
          type: 'leave',
          is_read: false,
        });
      }
    }

    toast({ title: 'Leave application submitted' });
    setDialogOpen(false);
    setForm({ leave_type: 'Weekend', destination: '', reason: '', departure_date: '', departure_time: '', return_date: '', return_time: '' });
    init();
  }

  async function updateStatus(app, status) {
    await base44.entities.LeaveApplication.update(app.id, {
      status,
      approved_by: currentUser?.full_name || currentUser?.email
    });

    // Find the student's user_id to notify them
    const students = await base44.entities.Student.filter({ student_id: app.student_id });
    if (students.length && students[0].user_id) {
      await base44.entities.Notification.create({
        user_id: students[0].user_id,
        title: `Leave ${status}`,
        message: `Your leave application from ${app.departure_date} to ${app.return_date} has been ${status.toLowerCase()} by ${currentUser?.full_name || 'Warden'}.`,
        type: 'leave',
        is_read: false,
      });
    }

    toast({ title: `Leave ${status.toLowerCase()}` });
    init();
  }

  const today = new Date().toISOString().split('T')[0];

  const filteredApps = apps.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'Pending';
    if (filter === 'approved') return a.status === 'Approved';
    if (filter === 'rejected') return a.status === 'Rejected';
    if (filter === 'active_leave') return a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
    if (filter === 'overdue') return a.status === 'Approved' && a.return_date < today;
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Leave Applications"
        description={isReviewer ? "Review and manage student leave requests" : "Your leave applications"}
        actions={!isReviewer && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Apply Leave
          </Button>
        )}
      />

      {/* Warden Stats */}
      {isReviewer && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            { label: 'In College', value: stats.inCollege, icon: Users, color: 'bg-blue-100 text-blue-600' },
            { label: 'Currently on Leave', value: stats.onLeave, icon: UserX, color: 'bg-green-100 text-green-600' },
            { label: 'Overdue Return', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
            { label: 'Pending Approval', value: stats.pendingApproval, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}><Icon className="w-5 h-5" /></div>
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {isReviewer && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' },
            { key: 'active_leave', label: 'Active Leave' },
            { key: 'overdue', label: 'Overdue Return' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >{f.label}</button>
          ))}
        </div>
      )}

      {filteredApps.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave applications" description="No records match the current filter." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                  {isReviewer && <>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Matric No.</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Block / Room</th>
                  </>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Departure</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Return</th>
                  {isReviewer && <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Destination</th>}
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  {isReviewer && <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(a => {
                  const isOverdue = a.status === 'Approved' && a.return_date < today;
                  const isActive = a.status === 'Approved' && a.departure_date <= today && a.return_date >= today;
                  return (
                    <tr key={a.id} className={`border-b last:border-0 hover:bg-muted/30 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.student_name}</p>
                        <p className="text-xs text-muted-foreground">{a.reason?.slice(0, 40)}{a.reason?.length > 40 ? '…' : ''}</p>
                      </td>
                      {isReviewer && <>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">{a.student_id}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.block_name || '—'} / {a.room_number || '—'}</td>
                      </>}
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.leave_type}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.departure_date}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.return_date}</td>
                      {isReviewer && <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{a.destination}</td>}
                      <td className="px-4 py-3">
                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">Overdue</span>
                        ) : isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">On Leave</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                        )}
                      </td>
                      {isReviewer && (
                        <td className="px-4 py-3 text-right">
                          {a.status === 'Pending' && (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => updateStatus(a, 'Approved')}><Check className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateStatus(a, 'Rejected')}><X className="w-4 h-4" /></Button>
                            </div>
                          )}
                          {a.status !== 'Pending' && <span className="text-xs text-muted-foreground">{a.approved_by || '—'}</span>}
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

      {/* Apply Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Leave Type</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Weekend','Semester Break','Emergency','Medical','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Destination *</Label><Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Reason *</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="text-sm mt-1" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Departure Date *</Label><Input type="date" value={form.departure_date} onChange={e => setForm({ ...form, departure_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Departure Time</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Return Date *</Label><Input type="date" value={form.return_date} onChange={e => setForm({ ...form, return_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Return Time</Label><Input type="time" value={form.return_time} onChange={e => setForm({ ...form, return_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit}>Submit</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}