import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  Camera, 
  ScanLine, 
  CheckCircle2, 
  Building2, 
  DoorClosed, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  RotateCw, 
  KeyRound, 
  QrCode,
  XCircle,
  Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { logAudit } from '@/lib/audit';

export default function StudentCheckInModal({ 
  isOpen, 
  onClose, 
  student, 
  user, 
  onCheckInSuccess 
}) {
  const { toast } = useToast();
  const [step, setStep] = useState('room_selection'); // 'room_selection' | 'qr_scanning' | 'success'
  const [blocks, setBlocks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Room assignment state
  const [selectedBlock, setSelectedBlock] = useState(student?.block_name || '');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState(student?.room_number || '');
  const [selectedRoomId, setSelectedRoomId] = useState(student?.room_id || '');

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const html5QrCodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Initialize room data and determine initial step
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      isProcessingRef.current = false;
      return;
    }

    isProcessingRef.current = false;

    async function fetchHostelData() {
      setLoadingRooms(true);
      try {
        const [bList, rList] = await Promise.all([
          base44.entities.Block.list(),
          base44.entities.Room.list()
        ]);
        setBlocks(bList || []);
        setRooms(rList || []);
      } catch (err) {
        console.error('Failed to load blocks and rooms:', err);
      } finally {
        setLoadingRooms(false);
      }
    }

    fetchHostelData();

    // Pastikan sebarang rekod yang belum disahkan melalui imbasan QR fizikal
    // dikunci kepada 'Pending Verification' (anti-bypass jika berlaku ralat/refresh)
    // JANGAN reset jika proses pengaktifan telah berjaya (step === 'success')
    if (step !== 'success' && student?.id && !student?.qr_verified && student?.room_status === 'Checked In') {
      base44.entities.Student.update(student.id, {
        room_status: 'Pending Verification',
        resident_status: 'Registered',
        qr_verified: false
      }).catch(e => console.warn('Reset unverified student status:', e));
      student.room_status = 'Pending Verification';
      student.resident_status = 'Registered';
      student.qr_verified = false;
    }

    // If student already has room pre-assigned, go straight to QR scanning
    if (student?.block_name && student?.room_number) {
      setSelectedBlock(student.block_name);
      setSelectedRoomNumber(student.room_number);
      setSelectedRoomId(student.room_id || '');
      setStep('qr_scanning');
    } else {
      setStep('room_selection');
    }
  }, [isOpen, student]);

  // Filter blocks by gender
  const availableBlocks = blocks.filter(b => {
    const restriction = (b.gender_restriction || '').toLowerCase();
    const studentGen = (student?.gender || 'Male').toLowerCase();
    if (!restriction || restriction === 'mixed') return true;
    if (studentGen === 'male' || studentGen === 'lelaki') return restriction === 'male' || restriction === 'lelaki';
    if (studentGen === 'female' || studentGen === 'perempuan') return restriction === 'female' || restriction === 'perempuan';
    return true;
  });

  // Filter rooms by selected block
  const availableRooms = rooms.filter(r => 
    r.block_name === selectedBlock && r.status !== 'Maintenance'
  ).sort((a, b) => String(a.room_number).localeCompare(String(b.room_number)));

  // Sound chime
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

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    setIsScanning(true);

    try {
      await stopCamera();
      const qrScanner = new Html5Qrcode('student-checkin-reader');
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
          handleQrResult(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Kamera gagal dimulakan:', err);
      setCameraError('Gagal mengakses kamera peranti. Sila pastikan kebenaran kamera dibenarkan atau gunakan pilihan Kod Manual.');
      setIsScanning(false);
    }
  };

  // Stop Camera
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
    setIsScanning(false);
  };

  // When moving to QR step, trigger camera
  useEffect(() => {
    if (step === 'qr_scanning' && isOpen) {
      isProcessingRef.current = false;
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [step, isOpen]);

  // Handle QR code validation
  const handleQrResult = async (decodedText) => {
    if (isProcessingRef.current) return;

    const cleanText = (decodedText || '').trim().toUpperCase();

    // Check if the QR matches any standard KKTF physical check-in format:
    // 1. "KKTF-ACTIVATION" / "KKTF-CHECKIN" (Standard Counter / Gate QR)
    // 2. "KKTF-BLOCK-" (Block Specific QR)
    // 3. "KKTF2026" / "KKTF2025"
    const isValidKktfQr = 
      cleanText.includes('KKTF-ACTIVATION') ||
      cleanText.includes('KKTF-CHECKIN') || 
      cleanText.includes('KKTF-COUNTER') || 
      cleanText.includes('KKTF-BLOCK') ||
      cleanText === 'KKTF2026' ||
      cleanText === 'KKTF2025' ||
      cleanText.startsWith('KKTF:');

    if (!isValidKktfQr) {
      toast({
        title: 'Kod QR Tidak Sah',
        description: 'Sila imbas Kod QR Rasmi Pengaktifan Residen Kolej Kediaman Tun Fuad.',
        variant: 'destructive'
      });
      return;
    }

    isProcessingRef.current = true;

    // Pause camera immediately to prevent duplicate frame decodes
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.pause(true);
      }
    } catch (e) {}

    await stopCamera();
    await processSuccessfulCheckIn(cleanText);
  };

  // Handle Manual Code Check-In fallback
  const handleManualSubmit = async () => {
    if (isProcessingRef.current) return;
    if (!manualCode.trim()) {
      toast({ title: 'Sila masukkan kod pengesahan', variant: 'destructive' });
      return;
    }
    const clean = manualCode.trim().toUpperCase();
    if (clean !== 'KKTF2026' && clean !== 'KKTF2025' && clean !== 'KKTF-CHECKIN' && clean !== 'KKTF-ACTIVATION' && !clean.includes('KKTF')) {
      toast({ title: 'Kod Tidak Sah', description: 'Kod pengesahan kaunter salah. Sila dapatkan kod dari Felo bertugas (KKTF2026).', variant: 'destructive' });
      return;
    }

    isProcessingRef.current = true;
    await stopCamera();
    await processSuccessfulCheckIn(`MANUAL:${clean}`);
  };

  // Lock in selected room as Pending Verification before proceeding to scan (Anti-Bypass)
  const handleProceedToQr = async () => {
    if (!selectedBlock || !selectedRoomNumber) {
      toast({ title: 'Sila pilih blok dan nombor bilik', variant: 'destructive' });
      return;
    }

    setSavingRoom(true);
    try {
      const targetRoom = rooms.find(r => 
        r.block_name === selectedBlock && 
        String(r.room_number) === String(selectedRoomNumber)
      );
      const roomId = targetRoom?.id || selectedRoomId || '';

      // KUNCI STATUS:
      // Simpan penempatan bilik tetapi KEKALKAN 'room_status' sebagai 'Pending Verification'
      // dan 'qr_verified: false'. Pelajar TIDAK AKAN dapat masuk ke dashboard aktif
      // jika mereka cuba muat semula (refresh) atau tekan butang 'Back'!
      if (student?.id) {
        await base44.entities.Student.update(student.id, {
          block_name: selectedBlock,
          room_number: selectedRoomNumber,
          room_id: roomId,
          room_status: 'Pending Verification',
          resident_status: 'Registered',
          qr_verified: false
        });

        student.block_name = selectedBlock;
        student.room_number = selectedRoomNumber;
        student.room_id = roomId;
        student.room_status = 'Pending Verification';
        student.resident_status = 'Registered';
        student.qr_verified = false;
      }
    } catch (e) {
      console.warn('Gagal prapendaftaran bilik:', e);
    } finally {
      setSavingRoom(false);
      setStep('qr_scanning');
    }
  };

  // Process the actual Resident Activation in Database (ONLY CALLED ON VALID QR SCAN)
  const processSuccessfulCheckIn = async (verificationSource) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const todayIso = new Date().toISOString();
      const todayDate = todayIso.split('T')[0];
      const currentTimeStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      // Resolve student record safely
      let activeStudent = student;
      if (!activeStudent?.id && user?.email) {
        try {
          const found = await base44.entities.Student.filter({ email: user.email });
          if (found && found.length > 0) {
            activeStudent = found[0];
          }
        } catch (fErr) {
          console.warn('Could not re-fetch student:', fErr);
        }
      }

      const targetRoom = rooms.find(r => 
        r.block_name === selectedBlock && 
        String(r.room_number) === String(selectedRoomNumber)
      );

      const roomId = targetRoom?.id || selectedRoomId || '';

      // 1. Create Audit CheckIn Entry (best-effort)
      try {
        await base44.entities.CheckIn.create({
          student_id: activeStudent?.id || '',
          student_name: activeStudent?.full_name || user?.full_name || 'Pelajar',
          room_id: roomId,
          room_number: selectedRoomNumber,
          block_name: selectedBlock,
          check_in_date: todayDate,
          check_in_time: currentTimeStr,
          semester: 'Sem1_2526',
          notes: `Pengaktifan residen fizikal berjaya melalui imbasan QR (${verificationSource})`
        });
      } catch (e) {
        console.warn('CheckIn log error:', e);
      }

      // 2. Increment Room Occupancy if room found (best-effort, protected against student RBAC restrictions)
      if (targetRoom) {
        try {
          const nextOcc = (targetRoom.current_occupancy || 0) + 1;
          await base44.entities.Room.update(targetRoom.id, {
            current_occupancy: nextOcc,
            status: nextOcc >= (targetRoom.capacity || 4) ? 'Full' : 'Occupied'
          });
        } catch (roomErr) {
          console.warn('Kemaskini Room entity dilepaskan (had akses peranan pelajar):', roomErr?.message || roomErr);
        }
      }

      // 3. Log Audit (best-effort)
      try {
        await logAudit(
          user, 
          'STUDENT_RESIDENT_ACTIVATION', 
          'Pengaktifan Residen', 
          { student: activeStudent?.full_name, student_id: activeStudent?.student_id, block: selectedBlock, room: selectedRoomNumber, source: verificationSource }
        );
      } catch (aErr) {}

      // 4. HANYA SELEPAS QR DIIMBAS: AKTIFKAN PROFIL PELAJAR BERSAMA COP PENGESAHAN qr_verified: true
      if (activeStudent?.id) {
        await base44.entities.Student.update(activeStudent.id, {
          block_name: selectedBlock,
          room_number: selectedRoomNumber,
          room_id: roomId,
          check_in_date: todayDate,
          room_status: 'Checked In',
          resident_status: 'Active',
          qr_verified: true,
          qr_verified_at: todayIso,
          verification_source: verificationSource
        });

        activeStudent.block_name = selectedBlock;
        activeStudent.room_number = selectedRoomNumber;
        activeStudent.room_id = roomId;
        activeStudent.check_in_date = todayDate;
        activeStudent.room_status = 'Checked In';
        activeStudent.resident_status = 'Active';
        activeStudent.qr_verified = true;
        activeStudent.qr_verified_at = todayIso;
      }

      const verifiedPayload = {
        block_name: selectedBlock,
        room_number: selectedRoomNumber,
        room_id: roomId,
        check_in_date: todayDate,
        room_status: 'Checked In',
        resident_status: 'Active',
        qr_verified: true,
        qr_verified_at: todayIso
      };
      setSuccessData(verifiedPayload);

      playSuccessChime();

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (cErr) {}

      setStep('success');

      toast({
        title: 'Pengaktifan Residen Berjaya! 🎉',
        description: `Selamat mendiami ${selectedBlock}, Bilik ${selectedRoomNumber}. Pas Residen Digital anda kini aktif.`
      });

    } catch (err) {
      console.error('Resident activation error:', err);
      isProcessingRef.current = false;
      toast({
        title: 'Ralat Semasa Pengaktifan',
        description: err.message || 'Sila cuba lagi atau hubungi felo bertugas.',
        variant: 'destructive'
      });
      setStep('qr_scanning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    isProcessingRef.current = false;
    if (step === 'success' && successData) {
      if (onCheckInSuccess) {
        onCheckInSuccess(successData);
      }
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md w-full p-0 overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-2xl">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#0c182c] via-[#112440] to-[#0c182c] p-5 text-white relative">
          <div className="flex items-center justify-between">
            <InstitutionalDualLogo />
            <Badge className="bg-lime-500/25 text-lime-300 border-lime-400/40 text-[10px] font-mono font-bold px-2 py-0.5">
              PENGAKTIFAN RESIDEN KKTF
            </Badge>
          </div>
          <DialogTitle className="text-base font-bold text-white mt-3">
            {step === 'room_selection' && 'Langkah 1: Tetapkan Bilik Kunci'}
            {step === 'qr_scanning' && 'Langkah 2: Imbas Kod QR Pengaktifan Residen'}
            {step === 'success' && 'Tahniah! Residen Aktif Kolej'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-300 mt-0.5">
            {step === 'room_selection' && 'Pilih blok & nombor bilik mengikut kunci fizikal yang telah diserahkan di Kaunter Kunci.'}
            {step === 'qr_scanning' && 'Halakan kamera ke Kod QR Pengaktifan Residen yang dipaparkan di Kaunter Kunci atau blok anda.'}
            {step === 'success' && 'Pengaktifan residen fizikal disahkan. Pas Residen Digital anda sedia digunakan.'}
          </DialogDescription>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6">
          {/* STEP 1: ROOM SELECTION / CONFIRMATION */}
          {step === 'room_selection' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
                <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Sila masukkan <strong>Blok dan Nombor Bilik</strong> yang tertera pada tag kunci fizikal anda daripada <strong>Kaunter Kunci</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Blok Kediaman *</Label>
                  <Select 
                    value={selectedBlock} 
                    onValueChange={(val) => {
                      setSelectedBlock(val);
                      setSelectedRoomNumber('');
                      setSelectedRoomId('');
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder="Pilih Blok Kunci Anda" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBlocks.map(b => (
                        <SelectItem key={b.id} value={b.block_name}>
                          {b.block_name} ({b.gender_restriction || 'Semua'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Nombor Bilik *</Label>
                  <Select 
                    value={selectedRoomNumber} 
                    disabled={!selectedBlock || loadingRooms}
                    onValueChange={(val) => {
                      setSelectedRoomNumber(val);
                      const rObj = availableRooms.find(r => r.room_number === val);
                      setSelectedRoomId(rObj?.id || '');
                    }}
                  >
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue placeholder={selectedBlock ? "Pilih Nombor Bilik Kunci" : "Pilih blok dahulu"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map(r => (
                        <SelectItem key={r.id} value={r.room_number}>
                          Bilik {r.room_number} ({r.current_occupancy || 0}/{r.capacity || 4} orang)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedBlock && selectedRoomNumber && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{selectedBlock} • Bilik {selectedRoomNumber}</span>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px]">Sedia Sahkan</Badge>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                  Batal
                </Button>
                <Button 
                  size="sm" 
                  disabled={!selectedBlock || !selectedRoomNumber || savingRoom}
                  onClick={handleProceedToQr}
                  className="bg-[#0c182c] hover:bg-[#132440] text-white gap-1.5 text-xs font-bold"
                >
                  {savingRoom ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-lime-400" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      Seterusnya: Imbas Kod QR <ScanLine className="w-4 h-4 text-lime-400" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: QR CAMERA SCANNING */}
          {step === 'qr_scanning' && (
            <div className="space-y-4">
              {/* Room summary chip */}
              <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Building2 className="w-4 h-4 text-sky-700" />
                  <span>{selectedBlock} &bull; Bilik {selectedRoomNumber}</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => { stopCamera(); setStep('room_selection'); }}
                  className="text-[11px] text-sky-600 font-bold hover:underline"
                >
                  Tukar Bilik
                </button>
              </div>

              {/* LIVE CAMERA VIEWFINDER */}
              <div className="relative overflow-hidden rounded-2xl bg-black border-2 border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
                <div id="student-checkin-reader" className="w-full h-full max-w-[280px]" />

                {/* Animated scanning beam overlay */}
                {isScanning && !cameraError && (
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_12px_#a3e635] animate-bounce pointer-events-none" />
                )}

                {/* Camera error message fallback */}
                {cameraError && (
                  <div className="p-4 text-center space-y-2 z-10 bg-black/80 rounded-xl max-w-xs mx-auto">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-amber-200">{cameraError}</p>
                    <Button size="sm" variant="outline" onClick={startCamera} className="text-xs gap-1.5 bg-white/10 text-white border-white/20 hover:bg-white/20">
                      <RotateCw className="w-3.5 h-3.5" /> Cuba Semula Kamera
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-tight">
                Imbas kod QR pada poster <strong>"Pengaktifan Residen KKTF"</strong> di Kaunter Kunci atau blok kediaman anda.
              </p>

              {/* MANUAL CODE ENTRY AS BACKUP */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <p className="text-[11px] font-semibold text-slate-600">Kamera tidak berfungsi? Masukkan Kod Pengaktifan Kaunter:</p>
                <div className="flex gap-2">
                  <Input 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: KKTF2026"
                    className="h-9 text-xs uppercase font-mono"
                    disabled={submitting}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleManualSubmit}
                    disabled={submitting || !manualCode.trim()}
                    className="h-9 text-xs bg-lime-600 hover:bg-lime-700 text-white font-bold"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sahkan'}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { stopCamera(); setStep('room_selection'); }} 
                  className="text-xs text-slate-500"
                >
                  Kembali ke Pilihan Bilik
                </Button>
                <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                  Tutup
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-in zoom-in-90">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">Pengaktifan Residen Berjaya Disahkan!</h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  Kehadiran fizikal anda telah disahkan dan status residen kini aktif sepenuhnya.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-2 max-w-xs mx-auto text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Nama Residen:</span>
                  <span className="font-bold text-slate-800">{student?.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">No. Matrik:</span>
                  <span className="font-mono font-bold text-slate-800">{student?.student_id}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Penempatan:</span>
                  <span className="font-bold text-emerald-700">{selectedBlock} • Bilik {selectedRoomNumber}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500">Status Pas:</span>
                  <Badge className="bg-lime-500 text-slate-950 font-black text-[10px]">AKTIF RESIDEN</Badge>
                </div>
              </div>

              <Button 
                onClick={handleClose}
                className="w-full h-11 bg-gradient-to-r from-[#0c182c] to-[#132644] hover:from-[#112440] hover:to-[#1a335c] text-white font-bold text-xs rounded-xl shadow-lg mt-2"
              >
                Buka Portal & Pas Digital Anda ✨
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
