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
import { Plus, Building2, Check, X, Calendar } from 'lucide-react';

const FACILITIES = ['Study Room', 'Multipurpose Hall', 'Tennis Court', 'Basketball Court', 'Meeting Room'];
const statusBadge = { Pending: 'bg-yellow-100 text-yellow-700', Approved: 'bg-green-100 text-green-700', Rejected: 'bg-red-100 text-red-700', Cancelled: 'bg-gray-100 text-gray-600' };

export default function Facilities() {
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ facility: 'Study Room', student_id: '', student_name: '', booking_date: '', start_time: '', end_time: '', purpose: '' });
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [b, s] = await Promise.all([base44.entities.FacilityBooking.list('-created_date'), base44.entities.Student.list()]);
    setBookings(b);
    setStudents(s);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.student_id || !form.booking_date || !form.start_time || !form.end_time) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    // Check double booking
    const conflict = bookings.find(b => b.facility === form.facility && b.booking_date === form.booking_date && b.status !== 'Rejected' && b.status !== 'Cancelled' && ((form.start_time >= b.start_time && form.start_time < b.end_time) || (form.end_time > b.start_time && form.end_time <= b.end_time)));
    if (conflict) { toast({ title: 'Time slot conflict', description: 'This facility is already booked at that time.', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === form.student_id);
    await base44.entities.FacilityBooking.create({ ...form, student_name: student?.full_name || '' });
    toast({ title: 'Booking submitted' });
    setDialogOpen(false);
    load();
  }

  async function updateStatus(id, status) {
    await base44.entities.FacilityBooking.update(id, { status });
    toast({ title: `Booking ${status.toLowerCase()}` });
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Facility Booking" description="Book and manage facility reservations" actions={<Button size="sm" onClick={() => { setForm({ facility: 'Study Room', student_id: '', student_name: '', booking_date: '', start_time: '', end_time: '', purpose: '' }); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-1.5" /> Book Facility</Button>} />

      {bookings.length === 0 ? <EmptyState icon={Calendar} title="No bookings" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-heading font-semibold">{b.facility}</p>
                  <p className="text-xs text-muted-foreground">{b.student_name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusBadge[b.status]}`}>{b.status}</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                <p>📅 {b.booking_date}</p>
                <p>🕐 {b.start_time} — {b.end_time}</p>
                {b.purpose && <p>📝 {b.purpose}</p>}
              </div>
              {b.status === 'Pending' && (
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="text-xs h-7 text-green-600" onClick={() => updateStatus(b.id, 'Approved')}><Check className="w-3 h-3 mr-1" /> Approve</Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 text-red-500" onClick={() => updateStatus(b.id, 'Rejected')}><X className="w-3 h-3 mr-1" /> Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Book Facility</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Facility</Label>
              <Select value={form.facility} onValueChange={v => setForm({ ...form, facility: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{FACILITIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Student *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Date *</Label><Input type="date" value={form.booking_date} onChange={e => setForm({ ...form, booking_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Start Time *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">End Time *</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Purpose</Label><Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="h-9 text-sm mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Book</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}