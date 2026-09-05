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
  const html5QrCodeRef = useRef(null);

  // Initialize room data and determine initial step
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

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
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // When moving to QR step, trigger camera
  useEffect(() => {
    if (step === 'qr_scanning' && isOpen) {
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
    const cleanText = (decodedText || '').trim().toUpperCase();

    // Check if the QR matches any standard KKTF physical check-in format:
    // 1. "KKTF-CHECKIN" (Standard Counter / Gate QR)
    // 2. "KKTF-BLOCK-" (Block Specific QR)
    // 3. "KKTF2025" or "CHECKIN"
    const isValidKktfQr = 
      cleanText.includes('KKTF-CHECKIN') || 
      cleanText.includes('KKTF-COUNTER') || 
      cleanText.includes('KKTF-BLOCK') ||
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

    await stopCamera();
    await processSuccessfulCheckIn(cleanText);
  };

  // Handle Manual Code Check-In fallback
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      toast({ title: 'Sila masukkan kod pengesahan', variant: 'destructive' });
      return;
    }
    const clean = manualCode.trim().toUpperCase();
    if (clean !== 'KKTF2025' && clean !== 'KKTF-CHECKIN' && !clean.includes('KKTF')) {
      toast({ title: 'Kod Tidak Sah', description: 'Kod pengesahan kaunter salah. Sila dapatkan kod dari Felo bertugas.', variant: 'destructive' });
      return;
    }

    await stopCamera();
    await processSuccessfulCheckIn(`MANUAL:${clean}`);
  };

  // Process the actual Resident Activation in Database
  const processSuccessfulCheckIn = async (verificationSource) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const todayIso = new Date().toISOString();
      const todayDate = todayIso.split('T')[0];
      const currentTimeStr = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      const targetRoom = rooms.find(r => 
        r.block_name === selectedBlock && 
        String(r.room_number) === String(selectedRoomNumber)
      );

      const roomId = targetRoom?.id || selectedRoomId || '';

      // 1. Update Student Entity
      await base44.entities.Student.update(student.id, {
        block_name: selectedBlock,
        room_number: selectedRoomNumber,
        room_id: roomId,
        check_in_date: todayDate,
        room_status: 'Checked In',
        resident_status: 'Active'
      });

      // 2. Increment Room Occupancy if room found
      if (targetRoom) {
        const nextOcc = (targetRoom.current_occupancy || 0) + 1;
        await base44.entities.Room.update(targetRoom.id, {
          current_occupancy: nextOcc,
          status: nextOcc >= (targetRoom.capacity || 4) ? 'Full' : 'Occupied'
        });
      }

      // 3. Create Audit CheckIn Entry
      try {
        await base44.entities.CheckIn.create({
          student_id: student.id,
          student_name: student.full_name,
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

      // 4. Log Audit
      await logAudit(
        user, 
        'STUDENT_RESIDENT_ACTIVATION', 
        'Pengaktifan Residen', 
        { student: student.full_name, student_id: student.student_id, block: selectedBlock, room: selectedRoomNumber }
      );

      playSuccessChime();

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setStep('success');

      toast({
        title: 'Pengaktifan Residen Berjaya! 🎉',
        description: `Selamat mendiami ${selectedBlock}, Bilik ${selectedRoomNumber}. Pas Residen Digital anda kini aktif.`
      });

      if (onCheckInSuccess) {
        onCheckInSuccess({
          block_name: selectedBlock,
          room_number: selectedRoomNumber,
          room_status: 'Checked In',
          resident_status: 'Active'
        });
      }
    } catch (err) {
      console.error('Resident activation error:', err);
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
                  disabled={!selectedBlock || !selectedRoomNumber}
                  onClick={() => setStep('qr_scanning')}
                  className="bg-[#0c182c] hover:bg-[#132440] text-white gap-1.5 text-xs font-bold"
                >
                  Seterusnya: Imbas Kod QR <ScanLine className="w-4 h-4 text-lime-400" />
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
                    placeholder="Contoh: KKTF2025"
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
