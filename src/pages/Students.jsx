import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, GraduationCap, Edit, Trash2, Eye } from 'lucide-react';
import TablePagination from '@/components/shared/TablePagination';
import { TableSkeleton } from '@/components/shared/ListSkeletons';

const FACULTIES = ['Engineering', 'Science', 'Arts', 'Business', 'Medicine', 'Education', 'Law', 'IT'];
const PAGE_SIZE = 10;
const emptyForm = { student_id: '', full_name: '', ic_passport: '', gender: 'Male', date_of_birth: '', faculty: '', programme: '', year_of_study: 1, phone: '', email: '', block_name: '', room_number: '', parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '', status: 'Active' };

export default function Students() {
  const [students, setStudents] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [search, filterFaculty, filterStatus]);

  async function load() {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    let data = [];
    if (u.role === 'warden') {
      const wb = await base44.entities.WardenBlock.filter({ warden_user_id: u.id });
      const blockNames = wb.map(w => w.block_name);
      const all = await base44.entities.Student.list('-created_date');
      data = blockNames.length > 0 ? all.filter(s => blockNames.includes(s.block_name)) : [];
    } else {
      data = await base44.entities.Student.list('-created_date');
    }
    setStudents(data);
    setLoading(false);
  }

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    const matchFaculty = filterFaculty === 'all' || s.faculty === filterFaculty;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchFaculty && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages || 1);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAdd() { setForm(emptyForm); setEditId(null); setDialogOpen(true); }
  function openEdit(s) { setForm({ ...emptyForm, ...s }); setEditId(s.id); setDialogOpen(true); }

  async function handleSave() {
    if (!form.student_id || !form.full_name || !form.email) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    if (editId) {
      await base44.entities.Student.update(editId, form);
      toast({ title: 'Student updated' });
    } else {
      await base44.entities.Student.create(form);
      toast({ title: 'Student added' });
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete(id) {
    await base44.entities.Student.delete(id);
    toast({ title: 'Student removed' });
    load();
  }

  if (loading) {
    return <div><PageHeader title="Student Management" description="Manage resident profiles" /><TableSkeleton rows={8} cols={6} /></div>;
  }

  return (
    <div>
      <PageHeader title="Student Management" description="Manage resident profiles" actions={<Button onClick={openAdd} size="sm"><Plus className="w-4 h-4 mr-1.5" /> Add Student</Button>} />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, ID, or email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterFaculty} onValueChange={setFilterFaculty}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-sm"><SelectValue placeholder="Faculty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Faculties</SelectItem>
            {FACULTIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-32 h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No students found" description="Add students or adjust your filters." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Student ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Faculty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Year</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{s.student_id}</td>
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.faculty}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{s.year_of_study}</td>
                    <td className="px-4 py-3"><Badge variant={s.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setViewStudent(s); setViewOpen(true); }}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Edit Student' : 'Add Student'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div><Label className="text-xs">Student ID *</Label><Input value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Full Name *</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">IC/Passport</Label><Input value={form.ic_passport} onChange={e => setForm({ ...form, ic_passport: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Gender *</Label>
              <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Faculty</Label>
              <Select value={form.faculty} onValueChange={v => setForm({ ...form, faculty: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{FACULTIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Programme</Label><Input value={form.programme} onChange={e => setForm({ ...form, programme: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Year of Study</Label>
              <Select value={String(form.year_of_study)} onValueChange={v => setForm({ ...form, year_of_study: Number(v) })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5].map(y => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Parent/Guardian</Label><Input value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Parent Phone</Label><Input value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Block Name</Label><Input value={form.block_name} onChange={e => setForm({ ...form, block_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Room Number</Label><Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Emergency Contact</Label><Input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Vehicle Reg</Label><Input value={form.vehicle_reg} onChange={e => setForm({ ...form, vehicle_reg: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Cancel</Button>
            <Button onClick={handleSave} size="sm">{editId ? 'Update' : 'Add'} Student</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Student Details</DialogTitle></DialogHeader>
          {viewStudent && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mt-2">
              {Object.entries({ 'Student ID': viewStudent.student_id, 'Name': viewStudent.full_name, 'IC/Passport': viewStudent.ic_passport, 'Gender': viewStudent.gender, 'DOB': viewStudent.date_of_birth, 'Faculty': viewStudent.faculty, 'Programme': viewStudent.programme, 'Year': viewStudent.year_of_study, 'Phone': viewStudent.phone, 'Email': viewStudent.email, 'Parent': viewStudent.parent_name, 'Parent Phone': viewStudent.parent_phone, 'Emergency': viewStudent.emergency_contact, 'Vehicle': viewStudent.vehicle_reg, 'Status': viewStudent.status }).map(([k, v]) => (
                <React.Fragment key={k}>
                  <p className="text-muted-foreground text-xs">{k}</p>
                  <p className="font-medium text-xs">{v || '—'}</p>
                </React.Fragment>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}