import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { 
  Archive, LogIn, LogOut, Search, User, Loader2, Calendar, QrCode, Printer,
  Users, CheckCircle2, ShieldCheck, AlertCircle, Building2, KeyRound, Sparkles,
  RefreshCw, Check, X, Camera, Eye, FileText, CheckSquare, Clock, ArrowRight,
  ChevronDown, Settings2, Smartphone, PenTool
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SurveyModal from '@/components/SurveyModal';
import TablePagination from '@/components/shared/TablePagination';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { useQuery } from '@tanstack/react-query';
import { realTimeQueryOptions } from '@/lib/query-client';
import { logAudit } from '@/lib/audit';
import { getDropKeyRequests, approveDropKeyRequest, rejectDropKeyRequest } from '@/lib/dropKeyHelper';

const PAGE_SIZE = 6;

export default function CheckInOut() {
  const { data: students = [], refetch: refetchStudents } = useQuery({
    queryKey: ['checkinout', 'students'],
    queryFn: () => base44.entities.Student.list()
  });

  const { data: rooms = [], refetch: refetchRooms } = useQuery({
    queryKey: ['checkinout', 'rooms'],
    queryFn: () => base44.entities.Room.list()
  });

  const { data: checkIns = [], refetch: refetchCheckIns } = useQuery({
    queryKey: ['checkinout', 'checkIns'],
    queryFn: () => base44.entities.CheckIn.list('-created_date'),
    ...realTimeQueryOptions
  });

  const { data: checkOuts = [], refetch: refetchCheckOuts } = useQuery({
    queryKey: ['checkinout', 'checkOuts'],
    queryFn: () => base44.entities.CheckOut.list('-created_date'),
    ...realTimeQueryOptions
  });

  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Filter Global Sesi (Kekal Dropdown < 3 pilihan)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('Sem1_2526');
  
  // Dialog States
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showQrPosterModal, setShowQrPosterModal] = useState(false);
  const [showDropKeyQrModal, setShowDropKeyQrModal] = useState(false);

  // Drop-Key States
  const [dropKeyRequests, setDropKeyRequests] = useState([]);
  const [selectedDropKey, setSelectedDropKey] = useState(null);
  const [dropKeyModalOpen, setDropKeyModalOpen] = useState(false);
  const [dropKeyVerificationForm, setDropKeyVerificationForm] = useState({
    room_condition: 'Good',
    damage_notes: ''
  });
  const [dropKeyRejectReason, setDropKeyRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const refreshDropKeys = () => {
    setDropKeyRequests(getDropKeyRequests());
  };

  useEffect(() => {
    refreshDropKeys();
  }, []);

  // Pagination States
  const [ciPage, setCiPage] = useState(1);
  const [coPage, setCoPage] = useState(1);

  // Live Resident Roster Filter & Pagination States
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterBlockFilter, setRosterBlockFilter] = useState('all');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('all');
  const [rosterPage, setRosterPage] = useState(1);

  useEffect(() => {
    setCiPage(1);
    setCoPage(1);
  }, [selectedSemesterFilter]);
  
  // Live Search Pelajar (Taip & Tapis)
  const [studentSearch, setStudentSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Form Searchable States (Taip & Tapis untuk Data Dinamik/Banyak)
  const [blockSearch, setBlockSearch] = useState('');
  const [showBlockList, setShowBlockList] = useState(false);
  
  const [roomSearch, setRoomSearch] = useState('');
  const [showRoomList, setShowRoomList] = useState(false);
  
  // Form States
  const [ciForm, setCiForm] = useState({ room_id: '', check_in_date: '', check_in_time: '', semester: 'Sem1_2526', notes: '' });
  const [coForm, setCoForm] = useState({ check_out_date: '', check_out_time: '', room_condition: 'Good', semester: 'Sem1_2526', damage_assessment: '' });
  
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedStudent && students.length > 0) {
      const updatedData = students.find(s => s.id === selectedStudent.id);
      if (updatedData) {
        setSelectedStudent(updatedData);
      }
    }
  }, [students, selectedStudent]);

  const hasActiveRoom = (student) => {
    if (!student) return false;
    const roomStatus = String(student.room_status || '').trim().toLowerCase();
    const residentStatus = String(student.resident_status || '').trim().toLowerCase();
    // Pelajar yang telah Checked Out atau Diarkibkan tidak mempunyai bilik aktif
    if (roomStatus === 'checked out' || residentStatus === 'archived') return false;

    // 1. Status 'checked in' secara eksplisit
    if (roomStatus === 'checked in') return true;

    // 2. Mempunyai penempatan blok dan bilik fizikal
    if (student.block_name && student.room_number) return true;

    // 3. Mempunyai pautan room_id yang sah
    if (student.room_id !== undefined && student.room_id !== null) {
      const val = String(student.room_id).trim().toLowerCase();
      if (val !== '' && val !== 'none' && val !== 'null' && val !== 'undefined') return true;
    }
    return false;
  };

  const isGenderMatching = (studentGen, roomGen) => {
    const sGender = (studentGen || '').toLowerCase().trim();
    const rGender = (roomGen || 'mixed').toLowerCase().trim();
    if (rGender === 'mixed' || !sGender) return true;
    if (sGender === 'lelaki' || sGender === 'male') return rGender === 'lelaki' || rGender === 'male';
    if (sGender === 'perempuan' || sGender === 'female' || sGender === 'wanita') return rGender === 'perempuan' || rGender === 'female' || rGender === 'wanita';
    return rGender === sGender;
  };

  // Live Search Student
  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents([]);
      return;
    }
    const query = studentSearch.toLowerCase().trim();
    
    let baseFiltered = students.filter(s => {
      const isArchived = String(s.resident_status || '').toLowerCase() === 'archived';
      const matchesSearch = (s.student_id || '').toLowerCase().includes(query) || (s.full_name || '').toLowerCase().includes(query);
      return !isArchived && matchesSearch;
    });

    if (ciDialog) {
      baseFiltered = baseFiltered.filter(s => !hasActiveRoom(s));
    } else if (coDialog) {
      baseFiltered = baseFiltered.filter(s => hasActiveRoom(s));
    }
    setFilteredStudents(baseFiltered);
  }, [studentSearch, students, ciDialog, coDialog]);

  // Ekstrak nama blok unik berdasarkan jantina
  const allAvailableBlocks = useMemo(() => {
    if (rooms.length === 0) return [];
    let targetRooms = rooms;
    if (ciDialog && selectedStudent) {
      targetRooms = rooms.filter(room => isGenderMatching(selectedStudent.gender, room.gender_restriction || room.gender || 'mixed'));
    }
    return [...new Set(targetRooms.map(r => r.block_name).filter(Boolean))].sort();
  }, [rooms, selectedStudent, ciDialog]);

  // Tapis senarai blok mengikut input admin
  const filteredBlocksList = useMemo(() => {
    return allAvailableBlocks.filter(b => b.toLowerCase().includes(blockSearch.toLowerCase().trim()));
  }, [blockSearch, allAvailableBlocks]);

  // Ambil senarai bilik mentah mengikut blok yang dipilih
  const rawRoomsInBlock = useMemo(() => {
    if (!blockSearch) return [];
    let roomsInBlock = rooms.filter(r => String(r.block_name).toLowerCase() === blockSearch.toLowerCase().trim());
    if (ciDialog && selectedStudent) {
      roomsInBlock = roomsInBlock.filter(room => isGenderMatching(selectedStudent.gender, room.gender_restriction || room.gender || 'mixed'));
    }
    return roomsInBlock.sort((a, b) => String(a.room_number).localeCompare(String(b.room_number)));
  }, [blockSearch, rooms, selectedStudent, ciDialog]);

  // Tapis senarai bilik mengikut input taipan admin
  const filteredRoomsList = useMemo(() => {
    return rawRoomsInBlock.filter(r => String(r.room_number).toLowerCase().includes(roomSearch.toLowerCase().trim()));
  }, [roomSearch, rawRoomsInBlock]);

  function getRoomStatus(room) {
    if (!room) return 'Unknown';
    if (room.status === 'Maintenance') return 'Maintenance';
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (current === 0) return 'Available';
    if (current >= capacity) return 'Full';
    return 'Occupied';
  }

  function validateRoomSelection(room, student, triggerToasts = true) {
    if (!room || !student) return false;
    if (hasActiveRoom(student)) {
      if (triggerToasts) toast({ title: 'Ralat Validasi', description: 'Pelajar ini sudah mendaftar masuk ke bilik lain.', variant: 'destructive' });
      return false;
    }
    if (room.status === 'Maintenance') {
      if (triggerToasts) toast({ title: 'Ralat Pilihan', description: 'Bilik ini sedang dalam penyelenggaraan.', variant: 'destructive' });
      return false;
    }
    if ((room.current_occupancy || 0) >= (room.capacity || 4)) {
      if (triggerToasts) toast({ title: 'Bilik Penuh', description: 'Bilik ini telah mencapai kapasiti maksimum.', variant: 'destructive' });
      return false;
    }
    if (!isGenderMatching(student.gender, room.gender_restriction || room.gender || 'mixed')) {
      if (triggerToasts) toast({ title: 'Sekatan Jantina', description: `Bilik dikhaskan untuk pelajar ${room.gender_restriction || room.gender} sahaja.`, variant: 'destructive' });
      return false;
    }
    return true;
  }

  function formatSemesterName(semCode) {
    if (semCode === 'Sem1_2526') return 'Semester 1 Sesi 2025/2026';
    if (semCode === 'Sem2_2526') return 'Semester 2 Sesi 2025/2026';
    return semCode || 'N/A';
  }

  async function load() {
    await Promise.all([
      refetchStudents(),
      refetchRooms(),
      refetchCheckIns(),
      refetchCheckOuts()
    ]);
    refreshDropKeys();
  }

  function dispatchGlobalRefresh() {
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  function resetSearchState() {
    setStudentSearch('');
    setFilteredStudents([]);
    setSelectedStudent(null);
    setShowSuggestions(false);
    setBlockSearch('');
    setRoomSearch('');
  }

  function handleSelectStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.student_id} - ${student.full_name}`);
    setShowSuggestions(false);
    if (coDialog && student.block_name) {
      setBlockSearch(student.block_name);
      setRoomSearch(student.room_number || '');
    }
  }

  async function handleCheckIn() {
    if (submitting) return; 
    if (!selectedStudent || !ciForm.room_id || !ciForm.check_in_date) {
      toast({ title: 'Sila lengkapkan profil pelajar, blok, bilik, dan tarikh', variant: 'destructive' });
      return;
    }

    setSubmitting(true); 
    try {
      const room = rooms.find(r => r.id === ciForm.room_id);
      if (selectedStudent.user_id) {
        await base44.entities.User.update(selectedStudent.user_id, { role: 'student' });
      }

      await base44.entities.CheckIn.create({
        student_id: selectedStudent.id,
        room_id: ciForm.room_id,
        check_in_date: ciForm.check_in_date,
        check_in_time: ciForm.check_in_time,
        semester: ciForm.semester, 
        notes: ciForm.notes,
        student_name: selectedStudent.full_name || '',
        room_number: room?.room_number || '',
        block_name: room?.block_name || ''
      });

      await base44.entities.Student.update(selectedStudent.id, {
        block_name: room.block_name || '',
        room_number: room.room_number || '',
        room_id: room.id,
        check_in_date: ciForm.check_in_date,
        room_status: 'Checked In', 
        resident_status: 'Active',
        qr_verified: true 
      });

      const nextOcc = (room.current_occupancy || 0) + 1;
      await base44.entities.Room.update(room.id, {
        current_occupancy: nextOcc,
        status: nextOcc >= (room.capacity || 4) ? 'Full' : 'Occupied',
      });

      await logAudit(currentUser, 'CHECKIN_RECORDED', 'Check-In/Out', { student: selectedStudent.full_name, student_id: selectedStudent.student_id, room: room?.room_number, block: room?.block_name });
      toast({ title: 'Berjaya', description: 'Check-in direkodkan dengan jayanya.' });
      setCiDialog(false);
      resetSearchState();
      await load(); 
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat rekod check-in', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false); 
    }
  }

  async function handleCheckOut() {
    if (submitting) return; 
    if (!selectedStudent || !coForm.check_out_date) {
      toast({ title: 'Sila pilih pelajar dan isi tarikh keluar', variant: 'destructive' });
      return;
    }

    setSubmitting(true); 
    try {
      let room = rooms.find(r => String(r.id) === String(selectedStudent.room_id));
      if (!room && selectedStudent.block_name && selectedStudent.room_number) {
        room = rooms.find(r => r.block_name === selectedStudent.block_name && String(r.room_number) === String(selectedStudent.room_number));
      }

      const checkout = await base44.entities.CheckOut.create({
        student_id: selectedStudent.id,
        room_id: selectedStudent.room_id || room?.id || '',
        check_out_date: coForm.check_out_date,
        check_out_time: coForm.check_out_time,
        room_condition: coForm.room_condition,
        semester: coForm.semester, 
        damage_assessment: coForm.damage_assessment,
        student_name: selectedStudent.full_name || '',
        room_number: selectedStudent.room_number || room?.room_number || '',
        block_name: selectedStudent.block_name || room?.block_name || ''
      });

      await base44.entities.Student.update(selectedStudent.id, {
        block_name: null, room_number: null, room_id: null, room_status: 'Checked Out'
      });

      if (room) {
        // Kira baki sebenar penghuni aktif dalam bilik untuk ketepatan 100%
        const remainingOccupants = students.filter(s => 
          String(s.id) !== String(selectedStudent.id) &&
          (String(s.room_id) === String(room.id) || (s.block_name === room.block_name && String(s.room_number) === String(room.room_number))) &&
          String(s.room_status || '').toLowerCase() !== 'checked out' &&
          String(s.resident_status || '').toLowerCase() !== 'archived'
        ).length;

        const nextStatus = remainingOccupants === 0 
          ? 'Available' 
          : (remainingOccupants >= (room.capacity || 4) ? 'Full' : 'Occupied');

        await base44.entities.Room.update(room.id, {
          current_occupancy: remainingOccupants,
          status: nextStatus,
        }).catch(() => {});
      }

      await logAudit(currentUser, 'CHECKOUT_RECORDED', 'Check-In/Out', { student: selectedStudent.full_name, student_id: selectedStudent.student_id, room: selectedStudent.room_number, condition: coForm.room_condition });
      setCoDialog(false);
      setPendingCheckout({ checkoutId: checkout.id, student: { ...selectedStudent, room_id: null, room_number: null, block_name: null } });
      setShowSurvey(true);
      resetSearchState();
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat rekod check-out', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false); 
    }
  }

  async function onSurveyComplete() {
    setShowSurvey(false);
    setPendingCheckout(null);
    toast({ title: 'Check-out selesai sepenuhnya.' });
    await load();
  }

  async function handleMassArchive() {
    setArchiving(true);
    try {
      const candidates = students.filter(s => s.room_status === 'Checked Out' && (!s.resident_status || String(s.resident_status).toLowerCase() === 'active'));
      if (candidates.length === 0) {
        toast({ title: 'Tiada Pelajar', description: 'Tiada residen berstatus "Checked Out" untuk diarkib.' });
        setArchiveDialog(false);
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const alumniRecords = candidates.map(st => {
        const co = checkOuts.find(c => String(c.student_id) === String(st.id));
        return {
          student_id: st.student_id || '',
          full_name: st.full_name || '',
          ic_passport: st.ic_passport || '',
          gender: st.gender,
          date_of_birth: st.date_of_birth,
          faculty: st.faculty || '',
          programme: st.programme || '',
          year_of_study: st.year_of_study,
          phone: st.phone || '',
          email: st.email || '',
          block_name: st.block_name || '',
          room_number: st.room_number || '',
          check_in_date: st.check_in_date,
          check_out_date: co?.check_out_date,
          room_condition: co?.room_condition,
          semester: selectedSemesterFilter,
          user_id: st.user_id,
          archived_date: today
        };
      });
      await base44.entities.Alumni.bulkCreate(alumniRecords);
      await Promise.all(candidates.map(st => base44.entities.Student.update(st.id, { resident_status: 'Archived' })));
      await logAudit(currentUser, 'SESSION_ARCHIVED', 'Check-In/Out', { count: candidates.length, semester: selectedSemesterFilter });
      toast({ title: 'Sesi Ditutup', description: `${candidates.length} residen telah dipindahkan ke rekod Alumni.` });
      setArchiveDialog(false);
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat proses', description: err.message, variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const rosterBlocks = useMemo(() => {
    return [...new Set(students.map(s => s.block_name).filter(Boolean))].sort();
  }, [students]);

  const getCheckInMethod = (student, map) => {
    const isArchived = String(student.resident_status || '').toLowerCase() === 'archived';
    const isCheckedOut = String(student.room_status || '').toLowerCase() === 'checked out';
    if (isArchived || isCheckedOut) {
      return { 
        code: 'checked_out', 
        label: 'Telah Check-Out', 
        shortLabel: 'Keluar',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' 
      };
    }

    if (!student.block_name || !student.room_number) {
      return { 
        code: 'pending_room', 
        label: 'Belum Ada Bilik (Prapendaftaran)', 
        shortLabel: 'Prapendaftaran',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' 
      };
    }

    const isQrVerified = student.qr_verified === true || student.qr_verified === 'true' || student.qr_verified === 1 || student.qr_verified === '1';

    if (!isQrVerified || String(student.room_status || '').toLowerCase() === 'pending verification') {
      return { 
        code: 'pending_qr', 
        label: 'Menunggu Pengesahan QR', 
        shortLabel: 'Menunggu QR',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' 
      };
    }

    // Semak jika manual kaunter (oleh staf) atau imbasan kendiri QR
    const ciRecord = map ? map.get(String(student.id)) : null;
    const ciNotes = (ciRecord?.notes || '').toLowerCase();
    const isManual = student.checkin_method === 'manual' || 
                     ciNotes.includes('kaunter') || 
                     ciNotes.includes('manual') || 
                     ciNotes.includes('penyelarasan') ||
                     ciNotes.includes('staf') ||
                     ciNotes.includes('fizikal');

    if (isManual) {
      return { 
        code: 'manual_counter', 
        label: 'Check-In Manual Kaunter', 
        shortLabel: 'Manual Kaunter',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' 
      };
    }

    return { 
      code: 'qr_scan', 
      label: 'Imbasan Kod QR (Kendiri)', 
      shortLabel: 'Imbasan QR',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300' 
    };
  };

  const checkInsMap = useMemo(() => {
    return new Map(checkIns.map(ci => [String(ci.student_id), ci]));
  }, [checkIns]);

  const stats = useMemo(() => {
    const active = students.filter(s => String(s.resident_status || '').toLowerCase() !== 'archived');

    let qrScanCount = 0;
    let manualCounterCount = 0;
    let pendingQrCount = 0;
    let pendingKeyCount = 0;
    let checkedOutCount = students.filter(s => String(s.room_status || '').toLowerCase() === 'checked out').length;

    active.forEach(s => {
      const method = getCheckInMethod(s, checkInsMap);
      if (method.code === 'qr_scan') qrScanCount++;
      else if (method.code === 'manual_counter') manualCounterCount++;
      else if (method.code === 'pending_qr') pendingQrCount++;
      else if (method.code === 'pending_room') pendingKeyCount++;
    });

    const totalWithRoom = qrScanCount + manualCounterCount + pendingQrCount;

    return {
      total: active.length,
      totalWithRoom,
      qrScanCount,
      manualCounterCount,
      pendingQrCount,
      pendingKeyCount,
      checkedOutCount,
      dropKeyCount: pendingDropKeys.length
    };
  }, [students, checkInsMap, pendingDropKeys]);

  const filteredActiveResidents = useMemo(() => {
    return students.filter(s => {
      const isArchived = String(s.resident_status || '').toLowerCase() === 'archived';
      if (isArchived) return false;

      const method = getCheckInMethod(s, checkInsMap);

      // Status / Method filter
      if (rosterStatusFilter === 'qr_scan' && method.code !== 'qr_scan') return false;
      if (rosterStatusFilter === 'manual_counter' && method.code !== 'manual_counter') return false;
      if (rosterStatusFilter === 'checked_in' && method.code !== 'qr_scan' && method.code !== 'manual_counter') return false;
      if (rosterStatusFilter === 'pending_qr' && method.code !== 'pending_qr') return false;
      if (rosterStatusFilter === 'pending_key' && method.code !== 'pending_room') return false;
      if (rosterStatusFilter === 'checked_out' && method.code !== 'checked_out') return false;

      // Block filter
      if (rosterBlockFilter !== 'all' && s.block_name !== rosterBlockFilter) {
        return false;
      }

      // Search query
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase().trim();
        const matchName = (s.full_name || '').toLowerCase().includes(q);
        const matchMatric = (s.student_id || '').toLowerCase().includes(q);
        const matchRoom = (s.room_number || '').toLowerCase().includes(q);
        const matchBlock = (s.block_name || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').toLowerCase().includes(q);
        const matchMethod = method.label.toLowerCase().includes(q) || method.shortLabel.toLowerCase().includes(q);
        if (!matchName && !matchMatric && !matchRoom && !matchBlock && !matchPhone && !matchMethod) return false;
      }

      return true;
    });
  }, [students, checkInsMap, rosterSearch, rosterBlockFilter, rosterStatusFilter]);

  const totalRosterPages = Math.ceil(filteredActiveResidents.length / PAGE_SIZE);
  const safeRosterPage = Math.min(rosterPage, totalRosterPages || 1);
  const paginatedResidents = filteredActiveResidents.slice((safeRosterPage - 1) * PAGE_SIZE, safeRosterPage * PAGE_SIZE);

  async function handleQuickCounterActivation(student) {
    if (submitting) return;
    if (!student.block_name || !student.room_number) {
      handleSelectStudent(student);
      setCiForm({
        room_id: '',
        check_in_date: dateStr,
        check_in_time: timeStr,
        semester: selectedSemesterFilter,
        notes: ''
      });
      setCiDialog(true);
      return;
    }
    const confirmAct = window.confirm(`Sahkan pengaktifan fizikal kaunter untuk ${student.full_name} (${student.student_id}) di ${student.block_name} Bilik ${student.room_number}?`);
    if (!confirmAct) return;

    setSubmitting(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const curTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
      
      const targetRoom = rooms.find(r => r.block_name === student.block_name && String(r.room_number) === String(student.room_number));
      const roomId = targetRoom?.id || student.room_id || '';

      await base44.entities.CheckIn.create({
        student_id: student.id,
        room_id: roomId,
        room_number: student.room_number,
        block_name: student.block_name,
        check_in_date: todayDate,
        check_in_time: curTime,
        semester: selectedSemesterFilter,
        notes: `Pengesahan fizikal di Kaunter Kunci oleh Staf (${currentUser?.full_name || 'Staf'})`,
        student_name: student.full_name || ''
      });

      await base44.entities.Student.update(student.id, {
        room_status: 'Checked In',
        resident_status: 'Active',
        status: 'Active',
        qr_verified: true,
        qr_verified_at: new Date().toISOString()
      });

      if (targetRoom) {
        const nextOcc = (targetRoom.current_occupancy || 0) + 1;
        await base44.entities.Room.update(targetRoom.id, {
          current_occupancy: nextOcc,
          status: nextOcc >= (targetRoom.capacity || 4) ? 'Full' : 'Occupied'
        }).catch(() => {});
      }

      await logAudit(currentUser, 'COUNTER_MANUAL_CHECKIN', 'Check-In/Out', {
        student: student.full_name,
        student_id: student.student_id,
        room: student.room_number,
        block: student.block_name
      });

      toast({ title: 'Pengaktifan Berjaya', description: `Status residen ${student.full_name} telah diaktifkan secara sah di kaunter.` });
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat Pengaktifan Kaunter', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleTriggerCheckOut(student) {
    resetSearchState();
    handleSelectStudent(student);
    setCoForm({
      check_out_date: dateStr,
      check_out_time: timeStr,
      room_condition: 'Good',
      semester: selectedSemesterFilter,
      damage_assessment: ''
    });
    setCoDialog(true);
  }

  // 1-Click Sync Residen Aktif Berbilik ke dalam Log Check-In
  async function handleSyncActiveResidents() {
    if (syncing) return;
    setSyncing(true);
    try {
      const activeRoomStudents = students.filter(s => {
        const isArchived = String(s.resident_status || '').toLowerCase() === 'archived';
        const isCheckedOut = String(s.room_status || '').toLowerCase() === 'checked out';
        return !isArchived && !isCheckedOut && Boolean(s.block_name && s.room_number);
      });

      const existingCiMap = new Set(checkIns.map(ci => String(ci.student_id)));
      const needSync = activeRoomStudents.filter(s => !existingCiMap.has(String(s.id)));

      if (needSync.length === 0) {
        toast({ title: 'Semua Residen Telah Diselaraskan', description: 'Semua residen berbilik aktif telah mempunyai rekod pendaftaran rasmi.' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const curTime = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;

      let count = 0;
      for (const st of needSync) {
        const targetRoom = rooms.find(r => r.block_name === st.block_name && String(r.room_number) === String(st.room_number));
        await base44.entities.CheckIn.create({
          student_id: st.id,
          room_id: targetRoom?.id || st.room_id || '',
          room_number: st.room_number,
          block_name: st.block_name,
          check_in_date: st.check_in_date || today,
          check_in_time: curTime,
          semester: selectedSemesterFilter,
          notes: 'Penyelarasan automatik rekod residen berbilik ke dalam Log Check-In',
          student_name: st.full_name || ''
        }).catch(() => {});

        await base44.entities.Student.update(st.id, {
          room_status: 'Checked In',
          resident_status: 'Active',
          qr_verified: true,
          qr_verified_at: st.qr_verified_at || new Date().toISOString()
        }).catch(() => {});
        count++;
      }

      toast({
        title: 'Penyelarasan Selesai!',
        description: `${count} orang residen aktif berjaya diselaraskan ke dalam Log Check-In rasmi.`
      });
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat Penyelarasan', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  // Pengurusan Drop-Key oleh Staf
  const handleOpenDropKeyModal = (req) => {
    setSelectedDropKey(req);
    setDropKeyVerificationForm({
      room_condition: req.room_condition || 'Good',
      damage_notes: req.damage_notes || ''
    });
    setShowRejectInput(false);
    setDropKeyRejectReason('');
    setDropKeyModalOpen(true);
  };

  const handleApproveDropKey = async () => {
    if (!selectedDropKey) return;
    setSubmitting(true);
    try {
      await approveDropKeyRequest({
        requestId: selectedDropKey.id,
        staffUser: currentUser,
        roomCondition: dropKeyVerificationForm.room_condition,
        damageNotes: dropKeyVerificationForm.damage_notes,
        rooms
      });
      toast({
        title: 'Check-Out Drop-Key Diluluskan',
        description: `Kunci bilik ${selectedDropKey.block_name} (${selectedDropKey.room_number}) bagi ${selectedDropKey.student_name} telah disahkan dan status check-out selesai.`
      });
      setDropKeyModalOpen(false);
      setSelectedDropKey(null);
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      toast({ title: 'Ralat Kelulusan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectDropKey = async () => {
    if (!selectedDropKey) return;
    if (!dropKeyRejectReason.trim()) {
      toast({ title: 'Sila masukkan sebab penolakan', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await rejectDropKeyRequest({
        requestId: selectedDropKey.id,
        staffUser: currentUser,
        reason: dropKeyRejectReason
      });
      toast({
        title: 'Permohonan Ditolak',
        description: `Notifikasi telah dihantar kepada pelajar berkaitan isu serahan kunci.`
      });
      setDropKeyModalOpen(false);
      setSelectedDropKey(null);
      refreshDropKeys();
    } catch (err) {
      toast({ title: 'Ralat Penolakan', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const displayCheckIns = checkIns.filter(ci => (ci.semester || 'Sem1_2526') === selectedSemesterFilter);
  const displayCheckOuts = checkOuts.filter(co => (co.semester || 'Sem1_2526') === selectedSemesterFilter);
  const pendingDropKeys = dropKeyRequests.filter(r => r.status === 'pending_verification');

  const totalCiPages = Math.ceil(displayCheckIns.length / PAGE_SIZE);
  const totalCoPages = Math.ceil(displayCheckOuts.length / PAGE_SIZE);
  const safeCiPage = Math.min(ciPage, totalCiPages || 1);
  const safeCoPage = Math.min(coPage, totalCoPages || 1);
  const paginatedCheckIns = displayCheckIns.slice((safeCiPage - 1) * PAGE_SIZE, safeCiPage * PAGE_SIZE);
  const paginatedCheckOuts = displayCheckOuts.slice((safeCoPage - 1) * PAGE_SIZE, safeCoPage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* HEADER UTAMA: RESPONSIVE, KEMAS & TANPA OVERFLOW */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Tajuk & Keterangan */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Check-In / Check-Out
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs font-semibold px-2 py-0.5">
                Hibrid & Drop-Key v3.1
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Urus rekod kemasukan melalui imbasan QR / kaunter staf serta semakan drop-key check-out pantas.
            </p>
          </div>

          {/* Tindakan Pantas & Filter Sesi (Tersusun rapi tanpa melimpah keluar) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Filter Sesi Ringkas */}
            <div className="w-full sm:w-[220px]">
              <Select value={selectedSemesterFilter} onValueChange={setSelectedSemesterFilter}>
                <SelectTrigger className="h-9 bg-background text-xs font-medium border-border shadow-xs">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Pilih Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem1_2526" className="text-xs">Sem 1 Sesi 2025/2026</SelectItem>
                  <SelectItem value="Sem2_2526" className="text-xs">Sem 2 Sesi 2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Menu Dropdown Tindakan Pentadbiran & Kod QR */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs border-border bg-background shadow-xs hover:bg-muted font-medium">
                  <Settings2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  <span>Alat & Kod QR</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs shadow-md">
                <DropdownMenuItem onClick={() => setShowQrPosterModal(true)} className="cursor-pointer">
                  <QrCode className="w-4 h-4 mr-2 text-emerald-600" />
                  <span>Poster QR Pengaktifan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowDropKeyQrModal(true)} className="cursor-pointer">
                  <QrCode className="w-4 h-4 mr-2 text-amber-600" />
                  <span>Poster QR Peti Drop-Key</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={syncing} onClick={handleSyncActiveResidents} className="cursor-pointer">
                  <RefreshCw className={`w-4 h-4 mr-2 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
                  <span>Selaras Residen Aktif</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setArchiveDialog(true)} className="cursor-pointer text-slate-700">
                  <Archive className="w-4 h-4 mr-2 text-slate-500" />
                  <span>Tutup / Arkib Sesi</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Butang Terus Check-In */}
            <Button 
              size="sm" 
              onClick={() => {
                resetSearchState();
                setCiForm({ room_id: '', check_in_date: dateStr, check_in_time: timeStr, semester: selectedSemesterFilter, notes: '' });
                setCiDialog(true);
              }}
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Check In
            </Button>

            {/* Butang Terus Check-Out */}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                resetSearchState();
                setCoForm({ check_out_date: dateStr, check_out_time: timeStr, room_condition: 'Good', semester: selectedSemesterFilter, damage_assessment: '' });
                setCoDialog(true);
              }}
              className="h-9 text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 font-semibold shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-rose-600" /> Check Out
            </Button>
          </div>
        </div>
      </div>

      {/* STATISTIK KPI INTERAKTIF: PERBEZAAN QR SCAN VS MANUAL KAUNTER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* 1. SEMUA RESIDEN */}
        <div 
          onClick={() => { setRosterStatusFilter('all'); setRosterPage(1); }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-indigo-300 ${
            rosterStatusFilter === 'all' ? 'bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-400/20' : 'bg-card border-border'
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold">Semua Residen</span>
            <Users className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-foreground font-mono">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground truncate">Senarai keseluruhan</p>
        </div>

        {/* 2. IMBASAN QR KENDIRI */}
        <div 
          onClick={() => { setRosterStatusFilter(rosterStatusFilter === 'qr_scan' ? 'all' : 'qr_scan'); setRosterPage(1); }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-emerald-400 ${
            rosterStatusFilter === 'qr_scan' ? 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-50/40 border-emerald-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold">Imbasan QR</span>
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-800 font-mono">{stats.qrScanCount}</p>
          <p className="text-[10px] text-emerald-600 truncate">Scan pas kendiri</p>
        </div>

        {/* 3. MANUAL KAUNTER */}
        <div 
          onClick={() => { setRosterStatusFilter(rosterStatusFilter === 'manual_counter' ? 'all' : 'manual_counter'); setRosterPage(1); }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-blue-400 ${
            rosterStatusFilter === 'manual_counter' ? 'bg-blue-100/70 border-blue-500 ring-2 ring-blue-500/20' : 'bg-blue-50/40 border-blue-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold">Manual Kaunter</span>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-800 font-mono">{stats.manualCounterCount}</p>
          <p className="text-[10px] text-blue-600 truncate">Didaftar staf fizikal</p>
        </div>

        {/* 4. MENUNGGU QR */}
        <div 
          onClick={() => { setRosterStatusFilter(rosterStatusFilter === 'pending_qr' ? 'all' : 'pending_qr'); setRosterPage(1); }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-amber-400 ${
            rosterStatusFilter === 'pending_qr' ? 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-500/20' : 'bg-amber-50/40 border-amber-200/80'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold">Menunggu QR</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-800 font-mono">{stats.pendingQrCount}</p>
          <p className="text-[10px] text-amber-600 truncate">Bilik ada, belum imbas</p>
        </div>

        {/* 5. PETI DROP-KEY */}
        <div 
          onClick={() => {
            const dropKeyTabTrigger = document.querySelector('[data-state][value="drop_key"]');
            if (dropKeyTabTrigger) dropKeyTabTrigger.click();
          }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-orange-400 ${
            stats.dropKeyCount > 0 ? 'bg-orange-50/60 border-orange-300' : 'bg-card border-border'
          }`}
        >
          <div className="flex items-center justify-between text-orange-700 mb-1">
            <span className="text-[11px] font-bold">Peti Drop-Key</span>
            <KeyRound className="w-3.5 h-3.5 text-orange-600" />
          </div>
          <p className="text-xl font-black text-orange-800 font-mono">{stats.dropKeyCount}</p>
          <p className="text-[10px] text-orange-600 truncate">{stats.dropKeyCount > 0 ? 'Perlu semakan staf' : 'Tiada permohonan'}</p>
        </div>

        {/* 6. TELAH CHECK-OUT */}
        <div 
          onClick={() => { setRosterStatusFilter(rosterStatusFilter === 'checked_out' ? 'all' : 'checked_out'); setRosterPage(1); }}
          className={`cursor-pointer border rounded-2xl p-3 shadow-xs transition-all hover:border-rose-400 ${
            rosterStatusFilter === 'checked_out' ? 'bg-rose-100/70 border-rose-500 ring-2 ring-rose-500/20' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-[11px] font-bold">Telah Keluar</span>
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <p className="text-xl font-black text-slate-800 font-mono">{stats.checkedOutCount}</p>
          <p className="text-[10px] text-slate-500 truncate">Selesai serahan</p>
        </div>
      </div>

      <Tabs defaultValue="active_residents" className="w-full">
        <TabsList className="mb-3 flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="active_residents" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Senarai Residen & Bilik</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-muted font-mono">
              {stats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-1.5 text-xs">
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>Log Check-In</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-muted font-mono">
              {displayCheckIns.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="checkouts" className="flex items-center gap-1.5 text-xs">
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Log Check-Out</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 bg-muted font-mono">
              {displayCheckOuts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="drop_key" className="flex items-center gap-1.5 text-xs">
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Permohonan Drop-Key</span>
            {pendingDropKeys.length > 0 && (
              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500 text-white animate-pulse font-bold">
                {pendingDropKeys.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RESIDEN AKTIF & STATUS BILIK */}
        <TabsContent value="active_residents" className="space-y-3">
          {/* TOOLBAR CARIAN & TAPISAN (Mencegah paparan overloaded) */}
          <div className="bg-card border rounded-2xl p-3 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama pelajar, no matrik, bilik, blok, telefon..."
                value={rosterSearch}
                onChange={(e) => {
                  setRosterSearch(e.target.value);
                  setRosterPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              {/* Tapisan Blok */}
              <Select value={rosterBlockFilter} onValueChange={(v) => { setRosterBlockFilter(v); setRosterPage(1); }}>
                <SelectTrigger className="h-9 text-xs w-[130px] bg-background">
                  <SelectValue placeholder="Semua Blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Blok</SelectItem>
                  {rosterBlocks.map(b => (
                    <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Tapisan Status / Kaedah */}
              <Select value={rosterStatusFilter} onValueChange={(v) => { setRosterStatusFilter(v); setRosterPage(1); }}>
                <SelectTrigger className="h-9 text-xs w-[190px] bg-background">
                  <SelectValue placeholder="Semua Kaedah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Semua Kaedah & Status</SelectItem>
                  <SelectItem value="qr_scan" className="text-xs">📱 Imbasan QR ({stats.qrScanCount})</SelectItem>
                  <SelectItem value="manual_counter" className="text-xs">✍️ Manual Kaunter ({stats.manualCounterCount})</SelectItem>
                  <SelectItem value="pending_qr" className="text-xs">🟡 Menunggu QR ({stats.pendingQrCount})</SelectItem>
                  <SelectItem value="pending_key" className="text-xs">⚪ Menunggu Bilik ({stats.pendingKeyCount})</SelectItem>
                  <SelectItem value="checked_out" className="text-xs">🚪 Telah Keluar ({stats.checkedOutCount})</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Filter Button */}
              {(rosterSearch || rosterBlockFilter !== 'all' || rosterStatusFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setRosterSearch('');
                    setRosterBlockFilter('all');
                    setRosterStatusFilter('all');
                    setRosterPage(1);
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* INDIKATOR HASIL CARIAN */}
          <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
            <span>
              Menunjukkan <strong className="text-foreground">{paginatedResidents.length}</strong> daripada <strong className="text-foreground">{filteredActiveResidents.length}</strong> padanan rekod
              {rosterStatusFilter !== 'all' && (
                <Badge variant="outline" className="ml-2 text-[10px] py-0">
                  Tapisan: {rosterStatusFilter}
                </Badge>
              )}
            </span>
            <span className="text-[11px]">Halaman {safeRosterPage} / {totalRosterPages || 1}</span>
          </div>

          {/* JADUAL RESIDEN KOMPAK DENGAN KAEDAH CHECK-IN JELAS */}
          {filteredActiveResidents.length === 0 ? (
            <EmptyState icon={Users} title="Tiada rekod residen sepadan dengan tapisan carian anda" />
          ) : (
            <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="text-left px-4 py-3">Pelajar</th>
                      <th className="text-left px-4 py-3">Fakulti & Tahun</th>
                      <th className="text-left px-4 py-3">Bilik & Blok</th>
                      <th className="text-left px-4 py-3">Kaedah & Status Check-In</th>
                      <th className="text-right px-4 py-3">Tindakan Kaunter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedResidents.map((st) => {
                      const method = getCheckInMethod(st, checkInsMap);
                      const isCheckedIn = method.code === 'qr_scan' || method.code === 'manual_counter';
                      const isPendingQr = method.code === 'pending_qr';
                      const isPendingKey = method.code === 'pending_room';

                      return (
                        <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground">{st.full_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {st.student_id} &bull; {st.gender || 'N/A'}
                            </div>
                            {st.phone && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Tel: {st.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="truncate max-w-[200px] text-foreground font-medium">{st.faculty || '-'}</div>
                            <div className="text-[11px] text-muted-foreground">Tahun {st.year_of_study || '1'}</div>
                          </td>
                          <td className="px-4 py-3">
                            {st.block_name && st.room_number ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono text-xs inline-block">
                                  {st.block_name} - Bilik {st.room_number}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px]">
                                Belum Ditetapkan
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {method.code === 'qr_scan' ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5 shadow-xs font-semibold">
                                  <Smartphone className="w-3 h-3" /> Imbasan QR (Kendiri)
                                </Badge>
                                {st.qr_verified_at && (
                                  <p className="text-[10px] text-emerald-700 font-medium">
                                    Disahkan {new Date(st.qr_verified_at).toLocaleDateString('ms-MY')}
                                  </p>
                                )}
                              </div>
                            ) : method.code === 'manual_counter' ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] gap-1 px-2 py-0.5 shadow-xs font-semibold">
                                  <ShieldCheck className="w-3 h-3" /> Manual Kaunter (Staf)
                                </Badge>
                                <p className="text-[10px] text-blue-700 font-medium">
                                  Disahkan secara fizikal
                                </p>
                              </div>
                            ) : isPendingQr ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] gap-1 px-2 py-0.5 font-bold">
                                  <AlertCircle className="w-3 h-3 text-amber-600" /> Menunggu QR
                                </Badge>
                                <p className="text-[10px] text-slate-500">Pintu Utama / Kaunter</p>
                              </div>
                            ) : isPendingKey ? (
                              <div className="space-y-0.5">
                                <Badge variant="outline" className="text-slate-600 border-slate-300 text-[10px] gap-1 px-2 py-0.5">
                                  <KeyRound className="w-3 h-3" /> Menunggu Kunci
                                </Badge>
                                <p className="text-[10px] text-slate-500">Prapendaftaran Awal</p>
                              </div>
                            ) : method.code === 'checked_out' ? (
                              <div className="space-y-0.5">
                                <Badge variant="secondary" className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] gap-1 px-2 py-0.5 font-semibold">
                                  <LogOut className="w-3 h-3 text-rose-600" /> Telah Keluar
                                </Badge>
                                <p className="text-[10px] text-slate-500">Kunci telah diserah</p>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                {st.room_status || 'Registered'}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {isCheckedIn ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={submitting}
                                  onClick={() => handleTriggerCheckOut(st)}
                                  className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium"
                                >
                                  <LogOut className="w-3 h-3 mr-1" /> Check-Out
                                </Button>
                              ) : isPendingQr ? (
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  <Button
                                    size="sm"
                                    disabled={submitting}
                                    onClick={() => handleQuickCounterActivation(st)}
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                    title="Sahkan pengaktifan fizikal kaunter"
                                  >
                                    <ShieldCheck className="w-3 h-3 mr-1" /> Sahkan Kaunter
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={submitting}
                                    onClick={() => handleTriggerCheckOut(st)}
                                    className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                    title="Terus Check-Out residen ini"
                                  >
                                    <LogOut className="w-3 h-3 mr-1" /> Check-Out
                                  </Button>
                                </div>
                              ) : isPendingKey ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={submitting}
                                  onClick={() => {
                                    handleSelectStudent(st);
                                    setCiForm({
                                      room_id: '',
                                      check_in_date: dateStr,
                                      check_in_time: timeStr,
                                      semester: selectedSemesterFilter,
                                      notes: ''
                                    });
                                    setCiDialog(true);
                                  }}
                                  className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-medium"
                                >
                                  <LogIn className="w-3 h-3 mr-1" /> Tetapkan Bilik
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination page={safeRosterPage} totalPages={totalRosterPages} onPageChange={setRosterPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkins">
          {displayCheckIns.length === 0 ? (
            <EmptyState icon={LogIn} title={`Tiada rekod aktif bagi ${formatSemesterName(selectedSemesterFilter)}`} />
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium text-xs">
                      <th className="text-left px-4 py-3 uppercase">Residen</th>
                      <th className="text-left px-4 py-3 uppercase">Bilik</th>
                      <th className="text-left px-4 py-3 uppercase">Blok</th>
                      <th className="text-left px-4 py-3 uppercase">Tarikh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCheckIns.map((ci) => (
                      <tr key={ci.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{ci.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ci.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ci.block_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ci.check_in_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={safeCiPage} totalPages={totalCiPages} onPageChange={setCiPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkouts">
          {displayCheckOuts.length === 0 ? (
            <EmptyState icon={LogOut} title={`Tiada rekod aktif bagi ${formatSemesterName(selectedSemesterFilter)}`} />
          ) : (
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium text-xs">
                      <th className="text-left px-4 py-3 uppercase">Residen</th>
                      <th className="text-left px-4 py-3 uppercase">Bilik</th>
                      <th className="text-left px-4 py-3 uppercase">Tarikh</th>
                      <th className="text-left px-4 py-3 uppercase">Keadaan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCheckOuts.map((co) => (
                      <tr key={co.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{co.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{co.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{co.check_out_date}</td>
                        <td className="px-4 py-3 text-muted-foreground">{co.room_condition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination page={safeCoPage} totalPages={totalCoPages} onPageChange={setCoPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="drop_key" className="space-y-4">
          {/* STATS HEADER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold">Semua Permohonan</span>
              </div>
              <p className="text-2xl font-black text-foreground font-mono">{dropKeyRequests.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Penyerahan luar waktu</p>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold">Menunggu Semakan</span>
              </div>
              <p className="text-2xl font-black text-amber-800 font-mono">{pendingDropKeys.length}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Perlu semakan staf / felo</p>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold">Diluluskan</span>
              </div>
              <p className="text-2xl font-black text-emerald-800 font-mono">
                {dropKeyRequests.filter(r => r.status === 'approved').length}
              </p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Kunci diterima & bilik dikosongkan</p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center gap-2 text-rose-700 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-semibold">Ditolak / Isu</span>
              </div>
              <p className="text-2xl font-black text-rose-800 font-mono">
                {dropKeyRequests.filter(r => r.status === 'rejected').length}
              </p>
              <p className="text-[10px] text-rose-600 mt-0.5">Kunci tidak ditemui / isu bilik</p>
            </div>
          </div>

          {/* TABLE OF DROP KEY SUBMISSIONS */}
          {dropKeyRequests.length === 0 ? (
            <EmptyState 
              icon={KeyRound} 
              title="Tiada permohonan check-out Express Drop-Key ditemui" 
              description="Pelajar boleh mengemukakan permohonan pemulangan kunci di luar waktu pejabat melalui aplikasi MyKKTF mereka."
            />
          ) : (
            <div className="bg-card border rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                      <th className="text-left px-4 py-3">Residen</th>
                      <th className="text-left px-4 py-3">Bilik Asal</th>
                      <th className="text-left px-4 py-3">Tarikh & Masa Keluar</th>
                      <th className="text-left px-4 py-3">Sebab Keluar</th>
                      <th className="text-left px-4 py-3">Bukti Foto</th>
                      <th className="text-left px-4 py-3">Status Peti Fizikal</th>
                      <th className="text-left px-4 py-3">Status Semakan</th>
                      <th className="text-right px-4 py-3">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dropKeyRequests.map((req) => {
                      const photoCount = [req.photo_room_clean, req.photo_key_tag, req.photo_wardrobe_open, req.photo_switches_off].filter(Boolean).length;
                      const isPending = req.status === 'pending_verification';
                      const isApproved = req.status === 'approved';
                      const isRejected = req.status === 'rejected';

                      return (
                        <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-foreground">{req.student_name}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{req.student_id}</div>
                            {req.phone && (
                              <div className="text-[10px] text-slate-500">Tel: {req.phone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-mono text-xs">
                              {req.block_name} - {req.room_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{req.checkout_date}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">{req.checkout_time || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-foreground font-medium">{req.reason || 'Tamat Semester'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-slate-700 bg-slate-50 border-slate-300 text-[10px] gap-1">
                              <Camera className="w-3 h-3 text-slate-500" /> {photoCount}/4 Foto
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {req.box_qr_scanned ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Diimbas di Peti
                                </Badge>
                                {req.box_qr_scanned_at && (
                                  <p className="text-[9px] text-muted-foreground font-mono">
                                    {new Date(req.box_qr_scanned_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-[10px]">
                                Belum Imbas Peti
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isPending && (
                              <Badge className="bg-amber-500 text-white text-[10px] gap-1 px-2 py-0.5">
                                <Clock className="w-3 h-3" /> Menunggu Semakan
                              </Badge>
                            )}
                            {isApproved && (
                              <div className="space-y-0.5">
                                <Badge className="bg-emerald-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                  <Check className="w-3 h-3" /> Selesai Diluluskan
                                </Badge>
                                {req.verified_by && (
                                  <p className="text-[9px] text-muted-foreground">Oleh: {req.verified_by}</p>
                                )}
                              </div>
                            )}
                            {isRejected && (
                              <div className="space-y-0.5">
                                <Badge className="bg-rose-600 text-white text-[10px] gap-1 px-2 py-0.5">
                                  <X className="w-3 h-3" /> Ditolak
                                </Badge>
                                {req.rejection_reason && (
                                  <p className="text-[9px] text-rose-600 truncate max-w-[140px]">{req.rejection_reason}</p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenDropKeyModal(req)}
                              className={`h-7 text-xs font-semibold shadow-xs ${
                                isPending 
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border'
                              }`}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {isPending ? 'Semak Permohonan' : 'Lihat Rekod'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* RECORD CHECK IN DIALOG */}
      <Dialog open={ciDialog} onOpenChange={(val) => !submitting && setCiDialog(val)}>
        <DialogContent className="max-w-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Rekod Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 relative">
            
            {/* SEMESTER: < 3 Pilihan (Kekal Dropdown Biasa) */}
            <div>
              <Label className="text-xs font-medium">Semester / Sesi Kemasukan *</Label>
              <Select disabled={submitting} value={ciForm.semester} onValueChange={(v) => setCiForm({ ...ciForm, semester: v })}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Pilih semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sem1_2526">Semester 1 Sesi 2025/2026</SelectItem>
                  <SelectItem value="Sem2_2526">Semester 2 Sesi 2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CARI PELAJAR: Data Dinamik/Banyak (Guna Carian Taip & Tapis) */}
            <div className="relative">
              <Label className="text-xs font-medium">Cari ID Pelajar / Nama *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Taip No Matrik atau Nama..." 
                  value={studentSearch} 
                  disabled={submitting}
                  onChange={(e) => { setStudentSearch(e.target.value); setShowSuggestions(true); if(selectedStudent) setSelectedStudent(null); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div key={s.id} onClick={() => !submitting && handleSelectStudent(s)} className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center">
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KAD MAKLUMAT PELAJAR DENGAN NO IC */}
            {selectedStudent && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>Nama: {selectedStudent.full_name}</span>
                  </div>
                  {(((selectedStudent.faculty || '').toLowerCase().includes('perubatan') || (selectedStudent.faculty || '').toLowerCase().includes('medic') || (selectedStudent.faculty || '').toLowerCase().includes('nursing') || (selectedStudent.faculty || '').toLowerCase().includes('kejururawatan'))) && (
                    <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0">Kes Khas: Blok A, B, C</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>ID Pelajar: <span className="text-foreground font-mono font-semibold">{selectedStudent.student_id}</span></div>
                  <div>No. IC / Pasport: <span className="text-foreground font-mono font-semibold">{selectedStudent.ic_passport || selectedStudent.ic_no || 'Tiada Maklumat'}</span></div>
                  <div>Jantina: <span className="text-foreground capitalize">{selectedStudent.gender || 'Tiada'}</span></div>
                  <div className="col-span-2 border-t pt-1.5 mt-0.5">
                    Fakulti: <span className="text-foreground font-semibold">{selectedStudent.faculty || 'Tiada Maklumat Fakulti'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PILIH BLOK: Data Dinamik (Guna Carian Taip & Tapis) */}
            <div className="relative">
              <Label className="text-xs font-medium">Pilih Blok (Taip untuk Tapis) *</Label>
              <Input 
                value={blockSearch}
                onChange={(e) => { setBlockSearch(e.target.value); setShowBlockList(true); setCiForm({ ...ciForm, room_id: '' }); setRoomSearch(''); }}
                onFocus={() => setShowBlockList(true)}
                placeholder={selectedStudent ? "Taip nama blok..." : "Sila pilih pelajar dahulu"}
                disabled={submitting || !selectedStudent}
                className="h-9 text-sm mt-1"
              />
              {showBlockList && filteredBlocksList.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-32 overflow-y-auto text-sm">
                  {filteredBlocksList.map((block) => (
                    <div 
                      key={block}
                      onClick={() => { setBlockSearch(block); setShowBlockList(false); }}
                      className="px-3 py-2 hover:bg-muted cursor-pointer"
                    >
                      {block}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PILIH BILIK: Data Dinamik (Guna Carian Taip & Tapis) */}
            <div className="relative">
              <Label className="text-xs font-medium">Tugasan Bilik (Taip No Bilik) *</Label>
              <Input 
                value={roomSearch}
                onChange={(e) => { setRoomSearch(e.target.value); setShowRoomList(true); }}
                onFocus={() => setShowRoomList(true)}
                placeholder={blockSearch ? "Taip nombor bilik..." : "Sila pilih/taip blok dahulu"}
                disabled={submitting || !blockSearch}
                className="h-9 text-sm mt-1"
              />
              {showRoomList && filteredRoomsList.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredRoomsList.map((room) => {
                    const isDisabled = getRoomStatus(room) === 'Full' || getRoomStatus(room) === 'Maintenance';
                    return (
                      <div 
                        key={room.id}
                        onClick={() => {
                          if (isDisabled) return;
                          if (validateRoomSelection(room, selectedStudent, true)) {
                            setRoomSearch(`Bilik ${room.room_number}`);
                            setCiForm({ ...ciForm, room_id: room.id });
                            setShowRoomList(false);
                          }
                        }}
                        className={`px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <span>Bilik {room.room_number}</span>
                        <span className="text-xs text-muted-foreground">({room.current_occupancy || 0}/{room.capacity || 4} Penghuni)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Tarikh Pendaftaran *</Label>
                <Input type="date" disabled={submitting} value={ciForm.check_in_date} onChange={(e) => setCiForm({ ...ciForm, check_in_date: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Masa Pendaftaran</Label>
                <Input type="time" disabled={submitting} value={ciForm.check_in_time} onChange={(e) => setCiForm({ ...ciForm, check_in_time: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Nota Tambahan</Label>
              <Textarea disabled={submitting} value={ciForm.notes} onChange={(e) => setCiForm({ ...ciForm, notes: e.target.value })} placeholder="Catatan fizikal bilik..." className="text-sm mt-1" rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => setCiDialog(false)}>Batal</Button>
              <Button type="button" size="sm" disabled={submitting} onClick={handleCheckIn}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : 'Sahkan Check-In'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* RECORD CHECK OUT DIALOG */}
      <Dialog open={coDialog} onOpenChange={(val) => !submitting && setCoDialog(val)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rekod Check Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            
            <div className="relative">
              <Label className="text-xs font-medium">Cari Residen Aktif *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Taip ID Matrik atau Nama..." 
                  value={studentSearch} 
                  disabled={submitting}
                  onChange={(e) => { setStudentSearch(e.target.value); setShowSuggestions(true); if(selectedStudent) setSelectedStudent(null); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div key={s.id} onClick={() => !submitting && handleSelectStudent(s)} className="px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center">
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedStudent && (
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-1.5 text-xs">
                <p className="font-medium text-foreground">Info Bilik Semasa Residen:</p>
                <div className="grid grid-cols-2 gap-x-2 text-muted-foreground">
                  <div>Nama: <span className="text-foreground font-medium">{selectedStudent.full_name}</span></div>
                  <div>ID: <span className="text-foreground font-mono">{selectedStudent.student_id}</span></div>
                  <div>Blok: <span className="text-foreground font-medium">{selectedStudent.block_name || 'N/A'}</span></div>
                  <div>No. Bilik: <span className="text-foreground font-mono font-bold">{selectedStudent.room_number || 'N/A'}</span></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-medium">Tarikh Keluar *</Label>
                <Input type="date" disabled={submitting} value={coForm.check_out_date} onChange={(e) => setCoForm({ ...coForm, check_out_date: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Masa Keluar</Label>
                <Input type="time" disabled={submitting} value={coForm.check_out_time} onChange={(e) => setCoForm({ ...coForm, check_out_time: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
            </div>

            {/* KEADAAN BILIK: Exactly 3 Pilihan (Kekal Dropdown Biasa) */}
            <div>
              <Label className="text-xs font-medium">Keadaan Bilik Semasa Keluar *</Label>
              <Select disabled={submitting} value={coForm.room_condition} onValueChange={(v) => setCoForm({ ...coForm, room_condition: v })}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Pilih keadaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Sangat Baik / Bersih</SelectItem>
                  <SelectItem value="Fair">Sederhana / Perlu Pembersihan Kecil</SelectItem>
                  <SelectItem value="Damaged">Mempunyai Kerosakan Fizikal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Penilaian Kerosakan (Jika Ada)</Label>
              <Textarea disabled={submitting} value={coForm.damage_assessment} onChange={(e) => setCoForm({ ...coForm, damage_assessment: e.target.value })} placeholder="Nyatakan kerosakan aset jika ada..." className="text-sm mt-1" rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => setCoDialog(false)}>Batal</Button>
              <Button type="button" size="sm" variant="destructive" disabled={submitting} onClick={handleCheckOut}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : 'Sahkan Check-Out'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CLOSING SESSION DIALOG */}
      <Dialog open={archiveDialog} onOpenChange={(val) => !archiving && setArchiveDialog(val)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tutup Sesi Akademik</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 text-sm">
            <p className="text-muted-foreground">Tindakan ini akan memindahkan semua residen berstatus <strong className="text-foreground">Checked Out</strong> ke pangkalan data <strong className="text-foreground">Alumni</strong> untuk rekod, kemudian menandakan mereka sebagai <strong className="text-foreground">Archived</strong>.</p>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" disabled={archiving} onClick={() => setArchiveDialog(false)}>Batal</Button>
              <Button type="button" size="sm" disabled={archiving} onClick={handleMassArchive}>
                {archiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengarkib...</> : 'Teruskan Arkib'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COUNTER RESIDENT ACTIVATION QR POSTER DIALOG */}
      <Dialog open={showQrPosterModal} onOpenChange={setShowQrPosterModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-slate-200 text-center shadow-2xl">
          <div className="flex items-center justify-between border-b pb-3">
            <InstitutionalDualLogo />
            <Badge className="bg-lime-500 text-slate-950 font-bold text-[10px]">
              POSTER PENGAKTIFAN
            </Badge>
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Kod QR Pengaktifan Residen KKTF
            </h3>
            <p className="text-xs text-slate-500">
              Pamerkan di Kaunter Kunci (Dewan Serbaguna) atau Pintu Masuk Blok untuk pengaktifan residen fizikal kali pertama.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border-4 border-lime-400 shadow-md inline-block mx-auto my-2">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=KKTF-ACTIVATION-OFFICIAL-2026" 
              alt="QR Rasmi Pengaktifan Residen KKTF" 
              className="w-56 h-56 mx-auto object-contain"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left space-y-1 text-xs text-slate-600">
            <p className="font-bold text-slate-800">Kod Pengaktifan Kaunter: <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">KKTF2026</code></p>
            <p className="text-[11px] text-slate-500">Pelajar boleh mengimbas QR ini atau memasukkan kod manual di atas melalui portal telefon mereka selepas menerima kunci bilik.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowQrPosterModal(false)}>
              Tutup
            </Button>
            <Button size="sm" className="bg-[#002147] hover:bg-[#001833] text-white gap-1.5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Cetak Poster
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DROP-KEY REVIEW & VERIFICATION MODAL */}
      <Dialog open={dropKeyModalOpen} onOpenChange={(val) => !submitting && setDropKeyModalOpen(val)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Semakan Check-Out Express Drop-Key
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID Permohonan: {selectedDropKey?.id}
                  </p>
                </div>
              </div>
              <Badge 
                className={
                  selectedDropKey?.status === 'approved' 
                    ? 'bg-emerald-600 text-white' 
                    : selectedDropKey?.status === 'rejected' 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-amber-500 text-white'
                }
              >
                {selectedDropKey?.status === 'approved' 
                  ? 'Diluluskan' 
                  : selectedDropKey?.status === 'rejected' 
                    ? 'Ditolak' 
                    : 'Menunggu Semakan'}
              </Badge>
            </div>
          </DialogHeader>

          {selectedDropKey && (
            <div className="space-y-4 pt-2 text-xs">
              {/* STUDENT & ROOM DETAILS */}
              <div className="bg-muted/40 border rounded-2xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Nama Pelajar</span>
                  <span className="font-bold text-foreground text-xs">{selectedDropKey.student_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">No. Matrik</span>
                  <span className="font-bold text-foreground font-mono text-xs">{selectedDropKey.student_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Bilik & Blok</span>
                  <span className="font-bold text-indigo-700 font-mono text-xs">{selectedDropKey.block_name} - {selectedDropKey.room_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tarikh & Masa</span>
                  <span className="font-bold text-foreground text-xs">{selectedDropKey.checkout_date} ({selectedDropKey.checkout_time || '-'})</span>
                </div>
              </div>

              {/* SEBAB & DROP BOX STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-card border rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Sebab Keluar & Catatan</span>
                  <p className="font-semibold text-foreground">{selectedDropKey.reason || 'Tamat Semester'}</p>
                  {selectedDropKey.notes && (
                    <p className="text-muted-foreground italic mt-1 text-[11px]">"{selectedDropKey.notes}"</p>
                  )}
                </div>

                <div className="bg-card border rounded-xl p-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Status Peti Drop-Box Fizikal</span>
                  {selectedDropKey.box_qr_scanned ? (
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mt-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Kunci Dimasukkan & QR Diimbas</span>
                      {selectedDropKey.box_qr_scanned_at && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({new Date(selectedDropKey.box_qr_scanned_at).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700 font-semibold mt-1">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Belum Diimbas di Peti (Serahan Manual)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4 FOTO BUKTI PEMERIKSAAN BILIK */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    Bukti Foto Keadaan Bilik & Serahan Kunci (4 Foto)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Klik foto untuk lihat paparan penuh</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">1. Lantai & Kebersihan</span>
                    <div className="h-28 rounded-xl border overflow-hidden bg-slate-100 relative group">
                      {selectedDropKey.photo_room_clean ? (
                        <img 
                          src={selectedDropKey.photo_room_clean} 
                          alt="Lantai Bilik" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photo_room_clean, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">Tiada Foto</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">2. Kunci & Tag Bilik</span>
                    <div className="h-28 rounded-xl border overflow-hidden bg-slate-100 relative group">
                      {selectedDropKey.photo_key_tag ? (
                        <img 
                          src={selectedDropKey.photo_key_tag} 
                          alt="Kunci & Tag" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photo_key_tag, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">Tiada Foto</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">3. Almari Terbuka</span>
                    <div className="h-28 rounded-xl border overflow-hidden bg-slate-100 relative group">
                      {selectedDropKey.photo_wardrobe_open ? (
                        <img 
                          src={selectedDropKey.photo_wardrobe_open} 
                          alt="Almari Terbuka" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photo_wardrobe_open, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">Tiada Foto</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground block truncate">4. Suis & Tingkap</span>
                    <div className="h-28 rounded-xl border overflow-hidden bg-slate-100 relative group">
                      {selectedDropKey.photo_switches_off ? (
                        <img 
                          src={selectedDropKey.photo_switches_off} 
                          alt="Suis & Tingkap" 
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform" 
                          onClick={() => window.open(selectedDropKey.photo_switches_off, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">Tiada Foto</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* INTEGRITY PLEDGE BADGE */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px]">
                  Residen telah menandatangani <strong>Akuan Rasmi Integriti Residen KKTF</strong> secara digital.
                </span>
              </div>

              {/* ACTION / VERIFICATION SECTION */}
              {selectedDropKey.status === 'pending_verification' ? (
                <div className="border-t pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold">Pengesahan Keadaan Bilik *</Label>
                      <Select 
                        value={dropKeyVerificationForm.room_condition} 
                        onValueChange={(v) => setDropKeyVerificationForm({ ...dropKeyVerificationForm, room_condition: v })}
                      >
                        <SelectTrigger className="h-9 text-xs mt-1">
                          <SelectValue placeholder="Pilih keadaan bilik" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Good">Sangat Baik / Bersih (Tiada Isu)</SelectItem>
                          <SelectItem value="Fair">Sederhana (Perlu Pembersihan Ringan)</SelectItem>
                          <SelectItem value="Damaged">Mempunyai Kerosakan Fizikal / Aset Hilang</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Catatan Kerosakan / Pemeriksaan</Label>
                      <Input 
                        placeholder="Contoh: Kunci diterima lengkap dlm peti..." 
                        value={dropKeyVerificationForm.damage_notes}
                        onChange={(e) => setDropKeyVerificationForm({ ...dropKeyVerificationForm, damage_notes: e.target.value })}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                  </div>

                  {showRejectInput && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <Label className="text-xs font-bold text-rose-800">Sebab Penolakan Permohonan *</Label>
                      <Input 
                        placeholder="Contoh: Kunci tiada dlm peti drop-box / Bilik didapati belum dikosongkan..." 
                        value={dropKeyRejectReason}
                        onChange={(e) => setDropKeyRejectReason(e.target.value)}
                        className="h-9 text-xs bg-white"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowRejectInput(false)}>Batal</Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={submitting} onClick={handleRejectDropKey}>
                          {submitting ? 'Memproses...' : 'Sahkan Tolak Permohonan'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showRejectInput && (
                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => setShowRejectInput(true)}
                        disabled={submitting}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Tolak Permohonan
                      </Button>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setDropKeyModalOpen(false)}>
                          Tutup
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          disabled={submitting} 
                          onClick={handleApproveDropKey}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          {submitting ? (
                            <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Mengesahkan...</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Sahkan Kunci & Luluskan Check-Out</>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t pt-3 flex justify-between items-center text-xs text-muted-foreground">
                  <div>
                    {selectedDropKey.status === 'approved' && (
                      <span>Disahkan oleh: <strong>{selectedDropKey.verified_by || 'Staf KKTF'}</strong> ({selectedDropKey.verified_at ? new Date(selectedDropKey.verified_at).toLocaleDateString('ms-MY') : '-'})</span>
                    )}
                    {selectedDropKey.status === 'rejected' && (
                      <span className="text-rose-600">Ditolak: {selectedDropKey.rejection_reason}</span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setDropKeyModalOpen(false)}>
                    Tutup
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DROP-KEY QR POSTER DIALOG (UNTUK DITAMPAL DI PETI KUNCI FIZIKAL) */}
      <Dialog open={showDropKeyQrModal} onOpenChange={setShowDropKeyQrModal}>
        <DialogContent className="max-w-md p-6 bg-white rounded-3xl border border-amber-300 text-center shadow-2xl">
          <div className="flex items-center justify-between border-b pb-3">
            <InstitutionalDualLogo />
            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px]">
              PETI SERAHAN KUNCI
            </Badge>
          </div>

          <div className="space-y-1 pt-2">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
              Peti Drop-Key Check-Out KKTF
            </h3>
            <p className="text-xs text-slate-500">
              Pamerkan poster ini di atas peti fizikal Drop-Key (Pondok Keselamatan / Foyer Pejabat Pentadbiran).
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border-4 border-amber-400 shadow-md inline-block mx-auto my-2">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=KKTF_DROPKEY_STATION" 
              alt="QR Rasmi Peti Drop-Key KKTF" 
              className="w-56 h-56 mx-auto object-contain"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-left space-y-1.5 text-xs text-amber-900">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-700" />
              Panduan Residen Semasa Pemulangan:
            </p>
            <ol className="list-decimal pl-4 text-[11px] text-amber-800 space-y-0.5">
              <li>Lengkapkan borang Check-Out Drop-Key di aplikasi MyKKTF beserta 4 keping foto.</li>
              <li>Masukkan kunci bersama tag bilik ke dalam peti ini.</li>
              <li>Imbas Kod QR di atas menggunakan kamera telefon untuk mengesahkan penyerahan.</li>
            </ol>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDropKeyQrModal(false)}>
              Tutup
            </Button>
            <Button size="sm" className="bg-[#002147] hover:bg-[#001833] text-white gap-1.5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Cetak Poster Peti
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showSurvey && pendingCheckout && (
        <SurveyModal isOpen={showSurvey} onClose={() => { setShowSurvey(false); setPendingCheckout(null); }} checkoutId={pendingCheckout.checkoutId} student={pendingCheckout.student} onComplete={onSurveyComplete} />
      )}
    </div>
  );
}