import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeftRight, LogIn, LogOut, Search, User, CreditCard, Home } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';

export default function CheckInOut() {
  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null); 
  const [showSurvey, setShowSurvey] = useState(false);
  
  // State Carian Student / Staff ID
  const [ciSearchQuery, setCiSearchQuery] = useState('');
  const [coSearchQuery, setCoSearchQuery] = useState('');
  
  const [ciForm, setCiForm] = useState({ student_id: '', room_id: '', check_in_date: '', check_in_time: '', notes: '' });
  const [coForm, setCoForm] = useState({ student_id: '', room_id: '', check_out_date: '', check_out_time: '', room_condition: 'Good', damage_assessment: '', refund_amount: 0 });
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => { base44.auth.me().then(setCurrentUser); }, []);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [ci, co, s, r] = await Promise.all([
      base44.entities.CheckIn.list('-created_date'),
      base44.entities.CheckOut.list('-created_date'),
      base44.entities.Student.list(),
      base44.entities.Room.list(),
    ]);
    setCheckIns(ci); setCheckOuts(co); setStudents(s); setRooms(r);
    setLoading(false);
  }

  // 📥 Padanan untuk CHECK-IN: Cari mana-mana ID yang sepadan
  const matchedCiStudent = students.find(s => {
    if (!s.student_id || !ciSearchQuery) return false;
    return String(s.student_id).trim().toLowerCase() === String(ciSearchQuery).trim().toLowerCase();
  });

  // 📤 Padanan untuk CHECK-OUT: Mesti sepadan ID DAN mempunyai bilik aktif (room_id wujud)
  const matchedCoStudent = students.find(s => {
    if (!s.student_id || !coSearchQuery) return false;
    const isIdMatch = String(s.student_id).trim().toLowerCase() === String(coSearchQuery).trim().toLowerCase();
    
    // Memastikan pelajar sedang aktif mendiami bilik asrama (bukan string kosong atau null)
    const hasActiveRoom = s.room_id && String(s.room_id).trim() !== '';
    
    return isIdMatch && hasActiveRoom;
  });

  // Kesan perubahan pelajar yang dijumpai untuk set borang secara automatik
  useEffect(() => {
    if (matchedCiStudent) {
      setCiForm(prev => ({ ...prev, student_id: matchedCiStudent.id }));
    } else {
      setCiForm(prev => ({ ...prev, student_id: '' }));
    }
  }, [matchedCiStudent]);

  useEffect(() => {
    if (matchedCoStudent) {
      setCoForm(prev => ({ ...prev, student_id: matchedCoStudent.id, room_id: matchedCoStudent.room_id || '' }));
    } else {
      setCoForm(prev => ({ ...prev, student_id: '', room_id: '' }));
    }
  }, [matchedCoStudent]);

  async function handleCheckIn() {
    if (!ciForm.student_id || !ciForm.room_id || !ciForm.check_in_date) { 
      toast({ title: 'Sila isi ruangan mandatori dan pastikan ID dijumpai', variant: 'destructive' }); 
      return; 
    }
    
    try {
      const student = students.find(s => s.id === ciForm.student_id);
      const room = rooms.find(r => r.id === ciForm.room_id);

      await base44.entities.CheckIn.create({ 
        ...ciForm, 
        student_name: student?.full_name || '', 
        room_number: room?.room_number || '', 
        block_name: room?.block_name || '' 
      });

      if (student && room) {
        await base44.entities.Student.update(student.id, {
          block_name: room.block_name || '',
          room_number: room.room_number || '',
          room_id: room.id
        });

        if (student.user_id) {
          if (base44.entities.User) {
            await base44.entities.User.update(student.user_id, { role: 'student' });
          } else if (base44.auth.updateUserRole) {
            await base44.auth.updateUserRole(student.user_id, 'student');
          }
        }
      }

      if (room) {
        const newOcc = (room.current_occupancy || 0) + 1;
        await base44.entities.Room.update(room.id, { 
          current_occupancy: newOcc, 
          status: newOcc >= room.capacity ? 'Full' : 'Occupied' 
        });
      }

      toast({ title: 'Check-in recorded and profile updated successfully' });
      setCiDialog(false);
      load();
    } catch (err) {
      console.error("Gagal melakukan proses check-in:", err);
      toast({ title: 'Error recording check-in', description: err.message, variant: 'destructive' });
    }
  }

  async function handleCheckOut() {
    if (!coForm.student_id || !coForm.room_id || !coForm.check_out_date) { 
      toast({ title: 'Sila isi ruangan mandatori dan pastikan ID dijumpai', variant: 'destructive' }); 
      return; 
    }
    
    try {
      const student = students.find(s => s.id === coForm.student_id);
      const room = rooms.find(r => r.id === coForm.room_id);
      
      const checkout = await base44.entities.CheckOut.create({ 
        ...coForm, 
        student_name: student?.full_name || '', 
        room_number: room?.room_number || '', 
        block_name: room?.block_name || '' 
      });

      if (student) {
        await base44.entities.Student.update(student.id, {
          block_name: '',
          room_number: '',
          room_id: ''
        });
      }

      if (room) {
        const newOcc = Math.max(0, (room.current_occupancy || 0) - 1);
        await base44.entities.Room.update(room.id, { 
          current_occupancy: newOcc, 
          status: newOcc === 0 ? 'Available' : 'Occupied' 
        });
      }
      
      setCoDialog(false);
      setPendingCheckout({ checkoutId: checkout.id, student });
      setShowSurvey(true);
    } catch (err) {
      console.error("Gagal melakukan proses check-out:", err);
      toast({ title: 'Error recording check-out', description: err.message, variant: 'destructive' });
    }
  }

  async function onSurveyComplete() {
    setShowSurvey(false);
    setPendingCheckout(null);
    toast({ title: 'Check-out recorded successfully' });
    load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  return (
    <div>
      <PageHeader title="Check-In / Check-Out" description="Manage resident movements" actions={
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setCiSearchQuery(''); setCiForm({ student_id: '', room_id: '', check_in_date: dateStr, check_in_time: timeStr, notes: '' }); setCiDialog(true); }}><LogIn className="w-4 h-4 mr-1.5" /> Check In</Button>
          <Button size="sm" variant="outline" onClick={() => { setCoSearchQuery(''); setCoForm({ student_id: '', room_id: '', check_out_date: dateStr, check_out_time: timeStr, room_condition: 'Good', damage_assessment: '', refund_amount: 0 }); setCoDialog(true); }}><LogOut className="w-4 h-4 mr-1.5" /> Check Out</Button>
        </div>
      } />

      <Tabs defaultValue="checkins">
        <TabsList className="mb-4"><TabsTrigger value="checkins">Check-Ins</TabsTrigger><TabsTrigger value="checkouts">Check-Outs</TabsTrigger></TabsList>

        <TabsContent value="checkins">
          {checkIns.length === 0 ? <EmptyState icon={LogIn} title="No check-ins" /> : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Resident</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Room</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Block</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Time</th>
                  </tr></thead>
                  <tbody>{checkIns.map(ci => (
                    <tr key={ci.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{ci.student_name}</td>
                      <td className="px-4 py-3">{ci.room_number}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{ci.block_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ci.check_in_date}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{ci.check_in_time}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkouts">
          {checkOuts.length === 0 ? <EmptyState icon={LogOut} title="No check-outs" /> : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Resident</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Room</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Condition</th>
                  </tr></thead>
                  <tbody>{checkOuts.map(co => (
                    <tr key={co.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{co.student_name}</td>
                      <td className="px-4 py-3">{co.room_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{co.check_out_date}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{co.room_condition}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 📥 DIALOG CHECK IN */}
      <Dialog open={ciDialog} onOpenChange={setCiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Check In Resident</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            
            {/* Carian Student / Staff ID */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Carian Student / Staff ID *</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Masukkan Student / Staff ID" 
                  value={ciSearchQuery} 
                  onChange={e => setCiSearchQuery(e.target.value)} 
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Kad Butiran Pelajar */}
            {matchedCiStudent ? (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2 text-sm animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <User className="w-4 h-4 text-primary" />
                  <span>Nama: {matchedCiStudent.full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span>No. IC / Pasport: {matchedCiStudent.ic_passport || matchedCiStudent.ic_passport_number || 'Tiada rekod IC'}</span>
                </div>
              </div>
            ) : ciSearchQuery.trim() !== '' && (
              <p className="text-xs text-destructive">Pengguna tidak dijumpai. Sila pastikan Student / Staff ID tepat.</p>
            )}

            <div><Label className="text-xs">Room *</Label>
              <Select value={ciForm.room_id} onValueChange={v => setCiForm({ ...ciForm, room_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{rooms.filter(r => r.status !== 'Full').map(r => <SelectItem key={r.id} value={r.id}>{r.room_number} ({r.block_name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date *</Label><Input type="date" value={ciForm.check_in_date} onChange={e => setCiForm({ ...ciForm, check_in_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Time</Label><Input type="time" value={ciForm.check_in_time} onChange={e => setCiForm({ ...ciForm, check_in_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea value={ciForm.notes} onChange={e => setCiForm({ ...ciForm, notes: e.target.value })} className="text-sm mt-1" rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCiDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCheckIn} disabled={!ciForm.student_id}>Check In</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SurveyModal
        open={showSurvey}
        onComplete={onSurveyComplete}
        user={currentUser}
        student={pendingCheckout?.student}
        checkoutId={pendingCheckout?.checkoutId}
      />

      {/* 📤 DIALOG CHECK OUT */}
      <Dialog open={coDialog} onOpenChange={setCoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Check Out Resident</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            
            {/* Carian Student / Staff ID */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">Carian Student / Staff ID *</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Masukkan Student / Staff ID" 
                  value={coSearchQuery} 
                  onChange={e => setCoSearchQuery(e.target.value)} 
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Kad Butiran Pelajar & Maklumat Bilik Automatik */}
            {matchedCoStudent ? (
              <div className="space-y-3">
                {/* Info Peribadi */}
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg space-y-2 text-sm animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Nama: {matchedCoStudent.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CreditCard className="w-4 h-4" />
                    <span>No. IC / Pasport: {matchedCoStudent.ic_passport || matchedCoStudent.ic_passport_number || 'Tiada rekod IC'}</span>
                  </div>
                </div>

                {/* Paparan Bilik Semasa (Read-Only untuk Semakan Admin) */}
                <div className="p-3 bg-muted border border-border rounded-lg space-y-1 text-sm">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Semakan Bilik Asrama</Label>
                  <div className="flex items-center gap-2 text-foreground font-medium mt-1">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span>Bilik Semasa: <strong className="text-amber-700">{matchedCoStudent.room_number || 'Tiada No. Bilik'}</strong> ({matchedCoStudent.block_name || 'Tiada Blok'})</span>
                  </div>
                </div>
              </div>
            ) : coSearchQuery.trim() !== '' && (
              <p className="text-xs text-destructive">
                Pengguna tidak dijumpai atau tiada rekod kediaman yang aktif (belum check-in/sudah check-out).
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date *</Label><Input type="date" value={coForm.check_out_date} onChange={e => setCoForm({ ...coForm, check_out_date: e.target.value })} className="h-9 text-sm mt-1" /></div>
              <div><Label className="text-xs">Time</Label><Input type="time" value={coForm.check_out_time} onChange={e => setCoForm({ ...coForm, check_out_time: e.target.value })} className="h-9 text-sm mt-1" /></div>
            </div>
            <div><Label className="text-xs">Room Condition</Label>
              <Select value={coForm.room_condition} onValueChange={v => setCoForm({ ...coForm, room_condition: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{['Good','Fair','Damaged'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Damage Assessment</Label><Textarea value={coForm.damage_assessment} onChange={e => setCoForm({ ...coForm, damage_assessment: e.target.value })} className="text-sm mt-1" rows={2} /></div>
            <div><Label className="text-xs">Refund Amount (RM)</Label><Input type="number" min="0" value={coForm.refund_amount} onChange={e => setCoForm({ ...coForm, refund_amount: Number(e.target.value) })} className="h-9 text-sm mt-1" /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setCoDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCheckOut} disabled={!coForm.student_id}>Check Out</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}