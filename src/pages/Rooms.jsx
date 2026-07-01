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
  Home, Search, Plus, LayoutGrid, List, Bed, Users, 
  ShieldAlert, ChevronDown, ChevronUp, User, RotateCcw 
} from 'lucide-react';

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status'); 
  const filterParam = searchParams.get('filter'); 

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
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'female' });
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

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

  async function handleCreateRoom() {
    if (!form.room_number || !form.block_name) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Room.create({
        ...form,
        capacity: Number(form.capacity),
        current_occupancy: 0,
        status: 'Available'
      });
      toast({ title: 'Room registered successfully' });
      setOpenDialog(false);
      setForm({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'female' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  // Pure helper functions for clear status determinations
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

  // Automatically derive unique entity dimensions from dataset changes
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

  // Unified, ultra-efficient O(N) multi-criteria filtering processor
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const capacity = room.capacity || 4;
      const occupied = room.current_occupancy || 0;
      const calculatedStatus = getRoomStatus(room);
      const calculatedType = getRoomType(capacity);
      
      const inferredFloor = room.floor !== undefined && room.floor !== null 
        ? String(room.floor) 
        : (String(room.room_number).match(/\d/)?.[0] || '');

      // 1. Search Query Box
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesSearch = room.room_number?.toLowerCase().includes(query) ||
                              room.block_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 2. Gender Restriction Filter
      const normalizedGender = (room.gender_restriction || room.gender || 'mixed').toLowerCase().trim();
      if (genderFilter !== 'all' && normalizedGender !== genderFilter.toLowerCase()) return false;

      // 3. Room Status Filter
      if (statusFilter !== 'all' && calculatedStatus !== statusFilter) return false;

      // 4. Block Filter
      if (blockFilter !== 'all' && room.block_name !== blockFilter) return false;

      // 5. Floor Filter
      if (floorFilter !== 'all' && inferredFloor !== floorFilter) return false;

      // 6. Room Type Filter
      if (typeFilter !== 'all' && calculatedType !== typeFilter) return false;

      // 7. Occupancy Filter Group
      if (occupancyFilter !== 'all') {
        if (occupancyFilter === 'Empty' && occupied !== 0) return false;
        if (occupancyFilter === 'Partially' && (occupied === 0 || occupied >= capacity)) return false;
        if (occupancyFilter === 'Fully' && occupied !== capacity) return false;
      }

      // 8. Backward URL compatibility parameter links from Dashboard Router
      if (statusParam === 'Available' && calculatedStatus !== 'Available') return false;
      if (statusParam === 'Occupied' && occupied === 0) return false;
      if (filterParam === 'has-empty-beds' && (capacity - occupied <= 0)) return false;

      return true;
    });
  }, [rooms, searchQuery, genderFilter, statusFilter, blockFilter, floorFilter, typeFilter, occupancyFilter, statusParam, filterParam]);

  // Compute live sub-summary metric aggregations reactively
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Configuration Management"
        description="Configure single-gender layouts, track real-time occupancy changes, and preview current occupant rosters."
        actions={
          <Button size="sm" onClick={() => setOpenDialog(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add New Room
          </Button>
        }
      />

      {/* 🛠️ ADVANCED RESPONSIVE FILTER TOOLBAR */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 items-end">
            
            {/* Search Input */}
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

            {/* Gender Filter */}
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

            {/* Status Filter */}
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

            {/* Block Filter */}
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

            {/* Floor Filter */}
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

            {/* Room Type Filter */}
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

            {/* Occupancy State Filter */}
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
            
            {/* 📊 FEATURE 9: FILTER RESULT SUMMARY PANEL */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                Showing {filteredRooms.length} of {rooms.length} rooms
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span className="flex items-center gap-1.5">
                Available: <span className="font-mono font-bold text-emerald-600">{summaryMetrics.Available}</span>
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="flex items-center gap-1.5">
                Occupied: <span className="font-mono font-bold text-blue-600">{summaryMetrics.Occupied}</span>
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="flex items-center gap-1.5">
                Full: <span className="font-mono font-bold text-red-600">{summaryMetrics.Full}</span>
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="flex items-center gap-1.5">
                Maintenance: <span className="font-mono font-bold text-amber-600">{summaryMetrics.Maintenance}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
              {/* 🔄 FEATURE 10: RESET FILTERS BUTTON */}
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

      {/* RENDER MODES */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No room registrations found matching layout filters" />
      ) : viewMode === 'grid' ? (
        
        /* 🎴 GRID CARD DISPLAY DESIGN LAYER */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const capacity = room.capacity || 4;
            const occupied = room.current_occupancy || 0;
            const bedsAvailable = capacity - occupied;
            const currentStatus = getRoomStatus(room);
            const genderTag = room.gender_restriction || room.gender || 'mixed';
            const roomResidents = getRoomResidents(room.id);
            const isExpanded = expandedRoomId === room.id;

            return (
              <Card key={room.id} className="overflow-hidden border border-border hover:shadow-sm transition-all flex flex-col justify-between">
                <CardContent className="p-4 space-y-3 flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold font-mono tracking-tight text-foreground">Room {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">Block {room.block_name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${getStatusBadgeStyles(currentStatus)}`}>
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
                      <span className={bedsAvailable > 0 && currentStatus !== 'Maintenance' ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
                        {currentStatus === 'Maintenance' ? 'Locked' : `${bedsAvailable} left`}
                      </span>
                    </span>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 font-medium uppercase tracking-wide ${genderTag === 'male' ? 'bg-blue-600' : genderTag === 'female' ? 'bg-pink-600' : 'bg-purple-600'}`}>
                      {genderTag === 'male' ? 'Male Only' : genderTag === 'female' ? 'Female Only' : 'Mixed Gender'}
                    </Badge>
                  </div>

                  {/* Dynamic Occupant Expandable Subsection Panel */}
                  <div className="pt-2 border-t mt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleExpandRoom(room.id)}
                      className="w-full h-7 text-[11px] font-semibold flex justify-between items-center px-2 bg-muted/40 hover:bg-muted text-muted-foreground"
                    >
                      <span>Occupants ({roomResidents.length}/{capacity})</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>

                    {isExpanded && (
                      <div className="mt-2 border border-dashed rounded-lg p-2 bg-muted/10 max-h-48 overflow-y-auto text-xs space-y-3 font-sans animate-in fade-in duration-150">
                        {roomResidents.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-2">
                            No students currently assigned to this room.
                          </p>
                        ) : (
                          roomResidents.map((student) => (
                            <div key={student.id} className="pb-2 last:pb-0 border-b last:border-0 border-muted/60 space-y-0.5">
                              <div className="font-bold text-foreground flex items-center gap-1 uppercase">
                                <User className="w-3 h-3 text-primary shrink-0" />
                                {student.full_name}
                              </div>
                              <div className="text-muted-foreground pl-4">
                                <span className="font-medium">Matric No :</span> {student.student_id || 'N/A'}
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
        
        /* 📋 TABLE ROWS PERSPECTIVE VIEW */
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room Number</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Block Location</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Designated Restriction</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Dynamic Status</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Total Capacity</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const capacity = room.capacity || 4;
                  const occupied = room.current_occupancy || 0;
                  const currentStatus = getRoomStatus(room);
                  const genderTag = room.gender_restriction || room.gender || 'mixed';
                  const roomResidents = getRoomResidents(room.id);
                  const isExpanded = expandedRoomId === room.id;

                  return (
                    <React.Fragment key={room.id}>
                      <tr className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">Room {room.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">Block {room.block_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${genderTag === 'male' ? 'bg-blue-50 text-blue-700' : genderTag === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'}`}>
                            {genderTag === 'male' ? '👨 Male Wing' : genderTag === 'female' ? '👩 Female Wing' : '🚻 Mixed Wing'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] font-medium uppercase ${getStatusBadgeStyles(currentStatus)}`}>
                            {currentStatus}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{occupied} / {capacity} Beds Filled</td>
                        <td className="px-4 py-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => toggleExpandRoom(room.id)}
                            className="h-7 text-xs font-medium px-2.5"
                          >
                            Occupants ({roomResidents.length})
                            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                          </Button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b">
                          <td colSpan={6} className="px-6 py-3">
                            <div className="bg-card border rounded-lg p-3 max-w-xl space-y-3">
                              <p className="text-xs font-bold text-muted-foreground border-b pb-1">
                                Room {room.room_number} — Current Occupants ({roomResidents.length}/{capacity})
                              </p>
                              {roomResidents.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">
                                  No students currently assigned to this room.
                                </p>
                              ) : (
                                <div className="space-y-2 text-xs">
                                  {roomResidents.map((student) => (
                                    <div key={student.id} className="space-y-0.5 pb-2 last:pb-0 border-b last:border-0 border-muted/40">
                                      <div className="font-bold text-foreground flex items-center gap-1 uppercase">
                                        <User className="w-3 h-3 text-primary shrink-0" />
                                        {student.full_name}
                                      </div>
                                      <div className="text-muted-foreground font-mono pl-4">
                                        <span className="font-sans font-medium">Matric No :</span> {student.student_id || 'N/A'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* REGISTER SINGLE-GENDER CONFIGURATION DIALOG */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Dormitory Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg flex gap-2 items-start text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Superadmin Enforcement Notice:</strong> Ensure binary layouts adhere to wing-specific structural zoning directives.
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Room Number *</Label>
              <Input 
                placeholder="e.g., A-101, B-304" 
                value={form.room_number} 
                onChange={(e) => setForm({ ...form, room_number: e.target.value })} 
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Block Name *</Label>
              <Input 
                placeholder="e.g., Block A, Block B" 
                value={form.block_name} 
                onChange={(e) => setForm({ ...form, block_name: e.target.value })} 
                className="h-9 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Total Beds (Capacity)</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={form.capacity} 
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })} 
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Gender Designation *</Label>
                <Select value={form.gender_restriction} onValueChange={(v) => setForm({ ...form, gender_restriction: v })}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female Only (Wing 👩)</SelectItem>
                    <SelectItem value="male">Male Only (Wing 👨)</SelectItem>
                    <SelectItem value="mixed">Mixed (General 🚻)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateRoom}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}