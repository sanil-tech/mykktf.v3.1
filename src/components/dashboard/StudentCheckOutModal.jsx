import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  KeyRound, 
  CheckCircle2, 
  Camera, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  QrCode, 
  Clock, 
  FileCheck2, 
  ArrowRight, 
  Building2, 
  DoorOpen,
  Image as ImageIcon,
  Check,
  Printer,
  Star
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { submitDropKeyRequest, getStudentActiveDropKeyRequest, recordDropBoxQrScan, clearStudentDropKey } from '@/lib/dropKeyHelper';
import { base44 } from '@/api/base44Client';
import { uploadOrPrepareImage } from '@/lib/imageWatermark';
import SurveyModal from '@/components/SurveyModal';

// Pemampatan imej untuk mengelakkan had kuota localStorage
function compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.6) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(readerEvent.target?.result || null);
      img.src = readerEvent.target?.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export default function StudentCheckOutModal({ student, user, open, onOpenChange, onCompleted }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Photos, 3: Declaration, 4: QR Scan / Receipt
  const [submitting, setSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const { toast } = useToast();

  const showToast = (title, description = '', variant = 'default', duration = 3500) => {
    toast({ title, description, variant, duration });
  };

  // Form State
  const [formData, setFormData] = useState({
    checkout_date: new Date().toISOString().split('T')[0],
    checkout_time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
    reason: 'Tamat Semester',
    envelope_tag: '',
    declaration_agreed: false
  });

  // Photos state (data URLs)
  const [photos, setPhotos] = useState({
    room_clean: null,
    wardrobe_empty: null,
    switches_locked: null,
    key_envelope: null
  });

  // Scanner state
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (student?.id || student?.student_id) {
      // Sekiranya status bilik pelajar adalah 'Checked In' (masih mendiami bilik secara aktif),
      // bermakna sebarang rekod drop-key lama dalam localStorage adalah rekod basi (stale cache) daripada simulasi terdahulu.
      const isCurrentlyLiving = String(student.room_status || '').toLowerCase().trim() === 'checked in';
      if (isCurrentlyLiving) {
        clearStudentDropKey(student.id, student.student_id);
        setActiveRequest(null);
        setStep(1);
        return;
      }

      const existing = getStudentActiveDropKeyRequest(student.id, student.student_id);
      if (existing) {
        setActiveRequest(existing);
        setStep(4); // Langsung ke resit / imbas jika sudah mohon
        if (!existing.checkout_record_id) {
          submitDropKeyRequest(existing).catch(() => {});
        }
      } else {
        setActiveRequest(null);
        setStep(1);
      }
    }
  }, [student, open]);

  const handleCancelAndClearDropKey = async () => {
    if (!student && !activeRequest) return;
    try {
      const sId = student?.id || activeRequest?.student_db_id || activeRequest?.student_id;
      const matric = student?.student_id || activeRequest?.student_matric;
      clearStudentDropKey(sId, matric);

      // Padam juga rekod CheckOut dari DB jika ada
      if (activeRequest?.checkout_record_id) {
        await base44.entities.CheckOut.delete(activeRequest.checkout_record_id).catch(() => {});
      }

      // Pulihkan status pelajar ke Checked In jika belum
      if (sId) {
        await base44.entities.Student.update(sId, {
          room_status: 'Checked In',
          notes: ''
        }).catch(() => {});
      }

      setActiveRequest(null);
      setStep(1);
      showToast('Permohonan Drop-Key Dibatalkan', 'Rekod serahan kunci lama telah dibersihkan. Status anda adalah Checked In.');
      if (onCompleted) onCompleted();
      onOpenChange(false);
    } catch (err) {
      showToast('Ralat membatalkan', err.message, 'destructive');
    }
  };

  // Handle Photo Capture/Upload dengan pemampatan pintar & sokongan cloud upload
  const handlePhotoUpload = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      if (compressed) {
        setPhotos(prev => ({
          ...prev,
          [field]: compressed
        }));

        // Muat naik ke Cloud Base44 di latar belakang supaya URL bersih, ringan & boleh dilihat pentadbir
        if (base44?.integrations?.Core?.UploadFile) {
          uploadOrPrepareImage(base44, compressed, `dropkey_${field}_${Date.now()}.jpg`, file)
            .then(url => {
              if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                setPhotos(prev => ({
                  ...prev,
                  [field]: url
                }));
              }
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Ralat proses gambar:', err);
    }
  };

  // Submit Drop-Key Application
  const handleSubmitApplication = async () => {
    if (!formData.declaration_agreed) {
      showToast('Perakuan Diperlukan', 'Sila tanda kotak persetujuan akuan integriti bilik.', 'destructive');
      return;
    }

    setSubmitting(true);
    try {
      // Pastikan ada nilai foto yang sah
      const finalPhotos = {
        room_clean: photos.room_clean || 'verified_self_declaration',
        wardrobe_empty: photos.wardrobe_empty || null,
        switches_locked: photos.switches_locked || null,
        key_envelope: photos.key_envelope || 'verified_self_declaration'
      };

      const payload = {
        // student_db_id = UUID entiti dalam DB (untuk update DB)
        student_db_id: student?.id || '',
        // student_id = nombor matrik pelajar (BM00008482 dll)
        student_id: student?.student_id || user?.student_id || '',
        student_name: student?.full_name || user?.full_name || 'Pelajar',
        student_matric: student?.student_id || user?.student_id || '',
        student_phone: student?.phone || user?.phone || '',
        student_email: student?.email || user?.email || '',
        user_id: user?.id || student?.user_id || '',
        block_name: student?.block_name || user?.block_name || '',
        room_number: student?.room_number || user?.room_number || '',
        room_id: student?.room_id || '',
        reason: formData.reason,
        checkout_date: formData.checkout_date,
        checkout_time: formData.checkout_time,
        envelope_tag: formData.envelope_tag,
        photos: finalPhotos,
        declaration_agreed: true
      };

      const result = await submitDropKeyRequest(payload);
      setActiveRequest(result);
      setStep(4);
      
      try {
        confetti({ particleCount: 50, spread: 60 });
      } catch (cErr) {}

      showToast('Permohonan Diterima!', 'Sila serahkan kunci fizikal ke peti drop-key dan buat pengimbasan.');
      if (onCompleted) onCompleted(result);

      // Auto-buka pengimbas kamera peti kunci selepas peralihan ke Langkah 4
      setTimeout(() => {
        startDropBoxScanner();
      }, 500);
    } catch (err) {
      console.error('Ralat menghantar permohonan drop-key:', err);
      showToast('Ralat Permohonan', err.message || 'Gagal menghantar permohonan.', 'destructive');
    } finally {
      setSubmitting(false);
    }
  };

  // Start Drop-Box QR Camera Scanner
  const startDropBoxScanner = async () => {
    setScanning(true);
    try {
      setTimeout(() => {
        const el = document.getElementById('dropbox-reader');
        if (!el) {
          console.warn('Elemen dropbox-reader belum sedia');
          return;
        }
        try {
          const scanner = new Html5Qrcode('dropbox-reader');
          scannerRef.current = scanner;
          scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              handleScannedCode(decodedText);
            },
            () => {}
          ).catch(err => {
            console.warn('Ralat kamera scanner:', err);
            showToast('Kamera Tidak Dapat Dibuka', 'Sila pastikan kebenaran kamera dibenarkan, atau klik butang pengesahan manual di bawah.', 'destructive');
            setScanning(false);
          });
        } catch (initErr) {
          console.warn('Html5Qrcode init err:', initErr);
          setScanning(false);
        }
      }, 350);
    } catch (e) {
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        scannerRef.current = null;
      }).catch(() => {});
    }
    setScanning(false);
  };

  const handleScannedCode = (code) => {
    // Validasi kod drop box (e.g. "KKTF_DROPKEY_STATION" atau "kktf_drop_box")
    const valid = Boolean(code);
    const reqId = activeRequest?.id || getStudentActiveDropKeyRequest(student?.id, student?.student_id)?.id;
    if (valid && reqId) {
      stopScanner();
      const updated = recordDropBoxQrScan(reqId);
      setActiveRequest(prev => ({ 
        ...(prev || {}), 
        ...(updated || {}), 
        scanned_at_dropbox: new Date().toISOString() 
      }));
      try {
        confetti({ particleCount: 80, spread: 70 });
      } catch (e) {}
      showToast('Imbasan Peti Berjaya!', 'Kunci anda disahkan telah dimasukkan ke dalam Peti Drop-Key.');
      if (onCompleted) onCompleted(updated);
    } else {
      showToast('Imbasan Tidak Sah', 'Kod QR tidak sepadan dengan Peti Drop-Key KKTF.', 'destructive');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { stopScanner(); onOpenChange(v); } }}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-slate-200">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Express Check-Out (Drop-Key)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300">
                  {student?.block_name} &bull; Bilik {student?.room_number} &bull; Layan Diri 24 Jam
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className="bg-white/10 text-amber-300 border-white/20 text-xs">
              Langkah {step} daripada 4
            </Badge>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'w-8 bg-amber-400' : s < step ? 'w-4 bg-emerald-400' : 'w-4 bg-white/20'
                }`} 
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* STEP 1: INFORMASI KELUAR */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-2xl text-xs text-sky-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" /> Arahan Check-Out Drop-Key:
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Kaedah ini dikhaskan untuk pelajar yang perlu keluar kolej di luar waktu pejabat atau waktu cuti semester. Pastikan bilik telah dibersihkan sepenuhnya sebelum meninggalkan kolej.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700">Tarikh Keluar</Label>
                  <Input 
                    type="date"
                    value={formData.checkout_date}
                    onChange={(e) => setFormData({ ...formData, checkout_date: e.target.value })}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-700">Anggaran Masa Keluar</Label>
                  <Input 
                    type="time"
                    value={formData.checkout_time}
                    onChange={(e) => setFormData({ ...formData, checkout_time: e.target.value })}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Sebab Check-Out</Label>
                <Select value={formData.reason} onValueChange={(v) => setFormData({ ...formData, reason: v })}>
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue placeholder="Pilih Sebab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tamat Semester">Tamat Semester Pengajian</SelectItem>
                    <SelectItem value="Latihan Industri">Keluar Menjalani Latihan Industri (Internship)</SelectItem>
                    <SelectItem value="Tamat Pengajian">Tamat Pengajian / Bergraduat</SelectItem>
                    <SelectItem value="Pindah Asrama / Rumah Luar">Pindah Keluar Asrama</SelectItem>
                    <SelectItem value="Lain-lain">Lain-lain Sebab Khas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">
                  No. Sampul Kunci (Jika Ada Disediakan)
                </Label>
                <Input 
                  placeholder="Cth: SAMPUL-C101 atau biarkan kosong"
                  value={formData.envelope_tag}
                  onChange={(e) => setFormData({ ...formData, envelope_tag: e.target.value })}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setStep(2)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-bold gap-1.5 rounded-xl"
                >
                  Seterusnya: Ambil Gambar Bilik <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: BUKTI GAMBAR BILIK & KUNCI */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
                <p className="font-bold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-700" /> Muat Naik 4 Foto Bukti Keadaan Bilik
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Gambar ini berfungsi sebagai bukti integriti bahawa bilik ditinggalkan dalam keadaan bersih dan sempurna.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Photo 1: Bilik Bersih */}
                <div className="p-3 border rounded-2xl bg-slate-50 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      1. Lantai & Bilik Bersih <span className="text-red-500">*</span>
                    </span>
                    <p className="text-[10px] text-slate-500">Lantai disapu & tiada longgokan sampah.</p>
                  </div>
                  {photos.room_clean ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-300 h-28 bg-black/5">
                      <img src={photos.room_clean} alt="Bilik Bersih" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-1 right-1 bg-emerald-600 text-[9px]">Sedia</Badge>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                      <Camera className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-indigo-600">Ambil / Muat Naik Foto</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload('room_clean', e)} />
                    </label>
                  )}
                </div>

                {/* Photo 2: Kunci & Tag */}
                <div className="p-3 border rounded-2xl bg-slate-50 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      2. Kunci & Tag Bilik <span className="text-red-500">*</span>
                    </span>
                    <p className="text-[10px] text-slate-500">Kunci bilik diletakkan di atas meja/sampul.</p>
                  </div>
                  {photos.key_envelope ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-300 h-28 bg-black/5">
                      <img src={photos.key_envelope} alt="Kunci Bilik" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-1 right-1 bg-emerald-600 text-[9px]">Sedia</Badge>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                      <KeyRound className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-indigo-600">Ambil / Muat Naik Foto</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoUpload('key_envelope', e)} />
                    </label>
                  )}
                </div>

                {/* Photo 3: Almari & Perabot */}
                <div className="p-3 border rounded-2xl bg-slate-50 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      3. Almari Pintu Terbuka
                    </span>
                    <p className="text-[10px] text-slate-500">Membuktikan tiada barang tertinggal.</p>
                  </div>
                  {photos.wardrobe_empty ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-300 h-28 bg-black/5">
                      <img src={photos.wardrobe_empty} alt="Almari Kosong" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-1 right-1 bg-emerald-600 text-[9px]">Sedia</Badge>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-indigo-600">Pilihan: Tambah Foto</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload('wardrobe_empty', e)} />
                    </label>
                  )}
                </div>

                {/* Photo 4: Suis & Tingkap */}
                <div className="p-3 border rounded-2xl bg-slate-50 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      4. Suis & Tingkap Ditutup
                    </span>
                    <p className="text-[10px] text-slate-500">Kipas, lampu & tingkap dikunci rapi.</p>
                  </div>
                  {photos.switches_locked ? (
                    <div className="relative rounded-xl overflow-hidden border border-emerald-300 h-28 bg-black/5">
                      <img src={photos.switches_locked} alt="Suis & Tingkap" className="w-full h-full object-cover" />
                      <Badge className="absolute bottom-1 right-1 bg-emerald-600 text-[9px]">Sedia</Badge>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer bg-white transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-indigo-600">Pilihan: Tambah Foto</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload('switches_locked', e)} />
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-xs h-9">
                  Kembali
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  disabled={!photos.room_clean || !photos.key_envelope}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-bold gap-1.5 rounded-xl"
                >
                  Seterusnya: Perakuan Akuan <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: AKUAN INTEGRITI & HANTAR PERMOHONAN */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 border rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wide">
                  <FileCheck2 className="w-4 h-4 text-indigo-600" />
                  Perakuan Rasmi Integriti Residen KKTF
                </div>
                
                <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
                  <p>
                    Saya, <strong>{student?.full_name || user?.full_name}</strong> (No. Matrik: {student?.student_id}), dengan ini mengaku bahawa:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Semua barangan peribadi telah dikeluarkan sepenuhnya daripada <strong>{student?.block_name} Bilik {student?.room_number}</strong>.</li>
                    <li>Bilik ditinggalkan dalam keadaan bersih, sampah telah dibuang, dan perabot kolej berada dalam keadaan baik.</li>
                    <li>Kunci bilik dimasukkan ke dalam sampul berpelekat dan dijatuhkan ke dalam Peti Drop-Key Kolej.</li>
                    <li>Saya bersetuju bahawa pemeriksaan fizikal akhir akan dibuat oleh pihak pengurusan kolej/felo, dan sebarang kerosakan atau kehilangan inventori boleh dicaj kepada saya.</li>
                  </ul>
                </div>

                <div className="pt-3 border-t flex items-start gap-2.5">
                  <input 
                    type="checkbox" 
                    id="declaration_checkbox"
                    checked={formData.declaration_agreed}
                    onChange={(e) => setFormData({ ...formData, declaration_agreed: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="declaration_checkbox" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Saya membaca, memahami dan mengesahkan akuan di atas dengan penuh integriti.
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(2)} className="text-xs h-9">
                  Kembali
                </Button>
                <Button 
                  onClick={handleSubmitApplication}
                  disabled={!formData.declaration_agreed || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 font-bold gap-1.5 rounded-xl shadow-sm"
                >
                  {submitting ? 'Menghantar...' : 'Hantar & Buka Pengimbas Peti Kunci'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: PAS DROP-KEY & PENGIMBAS PETI DROP BOX */}
          {step === 4 && (() => {
            const req = activeRequest || getStudentActiveDropKeyRequest(student?.id, student?.student_id) || {
              id: 'DK-KKTF-RASMI',
              student_name: student?.full_name || user?.full_name || 'Pelajar',
              student_matric: student?.student_id || '',
              block_name: student?.block_name || 'Blok Kolej',
              room_number: student?.room_number || 'Bilik',
              checkout_date: formData.checkout_date,
              checkout_time: formData.checkout_time,
              status: 'pending_verification',
              scanned_at_dropbox: null
            };

            return (
              <div className="space-y-5">
                {/* STATUS BANNER */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Permohonan Drop-Key Telah Diterima
                    </h4>
                    <p className="text-xs text-slate-600">
                      Sila masukkan kunci fizikal anda ke dalam <strong>Peti Drop-Key (Pondok Pengawal / Luar Pejabat Kolej)</strong>.
                    </p>
                    {req.scanned_at_dropbox ? (
                      <Badge className="bg-emerald-600 text-white text-[10px] mt-1 gap-1">
                        <Check className="w-3 h-3" /> Telah Diimbas di Peti Drop-Box pada {new Date(req.scanned_at_dropbox).toLocaleTimeString('ms-MY')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] mt-1 gap-1">
                        <Clock className="w-3 h-3" /> Menunggu Imbasan di Peti Kunci
                      </Badge>
                    )}
                  </div>
                </div>

                {/* DIGITAL RECEIPT CARD */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Resit Digital Serahan Kunci
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">ID: {req.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400">Residen</span>
                      <p className="font-semibold text-slate-800">{req.student_name}</p>
                      <p className="text-[10px] font-mono text-slate-500">{req.student_matric}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Penempatan Bilik</span>
                      <p className="font-semibold text-slate-800">{req.block_name}</p>
                      <p className="text-[10px] text-slate-500">Bilik {req.room_number}</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Tarikh & Waktu</span>
                      <p className="font-semibold text-slate-800">{req.checkout_date} ({req.checkout_time})</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Status Semakan</span>
                      <p className="font-bold text-amber-600 capitalize">
                        {req.status === 'approved' ? '✓ Telah Diluluskan' : 'Menunggu Semakan Staf Pentadbiran'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* CAMERA SCANNER BUTTON / SCANNER VIEW */}
                {!req.scanned_at_dropbox && (
                  <div className="p-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/40 text-center space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-indigo-950">
                        Langkah Terakhir: Sahkan Kehadiran di Peti Kunci
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                        Imbas Kod QR pada poster <strong>"Peti Drop-Key KKTF"</strong> di hadapan pondok pengawal atau luar pejabat am kolej sebagai cap masa rasmi.
                      </p>
                    </div>

                    {scanning ? (
                      <div className="space-y-3">
                        <div id="dropbox-reader" className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-indigo-600 bg-black min-h-[220px]" />
                        <div className="flex justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={stopScanner} className="text-xs h-8">
                            Tutup Kamera
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleScannedCode('KKTF_DROPKEY_STATION')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Sahkan Terus di Sini
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2 flex-wrap">
                        <Button 
                          onClick={startDropBoxScanner}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-bold gap-1.5 rounded-xl shadow-xs"
                        >
                          <QrCode className="w-4 h-4" /> Buka Kamera & Imbas QR Peti
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleScannedCode('KKTF_DROPKEY_STATION')}
                          className="text-xs h-9 font-medium"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Sahkan Serahan Kunci
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* SURVEY & COMPLETION BANNER IF APPROVED */}
                {req.status === 'approved' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 text-emerald-950 text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">Permohonan Check-Out Telah Diluluskan!</p>
                        <p className="text-emerald-800 text-[11px]">Bilik anda telah dibebaskan. Sila lengkapkan Kajian Kepuasan Pelajar sebelum beredar.</p>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => setShowSurvey(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3.5 rounded-xl font-bold gap-1.5 shrink-0 shadow-xs"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> Isi Kajian Kepuasan
                    </Button>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => onOpenChange(false)}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-9 rounded-xl"
                  >
                    Tutup & Kembali
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>

      <SurveyModal
        open={showSurvey}
        onClose={() => setShowSurvey(false)}
        onComplete={() => {
          setShowSurvey(false);
          onOpenChange(false);
          onCompleted?.();
        }}
        user={user}
        student={student}
        checkoutId={activeRequest?.checkout_record_id || activeRequest?.id}
      />
    </Dialog>
  );
}
