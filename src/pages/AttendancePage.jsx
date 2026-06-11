import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, ClipboardCheck } from 'lucide-react';

const statusBadge = { Present: 'bg-green-100 text-green-700', Absent: 'bg-red-100 text-red-700', Late: 'bg-yellow-100 text-yellow-700' };

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', student_name: '', event_type: 'Assembly', event_name: '', attendance_date: '', method: 'Manual', status: 'Present' });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [a, s] = await Promise.all([base44.entities.Attendance.list('-created_date'), base44.entities.Student.list()]);
    setRecords(a);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.event_name || !form.attendance_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    await base44.entities.Attendance.create({ ...form, student_name: student?.full_name || '' });
    toast({ title: 'Attendance recorded' });
    setDialogOpen(false);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Attendance Tracking" description="Track event and activity attendance" actions={<Button size="sm" onClick={() => { setForm({ student_id: '', student_name: '', event_type: 'Assembly', event_name: '', attendance_date: new Date().toISOString().split('T')[0], method: 'Manual', status: 'Present' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Record Attendance</Button>} />

      {records.length === 0 ? <EmptyState icon={ClipboardCheck} title="No attendance records" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Event</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Method</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
              </tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.event_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.event_type}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.attendance_date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{r.method}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[r.status]}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Event Type</Label>
              <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Assembly','Briefing','Emergency Drill','Sports Activity','Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Event Name *</Label><Input value={form.event_name} onChange={e => setForm({ ...form, event_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Date *</Label><Input type="date" value={form.attendance_date} onChange={e => setForm({ ...form, attendance_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Method</Label>
              <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['QR Code','Manual','Event'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Present','Absent','Late'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}