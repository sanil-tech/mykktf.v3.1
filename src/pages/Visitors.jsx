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
import { Plus, UserCheck } from 'lucide-react';
import { logAudit } from '@/lib/audit';

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ visitor_name: '', ic_passport: '', phone: '', student_id: '', student_name: '', visit_date: '', time_in: '', purpose: '' });
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const u = await base44.auth.me();
    setCurrentUser(u);
    const [v, s] = await Promise.all([base44.entities.Visitor.list('-created_date'), base44.entities.Student.list()]);
    setVisitors(v);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.visitor_name || !form.ic_passport || !form.student_id || !form.visit_date || !form.time_in) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    await base44.entities.Visitor.create({ ...form, student_name: student?.full_name || '' });
    await logAudit(currentUser, 'VISITOR_REGISTERED', 'Visitors', { visitor: form.visitor_name, ic: form.ic_passport, visiting: student?.full_name });
    toast({ title: 'Visitor registered' });
    setDialogOpen(false);
    load();
  }

  async function checkOut(id) {
    const now = new Date();
    await base44.entities.Visitor.update(id, { time_out: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}` });
    await logAudit(currentUser, 'VISITOR_CHECKOUT', 'Visitors', { id });
    toast({ title: 'Visitor checked out' });
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Visitor Management" description="Register and track visitors" actions={<Button size="sm" onClick={() => { setForm({ visitor_name: '', ic_passport: '', phone: '', student_id: '', student_name: '', visit_date: new Date().toISOString().split('T')[0], time_in: `${new Date().getHours().toString().padStart(2,'0')}:${new Date().getMinutes().toString().padStart(2,'0')}`, purpose: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Register Visitor</Button>} />

      {visitors.length === 0 ? <EmptyState icon={UserCheck} title="No visitors" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Visitor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">IC/Passport</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Visiting</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Out</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {visitors.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{v.visitor_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{v.ic_passport}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{v.visit_date}</td>
                    <td className="px-4 py-3">{v.time_in}</td>
                    <td className="px-4 py-3">{v.time_out || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {!v.time_out && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => checkOut(v.id)}>Check Out</Button>}
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
          <DialogHeader><DialogTitle>Register Visitor</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Visitor Name *</Label><Input value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">IC/Passport *</Label><Input value={form.ic_passport} onChange={e => setForm({ ...form, ic_passport: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Student Being Visited *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date *</Label><Input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Time In *</Label><Input type="time" value={form.time_in} onChange={e => setForm({ ...form, time_in: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Purpose</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="h-9 text-sm mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Register</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}