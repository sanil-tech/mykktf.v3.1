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
import { Plus, Package, Check } from 'lucide-react';

export default function Parcels() {
  const [parcels, setParcels] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ tracking_number: '', courier_company: '', student_id: '', student_name: '', arrival_date: '', staff_name: '' });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [p, s] = await Promise.all([base44.entities.Parcel.list('-created_date'), base44.entities.Student.list()]);
    setParcels(p);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.tracking_number || !form.student_id || !form.arrival_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    await base44.entities.Parcel.create({ ...form, student_name: student?.full_name || '' });
    toast({ title: 'Parcel registered' });
    setDialogOpen(false);
    load();
  }

  async function markCollected(id) {
    await base44.entities.Parcel.update(id, { status: 'Collected', collection_date: new Date().toISOString().split('T')[0] });
    toast({ title: 'Parcel marked as collected' });
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Parcel Management" description="Track parcel arrivals and collections" actions={<Button size="sm" onClick={() => { setForm({ tracking_number: '', courier_company: '', student_id: '', student_name: '', arrival_date: new Date().toISOString().split('T')[0], staff_name: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Register Parcel</Button>} />

      {parcels.length === 0 ? <EmptyState icon={Package} title="No parcels" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Tracking #</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Courier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Arrived</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {parcels.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{p.tracking_number}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.courier_company}</td>
                    <td className="px-4 py-3 font-medium">{p.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{p.arrival_date}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === 'Collected' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'Pending Collection' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => markCollected(p.id)}><Check className="w-3 h-3 mr-1" /> Collected</Button>}
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
          <DialogHeader><DialogTitle>Register Parcel</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Tracking Number *</Label><Input value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Courier Company</Label><Input value={form.courier_company} onChange={e => setForm({ ...form, courier_company: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Arrival Date *</Label><Input type="date" value={form.arrival_date} onChange={e => setForm({ ...form, arrival_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Staff Name</Label><Input value={form.staff_name} onChange={e => setForm({ ...form, staff_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Register</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}