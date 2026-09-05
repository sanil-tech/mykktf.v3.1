import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  QrCode, 
  User, 
  RotateCw, 
  Sparkles, 
  CheckCircle2, 
  Car, 
  HeartHandshake,
  Download,
  Share2,
  Lock,
  Calendar,
  Layers
} from 'lucide-react';
import { KKTFLogo, UMSLogo, InstitutionalDualLogo } from '@/components/shared/KKTFLogo';
import { toast } from 'sonner';

export default function DigitalResidentPass({ student, user, triggerButton }) {
  const [open, setOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  const fullName = student?.full_name || user?.full_name || 'Residen KKTF';
  const matricNo = student?.student_id || 'BELUM DIISI';
  const blockName = student?.block_name || 'Tiada Blok';
  const roomNumber = student?.room_number || 'Tiada Bilik';
  const faculty = student?.faculty || 'Universiti Malaysia Sabah';
  const programme = student?.programme || 'Sarjana Muda';
  const yearOfStudy = student?.year_of_study ? `Tahun ${student.year_of_study}` : 'Tahun 1';
  const phone = student?.phone || 'N/A';
  const emergencyPhone = student?.parent_phone || student?.emergency_contact || 'N/A';
  const isCheckedIn = (student?.room_status === 'Checked In') && Boolean(student?.qr_verified);

  // Verification Payload for QR
  const verificationPayload = encodeURIComponent(`UMS-KKTF-PASS|${matricNo}|${blockName}|${roomNumber}|ACTIVE20252026`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${verificationPayload}&color=0f172a&bgcolor=ffffff`;

  const handleShareOrSave = () => {
    if (navigator.share) {
      navigator.share({
        title: `Pas Residen Digital KKTF - ${fullName}`,
        text: `Pas Pengenalan Residen Kolej Kediaman Tun Fuad (KKTF), UMS.\nNama: ${fullName}\nNo. Matrik: ${matricNo}\nLokasi: ${blockName} - Bilik ${roomNumber}`,
        url: window.location.href
      }).catch(() => {});
    } else {
      toast.success('Gunakan fungsi tangkap layar (screenshot) untuk simpan pas ini di galeri anda.');
    }
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {triggerButton}
        </div>
      ) : (
        <Button 
          size="sm" 
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-[#84cc16] via-[#65a30d] to-[#15803d] hover:from-[#65a30d] hover:to-[#166534] text-white font-bold text-xs gap-2 shadow-lg hover:shadow-lime-500/20 transition-all rounded-xl border border-lime-400/30"
        >
          <ShieldCheck className="w-4 h-4 text-white" /> Tunjuk Pas Residen Digital
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden bg-slate-950 border-slate-800 text-white rounded-3xl shadow-2xl">
          {/* TOP MODAL BAR */}
          <DialogHeader className="p-4 pb-3 border-b border-slate-800/80 bg-slate-900/70 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime-500/20 border border-lime-500/30 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-heading font-bold text-white leading-tight">
                  Pas Residen Digital KKTF
                </DialogTitle>
                <p className="text-[10px] text-slate-400">Sistem Pengenalan Kolej Kediaman Tun Fuad</p>
              </div>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsFlipped(!isFlipped)} 
              className="h-8 text-xs border-slate-700 bg-slate-800/80 text-lime-400 hover:text-lime-300 hover:bg-slate-700 gap-1.5 rounded-xl"
            >
              <RotateCw className="w-3.5 h-3.5" /> {isFlipped ? 'Muka Depan & Waris' : 'Papar Kod QR'}
            </Button>
          </DialogHeader>

          {/* CARD CONTAINER */}
          <div className="p-5 flex flex-col items-center">
            {!isFlipped ? (
              /* FRONT OF THE CARD: IDENTITY & NEXT-OF-KIN (INFO WARIS) */
              <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c182c] via-[#112440] to-[#0d1e34] border border-lime-500/30 shadow-[0_0_35px_rgba(132,204,22,0.18)] p-5 text-white">
                
                {/* Background Shimmer & Watermark Accents */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-lime-400/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-amber-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

                {/* 1. TOP PROTOCOL DUAL-LOGO BRANDING BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3.5 mb-4 relative z-10 gap-2.5">
                  <InstitutionalDualLogo />

                  {/* Status Badge */}
                  <div className="flex items-center sm:self-center self-start">
                    <Badge className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                      isCheckedIn 
                        ? 'bg-lime-500/25 text-lime-300 border-lime-400/50 shadow-lime-500/10' 
                        : 'bg-amber-500/25 text-amber-300 border-amber-400/50'
                    }`}>
                      {isCheckedIn ? '● RESIDEN AKTIF' : '○ PENDING'}
                    </Badge>
                  </div>
                </div>

                {/* 2. PHOTO & STUDENT DETAILS */}
                <div className="flex gap-3.5 items-center relative z-10 mb-4">
                  {/* Photo Frame with Holographic Smart Chip */}
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border-2 border-lime-400/70 flex flex-col items-center justify-center text-lime-400 shadow-md overflow-hidden">
                      <User className="w-10 h-10 text-slate-300" />
                      <span className="text-[7.5px] font-mono text-slate-400 uppercase mt-0.5">RESIDEN</span>
                    </div>
                    {/* Gold Smart Chip */}
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-5 rounded-md bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200 shadow-xs flex items-center justify-center">
                      <div className="w-4 h-3 border border-amber-700/40 rounded-xs" />
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h2 className="text-base font-heading font-extrabold text-white leading-snug truncate uppercase tracking-tight">
                      {fullName}
                    </h2>
                    <p className="text-xs font-mono font-bold text-lime-300 tracking-wider flex items-center gap-1">
                      <span>{matricNo}</span>
                      <span className="text-[10px] text-slate-400 font-normal">| {yearOfStudy}</span>
                    </p>
                    <p className="text-[10.5px] text-slate-300 line-clamp-1 leading-tight">
                      {faculty}
                    </p>
                    <p className="text-[10px] text-lime-200/90 font-medium line-clamp-1">
                      {programme}
                    </p>
                  </div>
                </div>

                {/* 3. ASSIGNED ROOM & BLOCK HIGHLIGHT BANNER */}
                <div className="bg-slate-950/60 backdrop-blur-md rounded-2xl p-3 border border-lime-500/20 flex items-center justify-between mb-3.5 relative z-10 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-lime-500/20 text-lime-400 flex items-center justify-center shrink-0 border border-lime-400/30">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold">Blok & Bilik Kediaman</p>
                      <p className="text-xs font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="text-lime-300">{blockName}</span> &bull; <span>Bilik {roomNumber}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right border-l border-white/10 pl-3">
                    <p className="text-[8.5px] uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1 justify-end">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Merit Kolej
                    </p>
                    <p className="text-xs font-bold text-amber-400 font-mono mt-0.5">⭐ Tier Emas</p>
                  </div>
                </div>

                {/* 4. EMERGENCY & NEXT-OF-KIN (INFO WARIS) ON FRONT */}
                <div className="bg-slate-950/70 backdrop-blur-md rounded-2xl p-3 border border-slate-800/90 mb-3.5 relative z-10 space-y-2 shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
                      <HeartHandshake className="w-3 h-3 text-rose-400" /> Kontak Waris & Kecemasan
                    </span>
                    <span className="text-[8.5px] font-mono text-lime-400 font-semibold">Talian Rasmi</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="min-w-0">
                      <p className="text-[8px] text-slate-400 uppercase font-medium">Nama Waris / Penjaga</p>
                      <p className="text-[11px] font-bold text-white truncate mt-0.5">
                        {student?.parent_name || 'Ibu / Bapa / Penjaga'}
                      </p>
                    </div>

                    <div className="min-w-0 text-right sm:text-left">
                      <p className="text-[8px] text-slate-400 uppercase font-medium">No. Telefon Waris</p>
                      <p className="text-[11px] font-mono font-bold text-lime-400 truncate mt-0.5 flex items-center gap-1 sm:justify-start justify-end">
                        <Phone className="w-2.5 h-2.5 shrink-0" /> {emergencyPhone}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[9.5px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-500" /> Pelajar: <strong className="text-white font-mono">{phone}</strong>
                    </span>
                    {vehicleReg && vehicleReg !== 'Tiada Kenderaan' && (
                      <span className="text-amber-300 font-mono font-bold flex items-center gap-1">
                        <Car className="w-3 h-3 text-amber-400" /> {vehicleReg}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. CALL TO ACTION TO FLIP TO HUGE QR */}
                <button
                  type="button"
                  onClick={() => setIsFlipped(true)}
                  className="w-full bg-gradient-to-r from-lime-500/20 via-emerald-500/15 to-lime-500/10 hover:from-lime-500/30 hover:to-emerald-500/25 border-2 border-lime-400/50 rounded-2xl p-3 flex items-center justify-between transition-all group shadow-md cursor-pointer relative z-10"
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-9 h-9 rounded-xl bg-lime-500/25 border border-lime-400/50 text-lime-300 flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shrink-0">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-lime-300 flex items-center gap-1">
                        Buka Kod QR Imbasan (Besar) <Sparkles className="w-3 h-3 text-amber-400" />
                      </p>
                      <p className="text-[9.5px] text-slate-300">Sentuh untuk buka kod QR saiz penuh di bahagian belakang</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-lime-400 text-xs font-bold shrink-0">
                    <span className="hidden sm:inline text-[10px]">Papar QR</span>
                    <RotateCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                </button>
              </div>
            ) : (
              /* BACK OF THE CARD: ENORMOUS PROMINENT QR CODE FOR EFFORTLESS SCANNING */
              <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c182c] via-[#112440] to-[#0d1e34] border-2 border-lime-500/40 shadow-[0_0_40px_rgba(132,204,22,0.25)] p-5 text-white flex flex-col items-center text-center">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-lime-400/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Protocol Header */}
                <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-3 relative z-10">
                  <InstitutionalDualLogo />
                  <Badge className="bg-lime-500/25 text-lime-300 border-lime-400/50 text-[9px] font-mono font-bold px-2.5 py-1">
                    ● KOD PENGESAHAN QR
                  </Badge>
                </div>

                {/* Student Short Identity */}
                <div className="relative z-10 mb-2.5 space-y-0.5">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-tight">
                    {fullName}
                  </h3>
                  <p className="text-xs font-mono font-bold text-lime-300">
                    {matricNo} &bull; <span className="text-white">{blockName} ({roomNumber})</span>
                  </p>
                </div>

                {/* THE LARGE HIGH-CONTRAST QR CODE CONTAINER */}
                <div className="relative z-10 my-1 p-3.5 sm:p-4 bg-white rounded-3xl shadow-[0_0_35px_rgba(255,255,255,0.2)] border-4 border-lime-400/80 group">
                  <img 
                    src={qrUrl} 
                    alt="QR Pas Residen Digital KKTF" 
                    className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto"
                  />
                  {/* Visual Corner Framing Markers */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-900 rounded-tl-sm" />
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-900 rounded-tr-sm" />
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-900 rounded-bl-sm" />
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-900 rounded-br-sm" />
                </div>

                {/* Security ID Badge & Instructions */}
                <div className="relative z-10 mt-3 space-y-1">
                  <Badge variant="outline" className="bg-slate-950/80 text-lime-300 border-lime-400/40 text-[9.5px] font-mono font-bold px-3 py-0.5 shadow-sm">
                    ID: {matricNo}-KKTF-VERIFIED
                  </Badge>
                  <p className="text-[10px] text-slate-300 max-w-xs leading-tight mx-auto pt-1">
                    Halakan kod QR ini kepada Pengimbas Felo, Warden, Pengawal Pos Kawalan, atau EXCO JAKMAS.
                  </p>
                </div>

                {/* Quick Button to Flip Back */}
                <button
                  type="button"
                  onClick={() => setIsFlipped(false)}
                  className="mt-4 w-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-lime-400" /> Kembali ke Muka Depan Kad
                </button>
              </div>
            )}

            {/* ACTION BUTTONS BELOW CARD */}
            <div className="flex gap-2 w-full mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex-1 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5 rounded-xl cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-lime-400" /> {isFlipped ? 'Muka Depan & Waris' : 'Papar Kod QR Besar'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleShareOrSave}
                className="flex-1 bg-gradient-to-r from-lime-500 to-emerald-600 hover:from-lime-600 hover:to-emerald-700 text-slate-950 font-bold text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Simpan / Kongsi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
