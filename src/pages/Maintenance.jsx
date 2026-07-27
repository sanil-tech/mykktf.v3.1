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
import { Plus, Wrench } from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';

const statusBadge = { Submitted: 'bg-gray-100 text-gray-700', Assigned: 'bg-blue-100 text-blue-700', 'In Progress': 'bg-yellow-100 text-yellow-700', Completed: 'bg-green-100 text-green-700' };
const STAFF_ROLES = ['warden', 'staff', 'admin'];

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [form, setForm] = useState({ room_number: '', block_name: '', category: 'Electrical', description: '' });
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();

  const isStaff = currentUser && STAFF_ROLES.includes(currentUser.role);

  useEffect(() => { init(); }, []);
  async function init() {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    const isStaffRole = STAFF_ROLES.includes(user?.role);
    let reqs;
    if (isStaffRole) {
      reqs = await base44.entities.MaintenanceRequest.list('-created_date');
      if (user.role === 'warden') {
        const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
        if (wb.length > 0) {
          const blockNames = wb.map(w => w.block_name);
          reqs = reqs.filter(r => blockNames.includes(r.block_name));
        }
      }
    } else {
      const students = await base44.entities.Student.filter({ email: user.email });
      const student = students[0] || null;
      setMyStudent(student);
      reqs = student
        ? await base44.entities.MaintenanceRequest.filter({ student_id: student.id })
        : [];
    }
    setRequests(reqs);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!form.room_number || !form.description) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    if (!myStudent) { toast({ title: 'Student profile not found', variant: 'destructive' }); return; }
    await base44.entities.MaintenanceRequest.create({
      ...form,
      student_id: myStudent.id,
      student_name: myStudent.full_name,
    });
    toast({ title: 'Request submitted' });
    setDialogOpen(false);
    init();
  }

  async function updateStatus(id, status) {
    await base44.entities.MaintenanceRequest.update(id, { status });
    toast({ title: `Status updated to ${status}` });
    init();
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) return <div><PageHeader title="Maintenance Requests" description="Loading requests..." /><CardGridSkeleton count={6} /></div>;

  return (
    <div>
      <PageHeader
        title="Maintenance Requests"
        description={isStaff ? "Review and manage maintenance issues" : "Report a maintenance issue in your room"}
        actions={!isStaff && (
          <Button size="sm" onClick={() => { setForm({ room_number: myStudent?.room_number || '', block_name: myStudent?.block_name || '', category: 'Electrical', description: '' }); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> New Request
          </Button>
        )}
      />

      {isStaff && (
        <div className="mb-5">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-sm"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {['Submitted','Assigned','In Progress','Completed'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? <EmptyState icon={Wrench} title="No maintenance requests" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{r.student_name}</p>
                  <p className="text-xs text-muted-foreground">Room {r.room_number} {r.block_name && `· ${r.block_name}`}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusBadge[r.status]}`}>{r.status}</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded bg-muted text-[10px] font-medium text-muted-foreground mb-2">{r.category}</span>
              <p className="text-xs text-foreground line-clamp-2">{r.description}</p>
              {r.photo && <img src={r.photo} alt="" className="w-full h-24 object-cover rounded-lg mt-2" />}
              {isStaff && (
                <div className="flex gap-1 mt-3">
                  {r.status === 'Submitted' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(r.id, 'Assigned')}>Assign</Button>}
                  {r.status === 'Assigned' && <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(r.id, 'In Progress')}>Start</Button>}
                  {r.status === 'In Progress' && <Button size="sm" className="text-xs h-7" onClick={() => updateStatus(r.id, 'Completed')}>Complete</Button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Maintenance Request</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Room Number *</Label><Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Block</Label><Input value={form.block_name} onChange={e => setForm({ ...form, block_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Electrical','Plumbing','Furniture','Internet','Cleaning','Others'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Description *</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="text-sm mt-1" rows={3} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="sm" onClick={handleSubmit}>Submit</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}