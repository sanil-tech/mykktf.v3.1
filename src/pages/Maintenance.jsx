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
import { Badge } from '@/components/ui/badge';
import { Plus, Wrench, ExternalLink, MapPin, Building2, User, CheckCircle, ShieldAlert, Sparkles, Hash } from 'lucide-react';
import { CardGridSkeleton } from '@/components/shared/ListSkeletons';
import { toast } from 'sonner';
import { validateAttachment } from '@/lib/validators';
import { logAudit } from '@/lib/audit';

const UMS_MYSERV_URL = 'https://aset.ums.edu.my/myserv/';

const statusBadge = { 
  Submitted: 'bg-slate-100 text-slate-700 border-slate-200', 
  Assigned: 'bg-blue-50 text-blue-700 border-blue-200', 
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200', 
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
};

const COMMON_FACILITIES = [
  'Toilet / Washroom (Tandas)',
  'Pantry / Kitchen (Pantri)',
  'Laundry Room (Bilik Basuh)',
  'Study Room (Bilik Bacaan)',
  'Surau / Musolla',
  'Corridor / Staircase (Koridor / Tangga)',
  'Multipurpose Hall (Dewan)',
  'Cafeteria (Kafeteria)',
  'Foyer / Main Entrance',
  'Hostel Compound / Street Lighting'
];

