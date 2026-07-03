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
import { Archive, LogIn, LogOut, Search, User, Loader2, Calendar } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';

export default function CheckInOut() {
  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Guard state UI anti-spam click
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  
  // State Filter Semester Utama untuk Global View
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('Sem1_2526');
  
  // Dialog States
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  
  // Live Search States
  const [studentSearch, setStudentSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Room Assignment Filter States
  const [selectedBlock, setSelectedBlock] = useState('');
  
  // Form States
  const [ciForm, setCiForm] = useState({ room_id: '', check_in_date: '', check_in_time: '', semester: 'Sem1_2526', notes: '' });
  const [coForm, setCoForm] = useState({ check_out_date: '', check_out_time: '', room_condition: 'Good', semester: 'Sem1_2526', damage_assessment: '' });
  
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  useEffect(() => {
    load();
  }, []);

  // Sinkronasi data apabila state global berubah
  useEffect(() => {
    if (selectedStudent && students.length > 0) {
      const updatedData = students.find(s => s.id === selectedStudent.id);
      if (updatedData) {
        setSelectedStudent(updatedData);
      }
    }
  }, [students]);

  // Fungsi menyemak bilik aktif
  const hasActiveRoom = (student) => {
    if (!student) return false;
    if (student.room_status && String(student.room_status).trim().toLowerCase() === 'checked in') {
      return true;
    }
    if (student.room_id !== undefined && student.room_id !== null) {
      const val = String(student.room_id).trim().toLowerCase();
      if (val !== '' && val !== 'none' && val !== 'null' && val !== 'undefined') {
        return true;
      }
    }
    return false;
  };

  // Helper untuk menyemak padanan jantina (menyokong dwibahasa)
  const isGenderMatching = (studentGen, roomGen) => {
    const sGender = (studentGen || '').toLowerCase().trim();
    const rGender = (roomGen || 'mixed').toLowerCase().trim();

    if (rGender === 'mixed' || !sGender) return true;

    if (sGender === 'lelaki' || sGender === 'male') {
      return rGender === 'lelaki' || rGender === 'male';
    }

    if (sGender === 'perempuan' || sGender === 'female' || sGender === 'wanita') {
      return rGender === 'perempuan' || rGender === 'female' || rGender === 'wanita';
    }

    return rGender === sGender;
  };

  // Penapisan senarai carian pelajar
  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents([]);
      return;
    }
    const query = studentSearch.toLowerCase().trim();
    
    let baseFiltered = students.filter(s => {
      const isActiveResident = !s.resident_status || String(s.resident_status).toLowerCase() === 'active';
      const matchesSearch = s.student_id?.toLowerCase().includes(query) || s.full_name?.toLowerCase().includes(query);
      return isActiveResident && matchesSearch;
    });

    if (ciDialog) {
      baseFiltered = baseFiltered.filter(s => !hasActiveRoom(s));
    } else if (coDialog) {
      baseFiltered = baseFiltered.filter(s => hasActiveRoom(s));
    }

    setFilteredStudents(baseFiltered);
  }, [studentSearch, students, ciDialog, coDialog]);

  // JANTINA FILTER: Ekstrak nama blok unik berdasarkan jantina pelajar yang dipilih (Lelaki / Perempuan)
  const availableBlocks = useMemo(() => {
    if (rooms.length === 0) return [];
    
    let targetRooms = rooms;

    if (ciDialog && selectedStudent) {
      targetRooms = rooms.filter(room => {
        const roomGender = room.gender_restriction || room.gender || 'mixed';
        return isGenderMatching(selectedStudent.gender, roomGender);
      });
    }

    const blocks = [...new Set(targetRooms.map(r => r.block_name).filter(Boolean))];
    return blocks.sort();
  }, [rooms, selectedStudent, ciDialog]);

  // JANTINA FILTER: Tapis bilik berdasarkan blok DAN sekatan jantina pelajar secara ketat
  const filteredRooms = useMemo(() => {
    if (!selectedBlock) return [];
    
    let roomsInBlock = rooms.filter(r => r.block_name === selectedBlock);

    if (ciDialog && selectedStudent) {
      roomsInBlock = roomsInBlock.filter(room => {
        const roomGender = room.gender_restriction || room.gender || 'mixed';
        return isGenderMatching(selectedStudent.gender, roomGender);
      });
    }

    return roomsInBlock.sort((a, b) => String(a.room_number).localeCompare(String(b.room_number)));
  }, [selectedBlock, rooms, selectedStudent, ciDialog]);

  function getRoomStatus(room) {
    if (!room) return 'Unknown';
    if (room.status === 'Maintenance' ) return 'Maintenance';
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (current === 0) return 'Available';
    if (current >= capacity) return 'Full';
    return 'Occupied';
  }

  function validateRoomSelection(room, student, triggerToasts = true) {
    if (!room || !student) return false;
    if (hasActiveRoom(student)) {
      if (triggerToasts) {
        toast({ title: 'Ralat Validasi', description: 'Pelajar ini sudah pun mendaftar masuk (Check-In) ke bilik lain.', variant: 'destructive' });
      }
      return false;
    }
    if (room.status === 'Maintenance') {
      if (triggerToasts) {
        toast({ title: 'Ralat Pilihan', description: 'Bilik ini sedang dalam penyelenggaraan.', variant: 'destructive' });
      }
      return false;
    }
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (current >= capacity) {
      if (triggerToasts) {
        toast({ title: 'Bilik Penuh', description: 'Bilik ini telah mencapai kapasiti maksimum.', variant: 'destructive' });
      }
      return false;
    }
    
    const roomGender = room.gender_restriction || room.gender || 'mixed';
    if (!isGenderMatching(student.gender, roomGender)) {
      if (triggerToasts) {
        toast({ title: 'Sekatan Jantina', description: `Bilik ini dikhaskan untuk pelajar ${room.gender_restriction || room.gender} sahaja.`, variant: 'destructive' });
      }
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
    try {
      const [ci, co, s, r] = await Promise.all([
        base44.entities.CheckIn.list('-created_date'),
        base44.entities.CheckOut.list('-created_date'),
        base44.entities.Student.list(),
        base44.entities.Room.list(),
      ]);
      setCheckIns(ci);
      setCheckOuts(co);
      setStudents(s);
      setRooms(r);
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat memuatkan data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function dispatchGlobalRefresh() {
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  function resetSearchState() {
    setStudentSearch('');
    setFilteredStudents([]);
    setSelectedStudent(null);
    setShowSuggestions(false);
    setSelectedBlock('');
  }

  function handleSelectStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.student_id} - ${student.full_name}`);
    setShowSuggestions(false);
    if (coDialog && student.block_name) {
      setSelectedBlock(student.block_name);
    }
  }

  async function handleCheckIn() {
    if (submitting) return; 
    if (!selectedStudent || !ciForm.room_id || !ciForm.check_in_date) {
      toast({ title: 'Sila pilih pelajar, bilik, dan tarikh check-in', variant: 'destructive' });
      return;
    }

    const freshStudentData = students.find(s => s.id === selectedStudent.id);
    if (hasActiveRoom(freshStudentData) || hasActiveRoom(selectedStudent)) {
      toast({ title: 'Sekatan Keselamatan', description: 'Pelajar ini sudah mendaftar masuk sebentar tadi!', variant: 'destructive' });
      setCiDialog(false);
      resetSearchState();
      return;
    }

    const room = rooms.find(r => r.id === ciForm.room_id);
    if (!validateRoomSelection(room, selectedStudent, true)) return;

    setSubmitting(true); 
    try {
      if (selectedStudent.user_id) {
        await base44.entities.User.update(selectedStudent.user_id, { role: 'student' });
      } else {
        await base44.entities.Student.update(selectedStudent.id, { role: 'student' });
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
        resident_status: 'Active' 
      });

      const currentCachedOccupancy = room.current_occupancy || 0;
      const newOccupancy = currentCachedOccupancy + 1;
      const capacity = room.capacity || 4;
      const nextStatus = room.status === 'Maintenance' ? 'Maintenance' : (newOccupancy >= capacity ? 'Full' : 'Occupied');

      await base44.entities.Room.update(room.id, {
        current_occupancy: newOccupancy,
        status: nextStatus,
      });

      toast({ title: 'Berjaya', description: 'Check-in direkodkan dan peranan pengguna ditukar kepada Student.' });
      setCiDialog(false);
      resetSearchState();
      await load(); 
      dispatchGlobalRefresh();
    } catch (err) {
      console.error(err);
      const errorMessage = err.message || '';
      if (errorMessage.toLowerCase().includes('authorized') || errorMessage.toLowerCase().includes('permission')) {
        toast({ 
          title: 'Check-In Disekat (Ralat Autoriti)', 
          description: 'Sistem membatalkan check-in kerana akaun anda tidak mempunyai kebenaran (permission) untuk menukar role pengguna ini.', 
          variant: 'destructive' 
        });
      } else {
        toast({ title: 'Ralat rekod check-in', description: err.message, variant: 'destructive' });
      }
    } finally {
      setSubmitting(false); 
    }
  }

  async function handleCheckOut() {
    if (submitting) return; 
    if (!selectedStudent) {
      toast({ title: 'Sila pilih pelajar untuk check-out', variant: 'destructive' });
      return;
    }
    if (!hasActiveRoom(selectedStudent)) {
      toast({ title: 'Pelajar tidak mempunyai rekod bilik aktif', variant: 'destructive' });
      return;
    }
    if (!coForm.check_out_date) {
      toast({ title: 'Sila isi ruangan wajib', variant: 'destructive' });
      return;
    }

    setSubmitting(true); 
    try {
      const room = rooms.find(r => String(r.id) === String(selectedStudent.room_id));

      const checkout = await base44.entities.CheckOut.create({
        student_id: selectedStudent.id,
        room_id: selectedStudent.room_id,
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
        block_name: null,
        room_number: null,
        room_id: null,
        room_status: 'Checked Out'
      });

      if (room) {
        const currentCachedOccupancy = room.current_occupancy || 0;
        const newOccupancy = Math.max(0, currentCachedOccupancy - 1);
        const nextStatus = room.status === 'Maintenance' ? 'Maintenance' : (newOccupancy === 0 ? 'Available' : 'Occupied');

        await base44.entities.Room.update(room.id, {
          current_occupancy: newOccupancy,
          status: nextStatus,
        });
      }

      setCoDialog(false);
      setPendingCheckout({ checkoutId: checkout.id, student: { ...selectedStudent, room_id: null, room_number: null, block_name: null } });
      setShowSurvey(true);
      resetSearchState();
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat rekod check-out', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false); 
    }
  }

  async function handleMassArchive() {
    setArchiving(true);
    try {
      const candidates = students.filter(s => 
        s.room_status === 'Checked Out' && 
        (!s.resident_status || String(s.resident_status).toLowerCase() === 'active')
      );

      if (candidates.length === 0) {
        toast({ title: 'Tiada Pelajar', description: 'Tiada residen berstatus "Checked Out" sedia di-archive.' });
        setArchiveDialog(false);
        return;
      }

      await Promise.all(
        candidates.map(student => 
          base44.entities.Student.update(student.id, { resident_status: 'Archived' })
        )
      );

      toast({ title: 'Sesi Akademik Ditutup', description: `Berjaya mengarkibkan ${candidates.length} orang residen.` });
      setArchiveDialog(false);
      await load();
      dispatchGlobalRefresh();
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat proses arkib', description: err.message, variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  }

  async function onSurveyComplete() {
    setShowSurvey(false);
    setPendingCheckout(null);
    toast({ title: 'Check-out selesai sepenuhnya.' });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const displayCheckIns = checkIns.filter(ci => {
    const logSemester = ci.semester || 'Sem1_2526';
    if (selectedSemesterFilter === 'Sem1_2526') {
      if (logSemester !== 'Sem1_2526') return false;
      const hasSem2Record = checkIns.some(otherCi => otherCi.student_id === ci.student_id && otherCi.semester === 'Sem2_2526');
      return !hasSem2Record;
    }
    return logSemester === selectedSemesterFilter;
  });

  const displayCheckOuts = checkOuts.filter(co => {
    const logSemester = co.semester || 'Sem1_2526';
    if (selectedSemesterFilter === 'Sem1_2526') {
      if (logSemester !== 'Sem1_2526') return false;
      const hasSem2Record = checkOuts.some(otherCo => otherCo.student_id === co.student_id && otherCo.semester === 'Sem2_2526');
      return !hasSem2Record;
    }
    return logSemester === selectedSemesterFilter;
  });

  return (
    <div>
      <PageHeader
        title="Check-In / Check-Out"
        description="Urus pergerakan residen dengan validasi pintar"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => setArchiveDialog(true)}>
              <Archive className="w-4 h-4 mr-1.5" /> Tutup Sesi (Archive)
            </Button>
            <Button size="sm" onClick={() => {
              resetSearchState();
              setCiForm({ room_id: '', check_in_date: dateStr, check_in_time: timeStr, semester: selectedSemesterFilter, notes: '' });
              setCiDialog(true);
            }}><LogIn className="w-4 h-4 mr-1.5" /> Check In</Button>
            <Button size="sm" variant="outline" onClick={() => {
              resetSearchState();
              setCoForm({ check_out_date: dateStr, check_out_time: timeStr, room_condition: 'Good', semester: selectedSemesterFilter, damage_assessment: '' });
              setCoDialog(true);
            }}><LogOut className="w-4 h-4 mr-1.5" /> Check Out</Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/40 rounded-xl border border-border w-full max-w-sm">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <div className="flex-1">
          <Select value={selectedSemesterFilter} onValueChange={setSelectedSemesterFilter}>
            <SelectTrigger className="h-9 bg-card border-border">
              <SelectValue placeholder="Pilih Semester Log" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sem1_2526">Semester 1 Sesi 2025/2026</SelectItem>
              <SelectItem value="Sem2_2526">Semester 2 Sesi 2025/2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="checkins">
        <TabsList className="mb-4">
          <TabsTrigger value="checkins">Check-Ins</TabsTrigger>
          <TabsTrigger value="checkouts">Check-Outs</TabsTrigger>
        </TabsList>

        <TabsContent value="checkins">
          {displayCheckIns.length === 0 ? (
            <EmptyState icon={LogIn} title={`Tiada rekod aktif bagi ${formatSemesterName(selectedSemesterFilter)}`} />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Residen</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Bilik</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden sm:table-cell">Blok</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Tarikh</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden md:table-cell">Masa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCheckIns.map((ci) => (
                      <tr key={ci.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{ci.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ci.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{ci.block_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{ci.check_in_date}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{ci.check_in_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkouts">
          {displayCheckOuts.length === 0 ? (
            <EmptyState icon={LogOut} title={`Tiada rekod aktif bagi ${formatSemesterName(selectedSemesterFilter)}`} />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Residen</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Bilik</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Tarikh</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden sm:table-cell">Keadaan Bilik</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCheckOuts.map((co) => (
                      <tr key={co.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{co.student_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{co.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{co.check_out_date}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{co.room_condition}</td>
                      </tr>
                    ))}
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

            <div className="relative">
              <Label className="text-xs font-medium">Cari ID Pelajar / Staf *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Masukkan Matrik ID atau Nama..." 
                  value={studentSearch} 
                  disabled={submitting}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowSuggestions(true);
                    if(selectedStudent) setSelectedStudent(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => !submitting && handleSelectStudent(s)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KAD MAKLUMAT PELAJAR DENGAN NO IC, FAKULTI & BADGE KES KHAS */}
{selectedStudent && (
  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-xs">
    <div className="flex items-center justify-between font-medium text-foreground">
      <div className="flex items-center gap-2">
        <User className="w-3.5 h-3.5 text-primary" />
        <span>Nama: {selectedStudent.full_name}</span>
      </div>
      {/* Tanda khas sekiranya pelajar dari fakulti Perubatan/Nursing */}
      {(((selectedStudent.faculty || '').toLowerCase().includes('perubatan') || 
         (selectedStudent.faculty || '').toLowerCase().includes('medic') ||
         (selectedStudent.faculty || '').toLowerCase().includes('nursing') ||
         (selectedStudent.faculty || '').toLowerCase().includes('kejururawatan'))) && (
        <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0 rounded">
          Kes Khas: Blok A, B, C
        </Badge>
      )}
    </div>
    <div className="grid grid-cols-2 gap-2 text-muted-foreground">
      <div>ID Pelajar: <span className="text-foreground font-mono font-semibold">{selectedStudent.student_id}</span></div>
      <div>No. IC / Pasport: <span className="text-foreground font-mono font-semibold">{selectedStudent.ic_passport || selectedStudent.ic_no || 'Tiada Maklumat'}</span></div>
      <div>Jantina: <span className="text-foreground capitalize">{selectedStudent.gender || 'Tiada Maklumat'}</span></div>
      
      {/* Ruangan Fakulti */}
      <div className="col-span-2 border-t pt-1.5 mt-0.5">
        Fakulti: <span className="text-foreground font-semibold">{selectedStudent.faculty || 'Tiada Maklumat Fakulti'}</span>
      </div>
    </div>
  </div>
)}
            <div className="pt-2 border-t">
              <Label className="text-xs font-medium">Pilih Blok *</Label>
              <Select 
                disabled={submitting || !selectedStudent} 
                value={selectedBlock} 
                onValueChange={(v) => { setSelectedBlock(v); setCiForm({ ...ciForm, room_id: '' }); }}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder={selectedStudent ? "Pilih blok" : "Sila pilih pelajar dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {availableBlocks.map((block) => (
                    <SelectItem key={block} value={block}>{block}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Tugasan Bilik *</Label>
              <Select 
                disabled={submitting || !selectedBlock} 
                value={ciForm.room_id} 
                onValueChange={(v) => {
                  const targetRoom = rooms.find(r => r.id === v);
                  if (validateRoomSelection(targetRoom, selectedStudent, true)) {
                    setCiForm({ ...ciForm, room_id: v });
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder={selectedBlock ? "Pilih Bilik" : "Sila pilih blok dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id} disabled={getRoomStatus(room) === 'Full' || getRoomStatus(room) === 'Maintenance'}>
                      Bilik {room.room_number} ({room.current_occupancy || 0}/{room.capacity || 4} Penghuni)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Textarea disabled={submitting} value={ciForm.notes} onChange={(e) => setCiForm({ ...ciForm, notes: e.target.value })} placeholder="Catatan fizikal bilik atau kunci..." className="text-sm mt-1" rows={2} />
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
            <div>
              <Label className="text-xs font-medium">Cari Residen Aktif *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Masukkan Matrik ID atau Nama..." 
                  value={studentSearch} 
                  disabled={submitting}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowSuggestions(true);
                    if(selectedStudent) setSelectedStudent(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => !submitting && handleSelectStudent(s)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.full_name}</span>
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
              <Textarea disabled={submitting} value={coForm.damage_assessment} onChange={(e) => setCoForm({ ...coForm, damage_assessment: e.target.value })} placeholder="Nyatakan kerosakan aset seperti lampu, almari atau katil..." className="text-sm mt-1" rows={2} />
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

      {/* CLOSING SESSION / ARCHIVE DIALOG */}
      <Dialog open={archiveDialog} onOpenChange={(val) => !archiving && setArchiveDialog(val)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tutup Sesi Akademik</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Tindakan ini akan menukarkan status residen yang telah mendaftar keluar (<strong className="text-foreground">Checked Out</strong>) kepada status <strong className="text-foreground">Archived</strong>.
            </p>
            <blockquote className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900 leading-relaxed">
              Pelajar yang diarkibkan tidak akan muncul lagi di dalam senarai carian kaunter pendaftaran (Check-In) melainkan status mereka ditukar kembali kepada Aktif.
            </blockquote>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" disabled={archiving} onClick={() => setArchiveDialog(false)}>Batal</Button>
              <Button type="button" size="sm" disabled={archiving} onClick={handleMassArchive}>
                {archiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengarkib...</> : 'Teruskan Arkib'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL RESPONSIVE SURVEY MODAL */}
      {showSurvey && pendingCheckout && (
        <SurveyModal
          isOpen={showSurvey}
          onClose={() => { setShowSurvey(false); setPendingCheckout(null); }}
          checkoutId={pendingCheckout.checkoutId}
          student={pendingCheckout.student}
          onComplete={onSurveyComplete}
        />
      )}
    </div>
  );
}