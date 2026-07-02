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
import { Plus, CreditCard, Edit } from 'lucide-react';

const statusBadge = { Paid: 'bg-green-100 text-green-700', Partial: 'bg-yellow-100 text-yellow-700', Unpaid: 'bg-red-100 text-red-700' };

export default function Fees() {
  const [fees, setFees] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ student_id: '', student_name: '', semester: '', hostel_fee: 0, outstanding_balance: 0, payment_date: '', receipt_number: '', status: 'Unpaid' });
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  // Retry helper for transient rate-limit (429) errors with exponential backoff
  async function withRetry(fn, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isRateLimit = err?.message?.toLowerCase().includes('rate limit') || err?.status === 429;
        if (!isRateLimit || attempt === retries - 1) throw err;
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }
  async function load() {
    setLoading(true);
    try {
      // Stagger the two calls slightly to reduce burst-load on the API
      const f = await withRetry(() => base44.entities.Fee.list('-created_date'));
      const s = await withRetry(() => base44.entities.Student.list());
      setFees(f || []);
      setStudents(s || []);
    } catch (err) {
      toast({ title: 'Failed to load fees', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.student_id || !form.semester || !form.hostel_fee) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    const data = { ...form, student_name: student?.full_name || '' };
    if (editId) await base44.entities.Fee.update(editId, data);
    else await base44.entities.Fee.create(data);
    toast({ title: editId ? 'Fee record updated' : 'Fee record created' });
    setDialogOpen(false);
    setEditId(null);
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const totalOutstanding = fees.reduce((a, f) => a + (f.outstanding_balance || 0), 0);
  const totalPaid = fees.filter(f => f.status === 'Paid').length;

  return (
    <div>
      <PageHeader title="Fees Management" description="Track hostel fees and payments" actions={<Button size="sm" onClick={() => { setForm({ student_id: '', student_name: '', semester: '', hostel_fee: 0, outstanding_balance: 0, payment_date: '', receipt_number: '', status: 'Unpaid' }); setEditId(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Add Fee Record</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Records</p>
          <p className="text-xl font-heading font-bold mt-1">{fees.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Fully Paid</p>
          <p className="text-xl font-heading font-bold text-green-600 mt-1">{totalPaid}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground uppercase">Total Outstanding</p>
          <p className="text-xl font-heading font-bold text-red-500 mt-1">RM {totalOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {fees.length === 0 ? <EmptyState icon={CreditCard} title="No fee records" /> : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Semester</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Fee (RM)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Outstanding</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{f.student_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{f.semester}</td>
                    <td className="px-4 py-3">{f.hostel_fee?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{f.outstanding_balance?.toFixed(2)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[f.status]}`}>{f.status}</span></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm(f); setEditId(f.id); setDialogOpen(true); }}><Edit className="w-3.5 h-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? 'Edit Fee Record' : 'Add Fee Record'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Semester *</Label><Input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} placeholder="e.g. 2024/2025 Sem 1" className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Hostel Fee (RM) *</Label><Input type="number" min="0" value={form.hostel_fee} onChange={e => setForm({ ...form, hostel_fee: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Outstanding Balance (RM)</Label><Input type="number" min="0" value={form.outstanding_balance} onChange={e => setForm({ ...form, outstanding_balance: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Payment Date</Label><Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Receipt Number</Label><Input value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Paid','Partial','Unpaid'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>{editId ? 'Update' : 'Create'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}