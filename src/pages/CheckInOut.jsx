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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, LogIn, LogOut, Search, User, Home, Sparkles, Bed, Users } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';

export default function CheckInOut() {
  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Guard state UI anti-spam click
  const [submitting, setSubmitting] = useState(false);
  
  // Dialog States
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  
  // Live Search States
  const [studentSearch, setStudentSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Room Assignment Filter States
  const [selectedBlock, setSelectedBlock] = useState('');
  const [availableBlocks, setAvailableBlocks] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  
  // Form States
  const [ciForm, setCiForm] = useState({ room_id: '', check_in_date: '', check_in_time: '', notes: '' });
  const [coForm, setCoForm] = useState({ check_out_date: '', check_out_time: '', room_condition: 'Good', damage_assessment: '', refund_amount: 0 });
  
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

  // Penapisan senarai carian pelajar
  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents([]);
      return;
    }
    const query = studentSearch.toLowerCase().trim();
    
    let baseFiltered = students.filter(s => 
      s.student_id?.toLowerCase().includes(query) || 
      s.full_name?.toLowerCase().includes(query)
    );

    if (ciDialog) {
      baseFiltered = baseFiltered.filter(s => !hasActiveRoom(s));
    } else if (coDialog) {
      baseFiltered = baseFiltered.filter(s => hasActiveRoom(s));
    }

    setFilteredStudents(baseFiltered);
  }, [studentSearch, students, ciDialog, coDialog]);

  // Ekstrak nama blok unik
  useEffect(() => {
    if (rooms.length > 0) {
      const blocks = [...new Set(rooms.map(r => r.block_name).filter(Boolean))];
      setAvailableBlocks(blocks.sort());
    }
  }, [rooms]);

  // Tapis bilik berdasarkan blok
  useEffect(() => {
    if (!selectedBlock) {
      setFilteredRooms([]);
      return;
    }
    const roomsInBlock = rooms.filter(r => r.block_name === selectedBlock);
    setFilteredRooms(roomsInBlock.sort((a, b) => String(a.room_number).localeCompare(String(b.room_number))));
  }, [selectedBlock, rooms]);

  function getRoomStatus(room) {
    if (!room) return 'Unknown';
    if (room.status === 'Maintenance' || room.room_status === 'Maintenance') return 'Maintenance';
    
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    
    if (current === 0) return 'Available';
    if (current >= capacity) return 'Full';
    return 'Occupied';
  }

  function getAvailableRooms(allRooms, student) {
    if (!student) return [];
    return allRooms.filter(room => {
      if (room.status === 'Maintenance' || room.room_status === 'Maintenance') return false;
      
      const current = room.current_occupancy || 0;
      const capacity = room.capacity || 4;
      if (current >= capacity) return false;

      const studentGender = (student.gender || '').toLowerCase().trim();
      const roomGender = (room.gender_restriction || room.gender || 'mixed').toLowerCase().trim();
      if (roomGender !== 'mixed' && studentGender && roomGender !== studentGender) {
        return false;
      }
      return true;
    });
  }

  function suggestRooms(allRooms, student) {
    const available = getAvailableRooms(allRooms, student);
    return available
      .sort((a, b) => (a.current_occupancy || 0) - (b.current_occupancy || 0))
      .slice(0, 4);
  }

  function validateRoomSelection(room, student, triggerToasts = true) {
    if (!room || !student) return false;

    if (hasActiveRoom(student)) {
      if (triggerToasts) {
        toast({ 
          title: 'Ralat Validasi', 
          description: 'Pelajar ini sudah pun mendaftar masuk (Check-In) ke bilik lain.', 
          variant: 'destructive' 
        });
      }
      return false;
    }

    if (room.status === 'Maintenance' || room.room_status === 'Maintenance') {
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

    const studentGender = (student.gender || '').toLowerCase().trim();
    const roomGender = (room.gender_restriction || room.gender || 'mixed').toLowerCase().trim();
    if (roomGender !== 'mixed' && studentGender && roomGender !== studentGender) {
      if (triggerToasts) {
        toast({ 
          title: 'Sekatan Jantina', 
          description: `Bilik ini dikhaskan untuk pelajar ${room.gender_restriction || room.gender} sahaja.`, 
          variant: 'destructive' 
        });
      }
      return false;
    }

    return true;
  }

  const getStatusCardStyles = (status) => {
    switch (status) {
      case 'Available': return 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-900';
      case 'Occupied': return 'border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-blue-900';
      case 'Full': return 'border-red-200 bg-red-50/40 opacity-60 text-red-900 cursor-not-allowed';
      case 'Maintenance': return 'border-slate-200 bg-slate-100 opacity-60 text-slate-700 cursor-not-allowed';
      default: return 'border-border bg-card';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-600 text-white';
      case 'Occupied': return 'bg-blue-600 text-white';
      case 'Full': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

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

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearch(student.student_id || '');
    setShowSuggestions(false);
  };

  const resetSearchState = () => {
    setStudentSearch('');
    setSelectedStudent(null);
    setFilteredStudents([]);
    setShowSuggestions(false);
    setSelectedBlock('');
  };

  async function handleCheckIn() {
    if (submitting) return; 
    if (!selectedStudent || !ciForm.room_id || !ciForm.check_in_date) {
      toast({ title: 'Sila pilih pelajar, bilik, dan tarikh check-in', variant: 'destructive' });
      return;
    }

    // Semakan keselamatan saat akhir pada state terkini
    const freshStudentData = students.find(s => s.id === selectedStudent.id);
    if (hasActiveRoom(freshStudentData) || hasActiveRoom(selectedStudent)) {
      toast({ 
        title: 'Sekatan Keselamatan', 
        description: 'Pelajar ini sudah mendaftar masuk sebentar tadi!', 
        variant: 'destructive' 
      });
      setCiDialog(false);
      resetSearchState();
      return;
    }

    const room = rooms.find(r => r.id === ciForm.room_id);
    if (!validateRoomSelection(room, selectedStudent, true)) return;

    setSubmitting(true); 
    try {
      // 1. Cipta rekod sejarah check-in
      await base44.entities.CheckIn.create({
        student_id: selectedStudent.id,
        room_id: ciForm.room_id,
        check_in_date: ciForm.check_in_date,
        check_in_time: ciForm.check_in_time,
        notes: ciForm.notes,
        student_name: selectedStudent.full_name || '',
        room_number: room?.room_number || '',
        block_name: room?.block_name || ''
      });

      // 2. DI SINI: Kemaskini status bilik pelajar SERTA menukar status jenis pengguna kepada 'Student'
      await base44.entities.Student.update(selectedStudent.id, {
        block_name: room.block_name || '',
        room_number: room.room_number || '',
        room_id: room.id,
        check_in_date: ciForm.check_in_date,
        room_status: 'Checked In',
        status: 'Student' 
      });

      // 3. Kemaskini kapasiti bilik semasa
      const currentCachedOccupancy = room.current_occupancy || 0;
      const newOccupancy = currentCachedOccupancy + 1;
      const capacity = room.capacity || 4;
      
      const nextStatus = room.status === 'Maintenance' || room.room_status === 'Maintenance'
        ? 'Maintenance' 
        : (newOccupancy >= capacity ? 'Full' : 'Occupied');

      await base44.entities.Room.update(room.id, {
        current_occupancy: newOccupancy,
        status: nextStatus,
        room_status: nextStatus
      });

      toast({ title: 'Berjaya', description: 'Check-in direkodkan dan status senarai telah dikemaskini.' });
      setCiDialog(false);
      resetSearchState();
      await load(); 
      dispatchGlobalRefresh();
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat rekod check-in', description: err.message, variant: 'destructive' });
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
      toast({ title: 'Pelajar tidak mempunyai rekod bilik aktif untuk didaftar keluar', variant: 'destructive' });
      return;
    }

    if (!coForm.check_out_date) {
      toast({ title: 'Sila isi ruangan wajib', variant: 'destructive' });
      return;
    }

    setSubmitting(true); 
    try {
      const room = rooms.find(r => String(r.id) === String(selectedStudent.room_id));

      // 1. Cipta rekod check-out
      const checkout = await base44.entities.CheckOut.create({
        student_id: selectedStudent.id,
        room_id: selectedStudent.room_id,
        check_out_date: coForm.check_out_date,
        check_out_time: coForm.check_out_time,
        room_condition: coForm.room_condition,
        damage_assessment: coForm.damage_assessment,
        refund_amount: coForm.refund_amount,
        student_name: selectedStudent.full_name || '',
        room_number: selectedStudent.room_number || room?.room_number || '',
        block_name: selectedStudent.block_name || room?.block_name || ''
      });

      // 2. Kosongkan perkaitan bilik pada pelajar
      await base44.entities.Student.update(selectedStudent.id, {
        block_name: null,
        room_number: null,
        room_id: null,
        room_status: 'Checked Out'
      });

      // 3. Kurangkan bilangan penghuni bilik
      if (room) {
        const currentCachedOccupancy = room.current_occupancy || 0;
        const newOccupancy = Math.max(0, currentCachedOccupancy - 1);
        
        const nextStatus = room.status === 'Maintenance' || room.room_status === 'Maintenance'
          ? 'Maintenance' 
          : (newOccupancy === 0 ? 'Available' : 'Occupied');

        await base44.entities.Room.update(room.id, {
          current_occupancy: newOccupancy,
          status: nextStatus,
          room_status: nextStatus
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

  return (
    <div>
      <PageHeader
        title="Check-In / Check-Out"
        description="Urus pergerakan residen dengan validasi pintar"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => {
              resetSearchState();
              setCiForm({ room_id: '', check_in_date: dateStr, check_in_time: timeStr, notes: '' });
              setCiDialog(true);
            }}><LogIn className="w-4 h-4 mr-1.5" /> Check In</Button>
            <Button size="sm" variant="outline" onClick={() => {
              resetSearchState();
              setCoForm({ check_out_date: dateStr, check_out_time: timeStr, room_condition: 'Good', damage_assessment: '', refund_amount: 0 });
              setCoDialog(true);
            }}><LogOut className="w-4 h-4 mr-1.5" /> Check Out</Button>
          </div>
        }
      />

      <Tabs defaultValue="checkins">
        <TabsList className="mb-4">
          <TabsTrigger value="checkins">Check-Ins</TabsTrigger>
          <TabsTrigger value="checkouts">Check-Outs</TabsTrigger>
        </TabsList>

        <TabsContent value="checkins">
          {checkIns.length === 0 ? (
            <EmptyState icon={LogIn} title="Tiada rekod check-in baru" />
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
                    {checkIns.map((ci) => (
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
          {checkOuts.length === 0 ? (
            <EmptyState icon={LogOut} title="Tiada rekod check-out baru" />
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
                    {checkOuts.map((co) => (
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

      {/* 📥 RECORD CHECK IN DIALOG */}
      <Dialog open={ciDialog} onOpenChange={(val) => !submitting && setCiDialog(val)}>
        <DialogContent className="max-w-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Rekod Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 relative">
            
            <div className="relative">
              <Label className="text-xs font-medium">Cari ID Pelajar / Staf Belum Diundi *</Label>
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
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Nama: {selectedStudent.full_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>ID: <span className="text-foreground font-mono">{selectedStudent.student_id}</span></div>
                  <div>IC/Pasport: <span className="text-foreground">{selectedStudent.ic_passport || 'N/A'}</span></div>
                  <div>Jantina: <span className="text-foreground capitalize">{selectedStudent.gender || 'N/A'}</span></div>
                  <div>Status: <span className="text-emerald-600 font-medium">Sedia Ditugaskan</span></div>
                </div>
              </div>
            )}

            {selectedStudent && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Cadangan Kekosongan Bilik</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestRooms(rooms, selectedStudent).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground col-span-2 py-1">Tiada bilik kosong bersesuaian buat masa ini.</p>
                  ) : (
                    suggestRooms(rooms, selectedStudent).map((room) => {
                      const status = getRoomStatus(room);
                      const isSelected = ciForm.room_id === room.id;
                      const currentOcc = room.current_occupancy || 0;
                      const capacity = room.capacity || 4;
                      const bedsAvailable = capacity - currentOcc;

                      return (
                        <Card 
                          key={room.id}
                          onClick={() => {
                            if (submitting) return;
                            if (status !== 'Full' && status !== 'Maintenance') {
                              if (validateRoomSelection(room, selectedStudent, true)) {
                                setCiForm({ ...ciForm, room_id: room.id });
                                const blockObj = availableBlocks.find(b => b === room.block_name);
                                if (blockObj) setSelectedBlock(blockObj);
                              }
                            }
                          }}
                          className={`cursor-pointer border transition-all text-left ${getStatusCardStyles(status)} ${isSelected ? 'ring-2 ring-primary border-transparent' : ''}`}
                        >
                          <CardContent className="p-3 flex flex-col justify-between h-full space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold font-mono">Bilik {room.room_number}</p>
                                <p className="text-[10px] opacity-80">{room.block_name}</p>
                              </div>
                              <Badge className={`text-[9px] px-1.5 py-0 rounded font-medium ${getStatusBadgeVariant(status)}`}>
                                {status}
                              </Badge>
                            </div>
                            
                            <div className="text-[11px] font-medium flex justify-between items-center pt-1.5 border-t border-black/5">
                              <span className="flex items-center gap-1 text-[10px]">
                                <Bed className="w-3 h-3" />
                                {bedsAvailable} katil kosong
                              </span>
                              <strong className="font-mono">{currentOcc}/{capacity} Penuh</strong>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <Label className="text-xs font-medium">Pilih Blok *</Label>
              <Select disabled={submitting} value={selectedBlock} onValueChange={(v) => { setSelectedBlock(v); setCiForm({ ...ciForm, room_id: '' }); }}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Pilih blok" />
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
                value={ciForm.room_id} 
                onValueChange={(v) => {
                  const targetRoom = rooms.find(r => r.id === v);
                  if (targetRoom && validateRoomSelection(targetRoom, selectedStudent, true)) {
                    setCiForm({ ...ciForm, room_id: v });
                  }
                }}
                disabled={!selectedBlock || submitting}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder={selectedBlock ? "Pilih bilik yang tersedia" : "Sila pilih blok terlebih dahulu"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map((r) => {
                    const status = getRoomStatus(r);
                    const currentOcc = r.current_occupancy || 0;
                    const capacity = r.capacity || 4;
                    return (
                      <SelectItem key={r.id} value={r.id} disabled={status === 'Full' || status === 'Maintenance'}>
                        Bilik {r.room_number} ({status} — {currentOcc}/{capacity} Katil Terisi)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Tarikh *</Label>
                <Input type="date" disabled={submitting} value={ciForm.check_in_date} onChange={(e) => setCiForm({ ...ciForm, check_in_date: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Masa</Label>
                <Input type="time" disabled={submitting} value={ciForm.check_in_time} onChange={(e) => setCiForm({ ...ciForm, check_in_time: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Nota</Label>
              <Textarea disabled={submitting} value={ciForm.notes} onChange={(e) => setCiForm({ ...ciForm, notes: e.target.value })} className="text-sm mt-1" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={submitting} onClick={() => setCiDialog(false)}>Batal</Button>
            <Button size="sm" onClick={handleCheckIn} disabled={!selectedStudent || !ciForm.room_id || submitting}>
              {submitting ? 'Merekodkan...' : 'Sahkan Check In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SurveyModal
        open={showSurvey}
        onComplete={onSurveyComplete}
        user={currentUser}
        student={pendingCheckout?.student}
        checkoutId={pendingCheckout?.checkoutId}
      />

      {/* 📤 RECORD CHECK OUT DIALOG */}
      <Dialog open={coDialog} onOpenChange={(val) => !submitting && setCoDialog(val)}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Rekod Check Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 relative">
            
            <div className="relative">
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
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Nama: {selectedStudent.full_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>ID: <span className="text-foreground font-mono">{selectedStudent.student_id}</span></div>
                  <div>Blok: <span className="text-foreground">{selectedStudent.block_name || 'N/A'}</span></div>
                  <div>Bilik: <span className="text-foreground">Bilik {selectedStudent.room_number || 'N/A'}</span></div>
                  <div>Tarikh Masuk: <span className="text-foreground">{selectedStudent.check_in_date || 'N/A'}</span></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Tarikh Check Out *</Label>
                <Input 
                  type="date" 
                  disabled={submitting} 
                  value={coForm.check_out_date} 
                  onChange={(e) => setCoForm({ ...coForm, check_out_date: e.target.value })} 
                  className="h-9 text-sm mt-1" 
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Masa Check Out</Label>
                <Input 
                  type="time" 
                  disabled={submitting} 
                  value={coForm.check_out_time} 
                  onChange={(e) => setCoForm({ ...coForm, check_out_time: e.target.value })} 
                  className="h-9 text-sm mt-1" 
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Keadaan Bilik *</Label>
              <Select 
                disabled={submitting} 
                value={coForm.room_condition} 
                onValueChange={(v) => setCoForm({ ...coForm, room_condition: v })}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Pilih keadaan bilik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Baik (Good)</SelectItem>
                  <SelectItem value="Fair">Sederhana (Fair)</SelectItem>
                  <SelectItem value="Damaged">Rosak (Damaged)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Penilaian Kerosakan (Jika ada)</Label>
              <Textarea 
                disabled={submitting} 
                value={coForm.damage_assessment} 
                onChange={(e) => setCoForm({ ...coForm, damage_assessment: e.target.value })} 
                className="text-sm mt-1" 
                rows={2} 
                placeholder="Sila nyatakan kerosakan jika ada..."
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Jumlah Pemulangan Deposit (RM)</Label>
              <Input 
                type="number" 
                disabled={submitting} 
                value={coForm.refund_amount} 
                onChange={(e) => setCoForm({ ...coForm, refund_amount: parseFloat(e.target.value) || 0 })} 
                className="h-9 text-sm mt-1" 
              />
            </div>

          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={submitting} onClick={() => setCoDialog(false)}>Batal</Button>
            <Button size="sm" variant="destructive" onClick={handleCheckOut} disabled={!selectedStudent || submitting}>
              {submitting ? 'Merekodkan...' : 'Sahkan Check Out'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}