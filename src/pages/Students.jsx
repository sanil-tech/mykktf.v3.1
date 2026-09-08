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
import { Plus, Search, GraduationCap, Edit, Trash2, Eye, Lock, User, Building, Phone, Mail, FlaskConical, RotateCcw, AlertTriangle } from 'lucide-react';
import TablePagination from '@/components/shared/TablePagination';
import { logAudit } from '@/lib/audit';
import { isBlockInList, isSameBlock, ALL_KKTF_BLOCKS } from '@/lib/kktfBlocks';
import { isOperatingAsWarden, getWardenBlocks } from '@/lib/wardenHelper';
import { maskIC, maskPhone } from '@/lib/dataMasking';
import { canViewSensitiveProfile } from '@/lib/permissions';

const FACULTIES = ['Engineering', 'Science', 'Arts', 'Business', 'Medicine', 'Education', 'Law', 'IT'];
const PAGE_SIZE = 10;
const emptyForm = { student_id: '', full_name: '', ic_passport: '', gender: 'Male', date_of_birth: '', faculty: '', programme: '', year_of_study: 1, phone: '', email: '', block_name: '', room_number: '', parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '', status: 'Active', is_test: false };

const ADMIN_ROLES = ['super_admin', 'college_admin', 'staff', 'principal'];

