import React from 'react';
import { printDocument } from '@/lib/printUtils';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  Copy, 
  X, 
  Wrench, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink,
  Flame,
  Calendar,
  User,
  Hash
} from "lucide-react";
import { toast } from "sonner";

const UMS_TAMS_URL = 'https://aset.ums.edu.my/myserv/';

export default function DamageReportModal({ open, onOpenChange, request, categoryUnitMap = {} }) {
  if (!request) return null;

  const unitInfo = categoryUnitMap[request.category] || { 
    unit: 'UNIT PENYELENGGARAAN AM JPP', 
    tag: '@Penyelenggaraan Am', 
    color: 'text-slate-700 bg-slate-100' 
  };

  const isUrgent = request.urgency === 'Urgent';
  const hasTamsRef = Boolean(request.myserv_ticket_no);
  const formattedRef = request.myserv_ticket_no || '(Menunggu Pendaftaran TAMS)';
  const formattedDate = request.submitted_at 
    ? new Date(request.submitted_at).toLocaleDateString('ms-MY', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });

  const ticketYear = request.submitted_at ? new Date(request.submitted_at).getFullYear() : new Date().getFullYear();
  const internalKktfRef = `KKTF/MNT/${ticketYear}/${request.id ? String(request.id).slice(-5).toUpperCase() : 'REQ-01'}`;

  // Copy structured text formatted specifically for TAMS input fields
  const handleCopyTamsFormat = () => {
    const tamsText = `[LAPORAN KEROSAKAN FASILITI KKTF - TAMS UMS]
No. Rujukan MyKKTF: ${internalKktfRef}
Lokasi: ${request.specific_location || `Bilik ${request.room_number || '-'}`} (${request.location_type || 'Bilik Mahasiswa'})
Kategori: ${request.category || 'Penyelenggaraan Am'}
Unit Pelaksana JPP: ${unitInfo.unit}
Tahap Keutamaan: ${isUrgent ? 'KECEMASAN / TINGGI' : 'BIASA (Standard SLA)'}
Nama Pengadu / Felo: ${request.student_name || 'Felo Pemeriksa'} (ID/Matrik: ${request.student_id || '-'})
No. Telefon Pengadu: ${request.phone_number || '-'}
Tarikh Pemeriksaan: ${formattedDate}

KETERANGAN KEROSAKAN:
${request.description || '-'}

CATATAN SUSULAN / PEMERIKSAAN TAPAK:
${request.latest_followup_note || 'Telah disahkan dalam pemeriksaan fizikal di lokasi oleh pihak kolej.'}`;

    navigator.clipboard.writeText(tamsText);
    toast.success('Teks format TAMS berjaya disalin!', {
      description: 'Sedia untuk ditampal (paste) ke portal sistem TAMS UMS.'
    });
  };

  const handlePrint = () => {
    printDocument();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-background border border-border rounded-3xl overflow-hidden shadow-2xl max-h-[94vh] flex flex-col">
        {/* TOP ACTION BAR (ALWAYS HIDDEN IN PRINT) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/70 border-b border-border print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-700 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-foreground flex items-center gap-2">
                Borang Pemeriksaan Fizikal & Arahan Kerja Kerosakan
                {hasTamsRef ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                    {request.myserv_ticket_no}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                    Menunggu No. TAMS
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">Format Cetakan Rasmi A4 Universiti Malaysia Sabah (KKTF &bull; JPP)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCopyTamsFormat}
              className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-slate-300 hover:bg-slate-100"
              title="Salin butiran terformat untuk ditampal ke portal TAMS"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-600" /> Salin Format TAMS
            </Button>

            <Button 
              size="sm" 
              onClick={handlePrint}
              className="h-8 bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" /> Cetak / Muat Turun PDF
            </Button>

            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-xl text-slate-500 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PRINTABLE A4 DOCUMENT CONTAINER */}
        <div className="printable-document p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-5 print:p-0 print:m-0">
          {/* UMS & KKTF OFFICIAL LETTERHEAD WITH LOGOS */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 gap-4">
            {/* LOGO UMS (LEFT) */}
            <div className="flex items-center gap-4">
              <img 
                src="/logos/ums-logo.png" 
                alt="Logo Universiti Malaysia Sabah" 
                className="h-16 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">
                  UNIVERSITI MALAYSIA SABAH
                </h2>
                <h3 className="text-xs font-bold text-[#132644]">
                  KOLEJ KEDIAMAN TUN FUAD (KKTF)
                </h3>
                <p className="text-[9.5px] text-slate-600">
                  Jalan UMS, 88400 Kota Kinabalu, Sabah &bull; Tel: +60 88-320 000 &bull; E-mel: kktf@ums.edu.my
                </p>
                <p className="text-[9px] text-slate-500 font-medium">
                  Dengan Kerjasama Jabatan Pembangunan & Penyelenggaraan (JPP) UMS
                </p>
              </div>
            </div>

            {/* LOGO KKTF (RIGHT) & REF NUMBER */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800">
                  {internalKktfRef}
                </span>
                <p className="text-[9px] font-mono text-blue-900 font-bold mt-1">
                  No. TAMS: {formattedRef}
                </p>
                <p className="text-[8.5px] text-slate-500">
                  Tarikh: {formattedDate}
                </p>
              </div>
              <img 
                src="/logos/kktf-logo.jpg" 
                alt="Logo Kolej Kediaman Tun Fuad" 
                className="h-16 w-16 object-contain rounded-2xl border border-slate-200 shadow-2xs"
              />
            </div>
          </div>

          {/* DOCUMENT TITLE & BADGES */}
          <div className="text-center space-y-1">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-950 font-serif">
              BORANG PEMERIKSAAN FIZIKAL & ARAHAN KERJA KEROSAKAN FASILITI
            </h1>
            <p className="text-[10.5px] font-semibold text-slate-700 uppercase">
              MODUL PEMANTAUAN TAPAK KOLEJ & TINDAKAN SUSULAN TAMS / JPP
            </p>
            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                <Flame className="w-2.5 h-2.5" /> KES KECEMASAN (TINDAKAN SEGERA)
              </span>
            )}
          </div>

          {/* SECTION 1: LOCATION & CLASSIFICATION METADATA */}
          <div className="grid grid-cols-2 gap-3 text-xs border border-slate-300 rounded-xl p-3.5 bg-slate-50/60">
            <div className="space-y-1.5">
              <div>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase">Lokasi Spesifik Kerosakan:</p>
                <p className="font-extrabold text-sm text-slate-950 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                  {request.specific_location || `Bilik ${request.room_number || '-'}`}
                </p>
                <p className="text-[10px] text-slate-600">
                  Kategori Zon: <strong>{request.location_type || 'Bilik Mahasiswa'}</strong>
                </p>
              </div>

              <div>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase">Kategori & Unit JPP:</p>
                <p className="font-bold text-slate-900 text-xs">
                  {request.category || 'Penyelenggaraan Am'} &bull; <span className="text-indigo-900">{unitInfo.unit}</span>
                </p>
              </div>
            </div>

            <div className="space-y-1.5 text-right">
              <div>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase">Pengadu / Felo Pemeriksa:</p>
                <p className="font-extrabold text-xs text-slate-950">
                  {request.student_name || 'Felo / Staf KKTF'}
                </p>
                <p className="text-[10px] text-slate-600 font-mono">
                  No. Matrik / ID: {request.student_id || '-'}
                </p>
                {request.phone_number ? (
                  <a
                    href={`https://wa.me/60${request.phone_number.replace(/^(\+60|60|0)/, '').replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-emerald-700 font-mono font-semibold hover:underline flex items-center gap-0.5 justify-end mt-0.5"
                  >
                    📱 +60{request.phone_number.replace(/^(\+60|60|0)/, '').replace(/\D/g, '')}
                  </a>
                ) : (
                  <p className="text-[10px] text-slate-400 font-mono">Tel: -</p>
                )}
              </div>

              <div>
                <p className="text-[9.5px] font-bold text-slate-500 uppercase">Tahap Keutamaan & SLA:</p>
                <p className="text-xs font-bold text-slate-900">
                  {isUrgent ? (
                    <span className="text-rose-700 font-black">Kecemasan (SLA 24 Jam)</span>
                  ) : (
                    <span className="text-slate-800">Biasa (SLA 3 - 5 Hari Bekerja)</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: DESCRIPTION OF DAMAGE */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-white space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Perincian & Keterangan Kerosakan di Lokasi</span>
              <span className="text-[9px] font-mono text-slate-500 font-normal">Dilaporkan pada: {formattedDate}</span>
            </h4>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-900 leading-relaxed min-h-[50px]">
              {request.description || 'Tiada huraian tambahan dinyatakan.'}
            </div>

            {request.latest_followup_note && (
              <div className="mt-2 p-2 bg-purple-50/60 rounded-lg border border-purple-200 text-[10.5px] text-purple-950">
                <p className="font-bold text-purple-900 text-[9.5px] uppercase">Catatan Tindakan Susulan Kolej / Lapangan:</p>
                <p className="italic mt-0.5">"{request.latest_followup_note}"</p>
              </div>
            )}
          </div>

          {/* SECTION 3: PHOTO EVIDENCE GRID (BEFORE & AFTER REPAIR) */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
              Bukti Bergambar Pemeriksaan Tapak (Evidence Photos)
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Photo 1: Before Repair */}
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 text-center flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase text-slate-600 mb-1">
                  1. Foto Sebelum Pembaikan (Pemeriksaan Asal)
                </p>
                {request.photo ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-white h-40 flex items-center justify-center">
                    <img 
                      src={request.photo} 
                      alt="Foto Sebelum Pembaikan" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 text-[10px] p-2 bg-white">
                    <Wrench className="w-6 h-6 mb-1 text-slate-300" />
                    <span>Tiada lampiran gambar digital.</span>
                    <span className="text-[8.5px] text-slate-400 mt-1 italic">(Lekatkan foto fizikal jika diperlukan)</span>
                  </div>
                )}
                <p className="text-[8px] font-mono text-slate-500 mt-1">
                  Cop Masa: {formattedDate}
                </p>
              </div>

              {/* Photo 2: After Repair or Verification Box */}
              <div className="border border-slate-300 rounded-xl p-2 bg-slate-50 text-center flex flex-col justify-between">
                <p className="text-[9px] font-bold uppercase text-slate-600 mb-1">
                  2. Foto Selepas Pembaikan / Pengesahan Selesai
                </p>
                {request.completion_photo ? (
                  <div className="rounded-lg overflow-hidden border border-emerald-300 bg-white h-40 flex items-center justify-center">
                    <img 
                      src={request.completion_photo} 
                      alt="Foto Selepas Pembaikan" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-40 border-2 border-dashed border-emerald-300/80 rounded-lg flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 bg-white">
                    <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-600" />
                    <span className="font-semibold text-slate-700">Ruang Pengesahan Siap Pembaikan</span>
                    <span className="text-[8.5px] text-slate-500 mt-1 text-center leading-tight">
                      Untuk disahkan oleh Juruteknik JPP / Kontraktor & disemak oleh Felo Kolej selepas kerja disempurnakan.
                    </span>
                  </div>
                )}
                <p className="text-[8px] font-mono text-emerald-800 mt-1 font-semibold">
                  Status: {request.status === 'Completed' ? 'DISAHKAN SELESAI' : 'DALAM TINDAKAN / PEMANTAUAN'}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4: OFFICIAL 4-SIGNATURE & ENDORSEMENT BLOCKS */}
          <div className="pt-2 border-t-2 border-slate-900 space-y-2">
            <h4 className="text-[9.5px] font-bold uppercase tracking-wider text-slate-800 text-center">
              Perakuan Pemeriksaan, Penerimaan TAMS & Pengesahan Pembaikan Fizikal
            </h4>

            <div className="grid grid-cols-4 gap-2 text-[8.5px]">
              {/* BLOCK 1: FELO / PELAPOR */}
              <div className="border border-slate-300 rounded-lg p-2 flex flex-col justify-between h-28 bg-slate-50/50">
                <div>
                  <p className="font-extrabold uppercase text-slate-900">1. Pemeriksa Tapak</p>
                  <p className="text-[7.5px] text-slate-500">Perakuan Felo / Staf KKTF</p>
                </div>
                <div className="border-b border-slate-400 border-dashed mb-1" />
                <div>
                  <p className="font-bold text-slate-900 truncate">Nama: {request.student_name || '........................'}</p>
                  <p className="text-slate-600">Tarikh: {formattedDate.split(',')[0]}</p>
                </div>
              </div>

              {/* BLOCK 2: PENTADBIRAN KOLEJ / PPA (TAMS ENTRY) */}
              <div className="border border-slate-300 rounded-lg p-2 flex flex-col justify-between h-28 bg-slate-50/50">
                <div>
                  <p className="font-extrabold uppercase text-slate-900">2. Pendaftar TAMS</p>
                  <p className="text-[7.5px] text-slate-500">Pejabat Am KKTF / PPA</p>
                </div>
                <div className="border-b border-slate-400 border-dashed mb-1" />
                <div>
                  <p className="font-bold text-slate-900">Nama: ........................</p>
                  <p className="text-slate-600 font-mono">No. TAMS: {request.myserv_ticket_no || '...............'}</p>
                </div>
              </div>

              {/* BLOCK 3: JPP / KONTRAKTOR */}
              <div className="border border-slate-300 rounded-lg p-2 flex flex-col justify-between h-28 bg-slate-50/50">
                <div>
                  <p className="font-extrabold uppercase text-slate-900">3. Tindakan JPP / Kontraktor</p>
                  <p className="text-[7.5px] text-slate-500">Juruteknik / PIC Zon</p>
                </div>
                <div className="border-b border-slate-400 border-dashed mb-1" />
                <div>
                  <p className="font-bold text-slate-900">Nama: ........................</p>
                  <p className="text-slate-600">Tarikh Mula: ................</p>
                </div>
              </div>

              {/* BLOCK 4: PENGESAHAN SIAP */}
              <div className="border border-slate-300 rounded-lg p-2 flex flex-col justify-between h-28 bg-slate-50/50">
                <div>
                  <p className="font-extrabold uppercase text-slate-900">4. Perakuan Siap</p>
                  <p className="text-[7.5px] text-slate-500">Pengesahan Akhir Residen/Felo</p>
                </div>
                <div className="border-b border-slate-400 border-dashed mb-1" />
                <div>
                  <p className="font-bold text-slate-900">T/tangan: ....................</p>
                  <p className="text-slate-600">Tarikh Siap: ................</p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER NOTE */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[8px] text-slate-500 font-mono">
            <span>Sistem Pengurusan Digital MyKKTF v3.1 &bull; Kolej Kediaman Tun Fuad UMS</span>
            <span className="font-sans italic">Dokumen rasmi bagi tujuan pengesahan pemeriksaan dan rujukan sistem TAMS universiti.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
