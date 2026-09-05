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
import { Plus, ClipboardCheck, QrCode, ScanLine, Copy, Check, Calendar, Award, Sparkles } from 'lucide-react';
import { logAudit } from '@/lib/audit';

const statusBadge = { 
  Present: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30', 
  Absent: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30', 
  Late: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30' 
};
const ADMIN_ROLES = ['warden', 'admin', 'staff', 'principal', 'super_admin', 'college_admin'];

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [realEvents, setRealEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrScanOpen, setQrScanOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('custom');
  const [copiedToken, setCopiedToken] = useState(false);
  const [activeEvent, setActiveEvent] = useState({ 
    event_type: 'Assembly', 
    event_name: '', 
    attendance_date: new Date().toISOString().split('T')[0] 
  });
  const [form, setForm] = useState({ 
    student_id: '', 
    event_id: '',
    event_type: 'Program Kolej', 
    event_name: '', 
    attendance_date: new Date().toISOString().split('T')[0], 
    method: 'Manual', 
    status: 'Present' 
  });
  const { toast } = useToast();

  const isAdmin = currentUser && ADMIN_ROLES.includes(currentUser.role);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      const isAdminRole = ADMIN_ROLES.includes(user?.role);
      
      const [attList, studList, evtList] = await Promise.all([
        base44.entities.Attendance.list('-created_date'),
        isAdminRole ? base44.entities.Student.list() : Promise.resolve([]),
        base44.entities.Event.list('-event_date')
      ]);

      setRecords(attList || []);
      setStudents(studList || []);
      
      // Filter events to approved or all
      const validEvts = (evtList || []).filter(e => e.status !== 'Rejected');
      setRealEvents(validEvts);
      if (validEvts.length > 0) {
        setSelectedEventId(validEvts[0].id);
        setActiveEvent({
          event_type: validEvts[0].category || 'Program Kolej',
          event_name: validEvts[0].event_name,
          attendance_date: validEvts[0].event_date || new Date().toISOString().split('T')[0]
        });
      }

      if (!isAdminRole && user) {
        const studs = await base44.entities.Student.filter({ email: user.email });
        if (studs.length > 0) {
          setMyStudent(studs[0]);
        } else {
          // fallback find by user_id
          const byUser = await base44.entities.Student.filter({ user_id: user.id });
          setMyStudent(byUser[0] || null);
        }
      }
    } catch (err) {
      console.error('Failed loading attendance data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle change in admin event generator dropdown
  function handleSelectEvent(id) {
    setSelectedEventId(id);
    if (id === 'custom') {
      setActiveEvent({
        event_type: 'Assembly',
        event_name: '',
        attendance_date: new Date().toISOString().split('T')[0]
      });
    } else {
      const ev = realEvents.find(e => e.id === id);
      if (ev) {
        setActiveEvent({
          event_type: ev.category || 'Program Kolej',
          event_name: ev.event_name,
          attendance_date: ev.event_date || new Date().toISOString().split('T')[0]
        });
      }
    }
  }

  // Get current generated QR token
  const generatedToken = selectedEventId !== 'custom'
    ? `KKTF-EVT|${selectedEventId}|${activeEvent.event_name}|${activeEvent.attendance_date}`
    : (activeEvent.event_name ? `${activeEvent.event_name}|${activeEvent.event_type}|${activeEvent.attendance_date}` : '');

  const copyQrToken = () => {
    if (!generatedToken) return;
    navigator.clipboard.writeText(generatedToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
    toast({ title: 'Kod token acara disalin!' });
  };

  async function handleAdminSubmit() {
    if (!form.student_id || !form.event_name || !form.attendance_date) { 
      toast({ title: 'Sila lengkapkan semua medan mandatori (*)', variant: 'destructive' }); 
      return; 
    }
    const student = students.find(s => s.id === form.student_id);
    if (!student) {
      toast({ title: 'Pelajar tidak ditemui', variant: 'destructive' });
      return;
    }

    // Check duplicate
    const existing = records.find(r => 
      (r.student_id === student.id || r.student_id === student.student_id) && 
      r.event_name === form.event_name && 
      r.attendance_date === form.attendance_date
    );
    if (existing) {
      toast({ title: 'Kehadiran pelajar ini telah direkodkan untuk acara ini.', variant: 'destructive' });
      return;
    }

    // 1. Create Attendance record
    await base44.entities.Attendance.create({ 
      ...form, 
      student_name: student.full_name || '',
      student_id: student.id
    });

    // 2. If status is Present, credit merit points automatically
    if (form.status === 'Present') {
      const currentMerit = student.merit_points || 0;
      await base44.entities.Student.update(student.id, {
        merit_points: currentMerit + 10
      });

      // 3. Update EventRegistration if exists
      if (form.event_id) {
        try {
          const regs = await base44.entities.EventRegistration.filter({ 
            event_id: form.event_id, 
            student_id: student.id 
          });
          if (regs.length > 0) {
            await base44.entities.EventRegistration.update(regs[0].id, { status: 'Attended' });
          }
        } catch (e) {
          console.warn('Could not update registration status:', e);
        }
      }
    }

    await logAudit(currentUser, 'ATTENDANCE_RECORDED', 'Attendance', { 
      student: student.full_name, 
      event: form.event_name, 
      status: form.status,
      meritAwarded: form.status === 'Present' ? 10 : 0
    });

    toast({ 
      title: 'Kehadiran berjaya disimpan', 
      description: form.status === 'Present' ? `+10 Mata Merit dikreditkan ke ${student.full_name}` : '' 
    });
    setDialogOpen(false);
    init();
  }

  // Student QR self-check-in
  async function handleQrCheckIn() {
    const rawToken = qrToken.trim();
    if (!rawToken) { 
      toast({ title: 'Sila masukkan kod token acara dari QR', variant: 'destructive' }); 
      return; 
    }
    if (!myStudent) { 
      toast({ title: 'Profil residen anda tidak ditemui', variant: 'destructive' }); 
      return; 
    }

    let event_id = null;
    let event_name = '';
    let event_type = 'Program Kolej';
    let attendance_date = new Date().toISOString().split('T')[0];

    // Token formats:
    // 1. KKTF-EVT|eventId|eventName|eventDate
    // 2. eventName|eventType|date
    if (rawToken.startsWith('KKTF-EVT|')) {
      const parts = rawToken.split('|');
      event_id = parts[1];
      event_name = parts[2];
      attendance_date = parts[3] || attendance_date;
      const foundEv = realEvents.find(e => e.id === event_id);
      if (foundEv) {
        event_type = foundEv.category || 'Program Kolej';
      }
    } else {
      const parts = rawToken.split('|');
      if (parts.length < 2) {
        toast({ title: 'Format kod QR tidak sah. Sila imbas semula kod rasmi program.', variant: 'destructive' });
        return;
      }
      event_name = parts[0];
      event_type = parts[1] || 'Program Kolej';
      attendance_date = parts[2] || attendance_date;
    }

    // Check if already registered
    const existing = records.find(r => 
      (r.student_id === myStudent.id || r.student_id === myStudent.student_id) && 
      (r.event_name?.toLowerCase() === event_name?.toLowerCase() || (event_id && r.event_id === event_id)) && 
      r.attendance_date === attendance_date
    );
    if (existing) { 
      toast({ title: 'Anda telah pun mendaftar kehadiran bagi program ini!' }); 
      setQrScanOpen(false); 
      return; 
    }

    // 1. Create Attendance record
    await base44.entities.Attendance.create({ 
      student_id: myStudent.id, 
      student_name: myStudent.full_name, 
      event_id: event_id || '',
      event_type, 
      event_name, 
      attendance_date, 
      method: 'QR Code', 
      status: 'Present' 
    });

    // 2. Update Student Merit (+10)
    const currentMerit = myStudent.merit_points || 0;
    const newMerit = currentMerit + 10;
    await base44.entities.Student.update(myStudent.id, {
      merit_points: newMerit
    });
    setMyStudent(prev => prev ? { ...prev, merit_points: newMerit } : null);

    // 3. Update EventRegistration if exists
    if (event_id) {
      try {
        const regs = await base44.entities.EventRegistration.filter({ 
          event_id: event_id, 
          student_user_id: currentUser.id 
        });
        if (regs.length > 0) {
          await base44.entities.EventRegistration.update(regs[0].id, { status: 'Attended' });
        }
      } catch (err) {
        console.warn('Could not sync EventRegistration:', err);
      }
    }

    await logAudit(currentUser, 'ATTENDANCE_QR_CHECKIN', 'Attendance', { 
      event: event_name, 
      student: myStudent.full_name,
      meritAwarded: 10
    });

    toast({ 
      title: '✅ Kehadiran Berjaya Direkodkan!', 
      description: `Tahniah! +10 Mata Merit telah dikreditkan ke profil anda untuk "${event_name}".` 
    });
    setQrScanOpen(false);
    setQrToken('');
    init();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pengurusan & Pengambilan Kehadiran"
        description={isAdmin ? "Jana kod QR acara, rekod kehadiran automatik dan kemaskini mata merit residen." : "Rekod kehadiran program kolej dan pengesahan mata merit anda."}
        actions={
          <div className="flex gap-2">
            {!isAdmin && myStudent && (
              <Button size="sm" onClick={() => setQrScanOpen(true)} className="bg-primary text-primary-foreground font-medium shadow-sm">
                <QrCode className="w-4 h-4 mr-1.5" /> Imbas Kod QR Acara
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" onClick={() => { 
                setForm({ 
                  student_id: '', 
                  event_id: realEvents[0]?.id || '',
                  event_type: realEvents[0]?.category || 'Program Kolej', 
                  event_name: realEvents[0]?.event_name || '', 
                  attendance_date: realEvents[0]?.event_date || new Date().toISOString().split('T')[0], 
                  method: 'Manual', 
                  status: 'Present' 
                }); 
                setDialogOpen(true); 
              }}>
                <Plus className="w-4 h-4 mr-1.5" /> Rekod Kehadiran Manual
              </Button>
            )}
          </div>
        }
      />

      {/* Student Merit Status Banner */}
      {!isAdmin && myStudent && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Status Merit Residen: {myStudent.full_name}</p>
              <p className="text-xs text-muted-foreground">Blok {myStudent.block_name || '-'} • Bilik {myStudent.room_number || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-lg border border-border">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Terkumpul:</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{myStudent.merit_points || 0} Mata</span>
          </div>
        </div>
      )}

      {/* QR Token generation helper for admin */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" /> Penjana Kod QR Program Rasmi
            </p>
            <span className="text-xs text-muted-foreground">Format Bersepadu: KKTF-EVT</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Pilih program yang diluluskan untuk menjana kod QR rasmi bagi pendaftaran kehadiran secara kendiri oleh pelajar:
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Pilih Acara Kolej</Label>
              <Select value={selectedEventId} onValueChange={handleSelectEvent}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Pilih acara" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">-- Masukkan Manual / Perhimpunan --</SelectItem>
                  {realEvents.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.event_name} ({ev.event_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventId === 'custom' && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Nama Acara</Label>
                <Input 
                  placeholder="e.g. Perhimpunan Pagi Kolej" 
                  className="h-9 text-xs" 
                  value={activeEvent.event_name} 
                  onChange={e => setActiveEvent(a => ({ ...a, event_name: e.target.value }))} 
                />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Kategori</Label>
              <Select 
                disabled={selectedEventId !== 'custom'} 
                value={activeEvent.event_type} 
                onValueChange={v => setActiveEvent(a => ({ ...a, event_type: v }))}
              >
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Program Kolej', 'Perhimpunan', 'Sukan & Rekreasi', 'Khidmat Komuniti', 'Kerohanian', 'Taklimat'].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Tarikh Acara</Label>
              <Input 
                type="date" 
                disabled={selectedEventId !== 'custom'} 
                className="h-9 text-xs" 
                value={activeEvent.attendance_date} 
                onChange={e => setActiveEvent(a => ({ ...a, attendance_date: e.target.value }))} 
              />
            </div>
          </div>

          {generatedToken && (
            <div className="mt-4 p-4 bg-muted/50 border border-border/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-lg border border-border shadow-xs">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(generatedToken)}`} 
                    alt="QR Code Acara" 
                    className="w-20 h-20"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{activeEvent.event_name}</p>
                  <p className="text-[11px] text-muted-foreground">{activeEvent.event_type} • {activeEvent.attendance_date}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Imbas untuk +10 Mata Merit automatik</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <code className="text-xs font-mono bg-background px-2.5 py-1.5 rounded border border-border text-primary max-w-xs truncate">
                  {generatedToken}
                </code>
                <Button size="sm" variant="outline" onClick={copyQrToken} className="h-8 text-xs shrink-0">
                  {copiedToken ? <Check className="w-3.5 h-3.5 mr-1 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedToken ? 'Disalin' : 'Salin Kod'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attendance Table */}
      {records.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Tiada rekod kehadiran direkodkan lagi" />
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              {isAdmin ? `Senarai Semua Kehadiran (${records.length} Rekod)` : 'Sejarah Kehadiran Anda'}
            </p>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Setiap kehadiran bernilai +10 Merit
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Pelajar</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Program / Acara</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Kategori</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Tarikh</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Kaedah</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Mata Merit</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.student_name}
                    </td>
                    <td className="px-4 py-3 text-foreground/80 font-medium hidden sm:table-cell">
                      {r.event_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.event_type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{r.attendance_date}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        {r.method === 'QR Code' ? <QrCode className="w-3 h-3 text-primary" /> : null}
                        {r.method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === 'Present' ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          +10 Mata
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge[r.status] || 'bg-muted text-muted-foreground'}`}>
                        {r.status === 'Present' ? 'Hadir' : r.status === 'Late' ? 'Lewat' : 'Tidak Hadir'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin: manual record dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rekod Kehadiran Pelajar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Pilih Pelajar *</Label>
              <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Pilih pelajar dari senarai residen" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} ({s.student_id || s.room_number || 'Residen'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Pilih Program Sedia Ada</Label>
              <Select 
                value={form.event_id} 
                onValueChange={v => {
                  const ev = realEvents.find(e => e.id === v);
                  if (ev) {
                    setForm({
                      ...form,
                      event_id: v,
                      event_name: ev.event_name,
                      event_type: ev.category || 'Program Kolej',
                      attendance_date: ev.event_date || form.attendance_date
                    });
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue placeholder="Pilih dari program kolej..." />
                </SelectTrigger>
                <SelectContent>
                  {realEvents.map(ev => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.event_name} ({ev.event_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Nama Acara / Perhimpunan *</Label>
              <Input 
                value={form.event_name} 
                onChange={e => setForm({ ...form, event_name: e.target.value })} 
                className="h-9 text-xs mt-1" 
                placeholder="cth. Perhimpunan Residen Blok"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Kategori Acara</Label>
                <Select value={form.event_type} onValueChange={v => setForm({ ...form, event_type: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Program Kolej', 'Perhimpunan', 'Sukan & Rekreasi', 'Khidmat Komuniti', 'Kerohanian', 'Taklimat'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tarikh *</Label>
                <Input 
                  type="date" 
                  value={form.attendance_date} 
                  onChange={e => setForm({ ...form, attendance_date: e.target.value })} 
                  className="h-9 text-xs mt-1" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Kaedah</Label>
                <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manual">Manual</SelectItem>
                    <SelectItem value="QR Code">QR Code</SelectItem>
                    <SelectItem value="Walk-in">Walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status Kehadiran</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Present">Hadir (Dapat +10 Merit)</SelectItem>
                    <SelectItem value="Late">Lewat</SelectItem>
                    <SelectItem value="Absent">Tidak Hadir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleAdminSubmit}>Simpan & Kemaskini Merit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student: QR token check-in dialog */}
      <Dialog open={qrScanOpen} onOpenChange={setQrScanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" /> Pengesahan Kod Acara
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Imbas kod QR di dewan acara atau tampal / masukkan token acara rasmi yang dipaparkan oleh Felo / Urusetia program:
            </p>
            <div>
              <Label className="text-xs">Kod Token Acara *</Label>
              <Input 
                value={qrToken} 
                onChange={e => setQrToken(e.target.value)} 
                placeholder="cth. KKTF-EVT|evt123|Malam Aspirasi|2026-09-10" 
                className="h-9 text-xs mt-1 font-mono" 
              />
            </div>
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-700 dark:text-emerald-400">
              💡 Selepas pendaftaran disahkan, <strong>+10 Mata Merit</strong> akan dikreditkan serta-merta ke dalam rekod anda.
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setQrScanOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleQrCheckIn} className="bg-primary text-primary-foreground">
              Sahkan Kehadiran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}