export default function Students() {
  const [students, setStudents] = useState([]);
  const isDeletingRef = React.useRef(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBlock, setFilterBlock] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [viewStudent, setViewStudent] = useState(null);
  const [page, setPage] = useState(1);
  const [wardenAssignedBlocks, setWardenAssignedBlocks] = useState([]);
  const { toast } = useToast();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => { 
    load(); 
    const handleGlobalRefresh = () => { 
      // Jangan reload semasa proses pemadaman sedang berjalan - elak race condition
      if (!isDeletingRef.current) { load(); }
    };
    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    return () => window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
  }, []);
  useEffect(() => { setPage(1); }, [search, filterFaculty, filterStatus, filterBlock]);

  async function load() {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    let data = [];
    if (isOperatingAsWarden(u)) {
      // Dapatkan rekod penugasan blok daripada WardenBlock / persona
      const blockNames = await getWardenBlocks(u);
      setWardenAssignedBlocks(blockNames);
      const all = await base44.entities.Student.list('-created_date');
      // Felo HANYA melihat pelajar bagi blok jagaan mereka sahaja, tiada fallback kepada keseluruhan kolej
      data = blockNames.length > 0 
        ? all.filter(s => isBlockInList(s.block_name, blockNames)) 
        : [];
    } else {
      // Super Admin, Pentadbir Kolej, Pengetua, dan Staf melihat keseluruhan direktori pelajar
      data = await base44.entities.Student.list('-created_date');
    }
    // Selaraskan nombor waris dan emergency contact jika salah satu kosong
    const syncedData = data.map(s => {
      const resolved = s.emergency_contact || s.parent_phone || '';
      return {
        ...s,
        parent_phone: s.parent_phone || resolved,
        emergency_contact: s.emergency_contact || resolved
      };
    });
    setStudents(syncedData);

    // Auto-update ke pangkalan data jika salah satu belum ada
    syncedData.forEach(async (s) => {
      if ((!s.emergency_contact && s.parent_phone) || (!s.parent_phone && s.emergency_contact)) {
        try {
          const ph = s.parent_phone || s.emergency_contact;
          await base44.entities.Student.update(s.id, { parent_phone: ph, emergency_contact: ph });
        } catch (eSync) {}
      }
    });
    setLoading(false);
  }

  const canManageStudents = ADMIN_ROLES.includes(user?.role) || user?.role === 'principal';
  const isSuperAdmin = user?.role === 'super_admin';
  const testStudents = students.filter(s => s.is_test === true);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.full_name?.toLowerCase().includes(q) || s.student_id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.room_number?.toLowerCase().includes(q);
    const matchFaculty = filterFaculty === 'all' || s.faculty === filterFaculty;
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchBlock = filterBlock === 'all' || isSameBlock(s.block_name, filterBlock);
    return matchSearch && matchFaculty && matchStatus && matchBlock;
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
    const resolvedEmergency = s.emergency_contact || s.parent_phone || '';
    const resolvedParentPhone = s.parent_phone || s.emergency_contact || '';
    setForm({ 
      ...emptyForm, 
      ...s,
      parent_phone: resolvedParentPhone,
      emergency_contact: resolvedEmergency
    }); 
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

    const resolvedEmergency = form.emergency_contact || form.parent_phone || '';
    const resolvedParentPhone = form.parent_phone || form.emergency_contact || '';
    const payload = {
      ...form,
      parent_phone: resolvedParentPhone,
      emergency_contact: resolvedEmergency
    };

    if (editId) {
      await base44.entities.Student.update(editId, payload);
      await logAudit(user, 'STUDENT_UPDATED', 'Students', { id: editId, name: payload.full_name, student_id: payload.student_id });
      toast({ title: 'Profil pelajar berjaya dikemaskini' });
    } else {
      await base44.entities.Student.create(payload);
      await logAudit(user, 'STUDENT_CREATED', 'Students', { name: payload.full_name, student_id: payload.student_id });
      toast({ title: 'Pelajar berjaya ditambah' });
    }
    setDialogOpen(false);
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
    load();
  }

  // ─── RESET DATA UJIAN (CASCADE CLEAN TEST ACCOUNTS) ────────────────────────
  async function handleResetTestData() {
    if (!isSuperAdmin) return;
    setIsResetting(true);
    setConfirmResetOpen(false);
    let resetCount = 0;
    let roomsUpdated = 0;

    try {
      for (const student of testStudents) {
        try {
          // 1. Cari bilik berkaitan dan kira semula occupancy
          if (student.block_name && student.room_number) {
            try {
              const matched = await base44.entities.Room.filter({
                block_name: student.block_name,
                room_number: student.room_number
              }).catch(() => []);
              if (matched && matched.length > 0) {
                const targetRoom = matched[0];
                const allRoomStudents = await base44.entities.Student.filter({
                  block_name: targetRoom.block_name,
                  room_number: targetRoom.room_number
                }).catch(() => []);
                const remaining = allRoomStudents.filter(s =>
                  s.id !== student.id &&
                  !s.is_test &&
                  String(s.resident_status || '').toLowerCase() !== 'archived'
                ).length;
                const capacity = targetRoom.capacity || targetRoom.max_beds || 4;
                const newStatus = remaining >= capacity ? 'Full' : remaining > 0 ? 'Partially Occupied' : 'Available';
                await base44.entities.Room.update(targetRoom.id, {
                  current_occupancy: remaining,
                  status: newStatus
                });
                roomsUpdated++;
              }
            } catch (roomErr) {}
          }

          // 2. Reset profil pelajar ke keadaan asal (tiada bilik, status Inactive)
          await base44.entities.Student.update(student.id, {
            block_name: '',
            room_number: '',
            room_id: null,
            status: 'Inactive',
            room_status: null,
            resident_status: 'pending',
            check_in_date: null,
            check_out_date: null,
            key_number: null,
          });
          resetCount++;
        } catch (studentErr) {
          console.warn(`Gagal reset pelajar ujian ${student.student_id}:`, studentErr);
        }
      }

      // 3. Bersihkan drop-key requests berkaitan akaun ujian
      try {
        const testIds = new Set(testStudents.map(s => s.student_id));
        const stored = JSON.parse(localStorage.getItem('kktf_drop_key_requests') || '[]');
        const cleaned = stored.filter(r => !testIds.has(r.student_matric) && !testIds.has(r.student_id));
        localStorage.setItem('kktf_drop_key_requests', JSON.stringify(cleaned));
      } catch (storageErr) {}

      // 4. Log audit
      await logAudit(user, 'TEST_DATA_RESET', 'Students', {
        reset_count: resetCount,
        rooms_updated: roomsUpdated,
        test_student_ids: testStudents.map(s => s.student_id)
      }).catch(() => {});

      window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
      window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED'));

      toast({
        title: `✅ Reset Data Ujian Berjaya`,
        description: `${resetCount} pelajar ujian telah direset. ${roomsUpdated} bilik telah disegerakkan semula.`
      });

      await new Promise(r => setTimeout(r, 400));
      await load();
    } catch (err) {
      console.error('Ralat semasa reset data ujian:', err);
      toast({ title: 'Ralat Reset', description: err.message || 'Gagal reset data ujian.', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  async function handleDelete(student) {
    isDeletingRef.current = true;
    if (!canManageStudents) {
      toast({ title: 'Akses Ditolak', description: 'Warden tidak dibenarkan memadam profil pelajar.', variant: 'destructive' });
      return;
    }
    try {
      // 1. Kenal pasti bilik aktif sebelum dipadam
      const hasRoom = Boolean(student.room_id || (student.block_name && student.room_number));
      let targetRoom = null;

      if (hasRoom) {
        if (student.room_id) {
          try {
            targetRoom = await base44.entities.Room.get(student.room_id);
          } catch (e) {}
        }
        if (!targetRoom && student.block_name && student.room_number) {
          try {
            const matched = await base44.entities.Room.filter({
              block_name: student.block_name,
              room_number: student.room_number
            });
            if (matched && matched.length > 0) targetRoom = matched[0];
          } catch (e) {}
        }
      }

      // 2. Padam rekod pelajar secara selamat (idempotent: toleran jika entiti sudah tiada di DB)
      try {
        if (student.id) {
          await base44.entities.Student.delete(student.id);
        }
      } catch (delErr) {
        const msg = String(delErr?.message || '').toLowerCase();
        // Jika 404 / not found, rekod memang telah dipadam sebelumnya di pangkalan data
        if (msg.includes('not found') || msg.includes('404')) {
          console.info(`Pelajar ID ${student.id} sudah tiada dalam DB, meneruskan pembersihan residu.`);
        } else {
          // Cuba cari padanan rekod jika wujud di bawah student_id atau email
          try {
            const matched = await base44.entities.Student.filter({ 
              student_id: student.student_id 
            });
            if (matched && matched.length > 0) {
              for (const m of matched) {
                await base44.entities.Student.delete(m.id).catch(() => {});
              }
            }
          } catch (fallbackErr) {}
        }
      }

      // Keluarkan serta-merta daripada state UI agar tidak tergantung di paparan
      setStudents(prev => prev.filter(s => s.id !== student.id && s.student_id !== student.student_id));

      // 3. Kemas kini bilik secara langsung sekiranya pelajar menduduki bilik
      if (targetRoom) {
        try {
          const allRoomStudents = await base44.entities.Student.filter({
            block_name: targetRoom.block_name,
            room_number: targetRoom.room_number
          }).catch(() => []);

          const remainingOccupants = allRoomStudents.filter(s => 
            s.id !== student.id &&
            s.student_id !== student.student_id &&
            String(s.resident_status || '').toLowerCase() !== 'archived' &&
            String(s.room_status || '').toLowerCase() !== 'checked out'
          ).length;

          const capacity = targetRoom.capacity || targetRoom.max_beds || 4;
          let newStatus = 'Available';
          if (remainingOccupants >= capacity) {
            newStatus = 'Full';
          } else if (remainingOccupants > 0) {
            newStatus = 'Partially Occupied';
          }

          await base44.entities.Room.update(targetRoom.id, {
            current_occupancy: remainingOccupants,
            status: newStatus
          });
        } catch (roomErr) {
          console.warn('Gagal selaras bilik secara automatik:', roomErr);
        }
      }

      // 4. Bersihkan sebarang permohonan drop-key berkaitan pelajar ini
      try {
        const stored = JSON.parse(localStorage.getItem('kktf_drop_key_requests') || '[]');
        const filtered = stored.filter(r => 
          r.student_id !== student.id && 
          r.student_id !== student.student_id && 
          r.student_matric !== student.student_id
        );
        localStorage.setItem('kktf_drop_key_requests', JSON.stringify(filtered));
      } catch (storageErr) {}

      // 5. Log audit pemadaman
      try {
        await logAudit(user, 'STUDENT_DELETED', 'Students', { 
          id: student.id, 
          name: student.full_name, 
          student_id: student.student_id,
          deallocated_room: targetRoom ? `${targetRoom.block_name} - Bilik ${targetRoom.room_number}` : null
        });
      } catch (auditErr) {}

      // 6. Siarkan acara kemas kini ke seluruh modul
      window.dispatchEvent(new CustomEvent('DROP_KEY_UPDATED'));

      toast({ 
        title: 'Profil pelajar berjaya dipadam',
        description: targetRoom 
          ? `Bilik ${targetRoom.block_name} (${targetRoom.room_number}) dan statistik kolej telah disegerakkan.` 
          : 'Rekod pelajar telah dibersihkan daripada pangkalan data.' 
      });
      // Beri masa API untuk commit sebelum reload - elak race condition
      await new Promise(r => setTimeout(r, 600));
      isDeletingRef.current = false;
      await load();
      window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
    } catch (err) {
      console.error('Ralat semasa memadam pelajar:', err);
      isDeletingRef.current = false;
      toast({ title: 'Ralat Memadam', description: err.message || 'Gagal memadam profil pelajar.', variant: 'destructive' });
    }
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

  function handleViewStudent(s) {
    setViewStudent(s);
    setViewOpen(true);
    logAudit({
      user,
      action: 'STUDENT_PROFILE_VIEW',
      action_type: 'READ',
      module: 'Students',
      resource_type: 'Student',
      resource_id: s.id,
      affected_user_id: s.student_id,
      result: 'SUCCESS',
      details: { student_id: s.student_id, full_name: s.full_name },
    });
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
          <div className="flex items-center gap-2">
            {isSuperAdmin && testStudents.length > 0 && (
              <Button
                onClick={() => setConfirmResetOpen(true)}
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-50 gap-1.5"
                disabled={isResetting}
              >
                <FlaskConical className="w-4 h-4" />
                {isResetting ? 'Mereset...' : `Reset Data Ujian (${testStudents.length})`}
              </Button>
            )}
            {canManageStudents && (
              <Button onClick={openAdd} size="sm" className="bg-[#132644] hover:bg-[#1e385f] text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Add Student
              </Button>
            )}
          </div>
        } 
      />

      {user?.role === 'warden' && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Peranan Felo / Warden: <strong>Akses Paparan Sahaja (View-Only)</strong>. Terhad kepada residen blok jagaan anda sahaja.</span>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 shrink-0 text-[11px] font-semibold">
            Blok Jagaan: {wardenAssignedBlocks.join(', ') || 'Belum Diagihkan'}
          </Badge>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama, No. ID, emel atau bilik..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterBlock} onValueChange={setFilterBlock}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-sm bg-card"><SelectValue placeholder="Pilih Blok" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {user?.role === 'warden' && wardenAssignedBlocks.length > 0
                ? `Semua Blok Jagaan (${wardenAssignedBlocks.join(' & ')})`
                : 'Semua Blok Kolej'}
            </SelectItem>
            {(user?.role === 'warden' && wardenAssignedBlocks.length > 0 ? wardenAssignedBlocks : ALL_KKTF_BLOCKS).map(b => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${s.is_test ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      <div className="flex items-center gap-1.5">
                        {s.student_id}
                        {s.is_test && <span title="Akaun Ujian" className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded px-1 py-0.5"><FlaskConical className="w-2.5 h-2.5" />TEST</span>}
                      </div>
                    </td>
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
                          onClick={() => handleViewStudent(s)}
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
            <div>
              <Label className="text-xs">Parent Phone (No. Waris)</Label>
              <Input 
                value={form.parent_phone} 
                onChange={e => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    parent_phone: val,
                    emergency_contact: (!prev.emergency_contact || prev.emergency_contact === prev.parent_phone) ? val : prev.emergency_contact
                  }));
                }} 
                className="h-9 text-sm mt-1" 
              />
            </div>
            <div><Label className="text-xs">Block Name</Label><Input value={form.block_name} onChange={e => setForm({ ...form, block_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Room Number</Label><Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Emergency Contact</Label>
              <Input 
                value={form.emergency_contact} 
                onChange={e => {
                  const val = e.target.value;
                  setForm(prev => ({
                    ...prev,
                    emergency_contact: val,
                    parent_phone: (!prev.parent_phone || prev.parent_phone === prev.emergency_contact) ? val : prev.parent_phone
                  }));
                }} 
                className="h-9 text-sm mt-1" 
              />
            </div>
            <div><Label className="text-xs">Vehicle Reg</Label><Input value={form.vehicle_reg} onChange={e => setForm({ ...form, vehicle_reg: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Active">Active</SelectItem><SelectItem value="Inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            
            {/* TEST ACCOUNT TOGGLE - ADMIN ONLY */}
            {canManageStudents && (
              <div className="col-span-1 sm:col-span-2 border border-amber-200 bg-amber-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Akaun Ujian (Test Account)</p>
                    <p className="text-[11px] text-amber-600">Tandai pelajar ini sebagai akaun simulasi. Boleh direset tanpa memadam rekod.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_test: !prev.is_test }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                    form.is_test ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_test ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}
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
                  <p className="font-medium text-slate-900 mt-0.5">
                    {viewStudent.parent_name || '—'} ({canViewSensitiveProfile(user?.role) ? (viewStudent.parent_phone || '—') : maskPhone(viewStudent.parent_phone)})
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Kecemasan / Kenderaan</p>
                  <p className="font-medium text-slate-900 mt-0.5">
                    {canViewSensitiveProfile(user?.role) ? (viewStudent.emergency_contact || '—') : maskPhone(viewStudent.emergency_contact)} / {viewStudent.vehicle_reg || 'Tiada'}
                  </p>
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

      {/* CONFIRM RESET TEST DATA DIALOG */}
      <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" /> Sahkan Reset Data Ujian
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tindakan ini akan <strong>mereset</strong> semua akaun ujian ke keadaan awal. Rekod pelajar tidak akan dipadam.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs space-y-1.5 my-2">
            <p className="font-semibold text-amber-800">Tindakan yang akan dilakukan:</p>
            <ul className="text-amber-700 space-y-1 list-disc list-inside">
              <li>Kosongkan blok & bilik semua {testStudents.length} akaun ujian</li>
              <li>Tukar status kepada <strong>Inactive</strong></li>
              <li>Reset tarikh check-in, check-out & nombor kunci</li>
              <li>Kemas kini occupancy bilik berkaitan</li>
              <li>Bersihkan permohonan drop-key berkaitan</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmResetOpen(false)}>Batal</Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              onClick={handleResetTestData}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Ya, Reset Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}