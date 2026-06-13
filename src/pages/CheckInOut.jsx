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
import { ArrowLeftRight, LogIn, LogOut } from 'lucide-react';
import SurveyModal from '@/components/SurveyModal';

export default function CheckInOut() {
  const [checkIns, setCheckIns] = useState([]);
  const [checkOuts, setCheckOuts] = useState([]);
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ciDialog, setCiDialog] = useState(false);
  const [coDialog, setCoDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null); // { checkoutData, student }
  const [showSurvey, setShowSurvey] = useState(false);
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

  async function handleCheckIn() {
    if (!ciForm.student_id || !ciForm.room_id || !ciForm.check_in_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === ciForm.student_id);
    const room = rooms.find(r => r.id === ciForm.room_id);
    await base44.entities.CheckIn.create({ ...ciForm, student_name: student?.full_name || '', room_number: room?.room_number || '', block_name: room?.block_name || '' });
    if (room) {
      const newOcc = (room.current_occupancy || 0) + 1;
      await base44.entities.Room.update(room.id, { current_occupancy: newOcc, status: newOcc >= room.capacity ? 'Full' : 'Occupied' });
    }
    toast({ title: 'Check-in recorded' });
    setCiDialog(false);
    load();
  }

  async function handleCheckOut() {
    if (!coForm.student_id || !coForm.room_id || !coForm.check_out_date) { toast({ title: 'Fill required fields', variant: 'destructive' }); return; }
    const student = students.find(s => s.id === coForm.student_id);
    const room = rooms.find(r => r.id === coForm.room_id);
    const checkout = await base44.entities.CheckOut.create({ ...coForm, student_name: student?.full_name || '', room_number: room?.room_number || '', block_name: room?.block_name || '' });
    if (room) {
      const newOcc = Math.max(0, (room.current_occupancy || 0) - 1);
      await base44.entities.Room.update(room.id, { current_occupancy: newOcc, status: newOcc === 0 ? 'Available' : 'Occupied' });
    }
    setCoDialog(false);
    // Show survey before completing
    setPendingCheckout({ checkoutId: checkout.id, student });
    setShowSurvey(true);
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
          <Button size="sm" onClick={() => { setCiForm({ student_id: '', room_id: '', check_in_date: dateStr, check_in_time: timeStr, notes: '' }); setCiDialog(true); }}><LogIn className="w-4 h-4 mr-1.5" /> Check In</Button>
          <Button size="sm" variant="outline" onClick={() => { setCoForm({ student_id: '', room_id: '', check_out_date: dateStr, check_out_time: timeStr, room_condition: 'Good', damage_assessment: '', refund_amount: 0 }); setCoDialog(true); }}><LogOut className="w-4 h-4 mr-1.5" /> Check Out</Button>
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
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
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Student</th>
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

      <Dialog open={ciDialog} onOpenChange={setCiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Check In</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={ciForm.student_id} onValueChange={v => setCiForm({ ...ciForm, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setCiDialog(false)}>Cancel</Button><Button size="sm" onClick={handleCheckIn}>Check In</Button></div>
        </DialogContent>
      </Dialog>

      <SurveyModal
        open={showSurvey}
        onComplete={onSurveyComplete}
        user={currentUser}
        student={pendingCheckout?.student}
        checkoutId={pendingCheckout?.checkoutId}
      />

      <Dialog open={coDialog} onOpenChange={setCoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Check Out</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Student *</Label>
              <Select value={coForm.student_id} onValueChange={v => setCoForm({ ...coForm, student_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Room *</Label>
              <Select value={coForm.room_id} onValueChange={v => setCoForm({ ...coForm, room_id: v })}>
                <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{rooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_number} ({r.block_name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
          <div className="flex justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setCoDialog(false)}>Cancel</Button><Button size="sm" onClick={handleCheckOut}>Check Out</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}