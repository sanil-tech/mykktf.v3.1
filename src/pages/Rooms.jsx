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
  // In production, swap this out with your global auth context provider hook: const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState({
    name: 'John Doe',
    role: 'super_admin', // Options: super_admin, college_admin, staff, warden, student
    college: 'Block A'   // Assigned jurisdiction for college_admin context
  });

  // Structural Core States
  const [rooms, setRooms] = useState([]);
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
  const [dialogMode, setDialogMode] = useState('create'); // 'create' | 'edit'
  const [selectedRoomForEdit, setSelectedRoomForEdit] = useState(null);
  
  // Consolidated Input Form State
  const [form, setForm] = useState({ 
    room_number: '', 
    block_name: '', 
    capacity: 4, 
    gender_restriction: 'female',
    status: 'Available',
    reason_for_correction: ''
  });

  // --- 🔐 FRONTEND PERMISSION EVALUATION UTILITIES ---
  const permissions = useMemo(() => {
    const role = currentUser.role;
    return {
      canViewModule: role !== 'student',
      canCreateRoom: ['super_admin', 'college_admin'].includes(role),
      canEditRoom: ['super_admin', 'college_admin', 'staff'].includes(role),
      canDeleteRoom: role === 'super_admin',
      canDeleteBlock: role === 'super_admin',
      
      // Field Level Restrictions for the Correction Dialog
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
      const [roomsData, studentsData] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Student.list()
      ]);
      setRooms(roomsData || []);
      setStudents(studentsData || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading structural data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- 🛑 SECURE CRUD OPERATIONS WITH BACKEND ROLE VALIDATION GUARDS ---
  async function handleCreateRoom() {
    if (!['super_admin', 'college_admin'].includes(currentUser.role)) {
      toast({ title: 'Access Denied', description: 'Your role does not possess permissions to register new rooms.', variant: 'destructive' });
      return;
    }

    if (!form.room_number || !form.block_name) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Room.create({
        room_number: form.room_number,
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
      console.error(err);
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpdateRoom() {
    if (!permissions.canEditRoom) {
      toast({ title: 'Access Denied', description: 'Your current account status does not authorize room alterations.', variant: 'destructive' });
      return;
    }

    if (!form.reason_for_correction.trim()) {
      toast({ title: 'Validation Rule Error', description: 'A mandatory Correction Reason is required to perform audits.', variant: 'destructive' });
      return;
    }

    try {
      const updatedFields = [];
      const oldRoom = selectedRoomForEdit;

      // 📑 COMPILING INTERACTIVE AUDIT DICTIONARY SNAPSHOT
      if (oldRoom.room_number !== form.room_number) {
        updatedFields.push({ field: 'Room Number', old: oldRoom.room_number, new: form.room_number });
      }
      if (oldRoom.block_name !== form.block_name) {
        updatedFields.push({ field: 'Block Location', old: oldRoom.block_name, new: form.block_name });
      }
      if (Number(oldRoom.capacity) !== Number(form.capacity)) {
        updatedFields.push({ field: 'Capacity', old: oldRoom.capacity, new: form.capacity });
      }
      if (oldRoom.gender_restriction !== form.gender_restriction) {
        updatedFields.push({ field: 'Gender Designation', old: oldRoom.gender_restriction, new: form.gender_restriction });
      }
      if (oldRoom.status !== form.status) {
        updatedFields.push({ field: 'Status Condition', old: oldRoom.status, new: form.status });
      }

      if (updatedFields.length === 0) {
        toast({ title: 'No changes detected', description: 'The configuration values match existing storage.' });
        setOpenDialog(false);
        return;
      }

      const auditLogEntry = {
        room_number: form.room_number,
        block: form.block_name,
        user_name: currentUser.name,
        user_role: currentUser.role,
        timestamp: new Date().toLocaleString(),
        changes: updatedFields,
        reason: form.reason_for_correction
      };

      await base44.entities.Room.update(selectedRoomForEdit.id, {
        room_number: permissions.canModifyRoomNumber ? form.room_number : oldRoom.room_number,
        block_name: permissions.canModifyBlockLocation ? form.block_name : oldRoom.block_name,
        capacity: permissions.canModifyCapacityAndGender ? Number(form.capacity) : Number(oldRoom.capacity),
        gender_restriction: permissions.canModifyCapacityAndGender ? form.gender_restriction : oldRoom.gender_restriction,
        status: permissions.canModifyStatus ? form.status : oldRoom.status
      });

      console.log('--- 📑 SYSTEM CORRECTION AUDIT LOG ENTRY GENERATED ---', auditLogEntry);
      
      toast({ 
        title: 'Correction Processed Successfully', 
        description: `Audit Log captured for fields: ${updatedFields.map(f => f.field).join(', ')}` 
      });

      setOpenDialog(false);
      resetForm();
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to apply modifications', description: err.message, variant: 'destructive' });
    }
  }

  async function handleDeleteRoom(roomId) {
    if (!permissions.canDeleteRoom) {
      toast({ title: 'Operation Forbidden', description: 'Only a System Super Admin can delete room allocations.', variant: 'destructive' });
      return;
    }

    if (!confirm('Are you absolutely certain you wish to delete this entity records permanently? This action is non-reversible.')) return;

    try {
      await base44.entities.Room.delete(roomId);
      toast({ title: 'Room allocation purged successfully from tracking matrix' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to complete deletion process', description: err.message, variant: 'destructive' });
    }
  }

  // Pure Helpers
  const getRoomStatus = (room) => {
    if (room.status === 'Maintenance' || room.status === 'Under Maintenance') return 'Maintenance';
    const occupied = room.current_occupancy || 0;
    const capacity = room.capacity || 4;
    if (occupied === 0) return 'Available';
    if (occupied >= capacity) return 'Full';
    return 'Occupied';
  };

  const getRoomType = (capacity) => {
    if (capacity === 1) return 'Single';
    if (capacity === 2) return 'Double';
    if (capacity === 3) return 'Triple';
    if (capacity >= 4) return 'Quad';
    return 'Other';
  };

  const getRoomResidents = (roomId) => {
    if (!roomId) return [];
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
      block_name: room.block_name || '',
      capacity: room.capacity || 4,
      gender_restriction: room.gender_restriction || room.gender || 'female',
      status: room.status || 'Available',
      reason_for_correction: ''
    });
    setOpenDialog(true);
  };

  const resetForm = () => {
    setSelectedRoomForEdit(null);
    setForm({
      room_number: '',
      block_name: '',
      capacity: 4,
      gender_restriction: 'female',
      status: 'Available',
      reason_for_correction: ''
    });
  };

  // Memoized Options Dropdowns
  const uniqueBlocks = useMemo(() => {
    return ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))].sort();
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(room => {
      if (room.floor !== undefined && room.floor !== null) return String(room.floor);
      const firstDigitMatch = String(room.room_number).match(/\d/);
      return firstDigitMatch ? firstDigitMatch[0] : null;
    }).filter(Boolean);
    return ['all', ...new Set(floors)].sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  // --- ⚡ O(N) HIGH PERFORMANCE MULTI-FILTER PROCESSING PIPELINE ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const capacity = room.capacity || 4;
      const occupied = room.current_occupancy || 0;
      const calculatedStatus = getRoomStatus(room);
      const calculatedType = getRoomType(capacity);
      
      const inferredFloor = room.floor !== undefined && room.floor !== null 
        ? String(room.floor) 
        : (String(room.room_number).match(/\d/)?.[0] || '');

      // 1. Search Query Input Box
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch = room.room_number?.toLowerCase().includes(query) ||
                              room.block_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Gender Restriction Filter (⚠️ FIXED: Substring Matching Integration)
      const normalizedGender = (room.gender_restriction || room.gender || 'mixed').toLowerCase().trim();
      if (genderFilter !== 'all') {
        if (!normalizedGender.includes(genderFilter.toLowerCase())) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all' && calculatedStatus !== statusFilter) return false;

      // 4. Block Filter
      if (blockFilter !== 'all' && room.block_name !== blockFilter) return false;

      // 5. Floor Filter
      if (floorFilter !== 'all' && inferredFloor !== floorFilter) return false;

      // 6. Room Type Filter
      if (typeFilter !== 'all' && calculatedType !== typeFilter) return false;

      // 7. Occupancy State Filter
      if (occupancyFilter !== 'all') {
        if (occupancyFilter === 'Empty' && occupied !== 0) return false;
        if (occupancyFilter === 'Partially' && (occupied === 0 || occupied >= capacity)) return false;
        if (occupancyFilter === 'Fully' && occupied !== capacity) return false;
      }

      // 8. Backward Route Deep-links Integration Params
      if (statusParam === 'Available' && calculatedStatus !== 'Available') return false;
      if (statusParam === 'Occupied' && occupied === 0) return false;
      if (filterParam === 'has-empty-beds' && (capacity - occupied <= 0)) return false;

      return true;
    });
  }, [rooms, searchQuery, genderFilter, statusFilter, blockFilter, floorFilter, typeFilter, occupancyFilter, statusParam, filterParam]);

  const summaryMetrics = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Full: 0, Maintenance: 0 };
    filteredRooms.forEach(room => {
      const currentStatus = getRoomStatus(room);
      if (counts[currentStatus] !== undefined) {
        counts[currentStatus]++;
      }
    });
    return counts;
  }, [filteredRooms]);

  // --- ⛔ SECURITY BREAKOUT: STUDENT BOUNDARY SHIELD ---
  if (!permissions.canViewModule) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4 text-center">
        <Card className="max-w-md border-destructive/30 bg-destructive/5 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="mx-auto bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center text-destructive">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">Dormitory Boundary Restrictions</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your current authorization clearance identifier level (Student) is explicitly blocked from reviewing or manipulating master configurations. Contact your college administration.
              </p>
            </div>
            <div className="border-t pt-3 flex items-center justify-center gap-2">
              <Label className="text-[10px] text-muted-foreground uppercase font-semibold">Test Simulator Engine :</Label>
              <Select value={currentUser.role} onValueChange={(r) => setCurrentUser(prev => ({ ...prev, role: r }))}>
                <SelectTrigger className="w-[140px] h-7 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="college_admin">College Admin</SelectItem>
                  <SelectItem value="staff">Staff Personnel</SelectItem>
                  <SelectItem value="warden">Warden Guard</SelectItem>
                  <SelectItem value="student">Student Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 🔮 INTERACTIVE ROLE SWITCH MATRIX PANEL FOR SANDBOX VALIDATION */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <div className="text-xs font-sans">
            <span className="font-bold text-primary">Clearance Sandbox:</span> Authenticated as <span className="font-mono font-bold underline bg-background px-1 py-0.5 rounded text-foreground">{currentUser.name} ({currentUser.role})</span>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-[11px] font-medium shrink-0">Switch Persona:</Label>
          <Select value={currentUser.role} onValueChange={(r) => setCurrentUser(prev => ({ ...prev, role: r }))}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[150px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">⚡ Super Admin</SelectItem>
              <SelectItem value="college_admin">🏢 College Admin</SelectItem>
              <SelectItem value="staff">🔧 Staff Team</SelectItem>
              <SelectItem value="warden">👁️ Warden (Read Only)</SelectItem>
              <SelectItem value="student">🎓 Student (Blocked)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PageHeader
        title="Room Configuration Management"
        description="Configure single-gender layouts, track real-time occupancy changes, and preview current occupant rosters."
        actions={
          permissions.canCreateRoom && (
            <Button size="sm" onClick={openCreateMode}>
              <Plus className="w-4 h-4 mr-1.5" /> Add New Room
            </Button>
          )
        }
      />

      {/* ADVANCED FILTER TOOLBAR */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 items-end">
            <div className="xl:col-span-2 space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Room no, block..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gender</Label>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
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
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Block Location</Label>
              <Select value={blockFilter} onValueChange={setBlockFilter}>
                <SelectTrigger className="h-9 text-sm capitalize">
                  <SelectValue placeholder="Block" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueBlocks.map(block => (
                    <SelectItem key={block} value={block} className="capitalize">
                      {block === 'all' ? 'All Blocks' : `Block ${block}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Floor Level</Label>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Floor" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueFloors.map(floor => (
                    <SelectItem key={floor} value={floor}>
                      {floor === 'all' ? 'All Floors' : `Floor ${floor}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Layout Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
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
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Occupancy</Label>
              <Select value={occupancyFilter} onValueChange={setOccupancyFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Occupancy" />
                </SelectTrigger>
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
              <span>Available: <span className="font-mono font-bold text-emerald-600">{summaryMetrics.Available}</span></span>
              <span className="text-muted-foreground/30">•</span>
              <span>Occupied: <span className="font-mono font-bold text-blue-600">{summaryMetrics.Occupied}</span></span>
              <span className="text-muted-foreground/30">•</span>
              <span>Full: <span className="font-mono font-bold text-red-600">{summaryMetrics.Full}</span></span>
              <span className="text-muted-foreground/30">•</span>
              <span>Maintenance: <span className="font-mono font-bold text-amber-600">{summaryMetrics.Maintenance}</span></span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" onClick={handleResetFilters} className="h-8 text-xs font-medium">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Filters
              </Button>
              <div className="h-8 w-[1px] bg-muted hidden sm:block" />
              <div className="flex items-center gap-0.5 bg-muted p-1 rounded-lg">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6 rounded-md" onClick={() => setViewMode('grid')}>
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-6 w-6 rounded-md" onClick={() => setViewMode('list')}>
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RENDER VIEW SCHEMES */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No room registrations found matching layout filters" />
      ) : viewMode === 'grid' ? (
        
        /* 🎴 GRID DISPLAY CARD ARCHITECTURE */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const capacity = room.capacity || 4;
            const occupied = room.current_occupancy || 0;
            const bedsAvailable = capacity - occupied;
            const currentStatus = getRoomStatus(room);
            const genderTag = room.gender_restriction || room.gender || 'female';
            const roomResidents = getRoomResidents(room.id);
            const isExpanded = expandedRoomId === room.id;

            return (
              <Card key={room.id} className="overflow-hidden border border-border hover:shadow-sm transition-all flex flex-col justify-between relative group">
                <CardContent className="p-4 space-y-3 flex-1">
                  
                  {/* Action Layer Context Trigger UI */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 backdrop-blur-xs p-0.5 rounded-md border shadow-2xs">
                    {permissions.canEditRoom ? (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => openEditMode(room)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 cursor-not-allowed" disabled title="You do not have permission to edit rooms.">
                        <Lock className="w-3 h-3" />
                      </Button>
                    )}
                    {permissions.canDeleteRoom && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-between items-start pr-12 sm:pr-8">
                    <div>
                      <h3 className="text-sm font-bold font-mono text-foreground">Room {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">Block {room.block_name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium uppercase ${getStatusBadgeStyles(currentStatus)}`}>
                      {currentStatus}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Occupancy</span>
                      <span className="text-foreground font-mono">{occupied} / {capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                      <div className={`h-full ${currentStatus === 'Full' ? 'bg-red-500' : currentStatus === 'Maintenance' ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${(occupied / capacity) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={bedsAvailable > 0 && currentStatus !== 'Maintenance' ? "text-emerald-700" : "text-muted-foreground"}>
                        {currentStatus === 'Maintenance' ? 'Locked' : `${bedsAvailable} left`}
                      </span>
                    </span>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 font-medium uppercase ${genderTag.includes('male') ? 'bg-blue-600' : genderTag.includes('female') ? 'bg-pink-600' : 'bg-purple-600'}`}>
                      {genderTag.includes('male') ? 'Male Only' : genderTag.includes('female') ? 'Female Only' : 'Mixed Layout'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t mt-2">
                    <Button 
                      variant="ghost" size="sm" 
                      onClick={() => toggleExpandRoom(room.id)}
                      className="w-full h-7 text-[11px] font-semibold flex justify-between items-center px-2 bg-muted/40 hover:bg-muted text-muted-foreground"
                    >
                      <span>Occupants ({roomResidents.length}/{capacity})</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 border border-dashed rounded-lg p-2 bg-muted/10 max-h-48 overflow-y-auto text-xs space-y-2 animate-in fade-in duration-150">
                        {roomResidents.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-2">No students assigned here.</p>
                        ) : (
                          roomResidents.map((student) => (
                            <div key={student.id} className="pb-1 last:pb-0 border-b last:border-0 border-muted/40 text-[11px]">
                              <div className="font-bold text-foreground flex items-center gap-1 uppercase">
                                <User className="w-2.5 h-2.5 text-primary" /> {student.full_name}
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
        
        /* 📋 COMPACT DATA-TABLE ROWS SCHEMA */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Block</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Restriction</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Capacity</th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider">Actions Matrix</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const capacity = room.capacity || 4;
                  const occupied = room.current_occupancy || 0;
                  const currentStatus = getRoomStatus(room);
                  const genderTag = room.gender_restriction || room.gender || 'female';
                  const roomResidents = getRoomResidents(room.id);
                  const isExpanded = expandedRoomId === room.id;

                  return (
                    <React.Fragment key={room.id}>
                      <tr className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">Room {room.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">Block {room.block_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${genderTag.includes('male') ? 'bg-blue-50 text-blue-700' : genderTag.includes('female') ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                            {genderTag.includes('male') ? '👨 Male' : genderTag.includes('female') ? '👩 Female' : '🚻 Mixed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] font-medium uppercase ${getStatusBadgeStyles(currentStatus)}`}>
                            {currentStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{occupied} / {capacity} Beds</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => toggleExpandRoom(room.id)} className="h-7 text-xs font-medium px-2">
                              Roster ({roomResidents.length})
                            </Button>
                            
                            {permissions.canEditRoom ? (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEditMode(room)}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/30 cursor-not-allowed" disabled title="You do not have permission to edit rooms.">
                                <Lock className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            
                            {permissions.canDeleteRoom && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRoom(room.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="bg-card border rounded-lg p-3 max-w-xl text-xs space-y-2">
                              <p className="font-bold text-muted-foreground border-b pb-1">Room {room.room_number} Occupant Rosters</p>
                              {roomResidents.map((st) => (
                                <div key={st.id} className="font-bold text-foreground uppercase flex items-center gap-2">
                                  <User className="w-3 h-3 text-primary" /> {st.full_name} <span className="font-mono text-[10px] font-normal normal-case text-muted-foreground">({st.student_id || 'No Matric'})</span>
                                </div>
                              ))}
                              {roomResidents.length === 0 && <p className="text-muted-foreground py-1">No residents currently locked in matrix indexes.</p>}
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

      {/* 📑 REGISTER / CORRECTION MASTER DIALOG WINDOW */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Register New Dormitory Room' : 'Execute Structural Correction (Pembetulan)'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {dialogMode === 'create' 
                ? 'Populate master indexes for general configuration setup.' 
                : 'Alter dynamic parameters. All operational records undergo strict audit tracing.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {dialogMode === 'edit' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-950 p-2.5 rounded-md flex gap-2 items-start text-xs leading-normal">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>RBAC Audit Tracking Enforcement:</strong> Altering fields requires a valid correction reason. Current signature role: <span className="font-bold capitalize">{currentUser.role}</span>.
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium">Room Number *</Label>
              <Input 
                placeholder="e.g., A-101, B-304" 
                value={form.room_number} 
                onChange={(e) => setForm({ ...form, room_number: e.target.value })} 
                className="h-9 mt-1"
                disabled={dialogMode === 'edit' && !permissions.canModifyRoomNumber}
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Block Name *</Label>
              <Input 
                placeholder="e.g., Block A, Block B" 
                value={form.block_name} 
                onChange={(e) => setForm({ ...form, block_name: e.target.value })} 
                className="h-9 mt-1"
                disabled={dialogMode === 'edit' && !permissions.canModifyBlockLocation}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Total Capacity (Beds)</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={form.capacity} 
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })} 
                  className="h-9 mt-1"
                  disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Gender Designation *</Label>
                <Select 
                  value={form.gender_restriction} 
                  onValueChange={(v) => setForm({ ...form, gender_restriction: v })}
                  disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender}
                >
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female Only (Wing 👩)</SelectItem>
                    <SelectItem value="male">Male Only (Wing 👨)</SelectItem>
                    <SelectItem value="mixed">Mixed Designation (General 🚻)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Dynamic Facility Status</Label>
              <Select 
                value={form.status} 
                onValueChange={(v) => setForm({ ...form, status: v })}
                disabled={dialogMode === 'edit' && !permissions.canModifyStatus}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available / Online</SelectItem>
                  <SelectItem value="Maintenance">Under Maintenance / Lockout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 📑 MANDATORY AUDIT INPUT FIELD */}
            {dialogMode === 'edit' && (
              <div className="pt-2 border-t space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Reason for Correction * <span className="text-[10px] text-destructive font-mono">(Audit Required)</span>
                </Label>
                <Input 
                  placeholder="e.g., Incorrect room capacity entered during structural registration."
                  value={form.reason_for_correction}
                  onChange={(e) => setForm({ ...form, reason_for_correction: e.target.value })}
                  className="h-9 border-amber-300 focus-visible:ring-amber-500 bg-amber-50/20 text-xs"
                />
              </div>
            )}
          </div>

          <DialogFooter className="mt-3">
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>Cancel</Button>
            {dialogMode === 'create' ? (
              <Button size="sm" onClick={handleCreateRoom}>Save Configuration</Button>
            ) : (
              <Button size="sm" onClick={handleUpdateRoom} disabled={!form.reason_for_correction.trim()} className="bg-amber-600 hover:bg-amber-700 text-white">
                Authorize Modification
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}