import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Camera, 
  ScanLine, 
  ShieldCheck, 
  CalendarCheck2, 
  UserCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  Phone, 
  User, 
  Clock, 
  Sparkles, 
  RotateCcw,
  Users,
  Calendar,
  Volume2,
  FileCheck2,
  Lock,
  ChevronRight,
  ExternalLink,
  SwitchCamera,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { logAudit } from '@/lib/audit';

export default function ResidentScanner() {
  const [currentUser, setCurrentUser] = useState(null);
  const [mode, setMode] = useState('checking'); // 'checking' (Spot-Check/Curfew) | 'event' (Attendance)
  const [students, setStudents] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventName, setSelectedEventName] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('Program Kolej');
  const [eventAttendees, setEventAttendees] = useState([]);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [scannedStudent, setScannedStudent] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null); // { valid: true/false, message: '' }
  const [resultModalOpen, setResultModalOpen] = useState(false);

  // Spot-check logger state
  const [spotCheckNote, setSpotCheckNote] = useState('');
  const [spotCheckStatus, setSpotCheckStatus] = useState('Patuh Peraturan');
  const [savingLog, setSavingLog] = useState(false);

  // Camera device states
  const [availableCameras, setAvailableCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [user, sList, eList] = await Promise.all([
          base44.auth.me(),
          base44.entities.Student.list(),
          base44.entities.Attendance.list('-created_date')
        ]);
        setCurrentUser(user);
        setStudents(sList || []);

        // Derive recent distinct event names
        const distinctEvents = Array.from(new Set(eList.map(a => a.event_name).filter(Boolean))).map(name => {
          const matched = eList.find(a => a.event_name === name);
          return {
            id: name,
            name: name,
            type: matched?.event_type || 'Aktiviti Kolej',
            date: matched?.attendance_date || new Date().toISOString().split('T')[0]
          };
        });

        // Add standard default college events if list is empty
        if (distinctEvents.length === 0) {
          distinctEvents.push(
            { id: 'Majlis Makan Malam KKTF 2025/2026', name: 'Majlis Makan Malam KKTF 2025/2026', type: 'Formal', date: new Date().toISOString().split('T')[0] },
            { id: 'Perhimpunan Bulanan Kolej', name: 'Perhimpunan Bulanan Kolej', type: 'Assembly', date: new Date().toISOString().split('T')[0] },
            { id: 'Gotong-Royong Perdana KKTF', name: 'Gotong-Royong Perdana KKTF', type: 'Kebersihan', date: new Date().toISOString().split('T')[0] },
            { id: 'Sukan Antara Blok KKTF', name: 'Sukan Antara Blok KKTF', type: 'Sukan', date: new Date().toISOString().split('T')[0] }
          );
        }

        setEvents(distinctEvents);
        if (distinctEvents.length > 0) {
          setSelectedEventId(distinctEvents[0].id);
          setSelectedEventName(distinctEvents[0].name);
          setSelectedEventType(distinctEvents[0].type);
        }
      } catch (err) {
        console.error('Failed to load scanner context:', err);
      }
    }
    loadData();

    return () => {
      stopCamera();
    };
  }, []);

  // Fetch attendees when selected event changes
  useEffect(() => {
    if (mode === 'event' && selectedEventName) {
      base44.entities.Attendance.filter({ event_name: selectedEventName })
        .then(res => setEventAttendees(res || []))
        .catch(() => {});
    }
  }, [mode, selectedEventName]);

  const playChime = (success = true) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio context not allowed or failed
    }

    if (navigator.vibrate) {
      navigator.vibrate(success ? [100, 50, 100] : [300]);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async (camId = null) => {
    setCameraError('');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Kamera tidak disokong pada pelayar ini atau memerlukan sambungan selamat (HTTPS). Sila gunakan Carian Manual.');
      return;
    }

    try {
      // 1. Cleanly stop and reset any previous instance
      await stopCamera();

      // 2. Set isScanning state so the mounting container is rendered
      setIsScanning(true);

      // 3. Small timeout to allow DOM node to mount firmly
      await new Promise((r) => setTimeout(r, 200));

      const streamElement = document.getElementById('qr-camera-stream');
      if (!streamElement) {
        throw new Error('Elemen kamera tidak ditemui dalam DOM.');
      }

      const qrScanner = new Html5Qrcode('qr-camera-stream');
      html5QrCodeRef.current = qrScanner;

      // 4. Discover available cameras
      let selectedId = camId || activeCameraId;
      try {
        const cams = await Html5Qrcode.getCameras();
        if (cams && cams.length > 0) {
          setAvailableCameras(cams);
          if (!selectedId) {
            // Find back camera if available, else first camera
            const back = cams.find((c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('belakang') ||
              c.label.toLowerCase().includes('environment')
            );
            selectedId = back ? back.id : cams[0].id;
          }
          setActiveCameraId(selectedId);
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras, falling back to facingMode:', camErr);
      }

      const qrConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdge * 0.75);
          return { width: Math.min(qrboxSize, 280), height: Math.min(qrboxSize, 280) };
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      };

      // Try camera by ID first, then fallback to environment or user facingMode
      if (selectedId) {
        try {
          await qrScanner.start(
            selectedId,
            qrConfig,
            (decodedText) => handleQrDecoded(decodedText),
            () => {}
          );
          return;
        } catch (idErr) {
          console.warn('Start with camera ID failed, attempting fallback to facingMode...', idErr);
        }
      }

      // Fallback 1: facingMode environment
      try {
        await qrScanner.start(
          { facingMode: 'environment' },
          qrConfig,
          (decodedText) => handleQrDecoded(decodedText),
          () => {}
        );
      } catch (envErr) {
        console.warn('FacingMode environment failed, attempting user facingMode...', envErr);
        // Fallback 2: facingMode user (e.g. laptop webcam)
        await qrScanner.start(
          { facingMode: 'user' },
          qrConfig,
          (decodedText) => handleQrDecoded(decodedText),
          () => {}
        );
      }
    } catch (err) {
      console.error('Camera start error:', err);
      let msg = 'Gagal mengakses kamera peranti. ';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg += 'Kebenaran kamera disekat. Sila benarkan akses kamera dalam tetapan pelayar anda.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg += 'Tiada kamera dikesan pada peranti anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg += 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.name === 'OverconstrainedError') {
        msg += 'Konfigurasi kamera tidak disokong oleh perkakasan.';
      } else {
        msg += 'Sila pastikan kebenaran kamera diberikan atau gunakan carian manual di bawah.';
      }
      setCameraError(msg);
      await stopCamera();
    }
  };

  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) return;
    const currentIndex = availableCameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamId = availableCameras[nextIndex].id;
    setActiveCameraId(nextCamId);
    startCamera(nextCamId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await stopCamera();
      setIsScanning(true);
      await new Promise((r) => setTimeout(r, 150));

      const tempScanner = new Html5Qrcode('qr-camera-stream');
      const decodedText = await tempScanner.scanFile(file, true);
      handleQrDecoded(decodedText);
      await tempScanner.clear();
    } catch (err) {
      console.error('File scan error:', err);
      toast.error('Kod QR tidak dapat dikesan dalam gambar tersebut. Sila cuba gambar lain atau gunakan carian manual.');
      await stopCamera();
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleQrDecoded = (decodedText) => {
    setLastScannedResult(decodedText);
    
    // Stop camera temporarily to avoid spamming multiple reads
    stopCamera();

    let cleanText = decodedText ? decodedText.trim() : '';
    try {
      cleanText = decodeURIComponent(cleanText);
    } catch (e) {}

    // Parse decoded string:
    // Formats:
    // 1) "UMS-KKTF-PASS|BP23110045|Block G|Bilik G-B.05|ACTIVE20252026"
    // 2) "KKTF-PASS:BP23110045:Block G:Bilik G-B.05:VERIFIED"
    // 3) URL e.g. "https://.../BP23110045"
    // 4) Raw Matric number e.g. "BP23110045"
    let parsedMatric = '';
    if (cleanText.includes('|')) {
      const parts = cleanText.split('|');
      parsedMatric = parts[1] || '';
    } else if (cleanText.includes(':')) {
      const parts = cleanText.split(':');
      parsedMatric = parts[1] || '';
    } else if (cleanText.includes('/')) {
      const parts = cleanText.split('/');
      parsedMatric = parts[parts.length - 1] || '';
    } else {
      parsedMatric = cleanText;
    }

    processStudentVerification(parsedMatric.trim());
  };

  const handleManualSearch = () => {
    if (!manualInput.trim()) {
      toast.error('Sila masukkan No. Matrik atau Nama Pelajar.');
      return;
    }
    processStudentVerification(manualInput.trim());
  };

  const processStudentVerification = async (searchQuery) => {
    const query = searchQuery.toLowerCase();
    
    // Match in database
    const matched = students.find(s => 
      (s.student_id && s.student_id.toLowerCase() === query) ||
      (s.full_name && s.full_name.toLowerCase().includes(query)) ||
      (s.ic_passport && s.ic_passport.toLowerCase() === query)
    );

    if (matched) {
      playChime(true);
      setScannedStudent(matched);
      setVerificationResult({
        valid: true,
        message: 'RESIDEN SAH & BERDAFTAR DI KKTF'
      });

      // If in event attendance mode, automatically record attendance!
      if (mode === 'event') {
        recordEventAttendance(matched);
      } else {
        setResultModalOpen(true);
      }
    } else {
      playChime(false);
      setScannedStudent({
        student_id: searchQuery.toUpperCase(),
        full_name: 'REKOD TIDAK DITEMUI',
        block_name: 'Bukan Residen',
        room_number: '-',
        faculty: 'Tiada rekod pendaftaran KKTF ditemui'
      });
      setVerificationResult({
        valid: false,
        message: 'AMARAN: REKOD TIDAK SAH ATAU PENGHUNI TIDAK BERDAFTAR'
      });
      setResultModalOpen(true);
    }
  };

  const recordEventAttendance = async (student) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      // Check if already checked in
      const existing = eventAttendees.find(a => a.student_id === student.id && a.event_name === selectedEventName);
      if (existing) {
        toast.info(`${student.full_name} sudah didaftarkan hadir sebelum ini.`);
        setResultModalOpen(true);
        return;
      }

      await base44.entities.Attendance.create({
        student_id: student.id,
        student_name: student.full_name,
        event_name: selectedEventName,
        event_type: selectedEventType,
        attendance_date: today,
        method: 'QR Scan (Staff/JAKMAS)',
        status: 'Present',
        scanner_by: currentUser?.full_name || currentUser?.email || 'Pegawai Bertugas'
      });

      toast.success(`✅ KEHADIRAN BERJAYA: ${student.full_name} (${student.student_id})`);
      setEventAttendees(prev => [{
        id: Date.now().toString(),
        student_id: student.id,
        student_name: student.full_name,
        created_date: new Date().toISOString()
      }, ...prev]);

      setResultModalOpen(true);
    } catch (err) {
      console.error('Error logging attendance:', err);
      toast.error('Gagal mencatat kehadiran.');
    }
  };

  const handleSaveSpotCheckLog = async () => {
    if (!scannedStudent || !scannedStudent.id) return;
    setSavingLog(true);
    try {
      await logAudit(
        currentUser,
        'SPOT_CHECK_RECORDED',
        'ResidentPassport',
        {
          student: scannedStudent.full_name,
          matric: scannedStudent.student_id,
          block: scannedStudent.block_name,
          room: scannedStudent.room_number,
          status: spotCheckStatus,
          note: spotCheckNote
        }
      );

      toast.success('Log pemeriksaan residen berjaya disimpan!');
      setResultModalOpen(false);
      setSpotCheckNote('');
    } catch (e) {
      console.error(e);
      toast.error('Gagal menyimpan log.');
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* INSTITUTIONAL HEADER & BRANDING */}
      <div className="bg-gradient-to-br from-[#0c182c] via-[#112440] to-[#0d1e34] border border-lime-500/30 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-lime-500/20 text-lime-300 border border-lime-400/30 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Portal Pengesahan Residen Rasmi
            </div>
            <h1 className="text-2xl font-heading font-black tracking-tight text-white flex items-center gap-2 mt-1">
              <ScanLine className="w-6 h-6 text-lime-400" />
              Pengimbas Pas Residen Digital KKTF
            </h1>
            <p className="text-xs text-slate-300 max-w-lg">
              Modul khas untuk <strong>Felo, Pentadbir & JAKMAS</strong> mengimbas kod QR pas pelajar bagi semakan keselamatan bilik, rondaan malam, dan kehadiran aktiviti kolej.
            </p>
          </div>

          <div className="bg-white/95 rounded-2xl p-2 shadow-lg shrink-0 self-start sm:self-center">
            <InstitutionalDualLogo />
          </div>
        </div>

        {/* MODE TOGGLE TABS */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/80 mt-6 max-w-md">
          <button
            onClick={() => { setMode('checking'); stopCamera(); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              mode === 'checking' 
                ? 'bg-gradient-to-r from-lime-500 to-emerald-600 text-slate-950 shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Semakan Keselamatan & Rondaan</span>
          </button>

          <button
            onClick={() => { setMode('event'); stopCamera(); }}
            className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              mode === 'event' 
                ? 'bg-gradient-to-r from-lime-500 to-emerald-600 text-slate-950 shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4 h-4" />
            <span>2. Kehadiran Program / Event</span>
          </button>
        </div>
      </div>

      {/* ACTIVE EVENT SELECTOR (IF IN EVENT MODE) */}
      {mode === 'event' && (
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" /> Pilih Program / Acara Kolej
              </Label>
              <p className="text-[11px] text-muted-foreground">Setiap imbasan akan didaftarkan secara automatik ke dalam acara ini.</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-lime-500/20 text-lime-700 dark:text-lime-300 border border-lime-400/30 text-xs font-mono font-bold px-3 py-1">
                <Users className="w-3.5 h-3.5 mr-1" /> {eventAttendees.length} Hadir
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select 
              value={selectedEventName} 
              onValueChange={(val) => {
                setSelectedEventName(val);
                const ev = events.find(e => e.name === val);
                if (ev) setSelectedEventType(ev.type);
              }}
            >
              <SelectTrigger className="h-10 text-xs font-medium bg-background">
                <SelectValue placeholder="Pilih Acara" />
              </SelectTrigger>
              <SelectContent>
                {events.map(e => (
                  <SelectItem key={e.id} value={e.name}>
                    {e.name} ({e.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input 
              value={selectedEventName}
              onChange={(e) => setSelectedEventName(e.target.value)}
              placeholder="Atau taip nama acara baharu..."
              className="h-10 text-xs"
            />
          </div>
        </div>
      )}

      {/* SCANNER CAMERA & INPUT CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: LIVE CAMERA VIEW */}
        <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
          {/* CAMERA FEED WRAPPER */}
          <div 
            className={`w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-slate-950 relative border-2 transition-all ${
              isScanning ? 'border-lime-500 shadow-[0_0_25px_rgba(132,204,22,0.3)]' : 'border-slate-800'
            }`}
          >
            {/* The dedicated mount div for Html5Qrcode - React NEVER puts children inside it */}
            <div 
              id="qr-camera-stream" 
              className={`w-full h-full ${isScanning ? 'block' : 'hidden'}`}
            />

            {/* Visual placeholder when NOT scanning */}
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 z-10 bg-slate-950">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                  <Camera className="w-8 h-8 text-lime-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Kamera Belum Diaktifkan</p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Tekan butang di bawah untuk membuka kamera telefon/laptop dan halakan ke kod QR pas pelajar.
                  </p>
                </div>
              </div>
            )}

            {/* Active Scanner Laser & Reticle Animation when scanning */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
                <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-lime-400/80 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lime-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-lime-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-lime-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lime-400" />
                  {/* Animated Scanning Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_#a3e635] animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] font-semibold text-lime-400 bg-slate-900/80 px-2.5 py-0.5 rounded-full mt-3">
                  Halakan ke Kod QR Pelajar
                </span>
              </div>
            )}
          </div>

          {/* CAMERA ERROR NOTICE */}
          {cameraError && (
            <div className="mt-3 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5 max-w-md w-full">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <p className="font-bold">Ralat Kamera:</p>
                <p className="leading-relaxed">{cameraError}</p>
              </div>
            </div>
          )}

          {/* SCANNER CONTROLS */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 w-full">
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />

            {!isScanning ? (
              <>
                <Button 
                  onClick={() => startCamera()}
                  className="bg-gradient-to-r from-lime-600 via-lime-500 to-emerald-600 hover:from-lime-700 hover:to-emerald-700 text-slate-950 font-bold text-xs gap-2 px-6 h-11 rounded-xl shadow-lg shadow-lime-500/20"
                >
                  <Camera className="w-4 h-4 text-slate-950" /> Buka Kamera Pengimbas QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold gap-2 px-4 h-11 rounded-xl border-slate-300 dark:border-slate-700"
                  title="Pilih gambar atau tangkap layar kod QR dari peranti"
                >
                  <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" /> Imbas Gambar QR
                </Button>
              </>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button 
                  variant="destructive"
                  onClick={stopCamera}
                  className="text-xs font-bold gap-2 px-6 h-11 rounded-xl"
                >
                  <RotateCcw className="w-4 h-4" /> Hentikan Kamera
                </Button>
                {availableCameras.length > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleSwitchCamera}
                    className="text-xs font-semibold gap-2 px-4 h-11 rounded-xl"
                  >
                    <SwitchCamera className="w-4 h-4 text-lime-500" /> Tukar Kamera ({availableCameras.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: MANUAL SEARCH FALLBACK & STATS */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" /> Carian Manual / No. Matrik
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Jika kamera tidak dapat membaca atau pelajar tidak membawa telefon, masukkan No. Matrik di sini.
              </p>
            </div>

            <div className="space-y-2">
              <Input 
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                placeholder="Cth: BP23110045 / Nama"
                className="h-10 text-xs uppercase font-mono font-semibold"
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(); }}
              />

              <Button 
                onClick={handleManualSearch}
                className="w-full bg-[#132644] hover:bg-[#1e385f] text-white text-xs font-semibold h-10 gap-1.5 rounded-xl shadow-xs"
              >
                <Search className="w-3.5 h-3.5" /> Semak Rekod Pelajar
              </Button>
            </div>
          </div>

          {/* RECENT ATTENDEES (IN EVENT MODE) */}
          {mode === 'event' && (
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" /> Senarai Terkini Hadir
                </h4>
                <span className="text-[10px] text-muted-foreground">{eventAttendees.length} Orang</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {eventAttendees.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-4">Belum ada rekod imbasan untuk acara ini.</p>
                ) : (
                  eventAttendees.slice(0, 8).map((att, i) => (
                    <div key={i} className="p-2 bg-muted/40 rounded-xl flex items-center justify-between border border-border">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold truncate text-[11px] text-foreground">{att.student_name}</p>
                        <p className="text-[9px] text-muted-foreground">{new Date(att.created_date || Date.now()).toLocaleTimeString()}</p>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] px-1.5 py-0.5">
                        Hadir
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VERIFICATION RESULT DIALOG */}
      <Dialog open={resultModalOpen} onOpenChange={setResultModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-border rounded-3xl shadow-2xl">
          {/* TOP RESULT HEADER */}
          <div className={`p-5 text-white ${
            verificationResult?.valid 
              ? 'bg-gradient-to-r from-emerald-700 to-teal-800' 
              : 'bg-gradient-to-r from-rose-700 to-red-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
                {verificationResult?.valid ? <CheckCircle2 className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div className="space-y-0.5">
                <Badge className="bg-white/25 text-white border-white/30 text-[9px] font-mono font-bold uppercase">
                  {verificationResult?.valid ? 'Sah & Berdaftar' : 'Amaran Tidak Sah'}
                </Badge>
                <h3 className="text-base font-bold font-heading leading-tight">
                  {verificationResult?.message}
                </h3>
              </div>
            </div>
          </div>

          {/* STUDENT DETAILS BODY */}
          {scannedStudent && (
            <div className="p-5 space-y-4 text-xs">
              <div className="flex gap-3 items-center pb-3 border-b border-border">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                  <User className="w-7 h-7" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="font-heading font-extrabold text-sm text-foreground truncate uppercase">
                    {scannedStudent.full_name}
                  </p>
                  <p className="font-mono font-bold text-xs text-primary">
                    {scannedStudent.student_id}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {scannedStudent.faculty || 'Universiti Malaysia Sabah'}
                  </p>
                </div>
              </div>

              {/* LOCATION & RESIDENT INFO */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-muted/50 rounded-xl border border-border">
                  <p className="text-[9.5px] uppercase font-bold text-muted-foreground">Blok Kediaman</p>
                  <p className="font-bold text-foreground mt-0.5">{scannedStudent.block_name || 'Tiada'}</p>
                </div>

                <div className="p-2.5 bg-muted/50 rounded-xl border border-border">
                  <p className="text-[9.5px] uppercase font-bold text-muted-foreground">Nombor Bilik</p>
                  <p className="font-bold text-foreground mt-0.5">Bilik {scannedStudent.room_number || '-'}</p>
                </div>

                <div className="p-2.5 bg-muted/50 rounded-xl border border-border">
                  <p className="text-[9.5px] uppercase font-bold text-muted-foreground">Telefon Pelajar</p>
                  <p className="font-mono font-bold text-foreground mt-0.5">{scannedStudent.phone || 'N/A'}</p>
                </div>

                <div className="p-2.5 bg-muted/50 rounded-xl border border-border">
                  <p className="text-[9.5px] uppercase font-bold text-muted-foreground">Kontak Waris / Ibu Bapa</p>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{scannedStudent.parent_phone || scannedStudent.emergency_contact || 'N/A'}</p>
                </div>
              </div>

              {/* SPOT CHECK LOGGER SECTION (IF IN CHECKING MODE) */}
              {mode === 'checking' && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5 text-primary" /> Rekod Log Rondaan Felo
                  </Label>

                  <Select value={spotCheckStatus} onValueChange={setSpotCheckStatus}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Patuh Peraturan">✅ Patuh Peraturan (Lulus)</SelectItem>
                      <SelectItem value="Amaran Jam Malam">⚠️ Amaran Jam Malam (Lewat Balik)</SelectItem>
                      <SelectItem value="Pelawat Tanpa Kebenaran">❌ Pelawat Tanpa Kebenaran</SelectItem>
                      <SelectItem value="Bilik Tidak Kemas / Pemeriksaan">📋 Catatan Pemeriksaan Bilik</SelectItem>
                    </SelectContent>
                  </Select>

                  <Textarea 
                    value={spotCheckNote}
                    onChange={(e) => setSpotCheckNote(e.target.value)}
                    placeholder="Catatan tambahan Felo (Pilihan)..."
                    className="text-xs h-16"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setResultModalOpen(false); startCamera(); }}
              className="flex-1 text-xs rounded-xl"
            >
              Imbas Pelajar Seterusnya
            </Button>

            {mode === 'checking' && (
              <Button 
                size="sm" 
                disabled={savingLog}
                onClick={handleSaveSpotCheckLog}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                {savingLog ? 'Menyimpan...' : 'Simpan Log Rondaan'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
