import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  Plus, 
  ClipboardCheck, 
  QrCode, 
  ScanLine, 
  Copy, 
  Check, 
  Calendar, 
  Award, 
  Sparkles,
  Camera,
  Keyboard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
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
  const [scannerMode, setScannerMode] = useState('camera'); // 'camera' | 'manual'
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isProcessingQr, setIsProcessingQr] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [myStudent, setMyStudent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState('custom');
  const [copiedToken, setCopiedToken] = useState(false);
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);
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

  // Sound chime upon successful attendance scan
  const playSuccessChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Start Live Camera Scanner
  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(false);
    isProcessingRef.current = false;

    try {
      await stopCamera();
      const qrScanner = new Html5Qrcode('resident-attendance-reader');
      html5QrCodeRef.current = qrScanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await qrScanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isProcessingRef.current) {
            isProcessingRef.current = true;
            processAttendanceToken(decodedText);
          }
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err) {
      console.error('Kamera gagal dimulakan:', err);
      setCameraError('Gagal mengakses kamera. Sila pastikan kebenaran kamera (permission) dibenarkan pada pelayar anda atau gunakan tab Kod Token Manual.');
      setIsCameraActive(false);
    }
  };

  // Stop Live Camera Scanner
  const stopCamera = async () => {
    const scanner = html5QrCodeRef.current;
    if (scanner) {
      html5QrCodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setIsCameraActive(false);
  };

  const closeQrModal = () => {
    stopCamera();
    setQrScanOpen(false);
    setQrToken('');
    setCameraError('');
    setIsProcessingQr(false);
    isProcessingRef.current = false;
  };

  // Trigger camera lifecycle when modal opens or mode changes
  useEffect(() => {
    if (qrScanOpen && scannerMode === 'camera') {
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [qrScanOpen, scannerMode]);

  // Unified QR / Token Attendance Processor
  async function processAttendanceToken(tokenString) {
    const rawToken = (tokenString || '').trim();
    if (!rawToken) { 
      toast({ title: 'Sila masukkan kod token acara dari QR', variant: 'destructive' }); 
      return; 
    }
    if (!myStudent) { 
      toast({ title: 'Profil residen anda tidak ditemui', description: 'Sila lengkapkan profil pelajar anda terlebih dahulu.', variant: 'destructive' }); 
      return; 
    }

    setIsProcessingQr(true);

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
      event_name = parts[2] || 'Program Kolej';
      attendance_date = parts[3] || attendance_date;
      const foundEv = realEvents.find(e => e.id === event_id);
      if (foundEv) {
        event_type = foundEv.category || 'Program Kolej';
        event_name = foundEv.event_name || event_name;
      }
    } else {
      const parts = rawToken.split('|');
      if (parts.length < 2) {
        toast({ title: 'Format kod QR tidak sah', description: 'Sila imbas semula kod QR rasmi yang dipaparkan di dewan program.', variant: 'destructive' });
        setIsProcessingQr(false);
        isProcessingRef.current = false;
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
      toast({ 
        title: 'Kehadiran Telah Direkodkan!', 
        description: `Anda telah pun mengesahkan kehadiran bagi "${event_name}".` 
      }); 
      closeQrModal();
      return; 
    }

    try {
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
      const currentMerit = Number(myStudent.merit_points) || 0;
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

      // Feedback sound & confetti
      playSuccessChime();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      toast({ 
        title: '🎉 Kehadiran Berjaya Direkodkan!', 
        description: `Tahniah! +10 Mata Merit telah dikreditkan ke profil anda untuk "${event_name}".` 
      });
      closeQrModal();
      init();
    } catch (err) {
      console.error('Error saving attendance:', err);
      toast({ title: 'Ralat menyimpan kehadiran', description: 'Sila cuba sebentar lagi.', variant: 'destructive' });
      setIsProcessingQr(false);
      isProcessingRef.current = false;
    }
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
      {(() => {
        const displayRecords = isAdmin 
          ? records 
          : records.filter(r => 
              (myStudent && (r.student_id === myStudent.id || r.student_id === myStudent.student_id)) ||
              (currentUser && (r.student_email === currentUser.email || r.student_name?.toLowerCase() === myStudent?.full_name?.toLowerCase()))
            );

        if (displayRecords.length === 0) {
          return <EmptyState icon={ClipboardCheck} title={isAdmin ? "Tiada rekod kehadiran direkodkan lagi" : "Anda belum mempunyai sejarah kehadiran program"} />;
        }

        return (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {isAdmin ? `Senarai Semua Kehadiran (${displayRecords.length} Rekod)` : `Sejarah Kehadiran Anda (${displayRecords.length} Acara Disertai)`}
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
                  {displayRecords.map(r => (
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
        );
      })()}

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

      {/* Student: Live Camera & Token QR Attendance Scanner Modal */}
      <Dialog open={qrScanOpen} onOpenChange={(open) => { if (!open) closeQrModal(); else setQrScanOpen(true); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-border rounded-3xl shadow-2xl">
          <DialogHeader className="p-5 pb-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-heading font-bold text-foreground">
                <QrCode className="w-5 h-5 text-primary" /> Pengimbas Kehadiran Residen
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Imbas kod QR di lokasi program atau paparan acara untuk rekod kehadiran dan pengkreditan merit automatik.
            </DialogDescription>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-3 bg-muted/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setScannerMode('camera'); setCameraError(''); }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  scannerMode === 'camera'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="w-4 h-4" /> Kamera Langsung
              </button>
              <button
                type="button"
                onClick={() => { setScannerMode('manual'); stopCamera(); }}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  scannerMode === 'manual'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Keyboard className="w-4 h-4" /> Kod Token Manual
              </button>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4">
            {scannerMode === 'camera' ? (
              <div className="space-y-3">
                {cameraError ? (
                  <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 text-center space-y-3">
                    <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-rose-800 dark:text-rose-300">Akses Kamera Disekat / Tidak Ditemui</p>
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">{cameraError}</p>
                    </div>
                    <div className="flex justify-center gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={startCamera} className="text-xs h-8 gap-1.5 rounded-xl">
                        <RefreshCw className="w-3.5 h-3.5" /> Cuba Semula
                      </Button>
                      <Button size="sm" onClick={() => { setScannerMode('manual'); stopCamera(); }} className="text-xs h-8 gap-1.5 rounded-xl bg-primary text-primary-foreground">
                        <Keyboard className="w-3.5 h-3.5" /> Guna Kod Manual
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    {/* Camera Viewfinder Box */}
                    <div 
                      id="resident-attendance-reader" 
                      className="w-full aspect-square max-w-[280px] bg-black rounded-3xl overflow-hidden border-2 border-primary/60 relative shadow-inner flex items-center justify-center"
                    >
                      {!isCameraActive && (
                        <div className="flex flex-col items-center gap-2 text-white/70 p-4 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <span className="text-xs font-medium">Mengaktifkan kamera peranti...</span>
                          <span className="text-[10px] text-white/50">Sila benarkan akses kamera apabila diminta</span>
                        </div>
                      )}
                    </div>

                    {isCameraActive && (
                      <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5 font-medium">
                        <ScanLine className="w-4 h-4 text-primary animate-pulse" />
                        Halakan lensa kamera pada Kod QR Program rasmi KKTF
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Masukkan atau tampal kod token acara yang dipaparkan oleh Urusetia / Felo Penyelaras:
                </p>
                <div>
                  <Label className="text-xs font-bold">Kod Token Acara *</Label>
                  <Input 
                    value={qrToken} 
                    onChange={e => setQrToken(e.target.value)} 
                    placeholder="cth: KKTF-EVT|evt123|Malam Aspirasi|2026-09-10" 
                    className="h-10 text-xs mt-1.5 font-mono" 
                  />
                </div>
                <Button 
                  size="sm" 
                  onClick={() => processAttendanceToken(qrToken)} 
                  disabled={!qrToken.trim() || isProcessingQr}
                  className="w-full text-xs h-9 bg-primary text-primary-foreground font-bold rounded-xl shadow-xs"
                >
                  {isProcessingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
                  Sahkan Kehadiran Sekarang
                </Button>
              </div>
            )}

            {/* Instant Merit Award Guarantee Card */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs flex items-center gap-1.5">
                  Ganjaran Kehadiran: +10 Mata Merit
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Mata merit akan terus dikreditkan ke akaun anda sejurus pengesahan berjaya.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex justify-end">
            <Button variant="outline" size="sm" onClick={closeQrModal} className="text-xs rounded-xl">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}