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

  // Sync selected student data when global students array updates
  useEffect(() => {
    if (selectedStudent && students.length > 0) {
      const updatedData = students.find(s => s.id === selectedStudent.id);
      if (updatedData) {
        setSelectedStudent(updatedData);
      }
    }
  }, [students]);

  // Helper helper to accurately evaluate active room assignments
  const hasActiveRoom = (student) => {
    if (!student || !student.room_id) return false;
    const val = String(student.room_id).trim().toLowerCase();
    return val !== '' && val !== 'none' && val !== 'null';
  };

  // FIX: Enforce accurate search list criteria matching rules 2 and 7
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
      // For check-ins: ONLY display students who do NOT have an active room assignment
      baseFiltered = baseFiltered.filter(s => !hasActiveRoom(s));
    } else if (coDialog) {
      // For check-outs: ONLY display students who currently hold an active room assignment
      baseFiltered = baseFiltered.filter(s => hasActiveRoom(s));
    }

    setFilteredStudents(baseFiltered);
  }, [studentSearch, students, ciDialog, coDialog]);

  // Extract unique blocks from rooms list
  useEffect(() => {
    if (rooms.length > 0) {
      const blocks = [...new Set(rooms.map(r => r.block_name).filter(Boolean))];
      setAvailableBlocks(blocks.sort());
    }
  }, [rooms]);

  // Filter rooms based on chosen Block
  useEffect(() => {
    if (!selectedBlock) {
      setFilteredRooms([]);
      return;
    }
    const roomsInBlock = rooms.filter(r => r.block_name === selectedBlock);
    setFilteredRooms(roomsInBlock.sort((a, b) => String(a.room_number).localeCompare(String(b.room_number))));
  }, [selectedBlock, rooms]);

  // =========================================================================
  // SCHEMATIC VALIDATIONS & ASSISTANCE
  // =========================================================================

  function getRoomStatus(room) {
    if (!room) return 'Unknown';
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    
    if (current >= capacity || room.status === 'Full') return 'Full';
    if (current / capacity >= 0.8) return 'Near Full';
    if (current > 0) return 'Occupied';
    return 'Available';
  }

  function getAvailableRooms(allRooms, student) {
    if (!student) return [];
    return allRooms.filter(room => {
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
      .sort((a, b) => {
        const occA = a.current_occupancy || 0;
        const occB = b.current_occupancy || 0;
        if (occA === 0 && occB > 0) return -1;
        if (occB === 0 && occA > 0) return 1;
        return occA - occB;
      })
      .slice(0, 4);
  }

  // FIX: Validation pipeline implementing rules 1 and 3
  function validateRoomSelection(room, student, triggerToasts = true) {
    if (!room || !student) return false;

    // 1. Absolute Rule: Hard stop if student already contains an assigned active room
    if (hasActiveRoom(student)) {
      if (triggerToasts) {
        toast({ 
          title: 'Student already checked in to a room', 
          description: `Resident is already allocated to Room ${student.room_number}.`, 
          variant: 'destructive' 
        });
      }
      return false;
    }

    // 2. Room Rule: Room capacity bounds check
    const current = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (current >= capacity) {
      if (triggerToasts) toast({ title: 'Selected room is full', variant: 'destructive' });
      return false;
    }

    // 3. Gender Constraint Check
    const studentGender = (student.gender || '').toLowerCase().trim();
    const roomGender = (room.gender_restriction || room.gender || 'mixed').toLowerCase().trim();
    if (roomGender !== 'mixed' && studentGender && roomGender !== studentGender) {
      if (triggerToasts) {
        toast({ 
          title: 'Gender restriction mismatch', 
          description: `This room is configured for ${room.gender_restriction || room.gender} allocations only.`, 
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
      case 'Near Full': return 'border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-amber-900';
      case 'Full': return 'border-red-200 bg-red-50/40 opacity-60 text-red-900 cursor-not-allowed';
      default: return 'border-border bg-card';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-600 text-white';
      case 'Occupied': return 'bg-blue-600 text-white';
      case 'Near Full': return 'bg-amber-600 text-white';
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
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
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

  // FIX: Symmetrical state mutations implementing rule 4
  async function handleCheckIn() {
    if (!selectedStudent || !ciForm.room_id || !ciForm.check_in_date) {
      toast({ title: 'Please select a student, room, and check-in date', variant: 'destructive' });
      return;
    }

    // Atomic pre-flight check to prevent double assignments
    if (hasActiveRoom(selectedStudent)) {
      toast({ title: 'Student already checked in to a room', variant: 'destructive' });
      return;
    }

    const room = rooms.find(r => r.id === ciForm.room_id);
    if (!validateRoomSelection(room, selectedStudent, true)) {
      return;
    }

    try {
      // 1. Post CheckIn Record Log Entry
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

      // 2. Update Student Profile mapping attributes
      await base44.entities.Student.update(selectedStudent.id, {
        block_name: room.block_name || '',
        room_number: room.room_number || '',
        room_id: room.id
      });

      // 3. Increment Room occupancy counter accurately
      const newOcc = (room.current_occupancy || 0) + 1;
      await base44.entities.Room.update(room.id, {
        current_occupancy: newOcc,
        status: newOcc >= room.capacity ? 'Full' : 'Occupied'
      });

      toast({ title: 'Check-in recorded and profile updated successfully' });
      setCiDialog(false);
      resetSearchState();
      await load();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error recording check-in', description: err.message, variant: 'destructive' });
    }
  }

  // FIX: Symmetrical state removals implementing rule 5
  async function handleCheckOut() {
    if (!selectedStudent) {
      toast({ title: 'Please select a student to check-out', variant: 'destructive' });
      return;
    }

    if (!hasActiveRoom(selectedStudent)) {
      toast({ title: 'Student has no active room assignment to check-out from', variant: 'destructive' });
      return;
    }

    if (!coForm.check_out_date) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      const room = rooms.find(r => r.id === selectedStudent.room_id);

      // 1. Post CheckOut Record Log Entry
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

      // 2. Nullify Student allocation references completely
      await base44.entities.Student.update(selectedStudent.id, {
        block_name: '',
        room_number: '',
        room_id: 'none' // Set explicit empty string flag matching your base system configurations safely
      });

      // 3. Decrement Room occupancy counts cleanly
      if (room) {
        const newOcc = Math.max(0, (room.current_occupancy || 0) - 1);
        await base44.entities.Room.update(room.id, {
          current_occupancy: newOcc,
          status: newOcc === 0 ? 'Available' : 'Occupied'
        });
      }

      setCoDialog(false);
      setPendingCheckout({ checkoutId: checkout.id, student: { ...selectedStudent, room_id: 'none', room_number: '', block_name: '' } });
      setShowSurvey(true);
      resetSearchState();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error recording check-out', description: err.message, variant: 'destructive' });
    }
  }

  async function onSurveyComplete() {
    setShowSurvey(false);
    setPendingCheckout(null);
    toast({ title: 'Check-out recorded successfully' });
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
        description="Manage resident movements with smart administrative validations"
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
            <EmptyState icon={LogIn} title="No check-ins recorded yet" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Resident</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden sm:table-cell">Block</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden md:table-cell">Time</th>
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
            <EmptyState icon={LogOut} title="No check-outs recorded yet" />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Resident</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-wider hidden sm:table-cell">Condition</th>
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
      <Dialog open={ciDialog} onOpenChange={setCiDialog}>
        <DialogContent className="max-w-xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Record Check In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 relative">
            
            {/* Live Search Input */}
            <div className="relative">
              <Label className="text-xs font-medium">Search Unassigned Student / Staff ID *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter unassigned Student/Staff ID or Name..." 
                  value={studentSearch} 
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowSuggestions(true);
                    if(selectedStudent) setSelectedStudent(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Autocomplete Dropdown List */}
              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => handleSelectStudent(s)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Info Card */}
            {selectedStudent && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>Name: {selectedStudent.full_name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div>ID: <span className="text-foreground font-mono">{selectedStudent.student_id}</span></div>
                  <div>IC/Passport: <span className="text-foreground">{selectedStudent.ic_passport || 'N/A'}</span></div>
                  <div>Gender: <span className="text-foreground capitalize">{selectedStudent.gender || 'N/A'}</span></div>
                  <div>Status: <span className="text-emerald-600 font-medium">Clear for Assignment</span></div>
                </div>
              </div>
            )}

            {/* SMART ROOM SUGGESTIONS */}
            {selectedStudent && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Available Room Vacancies</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestRooms(rooms, selectedStudent).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground col-span-2 py-1">No vacant rooms fit current criteria configurations perfectly.</p>
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
                            if (status !== 'Full') {
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
                                <p className="text-xs font-bold font-mono">Room {room.room_number}</p>
                                <p className="text-[10px] opacity-80">{room.block_name}</p>
                              </div>
                              <Badge className={`text-[9px] px-1.5 py-0 rounded font-medium ${getStatusBadgeVariant(status)}`}>
                                {status}
                              </Badge>
                            </div>
                            
                            <div className="text-[11px] font-medium flex justify-between items-center pt-1.5 border-t border-black/5">
                              <span className="flex items-center gap-1 text-[10px]">
                                <Bed className="w-3 h-3" />
                                {bedsAvailable} beds free
                              </span>
                              <strong className="font-mono">{currentOcc}/{capacity} Full</strong>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Manual Assignment Options */}
            <div className="pt-2 border-t">
              <Label className="text-xs font-medium">Select Block *</Label>
              <Select value={selectedBlock} onValueChange={(v) => { setSelectedBlock(v); setCiForm({ ...ciForm, room_id: '' }); }}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Choose a block first" />
                </SelectTrigger>
                <SelectContent>
                  {availableBlocks.map((block) => (
                    <SelectItem key={block} value={block}>{block}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Room Assignment *</Label>
              <Select 
                value={ciForm.room_id} 
                onValueChange={(v) => {
                  const targetRoom = rooms.find(r => r.id === v);
                  if (targetRoom && validateRoomSelection(targetRoom, selectedStudent, true)) {
                    setCiForm({ ...ciForm, room_id: v });
                  }
                }}
                disabled={!selectedBlock}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder={selectedBlock ? "Select an available room" : "Please select a block first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredRooms.map((r) => {
                    const status = getRoomStatus(r);
                    const currentOcc = r.current_occupancy || 0;
                    const capacity = r.capacity || 4;
                    return (
                      <SelectItem key={r.id} value={r.id} disabled={status === 'Full'}>
                        Room {r.room_number} ({status} — {currentOcc}/{capacity} Beds filled)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Date *</Label>
                <Input type="date" value={ciForm.check_in_date} onChange={(e) => setCiForm({ ...ciForm, check_in_date: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Time</Label>
                <Input type="time" value={ciForm.check_in_time} onChange={(e) => setCiForm({ ...ciForm, check_in_time: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea value={ciForm.notes} onChange={(e) => setCiForm({ ...ciForm, notes: e.target.value })} className="text-sm mt-1" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCiDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCheckIn} disabled={!selectedStudent || !ciForm.room_id}>Record Check In</Button>
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
      <Dialog open={coDialog} onOpenChange={setCoDialog}>
        <DialogContent className="max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>Record Check Out</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 relative">
            
            {/* Live Search Input */}
            <div className="relative">
              <Label className="text-xs font-medium">Search Active Resident ID *</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Enter assigned Student/Staff ID or Name..." 
                  value={studentSearch} 
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowSuggestions(true);
                    if(selectedStudent) setSelectedStudent(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              {/* Autocomplete Dropdown List */}
              {showSuggestions && filteredStudents.length > 0 && (
                <div className="absolute z-50 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto text-sm">
                  {filteredStudents.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => handleSelectStudent(s)}
                      className="px-3 py-2 hover:bg-muted cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="font-medium">{s.student_id}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Student Profile & Active Room Validation Card */}
            {selectedStudent && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-medium text-foreground">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    <span>Name: {selectedStudent.full_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>ID: <span className="text-foreground font-mono">{selectedStudent.student_id}</span></div>
                    <div>IC/Passport: <span className="text-foreground">{selectedStudent.ic_passport || 'N/A'}</span></div>
                  </div>
                </div>

                <div className="p-3 bg-muted border border-border rounded-lg space-y-1 text-xs">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Room Assignment</Label>
                  <div className="flex items-center gap-2 text-foreground font-medium mt-1">
                    <Home className="w-3.5 h-3.5 text-amber-600" />
                    <span>Room: <strong className="text-amber-700">{selectedStudent.room_number || 'Assigned'}</strong> ({selectedStudent.block_name})</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Date *</Label>
                <Input type="date" value={coForm.check_out_date} onChange={(e) => setCoForm({ ...coForm, check_out_date: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs font-medium">Time</Label>
                <Input type="time" value={coForm.check_out_time} onChange={(e) => setCoForm({ ...coForm, check_out_time: e.target.value })} className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Room Condition</Label>
              <Select value={coForm.room_condition} onValueChange={(v) => setCoForm({ ...coForm, room_condition: v })}>
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Damage Assessment</Label>
              <Textarea value={coForm.damage_assessment} onChange={(e) => setCoForm({ ...coForm, damage_assessment: e.target.value })} className="text-sm mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs font-medium">Refund Amount (RM)</Label>
              <Input type="number" min="0" value={coForm.refund_amount} onChange={(e) => setCoForm({ ...coForm, refund_amount: Number(e.target.value) })} className="h-9 text-sm mt-1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCoDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCheckOut} disabled={!selectedStudent || !hasActiveRoom(selectedStudent)}>Record Check Out</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}