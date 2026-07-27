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
  
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  
  // Filter Global Sesi (Kekal Dropdown < 3 pilihan)
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState('Sem1_2526');
  
  // Dialog States
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  
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
    base44.auth.me().then(setCurrentUser);
  }, []);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedStudent && students.length > 0) {
      const updatedData = students.find(s => s.id === selectedStudent.id);
      if (updatedData) {
        setSelectedStudent(updatedData);
      }
    }
  }, [students]);

  const hasActiveRoom = (student) => {
    if (!student) return false;
    if (student.room_status && String(student.room_status).trim().toLowerCase() === 'checked in') return true;
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
        resident_status: 'Active' 
      });

      const nextOcc = (room.current_occupancy || 0) + 1;
      await base44.entities.Room.update(room.id, {
        current_occupancy: nextOcc,
        status: nextOcc >= (room.capacity || 4) ? 'Full' : 'Occupied',
      });

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
        block_name: null, room_number: null, room_id: null, room_status: 'Checked Out'
      });

      if (room) {
        const nextOcc = Math.max(0, (room.current_occupancy || 0) - 1);
        await base44.entities.Room.update(room.id, {
          current_occupancy: nextOcc,
          status: nextOcc === 0 ? 'Available' : 'Occupied',
        });
      }

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

  const displayCheckIns = checkIns.filter(ci => (ci.semester || 'Sem1_2526') === selectedSemesterFilter);
  const displayCheckOuts = checkOuts.filter(co => (co.semester || 'Sem1_2526') === selectedSemesterFilter);

  return (
    <div>
      <PageHeader
        title="Check-In / Check-Out"
        description="Urus pergerakan residen dengan validasi hibrid"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="secondary" onClick={() => setArchiveDialog(true)}>
              <Archive className="w-4 h-4 mr-1.5" /> Tutup Sesi
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

      {/* FILTER SESI UTAMA: < 3 Pilihan (Kekal Dropdown Biasa) */}
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
                    {displayCheckIns.map((ci) => (
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
                    {displayCheckOuts.map((co) => (
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

      {showSurvey && pendingCheckout && (
        <SurveyModal isOpen={showSurvey} onClose={() => { setShowSurvey(false); setPendingCheckout(null); }} checkoutId={pendingCheckout.checkoutId} student={pendingCheckout.student} onComplete={onSurveyComplete} />
      )}
    </div>
  );
}