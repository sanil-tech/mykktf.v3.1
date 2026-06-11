import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Plus, DoorOpen, Building2, Trash2, Edit } from 'lucide-react';

const statusColors = { Available: 'bg-green-100 text-green-700', Occupied: 'bg-blue-100 text-blue-700', Full: 'bg-red-100 text-red-700', Maintenance: 'bg-yellow-100 text-yellow-700' };

export default function Rooms() {
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockDialog, setBlockDialog] = useState(false);
  const [roomDialog, setRoomDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({ block_name: '', gender_restriction: 'Mixed', total_floors: 1 });
  const [roomForm, setRoomForm] = useState({ room_number: '', block_id: '', block_name: '', floor: 1, capacity: 2, room_type: 'Double', status: 'Available', current_occupancy: 0 });
  const [editBlockId, setEditBlockId] = useState(null);
  const [editRoomId, setEditRoomId] = useState(null);
  const { toast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [b, r] = await Promise.all([base44.entities.Block.list(), base44.entities.Room.list()]);
    setBlocks(b);
    setRooms(r);
    setLoading(false);
  }

  async function saveBlock() {
    if (!blockForm.block_name) { toast({ title: 'Enter block name', variant: 'destructive' }); return; }
    if (editBlockId) await base44.entities.Block.update(editBlockId, blockForm);
    else await base44.entities.Block.create(blockForm);
    setBlockDialog(false);
    setEditBlockId(null);
    load();
  }

  async function saveRoom() {
    if (!roomForm.room_number || !roomForm.block_id) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const block = blocks.find(b => b.id === roomForm.block_id);
    const data = { ...roomForm, block_name: block?.block_name || '' };
    if (editRoomId) await base44.entities.Room.update(editRoomId, data);
    else await base44.entities.Room.create(data);
    setRoomDialog(false);
    setEditRoomId(null);
    load();
  }

  async function deleteBlock(id) { await base44.entities.Block.delete(id); load(); }
  async function deleteRoom(id) { await base44.entities.Room.delete(id); load(); }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Room Management" description="Manage blocks and rooms" />

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="map">Room Map</TabsTrigger>
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="rooms">Room List</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          {blocks.length === 0 ? (
            <EmptyState icon={Building2} title="No blocks" description="Create a block first to see the room map." />
          ) : (
            <div className="space-y-6">
              {blocks.map(block => {
                const blockRooms = rooms.filter(r => r.block_id === block.id);
                return (
                  <div key={block.id} className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-heading font-semibold text-sm">{block.block_name}</h3>
                        <p className="text-xs text-muted-foreground">{block.gender_restriction} · {block.total_floors} floors</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{blockRooms.filter(r => r.status === 'Available').length} available</Badge>
                    </div>
                    {blockRooms.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No rooms added yet.</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {blockRooms.map(room => (
                          <div key={room.id} className={`p-2 rounded-lg text-center text-[10px] font-medium border ${statusColors[room.status] || 'bg-muted text-muted-foreground'}`} title={`${room.room_number} - ${room.room_type} (${room.current_occupancy}/${room.capacity})`}>
                            <div className="font-bold text-xs">{room.room_number}</div>
                            <div>{room.current_occupancy}/{room.capacity}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Available</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200" /> Occupied</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Full</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200" /> Maintenance</span>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocks">
          <div className="mb-4"><Button size="sm" onClick={() => { setBlockForm({ block_name: '', gender_restriction: 'Mixed', total_floors: 1 }); setEditBlockId(null); setBlockDialog(true); }}><Plus className="w-4 h-4 mr-1" /> Add Block</Button></div>
          {blocks.length === 0 ? <EmptyState icon={Building2} title="No blocks" /> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {blocks.map(b => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-semibold text-sm">{b.block_name}</h3>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setBlockForm(b); setEditBlockId(b.id); setBlockDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlock(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{b.gender_restriction} · {b.total_floors} floors</p>
                  <p className="text-xs text-muted-foreground mt-1">{rooms.filter(r => r.block_id === b.id).length} rooms</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rooms">
          <div className="mb-4"><Button size="sm" onClick={() => { setRoomForm({ room_number: '', block_id: blocks[0]?.id || '', block_name: '', floor: 1, capacity: 2, room_type: 'Double', status: 'Available', current_occupancy: 0 }); setEditRoomId(null); setRoomDialog(true); }}><Plus className="w-4 h-4 mr-1" /> Add Room</Button></div>
          {rooms.length === 0 ? <EmptyState icon={DoorOpen} title="No rooms" /> : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Room</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Block</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Occupancy</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr></thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.room_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.block_name}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{r.room_type}</td>
                        <td className="px-4 py-3">{r.current_occupancy}/{r.capacity}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[r.status]}`}>{r.status}</span></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRoomForm(r); setEditRoomId(r.id); setRoomDialog(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRoom(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editBlockId ? 'Edit Block' : 'Add Block'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Block Name *</Label><Input value={blockForm.block_name} onChange={e => setBlockForm({ ...blockForm, block_name: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Gender Restriction</Label>
              <Select value={blockForm.gender_restriction} onValueChange={v => setBlockForm({ ...blockForm, gender_restriction: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Mixed">Mixed</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Total Floors</Label><Input type="number" min="1" value={blockForm.total_floors} onChange={e => setBlockForm({ ...blockForm, total_floors: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setBlockDialog(false)}>Cancel</Button><Button size="sm" onClick={saveBlock}>Save</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={roomDialog} onOpenChange={setRoomDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editRoomId ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Room Number *</Label><Input value={roomForm.room_number} onChange={e => setRoomForm({ ...roomForm, room_number: e.target.value })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Block *</Label>
              <Select value={roomForm.block_id} onValueChange={v => setRoomForm({ ...roomForm, block_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select block" /></SelectTrigger>
                <SelectContent>{blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.block_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Floor</Label><Input type="number" min="1" value={roomForm.floor} onChange={e => setRoomForm({ ...roomForm, floor: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Capacity</Label><Input type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
            <div><Label className="text-xs">Room Type</Label>
              <Select value={roomForm.room_type} onValueChange={v => setRoomForm({ ...roomForm, room_type: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Single','Double','Triple','Quad'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={roomForm.status} onValueChange={v => setRoomForm({ ...roomForm, status: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Available','Occupied','Full','Maintenance'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setRoomDialog(false)}>Cancel</Button><Button size="sm" onClick={saveRoom}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}