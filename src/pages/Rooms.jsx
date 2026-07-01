import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Home, Bed, Users, Plus, SlidersHorizontal, ShieldAlert, Phone } from 'lucide-react';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [availableBlocks, setAvailableBlocks] = useState([]);
  
  // Dialog State
  const [roomDialog, setRoomDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    block_name: '',
    capacity: 4,
    gender_restriction: 'mixed',
    status: 'Available'
  });

  const { toast } = useToast();

  useEffect(() => {
    loadData();

    // 🔗 Mendengar perubahan event global daripada modul CheckInOut untuk kemas kini data real-time
    const handleGlobalRefresh = () => {
      loadData(false); // reload tanpa memaparkan spinner loading utama
    };
    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    return () => window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
  }, []);

  // Mengekstrak blok unik daripada senarai bilik
  useEffect(() => {
    if (rooms.length > 0) {
      const blocks = [...new Set(rooms.map(r => r.block_name).filter(Boolean))];
      setAvailableBlocks(blocks.sort());
    }
  }, [rooms]);

  // 🎯 SOURCE OF TRUTH: Kira occupancy dinamik berdasarkan pautan data jadual Student yang sah
  function getCalculatedOccupancy(roomId, currentStudentList = students) {
    if (!roomId) return 0;
    return currentStudentList.filter(s => String(s.room_id) === String(roomId)).length;
  }

  // 🎯 REAL-TIME STATUS GENERATOR: Status bilik ditentukan secara mutlak oleh occupancy sebenar & Maintenance
  function getRoomStatus(room, currentStudentList = students) {
    if (!room) return 'Unknown';
    if (room.status === 'Maintenance' || room.room_status === 'Maintenance') return 'Maintenance';
    
    const current = getCalculatedOccupancy(room.id, currentStudentList);
    const capacity = room.capacity || 4;
    
    if (current === 0) return 'Available';
    if (current >= capacity) return 'Full';
    return 'Occupied';
  }

  // 🔄 Dapatkan maklumat pelajar yang menghuni bilik secara real-time
  function getRoomOccupants(roomId) {
    return students
      .filter(s => String(s.room_id) === String(roomId))
      .map(s => ({
        full_name: s.full_name || 'N/A',
        student_id: s.student_id || 'N/A',
        phone_number: s.phone_number || s.phone || 'N/A'
      }));
  }

  async function loadData(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const [r, s] = await Promise.all([
        base44.entities.Room.list(),
        base44.entities.Student.list()
      ]);
      
      setRooms(r);
      setStudents(s);

      // ⚡ REPAIRED AUTO-HEAL: Logik penyelarasan latar belakang yang selamat
      // Berfungsi membetulkan ralat 'current_occupancy' yang lari di pangkalan data secara mutlak menggunakan Source of Truth.
      await safeBackgroundSync(r, s);

    } catch (err) {
      console.error(err);
      if (showSpinner) toast({ title: 'Ralat memuatkan data', description: err.message, variant: 'destructive' });
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  // 🛡️ Safe Background Sync: Menyinkronasikan ruangan DB jika nilai sedia ada tidak sama dengan bilangan sebenar Student
  async function safeBackgroundSync(currentRooms, currentStudents) {
    let anomaliesFixed = 0;

    for (const room of currentRooms) {
      const actualOccupancy = getCalculatedOccupancy(room.id, currentStudents);
      const computedStatus = room.status === 'Maintenance' || room.room_status === 'Maintenance' 
        ? 'Maintenance' 
        : (actualOccupancy === 0 ? 'Available' : (actualOccupancy >= (room.capacity || 4) ? 'Full' : 'Occupied'));

      // Jika data di DB didapati berbeza dengan Source of Truth, kemas kini DB dengan data yang betul
      if (room.current_occupancy !== actualOccupancy || room.status !== computedStatus) {
        try {
          await base44.entities.Room.update(room.id, {
            current_occupancy: actualOccupancy,
            status: computedStatus,
            room_status: computedStatus
          });
          anomaliesFixed++;
        } catch (e) {
          console.error(`Gagal menyelaraskan bilik ${room.room_number}:`, e);
        }
      }
    }

    // Paparkan maklumat penyelarasan automatik yang berjaya jika ada kerosakan data dikesan sebelum ini
    if (anomaliesFixed > 0) {
      console.log(`[Sync System] Auto-healed ${anomaliesFixed} room allocation anomalies successfully.`);
      // Muat semula state tempatan untuk mengelakkan paparan data lapuk
      const updatedRooms = await base44.entities.Room.list();
      setRooms(updatedRooms);
    }
  }

  function dispatchGlobalRefresh() {
    window.dispatchEvent(new CustomEvent('KRMS_MODULES_REFRESH'));
  }

  async function handleSaveRoom() {
    if (!roomForm.room_number || !roomForm.block_name) {
      toast({ title: 'Sila isi ruangan wajib', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      if (selectedRoom) {
        // Mode: Kemaskini Bilik Sedia Ada
        // Occupancy dikekalkan daripada pengiraan sebenar bagi mengelakkan overwrite data lapuk
        const actualOcc = getCalculatedOccupancy(selectedRoom.id);
        const capacity = parseInt(roomForm.capacity) || 4;
        
        let determinedStatus = roomForm.status;
        if (determinedStatus !== 'Maintenance') {
          determinedStatus = actualOcc === 0 ? 'Available' : (actualOcc >= capacity ? 'Full' : 'Occupied');
        }

        await base44.entities.Room.update(selectedRoom.id, {
          room_number: roomForm.room_number,
          block_name: roomForm.block_name,
          capacity: capacity,
          gender_restriction: roomForm.gender_restriction,
          status: determinedStatus,
          room_status: determinedStatus,
          current_occupancy: actualOcc
        });
        toast({ title: 'Bilik berjaya dikemaskini' });
      } else {
        // Mode: Tambah Bilik Baharu
        await base44.entities.Room.create({
          room_number: roomForm.room_number,
          block_name: roomForm.block_name,
          capacity: parseInt(roomForm.capacity) || 4,
          gender_restriction: roomForm.gender_restriction,
          status: roomForm.status,
          room_status: roomForm.status,
          current_occupancy: 0
        });
        toast({ title: 'Bilik baharu berjaya didaftarkan' });
      }
      
      setRoomDialog(false);
      await loadData(false);
      dispatchGlobalRefresh();
    } catch (err) {
      console.error(err);
      toast({ title: 'Ralat menyimpan maklumat bilik', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  // Logik Penapisan Senarai Bilik (UI Client Side)
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          room.block_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBlock = selectedBlock === 'all' || room.block_name === selectedBlock;
    
    const realStatus = getRoomStatus(room);
    const matchesStatus = selectedStatus === 'all' || realStatus === selectedStatus;

    return matchesSearch && matchesBlock && matchesStatus;
  });

  const getStatusCardStyles = (status) => {
    switch (status) {
      case 'Available': return 'border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40 text-emerald-900';
      case 'Occupied': return 'border-blue-200 bg-blue-50/20 hover:bg-blue-50/40 text-blue-900';
      case 'Full': return 'border-red-200 bg-red-50/20 hover:bg-red-50/40 text-red-900';
      case 'Maintenance': return 'border-slate-200 bg-slate-100 opacity-75 text-slate-700';
      default: return 'border-border bg-card';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-600 text-white';
      case 'Occupied': return 'bg-blue-600 text-white';
      case 'Full': return 'bg-red-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Pengurusan Bilik"
        description="Pantau status kekosongan hostel dan senarai penghuni secara masa nyata"
        actions={
          <Button size="sm" onClick={() => {
            setSelectedRoom(null);
            setRoomForm({ room_number: '', block_name: '', capacity: 4, gender_restriction: 'mixed', status: 'Available' });
            setRoomDialog(true);
          }}><Plus className="w-4 h-4 mr-1.5" /> Tambah Bilik</Button>
        }
      />

      {/* Bahagian Filter & Carian */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nombor bilik atau blok..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div>
          <Select value={selectedBlock} onValueChange={setSelectedBlock}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Semua Blok" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Blok</SelectItem>
              {availableBlocks.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Occupied">Occupied</SelectItem>
              <SelectItem value="Full">Full</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Senarai Kad Bilik */}
      {filteredRooms.length === 0 ? (
        <EmptyState icon={Home} title="Tiada bilik ditemui" description="Sila tukar tetapan tapisan atau tambah bilik baharu." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const status = getRoomStatus(room);
            const currentOcc = getCalculatedOccupancy(room.id);
            const capacity = room.capacity || 4;
            const occupants = getRoomOccupants(room.id);

            return (
              <Card 
                key={room.id}
                onClick={() => {
                  setSelectedRoom(room);
                  setRoomForm({
                    room_number: room.room_number || '',
                    block_name: room.block_name || '',
                    capacity: room.capacity || 4,
                    gender_restriction: room.gender_restriction || 'mixed',
                    status: room.status || 'Available'
                  });
                  setRoomDialog(true);
                }}
                className={`cursor-pointer border transition-all text-left shadow-sm hover:shadow-md ${getStatusCardStyles(status)}`}
              >
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold font-mono tracking-tight text-foreground">Bilik {room.room_number}</h3>
                      <p className="text-xs text-muted-foreground">{room.block_name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-[10px] px-2 py-0.5 rounded font-semibold ${getStatusBadgeVariant(status)}`}>
                        {status}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider bg-background/50">
                        {room.gender_restriction || 'mixed'}
                      </Badge>
                    </div>
                  </div>

                  {/* 👥 REAL-TIME VIEW: Memaparkan senarai penghuni bilik (Nama, ID, No Telefon) */}
                  {occupants.length > 0 ? (
                    <div className="bg-background/60 border border-border/40 p-2 rounded-lg text-xs space-y-1.5">
                      <span className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-primary" /> Penghuni Bilik:
                      </span>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {occupants.map((occ, idx) => (
                          <div key={idx} className="border-b border-muted/30 last:border-0 pb-1 last:pb-0 text-muted-foreground">
                            <p className="font-medium text-foreground truncate">{occ.full_name}</p>
                            <div className="flex justify-between text-[10px] opacity-90 font-mono mt-0.5">
                              <span>ID: {occ.student_id}</span>
                              <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" /> {occ.phone_number}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic py-1 border border-dashed border-muted rounded-lg text-center bg-muted/10">
                      Belum ada penghuni aktif didaftarkan
                    </div>
                  )}

                  <div className="text-xs font-medium flex justify-between items-center pt-2 border-t border-border/60 text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5" />
                      {Math.max(0, capacity - currentOcc)} katil kosong
                    </span>
                    <strong className="font-mono text-foreground">{currentOcc} / {capacity} Terisi</strong>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 📝 DIALOG TAMBAH / KEMASKINI BILIK */}
      <Dialog open={roomDialog} onOpenChange={(val) => !submitting && setRoomDialog(val)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedRoom ? `Kemaskini Maklumat Bilik ${selectedRoom.room_number}` : 'Daftar Bilik Baharu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 text-sm">
            <div>
              <Label className="text-xs font-medium">Nombor Bilik *</Label>
              <Input 
                placeholder="Contoh: A-101, 203" 
                value={roomForm.room_number} 
                disabled={submitting}
                onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                className="h-9 text-sm mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Nama Blok *</Label>
              <Input 
                placeholder="Contoh: Blok A, Male Hostel" 
                value={roomForm.block_name} 
                disabled={submitting}
                onChange={(e) => setRoomForm({ ...roomForm, block_name: e.target.value })}
                className="h-9 text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Kapasiti Katil *</Label>
                <Input 
                  type="number" 
                  min="1"
                  value={roomForm.capacity} 
                  disabled={submitting}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 0 })}
                  className="h-9 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Sekatan Jantina *</Label>
                <Select 
                  value={roomForm.gender_restriction} 
                  disabled={submitting}
                  onValueChange={(v) => setRoomForm({ ...roomForm, gender_restriction: v })}
                >
                  <SelectTrigger className="h-9 text-sm mt-1">
                    <SelectValue placeholder="Pilih jantina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Campuran (Mixed)</SelectItem>
                    <SelectItem value="male">Lelaki (Male)</SelectItem>
                    <SelectItem value="female">Perempuan (Female)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Status Bilik / Pengurusan</Label>
              <Select 
                value={roomForm.status} 
                disabled={submitting}
                onValueChange={(v) => setRoomForm({ ...roomForm, status: v })}
              >
                <SelectTrigger className="h-9 text-sm mt-1">
                  <SelectValue placeholder="Pilih status pengurusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Automatik (Berdasarkan Residen)</SelectItem>
                  <SelectItem value="Maintenance">Penyelenggaraan (Maintenance)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                * Nota: Status 'Available', 'Occupied', dan 'Full' dikawal secara dinamik berasaskan jumlah pendaftaran check-in sebenar untuk mengelakkan desync. Status 'Maintenance' akan override pengiraan tersebut secara manual jika dipilih.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={submitting} onClick={() => setRoomDialog(false)}>Batal</Button>
            <Button size="sm" onClick={handleSaveRoom} disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Maklumat'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}