import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, CheckCircle, AlertTriangle, Eye, ShieldCheck, Clock, 
  Lightbulb, Zap, Key, Eye as WindowIcon, Bed, 
  Layers, Archive, BookOpen, Camera, Check, RefreshCw,
  Search, Filter, Building, FileText, ArrowRight, ExternalLink
} from 'lucide-react';
import { logAudit } from '@/lib/audit';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  Submitted: 'bg-amber-100 text-amber-800 border-amber-200',
  Reviewed: 'bg-blue-100 text-blue-800 border-blue-200',
  Verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Needs Attention': 'bg-rose-100 text-rose-800 border-rose-200',
};

// The 8 official inventory items specified in handbook section 4.2
const INVENTORY_ITEMS = [
  { id: 'suis_lampu', name: 'Suis Lampu', eng: 'Lighting Switches & Lights', icon: Lightbulb, desc: 'Periksa suis lampu bilik, lampu kalimantang/LED menyala elok' },
  { id: 'soket_elektrik', name: 'Soket Elektrik', eng: 'Power Outlets / Sockets', icon: Zap, desc: 'Pastikan soket dinding tidak longgar, tidak hangus atau retak' },
  { id: 'tombol_pintu', name: 'Tombol Pintu & Kunci', eng: 'Door Lock & Knob', icon: Key, desc: 'Periksa mekanisme tombol, anak kunci berfungsi dan boleh dikunci' },
  { id: 'tingkap_selak', name: 'Tingkap & Selak', eng: 'Windows & Latches', icon: WindowIcon, desc: 'Cermin tingkap sempurna, selak boleh dibuka/tutup dengan selamat' },
  { id: 'tilam', name: 'Tilam', eng: 'Mattress', icon: Layers, desc: 'Keadaan tilam bersih, tiada koyakan besar atau kerosakan teruk' },
  { id: 'katil', name: 'Rangka Katil', eng: 'Bed Frame', icon: Bed, desc: 'Rangka katil stabil, besi/kayu tidak patah atau reput' },
  { id: 'almari', name: 'Almari Pakaian', eng: 'Wardrobe', icon: Archive, desc: 'Pintu almari, engsel, laci dan palang gantung berfungsi baik' },
  { id: 'meja_belajar', name: 'Meja & Kerusi Belajar', eng: 'Study Desk & Chair', icon: BookOpen, desc: 'Permukaan meja tidak patah dan kerusi kukuh untuk digunakan' },
];

const INITIAL_CHECKLIST = INVENTORY_ITEMS.reduce((acc, item) => {
  acc[item.id] = { status: 'Baik', notes: '', photo: '' };
  return acc;
}, {});

