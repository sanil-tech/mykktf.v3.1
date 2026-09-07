import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Vote, 
  CheckCircle2, 
  ShieldCheck, 
  Award, 
  Crown, 
  Users, 
  Plus, 
  Search, 
  Building2, 
  TrendingUp, 
  Printer, 
  Medal, 
  FileCheck, 
  Copy, 
  Check, 
  UserCheck, 
  GraduationCap, 
  ShieldAlert, 
  Clock,
  UserCog,
  Info,
  Calendar,
  Send,
  ClipboardCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { 
  VOTING_PORTFOLIOS, 
  getStoredVotingSession, 
  getStoredCandidates, 
  saveStoredCandidate, 
  deleteStoredCandidate,
  getStoredBallots, 
  hasStudentVoted, 
  getStudentBallotReceipt, 
  submitBallotVote, 
  calculateElectionStats, 
  getStoredPrincipalCertification, 
  certifyElectionByPrincipal, 
  convertTop12ToJakmasAppointments,
  getStoredInterviewScores,
  saveStoredInterviewScore,
  getStoredFinalExcoAssignments,
  saveStoredFinalExcoAssignments
} from '@/lib/voting';
import OfficialVotingResultModal from '@/components/OfficialVotingResultModal';

export default function EVoting() {
  const [activeTab, setActiveTab] = useState('ballot');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [allStudents, setAllStudents] = useState([]);

  // Data Pilihan Raya State
  const [session, setSession] = useState(getStoredVotingSession());
  const [candidates, setCandidates] = useState([]);
  const [ballots, setBallots] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [myReceipt, setMyReceipt] = useState(null);
  const [certification, setCertification] = useState(null);
  const [interviewScores, setInterviewScores] = useState({});
  const [finalExcoAssignments, setFinalExcoAssignments] = useState({});

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPortfolioFilter, setSelectedPortfolioFilter] = useState('all');

  // Undian Form State (Selections by portfolio ID)
  const [selections, setSelections] = useState({});
  const [confirmVoteModalOpen, setConfirmVoteModalOpen] = useState(false);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Detail Modal Calon
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState(null);

  // Interview Scoring Modal State
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [selectedCandForInterview, setSelectedCandForInterview] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    leadership_score: 28, // /30
    vision_score: 23,     // /25
    character_score: 24,  // /25
    academic_score: 18,   // /20
    assigned_portfolio: '',
    panel_name: '',
    notes: ''
  });

  // Watikah Modal & Principal Action States
  const [watikahModalOpen, setWatikahModalOpen] = useState(false);
  const [principalRemarks, setPrincipalRemarks] = useState(
    'Keputusan Pilihan Raya E-Voting dan Penilaian Temuduga Top 12 JAKMAS ini telah disemak, diaudit, dan disahkan mematuhi Perlembagaan Kolej Kediaman Tun Fuad UMS. Barisan 12 Exco yang terpilih diisytiharkan sah untuk menjalankan amanah bagi sesi baharu.'
  );
  const [certifying, setCertifying] = useState(false);
  const [appointingWinners, setAppointingWinners] = useState(false);

  // Admin Manage Candidate Modal
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candForm, setCandForm] = useState({
    portfolio_id: 'ydp',
    candidate_number: '01',
    full_name: '',
    student_id: '',
    faculty: 'Fakulti Komputeran dan Informatik (FKI)',
    programme: '',
    year_of_study: 2,
    cgpa: '3.75',
    merit_points: 120,
    block_name: 'Blok C',
    room_number: '',
    tagline: '',
    manifesto_summary: '',
    manifesto_points_str: '',
    photo_url: '',
    status: 'approved'
  });

  // Check roles
  const isPrincipal = 
    currentUser?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' ||
    currentUser?.role === 'principal' ||
    currentUser?.effectiveRole === 'principal';

  const isStaffOrAdmin = 
    isPrincipal ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'college_admin' ||
    currentUser?.effectiveRole === 'super_admin' ||
    currentUser?.effectiveRole === 'college_admin' ||
    currentUser?.role === 'warden' ||
    currentUser?.role === 'staff';

  // Load Data
  useEffect(() => {
    initData();
  }, []);

  async function initData() {
    setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user);

      // Cari profil pelajar bagi residen yang sedang log masuk
      let stud = null;
      let studsList = [];
      try {
        studsList = await base44.entities.Student.list().catch(() => []);
        setAllStudents(studsList || []);

        if (user?.id) {
          stud = studsList.find(s => s.user_id === user.id || s.id === user.id);
        }
        if (!stud && user?.email) {
          const userEm = user.email.toLowerCase().trim();
          stud = studsList.find(s => (s.email || '').toLowerCase().trim() === userEm);
        }
      } catch (sErr) {
        console.warn('Could not fetch students list:', sErr);
      }
      setStudentProfile(stud);

      // Muatkan data pilihan raya
      const currentSession = getStoredVotingSession();
      setSession(currentSession);

      const cands = getStoredCandidates();
      setCandidates(cands);

      const blts = getStoredBallots();
      setBallots(blts);

      const cert = getStoredPrincipalCertification(currentSession.id);
      setCertification(cert);

      const ivScores = getStoredInterviewScores(currentSession.id);
      setInterviewScores(ivScores);

      const excoAssign = getStoredFinalExcoAssignments(currentSession.id);
      setFinalExcoAssignments(excoAssign);

      // Semak sama ada pelajar telah mengundi
      const voterKey = stud?.student_id || stud?.id || user?.id || user?.email;
      if (voterKey) {
        const voted = hasStudentVoted(voterKey, currentSession.id);
        setHasVoted(voted);
        if (voted) {
          const rcpt = getStudentBallotReceipt(voterKey, currentSession.id);
          setMyReceipt(rcpt);
        }
      }
    } catch (err) {
      console.error('Error initializing E-Voting:', err);
    } finally {
      setLoading(false);
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateElectionStats(candidates, ballots, allStudents);
  }, [candidates, ballots, allStudents]);

  // Handle selecting candidate
  const handleSelectCandidate = (portfolioId, candidateId) => {
    if (hasVoted) {
      toast.info('Anda telah pun membuang undi rasmi bagi sesi ini.');
      return;
    }
    setSelections(prev => ({
      ...prev,
      [portfolioId]: candidateId
    }));
  };

  // Submit Ballot
  const handleConfirmVote = async () => {
    const totalRequiredPortfolios = VOTING_PORTFOLIOS.length;
    const chosenCount = Object.keys(selections).length;

    if (chosenCount < totalRequiredPortfolios) {
      toast.warning(`Sila lengkapkan pilihan bagi kesemua ${totalRequiredPortfolios} portfolio sebelum menghantar kertas undi.`);
      setConfirmVoteModalOpen(false);
      return;
    }

    setSubmittingVote(true);
    try {
      const receipt = await submitBallotVote({
        student: studentProfile,
        user: currentUser,
        selections: selections,
        sessionId: session.id
      });

      setHasVoted(true);
      setMyReceipt(receipt);
      setConfirmVoteModalOpen(false);
      
      setBallots(getStoredBallots());

      // Trigger Confetti Celebration
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success('Undian Rasmi Berjaya Disimpan!', {
        description: `Kod Resit Transaksi Digital: ${receipt.receipt_code}`
      });
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Gagal menghantar undian. Sila cuba lagi.');
    } finally {
      setSubmittingVote(false);
    }
  };

  // Principal Certification Action
  const handleCertifyElection = async () => {
    if (!isPrincipal && currentUser?.role !== 'super_admin') {
      toast.error('Hanya Pengetua Kolej Kediaman Tun Fuad atau Pentadbir Utama dibenarkan memuktamadkan keputusan.');
      return;
    }

    setCertifying(true);
    try {
      const certResult = certifyElectionByPrincipal({
        sessionId: session.id,
        remarks: principalRemarks,
        pengetuaUser: currentUser,
        stats: stats
      });

      setCertification(certResult);
      setSession(getStoredVotingSession());

      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 }
      });

      toast.success('Keputusan Pilihan Raya & Senarai Top 12 Telah Sah Dimuktamadkan Pengetua!', {
        description: `No. Rujukan Watikah: ${certResult.certificate_ref}`
      });
      setWatikahModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuktamadkan keputusan: ' + err.message);
    } finally {
      setCertifying(false);
    }
  };

  // Convert Winners to JakmasAppointments Action
  const handleAppointTop12ToJakmas = async () => {
    setAppointingWinners(true);
    try {
      const appointed = await convertTop12ToJakmasAppointments({
        top12Shortlist: stats.top12Shortlist,
        actorUser: currentUser,
        session: session
      });

      toast.success(`Berjaya melantik ${appointed.length} Calon Terpilih ke dalam rekod rasmi JAKMAS!`, {
        description: 'Rekod watikah pelantikan telah didaftarkan dalam Pengurusan JAKMAS Kolej.'
      });
    } catch (err) {
      console.error(err);
      toast.error('Gagal melantik calon: ' + err.message);
    } finally {
      setAppointingWinners(false);
    }
  };

  // Open Interview Score Modal for a Candidate
  const handleOpenInterviewModal = (shortlistItem) => {
    const cand = shortlistItem.candidate;
    const existingScore = interviewScores[cand.id] || {};
    const existingAssign = finalExcoAssignments[cand.id] || {};

    setSelectedCandForInterview(shortlistItem);
    setInterviewForm({
      leadership_score: existingScore.leadership_score || 27,
      vision_score: existingScore.vision_score || 22,
      character_score: existingScore.character_score || 23,
      academic_score: existingScore.academic_score || 18,
      assigned_portfolio: existingAssign.label || existingAssign.portfolio || (
        shortlistItem.rank === 1 ? 'Yang Dipertua (YDP)' :
        shortlistItem.rank === 2 ? 'Naib Yang Dipertua (NYDP)' :
        shortlistItem.rank === 3 ? 'Setiausaha Kehormat (SU)' :
        shortlistItem.rank === 4 ? 'Bendahari Kehormat' :
        `Exco ${cand.portfolio_id?.replace('exco_', '').toUpperCase() || 'Portfolio KKTF'}`
      ),
      panel_name: existingScore.panel_name || currentUser?.full_name || 'Panel Penemuduga Pengetua',
      notes: existingScore.notes || 'Menunjukkan keyakinan tinggi, pemahaman mendalam tentang tadbir urus kolej, dan manifesto yang realistik.'
    });
    setInterviewModalOpen(true);
  };

  // Save Interview Score & Exco Assignment
  const handleSaveInterview = (e) => {
    e.preventDefault();
    if (!selectedCandForInterview) return;

    const cand = selectedCandForInterview.candidate;
    const totalScore = 
      Number(interviewForm.leadership_score || 0) +
      Number(interviewForm.vision_score || 0) +
      Number(interviewForm.character_score || 0) +
      Number(interviewForm.academic_score || 0);

    const scoreData = {
      ...interviewForm,
      total_score: totalScore
    };

    const updatedScores = saveStoredInterviewScore(cand.id, scoreData, currentUser, session.id);
    setInterviewScores(updatedScores);

    // Update Exco Assignment
    const currentAssign = getStoredFinalExcoAssignments(session.id);
    const updatedAssign = {
      ...currentAssign,
      [cand.id]: {
        portfolio: interviewForm.assigned_portfolio,
        label: interviewForm.assigned_portfolio,
        position: shortlistItemPosition(selectedCandForInterview.rank, interviewForm.assigned_portfolio)
      }
    };
    saveStoredFinalExcoAssignments(updatedAssign, currentUser, session.id);
    setFinalExcoAssignments(updatedAssign);

    toast.success(`Skor Temuduga & Penetapan Exco bagi ${cand.full_name} berjaya disimpan! (${totalScore}/100)`);
    setInterviewModalOpen(false);
  };

  function shortlistItemPosition(rank, label) {
    if (label.includes('Yang Dipertua') && !label.includes('Naib')) return 'JAKMAS Chairperson';
    if (label.includes('Naib Yang Dipertua')) return 'JAKMAS Vice Chairperson';
    if (label.includes('Setiausaha')) return 'JAKMAS Secretary';
    if (label.includes('Bendahari')) return 'JAKMAS Treasurer';
    return 'JAKMAS Exco Member';
  }

  // Dispatch WhatsApp Interview Call to Candidate
  const handleDispatchInterviewWhatsApp = (cand, rank) => {
    const text = `📢 *[SURAT PANGGILAN TEMUDUGA KHAS JAKMAS KKTF SESI 2026/2027]*
Kepada: *${cand.full_name}* (No. Matrik: ${cand.student_id})

Tahniah! Berdasarkan keputusan pengundian E-Voting Residen KKTF, anda telah *DISENARAI PENDEK (TOP 12 CALON JAKMAS - RANK #${rank})* bagi sesi temuduga pemilihan dan penetapan barisan Exco.

📅 *Tarikh Temuduga:* ${session.interview_date ? new Date(session.interview_date).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' }) : '05 Oktober 2026'}
⏰ *Masa:* 09:00 Pagi
🏢 *Lokasi:* ${session.interview_venue || 'Bilik Mesyuarat Eksekutif Pengetua, KKTF UMS'}
👔 *Etika Pakaian:* Pakaian Formal Siswa / Smart Formal

Sila bawa bersama salinan ringkas manifesto dan resume kepimpinan. Kehadiran adalah *WAJIB*.

— *Pejabat Pengetua Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    toast.success('Panggilan temuduga WhatsApp dibuka!');
  };

  // Save Candidate
  const handleSaveCandidate = (e) => {
    e.preventDefault();
    if (!candForm.full_name || !candForm.student_id) {
      toast.error('Sila isi nama penuh dan nombor matrik calon.');
      return;
    }

    const points = (candForm.manifesto_points_str || '')
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);

    const candData = {
      ...candForm,
      id: editingCandidate?.id || `cand-${candForm.portfolio_id}-${Date.now()}`,
      manifesto_points: points.length > 0 ? points : [candForm.manifesto_summary || 'Menjaga kebajikan dan kemakmuran residen KKTF.']
    };

    const updated = saveStoredCandidate(candData, currentUser);
    setCandidates(updated);
    setCandidateModalOpen(false);
    setEditingCandidate(null);
    toast.success('Profil calon berjaya disimpan!');
  };

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchPortfolio = selectedPortfolioFilter === 'all' || c.portfolio_id === selectedPortfolioFilter;
      const matchQuery = 
        !searchQuery || 
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.tagline && c.tagline.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.manifesto_summary && c.manifesto_summary.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchPortfolio && matchQuery;
    });
  }, [candidates, selectedPortfolioFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Memuatkan Sistem E-Voting KKTF...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-primary via-primary/95 to-slate-900 text-primary-foreground p-6 rounded-2xl shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-accent/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <Badge className="bg-accent text-accent-foreground font-semibold px-2.5 py-0.5 shadow-2xs">
              Sesi {session.academic_session}
            </Badge>
            {session.status === 'certified' ? (
              <Badge className="bg-emerald-500 text-white font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dimuktamadkan Pengetua
              </Badge>
            ) : (
              <Badge className="bg-blue-500 text-white font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Undian Dibuka & Shortlist Top 12
              </Badge>
            )}
          </div>
          <h1 className="font-heading font-extrabold text-xl md:text-2xl tracking-tight text-white flex items-center gap-2.5">
            <Vote className="w-7 h-7 text-accent" />
            E-Voting & Temuduga Top 12 JAKMAS KKTF
          </h1>
          <p className="text-xs md:text-sm text-primary-foreground/80 max-w-2xl">
            Sistem pengundian demokratik residen aktif bagi memilih calon-calon berwibawa, disusuli senarai pendek <strong>Top 12 Calon</strong> untuk temuduga khas bersama Pengetua bagi penetapan Majlis Tertinggi & Barisan Exco.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 z-10">
          {certification && (
            <Button
              onClick={() => setWatikahModalOpen(true)}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              Watikah Rasmi Pengetua
            </Button>
          )}

          {isStaffOrAdmin && (
            <Button
              onClick={() => {
                setEditingCandidate(null);
                setCandForm({
                  portfolio_id: 'ydp',
                  candidate_number: '03',
                  full_name: '',
                  student_id: '',
                  faculty: 'Fakulti Komputeran dan Informatik (FKI)',
                  programme: '',
                  year_of_study: 2,
                  cgpa: '3.75',
                  merit_points: 120,
                  block_name: 'Blok C',
                  room_number: '',
                  tagline: '',
                  manifesto_summary: '',
                  manifesto_points_str: '',
                  photo_url: '',
                  status: 'approved'
                });
                setCandidateModalOpen(true);
              }}
              size="sm"
              variant="outline"
              className="border-white/20 bg-white/10 hover:bg-white/20 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              Daftar Calon
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="border-b border-slate-200">
          <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-2 md:gap-4 border-none">
            <TabsTrigger 
              value="ballot" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all"
            >
              <Vote className="w-4 h-4" />
              1. Kertas Undian Residen
              {hasVoted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1" />}
            </TabsTrigger>

            <TabsTrigger 
              value="candidates" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all"
            >
              <Users className="w-4 h-4" />
              2. Galeri Calon ({candidates.length})
            </TabsTrigger>

            <TabsTrigger 
              value="shortlist" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all bg-amber-500/10 text-amber-900 border-amber-300"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              3. Senarai Pendek Top 12 & Temuduga Exco
              <Badge className="bg-amber-500 text-slate-950 text-[10px] ml-1 font-bold">12 Calon</Badge>
            </TabsTrigger>

            <TabsTrigger 
              value="monitoring" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              4. Pusat Pemantauan Turnout
            </TabsTrigger>

            <TabsTrigger 
              value="principal" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              5. Pengesahan Watikah Pengetua
              {certification && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-1" />}
            </TabsTrigger>

            {isStaffOrAdmin && (
              <TabsTrigger 
                value="management" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2.5 text-xs md:text-sm font-semibold flex items-center gap-2 border border-slate-200 data-[state=active]:border-primary transition-all"
              >
                <UserCog className="w-4 h-4" />
                6. Kawalan Sesi
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: KERTAS UNDIAN RESIDEN (BALLOT BOX) */}
        {/* ========================================================================= */}
        <TabsContent value="ballot" className="space-y-6 m-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-sm text-slate-900">
                        {studentProfile?.full_name || currentUser?.full_name || 'Residen Kolej Kediaman Tun Fuad'}
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold border-emerald-200">
                        Residen Aktif Sah
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      No. Matrik: {studentProfile?.student_id || currentUser?.email?.split('@')[0] || '-'} • Blok: {studentProfile?.block_name || 'Blok C'} • Bilik: {studentProfile?.room_number || 'C-2-04'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {hasVoted ? (
                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Undi Telah Direkodkan
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold">
                      <Vote className="w-4 h-4" />
                      Status: Belum Mengundi
                    </div>
                  )}
                </div>
              </div>

              {/* Has Voted Receipt Showcase */}
              {hasVoted && myReceipt && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      Resit Rasmi Transaksi E-Voting Pelajar
                    </div>
                    <Badge className="font-mono bg-emerald-600 text-white text-xs">
                      {myReceipt.receipt_code}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-emerald-900">
                    <div>
                      <span className="text-emerald-700 block text-[11px]">Nama Pengundi:</span>
                      <span className="font-bold">{myReceipt.voter_name}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[11px]">Masa Undian Direkod:</span>
                      <span className="font-medium">{new Date(myReceipt.voted_at).toLocaleString('ms-MY')}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[11px]">Blok & Lokasi:</span>
                      <span className="font-medium">{myReceipt.block_name} (Bilik {myReceipt.room_number})</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 block text-[11px]">Cap Digital (Digest SHA):</span>
                      <span className="font-mono text-[10px] text-slate-600 bg-white/80 px-2 py-0.5 rounded border border-emerald-200 block truncate">
                        {myReceipt.hash_signature}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-emerald-800">
                    <p className="italic text-[11px]">
                      *Undian anda adalah rahsia dan menyumbang kepada penentuan Senarai Pendek Top 12 Temuduga JAKMAS.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`[RESIT RASMI E-VOTING KKTF]\nKod: ${myReceipt.receipt_code}\nPengundi: ${myReceipt.voter_name}\nMasa: ${myReceipt.voted_at}\nCap: ${myReceipt.hash_signature}`);
                        setCopiedReceipt(true);
                        setTimeout(() => setCopiedReceipt(false), 2000);
                        toast.success('Resit disalin ke papan klip!');
                      }}
                      className="bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300 text-xs flex items-center gap-1.5"
                    >
                      {copiedReceipt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Salin Resit
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Voting Rules & Summary Card */}
            <div className="p-5 rounded-xl bg-slate-900 text-slate-100 shadow-xs space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4" />
                  Aliran Pemilihan & Shortlist Top 12
                </div>
                <h3 className="font-heading font-bold text-sm text-white">
                  Peringkat Pemilihan JAKMAS
                </h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                  <li><strong>Fasa 1 (E-Voting):</strong> Residen mengundi calon pilihan bagi setiap portfolio.</li>
                  <li><strong>Fasa 2 (Top 12 Shortlist):</strong> 12 calon undian & merit tertinggi disenarai pendek.</li>
                  <li><strong>Fasa 3 (Temuduga Pengetua):</strong> Temuduga khas bagi penetapan jawatan Exco.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Pilihan Lengkap:</span>
                <span className="font-bold text-accent font-mono">
                  {Object.keys(selections).length} / {VOTING_PORTFOLIOS.length} Jawatan
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Ballot Section by Portfolio */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-base md:text-lg text-slate-900 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-primary" />
                  Kertas Undian Mengikut Portfolio / Jawatan
                </h2>
                <p className="text-xs text-slate-500">
                  Sila pilih satu calon yang paling berwibawa bagi setiap jawatan di bawah.
                </p>
              </div>

              {!hasVoted && (
                <Button
                  onClick={() => setConfirmVoteModalOpen(true)}
                  disabled={Object.keys(selections).length < VOTING_PORTFOLIOS.length}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xs flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Hantar Kertas Undi ({Object.keys(selections).length}/{VOTING_PORTFOLIOS.length})
                </Button>
              )}
            </div>

            {VOTING_PORTFOLIOS.map((portfolio, pIdx) => {
              const candsInPortfolio = candidates.filter(c => c.portfolio_id === portfolio.id);
              const selectedCandId = selections[portfolio.id];

              return (
                <div 
                  key={portfolio.id} 
                  className="p-5 md:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                        {pIdx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-bold text-sm md:text-base text-slate-900">
                            {portfolio.name}
                          </h3>
                          <Badge variant="outline" className="text-[10px] text-slate-600">
                            {portfolio.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {portfolio.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedCandId ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Calon Telah Dipilih
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                          Pilihan Diperlukan
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Candidates Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {candsInPortfolio.map((cand) => {
                      const isSelected = selectedCandId === cand.id;

                      return (
                        <div
                          key={cand.id}
                          onClick={() => !hasVoted && handleSelectCandidate(portfolio.id, cand.id)}
                          className={`
                            p-4 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3
                            ${isSelected 
                              ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20' 
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'}
                            ${hasVoted ? 'cursor-default opacity-85' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3.5">
                            <img
                              src={cand.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                              alt={cand.full_name}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                            />

                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.2">
                                  CALON #{cand.candidate_number}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCandidateDetail(cand);
                                  }}
                                  className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 flex items-center gap-1"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                  Manifesto
                                </Button>
                              </div>

                              <h4 className="font-heading font-bold text-sm text-slate-900 truncate">
                                {cand.full_name}
                              </h4>

                              <p className="text-[11px] text-slate-500 font-mono">
                                {cand.student_id} • {cand.faculty?.split('(')[1]?.replace(')', '') || cand.faculty}
                              </p>

                              <p className="text-xs italic text-slate-700 line-clamp-2 pt-0.5">
                                {cand.tagline}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">
                              Blok: <strong>{cand.block_name}</strong> • CGPA: <strong>{cand.cgpa}</strong>
                            </span>

                            {!hasVoted && (
                              <div className={`
                                px-3 py-1 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-all
                                ${isSelected 
                                  ? 'bg-primary text-primary-foreground shadow-2xs' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                              `}>
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Dipilih
                                  </>
                                ) : (
                                  'Pilih Calon Ini'
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom Submit Action Bar */}
            {!hasVoted && (
              <div className="sticky bottom-4 z-20 p-4 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
                    <Vote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      Semakan Kertas Undi ({Object.keys(selections).length} daripada {VOTING_PORTFOLIOS.length} Jawatan Selesai)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Pastikan anda telah memilih calon yang tepat sebelum membuang undian rasmi.
                    </p>
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={() => setConfirmVoteModalOpen(true)}
                  disabled={Object.keys(selections).length < VOTING_PORTFOLIOS.length}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-md w-full sm:w-auto flex items-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Sahkan & Buang Undian Rasmi
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: GALERI & MANIFESTO CALON */}
        {/* ========================================================================= */}
        <TabsContent value="candidates" className="space-y-6 m-0">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama calon, no. matrik, atau manifesto..."
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={selectedPortfolioFilter} onValueChange={setSelectedPortfolioFilter}>
                <SelectTrigger className="w-full md:w-64 text-xs">
                  <SelectValue placeholder="Semua Portfolio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Portfolio / Jawatan</SelectItem>
                  {VOTING_PORTFOLIOS.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCandidates.map(cand => {
              const portInfo = VOTING_PORTFOLIOS.find(p => p.id === cand.portfolio_id);

              return (
                <div 
                  key={cand.id}
                  className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={cand.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                      alt={cand.full_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-primary text-white font-mono text-[10px] shadow-xs">
                        {portInfo?.name || cand.portfolio_id}
                      </Badge>
                    </div>

                    <div className="absolute top-3 right-3">
                      <Badge className="bg-accent text-accent-foreground font-mono font-bold text-xs shadow-xs">
                        #{cand.candidate_number}
                      </Badge>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                      <h3 className="font-heading font-bold text-base truncate">
                        {cand.full_name}
                      </h3>
                      <p className="text-[11px] text-slate-200 font-mono">
                        {cand.student_id} • {cand.block_name}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <GraduationCap className="w-3.5 h-3.5 text-primary" />
                        <span>{cand.faculty}</span>
                      </div>

                      <blockquote className="p-2.5 rounded-lg bg-slate-50 border-l-2 border-primary text-xs italic text-slate-700">
                        "{cand.tagline}"
                      </blockquote>

                      <div className="text-xs text-slate-600 line-clamp-3">
                        {cand.manifesto_summary}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>{cand.merit_points} Merit • CGPA {cand.cgpa}</span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCandidateDetail(cand)}
                        className="text-xs h-7 px-2.5 text-primary border-primary/20 hover:bg-primary/5"
                      >
                        Lihat Manifesto
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: SENARAI PENDEK TOP 12 & TEMUDUGA EXCO */}
        {/* ========================================================================= */}
        <TabsContent value="shortlist" className="space-y-6 m-0">
          <div className="p-6 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
                    Fasa 2: Senarai Pendek & Temuduga
                  </Badge>
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs font-semibold">
                    Had Kuota: 12 Calon Terbaik
                  </Badge>
                </div>
                <h2 className="font-heading font-extrabold text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
                  <Crown className="w-6 h-6 text-amber-500" />
                  Senarai Pendek 12 Calon JAKMAS & Panel Temuduga Pengetua
                </h2>
                <p className="text-xs md:text-sm text-slate-600 max-w-3xl">
                  Berdasarkan undian E-voting residen aktif serta merit kepimpinan, 12 calon terbaik ini layak ke <strong>Sesi Temuduga Khas</strong> bersama Pengetua dan Felo bagi penilaian akhir dan penetapan portfolio Exco Kolej Kediaman Tun Fuad.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isStaffOrAdmin && (
                  <Button
                    onClick={handleAppointTop12ToJakmas}
                    disabled={appointingWinners}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    {appointingWinners ? 'Sedang Memproses...' : 'Lantik 12 Exco ke JAKMAS (1-Klik)'}
                  </Button>
                )}
              </div>
            </div>

            {/* Session Info Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-slate-50 to-emerald-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Sesi Temuduga Khas & Penetapan Exco
                  </h4>
                  <p className="text-slate-600">
                    Tarikh: <strong>05 Oktober 2026 (09:00 Pagi)</strong> • Lokasi: <strong>Bilik Mesyuarat Eksekutif Pengetua KKTF</strong>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <Badge className="bg-primary text-white font-bold text-xs">
                  Penilai: Pengetua KKTF & Barisan Felo
                </Badge>
              </div>
            </div>

            {/* Top 12 Candidates Interactive Table / Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Medal className="w-4 h-4 text-amber-500" />
                  Kedudukan 12 Calon Teratas (Shortlisted for Interview)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Disusun mengikut jumlah undian residen + markah merit
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(stats.top12Shortlist || []).map((item) => {
                  const cand = item.candidate;
                  const scoreInfo = interviewScores[cand.id];
                  const assignInfo = finalExcoAssignments[cand.id];
                  const assignedLabel = assignInfo?.label || (
                    item.rank === 1 ? 'Yang Dipertua (YDP)' :
                    item.rank === 2 ? 'Naib Yang Dipertua (NYDP)' :
                    item.rank === 3 ? 'Setiausaha Kehormat (SU)' :
                    item.rank === 4 ? 'Bendahari Kehormat' :
                    `Exco ${cand.portfolio_id?.replace('exco_', '').toUpperCase() || 'Portfolio'}`
                  );

                  return (
                    <div
                      key={cand.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                          ${item.rank <= 4 ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold' : 'bg-slate-900 text-white'}
                        `}>
                          #{item.rank}
                        </div>

                        <img
                          src={cand.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                          alt={cand.full_name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h4 className="font-heading font-bold text-xs text-slate-900 truncate">
                            {cand.full_name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {cand.student_id} • {cand.block_name}
                          </p>
                          <p className="text-[10px] text-primary truncate">
                            {cand.faculty?.split('(')[1]?.replace(')', '') || cand.faculty}
                          </p>
                        </div>
                      </div>

                      {/* Vote & Interview Status Badges */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Undian Residen:</span>
                          <span className="font-mono font-bold text-slate-900">{item.votes} undi ({item.percentage}%)</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Penetapan Portfolio:</span>
                          <span className="font-bold text-primary truncate max-w-[150px]">{assignedLabel}</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Skor Temuduga:</span>
                          {scoreInfo ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {scoreInfo.total_score}/100 (Selesai)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 bg-amber-50 text-[10px]">
                              Belum Dinilai
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1 flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDispatchInterviewWhatsApp(cand, item.rank)}
                          className="text-[11px] h-7 px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          Hantar Surat WA
                        </Button>

                        {isStaffOrAdmin && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenInterviewModal(item)}
                            className="text-[11px] h-7 px-2.5 bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-1"
                          >
                            <ClipboardCheck className="w-3 h-3" />
                            {scoreInfo ? 'Kemaskini Skor' : 'Isi Skor Temuduga'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: PUSAT PEMANTAUAN & TURNOUT */}
        {/* ========================================================================= */}
        <TabsContent value="monitoring" className="space-y-6 m-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Jumlah Pengundi Layak
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-heading font-extrabold text-slate-900">
                  {stats.totalEligibleVoters}
                </span>
                <Users className="w-5 h-5 text-primary opacity-80" />
              </div>
              <span className="text-[11px] text-slate-500">Residen Aktif KKTF</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Kertas Undi Diterima
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-heading font-extrabold text-primary">
                  {stats.totalBallots}
                </span>
                <Vote className="w-5 h-5 text-primary opacity-80" />
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">Sah & Diverifikasi</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Peratusan Turnout
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-heading font-extrabold text-emerald-600">
                  {stats.turnoutPercent}%
                </span>
                <TrendingUp className="w-5 h-5 text-emerald-600 opacity-80" />
              </div>
              <span className="text-[11px] text-slate-500">Sasaran Kuorum: 60.0%</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Status Kuorum Pilihan Raya
              </span>
              <div className="flex items-center justify-between">
                <span className={`text-base font-heading font-bold ${stats.isQuorumMet ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {stats.isQuorumMet ? 'Mencapai Kuorum' : 'Dalam Proses'}
                </span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-slate-500">Perlembagaan Kolej</span>
            </div>
          </div>

          {/* Turnout by Block (Blok A - N) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm md:text-base text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Kadar Keluar Mengundi Mengikut Blok Kediaman (Blok A - N)
                </h3>
                <p className="text-xs text-slate-500">
                  Peratusan penyertaan residen bagi setiap blok kediaman dalam pemilihan JAKMAS.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(stats.blockTurnout || {}).map(([blk, data]) => {
                const total = data.total || 15;
                const voted = data.voted || 0;
                const pct = total > 0 ? Math.min(100, Math.round((voted / total) * 100)) : 0;

                return (
                  <div key={blk} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{blk}</span>
                      <span className="font-mono text-[11px] font-semibold text-primary">{pct}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 60 ? 'bg-emerald-500' : 'bg-primary'}`} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>{voted} undi</span>
                      <span>/ {total} residen</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: PENGESAHAN RASMI PENGETUA */}
        {/* ========================================================================= */}
        <TabsContent value="principal" className="space-y-6 m-0">
          <div className="p-6 md:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="space-y-1">
                <Badge className="bg-amber-100 text-amber-900 font-bold border-amber-300 text-xs">
                  Modul Eksekutif Tadbir Urus Kolej
                </Badge>
                <h2 className="font-heading font-extrabold text-lg md:text-xl text-slate-900 flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                  Pemantauan, Temuduga & Watikah Pengesahan Pengetua KKTF
                </h2>
                <p className="text-xs md:text-sm text-slate-600">
                  Panel pengesahan rasmi untuk Pengetua Kolej Kediaman Tun Fuad (Puan Nurfadilah Darmansah) bagi memuktamadkan senarai Top 12 dan penetapan barisan Exco JAKMAS.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {certification ? (
                  <Badge className="bg-emerald-600 text-white font-bold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Keputusan Telah Dimuktamadkan
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-4 h-4" />
                    Menunggu Pengesahan Pengetua
                  </Badge>
                )}
              </div>
            </div>

            {/* Verification Status & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Pegawai Pengesah</span>
                <span className="font-bold text-sm text-slate-900 block">
                  {certification?.certified_by_name || 'PUAN NURFADILAH DARMANSAH'}
                </span>
                <span className="text-[11px] text-slate-600">Pengetua Kolej Kediaman Tun Fuad</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Jumlah Kertas Undi Sah</span>
                <span className="font-bold text-sm text-primary block">
                  {stats.totalBallots} Kertas Undi ({stats.turnoutPercent}% Turnout)
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">Integriti Audit 100%</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">No. Rujukan Watikah Rasmi</span>
                <span className="font-mono font-bold text-xs text-slate-900 block bg-white px-2 py-1 rounded border border-slate-200 truncate">
                  {certification?.certificate_ref || 'KKTF/WATIKAH-JAKMAS/2026/DRAF'}
                </span>
                <span className="text-[11px] text-slate-500">Arkib Digital MyKKTF</span>
              </div>
            </div>

            {/* Pengetua Official Remarks & Certification Control */}
            <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-4">
              <div className="space-y-1.5">
                <Label className="font-bold text-xs text-amber-950 uppercase">
                  Ulasan & Perakuan Rasmi Pengetua:
                </Label>
                <Textarea
                  rows={3}
                  value={principalRemarks}
                  onChange={(e) => setPrincipalRemarks(e.target.value)}
                  disabled={Boolean(certification)}
                  placeholder="Masukkan ulasan perakuan rasmi keputusan pilihan raya..."
                  className="text-xs bg-white border-amber-300"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="text-xs text-amber-900">
                  {certification ? (
                    <span>Tarikh Dimuktamadkan: <strong>{new Date(certification.certified_at).toLocaleString('ms-MY')}</strong></span>
                  ) : (
                    <span>Tindakan ini akan mengunci keputusan pilihan raya dan menandatangani watikah rasmi kolej.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!certification ? (
                    <Button
                      onClick={handleCertifyElection}
                      disabled={certifying}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      {certifying ? 'Sedang Memuktamadkan...' : 'Sahkan & Muktamadkan Keputusan Rasmi'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setWatikahModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-white font-bold shadow-xs flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Papar & Cetak Watikah Rasmi
                      </Button>

                      <Button
                        onClick={handleAppointTop12ToJakmas}
                        disabled={appointingWinners}
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-xs flex items-center gap-2"
                      >
                        <Award className="w-4 h-4" />
                        {appointingWinners ? 'Sedang Memproses...' : 'Lantik 12 Calon ke JAKMAS (1-Klik)'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 6: KAWALAN SESI PILIHAN RAYA (ADMIN / FELO) */}
        {/* ========================================================================= */}
        {isStaffOrAdmin && (
          <TabsContent value="management" className="space-y-6 m-0">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                    <UserCog className="w-5 h-5 text-primary" />
                    Tetapan Sesi Pilihan Raya & Pengurusan Calon
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi tempoh pengundian, status sesi, dan senarai calon yang diluluskan.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingCandidate(null);
                      setCandForm({
                        portfolio_id: 'ydp',
                        candidate_number: String(candidates.length + 1).padStart(2, '0'),
                        full_name: '',
                        student_id: '',
                        faculty: 'Fakulti Komputeran dan Informatik (FKI)',
                        programme: '',
                        year_of_study: 2,
                        cgpa: '3.75',
                        merit_points: 120,
                        block_name: 'Blok C',
                        room_number: '',
                        tagline: '',
                        manifesto_summary: '',
                        manifesto_points_str: '',
                        photo_url: '',
                        status: 'approved'
                      });
                      setCandidateModalOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Calon Baharu
                  </Button>
                </div>
              </div>

              {/* Candidate Table List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">No.</th>
                      <th className="py-2.5 px-3">Nama Calon</th>
                      <th className="py-2.5 px-3">Portfolio</th>
                      <th className="py-2.5 px-3">No. Matrik & Fakulti</th>
                      <th className="py-2.5 px-3">Blok & Bilik</th>
                      <th className="py-2.5 px-3 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {candidates.map(cand => (
                      <tr key={cand.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">#{cand.candidate_number}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{cand.full_name}</td>
                        <td className="py-2.5 px-3 text-primary font-semibold">{cand.portfolio_id?.toUpperCase()}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{cand.student_id}</td>
                        <td className="py-2.5 px-3 text-slate-600">{cand.block_name} ({cand.room_number || '-'})</td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCandidate(cand);
                              setCandForm({
                                ...cand,
                                manifesto_points_str: (cand.manifesto_points || []).join('\n')
                              });
                              setCandidateModalOpen(true);
                            }}
                            className="h-7 text-xs text-primary"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Padam calon ${cand.full_name}?`)) {
                                const updated = deleteStoredCandidate(cand.id);
                                setCandidates(updated);
                                toast.success('Calon berjaya dipadam.');
                              }
                            }}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            Padam
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Confirm Vote Modal */}
      <Dialog open={confirmVoteModalOpen} onOpenChange={setConfirmVoteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2 text-primary">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Pengesahan Undian Rasmi Pilihan Raya
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Sila pastikan pilihan anda adalah tepat. Selepas disahkan, undian anda akan dimeterai secara kekal ke dalam peti undi digital KKTF.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-800">
            <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span>Ringkasan Kertas Undi Anda:</span>
              <span className="font-mono text-primary font-semibold">{Object.keys(selections).length} Jawatan</span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-slate-100 pr-1">
              {Object.entries(selections).map(([portId, candId]) => {
                const port = VOTING_PORTFOLIOS.find(p => p.id === portId);
                const cand = candidates.find(c => c.id === candId);
                return (
                  <div key={portId} className="pt-1.5 flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{port?.name}:</span>
                    <span className="font-bold text-primary truncate max-w-[180px]">{cand?.full_name || '-'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setConfirmVoteModalOpen(false)}
              disabled={submittingVote}
            >
              Semak Semula
            </Button>
            <Button 
              size="sm" 
              onClick={handleConfirmVote} 
              disabled={submittingVote}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              {submittingVote ? 'Sedang Memproses...' : 'Meterai & Hantar Undi Rasmi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Candidate Detail & Manifesto Modal */}
      <Dialog open={Boolean(selectedCandidateDetail)} onOpenChange={() => setSelectedCandidateDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center justify-between">
              <span>Profil & Manifesto Calon</span>
              <Badge className="bg-primary text-white font-mono text-xs">
                CALON #{selectedCandidateDetail?.candidate_number}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedCandidateDetail && (
            <div className="space-y-4 text-xs text-slate-800">
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <img
                  src={selectedCandidateDetail.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                  alt={selectedCandidateDetail.full_name}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-2xs"
                />
                <div className="space-y-0.5">
                  <h3 className="font-heading font-bold text-sm text-slate-900">
                    {selectedCandidateDetail.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {selectedCandidateDetail.student_id} • {selectedCandidateDetail.block_name} ({selectedCandidateDetail.room_number || '-'})
                  </p>
                  <p className="text-[11px] text-primary font-medium">
                    {selectedCandidateDetail.faculty}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">Slogan / Tagline:</span>
                <p className="italic bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                  "{selectedCandidateDetail.tagline}"
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="font-bold text-slate-900 uppercase text-[11px] block">Manifesto Utama:</span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedCandidateDetail.manifesto_summary}
                </p>
              </div>

              {selectedCandidateDetail.manifesto_points && selectedCandidateDetail.manifesto_points.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-900 uppercase text-[11px] block">Teras Perjuangan:</span>
                  <ul className="space-y-1 pl-4 list-disc text-slate-700">
                    {selectedCandidateDetail.manifesto_points.map((pt, idx) => (
                      <li key={idx}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-slate-500 text-[11px]">
                <span>Tahun Pengajian: <strong>Tahun {selectedCandidateDetail.year_of_study}</strong></span>
                <span>CGPA Semasa: <strong>{selectedCandidateDetail.cgpa}</strong></span>
                <span>Mata Merit: <strong>{selectedCandidateDetail.merit_points}</strong></span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setSelectedCandidateDetail(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Interview Scoring & Exco Assignment Modal */}
      <Dialog open={interviewModalOpen} onOpenChange={setInterviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Borang Penilaian Temuduga & Penetapan Exco
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Calon: <strong>{selectedCandForInterview?.candidate?.full_name}</strong> (Rank #{selectedCandForInterview?.rank})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveInterview} className="space-y-3.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 uppercase text-[11px]">
                Rubrik Penilaian Temuduga Rasmi (Jumlah: 100 Markah):
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">1. Kepimpinan & Komunikasi (30m)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={interviewForm.leadership_score}
                    onChange={(e) => setInterviewForm(f => ({ ...f, leadership_score: Number(e.target.value) }))}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">2. Visi & Manifesto (25m)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={25}
                    value={interviewForm.vision_score}
                    onChange={(e) => setInterviewForm(f => ({ ...f, vision_score: Number(e.target.value) }))}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">3. Sahsiah & Komitmen (25m)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={25}
                    value={interviewForm.character_score}
                    onChange={(e) => setInterviewForm(f => ({ ...f, character_score: Number(e.target.value) }))}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">4. Merit & Akademik (20m)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={interviewForm.academic_score}
                    onChange={(e) => setInterviewForm(f => ({ ...f, academic_score: Number(e.target.value) }))}
                    className="text-xs bg-white"
                  />
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-primary">
                <span>Jumlah Markah Keseluruhan:</span>
                <span className="font-mono text-sm">
                  {Number(interviewForm.leadership_score) + Number(interviewForm.vision_score) + Number(interviewForm.character_score) + Number(interviewForm.academic_score)} / 100
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-800">
                Penetapan Portfolio Exco Yang Dianugerahkan:
              </Label>
              <Input
                value={interviewForm.assigned_portfolio}
                onChange={(e) => setInterviewForm(f => ({ ...f, assigned_portfolio: e.target.value }))}
                placeholder="cth: Yang Dipertua (YDP) / Exco Sukan & Rekreasi"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nama Pegawai / Panel Penemuduga</Label>
              <Input
                value={interviewForm.panel_name}
                onChange={(e) => setInterviewForm(f => ({ ...f, panel_name: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ulasan & Catatan Temuduga</Label>
              <Textarea
                rows={2}
                value={interviewForm.notes}
                onChange={(e) => setInterviewForm(f => ({ ...f, notes: e.target.value }))}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setInterviewModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold">
                Simpan Skor & Penetapan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Official Printable Watikah Modal */}
      <OfficialVotingResultModal
        open={watikahModalOpen}
        onClose={() => setWatikahModalOpen(false)}
        session={session}
        stats={stats}
        certification={certification}
        pengetuaUser={currentUser}
      />

      {/* 5. Add/Edit Candidate Admin Modal */}
      <Dialog open={candidateModalOpen} onOpenChange={setCandidateModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-base">
              {editingCandidate ? 'Kemaskini Calon Pilihan Raya' : 'Daftar Calon Baharu'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCandidate} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Portfolio / Jawatan</Label>
                <Select
                  value={candForm.portfolio_id}
                  onValueChange={(val) => setCandForm(f => ({ ...f, portfolio_id: val }))}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOTING_PORTFOLIOS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">No. Calon (cth: 01, 02)</Label>
                <Input
                  value={candForm.candidate_number}
                  onChange={(e) => setCandForm(f => ({ ...f, candidate_number: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nama Penuh Calon</Label>
              <Input
                value={candForm.full_name}
                onChange={(e) => setCandForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="cth: MUHAMMAD DANIAL BIN HAKIMI"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">No. Matrik</Label>
                <Input
                  value={candForm.student_id}
                  onChange={(e) => setCandForm(f => ({ ...f, student_id: e.target.value }))}
                  placeholder="cth: BI23110022"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Blok Kediaman</Label>
                <Input
                  value={candForm.block_name}
                  onChange={(e) => setCandForm(f => ({ ...f, block_name: e.target.value }))}
                  placeholder="cth: Blok C"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Fakulti / Akademi</Label>
              <Input
                value={candForm.faculty}
                onChange={(e) => setCandForm(f => ({ ...f, faculty: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tahun</Label>
                <Input
                  type="number"
                  value={candForm.year_of_study}
                  onChange={(e) => setCandForm(f => ({ ...f, year_of_study: Number(e.target.value) }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CGPA</Label>
                <Input
                  value={candForm.cgpa}
                  onChange={(e) => setCandForm(f => ({ ...f, cgpa: e.target.value }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Merit</Label>
                <Input
                  type="number"
                  value={candForm.merit_points}
                  onChange={(e) => setCandForm(f => ({ ...f, merit_points: Number(e.target.value) }))}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Slogan / Tagline Calon</Label>
              <Input
                value={candForm.tagline}
                onChange={(e) => setCandForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder='cth: "Kepimpinan Berintegriti, KKTF Progresif"'
                className="text-xs italic"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ringkasan Manifesto</Label>
              <Textarea
                rows={2}
                value={candForm.manifesto_summary}
                onChange={(e) => setCandForm(f => ({ ...f, manifesto_summary: e.target.value }))}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Teras Perjuangan / Manifesto Penuh (Satu baris satu poin)</Label>
              <Textarea
                rows={3}
                value={candForm.manifesto_points_str}
                onChange={(e) => setCandForm(f => ({ ...f, manifesto_points_str: e.target.value }))}
                placeholder="Poin 1&#10;Poin 2&#10;Poin 3"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">URL Gambar Profil Calon</Label>
              <Input
                value={candForm.photo_url}
                onChange={(e) => setCandForm(f => ({ ...f, photo_url: e.target.value }))}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCandidateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold">
                Simpan Profil Calon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
