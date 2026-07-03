import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { User, Save, Loader2, Building2, Plus, X, Lock } from 'lucide-react';

const UMS_FACULTIES = [
  'Faculty of Business, Economics and Accountancy (FPEP)',
  'Faculty of Computing and Informatics (FKI)',
  'Faculty of Engineering (FKJ)',
  'Faculty of Food, Agriculture and Bioresources (FPPK)',
  'Faculty of Humanities, Arts and Heritage (FKSW)',
  'Faculty of Law (FU)',
  'Faculty of Medicine and Health Sciences (FPSK)',
  'Faculty of Psychology and Education (FPP)',
  'Faculty of Science and Natural Resources (FSSA)',
  'Faculty of Social Sciences and Liberal Arts (FOSSLA)',
  'Faculty of Sustainable Agriculture (FPL)',
  'School of Engineering and Information Technology (SEEIT)',
  'School of International Tropical Forestry (SITF)',
  'Other',
];

export default function MyProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [wardenAssignments, setWardenAssignments] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);
  const { toast } = useToast();

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    
    let studs = await base44.entities.Student.filter({ user_id: user.id });
    if (!studs.length) studs = await base44.entities.Student.filter({ email: user.email });
    const s = studs[0] || null;
    
    if (s && !s.user_id) {
      await base44.entities.Student.update(s.id, { user_id: user.id });
      s.user_id = user.id;
    }
    setStudent(s);
    setForm(s ? { ...s } : {
      student_id: '', full_name: user.full_name || '', ic_passport: '', gender: 'Male',
      date_of_birth: '', faculty: '', programme: '', year_of_study: 1,
      phone: '', email: user.email || '', block_name: '', room_number: '',
      parent_name: '', parent_phone: '', emergency_contact: '', vehicle_reg: '',
    });
    const [b, r] = await Promise.all([
      base44.entities.Block.list(),
      base44.entities.Room.list(),
    ]);
    setBlocks(b);
    setRooms(r);
    if (user.role === 'warden') {
      const wa = await base44.entities.WardenBlock.filter({ warden_user_id: user.id });
      setWardenAssignments(wa);
    }
    setLoading(false);
  }

  function computeRoomStatus(currentStatus, occupancy, capacity) {
    if (occupancy >= capacity) return 'Full';
    if (['Maintenance', 'Under Maintenance', 'Reserved', 'Not Available'].includes(currentStatus)) {
      return currentStatus;
    }
    return occupancy === 0 ? 'Available' : 'Occupied';
  }

  async function handleSave() {
    if (!form.full_name || !form.phone) {
      toast({ title: 'Full name and phone are required', variant: 'destructive' }); return;
    }
    setSaving(true);

    const oldRoomId = student?.room_id;
    const newRoomId = form.room_id;

    if (student) {
      await base44.entities.Student.update(student.id, { ...form, user_id: currentUser.id });
    } else {
      const created = await base44.entities.Student.create({ ...form, user_id: currentUser.id });
      setStudent(created);
    }

    if (oldRoomId !== newRoomId) {
      if (oldRoomId) {
        const oldRoom = rooms.find(r => r.id === oldRoomId);
        if (oldRoom) {
          const newOcc = Math.max(0, (oldRoom.current_occupancy || 1) - 1);
          const newStatus = computeRoomStatus(oldRoom.status, newOcc, Number(oldRoom.capacity || 4));
          await base44.entities.Room.update(oldRoomId, { current_occupancy: newOcc, status: newStatus });
        }
      }
      if (newRoomId) {
        const newRoom = rooms.find(r => r.id === newRoomId);
        if (newRoom) {
          const newOcc = (newRoom.current_occupancy || 0) + 1;
          const newStatus = computeRoomStatus(newRoom.status, newOcc, Number(newRoom.capacity || 4));
          await base44.entities.Room.update(newRoomId, { current_occupancy: newOcc, status: newStatus });
        }
      }
    }

    toast({ title: 'Profile saved successfully' });
    setSaving(false);
    init();
  }

  const f = (field, label, type = 'text', opts = null) => (
    <div key={field}>
      <Label className="text-xs">{label}</Label>
      {opts ? (
        <Select value={String(form[field] || '')} onValueChange={v => setForm({ ...form, [field]: type === 'number' ? Number(v) : v })}>
          <SelectTrigger className="h-9 text-sm mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>{opts.map(o => <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>)}</SelectContent>
        </Select>
      ) : (
        <Input type={type} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} className="h-9 text-sm mt-1" />
      )}
    </div>
  );

  async function addWardenBlock() {
    if (!selectedBlock) return;
    const block = blocks.find(b => b.id === selectedBlock);
    const exists = wardenAssignments.find(a => a.block_id === selectedBlock);
    if (exists) { toast({ title: 'Block already assigned', variant: 'destructive' }); return; }
    setSavingBlock(true);
    await base44.entities.WardenBlock.create({
      warden_user_id: currentUser.id,
      warden_name: currentUser.full_name || currentUser.email,
      warden_email: currentUser.email,
      block_id: selectedBlock,
      block_name: block?.block_name || '',
    });
    const wa = await base44.entities.WardenBlock.filter({ warden_user_id: currentUser.id });
    setWardenAssignments(wa);
    setSelectedBlock('');
    setSavingBlock(false);
    toast({ title: `Block ${block?.block_name} assigned` });
  }

  async function removeWardenBlock(id) {
    await base44.entities.WardenBlock.delete(id);
    setWardenAssignments(wa => wa.filter(a => a.id !== id));
    toast({ title: 'Block removed' });
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" description="View and update your personal information" />

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <p className="font-heading font-semibold text-base">{form.full_name || currentUser?.full_name}</p>
            <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentUser?.role || 'student'}</p>
          </div>
        </div>

        {/* Personal Info */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {f('full_name', 'Full Name *')}
            {f('student_id', 'Student / Staff ID')}
            {f('ic_passport', 'IC / Passport Number')}
            {f('gender', 'Gender', 'text', [{ v: 'Male', l: 'Male' }, { v: 'Female', l: 'Female' }])}
            {f('date_of_birth', 'Date of Birth', 'date')}
            {f('phone', 'Phone Number *')}
          </div>
        </div>

        {/* Academic */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Academic Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {f('faculty', 'Faculty', 'text', UMS_FACULTIES.map(fc => ({ v: fc, l: fc })))}
            {f('programme', 'Programme')}
            {f('year_of_study', 'Year of Study', 'number', [1,2,3,4,5].map(y => ({ v: y, l: `Year ${y}` })))}
          </div>
        </div>

        {/* Room Allocation - LOCKED FOR STUDENTS */}
        {(currentUser?.role === 'student' || !currentUser?.role || currentUser?.role === 'user') && (
          <div className="bg-muted/40 p-4 rounded-xl border border-border/60">
            <div className="flex items-center gap-1.5 mb-3">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room Assignment (Read-Only)</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Block</Label>
                <Select value={form.block_name || ''} disabled={true}>
                  <SelectTrigger className="h-9 text-sm mt-1 bg-muted/70 text-muted-foreground cursor-not-allowed">
                    <SelectValue placeholder="Not assigned yet" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map(b => <SelectItem key={b.id} value={b.block_name}>{b.block_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Room Number</Label>
                <Select value={form.room_number || ''} disabled={true}>
                  <SelectTrigger className="h-9 text-sm mt-1 bg-muted/70 text-muted-foreground cursor-not-allowed">
                    <SelectValue placeholder="Not assigned yet" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(r => <SelectItem key={r.id} value={r.room_number}>{r.room_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 italic">Note: Room settings are managed centrally by the college administration.</p>
          </div>
        )}

        {/* Warden Block Assignment */}
        {currentUser?.role === 'warden' && (
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assigned Blocks</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {wardenAssignments.length === 0 && <p className="text-xs text-muted-foreground">No blocks assigned yet.</p>}
              {wardenAssignments.map(a => (
                <span key={a.id} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium">
                  <Building2 className="w-3 h-3" /> {a.block_name}
                  <button onClick={() => removeWardenBlock(a.id)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Select a block to add" /></SelectTrigger>
                <SelectContent>
                  {blocks.filter(b => !wardenAssignments.find(a => a.block_id === b.id)).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.block_name} ({b.gender_restriction})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addWardenBlock} disabled={!selectedBlock || savingBlock} className="shrink-0">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>
        )}

        {/* Emergency */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {f('parent_name', 'Parent / Guardian Name')}
            {f('parent_phone', 'Parent Phone')}
            {f('emergency_contact', 'Emergency Contact')}
            {f('vehicle_reg', 'Vehicle Registration')}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={handleSave} size="sm" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
            Save Profile
          </Button>
        </div>
      </div>
    </div>
  );
}