export default function RoomInspections() {
  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [uploadingItem, setUploadingItem] = useState(null);

  // Filters for staff/warden
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Inspection form state
  const [form, setForm] = useState({
    student_id: '',
    student_name: '',
    room_number: '',
    block_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    checklist: { ...INITIAL_CHECKLIST },
    overall_notes: '',
    photos: '',
  });

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      setLoading(true);
      const u = await base44.auth.me();
      setUser(u);

      const [inspList, studs] = await Promise.all([
        base44.entities.RoomInspection.list('-created_date').catch(() => []),
        base44.entities.Student.list().catch(() => []),
      ]);

      setInspections(Array.isArray(inspList) ? inspList : []);
      setStudents(Array.isArray(studs) ? studs : []);

      // If student, find their profile
      if (u) {
        const myStud = studs.find(s => 
          (s.user_id && s.user_id === u.id) || 
          (s.email && u.email && s.email.toLowerCase() === u.email.toLowerCase())
        );
        if (myStud) {
          setStudentProfile(myStud);
          setForm(f => ({
            ...f,
            student_id: myStud.student_id || '',
            student_name: myStud.full_name || u.full_name || '',
            room_number: myStud.room_number || '',
            block_name: myStud.block_name || '',
          }));
        } else {
          // Fallback user metadata
          setForm(f => ({
            ...f,
            student_name: u.full_name || '',
            block_name: u.block_name || '',
            room_number: u.room_number || '',
          }));
        }
      }
    } catch (err) {
      console.error('Error loading RoomInspections:', err);
    } finally {
      setLoading(false);
    }
  }

  const isStudent = !user?.role || user?.role === 'student' || user?.role === 'user';
  const canVerify = user && ['super_admin', 'principal', 'college_admin', 'warden', 'staff', 'jakmas'].includes(user.role);

  // Student's own inspection record if already submitted
  const myInspection = inspections.find(i => 
    (studentProfile && i.student_id === studentProfile.student_id) ||
    (user && i.inspected_by_user_id === user.id) ||
    (user?.email && i.inspected_by_name?.toLowerCase() === user.email.toLowerCase())
  );

  function setAllBaik() {
    setForm(f => {
      const updated = {};
      INVENTORY_ITEMS.forEach(it => {
        updated[it.id] = { ...(f.checklist[it.id] || {}), status: 'Baik' };
      });
      return { ...f, checklist: updated };
    });
    toast({ title: 'Semua item ditandakan "Baik"' });
  }

  function toggleItemStatus(itemId, newStatus) {
    setForm(f => ({
      ...f,
      checklist: {
        ...f.checklist,
        [itemId]: {
          ...(f.checklist[itemId] || {}),
          status: newStatus
        }
      }
    }));
  }

  function setItemNotes(itemId, notes) {
    setForm(f => ({
      ...f,
      checklist: {
        ...f.checklist,
        [itemId]: {
          ...(f.checklist[itemId] || {}),
          notes
        }
      }
    }));
  }

  async function handlePhotoUpload(e, itemId = null) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItem(itemId || 'overall');
    let uploadedUrl = '';

    try {
      if (base44?.integrations?.Core?.UploadFile) {
        const res = await base44.integrations.Core.UploadFile({ file });
        if (res?.file_url) {
          uploadedUrl = res.file_url;
        }
      }
    } catch (err) {
      console.warn('UploadFile integration fallback to FileReader', err);
    }

    if (!uploadedUrl) {
      // Local FileReader fallback for immediate visual preview and persistence
      uploadedUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    if (itemId) {
      setForm(f => ({
        ...f,
        checklist: {
          ...f.checklist,
          [itemId]: {
            ...(f.checklist[itemId] || {}),
            photo: uploadedUrl
          }
        }
      }));
    } else {
      setForm(f => ({ ...f, photos: uploadedUrl }));
    }

    setUploadingItem(null);
    toast({ title: 'Gambar berjaya dimuat naik' });
  }

  async function submitInspection() {
    if (!form.student_name || !form.room_number) {
      toast({ title: 'Sila lengkapkan nama dan nombor bilik', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate summary metrics
      const damagedItems = INVENTORY_ITEMS.filter(it => form.checklist[it.id]?.status === 'Perlu Pembaikan');
      const hasDamages = damagedItems.length > 0;
      const flaggedIssues = damagedItems.map(d => `${d.name}: ${form.checklist[d.id]?.notes || 'Perlu pembaikan'}`).join(' | ');

      const inspectionPayload = {
        student_id: form.student_id || studentProfile?.student_id || '',
        student_name: form.student_name,
        room_number: form.room_number,
        block_name: form.block_name || '',
        inspection_date: form.inspection_date || new Date().toISOString().split('T')[0],
        status: hasDamages ? 'Submitted' : 'Verified',
        room_cleanliness: 'Pass',
        furniture_complete: hasDamages ? 'Needs Attention' : 'Pass',
        visible_damage: hasDamages ? 'Minor' : 'None',
        resident_present: true,
        notes: form.overall_notes || (hasDamages ? 'Terdapat kerosakan sedia ada dilaporkan oleh pelajar.' : 'Semua inventori bilik dalam keadaan baik.'),
        flagged_issues: flaggedIssues,
        photos: form.photos || (damagedItems.find(d => form.checklist[d.id]?.photo) ? form.checklist[damagedItems.find(d => form.checklist[d.id]?.photo).id]?.photo : ''),
        inspected_by_user_id: user?.id || '',
        inspected_by_name: user?.full_name || user?.email || 'Pelajar',
        // Structured checklist data stored in custom JSON field or stringified notes
        checklist_data: JSON.stringify(form.checklist),
        has_damages: hasDamages,
      };

      await base44.entities.RoomInspection.create(inspectionPayload);

      await logAudit(user, 'ROOM_INSPECTION_SUBMITTED', 'Room Inspections', {
        room: form.room_number,
        block: form.block_name,
        hasDamages,
        flaggedIssues
      });

      toast({ 
        title: 'Pemeriksaan Bilik Berjaya Dihantar',
        description: hasDamages 
          ? 'Laporan kerosakan sedia ada telah direkodkan untuk pengesahan pihak kolej.' 
          : 'Pemeriksaan inventori bilik selesai dan disahkan.'
      });

      setShowForm(false);
      init();
    } catch (err) {
      console.error('Failed to submit inspection:', err);
      toast({ title: 'Gagal menghantar laporan pemeriksaan', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await base44.entities.RoomInspection.update(id, { status: newStatus });
      await logAudit(user, `INSPECTION_${newStatus.toUpperCase()}`, 'Room Inspections', { id, status: newStatus });
      toast({ title: `Status dikemaskini kepada: ${newStatus}` });
      if (viewing) {
        setViewing(v => ({ ...v, status: newStatus }));
      }
      init();
    } catch (err) {
      console.error('Failed to update inspection status:', err);
      toast({ title: 'Gagal mengemaskini status', variant: 'destructive' });
    }
  }

  // Parse checklist data from string if available
  function parseChecklist(inspection) {
    if (!inspection) return {};
    if (inspection.checklist_data) {
      try {
        return JSON.parse(inspection.checklist_data);
      } catch (e) {}
    }
    return {};
  }

  // Filtered inspections for management
  const filteredInspections = inspections.filter(ins => {
    const matchesSearch = 
      !searchQuery ||
      ins.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.student_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ins.block_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBlock = selectedBlock === 'ALL' || ins.block_name === selectedBlock;
    const matchesStatus = selectedStatus === 'ALL' || ins.status === selectedStatus;

    return matchesSearch && matchesBlock && matchesStatus;
  });

  const totalInspections = inspections.length;
  const needAttentionCount = inspections.filter(i => i.visible_damage !== 'None' || (i.flagged_issues && i.flagged_issues.trim() !== '')).length;
  const verifiedCount = inspections.filter(i => i.status === 'Verified').length;
  const submittedCount = inspections.filter(i => i.status === 'Submitted').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Memuatkan modul pemeriksaan bilik...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pemeriksaan Keadaan Bilik (Room Inspection)"
        description="Pemeriksaan 8 komponen inventori bilik dalam tempoh 48 jam selepas mendaftar masuk kolej"
        actions={
          <Button 
            onClick={() => {
              if (studentProfile) {
                setForm(f => ({
                  ...f,
                  student_id: studentProfile.student_id || '',
                  student_name: studentProfile.full_name || '',
                  room_number: studentProfile.room_number || '',
                  block_name: studentProfile.block_name || '',
                  checklist: { ...INITIAL_CHECKLIST }
                }));
              }
              setShowForm(true);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> 
            {isStudent ? (myInspection ? 'Kemaskini Pemeriksaan Bilik' : 'Borang Pemeriksaan (48 Jam)') : 'Pemeriksaan Baru'}
          </Button>
        }
      />

      {/* Handbook Guidance Banner (Section 4.2) */}
      <div className="bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-2xl p-6 text-white shadow-md border border-[#1E3A60] relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30">
              <Clock className="w-3.5 h-3.5" /> Panduan Seksyen 4.2: 48 Jam Pertama
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">
              Pemeriksaan Keadaan Bilik Kolej Kediaman
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              Bagi mengelakkan sebarang pertikaian atau potongan cagaran/merit di akhir semester, setiap pelajar wajib memeriksa 
              <strong> 8 komponen inventori</strong> dalam tempoh <strong>48 jam</strong> selepas menerima kunci. Muat naik gambar sekiranya terdapat kerosakan sedia ada.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {isStudent && myInspection ? (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-4 py-2.5 rounded-xl text-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pemeriksaan Anda Telah Direkodkan ({myInspection.status})</span>
              </div>
            ) : (
              <Button 
                onClick={() => setShowForm(true)}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-5 gap-2 shadow-sm"
              >
                <CheckCircle className="w-4 h-4" /> Mulakan Pemeriksaan Bilik
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Student View: Current Inspection Card */}
      {isStudent && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                {studentProfile?.block_name ? studentProfile.block_name.charAt(0) : 'B'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Status Pemeriksaan Bilik Anda</h3>
                <p className="text-xs text-slate-500">
                  {studentProfile ? `${studentProfile.block_name || 'Blok'} - Bilik ${studentProfile.room_number || '—'}` : 'Profil Pelajar'}
                </p>
              </div>
            </div>

            {myInspection && (
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${STATUS_COLORS[myInspection.status] || 'bg-slate-100 text-slate-700'}`}>
                Status: {myInspection.status}
              </span>
            )}
          </div>

          {myInspection ? (
            <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Tarikh Diperiksa:</span>
                  <span className="font-semibold text-slate-800">{myInspection.inspection_date || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Status Bilik:</span>
                  <span className="font-semibold text-slate-800">{myInspection.room_cleanliness || 'Pass'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Kerosakan Sedia Ada:</span>
                  <span className={`font-semibold ${myInspection.visible_damage !== 'None' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {myInspection.visible_damage !== 'None' ? 'Ada Dilaporkan' : 'Tiada Kerosakan'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Tindakan:</span>
                  <button 
                    onClick={() => setViewing(myInspection)}
                    className="text-sky-700 hover:text-sky-800 font-bold flex items-center gap-1 underline"
                  >
                    Lihat Butiran Penuh <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {myInspection.flagged_issues && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-rose-800 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Isu Kerosakan Diflagkan:
                  </span>
                  <p className="text-rose-700 leading-relaxed">{myInspection.flagged_issues}</p>
                </div>
              )}

              {myInspection.visible_damage !== 'None' && (
                <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs">
                  <span className="text-amber-900 font-medium">
                    Kerosakan telah diflagkan. Perlukan tindakan pembaikan segera dari Bahagian Fasiliti/JPP?
                  </span>
                  <Link to="/maintenance">
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100 text-xs h-7">
                      Buka Tiket Fasiliti <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Anda Belum Mengisi Laporan Pemeriksaan Bilik</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Sila lengkapkan pemeriksaan 8 item inventori dalam tempoh 48 jam selepas menerima kunci bilik kolej untuk melindungi rekod anda.
                </p>
              </div>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Isi Laporan Sekarang
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Staff / Warden / Admin Section: Metrics & Table */}
      {canVerify && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah Pemeriksaan</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{totalInspections}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Menunggu Semakan</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{submittedCount}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Perlu Pembaikan (Damage)</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{needAttentionCount}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Telah Disahkan</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{verifiedCount}</p>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Cari nama pelajar, no matrik, blok atau no bilik..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                <SelectTrigger className="h-9 text-xs w-[130px]">
                  <SelectValue placeholder="Semua Blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Blok</SelectItem>
                  {['Block A', 'Block B', 'Block C', 'Block D', 'Block E'].map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs w-[140px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Reviewed">Reviewed</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || selectedBlock !== 'ALL' || selectedStatus !== 'ALL') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setSelectedBlock('ALL'); setSelectedStatus('ALL'); }}
                  className="text-xs text-slate-500 h-9 px-2"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Inspections Table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Senarai Rekod Pemeriksaan Bilik Mahasiswa</h3>
              <span className="text-xs text-slate-400 font-medium">{filteredInspections.length} rekod dijumpai</span>
            </div>

            {filteredInspections.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Tiada rekod pemeriksaan dijumpai mengikut tapisan yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50/70 text-slate-500">
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Pelajar</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Lokasi / Bilik</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Tarikh Periksa</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Status Komponen</th>
                      <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider">Status Laporan</th>
                      <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInspections.map(ins => {
                      const hasDamage = ins.visible_damage !== 'None' || (ins.flagged_issues && ins.flagged_issues.trim() !== '');
                      return (
                        <tr key={ins.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">{ins.student_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{ins.student_id || 'ID Pelajar'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700">{ins.block_name ? `${ins.block_name} · ` : ''}</span>
                            <span className="font-bold text-slate-900">Bilik {ins.room_number}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {ins.inspection_date || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {hasDamage ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> Ada Kerosakan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" /> Semua Baik
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLORS[ins.status] || 'bg-slate-100 text-slate-700'}`}>
                              {ins.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setViewing(ins)}
                              className="h-7 text-xs font-semibold text-sky-700 hover:bg-sky-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Semak
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inspection Submission / Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Borang Pemeriksaan Keadaan Bilik (48 Jam)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sila periksa 8 komponen inventori di bawah dengan teliti. Tandakan 'Baik' atau 'Perlu Pembaikan' serta muat naik gambar kerosakan jika ada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-3">
            {/* Student & Room Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nama Pelajar / Penghuni *</Label>
                <Input
                  value={form.student_name}
                  onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))}
                  placeholder="Nama penuh"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">No. Matrik Pelajar</Label>
                <Input
                  value={form.student_id}
                  onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  placeholder="cth: BI22110001"
                  className="h-8 text-xs mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Blok Kediaman</Label>
                <Input
                  value={form.block_name}
                  onChange={e => setForm(f => ({ ...f, block_name: e.target.value }))}
                  placeholder="cth: Block B"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Nombor Bilik *</Label>
                <Input
                  value={form.room_number}
                  onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))}
                  placeholder="cth: B-204"
                  className="h-8 text-xs mt-1 font-bold"
                />
              </div>
            </div>

            {/* Checklist Section Header & Quick Button */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-b pb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Senarai Semak 8 Komponen Inventori</h4>
                <p className="text-[11px] text-slate-500">Periksa suis, soket, tombol, tingkap, tilam, katil, almari, dan meja belajar.</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={setAllBaik}
                className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-semibold"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Tandakan Semua Baik
              </Button>
            </div>

            {/* The 8 Items */}
            <div className="space-y-3">
              {INVENTORY_ITEMS.map((item, idx) => {
                const ItemIcon = item.icon;
                const cur = form.checklist[item.id] || { status: 'Baik', notes: '', photo: '' };
                const isDamaged = cur.status === 'Perlu Pembaikan';

                return (
                  <div 
                    key={item.id} 
                    className={`p-3.5 rounded-xl border transition-all ${isDamaged ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isDamaged ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{idx + 1}. {item.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">({item.eng})</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{item.desc}</p>
                        </div>
                      </div>

                      {/* Status Toggle Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleItemStatus(item.id, 'Baik')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${cur.status === 'Baik' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          Baik
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleItemStatus(item.id, 'Perlu Pembaikan')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${cur.status === 'Perlu Pembaikan' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          Perlu Pembaikan
                        </button>
                      </div>
                    </div>

                    {/* Subform if Damaged */}
                    {isDamaged && (
                      <div className="mt-3 pt-3 border-t border-rose-200/70 space-y-2 animate-in fade-in">
                        <Input
                          placeholder="Huraikan kerosakan sedia ada (cth: tombol longgar, suis berdetik)..."
                          value={cur.notes}
                          onChange={e => setItemNotes(item.id, e.target.value)}
                          className="h-8 text-xs bg-white"
                        />

                        <div className="flex items-center gap-3">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg hover:bg-rose-50 shadow-2xs">
                            <Camera className="w-3.5 h-3.5" />
                            {uploadingItem === item.id ? 'Memuat naik...' : (cur.photo ? 'Tukar Gambar Kerosakan' : 'Muat Naik Gambar Kerosakan')}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handlePhotoUpload(e, item.id)}
                            />
                          </label>

                          {cur.photo && (
                            <div className="flex items-center gap-2">
                              <img src={cur.photo} alt="damage preview" className="w-8 h-8 rounded object-cover border border-rose-200" />
                              <span className="text-[10px] text-emerald-600 font-semibold">✓ Gambar dilampirkan</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Catatan Tambahan / Ulasan Keseluruhan Bilik</Label>
              <textarea
                value={form.overall_notes}
                onChange={e => setForm(f => ({ ...f, overall_notes: e.target.value }))}
                placeholder="Sebarang nota tambahan mengenai keadaan fizikal bilik..."
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowForm(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button 
                type="button" 
                size="sm" 
                onClick={submitInspection}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-white font-bold text-xs gap-1.5"
              >
                {submitting ? 'Menghantar...' : 'Hantar Laporan Pemeriksaan Bilik'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inspection Detail Modal */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base font-bold text-slate-900">
                  Laporan Pemeriksaan Bilik: {viewing.block_name ? `${viewing.block_name} ` : ''}{viewing.room_number}
                </DialogTitle>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLORS[viewing.status] || 'bg-slate-100'}`}>
                  {viewing.status}
                </span>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Pemeriksaan difailkan oleh {viewing.student_name} ({viewing.student_id || 'Tiada No Matrik'}) pada {viewing.inspection_date}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-3 text-xs">
              {/* Summary Box */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block font-medium">Pelajar:</span>
                  <span className="font-bold text-slate-800">{viewing.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">No. Bilik:</span>
                  <span className="font-bold text-slate-800">{viewing.block_name || ''} - {viewing.room_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Tarikh:</span>
                  <span className="font-semibold text-slate-800">{viewing.inspection_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Pegawai / Pemeriksa:</span>
                  <span className="font-semibold text-slate-800">{viewing.inspected_by_name || 'Pelajar'}</span>
                </div>
              </div>

              {/* Damaged or Issues Box */}
              {viewing.flagged_issues && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-1">
                  <p className="font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Kerosakan Diflagkan:
                  </p>
                  <p className="text-rose-700 leading-relaxed font-medium">{viewing.flagged_issues}</p>
                </div>
              )}

              {/* 8 Components Detailed Status if present */}
              {(() => {
                const parsed = parseChecklist(viewing);
                const hasParsed = Object.keys(parsed).length > 0;

                return (
                  <div className="space-y-2">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Keadaan 8 Komponen Inventori:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {INVENTORY_ITEMS.map(it => {
                        const itData = parsed[it.id] || {};
                        const status = itData.status || (viewing.visible_damage === 'None' ? 'Baik' : 'Disemak');
                        const isOk = status === 'Baik';

                        return (
                          <div key={it.id} className="p-2.5 rounded-lg border bg-white flex items-center justify-between">
                            <span className="font-medium text-slate-800">{it.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isOk ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Photos attached */}
              {viewing.photos && (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-700">Gambar Kerosakan Sedia Ada:</p>
                  <img 
                    src={viewing.photos} 
                    alt="Kerosakan bilik" 
                    className="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-slate-900/5 p-1"
                  />
                </div>
              )}

              {/* Management Actions */}
              {canVerify && (
                <div className="pt-3 border-t flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Link to="/maintenance">
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        Buka Laporan Fasiliti <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    {viewing.status !== 'Reviewed' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateStatus(viewing.id, 'Reviewed')}
                        className="text-xs h-8"
                      >
                        Tanda Disemak
                      </Button>
                    )}
                    {viewing.status !== 'Verified' && (
                      <Button 
                        size="sm" 
                        onClick={() => updateStatus(viewing.id, 'Verified')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Sahkan Pemeriksaan
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}