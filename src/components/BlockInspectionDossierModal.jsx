import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Printer, 
  Copy, 
  X, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Filter,
  FileText
} from "lucide-react";
import { toast } from "sonner";

export default function BlockInspectionDossierModal({ 
  open, 
  onOpenChange, 
  requests = [], 
  currentBlockFilter = 'all', 
  categoryUnitMap = {} 
}) {
  const [selectedBlock, setSelectedBlock] = useState(currentBlockFilter === 'all' ? 'all' : currentBlockFilter);
  const [statusFilter, setStatusFilter] = useState('all');

  // Extract unique blocks
  const availableBlocks = useMemo(() => {
    const blocks = new Set(['all']);
    requests.forEach(r => {
      if (r.block_name) blocks.add(r.block_name);
      else if (r.room_number) {
        const prefix = r.room_number.split(/[-_.]/)[0];
        if (prefix) blocks.add(prefix.toUpperCase());
      }
    });
    return Array.from(blocks);
  }, [requests]);

  // Filter requests according to selected block and status
  const filteredDossierRequests = useMemo(() => {
    return requests.filter(r => {
      // Block match
      if (selectedBlock !== 'all') {
        const itemBlock = (r.block_name || r.room_number || '').toUpperCase();
        if (!itemBlock.includes(selectedBlock.toUpperCase())) return false;
      }
      // Status match
      if (statusFilter === 'pending') {
        if (r.status === 'Completed') return false;
      } else if (statusFilter === 'completed') {
        if (r.status !== 'Completed') return false;
      } else if (statusFilter === 'no_tams') {
        if (r.myserv_ticket_no) return false;
      }
      return true;
    });
  }, [requests, selectedBlock, statusFilter]);

  // Stats
  const totalItems = filteredDossierRequests.length;
  const totalCompleted = filteredDossierRequests.filter(r => r.status === 'Completed').length;
  const totalWithTams = filteredDossierRequests.filter(r => Boolean(r.myserv_ticket_no)).length;
  const totalUrgent = filteredDossierRequests.filter(r => r.urgency === 'Urgent').length;

  const formattedPrintDate = new Date().toLocaleDateString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const dossierRef = `KKTF/DOSSIER/${new Date().getFullYear()}/${selectedBlock === 'all' ? 'ALL' : selectedBlock.toUpperCase()}`;

  const handleCopySummary = () => {
    let summaryText = `[RINGKASAN PEMERIKSAAN KEROSAKAN BLOK KKTF]\n`;
    summaryText += `Zon / Blok: ${selectedBlock === 'all' ? 'Semua Blok' : selectedBlock} | Tarikh: ${formattedPrintDate}\n`;
    summaryText += `Jumlah Kerosakan: ${totalItems} (Selesai: ${totalCompleted}, Ada No. TAMS: ${totalWithTams}, Kecemasan: ${totalUrgent})\n\n`;
    summaryText += `SENARAI KEROSAKAN:\n`;

    filteredDossierRequests.forEach((r, idx) => {
      const loc = r.specific_location || `Bilik ${r.room_number || '-'}`;
      const tams = r.myserv_ticket_no ? `[TAMS: ${r.myserv_ticket_no}]` : `[Belum TAMS]`;
      summaryText += `${idx + 1}. ${loc} - ${r.category || 'Am'}: ${r.description} ${tams} (${r.status})\n`;
    });

    navigator.clipboard.writeText(summaryText);
    toast.success('Ringkasan blok berjaya disalin ke papan klip!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 bg-background border border-border rounded-3xl overflow-hidden shadow-2xl max-h-[94vh] flex flex-col">
        {/* TOP TOOLBAR (HIDDEN IN PRINT) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/70 border-b border-border print:hidden shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="font-bold text-xs text-foreground">Dossier Pemeriksaan Kerosakan Blok (A4)</p>
              <p className="text-[10px] text-muted-foreground">Laporan Senarai Pukal untuk Rujukan TAMS, JPP & Pengurusan Kolej</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* BLOCK SELECTOR */}
            <Select value={selectedBlock} onValueChange={setSelectedBlock}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-xl bg-background border-border">
                <SelectValue placeholder="Pilih Blok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Blok</SelectItem>
                {availableBlocks.filter(b => b !== 'all').map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* STATUS SELECTOR */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-36 rounded-xl bg-background border-border">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Menunggu Tindakan</SelectItem>
                <SelectItem value="no_tams">Belum Ada TAMS</SelectItem>
                <SelectItem value="completed">Telah Selesai</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCopySummary}
              className="h-8 text-xs font-semibold rounded-xl gap-1.5 border-slate-300 hover:bg-slate-100"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-600" /> Salin Teks
            </Button>

            <Button 
              size="sm" 
              onClick={handlePrint}
              className="h-8 bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" /> Cetak Dossier (PDF)
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

        {/* PRINTABLE DOSSIER BODY */}
        <div className="printable-document p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-5 print:p-0 print:m-0">
          {/* UMS & KKTF OFFICIAL LETTERHEAD WITH LOGOS */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 gap-4">
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
                  Unit Penyelenggaraan Fasiliti Kolej & Integrasi Sistem TAMS UMS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800">
                  {dossierRef}
                </span>
                <p className="text-[9px] text-slate-600 mt-1">
                  Tarikh Cetakan: <strong>{formattedPrintDate}</strong>
                </p>
              </div>
              <img 
                src="/logos/kktf-logo.jpg" 
                alt="Logo Kolej Kediaman Tun Fuad" 
                className="h-16 w-16 object-contain rounded-2xl border border-slate-200 shadow-2xs"
              />
            </div>
          </div>

          {/* TITLE & STATS SUMMARY BAR */}
          <div className="text-center space-y-1">
            <h1 className="text-sm font-black uppercase tracking-wider text-slate-950 font-serif">
              DOKUMEN RINGKASAN PEMERIKSAAN FIZIKAL & SENARAI KEROSAKAN FASILITI
            </h1>
            <p className="text-xs font-bold text-indigo-900 uppercase">
              ZON PEMERIKSAAN: {selectedBlock === 'all' ? 'KESELURUHAN BLOK KKTF' : `BLOK ${selectedBlock.toUpperCase()}`}
            </p>
          </div>

          {/* STATS TILES */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Jumlah Laporan</p>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">{totalItems}</p>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
              <p className="text-[9px] font-bold text-rose-700 uppercase">Kecemasan</p>
              <p className="text-base font-black text-rose-800 font-mono mt-0.5">{totalUrgent}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[9px] font-bold text-blue-700 uppercase">Daftar di TAMS</p>
              <p className="text-base font-black text-blue-800 font-mono mt-0.5">{totalWithTams}</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-[9px] font-bold text-emerald-700 uppercase">Disahkan Siap</p>
              <p className="text-base font-black text-emerald-800 font-mono mt-0.5">{totalCompleted}</p>
            </div>
          </div>

          {/* TABULAR SUMMARY TABLE */}
          <div className="space-y-1.5">
            <table className="w-full text-[10px] border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-left font-bold">
                  <th className="p-2 border border-slate-300 text-center w-8">Bil</th>
                  <th className="p-2 border border-slate-300 w-28">Lokasi & Bilik</th>
                  <th className="p-2 border border-slate-300 w-32">Kategori / Unit JPP</th>
                  <th className="p-2 border border-slate-300">Deskripsi Kerosakan di Tapak</th>
                  <th className="p-2 border border-slate-300 text-center w-20">Keutamaan</th>
                  <th className="p-2 border border-slate-300 w-24">No. TAMS</th>
                  <th className="p-2 border border-slate-300 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDossierRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                      Tiada rekod kerosakan ditemui mengikut tapisan blok yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredDossierRequests.map((r, idx) => {
                    const unitInfo = categoryUnitMap[r.category] || { unit: 'Penyelenggaraan Am' };
                    const isUrgent = r.urgency === 'Urgent';
                    const isDone = r.status === 'Completed';

                    return (
                      <tr 
                        key={r.id || idx} 
                        className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                      >
                        <td className="p-1.5 border border-slate-300 text-center font-mono font-semibold">{idx + 1}</td>
                        <td className="p-1.5 border border-slate-300 font-bold text-slate-900">
                          {r.specific_location || `Bilik ${r.room_number || '-'}`}
                        </td>
                        <td className="p-1.5 border border-slate-300">
                          <p className="font-semibold text-slate-900">{r.category || 'Am'}</p>
                          <p className="text-[8px] text-slate-500 truncate">{unitInfo.unit}</p>
                        </td>
                        <td className="p-1.5 border border-slate-300 text-slate-800 leading-snug">
                          {r.description}
                          {r.latest_followup_note && (
                            <p className="text-[8px] text-purple-900 italic mt-0.5">
                              Susulan: "{r.latest_followup_note}"
                            </p>
                          )}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center font-semibold">
                          {isUrgent ? (
                            <span className="text-rose-700 font-bold">Kecemasan</span>
                          ) : (
                            <span className="text-slate-600">Biasa</span>
                          )}
                        </td>
                        <td className="p-1.5 border border-slate-300 font-mono text-[9px]">
                          {r.myserv_ticket_no ? (
                            <span className="font-bold text-blue-900">{r.myserv_ticket_no}</span>
                          ) : (
                            <span className="text-amber-700 italic">Belum TAMS</span>
                          )}
                        </td>
                        <td className="p-1.5 border border-slate-300 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-semibold ${
                            isDone 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : r.myserv_ticket_no 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isDone ? 'Selesai' : r.myserv_ticket_no ? 'Ada TAMS' : 'Menunggu'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* SIGNATURE & ENDORSEMENT FOOTER */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-[9px]">
            {/* 1. FELO JAGAAN BLOK */}
            <div className="border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between h-24 bg-slate-50/50">
              <p className="font-bold uppercase text-slate-900">Perakuan Felo Jagaan Blok:</p>
              <div className="border-b border-slate-400 border-dashed" />
              <div>
                <p className="font-bold text-slate-900">Nama: ............................................</p>
                <p className="text-slate-600">Tarikh: {formattedPrintDate}</p>
              </div>
            </div>

            {/* 2. PENOLONG PENGURUS ASRAMA (PPA) */}
            <div className="border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between h-24 bg-slate-50/50">
              <p className="font-bold uppercase text-slate-900">Pengesahan Pentadbiran Kolej / PPA:</p>
              <div className="border-b border-slate-400 border-dashed" />
              <div>
                <p className="font-bold text-slate-900">Nama: ............................................</p>
                <p className="text-slate-600">Cop Rasmi Kolej</p>
              </div>
            </div>

            {/* 3. PEGAWAI ZON JPP UMS */}
            <div className="border border-slate-300 rounded-lg p-2.5 flex flex-col justify-between h-24 bg-slate-50/50">
              <p className="font-bold uppercase text-slate-900">Penerimaan Tindakan JPP UMS:</p>
              <div className="border-b border-slate-400 border-dashed" />
              <div>
                <p className="font-bold text-slate-900">Nama Pegawai/PIC: ....................</p>
                <p className="text-slate-600">Tarikh Penerimaan: .....................</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[8px] text-slate-500 font-mono">
            <span>Dossier Pemeriksaan Fizikal Kolej Kediaman Tun Fuad (KKTF) UMS</span>
            <span>Dokumen Dalaman Penyelenggaraan Fasiliti &bull; Sesi 2025/2026</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
