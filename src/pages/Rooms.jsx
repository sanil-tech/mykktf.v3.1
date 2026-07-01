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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Home, Search, Plus, Filter, LayoutGrid, List, Bed, Users } from 'lucide-react';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'mixed' });
  
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setLoading(true);
      const data = await base44.entities.Room.list();
      setRooms(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error loading rooms', description: err.message, variant: 'destructive' });
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
      toast({ title: 'Room added successfully' });
      setOpenDialog(false);
      setForm({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'mixed' });
      loadRooms();
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to create room', description: err.message, variant: 'destructive' });
    }
  }

  // Get dynamic status badge color
  const getStatusBadgeStyles = (current, capacity) => {
    if (current === 0) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (current >= capacity) return 'bg-red-50 text-red-700 border-red-200';
    if (current / capacity >= 0.75) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  // Extract unique blocks for filter dropdown
  const uniqueBlocks = ['all', ...new Set(rooms.map(r => r.block_name).filter(Boolean))];

  // Filter Logic
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          room.block_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = blockFilter === 'all' || room.block_name === blockFilter;
    
    const availableBeds = (room.capacity || 4) - (room.current_occupancy || 0);
    let matchesStatus = true;
    if (statusFilter === 'available') matchesStatus = availableBeds > 0;
    if (statusFilter === 'full') matchesStatus = availableBeds === 0;
    if (statusFilter === 'empty') matchesStatus = room.current_occupancy === 0;

    return matchesSearch && matchesBlock && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Room Management"
        description="Monitor room configurations, overall capacity, and real-time bed availability"
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
              <SelectValue placeholder="Filter by Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vacancies</SelectItem>
              <SelectItem value="available">Has Free Beds</SelectItem>
              <SelectItem value="full">No Free Beds (Full)</SelectItem>
              <SelectItem value="empty">Completely Empty</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-end sm:self-auto">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="No rooms found matching the criteria" />
      ) : viewMode === 'grid' ? (
        
        /* GRID VIEW WITH EXPLICIT BED COUNTS */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const capacity = room.capacity || 4;
            const occupied = room.current_occupancy || 0;
            const bedsAvailable = capacity - occupied;

            return (
              <Card key={room.id} className="overflow-hidden border border-border hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold font-mono tracking-tight text-foreground">Room {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">Block {room.block_name}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-medium ${getStatusBadgeStyles(occupied, capacity)}`}>
                      {occupied === 0 ? 'Empty' : occupied >= capacity ? 'Full' : 'Occupied'}
                    </Badge>
                  </div>

                  {/* Bed Allocation Visual Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> Occupancy Ratio
                      </span>
                      <span className="text-foreground font-mono">{occupied} / {capacity}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full transition-all ${occupied >= capacity ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${(occupied / capacity) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Bed Availability Readout */}
                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Bed className={`w-3.5 h-3.5 ${bedsAvailable > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      {bedsAvailable > 0 ? (
                        <span className="text-emerald-700 font-semibold">{bedsAvailable} {bedsAvailable === 1 ? 'bed' : 'beds'} free</span>
                      ) : (
                        <span className="text-muted-foreground">No beds available</span>
                      )}
                    </span>
                    <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0 bg-secondary/60 text-secondary-foreground">
                      {room.gender_restriction || 'Mixed'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        
        /* TABLE VIEW WITH EXPLICIT BED COUNTS */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Room Number</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Block</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Gender Rule</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Total Capacity</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Beds Taken</th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider">Beds Available</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => {
                  const capacity = room.capacity || 4;
                  const occupied = room.current_occupancy || 0;
                  const bedsAvailable = capacity - occupied;

                  return (
                    <tr key={room.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">Room {room.room_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{room.block_name}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{room.gender_restriction || 'Mixed'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{capacity} Beds</td>
                      <td className="px-4 py-3 font-medium text-foreground">{occupied} occupied</td>
                      <td className="px-4 py-3">
                        {bedsAvailable > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                            {bedsAvailable} Free
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold bg-red-50 px-2 py-0.5 rounded text-xs border border-red-100">
                            Full
                          </span>
                        )}
                      </td>
                    </tr>
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
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Room Number *</Label>
              <Input 
                placeholder="e.g., 101, A-23" 
                value={form.room_number} 
                onChange={(e) => setForm({ ...form, room_number: e.target.value })} 
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Block Name *</Label>
              <Input 
                placeholder="e.g., Block A, Female Wing" 
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
                <Label className="text-xs font-medium">Gender Restriction</Label>
                <Select value={form.gender_restriction} onValueChange={(v) => setForm({ ...form, gender_restriction: v })}>
                  <SelectTrigger className="h-9 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="male">Male Only</SelectItem>
                    <SelectItem value="female">Female Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" size="sm" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateRoom}>Save Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}