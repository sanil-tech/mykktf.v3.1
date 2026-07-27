import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Home, Search, Plus, LayoutGrid, List, Bed, Users, AlertTriangle, RefreshCw, CheckCircle,
  ShieldAlert, ChevronDown, ChevronUp, User, RotateCcw, Edit2, Trash2, ShieldCheck, Phone, FileText
} from 'lucide-react';

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status'); 
  const filterParam = searchParams.get('filter'); 
  const { toast } = useToast();

  // --- 👤 AUTHENTICATED USER ---
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Structural Core States
  const [rooms, setRooms] = useState([]);
  const [blocks, setBlocks] = useState([]); 
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
    const role = currentUser?.role;
    return {
      canViewModule: role !== 'student',
      canCreateRoom: ['super_admin', 'college_admin'].includes(role),
      canEditRoom: ['super_admin', 'college_admin', 'staff'].includes(role),
      canDeleteRoom: role === 'super_admin',
      canModifyCapacityAndGender: ['super_admin', 'college_admin'].includes(role),
      canModifyBlockLocation: ['super_admin', 'college_admin'].includes(role),
      canModifyRoomNumber: ['super_admin', 'college_admin', 'staff'].includes(role),
      canModifyStatus: ['super_admin', 'college_admin', 'staff'].includes(role)
    };
  }, [currentUser?.role]);

  // Kesan perubahan kebenaran modul & pasang global listener untuk inter-module refresh
  useEffect(() => {
    if (permissions.canViewModule) {
      loadDataAndHeal(); 
    }

    const handleGlobalRefresh = () => {
      console.log("Menerima isyarat refresh! Memuatkan semula data bilik...");
      loadDataAndHeal(); 
    };

    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    return () => {
      window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    };
  }, [permissions.canViewModule]);

  // --- 🔄 SELF-HEALING SYSTEM DATA CONVERGENCE LOOP ---
  async function loadDataAndHeal() {
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

      // INTEGRITI DATA CHECK AUTOMATIK
      let repairCount = 0;
      const autoRepairPromises = freshRooms.map(async (room) => {
        const actualOccupancy = freshStudents.filter(s => String(s.room_id) === String(room.id)).length;
        const currentDerivedStatus = determineStatus(room, actualOccupancy);

        if (Number(room.current_occupancy) !== actualOccupancy || room.status !== currentDerivedStatus) {
          repairCount++;
          try {
            return await base44.entities.Room.update(room.id, { 
              current_occupancy: actualOccupancy,
              status: currentDerivedStatus
            });
          } catch (e) {
            console.error(`Automatic data reconciliation failed for room ${room.room_number}:`, e);
          }
        }
        return room;
      });

      await Promise.all(autoRepairPromises);
      
      if (repairCount > 0) {
        const sanitizedRooms = await base44.entities.Room.list();
        setRooms(sanitizedRooms || freshRooms);
        toast({ title: "Background Optimization Complete", description: `Auto-healed ${repairCount} room allocation anomalies successfully.` });
      } else {
        setRooms(freshRooms);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'System loading fault', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  // --- 🛠️ ADMIN DATA REPAIR TOOL ENGINE ---
  async function runManualGlobalSync() {
    if (currentUser.role !== 'super_admin') return;
    try {
      setSyncing(true);
      const [roomsData, studentsData] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Student.list()
      ]);

      let roomsUpdated = 0;
      const syncTasks = roomsData.map(async (room) => {
        const actualOccupancy = studentsData.filter(s => String(s.room_id) === String(room.id)).length;
        const correctStatus = determineStatus(room, actualOccupancy);

        if (Number(room.current_occupancy) !== actualOccupancy || room.status !== correctStatus) {
          roomsUpdated++;
          return await base44.entities.Room.update(room.id, {
            current_occupancy: actualOccupancy,
            status: correctStatus
          });
        }
      });

      await Promise.all(syncTasks);
      await loadDataAndHeal();
      toast({ title: "Synchronization Complete", description: `${roomsUpdated} rooms verified and synced.` });
    } catch (err) {
      toast({ title: "Sync pipeline execution failed", description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  // --- 📊 CORE RESOLUTION LOGIC MECHANICS ---
  function determineStatus(room, actualOccupancy) {
    // Mengekalkan status khas jika dipilih secara manual oleh admin
    if (['Maintenance', 'Under Maintenance', 'Reserved', 'Not Available'].includes(room.status)) {
      return room.status;
    }
    const capacity = Number(room.capacity || 4);
    if (actualOccupancy === 0) return 'Available';
    if (actualOccupancy >= capacity) return 'Full';
    return 'Occupied';
  }

  const resolveRoomGender = (roomInstance) => {
    if (!roomInstance) return 'mixed';
    let rawGender = roomInstance.gender_restriction || roomInstance.gender;
    if ((!rawGender || String(rawGender).trim() === '') && roomInstance.block_id && blocks.length > 0) {
      const parentBlock = blocks.find(b => String(b.id) === String(roomInstance.block_id));
      if (parentBlock) rawGender = parentBlock.gender_restriction || parentBlock.gender;
    }
    return (rawGender || 'mixed').trim().toLowerCase();
  };

  const getRoomMetrics = (room) => {
    const assignedStudents = students.filter(s => String(s.room_id) === String(room.id));
    const actualOccupancy = assignedStudents.length;
    const capacity = Number(room.capacity || 4);
    
    // Katil hanya dikira available jika status bilik adalah 'Available' atau 'Occupied'
    const isOperational = ['Available', 'Occupied'].includes(room.status);
    const availableBeds = isOperational ? Math.max(0, capacity - actualOccupancy) : 0;
    
    const resolvedStatus = determineStatus(room, actualOccupancy);

    return { assignedStudents, actualOccupancy, capacity, availableBeds, resolvedStatus };
  };

  function getRoomType(capacity) {
    if (capacity === 1) return 'Single';
    if (capacity === 2) return 'Double';
    if (capacity === 3) return 'Triple';
    if (capacity >= 4) return 'Quad';
    return 'Other';
  }

  // --- 🛑 STANDARD CRUD AND ACTION HANDLERS ---
  async function handleCreateRoom() {
    if (!permissions.canCreateRoom) return;
    try {
      await base44.entities.Room.create({
        room_number: form.room_number,
        block_id: form.block_id || null,
        block_name: form.block_name,
        capacity: Number(form.capacity),
        current_occupancy: 0,
        status: form.status, // Terus menyimpan status pilihan (Reserved, dll.)
        gender_restriction: form.gender_restriction
      });
      toast({ title: 'Room registered successfully' });
      setOpenDialog(false);
      resetForm();
      loadDataAndHeal();
    } catch (err) {
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  async function handleUpdateRoom() {
    if (!permissions.canEditRoom) return;
    if (!form.reason_for_correction.trim()) {
      toast({ title: 'Validation Rule Error', description: 'A Correction Reason is required.', variant: 'destructive' });
      return;
    }

    try {
      // Dapatkan corak ketersediaan berdasarkan data penghuni semasa
      const currentOccupants = students.filter(s => String(s.room_id) === String(selectedRoomForEdit.id)).length;
      
      // Jika status ditukar ke Available/Occupied, sistem akan menentukan status automatik semula
      let targetStatus = permissions.canModifyStatus ? form.status : selectedRoomForEdit.status;
      if (targetStatus === 'Available') {
        targetStatus = currentOccupants >= Number(form.capacity) ? 'Full' : (currentOccupants > 0 ? 'Occupied' : 'Available');
      }

      await base44.entities.Room.update(selectedRoomForEdit.id, {
        room_number: permissions.canModifyRoomNumber ? form.room_number : selectedRoomForEdit.room_number,
        block_id: form.block_id,
        block_name: permissions.canModifyBlockLocation ? form.block_name : selectedRoomForEdit.block_name,
        capacity: permissions.canModifyCapacityAndGender ? Number(form.capacity) : Number(selectedRoomForEdit.capacity),
        gender_restriction: permissions.canModifyCapacityAndGender ? form.gender_restriction : selectedRoomForEdit.gender_restriction,
        status: targetStatus,
        current_occupancy: currentOccupants
      });
      
      toast({ title: 'Correction Processed Successfully' });
      setOpenDialog(false);
      resetForm();
      loadDataAndHeal();
    } catch (err) {
      toast({ title: 'Failed to apply modifications', description: err.message, variant: 'destructive' });
    }
  }

  async function handleDeleteRoom(roomId) {
    if (!permissions.canDeleteRoom) return;
    if (!confirm('Are you certain you wish to delete this record permanently?')) return;
    try {
      await base44.entities.Room.delete(roomId);
      toast({ title: 'Room allocation purged successfully' });
      loadDataAndHeal();
    } catch (err) {
      toast({ title: 'Failed to complete deletion', description: err.message, variant: 'destructive' });
    }
  }

  // --- ⚡ INSTANT RENDERING FILTER PIPELINE ---
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const { actualOccupancy, capacity, resolvedStatus } = getRoomMetrics(room);
      const calculatedType = getRoomType(capacity);
      const inferredFloor = String(room.room_number).match(/\d/)?.[0] || '1';

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        if (!room.room_number?.toLowerCase().includes(query) && !room.block_name?.toLowerCase().includes(query)) return false;
      }

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
    if (status === 'Reserved') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (status === 'Not Available') return 'bg-slate-100 text-slate-700 border-slate-300';
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

  const toggleExpandRoom = (roomId) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  const uniqueBlocks = useMemo(() => ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))].sort(), [rooms]);
  const uniqueFloors = useMemo(() => {
    const floors = rooms.map(r => String(r.room_number).match(/\d/)?.[0] || '1');
    return ['all', ...new Set(floors)].sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  // Mengira metrik dashboard termasuk jumlah katil yang masih available
  const summaryMetrics = useMemo(() => {
    const counts = { Available: 0, Occupied: 0, Full: 0, Maintenance: 0, Reserved: 0, NotAvailable: 0, totalAvailableBeds: 0 };
    filteredRooms.forEach(room => {
      const { resolvedStatus, availableBeds } = getRoomMetrics(room);
      if (resolvedStatus === 'Available') counts.Available++;
      else if (resolvedStatus === 'Occupied') counts.Occupied++;
      else if (resolvedStatus === 'Full') counts.Full++;
      else if (resolvedStatus === 'Maintenance') counts.Maintenance++;
      else if (resolvedStatus === 'Reserved') counts.Reserved++;
      else if (resolvedStatus === 'Not Available') counts.NotAvailable++;

      counts.totalAvailableBeds += availableBeds;
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

  // --- 🖼️ JSX RENDERING PANEL ---
  if (!currentUser) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {currentUser?.role === 'super_admin' && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runManualGlobalSync} 
            disabled={syncing}
            className="h-8 text-xs bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            Synchronize Room Occupancy
          </Button>
        </div>
      )}

      <PageHeader
        title="Room Configuration Management"
        description="Configure layout restrictions and evaluate verified, single-source occupant rosters."
        actions={
          permissions.canCreateRoom && (
            <Button size="sm" onClick={openCreateMode}>
              <Plus className="w-4 h-4 mr-1.5" /> Add New Room
            </Button>
          )
        }
      />

      {/* FILTER DASHBOARD TOOLBAR */}
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
                  <SelectItem value="Reserved">Reserved</SelectItem>
                  <SelectItem value="Not Available">Not Available</SelectItem>
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
              <span>Reserved: <span className="text-purple-600 font-bold">{summaryMetrics.Reserved}</span></span>
              <span>Maintenance: <span className="text-amber-600 font-bold">{summaryMetrics.Maintenance}</span></span>
              <span className="text-muted-foreground/40">|</span>
              {/* KAD MAKLUMAT BAKI KATIL YANG AVAILABLE */}
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-medium">
                <Bed className="w-3 h-3" /> Baki Katil Kosong: <span className="font-bold">{summaryMetrics.totalAvailableBeds}</span>
              </span>
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

      {/* VIEW MODES PANELS */}
      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-t-primary rounded-full animate-spin" /></div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No room layouts found matching criteria." />
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
          {filteredRooms.map((room) => {
            const { assignedStudents, actualOccupancy, capacity, availableBeds, resolvedStatus } = getRoomMetrics(room);
            const isExpanded = expandedRoomId === room.id;

            return (
              <Card key={room.id} className={viewMode === 'list' ? "w-full" : ""}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-base">Bilik {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">{room.block_name || 'No Block'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={getStatusBadgeStyles(resolvedStatus)}>
                        {resolvedStatus}
                      </Badge>
                      {/* Lencana paparan baki katil pada setiap kad bilik */}
                      {availableBeds > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-100">
                          {availableBeds} Bed{availableBeds > 1 ? 's' : ''} Left
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>Penghuni: <span className="font-semibold text-foreground">{actualOccupancy} / {capacity}</span></p> 
                    <p className="text-xs capitalize">Kategori: {resolveRoomGender(room)}</p>
                  </div>
                  
                  {/* Senarai Nama Pelajar Dynamic */}
                  <div className="mt-4 pt-3 border-t border-muted">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpandRoom(room.id)}
                      className="w-full h-7 justify-between p-0 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span>Senarai Penghuni ({actualOccupancy})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-1 transition-all">
                        {assignedStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded">Tiada penghuni berdaftar dalam bilik ini.</p>
                        ) : (
                          <ul className="space-y-1">
                            {assignedStudents.map(st => (
                              <li key={st.id} className="text-xs flex items-center gap-1.5 bg-muted/50 p-1.5 rounded border border-border/40">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium text-foreground">{st.full_name}</span>
                                <span className="text-muted-foreground">({st.student_id})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  {permissions.canEditRoom && (
                    <div className="flex gap-1.5 mt-3 pt-2 justify-end">
                      <Button size="icon" variant="outline" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEditMode(room)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {permissions.canDeleteRoom && (
                        <Button size="icon" variant="outline" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteRoom(room.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DIALOG UTK CREATE/EDIT BILIK */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Add New Room Assignment' : 'Modify Room Configuration'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-sm">
            <div className="space-y-1">
              <Label>Room Number</Label>
              <Input 
                value={form.room_number} 
                onChange={(e) => setForm(p => ({ ...p, room_number: e.target.value }))}
                disabled={dialogMode === 'edit' && !permissions.canModifyRoomNumber}
              />
            </div>
            <div className="space-y-1">
              <Label>Block Name</Label>
              <Input 
                value={form.block_name} 
                onChange={(e) => setForm(p => ({ ...p, block_name: e.target.value }))}
                disabled={dialogMode === 'edit' && !permissions.canModifyBlockLocation}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Max Capacity</Label>
                <Input 
                  type="number" 
                  value={form.capacity} 
                  onChange={(e) => setForm(p => ({ ...p, capacity: e.target.value }))}
                  disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender}
                />
              </div>
              <div className="space-y-1">
                <Label>Gender Restriction</Label>
                <Select 
                  value={form.gender_restriction} 
                  onValueChange={(v) => setForm(p => ({ ...p, gender_restriction: v }))}
                  disabled={dialogMode === 'edit' && !permissions.canModifyCapacityAndGender}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label>Operational Status</Label>
              <Select 
                value={form.status} 
                onValueChange={(v) => setForm(p => ({ ...p, status: v }))}
                disabled={dialogMode === 'edit' && !permissions.canModifyStatus}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  {/* Status baharu mengikut keperluan anda */}
                  <SelectItem value="Reserved">Reserved</SelectItem>
                  <SelectItem value="Not Available">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dialogMode === 'edit' && (
              <div className="space-y-1 bg-amber-50/50 border border-amber-200 p-2.5 rounded-md">
                <Label className="text-amber-900 font-semibold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Correction Audit Reason *</Label>
                <Input 
                  placeholder="State reason for overriding configuration..." 
                  value={form.reason_for_correction} 
                  onChange={(e) => setForm(p => ({ ...p, reason_for_correction: e.target.value }))}
                  className="bg-background border-amber-300 focus-visible:ring-amber-500 h-8 text-xs"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={dialogMode === 'create' ? handleCreateRoom : handleUpdateRoom}>
              {dialogMode === 'create' ? 'Save Record' : 'Apply Overrides'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}