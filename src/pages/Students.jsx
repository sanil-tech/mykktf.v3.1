import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, GraduationCap, Edit, Trash2, Eye, Lock, User, Building, Phone, Mail } from 'lucide-react';
import TablePagination from '@/components/shared/TablePagination';
import { TableSkeleton } from '@/components/shared/ListSkeletons';
import { logAudit } from '@/lib/audit';

const FACULTIES = ['Engineering', 'Science', 'Arts', 'Business', 'Medicine', 'Education', 'Law', 'IT'];
const PAGE_SIZE = 10;
const emptyForm = { student_id: '', full_name: '', ic_passport: '', gender: 'Male', date_of_birth: '', faculty: '', programme: '', year_of_study: 1, phone: '', email: '', block_name: '', room_number: '', parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '', status: 'Active' };

const ADMIN_ROLES = ['super_admin', 'college_admin', 'staff'];

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
  const [wardenAssignedBlocks, setWardenAssignedBlocks] = useState([]);
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
      setWardenAssignedBlocks(blockNames);
      const all = await base44.entities.Student.list('-created_date');
      data = blockNames.length > 0 ? all.filter(s => blockNames.includes(s.block_name)) : [];
    } else {
      data = await base44.entities.Student.list('-created_date');
    }
    setStudents(data);
    setLoading(false);
  }

  const canManageStudents = user && ADMIN_ROLES.includes(user.role) && user.role !== 'warden';

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.room_number?.toLowerCase().includes(q);
    const matchFaculty = filterFaculty === 'all' || s.faculty === filterFaculty;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchFaculty && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages || 1);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openAdd() { 
    if (!canManageStudents) {
      toast({ title: 'Akses Ditolak', description: 'Warden hanya mempunyai akses paparan (view-only).', variant: 'destructive' });
      return;
    }
    setForm(emptyForm); 
    setEditId(null); 
    setDialogOpen(true); 
  }

  function openEdit(s) { 
    if (!canManageStudents) {
      toast({ title: 'Akses Ditolak', description: 'Warden hanya mempunyai akses paparan (view-only).', variant: 'destructive' });
      return;
    }
    setForm({ ...emptyForm, ...s }); 
    setEditId(s.id); 
    setDialogOpen(true); 
  }

  async function handleSave() {
    if (!canManageStudents) {
      toast({ title: 'Akses Ditolak', description: 'Warden tidak dibenarkan mengemaskini maklumat pelajar.', variant: 'destructive' });
      return;
    }
    if (!form.student_id || !form.full_name || !form.email) {
      toast({ title: 'Error', description: 'Sila lengkapkan maklumat wajib (*)', variant: 'destructive' });
      return;
    }
    if (editId) {
      await base44.entities.Student.update(editId, form);
      await logAudit(user, 'STUDENT_UPDATED', 'Students', { id: editId, name: form.full_name, student_id: form.student_id });
      toast({ title: 'Profil pelajar berjaya dikemaskini' });
    } else {
      await base44.entities.Student.create(form);
      await logAudit(user, 'STUDENT_CREATED', 'Students', { name: form.full_name, student_id: form.student_id });
      toast({ title: 'Pelajar berjaya ditambah' });
    }
    setDialogOpen(false);
    load();
  }

  async function handleDelete(student) {
    if (!canManageStudents) {
      toast({ title: 'Akses Ditolak', description: 'Warden tidak dibenarkan memadam profil pelajar.', variant: 'destructive' });
      return;
    }
    await base44.entities.Student.delete(student.id);
    await logAudit(user, 'STUDENT_DELETED', 'Students', { id: student.id, name: student.full_name, student_id: student.student_id });
    toast({ title: 'Profil pelajar berjaya dipadam' });
    load();
  }

  if (loading) {
    return (
      <div>
        <PageHeader 
          title={user?.role === 'warden' ? "Resident Directory (Warden View)" : "Student Management"} 
          description={user?.role === 'warden' ? "Paparan maklumat residen blok jagaan anda" : "Manage resident profiles"} 
        />
        <TableSkeleton rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title={user?.role === 'warden' ? "Resident Directory (Warden View)" : "Student Management"} 
        description={
          user?.role === 'warden' 
            ? `Paparan maklumat residen bagi ${wardenAssignedBlocks.length > 0 ? wardenAssignedBlocks.join(', ') : 'blok jagaan anda'} (Akses Paparan Sahaja)` 
            : "Urus profil, penginapan dan maklumat pelajar kolej"
        } 
        actions={
          canManageStudents && (
            <Button onClick={openAdd} size="sm" className="bg-[#132644] hover:bg-[#1e385f] text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Student
            </Button>
          )
        } 
      />

      {user?.role === 'warden' && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Peranan Felo / Warden: <strong>Akses Paparan Sahaja (View-Only)</strong>. Sebarang pertukaran maklumat pelajar dikendalikan oleh Pentadbiran Kolej.</span>
          </div>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0 text-[11px]">
            Blok: {wardenAssignedBlocks.join(', ') || 'Semua'}
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama, No. ID, emel atau bilik..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterFaculty} onValueChange={setFilterFaculty}>
          <SelectTrigger className="w-full sm:w-44 h-9 text-sm bg-card"><SelectValue placeholder="Faculty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Fakulti</SelectItem>
            {FACULTIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Tiada pelajar ditemui" description="Tiada profil pelajar sepadan dengan carian anda." />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Student ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Blok / Bilik</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Faculty</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">Year</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(s => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{s.student_id}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{s.full_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-slate-600">
                      {s.block_name ? `${s.block_name} (${s.room_number || 'N/A'})` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{s.faculty}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">Tahun {s.year_of_study}</td>
                    <td className="px-4 py-3">
                      <Badge variant={(s.room_number ? s.status : 'Pending') === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                        {s.room_number ? s.status : 'Pending'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* VIEW ACTION: ACCESSIBLE TO ALL */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-indigo-700 hover:bg-indigo-50" 
                          title="Lihat Butiran Pelajar"
                          onClick={() => { setViewStudent(s); setViewOpen(true); }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* EDIT & DELETE ACTIONS: STRICTLY HIDDEN FOR WARDEN */}
                        {canManageStudents && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-700 hover:bg-slate-100" 
                              title="Edit Pelajar"
                              onClick={() => openEdit(s)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:bg-destructive/10" 
                              title="Padam Pelajar"
                              onClick={() => handleDelete(s)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
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

      {/* ADMIN EDIT / ADD MODAL */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Profil Pelajar' : 'Tambah Pelajar Baharu'}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kendalian Pentadbiran Kolej Kediaman Tun Fuad
            </DialogDescription>
          </DialogHeader>
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
            <div><Label className="text-xs">Faculty</Label><Input value={form.faculty} onChange={e => setForm({ ...form, faculty: e.target.value })} className="h-9 text-sm mt-1" /></div>
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">Batal</Button>
            <Button onClick={handleSave} size="sm" className="bg-[#132644] hover:bg-[#1e385f] text-white">
              {editId ? 'Kemaskini' : 'Tambah'} Pelajar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* READ-ONLY RESIDENT PROFILE MODAL (FOR WARDEN & ADMIN) */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" /> Profil Residen Pelajar
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Maklumat terperinci pendaftaran residen KKTF
            </DialogDescription>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-4 text-xs mt-2">
              {/* TOP HERO PROFILE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{viewStudent.full_name}</h3>
                    <p className="font-mono text-xs text-indigo-600 font-semibold">{viewStudent.student_id}</p>
                  </div>
                  <Badge variant={viewStudent.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                    {viewStudent.status}
                  </Badge>
                </div>
                <div className="pt-2 flex items-center gap-2 text-slate-600 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viewStudent.block_name || 'Tiada Blok'} &bull; Bilik {viewStudent.room_number || 'Tiada Bilik'}</span>
                </div>
              </div>

              {/* GRID INFO */}
              <div className="grid grid-cols-2 gap-2.5 bg-card border border-border rounded-2xl p-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Fakulti</p>
                  <p className="font-medium text-slate-900 mt-0.5">{viewStudent.faculty || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Program / Tahun</p>
                  <p className="font-medium text-slate-900 mt-0.5">{viewStudent.programme || '—'} (Thn {viewStudent.year_of_study})</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">No. Telefon</p>
                  <p className="font-medium text-slate-900 mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {viewStudent.phone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Emel</p>
                  <p className="font-medium text-slate-900 mt-0.5 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {viewStudent.email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Waris / Ibu Bapa</p>
                  <p className="font-medium text-slate-900 mt-0.5">{viewStudent.parent_name || '—'} ({viewStudent.parent_phone || '—'})</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Kecemasan / Kenderaan</p>
                  <p className="font-medium text-slate-900 mt-0.5">{viewStudent.emergency_contact || '—'} / {viewStudent.vehicle_reg || 'Tiada'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setViewOpen(false)} className="rounded-xl text-xs">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}