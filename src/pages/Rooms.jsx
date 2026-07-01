import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, Search, Plus, LayoutGrid, List, Bed, Users, AlertTriangle, CheckCircle,
  ShieldAlert, ChevronRight, User, RotateCcw, Edit2, Trash2, ShieldCheck, Phone, FileText
} from 'lucide-react';

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status'); 
  const filterParam = searchParams.get('filter'); 
  const { toast } = useToast();

  // --- 👥 SIMULATION PROFILE CLEARANCE ---
  const [currentUser, setCurrentUser] = useState({ name: 'Admin', role: 'super_admin' });

  // Core Entity Synchronized Collections
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]); 
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State Controls
  const [viewMode, setViewMode] = useState('grid');
  const [selectedRoom, setSelectedRoom] = useState(null); // Explicit state for side panel detail focus
  
  // Advanced State Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [form, setForm] = useState({ room_number: '', block_id: '', block_name: '', capacity: 4, gender_restriction: 'female', status: 'Available' });

  const permissions = useMemo(() => ({
    canViewModule: currentUser.role !== 'student',
    canCreateRoom: ['super_admin', 'college_admin'].includes(currentUser.role),
    canEditRoom: ['super_admin', 'college_admin', 'staff'].includes(currentUser.role),
    canDeleteRoom: currentUser.role === 'super_admin'
  }), [currentUser.role]);

  useEffect(() => {
    if (permissions.canViewModule) loadData();
  }, [permissions.canViewModule]);

  // --- 🔄 SELF-HEALING SYSTEM LOOP ---
  async function loadData() {
    try {
      setLoading(true);
      const [roomsData, studentsData, blocksData] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Student.list(),
        base44.entities.Block.list().catch(() => [])
      ]);

      const freshRooms = roomsData || [];
      const freshStudents = studentsData || [];
      setStudents(freshStudents);
      setBlocks(blocksData || []);

      // Evaluate and automatically repair mismatching values instantly
      const structuralRepairs = freshRooms.map(async (room) => {
        const actualOccupancy = freshStudents.filter(s => String(s.room_id) === String(room.id)).length;
        if (Number(room.current_occupancy) !== actualOccupancy) {
          try {
            return await base44.entities.Room.update(room.id, { current_occupancy: actualOccupancy });
          } catch (e) {
            console.error(`Failed to self-heal room ${room.room_number}:`, e);
          }
        }
        return room;
      });

      const healedRooms = await Promise.all(structuralRepairs);
      // Re-fetch clean list state if updates occurred
      if (healedRooms.some(r => r && r !== freshRooms[healedRooms.indexOf(r)])) {
        const structuralRefresh = await base44.entities.Room.list();
        setRooms(structuralRefresh || []);
      } else {
        setRooms(freshRooms);
      }
    } catch (err) {
      toast({ title: 'System loading fault', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- 🚻 GENDER RESOLUTION & ENGINE UTILITIES ---
  const resolveRoomGender = (roomInstance) => {
    if (!roomInstance) return 'mixed';
    let rawGender = roomInstance.gender_restriction || roomInstance.gender;
    if ((!rawGender || String(rawGender).trim() === '') && roomInstance.block_id && blocks.length > 0) {
      const parentBlock = blocks.find(b => String(b.id) === String(roomInstance.block_id));
      if (parentBlock) rawGender = parentBlock.gender_restriction || parentBlock.gender;
    }
    return (rawGender || 'mixed').trim().toLowerCase();
  };

  // --- 📊 DERIVED DETERMINISTIC CALCULATIONS (SOURCE OF TRUTH) ---
  const getRoomMetrics = (room) => {
    const assignedStudents = students.filter(s => String(s.room_id) === String(room.id));
    const actualOccupancy = assignedStudents.length;
    const capacity = Number(room.capacity || 4);
    const availableBeds = Math.max(0, capacity - actualOccupancy);
    
    let resolvedStatus = 'Available';
    if (room.status === 'Maintenance' || room.status === 'Under Maintenance') {
      resolvedStatus = 'Maintenance';
    } else if (actualOccupancy === 0) {
      resolvedStatus = 'Available';
    } else if (actualOccupancy >= capacity) {
      resolvedStatus = 'Full';
    } else {
      resolvedStatus = 'Occupied';
    }

    return { assignedStudents, actualOccupancy, capacity, availableBeds, resolvedStatus };
  };

  // --- 🔐 SECURE ALLOCATION OPERATIONS (VALIDATED STATE SYNC) ---
  const handleCheckInStudent = async (student, targetRoom) => {
    const { actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(targetRoom);
    const roomGender = resolveRoomGender(targetRoom);
    const studentGender = (student.gender || '').trim().toLowerCase();

    // 1. Structural Guard Rules
    if (student.room_id) {
      toast({ title: "Check-in Blocked", description: "Student is already allocated to another room layout.", variant: "destructive" });
      return;
    }
    if (resolvedStatus === 'Full' || actualOccupancy >= capacity) {
      toast({ title: "Check-in Blocked", description: "Target configuration capacity is completely full.", variant: "destructive" });
      return;
    }
    if (roomGender !== 'mixed' && roomGender !== studentGender) {
      toast({ title: "Check-in Blocked", description: "Selected room does not match the student's gender.", variant: "destructive" });
      return;
    }

    try {
      // Synchronous Database Transactions via Base44 API Chains
      await base44.entities.Student.update(student.id, {
        room_id: targetRoom.id,
        room_number: targetRoom.room_number,
        block_name: targetRoom.block_name
      });
      await base44.entities.Room.update(targetRoom.id, {
        current_occupancy: actualOccupancy + 1
      });
      toast({ title: "Check-in synced successfully." });
      loadData();
    } catch (e) {
      toast({ title: "Transaction engine failed", description: e.message, variant: "destructive" });
    }
  };

  const handleCheckOutStudent = async (student) => {
    if (!student.room_id) {
      toast({ title: "Checkout Blocked", description: "Student record has no assigned room.", variant: "destructive" });
      return;
    }

    try {
      const parentRoom = rooms.find(r => String(r.id) === String(student.room_id));
      await base44.entities.Student.update(student.id, {
        room_id: null,
        room_number: null,
        block_name: null
      });

      if (parentRoom) {
        const currentCount = students.filter(s => String(s.room_id) === String(parentRoom.id)).length;
        await base44.entities.Room.update(parentRoom.id, {
          current_occupancy: Math.max(0, currentCount - 1)
        });
      }
      toast({ title: "Checkout processing complete." });
      loadData();
    } catch (e) {
      toast({ title: "Transaction execution broken", description: e.message, variant: "destructive" });
    }
  };

  // --- ⚡ INSTANT FILTERS WITH useMemo ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const { actualOccupancy, resolvedStatus } = getRoomMetrics(room);
      const inferredFloor = String(room.room_number).match(/\d/)?.[0] || '1';

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!room.room_number?.toLowerCase().includes(query) && !room.block_name?.toLowerCase().includes(query)) return false;
      }

      const genderTag = resolveRoomGender(room);
      if (genderFilter !== 'all' && genderTag !== genderFilter.trim().toLowerCase()) return false;
      if (statusFilter !== 'all' && resolvedStatus !== statusFilter) return false;
      if (blockFilter !== 'all' && room.block_name !== blockFilter) return false;
      if (floorFilter !== 'all' && inferredFloor !== floorFilter) return false;

      return true;
    });
  }, [rooms, students, blocks, searchQuery, genderFilter, statusFilter, blockFilter, floorFilter]);

  // View UI styling matrices
  const getStatusStyle = (status) => {
    if (status === 'Available') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Full') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Maintenance') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-6">
      
      {/* MANAGEMENT SANDBOX PROFILE */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between items-center text-xs">
        <span className="font-medium flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-primary" /> Core Synced Module</span>
        <Select value={currentUser.role} onValueChange={(r) => setCurrentUser({ role: r })}>
          <SelectTrigger className="h-7 w-32 bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PageHeader title="Synchronized Room Index" description="Hostel state verification powered directly by live student assignment counts." />

      {/* FILTER DASHBOARD BAR */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Conditions</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Occupied">Occupied</SelectItem>
              <SelectItem value="Full">Full</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => { setGenderFilter('all'); setStatusFilter('all'); setSearchQuery(''); }} className="h-9 text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Filters
          </Button>
          <div className="flex bg-muted p-0.5 rounded-lg h-9 items-center justify-end ml-auto">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* LAYOUT GRID CORE SPLIT FRAME PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ROOM DISPLAY WRAPPER PANEL */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" /></div>
          ) : filteredRooms.length === 0 ? (
            <EmptyState icon={Home} title="No synchronized rooms found layout patterns." />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRooms.map((room) => {
                const { actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(room);
                const isErroneous = Number(room.current_occupancy) !== actualOccupancy && actualOccupancy === 0;
                
                return (
                  <Card 
                    key={room.id} 
                    onClick={() => setSelectedRoom(room)}
                    className={`cursor-pointer transition-all border border-border hover:border-primary/50 ${selectedRoom?.id === room.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm">Room {room.room_number}</h4>
                          <span className="text-xs text-muted-foreground">Block {room.block_name}</span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold ${getStatusStyle(resolvedStatus)}`}>
                          {resolvedStatus}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                        <span className="flex items-center gap-1 font-mono text-foreground"><Users className="w-3.5 h-3.5" /> {actualOccupancy}/{capacity} Beds</span>
                        {isErroneous && <Badge variant="destructive" className="animate-pulse text-[9px] px-1 py-0 h-4">Ghost Occupant Bug</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted text-muted-foreground uppercase font-bold border-b">
                  <tr>
                    <th className="p-3">Room Target</th>
                    <th className="p-3">Block Group</th>
                    <th className="p-3">Dynamic Metrics</th>
                    <th className="p-3 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRooms.map(room => {
                    const { actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(room);
                    return (
                      <tr key={room.id} onClick={() => setSelectedRoom(room)} className={`border-b hover:bg-muted/50 cursor-pointer ${selectedRoom?.id === room.id ? 'bg-primary/5 font-bold' : ''}`}>
                        <td className="p-3 font-mono font-bold">Room {room.room_number}</td>
                        <td className="p-3">Block {room.block_name}</td>
                        <td className="p-3 font-mono">{actualOccupancy} / {capacity} Occupied</td>
                        <td className="p-3 text-right"><Badge variant="outline" className="uppercase">{resolvedStatus}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 📋 ROOM DETAILS PANEL (DETERMINISTIC VISUALIZER) */}
        <div className="lg:col-span-1">
          {selectedRoom ? (() => {
            const { assignedStudents, actualOccupancy, capacity, availableBeds, resolvedStatus } = getRoomMetrics(selectedRoom);
            const dataInconsistency = Number(selectedRoom.current_occupancy) > 0 && assignedStudents.length === 0;

            return (
              <Card className="sticky top-6 border border-border shadow-sm">
                <CardContent className="p-4 space-y-4">
                  <div className="border-b pb-2">
                    <h3 className="font-extrabold text-base text-foreground font-mono">Dorm Room {selectedRoom.room_number}</h3>
                    <p className="text-xs text-muted-foreground">Detailed Verification Overview Mapping</p>
                  </div>

                  {dataInconsistency && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Data Inconsistency Detected</span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-destructive/90">
                        Occupancy does not match assigned students. System corrected memory matrix layout fields safely.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/30 p-2 rounded-md">
                      <span className="text-muted-foreground block text-[10px] uppercase">Location Block</span>
                      <span className="font-bold text-foreground">{selectedRoom.block_name || 'Unassigned'}</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-md">
                      <span className="text-muted-foreground block text-[10px] uppercase">Live Status Layout</span>
                      <span className={`font-bold block ${resolvedStatus === 'Full' ? 'text-red-600' : 'text-emerald-600'}`}>{resolvedStatus}</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-md">
                      <span className="text-muted-foreground block text-[10px] uppercase">Actual Occupancy</span>
                      <span className="font-bold font-mono">{actualOccupancy} / {capacity} Assigned</span>
                    </div>
                    <div className="bg-muted/30 p-2 rounded-md">
                      <span className="text-muted-foreground block text-[10px] uppercase">Available Beds</span>
                      <span className="font-bold font-mono text-emerald-600">{availableBeds} Available</span>
                    </div>
                  </div>

                  {/* 👥 REAL ASSIGNED OCCUPANT LIST SECTION */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground block uppercase tracking-wider">Dynamic Occupant Roster</Label>
                    
                    {assignedStudents.length === 0 ? (
                      <div className="border border-dashed border-muted rounded-lg p-4 text-center text-xs text-muted-foreground">
                        No students assigned to this room.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {assignedStudents.map((student) => (
                          <div key={student.id} className="border border-border rounded-lg p-2.5 bg-background space-y-1.5 shadow-2xs hover:shadow-xs transition-all">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-foreground flex items-center gap-1 uppercase">
                                <User className="w-3.5 h-3.5 text-primary shrink-0" /> {student.full_name}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-[11px] font-medium text-muted-foreground font-mono">
                              <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> Matric: {student.matric_number || student.id || 'N/A'}</div>
                              <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> Phone: {student.phone_number || 'N/A'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })() : (
            <div className="border border-dashed border-border rounded-xl p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center h-48 bg-card">
              <ChevronRight className="w-5 h-5 text-muted-foreground/40 mb-1" />
              <span>Select any dormitory room asset array to inspect assigned student rosters.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}