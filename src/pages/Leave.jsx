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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, CalendarOff, Check, X } from 'lucide-react';

const statusBadge = { Pending: 'bg-yellow-100 text-yellow-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700' };

export default function Leave() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ student_id: '', student_name: '', leave_type: 'Weekend', destination: '', reason: '', departure_date: '', departure_time: '', return_date: '', return_time: '' });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [l, s] = await Promise.all([base44.entities.LeaveApplication.list('-created_date'), base44.entities.Student.list()]);
    setApps(l);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.destination || !form.reason || !form.departure_date || !form.return_date) {
      toast({ title: 'Fill all required fields', variant: 'destructive' }); return;
    }
    const student = students.find(s => s.id === form.student_id);
    await base44.entities.LeaveApplication.create({ ...form, student_name: student?.full_name || '' });
    toast({ title: 'Leave application submitted' });
    setDialogOpen(false);
    load();
  }

  async function updateStatus(id, status) {
    await base44.entities.LeaveApplication.update(id, { status });
    toast({ title: `Leave ${status.toLowerCase()}` });
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Leave Applications" description="Manage student leave requests" actions={<Button size="sm" onClick={() => { setForm({ student_id: '', student_name: '', leave_type: 'Weekend', destination: '', reason: '', departure_date: '', departure_time: '', return_date: '', return_time: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Apply Leave</Button>} />

      {apps.length === 0 ? <EmptyState icon={CalendarOff} title="No leave applications" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Departure</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Return</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{a.leave_type}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.departure_date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{a.return_date}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[a.status]}`}>{a.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      {a.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => updateStatus(a.id, 'Approved')}><Check className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => updateStatus(a.id, 'Rejected')}><X className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.student_id})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Leave Type</Label>
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
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Submit</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}