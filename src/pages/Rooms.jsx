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
  Home, Search, Plus, LayoutGrid, List, Bed, Users, 
  ShieldAlert, ChevronDown, ChevronUp, User, RotateCcw, Edit2, Trash2, ShieldCheck, Lock
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

  async function loadData() {
    try {
      setLoading(true);
      const [roomsData, studentsData, blocksData] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Student.list(),
        base44.entities.Block.list().catch(() => [])
      ]);
      setRooms(roomsData || []);
      setStudents(studentsData || []);
      setBlocks(blocksData || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading structural data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // Helper function to resolve gender precisely for filters, labels, and dropdown templates
  const resolveRoomGender = (roomInstance) => {
    if (!roomInstance) return 'mixed';
    
    // Read room direct properties cleanly
    let rawGender = roomInstance.gender_restriction || roomInstance.gender;
    
    // Fallback: If room field is empty, null, or whitespace, look into the blocks database array
    if ((!rawGender || String(rawGender).trim() === '') && roomInstance.block_id && blocks.length > 0) {
      const parentBlock = blocks.find(b => String(b.id) === String(roomInstance.block_id));
      if (parentBlock) {
        rawGender = parentBlock.gender_restriction || parentBlock.gender;
      }
    }
    
    return (rawGender || 'mixed').trim().toLowerCase();
  };

  // --- 🛑 SECURE CRUD OPERATIONS ---
  async function handleCreateRoom() {
    if (!permissions.canCreateRoom) {
      toast({ title: 'Access Denied', variant: 'destructive' });
      return;
    }
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
    if (!permissions.canEditRoom) {
      toast({ title: 'Access Denied', variant: 'destructive' });
      return;
    }
    if (!form.reason_for_correction.trim()) {
      toast({ title: 'Validation Error', description: 'Correction Reason is required.', variant: 'destructive' });
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

  // --- ⚡ O(N) HIGH PERFORMANCE FILTER SYSTEM ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const capacity = room.capacity || 4;
      const occupied = room.current_occupancy || 0;
      const calculatedStatus = getRoomStatus(room);
      const calculatedType = getRoomType(capacity);
      
      const inferredFloor = room.floor !== undefined && room.floor !== null 
        ? String(room.floor) 
        : (String(room.room_number).match(/\d/)?.[0] || '');

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!room.room_number?.toLowerCase().includes(query) && !room.block_name?.toLowerCase().includes(query)) return false;
      }

      // 🚻 CENTRALIZED GENDER FILTER EXECUTION
      const finalNormalizedGender = resolveRoomGender(room);
      if (genderFilter !== 'all') {
        if (finalNormalizedGender !== genderFilter.trim().toLowerCase()) {
          return false;
        }
      }

      if (statusFilter !== 'all' && calculatedStatus !== statusFilter) return false;
      if (blockFilter !== 'all' && room.block_name !== blockFilter) return false;
      if (floorFilter !== 'all' && inferredFloor !== floorFilter) return false;
      if (typeFilter !== 'all' && calculatedType !== typeFilter) return false;

      if (occupancyFilter !== 'all') {
        if (occupancyFilter === 'Empty' && occupied !== 0) return false;
        if (occupancyFilter === 'Partially' && (occupied === 0 || occupied >= capacity)) return false;
        if (occupancyFilter === 'Fully' && occupied !== capacity) return false;
      }

      if (statusParam === 'Available' && calculatedStatus !== 'Available') return false;
      if (statusParam === 'Occupied' && occupied === 0) return false;
      if (filterParam === 'has-empty-beds' && (capacity - occupied <= 0)) return false;

      return true;
    });
  }, [rooms, blocks, searchQuery, genderFilter, statusFilter, blockFilter, floorFilter, typeFilter, occupancyFilter, statusParam, filterParam]);

  function getRoomStatus(room) {
    if (room.status === 'Maintenance' || room.status === 'Under Maintenance') return 'Maintenance';
    const occupied = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (occupied === 0) return 'Available';
    if (occupied >= capacity) return 'Full';
    return 'Occupied';
  }

  function getRoomType(capacity) {
    if (capacity === 1) return 'Single';
    if (capacity === 2) return 'Double';
    if (capacity === 3) return 'Triple';
    if (capacity >= 4) return 'Quad';
    return 'Other';
  }

  const getRoomResidents = (roomId) => {
    return students.filter(s => String(s.room_id).trim().toLowerCase() === String(roomId).trim().toLowerCase());
  };

  const toggleExpandRoom = (roomId) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

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
      gender_restriction: resolveRoomGender(room), // Fixed: Form dropdown inherits fallback gender values on load
      status: room.status || 'Available',
      reason_for_correction: ''
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setSelectedRoomForEdit(null);
    setForm({
      room_number: '',
      block_id: '',
      block_name: '',
      capacity: 4,
      gender_restriction: 'female',
      status: 'Available',
      reason_for_correction: ''
    });
  };

  const uniqueBlocks = useMemo(() => {
    return ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))].sort();
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(room => {
      if (room.floor !== undefined && room.floor !== null) return String(room.floor);
      const match = String(room.room_number).match(/\d/);
      return match ? match[0] : null;
    }).filter(Boolean);
    return ['all', ...new Set(floors)].sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  const summaryMetrics = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Full: 0, Maintenance: 0 };
    filteredRooms.forEach(room => {
      const currentStatus = getRoomStatus(room);
      if (counts[currentStatus] !== undefined) counts[currentStatus]++;
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
            <span className="font-bold text-primary">Simulation:</span> Active Profile : <span className="font-mono font-bold">{currentUser.role}</span>
          </div>
        </div>
        <Select value={currentUser.role} onValueChange={(r) => setCurrentUser(prev => ({ ...prev, role: r }))}>
          <SelectTrigger className="h-8 text-xs w-[150px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="super_admin">⚡ Super Admin</SelectItem>
            <SelectItem value="college_admin">🏢 College Admin</SelectItem>
            <SelectItem value="staff">🔧 Staff Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <PageHeader
        title="Room Configuration Management"
        description="Configure layout restrictions and map parameters seamlessly."
        actions={
          permissions.canCreateRoom && (
            <Button size="sm" onClick={openCreateMode}>
              <Plus className="w-4 h-4 mr-1.5" /> Add New Room
            </Button>
          )
        }
      />

      {/* FILTER TOOLBAR */}
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
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male Only</SelectItem>
                  <SelectItem value="female">Female Only</SelectItem>
                  <SelectItem value="mixed">Mixed Layouts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Status Select */}
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
            {/* Block Select */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Block</Label>
              <Select value={blockFilter} onValueChange={setBlockFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueBlocks.map(b => <SelectItem key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Floor Select */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Floor</Label>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {uniqueFloors.map(f => <SelectItem key={f} value={f}>{f === 'all' ? 'All Floors' : `Floor ${f}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Type Select */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Type</Label>
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
            {/* Occupancy Select */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase">Occupancy</Label>
              <Select value={occupancyFilter} onValueChange={setOccupancyFilter}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Empty">Empty Rooms</SelectItem>
                  <SelectItem value="Partially">Partially</SelectItem>
                  <SelectItem value="Fully">Fully</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-muted">
            <div className="text-xs text-muted-foreground">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </div>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-8 text-xs">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RENDER VIEWS */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" /></div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No records found matching filters." />
      ) : viewMode === 'grid' ? (
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const capacity = room.capacity || 4;
            const occupied = room.current_occupancy || 0;
            const bedsAvailable = capacity - occupied;
            const currentStatus = getRoomStatus(room);
            
            // Fixed: Uses unified function so card UI mirrors the filter evaluation precisely
            const genderTag = resolveRoomGender(room);
            const roomResidents = getRoomResidents(room.id);
            const isExpanded = expandedRoomId === room.id;

            return (
              <Card key={room.id} className="overflow-hidden border border-border flex flex-col justify-between relative group">
                <CardContent className="p-4 space-y-3 flex-1">
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => openEditMode(room)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {permissions.canDeleteRoom && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteRoom(room.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <h3 className="text-sm font-bold font-mono">Room {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">Block {room.block_name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] uppercase ${getStatusBadgeStyles(currentStatus)}`}>
                      {currentStatus}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Occupancy</span>
                      <span className="font-mono">{occupied} / {capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${currentStatus === 'Full' ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${(occupied / capacity) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{bedsAvailable} left</span>
                    </span>
                    {/* Fixed Color Badge Mapping matching clean normalized strings */}
                    <Badge className={`text-[9px] border-0 uppercase ${genderTag === 'male' ? 'bg-blue-600 hover:bg-blue-600' : genderTag === 'female' ? 'bg-pink-600 hover:bg-pink-600' : 'bg-purple-600 hover:bg-purple-600'}`}>
                      {genderTag === 'male' ? 'Male Only' : genderTag === 'female' ? 'Female Only' : 'Mixed Layout'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t mt-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleExpandRoom(room.id)} className="w-full h-7 text-[11px] flex justify-between items-center px-2">
                      <span>Occupants ({roomResidents.length})</span>
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 text-xs space-y-1 bg-muted/20 p-2 rounded">
                        {roomResidents.map(st => <div key={st.id} className="uppercase flex items-center gap-1"><User className="w-2.5 h-2.5 text-primary" /> {st.full_name}</div>)}
                        {roomResidents.length === 0 && <p className="text-muted-foreground text-center text-[10px]">Empty</p>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-card border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground font-medium text-xs uppercase">
                <th className="text-left px-4 py-3">Room</th>
                <th className="text-left px-4 py-3">Block</th>
                <th className="text-left px-4 py-3">Restriction</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
                const currentStatus = getRoomStatus(room);
                const genderTag = resolveRoomGender(room); // Fixed here as well
                return (
                  <tr key={room.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono font-bold">Room {room.room_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">Block {room.block_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${genderTag === 'male' ? 'bg-blue-50 text-blue-700' : genderTag === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                        {genderTag === 'male' ? '👨 Male' : genderTag === 'female' ? '👩 Female' : '🚻 Mixed'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="uppercase">{currentStatus}</Badge></td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditMode(room)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 📑 REGISTER / CORRECTION DIALOG */}
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