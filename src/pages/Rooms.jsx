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
  Home, Search, Plus, LayoutGrid, List, Bed, Users, AlertTriangle,
  ShieldAlert, ChevronDown, ChevronUp, User, RotateCcw, Edit2, Trash2, ShieldCheck, Lock, Phone, FileText
} from 'lucide-react';

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status'); 
  const filterParam = searchParams.get('filter'); 
  const { toast } = useToast();

  // --- 👥 ROLE-BASED ACCESS CONTROL STATE SIMULATOR ---
  const [currentUser, setCurrentUser] = useState({
    name: 'John Doe',
    role: 'super_admin', 
    college: 'Block A'   
  });

  // Structural Core States
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]); 
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  
  // Advanced Filter System States
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  
  // Create / Edit Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); 
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState(null);
  
  // Consolidated Input Form State
  const [form, setForm] = useState({ 
    room_number: '', 
    block_id: '',
    block_name: '', 
    capacity: 4, 
    gender_restriction: 'female',
    status: 'Available',
    reason_for_correction: ''
  });

  // --- 🔐 PERMISSION EVALUATION ---
  const permissions = useMemo(() => {
    const role = currentUser.role;
    return {
      canViewModule: role !== 'student',
      canCreateRoom: ['super_admin', 'college_admin'].includes(role),
      canEditRoom: ['super_admin', 'college_admin', 'staff'].includes(role),
      canDeleteRoom: role === 'super_admin',
      canDeleteBlock: role === 'super_admin',
      
      canModifyCapacityAndGender: ['super_admin', 'college_admin'].includes(role),
      canModifyBlockLocation: ['super_admin', 'college_admin'].includes(role),
      canModifyRoomNumber: ['super_admin', 'college_admin', 'staff'].includes(role),
      canModifyStatus: ['super_admin', 'college_admin', 'staff'].includes(role)
    };
  }, [currentUser.role]);

  useEffect(() => {
    if (permissions.canViewModule) {
      loadData();
    }
  }, [permissions.canViewModule]);

  // --- 🔄 SELF-HEALING SYSTEM DATA CONVERGENCE ENGINE ---
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

      // Cross-examine values immediately on load against the Student dataset (Source of Truth)
      const executionRepairs = freshRooms.map(async (room) => {
        const actualOccupancyCount = freshStudents.filter(s => String(s.room_id) === String(room.id)).length;
        if (Number(room.current_occupancy) !== actualOccupancyCount) {
          try {
            return await base44.entities.Room.update(room.id, { current_occupancy: actualOccupancyCount });
          } catch (e) {
            console.error(`Self-healing failed to sync room data context ${room.room_number}:`, e);
          }
        }
        return room;
      });

      await Promise.all(executionRepairs);
      const structuralRefresh = await base44.entities.Room.list();
      setRooms(structuralRefresh || freshRooms);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading structural data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Helper utility to resolve gender mapping boundaries accurately across layout cards
  const resolveRoomGender = (roomInstance) => {
    if (!roomInstance) return 'mixed';
    let rawGender = roomInstance.gender_restriction || roomInstance.gender;
    if ((!rawGender || String(rawGender).trim() === '') && roomInstance.block_id && blocks.length > 0) {
      const parentBlock = blocks.find(b => String(b.id) === String(roomInstance.block_id));
      if (parentBlock) {
        rawGender = parentBlock.gender_restriction || parentBlock.gender;
      }
    }
    return (rawGender || 'mixed').trim().toLowerCase();
  };

  // --- 📊 DERIVED RECONCILIATION MATRICES (DETERMINISTIC FROM SOURCE OF TRUTH) ---
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

  function getRoomType(capacity) {
    if (capacity === 1) return 'Single';
    if (capacity === 2) return 'Double';
    if (capacity === 3) return 'Triple';
    if (capacity >= 4) return 'Quad';
    return 'Other';
  }

  // --- 🛑 SECURE CRUD OPERATIONS ---
  async function handleCreateRoom() {
    if (!permissions.canCreateRoom) return;
    try {
      await base44.entities.Room.create({
        room_number: form.room_number,
        block_id: form.block_id || null,
        block_name: form.block_name,
        capacity: Number(form.capacity),
        current_occupancy: 0,
        status: form.status,
        gender_restriction: form.gender_restriction
      });
      toast({ title: 'Room registered successfully' });
      setOpenDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpdateRoom() {
    if (!permissions.canEditRoom) return;
    if (!form.reason_for_correction.trim()) {
      toast({ title: 'Validation Rule Error', description: 'A mandatory Correction Reason is required.', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Room.update(selectedRoomForEdit.id, {
        room_number: permissions.canModifyRoomNumber ? form.room_number : selectedRoomForEdit.room_number,
        block_id: form.block_id,
        block_name: permissions.canModifyBlockLocation ? form.block_name : selectedRoomForEdit.block_name,
        capacity: permissions.canModifyCapacityAndGender ? Number(form.capacity) : Number(selectedRoomForEdit.capacity),
        gender_restriction: permissions.canModifyCapacityAndGender ? form.gender_restriction : selectedRoomForEdit.gender_restriction,
        status: permissions.canModifyStatus ? form.status : selectedRoomForEdit.status
      });
      
      toast({ title: 'Correction Processed Successfully' });
      setOpenDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      toast({ title: 'Failed to apply modifications', description: err.message, variant: 'destructive' });
    }
  }

  async function handleDeleteRoom(roomId) {
    if (!permissions.canDeleteRoom) return;
    if (!confirm('Are you certain you wish to delete this entity record permanently?')) return;
    try {
      await base44.entities.Room.delete(roomId);
      toast({ title: 'Room allocation purged successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to complete deletion', description: err.message, variant: 'destructive' });
    }
  }

  // --- ⚡ INSTANT O(N) RENDERING FILTERS PIPELINE ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const { actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(room);
      const calculatedType = getRoomType(capacity);
      const inferredFloor = String(room.room_number).match(/\d/)?.[0] || '1';

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!room.room_number?.toLowerCase().includes(query) && !room.block_name?.toLowerCase().includes(query)) return false;
      }

      // 🚻 Centralized structural gender restriction filtering logic
      const finalNormalizedGender = resolveRoomGender(room);
      if (genderFilter !== 'all' && finalNormalizedGender !== genderFilter.trim().toLowerCase()) return false;
      
      if (statusFilter !== 'all' && resolvedStatus !== statusFilter) return false;
      if (blockFilter !== 'all' && room.block_name !== blockFilter) return false;
      if (floorFilter !== 'all' && inferredFloor !== floorFilter) return false;
      if (typeFilter !== 'all' && calculatedType !== typeFilter) return false;

      if (occupancyFilter !== 'all') {
        if (occupancyFilter === 'Empty' && actualOccupancy !== 0) return false;
        if (occupancyFilter === 'Partially' && (actualOccupancy === 0 || actualOccupancy >= capacity)) return false;
        if (occupancyFilter === 'Fully' && actualOccupancy !== capacity) return false;
      }

      if (statusParam === 'Available' && resolvedStatus !== 'Available') return false;
      if (statusParam === 'Occupied' && actualOccupancy === 0) return false;
      if (filterParam === 'has-empty-beds' && (capacity - actualOccupancy <= 0)) return false;

      return true;
    });
  }, [rooms, students, blocks, searchQuery, genderFilter, statusFilter, blockFilter, floorFilter, typeFilter, occupancyFilter, statusParam, filterParam]);

  const getStatusBadgeStyles = (status) => {
    if (status === 'Available') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Full') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Maintenance') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const handleResetFilters = () => {
    setGenderFilter('all');
    setStatusFilter('all');
    setBlockFilter('all');
    setFloorFilter('all');
    setTypeFilter('all');
    setOccupancyFilter('all');
    setSearchQuery('');
  };

  const openCreateMode = () => {
    setDialogMode('create');
    resetForm();
    setOpenDialog(true);
  };

  const openEditMode = (room) => {
    setDialogMode('edit');
    setSelectedRoomForEdit(room);
    setForm({
      room_number: room.room_number || '',
      block_id: room.block_id || '',
      block_name: room.block_name || '',
      capacity: room.capacity || 4,
      gender_restriction: resolveRoomGender(room), 
      status: room.status || 'Available',
      reason_for_correction: ''
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setSelectedRoomForEdit(null);
    setForm({ room_number: '', block_id: '', block_name: '', capacity: 4, gender_restriction: 'female', status: 'Available', reason_for_correction: '' });
  };

  const uniqueBlocks = useMemo(() => ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))].sort(), [rooms]);
  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(r => String(r.room_number).match(/\d/)?.[0] || '1');
    return ['all', ...new Set(floors)].sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  const summaryMetrics = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Full: 0, Maintenance: 0 };
    filteredRooms.forEach(room => {
      const { resolvedStatus } = getRoomMetrics(room);
      if (counts[resolvedStatus] !== undefined) counts[resolvedStatus]++;
    });
    return counts;
  }, [filteredRooms]);

  if (!permissions.canViewModule) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4 text-center">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-md">
          <CardContent className="p-6 space-y-4">
            <ShieldAlert className="mx-auto w-12 h-12 text-destructive" />
            <h3 className="text-base font-bold text-foreground">Boundary Restrictions</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* CLEARANCE SANDBOX PANEL */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-primary">Simulation Environment:</span> Active Profile : <span className="font-mono font-bold bg-background px-1 py-0.5 rounded">{currentUser.role}</span>
          </div>
        </div>
        <Select value={currentUser.role} onValueChange={(r) => setCurrentUser(prev => ({ ...prev, role: r }))}>
          <SelectTrigger className="h-8 text-xs w-[150px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">⚡ Super Admin</SelectItem>
            <SelectItem value="college_admin">🏢 College Admin</SelectItem>
            <SelectItem value="staff">🔧 Staff Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PageHeader
        title="Room Configuration Management"
        description="Configure layouts and monitor occupant rosters derived from single-source truth structures live."
        actions={
          permissions.canCreateRoom && (
            <Button size="sm" onClick={openCreateMode}>
              <Plus className="w-4 h-4 mr-1.5" /> Add New Room
            </Button>
          )
        }
      />

      {/* FILTER TOOLBAR DASHBOARD */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 items-end">
            <div className="xl:col-span-2 space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Room no, block..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Gender</Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male Only</SelectItem>
                  <SelectItem value="female">Female Only</SelectItem>
                  <SelectItem value="mixed">Mixed Layouts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Full">Full</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Block Location</Label>
              <Select value={blockFilter} onValueChange={setBlockFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueBlocks.map(b => <SelectItem key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Floor Level</Label>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueFloors.map(f => <SelectItem key={f} value={f}>{f === 'all' ? 'All Floors' : `Floor ${f}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Layout Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Double">Double</SelectItem>
                  <SelectItem value="Triple">Triple</SelectItem>
                  <SelectItem value="Quad">Quad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Occupancy</Label>
              <Select value={occupancyFilter} onValueChange={setOccupancyFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Empty">Empty Rooms</SelectItem>
                  <SelectItem value="Partially">Partially Occupied</SelectItem>
                  <SelectItem value="Fully">Fully Occupied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-muted">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Showing {filteredRooms.length} of {rooms.length} rooms</span>
              <span className="text-muted-foreground/40">|</span>
              <span>Available: <span className="text-emerald-600 font-bold">{summaryMetrics.Available}</span></span>
              <span>Full: <span className="text-red-600 font-bold">{summaryMetrics.Full}</span></span>
              <span>Maintenance: <span className="text-amber-600 font-bold">{summaryMetrics.Maintenance}</span></span>
            </div>

            <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-8 text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filters
              </Button>
              <div className="flex items-center gap-0.5 bg-muted p-1 rounded-lg">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setViewMode('grid')}><LayoutGrid className="w-3.5 h-3.5" /></Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6" onClick={() => setViewMode('list')}><List className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RENDER DYNAMIC SHAPE DATA TEMPLATES */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" /></div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No records found matching tracking filters." />
      ) : viewMode === 'grid' ? (
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const { assignedStudents, actualOccupancy, capacity, availableBeds, resolvedStatus } = getRoomMetrics(room);
            const genderTag = resolveRoomGender(room);
            const isExpanded = expandedRoomId === room.id;
            
            // Critical verification safety check rule for dynamic warning display banner triggers
            const dataInconsistencyTriggered = Number(room.current_occupancy) > 0 && assignedStudents.length === 0;

            return (
              <Card key={room.id} className={`overflow-hidden border flex flex-col justify-between relative group shadow-2xs ${dataInconsistencyTriggered ? 'border-destructive/40 bg-destructive/5' : 'border-border'}`}>
                <CardContent className="p-4 space-y-3 flex-1">
                  
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-xs p-0.5 rounded-md border shadow-2xs">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditMode(room)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {permissions.canDeleteRoom && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <h3 className="text-sm font-bold font-mono">Room {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">Block {room.block_name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase font-bold ${getStatusBadgeStyles(resolvedStatus)}`}>
                      {resolvedStatus}
                    </Badge>
                  </div>

                  {/* ALARM BANNER INCONSISTENCY TRACKER TRIGGER */}
                  {dataInconsistencyTriggered && (
                    <div className="p-2 border border-destructive/30 rounded-md bg-destructive/10 text-destructive flex items-start gap-1 text-[10px] leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Data inconsistency detected. Occupancy does not match assigned students.</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span>Occupancy</span>
                      <span className="text-foreground font-mono">{actualOccupancy} / {capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${resolvedStatus === 'Full' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${(actualOccupancy / capacity) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted-foreground">Available Beds: <span className="font-bold text-foreground font-mono">{availableBeds}</span></span>
                    <Badge className={`text-[9px] border-0 uppercase ${genderTag === 'male' ? 'bg-blue-600' : genderTag === 'female' ? 'bg-pink-600' : 'bg-purple-600'}`}>
                      {genderTag === 'male' ? 'Male Only' : genderTag === 'female' ? 'Female Only' : 'Mixed Layout'}
                    </Badge>
                  </div>

                  {/* ACCORDION EXPANSION FOR DETAILED ROSTER DISPLAY */}
                  <div className="pt-2 border-t mt-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpandRoom(room.id)} className="w-full h-7 text-[11px] flex justify-between items-center px-2 bg-muted/40 hover:bg-muted">
                      <span>Occupant List ({assignedStudents.length})</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 border border-dashed rounded-lg p-2 bg-background max-h-48 overflow-y-auto text-[11px] space-y-2">
                        {assignedStudents.length === 0 ? (
                          <p className="text-muted-foreground text-center py-2">No students assigned to this room.</p>
                        ) : (
                          assignedStudents.map((student) => (
                            <div key={student.id} className="pb-1.5 last:pb-0 border-b last:border-0 border-muted font-medium text-foreground space-y-0.5">
                              <div className="font-bold uppercase text-foreground flex items-center gap-1">
                                <User className="w-3 h-3 text-primary shrink-0" /> {student.full_name}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1 pl-4 font-mono text-[10px]">
                                <FileText className="w-2.5 h-2.5" /> ID: {student.matric_number || student.id || 'N/A'}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-1 pl-4 font-mono text-[10px]">
                                <Phone className="w-2.5 h-2.5" /> Ph: {student.phone_number || 'N/A'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium text-xs uppercase">
                  <th className="text-left px-4 py-3">Room</th>
                  <th className="text-left px-4 py-3">Block</th>
                  <th className="text-left px-4 py-3">Restriction</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Capacity State</th>
                  <th className="text-right px-4 py-3">Actions Matrix</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const { assignedStudents, actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(room);
                  const genderTag = resolveRoomGender(room);
                  const isExpanded = expandedRoomId === room.id;

                  return (
                    <React.Fragment key={room.id}>
                      <tr className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">Room {room.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">Block {room.block_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${genderTag === 'male' ? 'bg-blue-50 text-blue-700' : genderTag === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                            {genderTag === 'male' ? '👨 Male' : genderTag === 'female' ? '👩 Female' : '🚻 Mixed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] font-medium uppercase ${getStatusBadgeStyles(resolvedStatus)}`}>
                            {resolvedStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{actualOccupancy} / {capacity} Beds</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => toggleExpandRoom(room.id)} className="h-7 text-xs px-2">
                              Roster ({assignedStudents.length})
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditMode(room)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="bg-card border rounded-lg p-3 max-w-2xl text-xs space-y-2 shadow-2xs">
                              <p className="font-bold text-muted-foreground border-b pb-1">Room {room.room_number} Detailed Occupant Roster</p>
                              {assignedStudents.map((st) => (
                                <div key={st.id} className="font-medium text-foreground flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 border-b border-muted/40 pb-1 last:border-0 last:pb-0">
                                  <span className="font-bold uppercase flex items-center gap-1 min-w-[150px]"><User className="w-3 h-3 text-primary" /> {st.full_name}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground">ID: {st.matric_number || st.id || 'N/A'}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground">Phone: {st.phone_number || 'N/A'}</span>
                                </div>
                              ))}
                              {assignedStudents.length === 0 && <p className="text-muted-foreground py-1">No students assigned to this room.</p>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DIALOG FORM MODAL FOR CREATE AND REGISTER MANIPULATION */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Register New Dormitory Room' : 'Execute Structural Correction'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div>
              <Label className="text-xs font-medium">Room Number *</Label>
              <Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} className="h-9 mt-1" disabled={dialogMode === 'edit' && !permissions.canModifyRoomNumber} />
            </div>
            <div>
              <Label className="text-xs font-medium">Block Name *</Label>
              <Input value={form.block_name} onChange={(e) => setForm({ ...form, block_name: e.target.value })} className="h-9 mt-1" disabled={dialogMode === 'edit' && !permissions.canModifyBlockLocation} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Capacity</Label>
                <Input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="h-9 mt-1" disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender} />
              </div>
              <div>
                <Label className="text-xs font-medium">Gender Designation *</Label>
                <Select value={form.gender_restriction} onValueChange={(v) => setForm({ ...form, gender_restriction: v })} disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">female</SelectItem>
                    <SelectItem value="male">male</SelectItem>
                    <SelectItem value="mixed">mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={dialogMode === 'edit' && !permissions.canModifyStatus}>
                <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dialogMode === 'edit' && (
              <div className="pt-2 border-t space-y-1.5">
                <Label className="text-xs font-bold">Reason for Correction *</Label>
                <Input placeholder="Provide rationale..." value={form.reason_for_correction} onChange={(e) => setForm({ ...form, reason_for_correction: e.target.value })} className="h-9 text-xs" />
              </div>
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>Cancel</Button>
            {dialogMode === 'create' ? (
              <Button size="sm" onClick={handleCreateRoom}>Save Configuration</Button>
            ) : (
              <Button size="sm" onClick={handleUpdateRoom} disabled={!form.reason_for_correction.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">Authorize Modification</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}