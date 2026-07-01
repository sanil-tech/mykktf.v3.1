import React, { useState, useEffect } from 'react';
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
import { Home, Search, Plus, LayoutGrid, List, Bed, Users, ShieldAlert, ChevronDown, ChevronUp, User } from 'lucide-react';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  
  // Track which room's occupant preview list panel is currently selected / expanded
  const [expandedRoomId, setExpandedRoomId] = useState(null);
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  
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

    if (form.gender_restriction !== 'male' && form.gender_restriction !== 'female') {
      toast({ title: 'Validation Error', description: 'Rooms must be explicitly configured as Male Only or Female Only.', variant: 'destructive' });
      return;
    }

    try {
      await base44.entities.Room.create({
        ...form,
        capacity: Number(form.capacity),
        current_occupancy: 0,
        status: 'Available'
      });
      toast({ title: 'Single-gender room registered successfully' });
      setOpenDialog(false);
      setForm({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'female' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  // Section 8 Filter Rule: Retrieve matching assigned student profiles reactively without duplication
  const getRoomResidents = (roomId) => {
    if (!roomId) return [];
    return students.filter(s => String(s.room_id).trim().toLowerCase() === String(roomId).trim().toLowerCase());
  };

  const toggleExpandRoom = (roomId) => {
    setExpandedRoomId(expandedRoomId === roomId ? null : roomId);
  };

  const getStatusBadgeStyles = (current, capacity) => {
    if (current === 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (current >= capacity) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const uniqueBlocks = ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))];

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          room.block_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = blockFilter === 'all' || room.block_name === blockFilter;
    
    const currentGender = (room.gender_restriction || room.gender || '').toLowerCase().trim();
    const matchesGender = genderFilter === 'all' || currentGender === genderFilter;

    return matchesSearch && matchesBlock && matchesGender;
  });

  return (
    <div>
      <PageHeader
        title="Room Configuration Management"
        description="Configure single-gender layouts, track real-time occupancy changes, and preview current occupant rosters."
        actions={
          <Button size="sm" onClick={() => setOpenDialog(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add New Room
          </Button>
        }
      />

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-6">
        <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search room or block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={blockFilter} onValueChange={setBlockFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Filter by Block" />
            </SelectTrigger>
            <SelectContent>
              {uniqueBlocks.map(block => (
                <SelectItem key={block} value={block} className="capitalize">
                  {block === 'all' ? 'All Blocks' : `Block ${block}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Filter by Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male Wings Only</SelectItem>
              <SelectItem value="female">Female Wings Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-end sm:self-auto">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => setViewMode('list')}>
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No room registrations found matching filters" />
      ) : viewMode === 'grid' ? (
        
        /* 🎴 GRID VIEW WITH INTERACTIVE OCCUPANT PREVIEW PANEL */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const capacity = room.capacity || 4;
            const occupied = room.current_occupancy || 0;
            const bedsAvailable = capacity - occupied;
            const genderTag = room.gender_restriction || room.gender || 'female';
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
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${getStatusBadgeStyles(occupied, capacity)}`}>
                      {occupied === 0 ? 'Empty' : occupied >= capacity ? 'Full' : 'Occupied'}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Occupancy</span>
                      <span className="text-foreground font-mono">{occupied} / {capacity}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                      <div className={`h-full ${occupied >= capacity ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${(occupied / capacity) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Bed className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className={bedsAvailable > 0 ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
                        {bedsAvailable} left
                      </span>
                    </span>
                    <Badge className={`text-[9px] px-1.5 py-0 border-0 font-medium ${genderTag === 'male' ? 'bg-blue-600' : 'bg-pink-600'}`}>
                      {genderTag === 'male' ? 'Male Only' : 'Female Only'}
                    </Badge>
                  </div>

                  {/* 👥 SECTION 8: AUTOMATIC RETRIEVAL OCCUPANT PREVIEW PANEL */}
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
                              <div className="text-muted-foreground pl-4">
                                <span className="font-medium">Phone      :</span> {student.phone_number || student.phone || 'N/A'}
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
        
        /* 📋 TABLE VIEW VARIANT WITH EXPANDABLE PANEL ROWS */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room Number</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Block Location</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Designated Gender</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Total Capacity</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const capacity = room.capacity || 4;
                  const occupied = room.current_occupancy || 0;
                  const genderTag = room.gender_restriction || room.gender || 'female';
                  const roomResidents = getRoomResidents(room.id);
                  const isExpanded = expandedRoomId === room.id;

                  return (
                    <React.Fragment key={room.id}>
                      <tr className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-foreground">Room {room.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{room.block_name}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${genderTag === 'male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                            {genderTag === 'male' ? '👨 Male Wing' : '👩 Female Wing'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{occupied} / {capacity} Beds Filled</td>
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
                          <td colSpan={5} className="px-6 py-3">
                            <div className="bg-card border rounded-lg p-3 max-w-xl space-y-3">
                              <p className="text-xs font-bold text-muted-foreground border-b pb-1">
                                Room {room.room_number} — Occupants ({roomResidents.length}/{capacity})
                              </p>
                              {roomResidents.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-1">
                                  No students currently assigned to this room.
                                </p>
                              ) : (
                                <div className="space-y-3 text-xs">
                                  {roomResidents.map((student) => (
                                    <div key={student.id} className="space-y-0.5 pb-2 last:pb-0 border-b last:border-0 border-muted/40">
                                      <div className="font-bold text-foreground flex items-center gap-1 uppercase">
                                        <User className="w-3 h-3 text-primary shrink-0" />
                                        {student.full_name}
                                      </div>
                                      <div className="text-muted-foreground font-mono pl-4">
                                        <span className="font-sans font-medium">Matric No :</span> {student.student_id || 'N/A'}
                                      </div>
                                      <div className="text-muted-foreground pl-4">
                                        <span className="font-medium">Phone      :</span> {student.phone_number || student.phone || 'N/A'}
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

      {/* ADD NEW ROOM DIALOG */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Single-Gender Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg flex gap-2 items-start text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Superadmin Enforcement Notice:</strong> Mixed-gender dormitory room models are disabled. Assign strict binary single-gender wings only.
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Room Number *</Label>
              <Input 
                placeholder="e.g., N-1.06, H-2.04" 
                value={form.room_number} 
                onChange={(e) => setForm({ ...form, room_number: e.target.value })} 
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Block Name *</Label>
              <Input 
                placeholder="e.g., Block N, Block H" 
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