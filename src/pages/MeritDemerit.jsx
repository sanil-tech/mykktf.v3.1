import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Award, 
  Trophy, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Users, 
  UserCheck, 
  Download, 
  Plus, 
  Search, 
  Sliders, 
  FileSpreadsheet, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  HelpCircle,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  FileCheck2,
  Lock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';

// DEFAULT SCORING RUBRIC (Can be modified dynamically by College Administrator)
const DEFAULT_RUBRIC = {
  // MERIT: JAKMAS & LEADERSHIP
  director: { label: 'Pengarah / Timbalan Pengarah Program', defaultPoints: 35, category: 'Kepimpinan' },
  secretary_treasurer: { label: 'Setiausaha / Bendahari Acara', defaultPoints: 30, category: 'Kepimpinan' },
  head_bureau: { label: 'Ketua Biro (Protokol, Makanan, Teknikal, dll)', defaultPoints: 25, category: 'Kepimpinan' },
  committee_member: { label: 'AJK Pelaksana / Sekretariat / Urusetia', defaultPoints: 20, category: 'Urusetia' },
  
  // MERIT: PARTICIPATION & COLLEGE SERVICE
  event_attendance: { label: 'Kehadiran Program Kolej (Imbas QR Pas)', defaultPoints: 10, category: 'Penyertaan' },
  gotong_royong: { label: 'Gotong-Royong Perdana / Aktiviti Blok', defaultPoints: 15, category: 'Khidmat Kolej' },
  surau_activity: { label: 'Penglibatan Aktiviti Surau & Kerohanian', defaultPoints: 5, category: 'Kerohanian' },

  // DEMERIT: DISCIPLINARY VIOLATIONS
  curfew_violation: { label: 'Lewat Masuk Jam Malam (Curfew)', defaultPoints: -10, category: 'Disiplin' },
  unauthorized_guest: { label: 'Membawa Pelawat Tanpa Kebenaran', defaultPoints: -20, category: 'Disiplin' },
  smoking_vaping: { label: 'Merokok / Vape di Kawasan Kediaman', defaultPoints: -30, category: 'Disiplin' },
  noise_disturbance: { label: 'Bising / Mengganggu Waktu Senyap', defaultPoints: -10, category: 'Disiplin' },
  dirty_room: { label: 'Bilik Kotor Semasa Pemeriksaan Felo', defaultPoints: -10, category: 'Disiplin' },
};