const STAFF_ROLES = ['warden', 'staff', 'college_admin', 'super_admin'];

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [filter, setFilter] = useState('all');

  const [form, setForm] = useState({
    location_type: 'My Room',
    room_number: '',
    block_name: '',
    specific_location: '',
    category: 'Electrical',
    description: '',
    myserv_ticket_no: '',
    photo: null
  });

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
          reqs = reqs.filter(r => !r.block_name || blockNames.includes(r.block_name));
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

  const handleOpenDialog = () => {
    setForm({
      location_type: 'My Room',
      room_number: myStudent?.room_number || '',
      block_name: myStudent?.block_name || '',
      specific_location: myStudent ? `Bilik ${myStudent.room_number}, ${myStudent.block_name}` : '',
      category: 'Electrical',
      description: '',
      myserv_ticket_no: '',
      photo: null
    });
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateAttachment(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      setForm(f => ({ ...f, photo: null }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(f => ({ ...f, photo: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  async function handleSubmit(launchMyServ = false) {
    if (!form.description) { 
      toast.error('Sila isi penerangan kerosakan'); 
      return; 
    }
    if (!myStudent && !currentUser) { 
      toast.error('Profil pengguna tidak ditemui'); 
      return; 
    }

    const studentName = myStudent?.full_name || currentUser?.full_name || currentUser?.email;
    const studentId = myStudent?.id || currentUser?.id;
    const studentMatric = myStudent?.student_id || '';
    const studentMicroAddress = myStudent?.room_number ? `${myStudent.block_name || 'Blok'} - Bilik ${myStudent.room_number}` : 'N/A';

    const locationDisplay = form.location_type === 'My Room'
      ? (myStudent?.room_number ? `Bilik ${myStudent.room_number} (${myStudent.block_name})` : form.specific_location || 'Bilik Sendiri')
      : (form.specific_location || form.location_type);

    const payload = {
      student_id: studentId,
      student_name: `${studentName} [${studentMicroAddress}]`,
      room_number: form.location_type === 'My Room' ? (myStudent?.room_number || 'My Room') : (form.room_number || 'Common Area'),
      block_name: form.block_name || myStudent?.block_name || '',
      location_type: form.location_type,
      specific_location: locationDisplay,
      category: form.category,
      description: form.description,
      myserv_ticket_no: form.myserv_ticket_no?.trim() || '',
      photo: form.photo || null,
      status: 'Submitted'
    };

    await base44.entities.MaintenanceRequest.create(payload);
    await logAudit(currentUser, 'MAINTENANCE_SUBMITTED', 'Maintenance', { 
      student: studentName, 
      category: form.category, 
      location: locationDisplay,
      myserv_ticket: form.myserv_ticket_no 
    });

    toast.success('Laporan kerosakan berjaya direkodkan dalam sistem KKTF!');
    setDialogOpen(false);
    init();

    if (launchMyServ) {
      window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer');
    }
  }

  async function updateStatus(id, status) {
    await base44.entities.MaintenanceRequest.update(id, { status });
    await logAudit(currentUser, 'MAINTENANCE_UPDATED', 'Maintenance', { id, status });
    toast.success(`Status dikemaskini kepada: ${status}`);
    init();
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  if (loading) {
    return (
      <div>
        <PageHeader title="Damage & Maintenance Reports" description="Memuatkan laporan kerosakan..." />
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Damage & Maintenance Reports"
        description={isStaff ? "Pantau dan urus aduan kerosakan fasiliti kolej serta integrasi UMS MyServ" : "Lapor kerosakan bilik atau kawasan awam kolej untuk pembaikan segera"}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium gap-1.5"
              onClick={() => window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="w-4 h-4 text-indigo-600" /> Buka Portal UMS MyServ
            </Button>
            {!isStaff && (
              <Button size="sm" onClick={handleOpenDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm">
                <Plus className="w-4 h-4" /> Lapor Kerosakan Baru
              </Button>
            )}
          </div>
        }
      />

      {/* UMS MYSERV INTEGRATION BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-500/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-500/30 text-indigo-300 border-indigo-400/30 text-xs px-2.5 py-0.5">
              Portal Rasmi UMS
            </Badge>
            <span className="text-xs text-indigo-200 font-mono">aset.ums.edu.my/myserv</span>
          </div>
          <h3 className="text-base sm:text-lg font-heading font-bold text-white">
            Sistem Aduan Kerosakan & Penyelenggaraan Harta UMS (MyServ)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Untuk kerja pembaikan sivil, elektrik, atau struktur oleh Jabatan Pembangunan & Pengurusan Harta (JPP UMS), sila hantar tiket rasmi di portal MyServ. Rekodkan laporan di MyKKTF untuk membolehkan pihak kolej memantau status pembaikan bilik anda.
          </p>
        </div>

        <Button 
          onClick={() => window.open(UMS_MYSERV_URL, '_blank', 'noopener,noreferrer')} 
          className="bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs px-4 py-2 rounded-xl shadow-lg shrink-0 flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4 text-indigo-600" /> Layari UMS MyServ
        </Button>
      </div>

      {isStaff && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48 h-9 text-xs bg-card border-border">
                <SelectValue placeholder="Tapis Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status ({requests.length})</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* REQUESTS LIST / CARDS */}
      {filtered.length === 0 ? (
        <EmptyState 
          icon={Wrench} 
          title="Tiada Laporan Kerosakan Ditemui" 
          description={isStaff ? "Semua aduan telah diselesaikan." : "Tiada aduan kerosakan aktif untuk akaun anda."} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{r.specific_location || `Bilik ${r.room_number}`}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      Pelapor: <span className="font-medium text-slate-700">{r.student_name}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-semibold shrink-0 ${statusBadge[r.status] || 'bg-slate-100'}`}>
                    {r.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground">
                    {r.category}
                  </span>
                  {r.location_type && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-medium text-indigo-700 border border-indigo-100">
                      {r.location_type}
                    </span>
                  )}
                  {r.myserv_ticket_no && (
                    <a 
                      href={UMS_MYSERV_URL} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-[10px] font-mono font-medium text-emerald-700 border border-emerald-200"
                    >
                      <Hash className="w-3 h-3 text-emerald-600" /> MyServ: {r.myserv_ticket_no}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-foreground/90 line-clamp-3 bg-muted/30 p-2.5 rounded-xl border border-border/50">
                  {r.description}
                </p>

                {r.photo && (
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-border">
                    <img src={r.photo} alt="Lampiran Kerosakan" className="w-full h-32 object-cover hover:scale-105 transition-transform" />
                  </div>
                )}
              </div>

              {isStaff && (
                <div className="pt-2 border-t border-border flex gap-1.5 flex-wrap">
                  {r.status === 'Submitted' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => updateStatus(r.id, 'Assigned')}>
                      Tugaskan Staf
                    </Button>
                  )}
                  {r.status === 'Assigned' && (
                    <Button size="sm" variant="outline" className="text-xs h-7 text-amber-700 border-amber-200 hover:bg-amber-50" onClick={() => updateStatus(r.id, 'In Progress')}>
                      Mula Kerja
                    </Button>
                  )}
                  {r.status === 'In Progress' && (
                    <Button size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(r.id, 'Completed')}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Selesai
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NEW DAMAGE REPORT MODAL */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" /> Borang Aduan Kerosakan Kolej
            </DialogTitle>
          </DialogHeader>

          {myStudent && (
            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Mikro-Alamat Residen: <strong>{myStudent.full_name}</strong></span>
              </div>
              <Badge className="bg-indigo-200/60 text-indigo-800 border-none font-mono text-[11px]">
                {myStudent.block_name || 'Blok'} - {myStudent.room_number ? `Bilik ${myStudent.room_number}` : 'Tiada Bilik'}
              </Badge>
            </div>
          )}

          <div className="space-y-4 mt-2">
            {/* LOKASI KEROSAKAN */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Skop Lokasi Kerosakan *</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'My Room', label: 'Bilik Sendiri' },
                  { id: 'Common Area', label: 'Fasiliti Bersama' },
                  { id: 'Other Facility', label: 'Lokasi Lain' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        location_type: type.id,
                        specific_location: type.id === 'My Room' && myStudent?.room_number 
                          ? `Bilik ${myStudent.room_number} (${myStudent.block_name || 'Blok'})` 
                          : ''
                      }));
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      form.location_type === type.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-card border-border text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {form.location_type === 'Common Area' ? (
              <div>
                <Label className="text-xs font-medium">Pilih Fasiliti Bersama *</Label>
                <Select 
                  value={form.specific_location} 
                  onValueChange={v => setForm({ ...form, specific_location: v })}
                >
                  <SelectTrigger className="h-9 text-xs mt-1 bg-card">
                    <SelectValue placeholder="Pilih Fasiliti / Kawasan Awam" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_FACILITIES.map(fac => (
                      <SelectItem key={fac} value={fac}>{fac}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : form.location_type === 'Other Facility' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Blok (Jika Berkaitan)</Label>
                  <Input 
                    placeholder="cth: Blok B Aras 2" 
                    value={form.block_name} 
                    onChange={e => setForm({ ...form, block_name: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Perincian Lokasi *</Label>
                  <Input 
                    placeholder="cth: Lampu Tangga Belakang" 
                    value={form.specific_location} 
                    onChange={e => setForm({ ...form, specific_location: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Nombor Bilik *</Label>
                  <Input 
                    value={form.room_number} 
                    onChange={e => setForm({ ...form, room_number: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                    placeholder="cth: 204" 
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Blok Kediaman</Label>
                  <Input 
                    value={form.block_name} 
                    onChange={e => setForm({ ...form, block_name: e.target.value })} 
                    className="h-9 text-xs mt-1" 
                    placeholder="cth: Blok A" 
                  />
                </div>
              </div>
            )}

            {/* KATEGORI */}
            <div>
              <Label className="text-xs font-medium">Kategori Kerosakan *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Electrical', 'Plumbing', 'Furniture', 'Internet', 'Cleaning', 'Others'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PENERANGAN */}
            <div>
              <Label className="text-xs font-medium">Penerangan Kerosakan *</Label>
              <Textarea 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                className="text-xs mt-1" 
                rows={3} 
                placeholder="Nyatakan dengan terperinci kerosakan yang dialami..." 
              />
            </div>

            {/* NO TIKET UMS MYSERV (PILIHAN) */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" /> No. Tiket UMS MyServ (Pilihan)
                </Label>
                <span className="text-[10px] text-muted-foreground">Jika sudah mohon di MyServ</span>
              </div>
              <Input 
                placeholder="cth: MYS-2026-0842" 
                value={form.myserv_ticket_no} 
                onChange={e => setForm({ ...form, myserv_ticket_no: e.target.value })} 
                className="h-8 text-xs font-mono bg-white" 
              />
            </div>

            {/* LAMPIRAN FOTO */}
            <div>
              <Label className="text-xs font-medium">Muat Naik Foto Kerosakan (Pilihan)</Label>
              <Input 
                type="file" 
                onChange={handleFileChange} 
                className="text-xs mt-1" 
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" 
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              onClick={() => handleSubmit(false)}
              className="text-xs"
            >
              Simpan Laporan Sahaja
            </Button>
            <Button 
              type="button" 
              size="sm" 
              onClick={() => handleSubmit(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Hantar & Buka UMS MyServ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}