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
import { Plus, ShieldAlert, Edit } from 'lucide-react';

const statusBadge = { Investigation: 'bg-blue-100 text-blue-700', Warning: 'bg-yellow-100 text-yellow-700', Fine: 'bg-red-100 text-red-700', Closed: 'bg-gray-100 text-gray-600' };

export default function Discipline() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', student_name: '', incident_date: '', offence_category: 'Noise Violation', description: '', action_taken: '', status: 'Investigation' });
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [r, s] = await Promise.all([base44.entities.DisciplineRecord.list('-created_date'), base44.entities.Student.list()]);
    setRecords(r);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.incident_date || !form.description) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    const data = { ...form, student_name: student?.full_name || '' };
    if (editId) await base44.entities.DisciplineRecord.update(editId, data);
    else await base44.entities.DisciplineRecord.create(data);
    toast({ title: editId ? 'Record updated' : 'Record created' });
    setDialogOpen(false);
    setEditId(null);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Disciplinary Records" description="Manage discipline cases" actions={<Button size="sm" onClick={() => { setForm({ student_id: '', student_name: '', incident_date: new Date().toISOString().split('T')[0], offence_category: 'Noise Violation', description: '', action_taken: '', status: 'Investigation' }); setEditId(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> New Record</Button>} />

      {records.length === 0 ? <EmptyState icon={ShieldAlert} title="No disciplinary records" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Offence</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.incident_date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.offence_category}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm(r); setEditId(r.id); setDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? 'Edit Record' : 'New Discipline Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Incident Date *</Label><Input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Offence Category</Label>
              <Select value={form.offence_category} onValueChange={v => setForm({ ...form, offence_category: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Noise Violation','Property Damage','Unauthorized Guest','Substance Abuse','Curfew Violation','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description *</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="text-sm mt-1" rows={3} /></div>
            <div><Label className="text-xs">Action Taken</Label><Input value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Investigation','Warning','Fine','Closed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>{editId ? 'Update' : 'Create'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}