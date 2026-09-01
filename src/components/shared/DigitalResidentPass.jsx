import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  GraduationCap, 
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
  Share2
} from 'lucide-react';
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
  const vehicleReg = student?.vehicle_reg || 'Tiada Kenderaan';
  const isCheckedIn = student?.room_status === 'Checked In' || (student?.block_name && student?.room_number);

  // Generate simple QR Code URL based on student verification string
  const verificationPayload = encodeURIComponent(`KKTF-PASS:${matricNo}:${blockName}:${roomNumber}:VERIFIED`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${verificationPayload}&color=0f172a&bgcolor=ffffff`;

  const handleShareOrSave = () => {
    if (navigator.share) {
      navigator.share({
        title: `Pas Residen Digital KKTF - ${fullName}`,
        text: `Pas Pengenalan Residen Kolej Kediaman Tun Fuad (KKTF), UMS.\nNama: ${fullName}\nMatrik: ${matricNo}\nBilik: ${blockName} - ${roomNumber}`,
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
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs gap-1.5 shadow-md rounded-xl"
        >
          <ShieldCheck className="w-4 h-4 text-slate-950" /> Tunjuk Pas Residen Digital
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden bg-slate-950 border-slate-800 text-white rounded-3xl shadow-2xl">
          <DialogHeader className="p-4 pb-2 border-b border-slate-800/80 bg-slate-900/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-heading font-bold text-white leading-tight">
                  Pas Residen Digital KKTF
                </DialogTitle>
                <p className="text-[10px] text-slate-400">Kad Pengenalan Digital Kolej Kediaman Tun Fuad</p>
              </div>
            </div>

            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsFlipped(!isFlipped)} 
              className="h-8 text-xs text-amber-300 hover:text-amber-200 hover:bg-slate-800 gap-1"
            >
              <RotateCw className="w-3.5 h-3.5" /> {isFlipped ? 'Info Waris' : 'Flip'}
            </Button>
          </DialogHeader>

          {/* CARD CONTAINER */}
          <div className="p-5 flex flex-col items-center">
            {!isFlipped ? (
              /* FRONT OF THE CARD */
              <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1a30] via-[#112442] to-[#1a3660] border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)] p-5 text-white">
                {/* Hologram Shimmer Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 via-sky-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-emerald-400/15 via-indigo-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />

                {/* Card Top Branding Header */}
                <div className="flex items-start justify-between border-b border-white/15 pb-3.5 mb-4 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-amber-400 shadow-inner">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-widest text-amber-300 font-bold font-mono">Universiti Malaysia Sabah</p>
                      <h3 className="text-sm font-heading font-extrabold text-white tracking-tight">Kolej Kediaman Tun Fuad</h3>
                    </div>
                  </div>

                  <Badge className={`text-[9px] font-mono font-bold px-2 py-0.5 border ${isCheckedIn ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-amber-500/20 text-amber-300 border-amber-400/40'}`}>
                    {isCheckedIn ? '● RESIDEN AKTIF' : '○ PENDING'}
                  </Badge>
                </div>

                {/* Photo & Core Information Row */}
                <div className="flex gap-4 items-center relative z-10 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-amber-400/60 flex flex-col items-center justify-center text-amber-400 shadow-md shrink-0 relative overflow-hidden">
                    <User className="w-10 h-10 text-slate-300" />
                    <span className="text-[8px] font-mono text-slate-400 uppercase mt-0.5">FOTO</span>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h2 className="text-base font-heading font-bold text-white leading-snug truncate uppercase">
                      {fullName}
                    </h2>
                    <p className="text-xs font-mono font-bold text-amber-300 tracking-wider">
                      {matricNo}
                    </p>
                    <p className="text-[11px] text-slate-300 truncate">
                      {programme} &bull; <span className="text-amber-200">{yearOfStudy}</span>
                    </p>
                  </div>
                </div>

                {/* Assigned Room Highlight Ribbon */}
                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Blok & Bilik Kediaman</p>
                      <p className="text-xs font-bold text-white font-mono">
                        {blockName} &bull; Bilik {roomNumber}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Sesi Akademik</p>
                    <p className="text-xs font-bold text-emerald-400 font-mono">2025/2026</p>
                  </div>
                </div>

                {/* Bottom Verification QR & Security Strip */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 relative z-10 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-slate-400 flex items-center gap-1 font-mono uppercase tracking-wide">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Imbas untuk Pengesahan
                    </p>
                    <p className="text-[10px] text-slate-300 font-medium">Sah laku di pos kawalan & aktiviti kolej</p>
                  </div>

                  <div className="p-1.5 bg-white rounded-xl shadow-md shrink-0">
                    <img 
                      src={qrUrl} 
                      alt="QR Pengesahan Residen" 
                      className="w-14 h-14 object-contain"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* BACK OF THE CARD: EMERGENCY & VEHICLE DETAILS */
              <div className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] border border-slate-700 shadow-xl p-5 text-white space-y-4">
                <div className="border-b border-slate-700/80 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-bold font-heading uppercase text-amber-400 flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4" /> Maklumat Waris & Kecemasan
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">KKTF EMERGENCY</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Telefon Residen</p>
                    <p className="text-sm font-bold text-white font-mono mt-0.5">{phone}</p>
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Kontak Waris / Ibu Bapa</p>
                    <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">{emergencyPhone}</p>
                    {student?.parent_name && (
                      <p className="text-[10px] text-slate-300 mt-0.5">Nama: {student.parent_name}</p>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Pendaftaran Kenderaan</p>
                      <p className="text-xs font-bold text-amber-300 font-mono mt-0.5">{vehicleReg}</p>
                    </div>
                    <Car className="w-5 h-5 text-slate-500" />
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-200/90 leading-relaxed">
                  ⚠️ Kad ini adalah hak milik Kolej Kediaman Tun Fuad (UMS). Wajib ditunjukkan apabila diminta oleh Felo, Pengawal Keselamatan, atau Staf Kolej.
                </div>
              </div>
            )}

            {/* ACTION BUTTONS BELOW CARD */}
            <div className="flex gap-2 w-full mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex-1 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> {isFlipped ? 'Pusing ke Depan' : 'Lihat Info Waris'}
              </Button>
              <Button 
                size="sm" 
                onClick={handleShareOrSave}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" /> Kongsi / Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
