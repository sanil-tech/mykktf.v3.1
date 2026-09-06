import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Printer, 
  Award, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Video, 
  Globe, 
  ExternalLink, 
  FileText, 
  UserCheck, 
  Pencil, 
  Building2, 
  AlertCircle,
  X,
  Sparkles,
  Zap
} from "lucide-react";
import { printDocument } from "@/lib/printUtils";
import { getEventModalityInfo } from "@/pages/Events";

export default function PrincipalEventDetailModal({
  open,
  onOpenChange,
  event: ev,
  user,
  onApprove,
  onReject,
  onEditModality
}) {
  const [directiveNotes, setDirectiveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!ev) return null;

  const modalityInfo = getEventModalityInfo(ev);
  const isApproved = ev.felo_approval_status === 'Approved';
  const isRejected = ev.felo_approval_status === 'Rejected';
  const isPending = !isApproved && !isRejected;

  // Semak AJK jika disimpan dalam localStorage
  let ajkList = [];
  try {
    ajkList = JSON.parse(localStorage.getItem(`event_ajk_${ev.id}`) || '[]');
  } catch (e) {
    ajkList = [];
  }

  const meritPoints = Number(ev.merit_points) || 10;
  const refNumber = `UMS/KKTF/P-EVT-${(ev.id || '2026').substring(0, 8).toUpperCase()}`;
  const submissionDate = ev.created_date || ev.event_date || '2026-09-07';

  const handleApproveClick = async () => {
    if (!onApprove) return;
    setIsSubmitting(true);
    try {
      await onApprove(ev, directiveNotes);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = () => {
    if (!onReject) return;
    onReject(ev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-background border border-border rounded-3xl overflow-hidden shadow-2xl max-h-[94vh] flex flex-col">
        {/* TOP ACTION BAR (HIDDEN IN PRINT MEDIA) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/70 border-b border-border print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/40">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                Dosier Rasmi Kertas Cadangan & Semakan Pengetua Kolej
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                No. Ruj: {refNumber} &bull; Sesi Akademik 2026/2027
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditModality && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEditModality(ev);
                }}
                className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
              >
                <Pencil className="w-3.5 h-3.5" /> Ubah Modaliti
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={printDocument}
              className="h-8 text-xs font-semibold rounded-xl gap-1.5 text-slate-700 dark:text-slate-200"
            >
              <Printer className="w-3.5 h-3.5 text-amber-500" /> Cetak Salinan PDF
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PRINTABLE DOSSIER BODY */}
        <div className="p-6 md:p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6 print:p-0 print:m-0 flex-1">
          {/* UMS & KKTF OFFICIAL LETTERHEAD WITH LOGOS */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 gap-4">
            <div className="flex items-center gap-3.5">
              <img 
                src="/logos/ums-logo.png" 
                alt="Logo Universiti Malaysia Sabah" 
                className="h-16 w-auto object-contain shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-slate-950 leading-tight">
                  UNIVERSITI MALAYSIA SABAH
                </h2>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                  KOLEJ KEDIAMAN TUN FUAD (KKTF)
                </h3>
                <p className="text-[9.5px] text-slate-600 mt-0.5">
                  Pejabat Pengetua Kolej &bull; Pengurusan Pembangunan Residen & Sahsiah Mahasiswa
                </p>
              </div>
            </div>

            {/* STATUS BADGE & REF */}
            <div className="text-right shrink-0 space-y-1">
              <div className="inline-block">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                  isApproved
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isRejected
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {isApproved ? '✓ DILULUSKAN PENGETUA' : isRejected ? '✕ DITOLAK' : '⏳ MENUNGGU KELULUSAN PENGETUA'}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-600 font-semibold">{refNumber}</p>
              <p className="text-[9px] text-slate-500">Tarikh Dikemukakan: {submissionDate}</p>
            </div>
          </div>

          {/* DOKUMEN HEADER & TAJUK ACARA */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#132644] text-white px-2.5 py-0.5 rounded-md">
                KERTAS KERJA CADANGAN AKTIVITI KOLEJ
              </span>
              <span className={`text-[10.5px] px-2.5 py-0.5 rounded-md font-extrabold border ${modalityInfo.colorClass}`}>
                {modalityInfo.label}
              </span>
            </div>

            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-950 leading-snug">
                {ev.event_name}
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Penganjur Utama: <strong className="text-slate-900">{ev.organizer || 'Kolej Kediaman Tun Fuad'}</strong>
                {ev.creator_name && ` (Dicadangkan oleh: ${ev.creator_name}${ev.creator_role ? ` - ${ev.creator_role.toUpperCase()}` : ''})`}
              </p>
            </div>

            {/* RINGKASAN DESKRIPSI & OBJEKTIF */}
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-700 leading-relaxed space-y-1.5">
              <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                Ringkasan Eksekutif & Objektif Program:
              </p>
              <p className="italic bg-white p-3 rounded-xl border border-slate-200/80 text-slate-800">
                "{ev.description || 'Acara tahunan kolej bagi pembangunan insaniah, ukhwah residen, dan kecemerlangan komuniti Kolej Kediaman Tun Fuad.'}"
              </p>
            </div>
          </div>

          {/* METRIKS & PERINCIAN LOGISTIK PROGRAM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KAD LOGISTIK, TARIKH & TEMPAT */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Perincian Tarikh & Lokasi
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">📅 Tarikh Pelaksanaan:</span>
                  <span className="font-bold text-slate-900 font-mono">{ev.event_date || 'Akan Ditetapkan'}</span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">⏰ Masa Program:</span>
                  <span className="font-bold text-slate-900 font-mono">{ev.event_time || 'Sepanjang Hari'}</span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">📍 Lokasi / Venue Fizikal:</span>
                  <span className="font-bold text-slate-900 text-right">{ev.venue || 'Dewan Serbaguna KKTF'}</span>
                </div>

                <div className="flex items-start justify-between py-1">
                  <span className="text-slate-500">🔄 Modaliti Program:</span>
                  <span className="font-extrabold text-indigo-700">{modalityInfo.modality}</span>
                </div>

                {/* MAKLUMAT ONLINE JIKA HIBRID ATAU ONLINE */}
                {(modalityInfo.modality === 'Hibrid' || modalityInfo.modality === 'Dalam Talian') && (
                  <div className="mt-2 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1">
                    <p className="font-bold text-blue-900 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-blue-600" /> Sesi Maya ({modalityInfo.platform || 'Google Meet'})
                    </p>
                    {modalityInfo.meeting_link ? (
                      <a 
                        href={modalityInfo.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-700 hover:underline font-mono text-[11px] truncate flex items-center gap-1"
                      >
                        {modalityInfo.meeting_link} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-slate-500 italic text-[11px]">Pautan sesi akan diagihkan kepada peserta berdaftar.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* KAD PENYERTAAN, MERIT & KELULUSAN FELO */}
            <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Award className="w-3.5 h-3.5 text-amber-600" /> Merit & Perakuan Felo Penyelaras
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">👥 Kuota Residen:</span>
                  <span className="font-bold text-slate-900">
                    {ev.current_registrations || 0} / {ev.registration_limit || 50} Peserta
                  </span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">🏆 Ganjaran Merit Peserta:</span>
                  <span className="font-bold text-emerald-700">+{meritPoints} Mata Merit</span>
                </div>

                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">🎖️ Ganjaran Merit Urusetia/AJK:</span>
                  <span className="font-bold text-indigo-700">+20 Mata Merit</span>
                </div>

                <div className="flex items-start justify-between py-1">
                  <span className="text-slate-500">👨‍🏫 Felo Penyelaras Bertugas:</span>
                  <span className="font-extrabold text-slate-900 text-right">
                    {ev.felo_coordinator_name || 'Pejabat Pentadbiran Felo KKTF'}
                  </span>
                </div>

                <div className="mt-2 p-2.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs">
                  <p className="font-bold text-amber-900 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> Kawal Selia Aktiviti:
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Felo Penyelaras bertanggungjawab menyelia keselamatan, pematuhan jam malam, dan pengesahan kehadiran QR di lokasi program.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SENARAI AJK PROGRAM (JIKA ADA) */}
          {ajkList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" /> Jawatankuasa Pelaksana & Urusetia Mahasiswa ({ajkList.length} orang)
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-left">
                      <th className="p-2 border-b font-bold">Bil</th>
                      <th className="p-2 border-b font-bold">Nama Pelajar / Urusetia</th>
                      <th className="p-2 border-b font-bold">No. Matrik</th>
                      <th className="p-2 border-b font-bold">Jawatan Disandang</th>
                      <th className="p-2 border-b font-bold text-center">Merit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ajkList.map((ajk, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 text-center font-mono text-slate-500">{i + 1}</td>
                        <td className="p-2 font-semibold text-slate-900">{ajk.student_name}</td>
                        <td className="p-2 font-mono text-slate-600">{ajk.student_id}</td>
                        <td className="p-2 font-medium text-indigo-800">{ajk.role_title}</td>
                        <td className="p-2 text-center font-bold text-emerald-700">+{ajk.points || 20}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATATAN / SEBAB PENOLAKAN JIKA DITOLAK SEBELUM INI */}
          {isRejected && ev.rejection_reason && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" /> Catatan Penolakan Terdahulu:
              </p>
              <p className="text-rose-800 italic">"{ev.rejection_reason}"</p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* BAHAGIAN KEPUTUSAN & ARAHAN KHAS PENGETUA KOLEJ                           */}
          {/* ========================================================================= */}
          <div className="p-4 md:p-5 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-slate-50 border-2 border-amber-300 rounded-2xl space-y-3 print:border-slate-400">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                👑 Arahan & Syarat Kelulusan Pengetua Kolej
              </h4>
              <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-md">
                Kuasa Mutlak Pengetua (Peruntukan KKTF)
              </span>
            </div>

            {isPending ? (
              <div className="space-y-1.5 print:hidden">
                <Label className="text-[11px] font-bold text-slate-800">
                  Catatan / Syarat Khas Pelaksanaan Program (Pilihan Pengetua):
                </Label>
                <Textarea
                  value={directiveNotes}
                  onChange={(e) => setDirectiveNotes(e.target.value)}
                  placeholder="cth: Diluluskan dengan syarat kawalan bunyi malam sehingga jam 11:00 malam sahaja, dan pembersihan Dewan diselesaikan sebelum 8:00 pagi keesokan harinya."
                  className="text-xs bg-white border-slate-300 rounded-xl resize-none h-20"
                />
                <p className="text-[10px] text-slate-500 italic">
                  Catatan ini akan direkodkan dalam log audit kolej dan dimaklumkan kepada penganjur dan Felo bertugas.
                </p>
              </div>
            ) : (
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500 font-medium">Catatan / Keputusan Pengetua:</p>
                <p className="font-semibold text-slate-900">
                  {ev.principal_notes || ev.rejection_reason || 'Diluluskan secara rasmi tanpa sebarang syarat tambahan.'}
                </p>
              </div>
            )}
          </div>

          {/* PERAKUAN & COP RASMI PENGETUA (FOOTER DOKUMEN) */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="inline-block px-3 py-1 rounded-full border border-slate-300 text-[9px] font-bold uppercase tracking-wider text-slate-700 bg-slate-50">
                Cop Pengesahan Rasmi Kolej
              </div>
              <p className="text-[10px] font-bold text-slate-900">
                Sistem Pengurusan Kolej Kediaman Tun Fuad (MyKKTF)
              </p>
              <p className="text-[9px] text-slate-500 italic">
                Dokumen elektronik dijana secara rasmi bagi tujuan rekod takwim dan kelulusan program kolej.
              </p>
            </div>

            <div className="text-right space-y-1">
              <p className="font-serif italic text-sm font-bold text-slate-900">
                Prof. Madya Ts. Dr. Nur Fadilah binti Darmansah
              </p>
              <div className="w-56 h-0.5 bg-slate-900 ml-auto" />
              <p className="font-black text-[10px] text-slate-950 leading-tight">
                PROFESOR MADYA TS. DR. NUR FADILAH BINTI DARMANSAH
              </p>
              <p className="text-[9px] font-bold text-slate-800">
                Pengetua Kolej Kediaman Tun Fuad
              </p>
              <p className="text-[8px] text-slate-600">
                Universiti Malaysia Sabah
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM DIALOG ACTION BUTTONS (KHAS PENGETUA KOLEJ) */}
        <div className="px-6 py-4 bg-muted/80 border-t border-border flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs font-semibold"
          >
            Tutup Paparan
          </Button>

          {isPending && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleRejectClick}
                className="h-9 text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Tolak Kertas Cadangan
              </Button>

              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleApproveClick}
                className="h-9 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-2 shadow-md px-4"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Memproses Kelulusan...' : '✓ SAHKAN & LULUSKAN KERTAS CADANGAN (PENGETUA)'}
              </Button>
            </div>
          )}

          {isApproved && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-400/40">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Acara telah disahkan & diluluskan secara rasmi oleh Pengetua.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
