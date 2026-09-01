import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  MapPin, 
  QrCode, 
  Clock, 
  User, 
  AlertTriangle, 
  ArrowRight, 
  Building, 
  Calendar,
  Sparkles,
  ShieldCheck,
  Camera,
  X,
  KeyRound,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { logAudit } from '@/lib/audit';

export default function LeaveReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const initialBlock = searchParams.get('block') || '';
  const [scannedBlock, setScannedBlock] = useState(initialBlock);

  const [currentUser, setCurrentUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [activeLeave, setActiveLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmedData, setConfirmedData] = useState(null);

  // Scanner state
  const [scannerActive, setScannerActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    init();
    return () => {
      stopScanner();
    };
  }, []);

  async function init() {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      let students = await base44.entities.Student.filter({ user_id: user.id });
      if (!students.length) students = await base44.entities.Student.filter({ email: user.email });
      const studentProfile = students[0] || null;
      setStudent(studentProfile);

      if (studentProfile) {
        const leaves = await base44.entities.LeaveApplication.filter({ 
          student_id: studentProfile.student_id 
        }, '-created_date');

        const active = leaves.find(l => (l.status === 'Approved' || l.status === 'Pending') && l.status !== 'Returned' && !l.returned_at);
        setActiveLeave(active || null);
      }
    } catch (err) {
      console.error('Error fetching return data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Dynamic CDN loader for Html5Qrcode without npm dependency
  const loadHtml5Qrcode = () => {
    return new Promise((resolve, reject) => {
      if (window.Html5Qrcode) {
        resolve(window.Html5Qrcode);
        return;
      }
      const existingScript = document.getElementById('html5-qrcode-cdn');
      if (existingScript) {
        existingScript.onload = () => resolve(window.Html5Qrcode);
        return;
      }
      const script = document.createElement('script');
      script.id = 'html5-qrcode-cdn';
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      script.onload = () => resolve(window.Html5Qrcode);
      script.onerror = () => reject(new Error('Gagal memuatkan modul pengimbas kamera'));
      document.head.appendChild(script);
    });
  };

  // Start live QR Camera Scanner
  async function startScanner() {
    setScannerActive(true);
    setCameraError(null);

    try {
      const Html5QrcodeClass = await loadHtml5Qrcode();
      setTimeout(async () => {
        try {
          const qrCode = new Html5QrcodeClass("reader");
          html5QrCodeRef.current = qrCode;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          await qrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              handleQrDecoded(decodedText);
            },
            () => {}
          );
        } catch (err) {
          console.error("Camera start error:", err);
          setCameraError("Tidak dapat mengakses kamera. Sila pastikan kebenaran kamera (camera permission) dibenarkan atau gunakan Kod Pengesahan Manual.");
        }
      }, 250);
    } catch (err) {
      console.error("Library load error:", err);
      setCameraError("Gagal memulakan pengimbas kamera. Sila gunakan Kod Pengesahan Manual di bawah.");
    }
  }

  async function stopScanner() {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn("Scanner stop error:", e);
      }
      html5QrCodeRef.current = null;
    }
    setScannerActive(false);
  }

  function handleQrDecoded(decodedText) {
    stopScanner();
    
    // Parse decoded text (either URL or raw string like KKTF_BLOCK_G or /return-leave?block=Blok%20G)
    let detectedLocation = 'Pondok Pengawal (Pintu Utama)';
    
    if (decodedText.includes('block=')) {
      try {
        const url = new URL(decodedText.startsWith('http') ? decodedText : `https://dummy.com/${decodedText}`);
        detectedLocation = decodeURIComponent(url.searchParams.get('block') || detectedLocation);
      } catch {
        detectedLocation = decodedText;
      }
    } else if (decodedText.startsWith('KKTF_')) {
      detectedLocation = decodedText.replace('KKTF_', '').replace(/_/g, ' ');
    } else if (decodedText.trim().length > 0) {
      detectedLocation = decodedText.trim();
    }

    setScannedBlock(detectedLocation);
    executeReturnConfirmation(detectedLocation, 'QR_CAMERA_SCAN');
  }

  function handleManualSubmit() {
    if (!manualCode.trim()) {
      toast.error('Sila masukkan Kod Lokasi / PIN dari poster');
      return;
    }
    const cleanLocation = manualCode.trim();
    setScannedBlock(cleanLocation);
    executeReturnConfirmation(cleanLocation, 'MANUAL_CODE_PIN');
  }

  async function executeReturnConfirmation(locationName, method = 'QR_CAMERA_SCAN') {
    if (!student && !currentUser) {
      toast.error('Sila log masuk terlebih dahulu');
      return;
    }

    setConfirming(true);
    try {
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = now.toLocaleDateString('en-CA');
      const timeStr = now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });

      let isLate = false;
      if (activeLeave && activeLeave.return_date) {
        isLate = activeLeave.return_date < todayStr;
      }

      const returnStatus = isLate ? 'Late' : 'On-Time';

      if (activeLeave) {
        await base44.entities.LeaveApplication.update(activeLeave.id, {
          status: 'Returned',
          returned_at: nowIso,
          returned_date: todayStr,
          returned_time: timeStr,
          return_method: method,
          return_status: returnStatus,
          return_scanned_block: locationName
        });

        await logAudit(currentUser, 'LEAVE_RETURN_CHECKIN', 'Leave', {
          leave_id: activeLeave.id,
          student: student?.full_name || currentUser?.full_name,
          matric: student?.student_id || 'N/A',
          scanned_location: locationName,
          method,
          return_status: returnStatus,
          timestamp: nowIso
        });
      }

      setConfirmedData({
        timestamp: `${todayStr} (${timeStr})`,
        location: locationName,
        method,
        returnStatus,
        leave: activeLeave
      });

      toast.success(`🎉 Imbasan Kod QR berjaya! Kehadiran fizikal di ${locationName} disahkan.`);
    } catch (err) {
      console.error('Failed to confirm return:', err);
      toast.error('Gagal mengesahkan kehadiran kembali');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-muted-foreground mt-3">Mengesahkan data kehadiran...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-6 px-4 space-y-5">
      {/* HEADER */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-heading font-bold text-slate-900">
          Imbas Kod QR Kembali ke Kolej
        </h1>
        <p className="text-xs text-muted-foreground">
          Kolej Kediaman Tun Fuad &bull; Universiti Malaysia Sabah
        </p>
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {confirmedData ? (
        <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-sm text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <Badge className="bg-emerald-600 text-white font-bold text-[11px] px-3 py-0.5">
              ✅ TELAH KEMBALI KE KOLEJ
            </Badge>
            <h2 className="text-base font-bold text-slate-900 pt-1">
              Selamat Kembali, {student?.full_name || currentUser?.full_name}!
            </h2>
            <p className="text-xs text-slate-500">
              Imbasan kod QR fizikal anda telah disahkan dan rekod cuti telah ditutup.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Lokasi Imbasan Fizikal:</span>
              <span className="font-bold text-slate-900">{confirmedData.location}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Masa Direkodkan:</span>
              <span className="font-mono font-bold text-slate-900">{confirmedData.timestamp}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Kaedah Pengesahan:</span>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                {confirmedData.method === 'QR_CAMERA_SCAN' ? '📷 Imbasan Kamera' : '🔑 Kod PIN Poster'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Ketibaan:</span>
              <Badge variant="outline" className={confirmedData.returnStatus === 'On-Time' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}>
                {confirmedData.returnStatus === 'On-Time' ? 'Tepat Pada Masa' : 'Lewat'}
              </Badge>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link to="/leave">
              <Button className="w-full bg-[#132644] hover:bg-[#1e385f] text-white text-xs font-semibold h-10 rounded-xl">
                Lihat Rekod E-Leave
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full text-xs h-10 rounded-xl">
                Kembali ke Dashboard Utama
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* LIVE SCANNING & VERIFICATION INTERFACE */
        <div className="space-y-4">
          {/* STUDENT IDENTIFICATION CARD */}
          {student && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Identiti Residen</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{student.full_name}</p>
                  <p className="text-xs font-mono text-slate-500">{student.student_id}</p>
                </div>
                <Badge variant="outline" className="bg-slate-50 text-slate-700 font-mono text-xs">
                  {student.block_name || 'Blok'} - {student.room_number || 'Bilik'}
                </Badge>
              </div>
            </div>
          )}

          {/* ACTIVE LEAVE RECORD */}
          {activeLeave ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" /> Rekod Cuti Yang Perlu Disahkan
                </span>
                <Badge className={activeLeave.return_date < new Date().toLocaleDateString('en-CA') ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-600 text-white'}>
                  {activeLeave.return_date < new Date().toLocaleDateString('en-CA') ? 'OVERDUE' : 'AKTIF'}
                </Badge>
              </div>

              <div className="text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Destinasi:</span>
                  <span className="font-semibold text-slate-900">{activeLeave.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dijadualkan Pulang:</span>
                  <span className="font-semibold text-slate-900">{activeLeave.return_date} ({activeLeave.return_time || '23:00'})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-600 space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="font-bold text-slate-900">Tiada Permohonan Cuti Aktif</p>
              <p className="text-slate-500">Status anda sedia ada: <strong>"Di Dalam Kolej"</strong>.</p>
            </div>
          )}

          {/* CAMERA SCANNER BOX */}
          {scannerActive ? (
            <div className="bg-black rounded-3xl p-4 text-white shadow-xl space-y-3 relative overflow-hidden animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                  <Camera className="w-4 h-4" /> Halakan Kamera ke Kod QR Poster
                </span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={stopScanner}
                  className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* VIDEO VIEWFINDER */}
              <div id="reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/20 min-h-[260px]"></div>

              {cameraError && (
                <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-xs text-rose-200 space-y-1">
                  <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Akses Kamera Terhalang</p>
                  <p>{cameraError}</p>
                </div>
              )}
            </div>
          ) : (
            /* BUTTON TO LAUNCH CAMERA SCANNER */
            <div className="space-y-3">
              <Button
                onClick={startScanner}
                disabled={confirming}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-sm"
              >
                <Camera className="w-5 h-5 text-indigo-200" />
                <span>Buka Kamera & Imbas Kod QR Blok</span>
              </Button>

              {/* MANUAL PIN/BLOCK CODE FALLBACK */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Atau Masukkan Kod Lokasi / Blok Manual
                </p>
                <p className="text-[11px] text-slate-500">
                  Jika kamera tidak berfungsi, masukkan nama blok yang tertera di poster (cth: <strong>Blok G</strong> atau <strong>Pondok Pengawal</strong>).
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="cth: Blok G / Pondok Pengawal" 
                    value={manualCode} 
                    onChange={e => setManualCode(e.target.value)} 
                    className="h-9 text-xs bg-white"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleManualSubmit}
                    disabled={confirming}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 h-9 font-semibold shrink-0"
                  >
                    Sahkan
                  </Button>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-center text-slate-400">
            Imbasan kod QR fizikal diperlukan bagi mengelakkan penipuan kehadiran dan memadamkan status Overdue secara sah.
          </p>
        </div>
      )}
    </div>
  );
}
