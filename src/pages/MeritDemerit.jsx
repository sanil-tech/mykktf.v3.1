import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Award, 
  Trophy, 
  ShieldAlert, 
  ShieldCheck,
  CheckCircle2, 
  Users, 
  Plus, 
  Search, 
  Sliders, 
  FileSpreadsheet, 
  Sparkles, 
  AlertTriangle,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Medal,
  Activity,
  Flame,
  Globe,
  Flag,
  Landmark,
  School,
  Check,
  Star,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import CollegeTranscriptModal from '@/components/CollegeTranscriptModal';

// SCORING RUBRIC MATRIX FOR COLLEGE ATHLETES & SPORTS PARTICIPATION
export const SPORTS_SCORING_MATRIX = {
  Kolej: {
    label: 'Peringkat Kolej (SUKOL / Antara Blok)',
    badge: '🏢 Kolej',
    description: 'Kejohanan sukan dalaman kolej kediaman atau antara blok/kolej.',
    scores: {
      Penyertaan: 10,
      Gangsa: 15,
      Perak: 20,
      Emas: 25
    }
  },
  Universiti: {
    label: 'Peringkat Universiti (SUKUM / Kejohanan UMS)',
    badge: '🎓 Universiti',
    description: 'Kejohanan sukan rasmi anjuran Pusat Sukan UMS atau antara fakulti/institusi.',
    scores: {
      Penyertaan: 15,
      Gangsa: 25,
      Perak: 30,
      Emas: 35
    }
  },
  Negeri: {
    label: 'Peringkat Negeri (SAGA / Terbuka Negeri)',
    badge: '🏛️ Negeri',
    description: 'Mewakili daerah/bahagian ke Sukan Sabah (SAGA) atau kejohanan terbuka peringkat negeri.',
    scores: {
      Penyertaan: 25,
      Gangsa: 35,
      Perak: 40,
      Emas: 50
    }
  },
  Kebangsaan: {
    label: 'Peringkat Kebangsaan (MASUM / SUKMA / Sirkit Kebangsaan)',
    badge: '🇲🇾 Kebangsaan',
    description: 'Mewakili UMS ke MASUM atau mewakili negeri ke Sukan Malaysia (SUKMA) & kejohanan kebangsaan.',
    scores: {
      Penyertaan: 40,
      Gangsa: 55,
      Perak: 65,
      Emas: 80
    }
  },
  Antarabangsa: {
    label: 'Peringkat Antarabangsa (AUG / Sukan SEA / Kejohanan Serantau)',
    badge: '🌍 Antarabangsa',
    description: 'Mewakili negara ke ASEAN University Games (AUG), Sukan SEA, atau kejohanan antarabangsa rasmi.',
    scores: {
      Penyertaan: 60,
      Gangsa: 80,
      Perak: 90,
      Emas: 100
    }
  }
};

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

  // MERIT: SPORTS & ATHLETES (PENYERTAAN & PENCAPAIAN PINGAT)
  sports_college_participate: { label: 'Sukan Peringkat Kolej (Penyertaan)', defaultPoints: 10, category: 'Sukan' },
  sports_college_bronze: { label: 'Sukan Peringkat Kolej (Pingat Gangsa)', defaultPoints: 15, category: 'Sukan' },
  sports_college_silver: { label: 'Sukan Peringkat Kolej (Pingat Perak)', defaultPoints: 20, category: 'Sukan' },
  sports_college_gold: { label: 'Sukan Peringkat Kolej (Pingat Emas)', defaultPoints: 25, category: 'Sukan' },

  sports_univ_participate: { label: 'Sukan Peringkat Universiti (Penyertaan)', defaultPoints: 15, category: 'Sukan' },
  sports_univ_bronze: { label: 'Sukan Peringkat Universiti (Pingat Gangsa)', defaultPoints: 25, category: 'Sukan' },
  sports_univ_silver: { label: 'Sukan Peringkat Universiti (Pingat Perak)', defaultPoints: 30, category: 'Sukan' },
  sports_univ_gold: { label: 'Sukan Peringkat Universiti (Pingat Emas)', defaultPoints: 35, category: 'Sukan' },

  sports_state_participate: { label: 'Sukan Peringkat Negeri (Penyertaan)', defaultPoints: 25, category: 'Sukan' },
  sports_state_bronze: { label: 'Sukan Peringkat Negeri (Pingat Gangsa)', defaultPoints: 35, category: 'Sukan' },
  sports_state_silver: { label: 'Sukan Peringkat Negeri (Pingat Perak)', defaultPoints: 40, category: 'Sukan' },
  sports_state_gold: { label: 'Sukan Peringkat Negeri (Pingat Emas)', defaultPoints: 50, category: 'Sukan' },

  sports_national_participate: { label: 'Sukan Peringkat Kebangsaan (Penyertaan)', defaultPoints: 40, category: 'Sukan' },
  sports_national_bronze: { label: 'Sukan Peringkat Kebangsaan (Pingat Gangsa)', defaultPoints: 55, category: 'Sukan' },
  sports_national_silver: { label: 'Sukan Peringkat Kebangsaan (Pingat Perak)', defaultPoints: 65, category: 'Sukan' },
  sports_national_gold: { label: 'Sukan Peringkat Kebangsaan (Pingat Emas)', defaultPoints: 80, category: 'Sukan' },

  sports_intl_participate: { label: 'Sukan Peringkat Antarabangsa (Penyertaan)', defaultPoints: 60, category: 'Sukan' },
  sports_intl_bronze: { label: 'Sukan Peringkat Antarabangsa (Pingat Gangsa)', defaultPoints: 80, category: 'Sukan' },
  sports_intl_silver: { label: 'Sukan Peringkat Antarabangsa (Pingat Perak)', defaultPoints: 90, category: 'Sukan' },
  sports_intl_gold: { label: 'Sukan Peringkat Antarabangsa (Pingat Emas)', defaultPoints: 100, category: 'Sukan' },

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
  const [filterTier, setFilterTier] = useState('all');
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterQuotaStatus, setFilterQuotaStatus] = useState('all');
  const [wardenBlocks, setWardenBlocks] = useState([]);
  const [allBlocks, setAllBlocks] = useState([]);

  // Quota & Selection Simulation Engine State
  const [quotaSettings, setQuotaSettings] = useState({
    maleQuota: 250,
    femaleQuota: 350,
    includeJakmasBlockHead: true,
    includeDapurSiswaAthletes: true,
    includeProgramCommittees: true,
    excludeDemerits: true
  });
  const [simulationStatus, setSimulationStatus] = useState('idle'); // 'idle' | 'simulated' | 'finalized'
  const [manualAdjustments, setManualAdjustments] = useState({}); // { [studentId]: 'approved' | 'waiting' | 'rejected' }
  const [showQuotaConfigModal, setShowQuotaConfigModal] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [selectedStudentForTranscript, setSelectedStudentForTranscript] = useState(null);

  // Sports Merit Modal & Filters State
  const [sportsModalOpen, setSportsModalOpen] = useState(false);
  const [sportsForm, setSportsForm] = useState({
    student_id: '',
    sport_name: '',
    tournament_name: '',
    level: 'Kolej', // 'Kolej' | 'Universiti' | 'Negeri' | 'Kebangsaan' | 'Antarabangsa'
    achievement: 'Penyertaan', // 'Penyertaan' | 'Gangsa' | 'Perak' | 'Emas'
    proof_type: 'Sijil Rasmi', // 'Sijil Rasmi' | 'Surat Pelepasan' | 'Papan Skor / Keputusan' | 'Gambar Podium / Pingat'
    proof_url: '',
    custom_points: '',
    notes: ''
  });
  const [sportsFilterLevel, setSportsFilterLevel] = useState('all');
  const [sportsFilterMedal, setSportsFilterMedal] = useState('all');
  const [sportsSearch, setSportsSearch] = useState('');

  // Modals for Committee & Demerit
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

  const isStaff = currentUser && ['super_admin', 'principal', 'college_admin', 'warden', 'staff'].includes(currentUser.role);
  const isPrincipal = currentUser && ['super_admin', 'principal'].includes(currentUser.role);
  const isJakmas = currentUser && (currentUser.role === 'jakmas' || currentUser.jakmasAppointment);
  const isStudent = currentUser && (currentUser.role === 'student' || currentUser.role === 'user');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [u, sList, eList, aList, mList, bList, waList] = await Promise.all([
          base44.auth.me(),
          base44.entities.Student.list(),
          base44.entities.Event.list('-event_date'),
          base44.entities.Attendance.list('-created_date'),
          base44.entities.DisciplineRecord.list('-created_date'),
          base44.entities.Block.list(),
          base44.entities.WardenBlock.list()
        ]);
        setCurrentUser(u);
        setStudents(sList || []);
        setAttendanceRecords(aList || []);
        setAllBlocks(bList || []);

        // Filter warden blocks for the logged-in fellow/warden
        if (u) {
          const myWa = (waList || []).filter(w => w.warden_user_id === u.id || w.warden_email === u.email || (u.full_name && w.warden_name?.toLowerCase().includes(u.full_name.toLowerCase())));
          setWardenBlocks(myWa);
          // If the user is a fellow/warden with assigned blocks, default to their blocks for quick focus
          if (u.role === 'warden' && myWa.length > 0) {
            setFilterBlock('my_blocks');
          }
          // If user is student, default their dashboard to personal logbook (my_record)
          const isStudentRole = u.role === 'student' || u.role === 'user' || (!['super_admin', 'principal', 'college_admin', 'warden', 'staff', 'jakmas'].includes(u.role));
          if (isStudentRole) {
            setActiveTab('my_record');
          }
          // Support URL query params (?claim=sports or ?tab=sports)
          try {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('claim') === 'sports') {
              setSportsModalOpen(true);
            }
            if (urlParams.get('tab')) {
              setActiveTab(urlParams.get('tab'));
            }
          } catch (e) {}
        }

        // Derive distinct event names directly from real attendance records & events
        const distinct = Array.from(new Set([
          ...(eList || []).map(e => e.event_name),
          ...(aList || []).map(a => a.event_name)
        ].filter(Boolean)));
        setEvents(distinct);

        // Map real merit/demerit transactions from database
        const txs = (mList || []).map(m => ({
          id: m.id,
          student_id: m.student_id,
          student_name: m.student_name,
          type: 'Demerit',
          category: 'Disiplin',
          title: m.offence_category || 'Kesalahan Disiplin',
          points: m.demerit_points ? -Math.abs(m.demerit_points) : -15,
          date: m.incident_date || m.created_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          status: m.status || 'Approved',
          officer: m.recorded_by || 'Felo Bertugas'
        }));

        // Load custom / sports / committee transactions from localStorage
        let localTxs = [];
        try {
          const stored = localStorage.getItem('kktf_merit_transactions');
          if (stored) {
            localTxs = JSON.parse(stored);
          }
        } catch (e) {
          console.warn('Failed to parse local merit transactions:', e);
        }

        const combinedTxs = [...txs];
        localTxs.forEach(lt => {
          if (!combinedTxs.some(t => t.id === lt.id)) {
            combinedTxs.unshift(lt);
          }
        });

        setMeritTransactions(combinedTxs);

        // Set default tab strictly according to role:
        // Pengetua, Felo & Admin -> Selection Matrix
        // JAKMAS -> Committee & Program Roster
        // Student -> My Personal Merit Record
        const role = u?.role;
        const isOfficialStaff = ['super_admin', 'principal', 'college_admin', 'warden', 'staff'].includes(role);
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
    // Attendance merit (+10 each) matching by id, student_id (matric) or full_name
    const attendedCount = attendanceRecords.filter(a => 
      (a.status === 'Present' || !a.status) && (
        a.student_id === st.id || 
        (st.student_id && a.student_id === st.student_id) ||
        (st.full_name && a.student_name && a.student_name.toLowerCase() === st.full_name.toLowerCase())
      )
    ).length;
    const attendanceMerit = attendedCount * (rubricSettings.event_attendance?.defaultPoints || 10);

    // Extra merit & demerit transactions
    const studentTxs = meritTransactions.filter(t => 
      (t.student_id === st.id || (st.student_id && t.student_id === st.student_id)) && 
      t.status === 'Approved'
    );
    const extraMerit = studentTxs.filter(t => t.type === 'Merit').reduce((acc, curr) => acc + (curr.points || 0), 0);
    const demerit = studentTxs.filter(t => t.type === 'Demerit').reduce((acc, curr) => acc + Math.abs(curr.points || 0), 0);

    // Specific calculation for Sports merits
    const sportsTxs = studentTxs.filter(t => t.category === 'Sukan' || (t.title && t.title.toLowerCase().includes('sukan')) || t.sport_name);
    const sportsMerit = sportsTxs.reduce((acc, curr) => acc + (curr.points || 0), 0);
    const sportsCount = sportsTxs.length;
    const hasWonSportsMedal = sportsTxs.some(t => ['Emas', 'Perak', 'Gangsa'].includes(t.achievement) || (t.title && (t.title.includes('Emas') || t.title.includes('Perak') || t.title.includes('Gangsa'))));
    const isAthlete = Boolean(st.is_athlete || sportsMerit > 0 || sportsTxs.length > 0 || (st.programme && st.programme.toLowerCase().includes('sukan')));

    // Harmonize with recorded Student.merit_points
    const recordedProfileMerit = st.merit_points || 0;
    const totalPositiveMerit = Math.max(recordedProfileMerit, attendanceMerit + extraMerit);
    const netScore = Math.max(0, totalPositiveMerit - demerit);

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

    // Priority Category Detection (Athletes get Priority Tier 2 in College Selection Matrix!)
    let priorityCategory = 'Residen Umum (Merit)';
    let priorityTier = 4;

    const isJakmasOrLeader = st.is_jakmas || (st.roles && st.roles.includes('jakmas')) || extraMerit >= 35;
    const isVolunteer = st.is_volunteer;
    const isCommittee = extraMerit >= 20;

    if (isJakmasOrLeader) {
      priorityCategory = '👑 JAKMAS / Ketua Blok';
      priorityTier = 1;
    } else if (isAthlete && hasWonSportsMedal) {
      priorityCategory = '🏅 Atlet Kolej (Pemenang Pingat)';
      priorityTier = 2;
    } else if (isAthlete) {
      priorityCategory = '🏃 Atlet Sukan Kolej';
      priorityTier = 2;
    } else if (isVolunteer) {
      priorityCategory = '🍲 Dapur Siswa / Sukarelawan';
      priorityTier = 2;
    } else if (isCommittee) {
      priorityCategory = '👥 Urusetia & AJK Program';
      priorityTier = 3;
    }

    return {
      ...st,
      attendedCount,
      attendanceMerit,
      extraMerit,
      sportsMerit,
      sportsCount,
      isAthlete,
      hasWonSportsMedal,
      demerit,
      netScore,
      tier,
      tierLabel,
      tierBadgeClass,
      qualification,
      priorityCategory,
      priorityTier
    };
  });

  // Calculate Quota Simulation allocation by Gender
  const simulatedStudentScores = useMemo(() => {
    if (simulationStatus === 'idle') {
      return studentScores.map(s => ({
        ...s,
        simulatedDecision: manualAdjustments[s.id] || (s.tier === 'gold' ? 'Layak Dipertimbangkan' : s.tier === 'silver' ? 'Senarai Menunggu' : 'Perlu Rayuan'),
        simulatedDecisionType: manualAdjustments[s.id] || (s.tier === 'gold' ? 'approved' : s.tier === 'silver' ? 'waiting' : 'rejected')
      }));
    }

    // Sort candidates by priority tier first, then by net merit score descending
    const males = studentScores.filter(s => (s.gender || 'Male').toLowerCase() === 'male')
      .sort((a, b) => (a.priorityTier - b.priorityTier) || (b.netScore - a.netScore));

    const females = studentScores.filter(s => (s.gender || 'Male').toLowerCase() === 'female')
      .sort((a, b) => (a.priorityTier - b.priorityTier) || (b.netScore - a.netScore));

    const processGenderList = (list, quota) => {
      let allocatedCount = 0;
      return list.map((cand, idx) => {
        // Check manual override first
        if (manualAdjustments[cand.id]) {
          const manualType = manualAdjustments[cand.id];
          return {
            ...cand,
            simulatedDecision: manualType === 'approved' ? '✓ Layak (Budi Bicara Panel)' : manualType === 'waiting' ? '⏳ Senarai Menunggu (Panel)' : '✕ Ditolak (Panel)',
            simulatedDecisionType: manualType,
            quotaRank: idx + 1
          };
        }

        // Check demerit disqualification rule
        if (quotaSettings.excludeDemerits && cand.demerit > 0) {
          return {
            ...cand,
            simulatedDecision: '✕ Ditolak (Sekatan Dimerit)',
            simulatedDecisionType: 'rejected',
            quotaRank: idx + 1
          };
        }

        // Check if within allotted quota
        if (allocatedCount < quota && (cand.netScore >= 50 || cand.priorityTier <= 2)) {
          allocatedCount++;
          return {
            ...cand,
            simulatedDecision: `✓ Layak (Dalam Kuota #${allocatedCount})`,
            simulatedDecisionType: 'approved',
            quotaRank: allocatedCount
          };
        } else {
          return {
            ...cand,
            simulatedDecision: cand.netScore >= 40 ? `⏳ Senarai Menunggu (WL #${idx - allocatedCount + 1})` : '✕ Luar Kuota (Perlu Rayuan)',
            simulatedDecisionType: cand.netScore >= 40 ? 'waiting' : 'rejected',
            quotaRank: idx + 1
          };
        }
      });
    };

    const simulatedMales = processGenderList(males, quotaSettings.maleQuota);
    const simulatedFemales = processGenderList(females, quotaSettings.femaleQuota);

    return [...simulatedMales, ...simulatedFemales];
  }, [studentScores, simulationStatus, quotaSettings, manualAdjustments]);

  // Filter matrix with Warden Block scoping & Quota Status filter
  const myBlockNames = wardenBlocks.map(wb => wb.block_name);

  const filteredStudents = simulatedStudentScores.filter(s => {
    const matchesSearch = !searchQuery || 
      (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.student_id && s.student_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTier = filterTier === 'all' || s.tier === filterTier;
    
    let matchesBlock = true;
    if (filterBlock === 'my_blocks') {
      matchesBlock = s.block_name && myBlockNames.includes(s.block_name);
    } else if (filterBlock !== 'all') {
      matchesBlock = s.block_name === filterBlock;
    }

    let matchesQuotaStatus = true;
    if (filterQuotaStatus !== 'all') {
      matchesQuotaStatus = s.simulatedDecisionType === filterQuotaStatus;
    }

    return matchesSearch && matchesTier && matchesBlock && matchesQuotaStatus;
  }).sort((a, b) => (a.priorityTier - b.priorityTier) || (b.netScore - a.netScore));

  const handleRunSimulation = () => {
    setSimulationStatus('simulated');
    toast.success('Draf simulasi pemilihan automatik berjaya dijana! Sila semak keputusan dan buat pelarasan panel jika perlu.');
  };

  const handleManualAdjust = (studentId, decisionType) => {
    setManualAdjustments(prev => ({
      ...prev,
      [studentId]: decisionType
    }));
    toast.success('Pelarasan keputusan panel disimpan untuk calon ini.');
  };

  const handleFinalizeSelection = () => {
    setSimulationStatus('finalized');
    toast.success('Keputusan Jawatankuasa Pemilih Residen telah dimuktamadkan secara rasmi!');
  };

  // Student's own score
  const myStudentProfile = studentScores.find(s => s.email === currentUser?.email || s.user_id === currentUser?.id) || studentScores[0];

  // Submit Committee Member
  const handleAddCommittee = async () => {
    if (!committeeForm.student_id || !committeeForm.event_name) {
      toast.error('Sila pilih acara dan pelajar.');
      return;
    }
    const student = students.find(s => s.id === committeeForm.student_id);
    if (!student) return;
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

    if (isStaff) {
      // Persist merit directly to Student record
      try {
        const curMerit = student.merit_points || 0;
        await base44.entities.Student.update(student.id, {
          merit_points: curMerit + points
        });
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, merit_points: curMerit + points } : s));
      } catch (err) {
        console.warn('Failed updating student merit:', err);
      }
    }

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
    if (!student) return;
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

    // Persist discipline record to DB
    try {
      await base44.entities.DisciplineRecord.create({
        student_id: student.id,
        student_name: student.full_name,
        offence_category: rubricItem.label,
        demerit_points: Math.abs(points),
        incident_date: demeritForm.incident_date,
        notes: demeritForm.notes,
        recorded_by: currentUser?.full_name || 'Felo Bertugas',
        status: 'Approved'
      });
      // Deduct from Student merit_points
      const curMerit = student.merit_points || 0;
      const updatedMerit = Math.max(0, curMerit - Math.abs(points));
      await base44.entities.Student.update(student.id, {
        merit_points: updatedMerit
      });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, merit_points: updatedMerit } : s));
    } catch (err) {
      console.warn('Discipline persistence error:', err);
    }

    setMeritTransactions(prev => [newTx, ...prev]);
    try {
      const stored = JSON.parse(localStorage.getItem('kktf_merit_transactions') || '[]');
      localStorage.setItem('kktf_merit_transactions', JSON.stringify([newTx, ...stored]));
    } catch (e) {
      console.warn('Error saving local transaction:', e);
    }
    toast.success(`Dimerit ${points} mata direkodkan bagi ${student.full_name}.`);
    setDemeritModalOpen(false);
  };

  // Submit Sports Participation & Medal Merit
  const handleAddSportsMerit = async () => {
    if (!sportsForm.student_id || !sportsForm.sport_name || !sportsForm.tournament_name) {
      toast.error('Sila pilih atlet, nama sukan, dan nama kejohanan.');
      return;
    }
    const student = students.find(s => s.id === sportsForm.student_id);
    if (!student) return;

    const levelConfig = SPORTS_SCORING_MATRIX[sportsForm.level] || SPORTS_SCORING_MATRIX.Kolej;
    const defaultPts = levelConfig.scores[sportsForm.achievement] || 10;
    const points = Number(sportsForm.custom_points) > 0 ? Number(sportsForm.custom_points) : defaultPts;

    const medalEmoji = sportsForm.achievement === 'Emas' ? '🥇' : sportsForm.achievement === 'Perak' ? '🥈' : sportsForm.achievement === 'Gangsa' ? '🥉' : '🎖️';

    const isDirectStaff = Boolean(isStaff || isJakmas);
    const initialStatus = isDirectStaff ? 'Approved' : 'Pending';

    const newTx = {
      id: Date.now().toString(),
      student_id: student.id,
      student_name: student.full_name,
      type: 'Merit',
      category: 'Sukan',
      sport_name: sportsForm.sport_name,
      tournament_name: sportsForm.tournament_name,
      level: sportsForm.level,
      achievement: sportsForm.achievement,
      proof_type: sportsForm.proof_type || 'Sijil Rasmi',
      proof_url: sportsForm.proof_url || '',
      notes: sportsForm.notes || '',
      title: `${medalEmoji} ${sportsForm.achievement} (${sportsForm.level}): ${sportsForm.sport_name} - ${sportsForm.tournament_name}`,
      points: points,
      date: new Date().toISOString().split('T')[0],
      status: initialStatus,
      officer: isDirectStaff ? (currentUser?.full_name || 'Unit Sukan & Felo Penyelaras') : 'Menunggu Pengesahan Felo'
    };

    setMeritTransactions(prev => [newTx, ...prev]);

    // Persist to localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('kktf_merit_transactions') || '[]');
      localStorage.setItem('kktf_merit_transactions', JSON.stringify([newTx, ...stored]));
    } catch (e) {
      console.warn('Failed saving sports transaction to localStorage:', e);
    }

    if (initialStatus === 'Approved') {
      // Persist to Student entity (merit points and mark as athlete)
      try {
        const curMerit = student.merit_points || 0;
        await base44.entities.Student.update(student.id, {
          merit_points: curMerit + points,
          is_athlete: true
        });
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, merit_points: curMerit + points, is_athlete: true } : s));
      } catch (err) {
        console.warn('Failed updating student merit & athlete status in DB:', err);
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success(`Merit Sukan +${points} mata (${medalEmoji} ${sportsForm.achievement} Peringkat ${sportsForm.level}) berjaya dianugerahkan kepada atlet ${student.full_name}!`);
    } else {
      toast.success(`Tuntutan merit sukan berjaya dihantar! Permohonan anda kini sedang menunggu semakan Biro Sukan JAKMAS & Felo Penyelaras.`);
    }

    setSportsModalOpen(false);
    setSportsForm({
      student_id: '',
      sport_name: '',
      tournament_name: '',
      level: 'Kolej',
      achievement: 'Penyertaan',
      proof_type: 'Sijil Rasmi',
      proof_url: '',
      custom_points: '',
      notes: ''
    });
  };

  // Staff Approval of Pending Sports Merit Claims
  const handleApproveSportsTx = async (tx) => {
    const student = students.find(s => s.id === tx.student_id);
    const updatedTxs = meritTransactions.map(t => t.id === tx.id ? { 
      ...t, 
      status: 'Approved', 
      officer: currentUser?.full_name || 'Felo Penyelaras Sukan' 
    } : t);
    setMeritTransactions(updatedTxs);

    // Save to localStorage
    try {
      localStorage.setItem('kktf_merit_transactions', JSON.stringify(updatedTxs));
    } catch (e) {
      console.warn('Failed saving approved transaction:', e);
    }

    // Credit student in DB
    if (student) {
      try {
        const curMerit = student.merit_points || 0;
        const newMerit = curMerit + (tx.points || 0);
        await base44.entities.Student.update(student.id, {
          merit_points: newMerit,
          is_athlete: true
        });
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, merit_points: newMerit, is_athlete: true } : s));

        // Dispatch in-app notification to student
        if (student.user_id) {
          await base44.entities.Notification.create({
            user_id: student.user_id,
            title: `🏅 Tuntutan Merit Sukan Disahkan! (+${tx.points} Mata)`,
            message: `Tahniah! Tuntutan sumbangan sukan anda bagi "${tx.sport_name || tx.tournament_name}" telah disahkan oleh ${currentUser?.full_name || 'Felo Penyelaras Sukan'}. Mata merit telah dikreditkan ke transkrip anda.`,
            type: 'event',
            link: '/merit?tab=my_record'
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed updating student upon sports approval:', e);
      }
    }

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    toast.success(`Permohonan merit sukan ${tx.student_name} (+${tx.points} mata) telah disahkan dan dikreditkan!`);
  };

  const handleRejectSportsTx = async (tx) => {
    const student = students.find(s => s.id === tx.student_id);
    const updatedTxs = meritTransactions.map(t => t.id === tx.id ? { 
      ...t, 
      status: 'Rejected', 
      officer: currentUser?.full_name || 'Felo Penyelaras Sukan' 
    } : t);
    setMeritTransactions(updatedTxs);
    try {
      localStorage.setItem('kktf_merit_transactions', JSON.stringify(updatedTxs));
    } catch (e) {
      console.warn('Failed saving rejected transaction:', e);
    }

    if (student?.user_id) {
      await base44.entities.Notification.create({
        user_id: student.user_id,
        title: `Status Tuntutan Merit Sukan`,
        message: `Permohonan tuntutan sukan bagi "${tx.sport_name || tx.tournament_name}" tidak diluluskan. Sila rujuk Biro Sukan JAKMAS atau Felo Penyelaras untuk semakan bukti.`,
        type: 'event',
        link: '/merit?tab=my_record'
      }).catch(() => {});
    }

    toast.error(`Permohonan tuntutan sukan bagi ${tx.student_name} telah ditolak.`);
  };

  // Sports Transactions & Filtered List
  const sportsTransactions = meritTransactions.filter(t => t.category === 'Sukan' || (t.title && t.title.toLowerCase().includes('sukan')) || t.sport_name);

  const filteredSportsTransactions = sportsTransactions.filter(t => {
    const matchesSearch = !sportsSearch || 
      (t.student_name && t.student_name.toLowerCase().includes(sportsSearch.toLowerCase())) ||
      (t.sport_name && t.sport_name.toLowerCase().includes(sportsSearch.toLowerCase())) ||
      (t.tournament_name && t.tournament_name.toLowerCase().includes(sportsSearch.toLowerCase())) ||
      (t.title && t.title.toLowerCase().includes(sportsSearch.toLowerCase()));

    const matchesLevel = sportsFilterLevel === 'all' || t.level === sportsFilterLevel;
    const matchesMedal = sportsFilterMedal === 'all' || t.achievement === sportsFilterMedal;

    return matchesSearch && matchesLevel && matchesMedal;
  });

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

            {isJakmas && (
              <Button 
                onClick={() => setCommitteeModalOpen(true)}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4" /> Lantik AJK / Sekretariat
              </Button>
            )}

            {isStudent && (
              <Button 
                onClick={() => {
                  setSportsForm({
                    student_id: myStudentProfile?.id || '',
                    sport_name: '',
                    tournament_name: '',
                    level: 'Kolej',
                    achievement: 'Penyertaan',
                    proof_type: 'Sijil Rasmi',
                    proof_url: '',
                    custom_points: '',
                    notes: ''
                  });
                  setSportsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-md border border-amber-400"
              >
                <Medal className="w-4 h-4" /> Tuntut Merit Sukan (Mahasiswa)
              </Button>
            )}

            {(isStaff || isJakmas) && (
              <Button 
                onClick={() => setSportsModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs"
              >
                <Medal className="w-4 h-4" /> Anugerah Merit Atlet Sukan
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-card border border-lime-300 dark:border-lime-900/50 bg-lime-50/20 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-lime-700 dark:text-lime-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Skor Merit Bersih</span>
              <Award className="w-4 h-4 text-lime-600" />
            </div>
            <p className="text-2xl font-black font-heading text-foreground mt-1">{myStudentProfile?.netScore || 0} Mata</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{myStudentProfile?.qualification}</p>
          </div>

          <div className="bg-card border border-amber-300 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-transparent rounded-2xl p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Merit Sukan & Atlet</span>
                <Medal className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black font-heading text-foreground mt-1">+{myStudentProfile?.sportsMerit || 0} Mata</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{myStudentProfile?.sportsCount || 0} Penglibatan / Pingat</p>
            </div>
            <Button 
              size="sm"
              onClick={() => {
                setSportsForm({
                  student_id: myStudentProfile?.id || '',
                  sport_name: '',
                  tournament_name: '',
                  level: 'Kolej',
                  achievement: 'Penyertaan',
                  proof_type: 'Sijil Rasmi',
                  proof_url: '',
                  custom_points: '',
                  notes: ''
                });
                setSportsModalOpen(true);
              }}
              className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1 rounded-xl h-7 shadow-xs"
            >
              <Medal className="w-3.5 h-3.5" /> Tuntut Merit Sukan
            </Button>
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
        {/* TAB 1: SELECTION COMMITTEE (PENGETUA, FELO & PENTADBIRAN SAHAJA) */}
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

        {/* TAB 2: COMMITTEE ROSTER (JAKMAS SAHAJA) */}
        {!isStaff && isJakmas && (
          <button
            onClick={() => setActiveTab('committee')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'committee' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-500" />
            <span>1. Lantikan AJK & Urusetia Program</span>
          </button>
        )}

        {/* TAB: DEMERIT DISCIPLINARY LOGS (PENGETUA, FELO & PENTADBIR SAHAJA) */}
        {isStaff && (
          <button
            onClick={() => setActiveTab('demerit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'demerit' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>2. Rekod Dimerit Disiplin</span>
          </button>
        )}

        {/* TAB: SPORTS & ATHLETES MERIT (SEMUA PENGGUNA - STAF, JAKMAS, RESIDEN) */}
        <button
          onClick={() => setActiveTab('sports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sports' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Medal className="w-4 h-4 text-amber-500" />
          <span>Pengiktirafan Atlet & Sukan Kolej</span>
          {sportsTransactions.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">
              {sportsTransactions.length}
            </span>
          )}
        </button>

        {/* TAB: RUBRIC SETTINGS */}
        <button
          onClick={() => setActiveTab('rubric')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rubric' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sliders className="w-4 h-4 text-primary" />
          <span>{isStaff ? '3. Skala Pemarkahan Rasmi (Rubric)' : isJakmas ? '2. Skala Pemarkahan Rasmi (Rubric)' : 'Skala Pemarkahan Rasmi (Rubric)'}</span>
        </button>

        {/* TAB: MY PERSONAL MERIT RECORD (UNTUK MAHASISWA / JAKMAS SAHAJA - BUKAN PENGETUA/FELO/STAF) */}
        {!isStaff && (
          <button
            onClick={() => setActiveTab('my_record')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my_record' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="w-4 h-4 text-lime-500" />
            <span>{isJakmas ? '3. Rekod Merit Saya' : 'Rekod Merit & Kelayakan Saya'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: SELECTION COMMITTEE MATRIX (PENGETUA & FELO SAHAJA) */}
      {activeTab === 'matrix' && isStaff && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
          {/* HEADER & BASIC SEARCH */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-heading text-foreground">
                  Papan Penilaian Kelayakan Penempatan Residen Sesi 2026/2027
                </h3>
                {simulationStatus === 'simulated' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400 animate-pulse">
                    ⚠️ Draf Simulasi Sedang Disemak
                  </span>
                )}
                {simulationStatus === 'finalized' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400">
                    🏛️ Keputusan Dimuktamadkan
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sistem simulasi kuota katil berperingkat & semakan budi bicara Jawatankuasa Pemilih Kolej & Pengetua.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowQuotaConfigModal(true)}
                variant="outline"
                className="h-9 text-xs font-bold rounded-xl gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Sliders className="w-3.5 h-3.5" /> Tetapan Kuota Katil & Kriteria
              </Button>

              <Button
                size="sm"
                onClick={handleRunSimulation}
                className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Jalankan Simulasi Automatik
              </Button>

              {simulationStatus !== 'idle' && (
                <Button
                  size="sm"
                  onClick={handleFinalizeSelection}
                  className="h-9 text-xs font-bold rounded-xl gap-1.5 bg-[#132644] hover:bg-[#1a335c] text-white shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Muktamadkan Panel
                </Button>
              )}
            </div>
          </div>

          {/* SIMULATION SUMMARY & REVIEW BANNER */}
          {simulationStatus !== 'idle' && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-primary/10 border border-amber-300 dark:border-amber-900/60 rounded-2xl space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> Status Simulasi:
                  </span>
                  <span className="font-bold text-foreground">
                    {simulationStatus === 'finalized' 
                      ? 'Keputusan Rasmi Telah Dimuktamadkan oleh Jawatankuasa Pemilih.' 
                      : 'Draf Simulasi Kuota Telah Dijana. Sila semak dan buat pelarasan panel mengikut budi bicara sebelum memuktamadkan.'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] font-bold">
                  <span className="px-2.5 py-1 bg-background rounded-lg border border-border">
                    🚹 Kuota Lelaki: {quotaSettings.maleQuota} Katil
                  </span>
                  <span className="px-2.5 py-1 bg-background rounded-lg border border-border">
                    🚺 Kuota Perempuan: {quotaSettings.femaleQuota} Katil
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* FILTER CONTROLS BAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari Nama / No. Matrik..."
                  className="h-9 text-xs pl-8 w-44 sm:w-56 bg-background"
                />
              </div>

              {/* PENAPIS BLOK (TERMASUK BLOK KAWALAN WARDEN/FELO) */}
              <Select value={filterBlock} onValueChange={setFilterBlock}>
                <SelectTrigger className="h-9 text-xs w-44 bg-background font-bold">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-primary shrink-0" />
                  <SelectValue placeholder="Pilih Blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 Semua Blok Kolej</SelectItem>
                  {wardenBlocks.length > 0 && (
                    <SelectItem value="my_blocks" className="font-bold text-indigo-600 dark:text-indigo-400">
                      ⭐ Blok Kawalan Saya ({myBlockNames.join(', ')})
                    </SelectItem>
                  )}
                  {allBlocks.map(b => (
                    <SelectItem key={b.id} value={b.block_name}>{b.block_name} ({b.gender_restriction})</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* PENAPIS STATUS SIMULASI PANEL */}
              {simulationStatus !== 'idle' && (
                <Select value={filterQuotaStatus} onValueChange={setFilterQuotaStatus}>
                  <SelectTrigger className="h-9 text-xs w-44 bg-background font-bold">
                    <SelectValue placeholder="Semua Status Panel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Keputusan Panel</SelectItem>
                    <SelectItem value="approved">🟢 Layak (Dalam Kuota / Budi Bicara)</SelectItem>
                    <SelectItem value="waiting">🟡 Senarai Menunggu</SelectItem>
                    <SelectItem value="rejected">🔴 Ditolak / Sekatan Dimerit</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* PENAPIS TIER KELAYAKAN */}
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="h-9 text-xs w-36 bg-background">
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

            {/* TOTAL MATCHES */}
            <span className="text-[11px] font-bold text-muted-foreground">
              {filteredStudents.length} orang calon ditemui
            </span>
          </div>

          {/* QUICK WARDEN FILTER BANNER IF APPLICABLE */}
          {wardenBlocks.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-indigo-50/30 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Penapis Felo Bertugas:
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {filterBlock === 'my_blocks' 
                    ? `Sedang menapis pelajar di ${myBlockNames.join(' & ')} (${filteredStudents.length} orang)` 
                    : `Menunjukkan semua pelajar kolej (${filteredStudents.length} orang)`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={filterBlock === 'my_blocks' ? 'default' : 'outline'}
                  onClick={() => setFilterBlock('my_blocks')}
                  className={`h-7 text-[11px] font-bold rounded-xl gap-1 ${
                    filterBlock === 'my_blocks' ? 'bg-indigo-700 hover:bg-indigo-800 text-white' : ''
                  }`}
                >
                  ⭐ Blok Saya ({myBlockNames.join(', ')})
                </Button>
                <Button
                  size="sm"
                  variant={filterBlock === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilterBlock('all')}
                  className={`h-7 text-[11px] font-bold rounded-xl ${
                    filterBlock === 'all' ? 'bg-[#132644] text-white' : ''
                  }`}
                >
                  Semua Blok Kolej
                </Button>
              </div>
            </div>
          )}

          {/* TABLE OF CANDIDATES WITH COMMITTEE REVIEW & MANUAL ADJUSTMENTS */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-left">
                  <th className="p-3 font-bold">Kedudukan</th>
                  <th className="p-3 font-bold">Maklumat Residen</th>
                  <th className="p-3 font-bold">Blok / Jantina</th>
                  <th className="p-3 font-bold">Kategori Keutamaan</th>
                  <th className="p-3 font-bold text-center">Aktiviti (+10)</th>
                  <th className="p-3 font-bold text-center">AJK (+20/35)</th>
                  <th className="p-3 font-bold text-center">Dimerit (-)</th>
                  <th className="p-3 font-bold text-center">Skor Bersih</th>
                  <th className="p-3 font-bold">Keputusan Panel Pemilih</th>
                  <th className="p-3 font-bold text-right">Pelarasan Panel</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, idx) => (
                  <tr key={s.id || idx} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono font-bold text-muted-foreground">
                      #{idx + 1}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-between gap-1.5">
                        <div>
                          <p className="font-bold text-foreground truncate max-w-[170px]">{s.full_name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{s.student_id} &bull; {s.programme || 'Sarjana Muda'}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedStudentForTranscript(s);
                            setTranscriptModalOpen(true);
                          }}
                          className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg shrink-0"
                          title="Lihat Transkrip Sahsiah & Merit (PDF)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 font-mono">
                      <p className="text-foreground font-semibold">{s.block_name || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">{s.gender === 'Female' ? '🚺 Perempuan' : '🚹 Lelaki'}</p>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {s.priorityCategory}
                      </span>
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
                      <Badge className={`text-[10px] font-bold border ${
                        s.simulatedDecisionType === 'approved' 
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400' 
                          : s.simulatedDecisionType === 'waiting'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border-rose-400'
                      }`}>
                        {s.simulatedDecision}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Select 
                        value={manualAdjustments[s.id] || (s.simulatedDecisionType || 'approved')} 
                        onValueChange={(val) => handleManualAdjust(s.id, val)}
                      >
                        <SelectTrigger className="h-7 text-[10px] w-28 font-bold bg-background ml-auto">
                          <SelectValue placeholder="Laraskan" />
                        </SelectTrigger>
                        <SelectContent align="end">
                          <SelectItem value="approved" className="text-emerald-600 font-bold">✓ Layak (Budi Bicara)</SelectItem>
                          <SelectItem value="waiting" className="text-amber-600 font-bold">⏳ Senarai Menunggu</SelectItem>
                          <SelectItem value="rejected" className="text-rose-600 font-bold">✕ Tolak Permohonan</SelectItem>
                        </SelectContent>
                      </Select>
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

      {/* TAB: SPORTS & ATHLETES MERIT DASHBOARD */}
      {activeTab === 'sports' && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5">
          {/* BANNER & HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold font-heading text-foreground">
                  Pusat Pengiktirafan & Merit Atlet Sukan Kolej Kediaman Tun Fuad
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Penghargaan rasmi atlet kolej mengikut peringkat kejohanan (Kolej, Universiti, Negeri, Kebangsaan, Antarabangsa) & pencapaian pingat.
              </p>
            </div>

            {isStaff || isJakmas ? (
              <Button 
                size="sm"
                onClick={() => {
                  setSportsForm({
                    student_id: '',
                    sport_name: '',
                    tournament_name: '',
                    level: 'Kolej',
                    achievement: 'Penyertaan',
                    proof_type: 'Sijil Rasmi',
                    proof_url: '',
                    custom_points: '',
                    notes: ''
                  });
                  setSportsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Anugerah Merit Atlet Sukan
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => {
                  setSportsForm({
                    student_id: myStudentProfile?.id || '',
                    sport_name: '',
                    tournament_name: '',
                    level: 'Kolej',
                    achievement: 'Penyertaan',
                    proof_type: 'Sijil Rasmi',
                    proof_url: '',
                    custom_points: '',
                    notes: ''
                  });
                  setSportsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl gap-1.5 shadow-xs"
              >
                <Medal className="w-3.5 h-3.5" /> Hantar Tuntutan Merit Sukan (Pelajar)
              </Button>
            )}
          </div>

          {/* 4 SUMMARY STAT CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-black">
                🥇
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Pingat Emas</p>
                <p className="text-2xl font-black font-heading text-foreground">
                  {sportsTransactions.filter(t => t.achievement === 'Emas' || t.title?.includes('Emas')).length}
                </p>
                <p className="text-[10px] text-muted-foreground">Juara Kejohanan</p>
              </div>
            </div>

            <div className="bg-slate-500/10 border border-slate-400/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xl font-black">
                🥈
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Pingat Perak</p>
                <p className="text-2xl font-black font-heading text-foreground">
                  {sportsTransactions.filter(t => t.achievement === 'Perak' || t.title?.includes('Perak')).length}
                </p>
                <p className="text-[10px] text-muted-foreground">Naib Juara</p>
              </div>
            </div>

            <div className="bg-amber-700/10 border border-amber-600/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700/20 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl font-black">
                🥉
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">Pingat Gangsa</p>
                <p className="text-2xl font-black font-heading text-foreground">
                  {sportsTransactions.filter(t => t.achievement === 'Gangsa' || t.title?.includes('Gangsa')).length}
                </p>
                <p className="text-[10px] text-muted-foreground">Tempat Ketiga</p>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-2xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-black">
                🏃
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Atlet Aktif</p>
                <p className="text-2xl font-black font-heading text-foreground">
                  {new Set(sportsTransactions.map(t => t.student_id)).size}
                </p>
                <p className="text-[10px] text-muted-foreground">Wakil Kolej / Sukan</p>
              </div>
            </div>
          </div>

          {/* POLICY EXPLANATION CALLOUT */}
          <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-400/40 rounded-2xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Dasar Keutamaan Penempatan Atlet Kolej (Priority Tier 2):</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Mahasiswa yang menyumbang bakti sebagai atlet kolej dan memenangi pingat diperuntukkan mata merit mengikut skala rasmi universiti dan dimasukkan terus ke dalam <strong>Kumpulan Keutamaan Tier 2 (Atlit Sukan Kolej)</strong> dalam Matriks Pemilihan Penempatan Residen sesi hadapan.
            </p>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={sportsSearch}
                onChange={(e) => setSportsSearch(e.target.value)}
                placeholder="Cari nama atlet, acara sukan, atau kejohanan..."
                className="pl-9 h-9 text-xs rounded-xl bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={sportsFilterLevel} onValueChange={setSportsFilterLevel}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-40 rounded-xl bg-background">
                  <SelectValue placeholder="Peringkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Peringkat</SelectItem>
                  <SelectItem value="Kolej">🏢 Kolej</SelectItem>
                  <SelectItem value="Universiti">🎓 Universiti</SelectItem>
                  <SelectItem value="Negeri">🏛️ Negeri</SelectItem>
                  <SelectItem value="Kebangsaan">🇲🇾 Kebangsaan</SelectItem>
                  <SelectItem value="Antarabangsa">🌍 Antarabangsa</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sportsFilterMedal} onValueChange={setSportsFilterMedal}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-40 rounded-xl bg-background">
                  <SelectValue placeholder="Pencapaian" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pencapaian</SelectItem>
                  <SelectItem value="Emas">🥇 Emas</SelectItem>
                  <SelectItem value="Perak">🥈 Perak</SelectItem>
                  <SelectItem value="Gangsa">🥉 Gangsa</SelectItem>
                  <SelectItem value="Penyertaan">🎖️ Penyertaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ATHLETE RECORDS LIST */}
          {filteredSportsTransactions.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                <Medal className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-foreground">Tiada rekod merit sukan dijumpai</p>
              <p className="text-[11px] text-muted-foreground">
                {sportsTransactions.length === 0 
                  ? 'Belum ada rekod penyertaan atau pingat sukan didaftarkan untuk sesi ini.' 
                  : 'Tiada rekod sepadan dengan carian atau penapis yang dipilih.'}
              </p>
              {(isStaff || isJakmas) && sportsTransactions.length === 0 && (
                <Button
                  size="sm"
                  onClick={() => setSportsModalOpen(true)}
                  className="mt-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Rekod Sumbangan Atlet Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSportsTransactions.map(tx => {
                const targetStudent = students.find(s => s.id === tx.student_id || (s.student_id && s.student_id === tx.student_id));
                const medalEmoji = tx.achievement === 'Emas' ? '🥇' : tx.achievement === 'Perak' ? '🥈' : tx.achievement === 'Gangsa' ? '🥉' : '🎖️';
                const levelConfig = SPORTS_SCORING_MATRIX[tx.level] || SPORTS_SCORING_MATRIX.Kolej;
                const isPending = tx.status === 'Pending';
                const isApproved = tx.status === 'Approved';

                return (
                  <div key={tx.id} className={`bg-card border ${isPending ? 'border-amber-400/80 bg-amber-50/10' : 'border-amber-200 dark:border-amber-900/60'} rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-xs hover:border-amber-400 transition-all`}>
                    {/* TOP ROW: ACHIEVEMENT BADGE & POINTS */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[10px] font-bold flex items-center gap-1">
                          <span>{medalEmoji}</span>
                          <span>{tx.achievement || 'Penyertaan'}</span>
                        </Badge>
                        <Badge variant="outline" className="text-[9.5px] font-mono">
                          {levelConfig.badge || tx.level}
                        </Badge>
                        {isPending ? (
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 text-[9px] animate-pulse">
                            ⏳ Menunggu Pengesahan Felo
                          </Badge>
                        ) : isApproved ? (
                          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400 text-[9px]">
                            ✓ Disahkan Rasmi
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[9px]">
                            ✕ Ditolak
                          </Badge>
                        )}
                      </div>

                      <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-base shrink-0">
                        +{tx.points} Mata
                      </span>
                    </div>

                    {/* STUDENT BIODATA */}
                    <div>
                      <p className="font-extrabold text-sm text-foreground line-clamp-1">
                        {tx.student_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {targetStudent?.student_id || tx.student_id} {targetStudent?.block_name ? `• ${targetStudent.block_name} (${targetStudent.room_number || ''})` : ''}
                      </p>
                    </div>

                    {/* SPORT & TOURNAMENT DETAILS */}
                    <div className="p-2.5 bg-muted/40 rounded-xl space-y-1 text-xs border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Acara Sukan:</span>
                        <span className="font-bold text-foreground">{tx.sport_name || 'Acara Sukan'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Kejohanan:</span>
                        <span className="font-semibold text-foreground text-right line-clamp-1">{tx.tournament_name || 'Kejohanan Sukan'}</span>
                      </div>
                    </div>

                    {/* PROOF DETAILS (IF AVAILABLE) */}
                    {(tx.proof_type || tx.proof_url || tx.notes) && (
                      <div className="p-2.5 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-xl space-y-1 text-[10.5px] border border-indigo-200/60 dark:border-indigo-900/60">
                        <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-300 font-semibold">
                          <span>Bukti Dokumen:</span>
                          <span className="font-bold">{tx.proof_type || 'Sijil Rasmi'}</span>
                        </div>
                        {tx.proof_url && (
                          <a 
                            href={tx.proof_url.startsWith('http') ? tx.proof_url : `https://${tx.proof_url}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 dark:text-indigo-400 font-bold underline line-clamp-1 block pt-0.5"
                          >
                            🔗 Buka Dokumen / Sijil Bukti
                          </a>
                        )}
                        {tx.notes && (
                          <p className="text-muted-foreground italic text-[10px]">
                            Catatan: {tx.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* APPROVAL ACTIONS FOR STAFF & JAKMAS */}
                    {isPending && (isStaff || isJakmas) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                        <Button
                          size="xs"
                          onClick={() => handleApproveSportsTx(tx)}
                          className="flex-1 h-7 text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs gap-1"
                        >
                          <Check className="w-3 h-3" /> Sahkan & Luluskan
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleRejectSportsTx(tx)}
                          className="h-7 text-[10px] font-semibold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                        >
                          Tolak
                        </Button>
                      </div>
                    )}

                    {/* FOOTER & TRANSCRIPT ACTION */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground">
                      <span className="font-mono">Tarikh: {tx.date}</span>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          const cand = targetStudent || { id: tx.student_id, full_name: tx.student_name };
                          setSelectedStudentForTranscript(cand);
                          setTranscriptModalOpen(true);
                        }}
                        className="h-6 px-2 text-[10px] font-bold text-primary hover:bg-primary/10 gap-1 rounded-lg"
                      >
                        <Printer className="w-3 h-3" /> Transkrip
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

          {/* VISUAL SPORTS SCORING MATRIX TABLE */}
          <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card rounded-2xl border border-amber-300 dark:border-amber-900/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="font-extrabold text-sm text-foreground">
                    Jadual Skala Pemarkahan Rasmi Atlet & Sukan Kolej (Berkadaran Peringkat & Pingat)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Penetapan mata merit rasmi bagi menghargai sumbangan atlet yang mewakili Kolej Kediaman Tun Fuad dan Universiti Malaysia Sabah.
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 font-bold text-xs shrink-0">
                🏆 Keutamaan Tier 2 Kolej
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/70 text-left border-b border-border text-[11px]">
                    <th className="p-2.5 font-bold text-foreground">Peringkat Kejohanan</th>
                    <th className="p-2.5 font-bold text-foreground">Contoh Kejohanan & Skop</th>
                    <th className="p-2.5 font-bold text-center text-slate-700 dark:text-slate-300">Penyertaan</th>
                    <th className="p-2.5 font-bold text-center text-amber-800 dark:text-amber-400">Gangsa 🥉</th>
                    <th className="p-2.5 font-bold text-center text-slate-600 dark:text-slate-300">Perak 🥈</th>
                    <th className="p-2.5 font-bold text-center text-amber-600 dark:text-amber-300">Emas 🥇</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(SPORTS_SCORING_MATRIX).map(([lvlKey, lvlData]) => (
                    <tr key={lvlKey} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-sm">{lvlData.badge.split(' ')[0]}</span>
                        <span>{lvlKey}</span>
                      </td>
                      <td className="p-2.5 text-muted-foreground text-[11px]">{lvlData.description}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-foreground">+{lvlData.scores.Penyertaan}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-amber-700 dark:text-amber-400">+{lvlData.scores.Gangsa}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">+{lvlData.scores.Perak}</td>
                      <td className="p-2.5 text-center font-mono font-black text-amber-600 dark:text-amber-300">+{lvlData.scores.Emas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold font-heading text-foreground">
                Buku Log Merit & Dimerit Saya
              </h3>
              <p className="text-xs text-muted-foreground">
                Sesi Akademik 2025/2026 &bull; Kolej Kediaman Tun Fuad
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSportsForm({
                    student_id: myStudentProfile?.id || '',
                    sport_name: '',
                    tournament_name: '',
                    level: 'Kolej',
                    achievement: 'Penyertaan',
                    proof_type: 'Sijil Rasmi',
                    proof_url: '',
                    custom_points: '',
                    notes: ''
                  });
                  setSportsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1 rounded-xl shadow-xs"
              >
                <Medal className="w-3.5 h-3.5" /> Tuntut Merit Sukan
              </Button>

              <Badge className={`text-xs font-bold border px-3 py-1 ${myStudentProfile?.tierBadgeClass}`}>
                {myStudentProfile?.tierLabel}
              </Badge>
            </div>
          </div>

          {/* BANNER TUNTUTAN MERIT SUKAN MAHASISWA */}
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 font-black">
                🏅
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide flex items-center gap-1.5">
                  Tuntutan Sumbangan Sukan & Atlet Kolej
                  <span className="text-[9px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">Buka Permohonan</span>
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mewakili Kolej, Universiti, Negeri, Kebangsaan atau Antarabangsa? Hantar bukti sijil/penyertaan anda untuk dikreditkan mata merit sukan secara rasmi.
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setSportsForm({
                  student_id: myStudentProfile?.id || '',
                  sport_name: '',
                  tournament_name: '',
                  level: 'Kolej',
                  achievement: 'Penyertaan',
                  proof_type: 'Sijil Rasmi',
                  proof_url: '',
                  custom_points: '',
                  notes: ''
                });
                setSportsModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold gap-1.5 rounded-xl shrink-0 shadow-sm"
            >
              <Medal className="w-4 h-4" /> Tuntut Merit Sukan Sekarang
            </Button>
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

            <div className="p-3 bg-amber-50/40 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Medal className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <div>
                  <span className="font-medium text-foreground">Pencapaian & Penyertaan Sukan Kolej</span>
                  <p className="text-[10px] text-muted-foreground">{myStudentProfile?.sportsCount || 0} Penglibatan Kejohanan</p>
                </div>
                {myStudentProfile?.isAthlete && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40 text-[9px] font-bold">
                    {myStudentProfile?.hasWonSportsMedal ? '🏅 Pemenang Pingat' : '🏃 Atlet Sukan'}
                  </Badge>
                )}
              </div>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+{myStudentProfile?.sportsMerit || 0} Mata</span>
            </div>

            <div className="p-3 bg-rose-50/20 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900 flex items-center justify-between text-rose-700 dark:text-rose-400">
              <span>Potongan Dimerit Disiplin</span>
              <span className="font-mono font-bold">-{myStudentProfile?.demerit || 0} Mata</span>
            </div>
          </div>

          {/* CETAK TRANSKRIP BUTTON */}
          <Button
            size="sm"
            onClick={() => {
              const myTarget = myStudentProfile || students.find(s => s.email === currentUser?.email) || students[0];
              setSelectedStudentForTranscript(myTarget);
              setTranscriptModalOpen(true);
            }}
            className="w-full bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-2xl gap-2 shadow-xs py-5"
          >
            <Printer className="w-4 h-4 text-amber-400" /> 📄 Jana & Cetak Transkrip Sahsiah & Merit Rasmi KKTF (PDF)
          </Button>

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

      {/* MODAL: ANUGERAH MERIT ATLET SUKAN KOLEJ */}
      <Dialog open={sportsModalOpen} onOpenChange={setSportsModalOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-3xl shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-heading text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-500" />
              {isStaff || isJakmas ? 'Anugerah / Rekod Mata Merit Atlet Sukan Kolej' : 'Borang Tuntutan Sumbangan Merit Atlet Sukan (Mahasiswa)'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isStaff || isJakmas 
                ? 'Pengiktirafan rasmi sumbangan atlet mengikut skala merit berkadaran mengikut peringkat sukan dan pencapaian pingat.' 
                : 'Hantar maklumat penglibatan sukan anda berserta dokumen bukti untuk disemak oleh Biro Sukan JAKMAS & diluluskan oleh Felo Penyelaras.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs mt-2">
            {/* PILIH PELAJAR / ATLET */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                {isStaff || isJakmas ? 'Pilih Mahasiswa / Atlet *' : 'Maklumat Mahasiswa Pemohon *'}
              </Label>
              {isStaff || isJakmas ? (
                <Select value={sportsForm.student_id} onValueChange={(v) => setSportsForm(f => ({ ...f, student_id: v }))}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                    <SelectValue placeholder="Pilih Atlet Kolej" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.student_id}) {s.block_name ? `• ${s.block_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  disabled
                  value={`${myStudentProfile?.full_name || 'Pelajar'} (${myStudentProfile?.student_id || ''}) - ${myStudentProfile?.block_name || ''} (${myStudentProfile?.room_number || ''})`}
                  className="h-10 text-xs rounded-xl bg-muted/60 font-semibold"
                />
              )}
            </div>

            {/* NAMA SUKAN DENGAN CADANGAN PANTAS */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Acara Sukan *</Label>
              <Input
                value={sportsForm.sport_name}
                onChange={(e) => setSportsForm(f => ({ ...f, sport_name: e.target.value }))}
                placeholder="Cth: Bola Sepak, Badminton, Olahraga, Renang..."
                className="h-9 text-xs rounded-xl bg-background"
              />
              <div className="flex flex-wrap gap-1 pt-0.5">
                {['Bola Sepak', 'Badminton', 'Futsal', 'Olahraga', 'Sepak Takraw', 'Bola Tampar', 'Bola Jaring', 'Renang', 'Catur', 'Ping Pong', 'Ragbi', 'Silat'].map(sp => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSportsForm(f => ({ ...f, sport_name: sp }))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                      sportsForm.sport_name === sp 
                        ? 'bg-amber-500 text-white border-amber-500' 
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            {/* NAMA KEJOHANAN */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nama Kejohanan / Pertandingan *</Label>
              <Input
                value={sportsForm.tournament_name}
                onChange={(e) => setSportsForm(f => ({ ...f, tournament_name: e.target.value }))}
                placeholder="Cth: SUKOL KKTF 2026 / SUKUM UMS / Sukan Sabah SAGA / MASUM / AUG"
                className="h-9 text-xs rounded-xl bg-background"
              />
            </div>

            {/* GRID PERINGKAT & PENCAPAIAN */}
            <div className="grid grid-cols-2 gap-3">
              {/* PERINGKAT */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Peringkat Kejohanan *</Label>
                <Select value={sportsForm.level} onValueChange={(v) => setSportsForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kolej">🏢 Kolej (SUKOL / Blok)</SelectItem>
                    <SelectItem value="Universiti">🎓 Universiti (SUKUM / UMS)</SelectItem>
                    <SelectItem value="Negeri">🏛️ Negeri (SAGA / Terbuka)</SelectItem>
                    <SelectItem value="Kebangsaan">🇲🇾 Kebangsaan (MASUM / SUKMA)</SelectItem>
                    <SelectItem value="Antarabangsa">🌍 Antarabangsa (AUG / SEA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PENCAPAIAN PINGAT */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Pencapaian / Pingat *</Label>
                <Select value={sportsForm.achievement} onValueChange={(v) => setSportsForm(f => ({ ...f, achievement: v }))}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Penyertaan">🎖️ Penyertaan Sah</SelectItem>
                    <SelectItem value="Gangsa">🥉 Pingat Gangsa (Ke-3)</SelectItem>
                    <SelectItem value="Perak">🥈 Pingat Perak (Naib Juara)</SelectItem>
                    <SelectItem value="Emas">🥇 Pingat Emas (Juara)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* BUKTI PENYERTAAN & KEJAYAAN */}
            <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-indigo-800 dark:text-indigo-300">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Dokumen Bukti Penglibatan & Kejayaan Sukan</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Pilih jenis dokumen bukti sokongan dan sertakan pautan/nombor rujukan untuk disemak oleh Biro Sukan JAKMAS & Felo Penyelaras Sukan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Jenis Dokumen Bukti *</Label>
                  <Select value={sportsForm.proof_type} onValueChange={(v) => setSportsForm(f => ({ ...f, proof_type: v }))}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sijil Rasmi">📜 Sijil Penyertaan / Penghargaan Rasmi</SelectItem>
                      <SelectItem value="Surat Pelepasan">📑 Surat Pelepasan / Pelantikan Pusat Sukan UMS</SelectItem>
                      <SelectItem value="Papan Skor / Keputusan">📊 Papan Skor / Keputusan Rasmi Kejohanan</SelectItem>
                      <SelectItem value="Gambar Podium / Pingat">📸 Gambar Podium / Pingat Bersama Pasukan</SelectItem>
                      <SelectItem value="Pengesahan Jurulatih">📋 Surat Perakuan Jurulatih / Pengurus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-foreground">Pautan Bukti / No. Siri Dokumen</Label>
                  <Input
                    value={sportsForm.proof_url}
                    onChange={(e) => setSportsForm(f => ({ ...f, proof_url: e.target.value }))}
                    placeholder="Pautan Google Drive, Dropbox, No. Siri Sijil..."
                    className="h-9 text-xs rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>

            {/* DYNAMIC MERIT CALCULATION PREVIEW */}
            {(() => {
              const lvlConfig = SPORTS_SCORING_MATRIX[sportsForm.level] || SPORTS_SCORING_MATRIX.Kolej;
              const autoPts = lvlConfig.scores[sportsForm.achievement] || 10;
              const finalPts = Number(sportsForm.custom_points) > 0 ? Number(sportsForm.custom_points) : autoPts;
              return (
                <div className="p-3 bg-amber-500/10 border border-amber-400/40 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Kiraan Merit Berkadaran Automatik:
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Peringkat {sportsForm.level} &bull; Pencapaian: {sportsForm.achievement}
                    </p>
                    <p className="text-[9.5px] text-amber-700 dark:text-amber-400 font-semibold">
                      ✓ Selepas disahkan, atlet automatik tergolong dalam Kumpulan Keutamaan Tier 2 Kolej
                    </p>
                  </div>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400 text-2xl shrink-0">
                    +{finalPts} Mata
                  </span>
                </div>
              );
            })()}

            {/* PELARASAN MATA KHAS (OPTIONAL, ONLY FOR STAFF) */}
            {(isStaff || isJakmas) && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Pelarasan Mata Merit Khas (Pilihan - Kosongkan jika guna skala piawai)
                </Label>
                <Input
                  type="number"
                  value={sportsForm.custom_points}
                  onChange={(e) => setSportsForm(f => ({ ...f, custom_points: e.target.value }))}
                  placeholder="Gunakan mata automatik di atas"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            )}

            {/* CATATAN PENGESAHAN */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                {isStaff || isJakmas ? 'Catatan / Perakuan Unit Sukan & Felo' : 'Catatan Tambahan Mahasiswa'}
              </Label>
              <Textarea
                value={sportsForm.notes}
                onChange={(e) => setSportsForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Cth: Mewakili Kolej Kediaman Tun Fuad dalam Kejohanan Badminton Beregu Lelaki..."
                className="text-xs h-16 rounded-xl bg-background"
              />
            </div>

            {/* PENGESAHAN FELO PENYELARAS SUKAN RASMI */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Pengesahan Felo Penyelaras Sukan & Rekreasi / Warden
              </p>
              <p className="text-[10.5px] text-muted-foreground leading-relaxed">
                Tuntutan ini akan disemak dan disahkan oleh Felo Penyelaras Exco Sukan & Rekreasi atau Warden yang dilantik secara rasmi oleh Pengetua Kolej Kediaman Tun Fuad sebaik sahaja Felo berdaftar dalam sistem ini.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSportsModalOpen(false)} className="rounded-xl">
              Batal
            </Button>
            <Button 
              size="sm" 
              onClick={handleAddSportsMerit} 
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-1.5 shadow-xs"
            >
              <Medal className="w-4 h-4" /> 
              {isStaff || isJakmas ? 'Anugerahkan Merit Atlet' : 'Hantar Tuntutan Untuk Pengesahan Felo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: QUOTA CONFIGURATION & RESTRICTION CRITERIA (PENGETUA & PANEL) */}
      <Dialog open={showQuotaConfigModal} onOpenChange={setShowQuotaConfigModal}>
        <DialogContent className="max-w-lg p-6 bg-card border-border rounded-3xl shadow-xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold font-heading text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Tetapan Kuota Katil & Kriteria Sekatan Penempatan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Konfigurasikan had muatan katil fizikal kolej dan syarat keutamaan bagi sesi penempatan hadapan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* KAPASITI KUOTA KATIL */}
            <div className="p-3 bg-muted/40 rounded-2xl border border-border space-y-3">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" /> Kapasiti Kuota Katil Kolej
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground">🚹 Kuota Siswa (Lelaki)</Label>
                  <Input 
                    type="number"
                    value={quotaSettings.maleQuota}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, maleQuota: Number(e.target.value) || 0 }))}
                    className="h-9 text-xs font-mono font-bold mt-1 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-muted-foreground">🚺 Kuota Siswi (Perempuan)</Label>
                  <Input 
                    type="number"
                    value={quotaSettings.femaleQuota}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, femaleQuota: Number(e.target.value) || 0 }))}
                    className="h-9 text-xs font-mono font-bold mt-1 bg-background"
                  />
                </div>
              </div>
            </div>

            {/* HIERARKI KEUTAMAAN PENEMPATAN */}
            <div className="p-3 bg-indigo-50/25 dark:bg-indigo-950/25 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 space-y-2.5">
              <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Kriteria Keutamaan Bertingkat (Priority Buckets)
              </h4>
              
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={quotaSettings.includeJakmasBlockHead}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, includeJakmasBlockHead: e.target.checked }))}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-foreground">👑 Tier 1: EXCO JAKMAS & Ketua Blok Kediaman</p>
                    <p className="text-[10px] text-muted-foreground">Keutamaan pengurusan operasi dan kebajikan blok kolej.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={quotaSettings.includeDapurSiswaAthletes}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, includeDapurSiswaAthletes: e.target.checked }))}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-foreground">🍲 Tier 2: Sukarelawan Dapur Siswa & Atlit Sukan</p>
                    <p className="text-[10px] text-muted-foreground">Khidmat kebajikan makanan mahasiswa dan wakil sukan UMS/Kolej.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={quotaSettings.includeProgramCommittees}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, includeProgramCommittees: e.target.checked }))}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-foreground">👥 Tier 3: Pengarah, Setiausaha & AJK Program</p>
                    <p className="text-[10px] text-muted-foreground">Penggerak aktiviti pembangunan insaniah kolej.</p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1 border-t border-indigo-200/50 dark:border-indigo-900/50">
                  <input 
                    type="checkbox" 
                    checked={quotaSettings.excludeDemerits}
                    onChange={(e) => setQuotaSettings(q => ({ ...q, excludeDemerits: e.target.checked }))}
                    className="rounded text-rose-600 w-4 h-4"
                  />
                  <div>
                    <p className="font-bold text-rose-600 dark:text-rose-400">🚫 Sekatan Tatatertib: Tolak Pelajar dengan Rekod Dimerit</p>
                    <p className="text-[10px] text-muted-foreground">Menyingkirkan calon yang ada kesalahan jam malam/tatatertib dari kuota automatik.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowQuotaConfigModal(false)} className="rounded-xl">
              Tutup
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                setShowQuotaConfigModal(false);
                handleRunSimulation();
              }}
              className="bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Simpan & Jalankan Simulasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: OFFICIAL COLLEGE MERIT & CHARACTER TRANSCRIPT */}
      <CollegeTranscriptModal 
        open={transcriptModalOpen} 
        onOpenChange={setTranscriptModalOpen} 
        student={selectedStudentForTranscript} 
        attendanceRecords={attendanceRecords} 
        meritTransactions={meritTransactions} 
      />
    </div>
  );
}