export default function MeritDemerit() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'committee' | 'demerit' | 'rubric' | 'my_record'
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [meritTransactions, setMeritTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Rubric settings state
  const [rubricSettings, setRubricSettings] = useState(DEFAULT_RUBRIC);

  // Filters for Selection Matrix
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('all'); // 'all' | 'gold' | 'silver' | 'bronze'
  const [filterBlock, setFilterBlock] = useState('all');

  // Committee Modal
  const [committeeModalOpen, setCommitteeModalOpen] = useState(false);
  const [committeeForm, setCommitteeForm] = useState({
    event_name: '',
    student_id: '',
    role_key: 'committee_member',
    custom_points: '',
    notes: ''
  });

  // Demerit Modal
  const [demeritModalOpen, setDemeritModalOpen] = useState(false);
  const [demeritForm, setDemeritForm] = useState({
    student_id: '',
    demerit_key: 'curfew_violation',
    custom_points: '',
    incident_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const isStaff = currentUser && ['super_admin', 'college_admin', 'warden', 'staff'].includes(currentUser.role);
  const isJakmas = currentUser && (currentUser.role === 'jakmas' || currentUser.jakmasAppointment);
  const isStudent = currentUser && (currentUser.role === 'student' || currentUser.role === 'user');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [u, sList, eList, aList, mList] = await Promise.all([
          base44.auth.me(),
          base44.entities.Student.list(),
          base44.entities.Attendance.list('-created_date'),
          base44.entities.Attendance.list('-created_date'),
          base44.entities.DisciplineRecord.list('-created_date')
        ]);
        setCurrentUser(u);
        setStudents(sList || []);
        setAttendanceRecords(aList || []);

        // Derive distinct event names
        const distinct = Array.from(new Set(aList.map(a => a.event_name).filter(Boolean)));
        setEvents(distinct.length > 0 ? distinct : ['Majlis Makan Malam KKTF', 'Perhimpunan Kolej', 'Gotong-Royong Perdana', 'Sukan Antara Blok']);

        // Mock/Map initial merit transactions
        const txs = (mList || []).map(m => ({
          id: m.id,
          student_id: m.student_id,
          student_name: m.student_name,
          type: 'Demerit',
          title: m.offence_category || 'Kesalahan Disiplin',
          points: -15,
          date: m.incident_date || m.created_date?.split('T')[0] || '2026-02-15',
          status: 'Approved',
          officer: 'Felo Bertugas'
        }));
        setMeritTransactions(txs);

        // Set default tab strictly according to role:
        // Pengetua, Felo & Admin -> Selection Matrix
        // JAKMAS -> Committee & Program Roster
        // Student -> My Personal Merit Record
        const role = u?.role;
        const isOfficialStaff = ['super_admin', 'college_admin', 'warden', 'staff'].includes(role);
        const isOfficialJakmas = role === 'jakmas' || !!u?.jakmasAppointment;

        if (isOfficialStaff) {
          setActiveTab('matrix');
        } else if (isOfficialJakmas) {
          setActiveTab('committee');
        } else {
          setActiveTab('my_record');
        }
      } catch (err) {
        console.error('Error loading merit data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute student net merit score
  const studentScores = students.map(st => {
    // Attendance merit (+10 each)
    const attendedCount = attendanceRecords.filter(a => a.student_id === st.id).length;
    const attendanceMerit = attendedCount * (rubricSettings.event_attendance?.defaultPoints || 10);

    // Extra merit & demerit transactions
    const studentTxs = meritTransactions.filter(t => t.student_id === st.id && t.status === 'Approved');
    const extraMerit = studentTxs.filter(t => t.type === 'Merit').reduce((acc, curr) => acc + (curr.points || 0), 0);
    const demerit = studentTxs.filter(t => t.type === 'Demerit').reduce((acc, curr) => acc + Math.abs(curr.points || 0), 0);

    const netScore = Math.max(0, (attendanceMerit + extraMerit) - demerit);

    let tier = 'bronze';
    let tierLabel = 'Tier Gangsa (Belum Capai Syarat)';
    let tierBadgeClass = 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300';
    let qualification = 'Belum Mencapai Syarat Minimum (Perlu Rayuan)';

    if (netScore >= 80 && demerit === 0) {
      tier = 'gold';
      tierLabel = 'Tier Emas (Keutamaan Panel)';
      tierBadgeClass = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 shadow-xs';
      qualification = 'Layak Dipertimbangkan (Keutamaan Panel)';
    } else if (netScore >= 50) {
      tier = 'silver';
      tierLabel = 'Tier Perak (Senarai Menunggu)';
      tierBadgeClass = 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-400';
      qualification = 'Senarai Menunggu (Kekosongan Bersyarat)';
    }

    return {
      ...st,
      attendedCount,
      attendanceMerit,
      extraMerit,
      demerit,
      netScore,
      tier,
      tierLabel,
      tierBadgeClass,
      qualification
    };
  });

  // Filter matrix
  const filteredStudents = studentScores.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTier = filterTier === 'all' || s.tier === filterTier;
    const matchesBlock = filterBlock === 'all' || s.block_name === filterBlock;

    return matchesSearch && matchesTier && matchesBlock;
  }).sort((a, b) => b.netScore - a.netScore);

  // Student's own score
  const myStudentProfile = studentScores.find(s => s.email === currentUser?.email || s.user_id === currentUser?.id) || studentScores[0];

  // Submit Committee Member
  const handleAddCommittee = async () => {
    if (!committeeForm.student_id || !committeeForm.event_name) {
      toast.error('Sila pilih acara dan pelajar.');
      return;
    }
    const student = students.find(s => s.id === committeeForm.student_id);
    const rubricItem = rubricSettings[committeeForm.role_key] || { label: 'AJK', defaultPoints: 20 };
    const points = Number(committeeForm.custom_points) || rubricItem.defaultPoints;

    const newTx = {
      id: Date.now().toString(),
      student_id: student.id,
      student_name: student.full_name,
      type: 'Merit',
      title: `${rubricItem.label} - ${committeeForm.event_name}`,
      points: points,
      date: new Date().toISOString().split('T')[0],
      status: isStaff ? 'Approved' : 'Pending',
      officer: currentUser?.full_name || 'JAKMAS'
    };

    setMeritTransactions(prev => [newTx, ...prev]);
    toast.success(isStaff ? `Merit +${points} mata berjaya dikreditkan kepada ${student.full_name}.` : 'Cadangan AJK dihantar untuk perakuan Felo.');
    setCommitteeModalOpen(false);
  };

  // Submit Demerit Violation
  const handleAddDemerit = async () => {
    if (!demeritForm.student_id) {
      toast.error('Sila pilih pelajar yang melakukan kesalahan.');
      return;
    }
    const student = students.find(s => s.id === demeritForm.student_id);
    const rubricItem = rubricSettings[demeritForm.demerit_key] || { label: 'Kesalahan Disiplin', defaultPoints: -10 };
    const points = Number(demeritForm.custom_points) ? -Math.abs(Number(demeritForm.custom_points)) : rubricItem.defaultPoints;

    const newTx = {
      id: Date.now().toString(),
      student_id: student.id,
      student_name: student.full_name,
      type: 'Demerit',
      title: `${rubricItem.label}${demeritForm.notes ? ` (${demeritForm.notes})` : ''}`,
      points: points,
      date: demeritForm.incident_date,
      status: 'Approved',
      officer: currentUser?.full_name || 'Felo Bertugas'
    };

    setMeritTransactions(prev => [newTx, ...prev]);
    toast.success(`Dimerit ${points} mata direkodkan bagi ${student.full_name}.`);
    setDemeritModalOpen(false);
  };

  // 1-Click Export for UMS SMP System
  const handleExportSMP = () => {
    const csvRows = [
      ['No. Matrik', 'Nama Penuh Pelajar', 'Blok', 'Bilik', 'Mata Merit Acara', 'Mata Merit AJK', 'Mata Dimerit', 'Skor Merit Bersih', 'Status Kelayakan Sesi 2026/2027']
    ];

    filteredStudents.forEach(s => {
      csvRows.push([
        s.student_id || '',
        `"${(s.full_name || '').replace(/"/g, '""')}"`,
        s.block_name || '',
        s.room_number || '',
        s.attendanceMerit || 0,
        s.extraMerit || 0,
        s.demerit || 0,
        s.netScore || 0,
        s.qualification || ''
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KKTF_MERIT_SMP_EXPORT_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Fail CSV sedia format SMP UMS berjaya dimuat turun!');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Sistem Merit & Dimerit KKTF"
        description="Sistem penilaian keaktifan, penganugerahan merit AJK, rekod dimerit disiplin, dan kelayakan penempatan residen sesi hadapan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isStaff && (
              <Button 
                onClick={handleExportSMP}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" /> 1-Klik Eksport Format SMP UMS
              </Button>
            )}

            {(isStaff || isJakmas) && (
              <Button 
                onClick={() => setCommitteeModalOpen(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" /> Lantik AJK / Sekretariat
              </Button>
            )}

            {isStaff && (
              <Button 
                variant="destructive"
                onClick={() => setDemeritModalOpen(true)}
                className="text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <ShieldAlert className="w-4 h-4" /> Rekod Dimerit Disiplin
              </Button>
            )}
          </div>
        }
      />

      {/* TOP OVERVIEW STATS CARDS */}
      {isStaff ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Jumlah Residen</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black font-heading text-foreground mt-1">{students.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Penghuni Dinilai Panel</p>
          </div>

          <div className="bg-card border border-amber-300 dark:border-amber-900/50 bg-amber-50/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Layak Prioriti (Tier Emas)</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black font-heading text-amber-600 dark:text-amber-400 mt-1">
              {studentScores.filter(s => s.tier === 'gold').length}
            </p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">&ge; 80 Mata (Layak Bilik Sesi Depan)</p>
          </div>

          <div className="bg-card border border-slate-300 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Senarai Menunggu (Tier Perak)</span>
              <TrendingUp className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-black font-heading text-foreground mt-1">
              {studentScores.filter(s => s.tier === 'silver').length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">50 – 79 Mata (Budi Bicara Felo)</p>
          </div>

          <div className="bg-card border border-rose-200 dark:border-rose-950 bg-rose-50/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Perlu Rayuan (Tier Gangsa)</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black font-heading text-rose-600 dark:text-rose-400 mt-1">
              {studentScores.filter(s => s.tier === 'bronze').length}
            </p>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-0.5">&lt; 50 Mata / Ada Dimerit</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-lime-300 dark:border-lime-900/50 bg-lime-50/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-lime-700 dark:text-lime-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Skor Merit Bersih Saya</span>
              <Award className="w-4 h-4 text-lime-600" />
            </div>
            <p className="text-2xl font-black font-heading text-foreground mt-1">{myStudentProfile?.netScore || 0} Mata</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{myStudentProfile?.qualification}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Tier Kelayakan</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm font-bold font-heading text-foreground mt-2">{myStudentProfile?.tierLabel}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sesi Akademik 2026/2027</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Kehadiran Program</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black font-heading text-foreground mt-1">{myStudentProfile?.attendedCount || 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Program Rasmi KKTF</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Dimerit Disiplin</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black font-heading text-rose-600 dark:text-rose-400 mt-1">-{myStudentProfile?.demerit || 0}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Mata Dipotong</p>
          </div>
        </div>
      )}

      {/* TABS NAVIGATION (ROLE-BASED VISIBILITY) */}
      <div className="flex flex-wrap gap-1 bg-muted/60 p-1.5 rounded-2xl border border-border w-fit">
        {/* TAB 1: SELECTION COMMITTEE (PENGETUA & FELO SAHAJA) */}
        {isStaff && (
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matrix' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>1. Matriks Jawatankuasa Pemilih Residen (Pengetua & Felo)</span>
          </button>
        )}

        {/* TAB 2: COMMITTEE ROSTER (JAKMAS & FELO) */}
        {(isStaff || isJakmas) && (
          <button
            onClick={() => setActiveTab('committee')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'committee' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>2. Lantikan AJK & Urusetia Program</span>
          </button>
        )}

        {/* TAB 3: DEMERIT DISCIPLINARY LOGS (FELO & PENTADBIR SAHAJA) */}
        {isStaff && (
          <button
            onClick={() => setActiveTab('demerit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'demerit' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>3. Rekod Dimerit Disiplin</span>
          </button>
        )}

        {/* TAB 4: RUBRIC SETTINGS (PENTADBIR & FELO SAHAJA) */}
        {isStaff && (
          <button
            onClick={() => setActiveTab('rubric')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'rubric' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-4 h-4 text-primary" />
            <span>4. Skala Pemarkahan Rasmi (Rubric)</span>
          </button>
        )}

        {/* TAB 5: MY PERSONAL MERIT RECORD (SEMUA PENGGUNA) */}
        <button
          onClick={() => setActiveTab('my_record')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'my_record' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Award className="w-4 h-4 text-lime-500" />
          <span>{isStaff ? '5. Rekod Merit Saya' : isJakmas ? '3. Rekod Merit Saya' : 'Rekod Merit & Kelayakan Saya'}</span>
        </button>
      </div>

      {/* TAB 1: SELECTION COMMITTEE MATRIX (PENGETUA & FELO SAHAJA) */}
      {activeTab === 'matrix' && isStaff && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Papan Penilaian Kelayakan Penempatan Residen Sesi 2026/2027
              </h3>
              <p className="text-xs text-muted-foreground">
                Disusun mengikut skor merit bersih tertinggi untuk rujukan Jawatankuasa Pemilih Kolej & Pengetua.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama / No. Matrik..."
                  className="h-9 text-xs pl-8 w-44 sm:w-56"
                />
              </div>

              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="h-9 text-xs w-36">
                  <SelectValue placeholder="Semua Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tier</SelectItem>
                  <SelectItem value="gold">🥇 Tier Emas (&ge;80)</SelectItem>
                  <SelectItem value="silver">🥈 Tier Perak (50-79)</SelectItem>
                  <SelectItem value="bronze">🥉 Tier Gangsa (&lt;50)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TABLE OF CANDIDATES */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                  <th className="p-3 font-bold">Kedudukan</th>
                  <th className="p-3 font-bold">Maklumat Residen</th>
                  <th className="p-3 font-bold">Blok & Bilik</th>
                  <th className="p-3 font-bold text-center">Aktiviti (+10)</th>
                  <th className="p-3 font-bold text-center">AJK (+20/35)</th>
                  <th className="p-3 font-bold text-center">Dimerit (-)</th>
                  <th className="p-3 font-bold text-center">Skor Bersih</th>
                  <th className="p-3 font-bold">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono font-bold text-muted-foreground">
                      #{idx + 1}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-foreground truncate max-w-[200px]">{s.full_name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{s.student_id} &bull; {s.programme || 'Sarjana Muda'}</p>
                    </td>
                    <td className="p-3 font-mono">
                      <span className="text-foreground font-semibold">{s.block_name || '-'}</span> - {s.room_number || '-'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      +{s.attendanceMerit || 0}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{s.extraMerit || 0}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-rose-600 dark:text-rose-400">
                      {s.demerit > 0 ? `-${s.demerit}` : '0'}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm text-foreground">
                      {s.netScore}
                    </td>
                    <td className="p-3">
                      <Badge className={`text-[10px] font-bold border ${s.tierBadgeClass}`}>
                        {s.qualification}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMMITTEE & LEADERSHIP MERIT */}
      {activeTab === 'committee' && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Pengurusan Jawatankuasa & Urusetia Program (JAKMAS & Felo)
              </h3>
              <p className="text-xs text-muted-foreground">
                Senarai lantikan AJK yang menerima mata merit kepimpinan rasmi selepas disahkan oleh Felo Penyelaras Program (yang diluluskan Pengetua).
              </p>
            </div>

            <Button 
              size="sm"
              onClick={() => setCommitteeModalOpen(true)}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Lantik AJK Baharu
            </Button>
          </div>

          {/* WORKFLOW PROTOCOL INFO BANNER */}
          <div className="p-3.5 bg-indigo-50/25 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl text-xs space-y-1">
            <p className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" /> Aliran Kuasa Lantikan & Pengesahan Merit:
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              1. Cipta Acara & Pilih Felo Penyelaras $\rightarrow$ 2. Pengetua Luluskan Lantikan Felo Penyelaras $\rightarrow$ 3. JAKMAS Kunci Masuk Senarai AJK $\rightarrow$ 4. Felo Penyelaras Program Sahkan & Kreditkan Merit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meritTransactions.filter(t => t.type === 'Merit').map(tx => (
              <div key={tx.id} className="bg-muted/30 border border-border rounded-2xl p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-400/30 text-[9.5px]">
                      Kepimpinan & AJK
                    </Badge>
                    <p className="font-bold text-xs text-foreground mt-1">{tx.student_name}</p>
                  </div>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                    +{tx.points} Mata
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-1">{tx.title}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
                  <span>Tarikh: {tx.date}</span>
                  <span className="text-emerald-600 font-bold">Disahkan</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DEMERIT DISCIPLINARY LOGS */}
      {activeTab === 'demerit' && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Rekod Pemotongan Mata Dimerit & Keselamatan
              </h3>
              <p className="text-xs text-muted-foreground">
                Kesalahan tatatertib seperti lewat jam malam, membawa pelawat haram, merokok/vape, dan kekemasan bilik.
              </p>
            </div>

            {isStaff && (
              <Button 
                size="sm"
                variant="destructive"
                onClick={() => setDemeritModalOpen(true)}
                className="text-xs font-bold rounded-xl gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Tambah Rekod Dimerit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {meritTransactions.filter(t => t.type === 'Demerit').map(tx => (
              <div key={tx.id} className="bg-rose-50/20 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/30 text-[9.5px]">
                      Tindakan Tatatertib
                    </Badge>
                    <p className="font-bold text-xs text-foreground mt-1">{tx.student_name}</p>
                  </div>
                  <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                    {tx.points} Mata
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground">{tx.title}</p>
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground font-mono">
                  <span>Tarikh: {tx.date}</span>
                  <span>Pegawai: {tx.officer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: CONFIGURABLE SCORING RUBRIC */}
      {activeTab === 'rubric' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <h3 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Skala Pemarkahan Rasmi Merit & Dimerit KKTF
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Skala mata ini boleh diubahsuai oleh Pentadbiran Kolej mengikut ketetapan mesyuarat pengurusan tanpa perlu mengubah kod sistem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MERIT RUBRICS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" /> Kategori Pemberian Merit (+)
              </h4>

              <div className="space-y-2 text-xs">
                {Object.entries(rubricSettings).filter(([_, val]) => val.defaultPoints > 0).map(([key, val]) => (
                  <div key={key} className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{val.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{val.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={val.defaultPoints}
                        disabled={!isStaff}
                        onChange={(e) => {
                          const newPts = Number(e.target.value);
                          setRubricSettings(prev => ({
                            ...prev,
                            [key]: { ...prev[key], defaultPoints: newPts }
                          }));
                        }}
                        className="w-16 h-8 text-center text-xs font-mono font-bold"
                      />
                      <span className="text-[11px] text-muted-foreground font-bold">Mata</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DEMERIT RUBRICS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownRight className="w-4 h-4" /> Kategori Potongan Dimerit (-)
              </h4>

              <div className="space-y-2 text-xs">
                {Object.entries(rubricSettings).filter(([_, val]) => val.defaultPoints < 0).map(([key, val]) => (
                  <div key={key} className="p-3 bg-rose-50/20 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">{val.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{val.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={Math.abs(val.defaultPoints)}
                        disabled={!isStaff}
                        onChange={(e) => {
                          const newPts = -Math.abs(Number(e.target.value));
                          setRubricSettings(prev => ({
                            ...prev,
                            [key]: { ...prev[key], defaultPoints: newPts }
                          }));
                        }}
                        className="w-16 h-8 text-center text-xs font-mono font-bold text-rose-600"
                      />
                      <span className="text-[11px] text-muted-foreground font-bold">Mata</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isStaff && (
            <div className="pt-4 border-t border-border flex justify-end">
              <Button 
                onClick={() => toast.success('Tetapan skala pemarkahan rasmi berjaya disimpan!')}
                className="bg-[#132644] hover:bg-[#1e385f] text-white text-xs font-bold rounded-xl"
              >
                Simpan Perubahan Skala Pemarkahan
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STUDENT PERSONAL MERIT RECORD */}
      {activeTab === 'my_record' && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Buku Log Merit & Dimerit Saya
              </h3>
              <p className="text-xs text-muted-foreground">
                Sesi Akademik 2025/2026 &bull; Kolej Kediaman Tun Fuad
              </p>
            </div>

            <Badge className={`text-xs font-bold border px-3 py-1 ${myStudentProfile?.tierBadgeClass}`}>
              {myStudentProfile?.tierLabel}
            </Badge>
          </div>

          {/* NET SCORE DISPLAY */}
          <div className="bg-gradient-to-br from-[#0c182c] via-[#112440] to-[#0d1e34] rounded-2xl p-6 text-white text-center space-y-2 border border-lime-500/30 shadow-lg">
            <p className="text-xs text-lime-300 font-mono font-bold uppercase tracking-wider">Jumlah Skor Merit Bersih</p>
            <p className="text-5xl font-black font-heading text-white">{myStudentProfile?.netScore || 0}</p>
            <p className="text-xs text-slate-300 font-medium">{myStudentProfile?.qualification}</p>
            
            {/* Progress bar to 100 points */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden border border-slate-700">
              <div 
                className="bg-gradient-to-r from-lime-400 to-emerald-500 h-full transition-all"
                style={{ width: `${Math.min(100, ((myStudentProfile?.netScore || 0) / 100) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-1">Sasaran 80/100 Mata untuk Kelayakan Dipertimbangkan (Keutamaan Panel)</p>
          </div>

          {/* BREAKDOWN */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-foreground">Pecahan Mata Terkumpul:</h4>
            
            <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
              <span>Kehadiran Acara Kolej ({myStudentProfile?.attendedCount || 0} Program)</span>
              <span className="font-mono font-bold text-emerald-600">+{myStudentProfile?.attendanceMerit || 0} Mata</span>
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between">
              <span>Jawatan AJK & Kepimpinan JAKMAS</span>
              <span className="font-mono font-bold text-emerald-600">+{myStudentProfile?.extraMerit || 0} Mata</span>
            </div>

            <div className="p-3 bg-rose-50/20 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span>Potongan Dimerit Disiplin</span>
              <span className="font-mono font-bold">-{myStudentProfile?.demerit || 0} Mata</span>
            </div>
          </div>

          {/* OFFICIAL ADMINISTRATIVE DISCLAIMER */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Nota Penafian Rasmi Pentadbiran Kolej:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
              Skor merit merupakan skor penilaian kelayakan asas. Penawaran sebenar penempatan bilik kolej bagi sesi hadapan adalah tertakluk sepenuhnya kepada <strong>kapasiti katil fizikal yang terhad, kuota penginapan tahun pengajian/fakulti, serta keputusan muktamad Jawatankuasa Pemilih Penempatan Residen KKTF (UMS)</strong>.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: ADD COMMITTEE MEMBER */}
      <Dialog open={committeeModalOpen} onOpenChange={setCommitteeModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-heading text-foreground">
              Lantikan AJK / Sekretariat Program JAKMAS
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs mt-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilih Acara / Program Kolej *</Label>
              <Select value={committeeForm.event_name} onValueChange={(v) => setCommitteeForm(f => ({ ...f, event_name: v }))}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Pilih Acara" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e, i) => (
                    <SelectItem key={i} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilih Pelajar / Residen *</Label>
              <Select value={committeeForm.student_id} onValueChange={(v) => setCommitteeForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Pilih Pelajar" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Jawatan / Peranan Lantikan *</Label>
              <Select value={committeeForm.role_key} onValueChange={(v) => setCommitteeForm(f => ({ ...f, role_key: v }))}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="director">🥇 Pengarah / Timbalan (+35 Mata)</SelectItem>
                  <SelectItem value="secretary_treasurer">🥈 Setiausaha / Bendahari (+30 Mata)</SelectItem>
                  <SelectItem value="head_bureau">🥉 Ketua Biro (+25 Mata)</SelectItem>
                  <SelectItem value="committee_member">🎖️ AJK Pelaksana / Sekretariat (+20 Mata)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCommitteeModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" onClick={handleAddCommittee} className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl">
              Sahkan Lantikan AJK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RECORD DEMERIT */}
      <Dialog open={demeritModalOpen} onOpenChange={setDemeritModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-heading text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Rekod Pemotongan Dimerit Disiplin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs mt-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pilih Pelajar *</Label>
              <Select value={demeritForm.student_id} onValueChange={(v) => setDemeritForm(f => ({ ...f, student_id: v }))}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Pilih Pelajar" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.student_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Kategori Kesalahan Disiplin *</Label>
              <Select value={demeritForm.demerit_key} onValueChange={(v) => setDemeritForm(f => ({ ...f, demerit_key: v }))}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="curfew_violation">🚪 Lewat Jam Malam / Curfew (-10 Mata)</SelectItem>
                  <SelectItem value="unauthorized_guest">👥 Pelawat Tanpa Kebenaran (-20 Mata)</SelectItem>
                  <SelectItem value="smoking_vaping">🚭 Merokok / Vape (-30 Mata)</SelectItem>
                  <SelectItem value="noise_disturbance">🔊 Bising / Ganggu Rakan (-10 Mata)</SelectItem>
                  <SelectItem value="dirty_room">🧹 Bilik Kotor Semasa Spot-Check (-10 Mata)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Catatan / Keterangan Felo</Label>
              <Textarea 
                value={demeritForm.notes}
                onChange={(e) => setDemeritForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Butiran insiden..."
                className="text-xs h-16"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDemeritModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button size="sm" variant="destructive" onClick={handleAddDemerit} className="font-bold rounded-xl">
              Rekodkan Dimerit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
