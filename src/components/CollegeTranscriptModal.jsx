import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Award, CheckCircle2, ShieldCheck, QrCode, Building2, X } from "lucide-react";

export default function CollegeTranscriptModal({ open, onOpenChange, student, attendanceRecords = [], meritTransactions = [] }) {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentAttendance = attendanceRecords.filter(a => a.student_id === student.id || a.student_id === student.student_id);
  const studentExtraTxs = meritTransactions.filter(t => (t.student_id === student.id || t.student_id === student.student_id) && t.status === 'Approved');

  const attendancePoints = studentAttendance.length * 10;
  const extraMeritPoints = studentExtraTxs.filter(t => t.type === 'Merit').reduce((a, c) => a + (c.points || 0), 0);
  const demeritPoints = studentExtraTxs.filter(t => t.type === 'Demerit').reduce((a, c) => a + Math.abs(c.points || 0), 0);
  const netMeritScore = Math.max(0, (attendancePoints + extraMeritPoints) - demeritPoints);

  const verificationUrl = `https://mykktf.ums.edu.my/verify/transcript?id=${student.student_id || student.id}&ts=${Date.now()}`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verificationUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 bg-background border border-border rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        {/* TOP ACTION BAR (HIDDEN IN PRINT) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-muted/60 border-b border-border print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-bold text-xs text-foreground">Transkrip Sahsiah & Merit Rasmi Kolej</p>
              <p className="text-[10px] text-muted-foreground">Format Cetakan Rasmi A4 Universiti Malaysia Sabah (KKTF)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handlePrint}
              className="bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" /> Cetak / Muat Turun PDF
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PRINTABLE TRANSCRIPT DOCUMENT BODY */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans space-y-6 print:p-0 print:m-0">
          {/* UMS & KKTF OFFICIAL LETTERHEAD WITH LOGOS */}
          <div className="flex items-center justify-between pb-5 border-b-2 border-slate-900 gap-4">
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
                <h3 className="text-sm font-bold text-[#132644]">
                  KOLEJ KEDIAMAN TUN FUAD (KKTF)
                </h3>
                <p className="text-[10px] text-slate-600">
                  Jalan UMS, 88400 Kota Kinabalu, Sabah, Malaysia &bull; Tel: +60 88-320 000 &bull; E-mel: kktf@ums.edu.my
                </p>
              </div>
            </div>

            {/* LOGO KKTF (RIGHT) & REF NUMBER */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 border border-slate-300 text-slate-800">
                  KKTF/MERIT/2026/089
                </span>
                <p className="text-[9px] text-slate-500 mt-1">
                  Tarikh Cetakan: {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <img 
                src="/logos/kktf-logo.jpg" 
                alt="Logo Kolej Kediaman Tun Fuad" 
                className="h-16 w-16 object-contain rounded-2xl border border-slate-200 shadow-2xs"
              />
            </div>
          </div>

          {/* DOCUMENT TITLE */}
          <div className="text-center space-y-1">
            <h1 className="text-base font-black uppercase tracking-wider text-slate-950 font-serif">
              TRANSKRIP SAHSIAH & REKOD MERIT RESIDEN
            </h1>
            <p className="text-xs font-bold text-slate-700">
              SESI AKADEMIK 2025/2026 &bull; PENILAIAN PENEMPATAN KOLEJ 2026/2027
            </p>
          </div>

          {/* STUDENT BIODATA GRID */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Nama Mahasiswa:</p>
              <p className="font-extrabold text-sm text-slate-950">{student.full_name}</p>
              <p className="text-[11px] text-slate-600 font-mono">No. Matrik: <strong>{student.student_id}</strong> &bull; No. K/P: {student.ic_passport || '030415-12-XXXX'}</p>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Fakulti & Penempatan:</p>
              <p className="font-bold text-slate-900">{student.faculty || 'Fakulti Kejuruteraan (FKJ)'}</p>
              <p className="text-[11px] text-slate-600">
                Blok & Bilik: <strong>{student.block_name || 'Block G'} - {student.room_number || 'G-B.05'}</strong> ({student.gender === 'Female' ? 'Siswi' : 'Siswa'})
              </p>
            </div>
          </div>

          {/* MERIT SUMMARY CARDS */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Aktiviti Kolej</p>
              <p className="text-lg font-black text-indigo-700 font-mono mt-0.5">+{attendancePoints}</p>
              <p className="text-[9px] text-slate-500">{studentAttendance.length} Program Dihadiri</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Kepimpinan & AJK</p>
              <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">+{extraMeritPoints}</p>
              <p className="text-[9px] text-slate-500">{studentExtraTxs.filter(t => t.type === 'Merit').length} Lantikan Sah</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Dimerit Disiplin</p>
              <p className="text-lg font-black text-rose-700 font-mono mt-0.5">-{demeritPoints}</p>
              <p className="text-[9px] text-slate-500">Mata Dipotong</p>
            </div>

            <div className="p-3 bg-amber-50/60 rounded-xl border-2 border-amber-400">
              <p className="text-[10px] font-bold text-amber-800 uppercase">Skor Bersih Sahsiah</p>
              <p className="text-xl font-black text-amber-900 font-mono mt-0.5">{netMeritScore}</p>
              <p className="text-[9px] font-bold text-amber-800">
                {netMeritScore >= 80 ? '🥇 TIER EMAS' : netMeritScore >= 50 ? '🥈 TIER PERAK' : '🥉 TIER GANGSA'}
              </p>
            </div>
          </div>

          {/* ITEMISED PARTICIPATION TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" /> Perincian Penglibatan Aktiviti & Kepimpinan Mahasiswa
            </h4>

            <table className="w-full text-[11px] border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 text-left">
                  <th className="p-2 border border-slate-200 font-bold">Bil</th>
                  <th className="p-2 border border-slate-200 font-bold">Nama Program / Inisiatif Kolej</th>
                  <th className="p-2 border border-slate-200 font-bold">Peranan / Jawatan Disandang</th>
                  <th className="p-2 border border-slate-200 font-bold">Status Pengesahan</th>
                  <th className="p-2 border border-slate-200 font-bold text-center">Mata Merit</th>
                </tr>
              </thead>
              <tbody>
                {studentAttendance.length === 0 && studentExtraTxs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                      Tiada rekod penglibatan aktiviti atau pelantikan AJK direkodkan bagi sesi ini.
                    </td>
                  </tr>
                ) : (
                  <>
                    {studentAttendance.map((att, idx) => (
                      <tr key={`att-${idx}`} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-2 border border-slate-200 font-mono text-center">{idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-900">{att.event_name || 'Program Kolej Kediaman Tun Fuad'}</td>
                        <td className="p-2 border border-slate-200 text-slate-600">Peserta / Residen Aktif</td>
                        <td className="p-2 border border-slate-200 text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Imbasan QR Sah
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-indigo-700">+10</td>
                      </tr>
                    ))}

                    {studentExtraTxs.filter(t => t.type === 'Merit').map((tx, idx) => (
                      <tr key={`tx-${idx}`} className="border-b border-slate-200 bg-amber-50/20">
                        <td className="p-2 border border-slate-200 font-mono text-center">{studentAttendance.length + idx + 1}</td>
                        <td className="p-2 border border-slate-200 font-semibold text-slate-900">{tx.title}</td>
                        <td className="p-2 border border-slate-200 text-indigo-800 font-bold">AJK Pelaksana / Urusetia</td>
                        <td className="p-2 border border-slate-200 text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Perakuan Felo & Pengetua
                        </td>
                        <td className="p-2 border border-slate-200 text-center font-mono font-bold text-emerald-700">+{tx.points}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* OFFICIAL ENDORSEMENT & QR VERIFICATION FOOTER */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 items-end">
            {/* QR VERIFICATION */}
            <div className="flex items-center gap-3">
              <img 
                src={qrImageSrc} 
                alt="QR Pengesahan Transkrip" 
                className="w-20 h-20 border border-slate-300 rounded-lg p-1 bg-white"
              />
              <div className="text-[9px] text-slate-600 leading-tight">
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Pengesahan Digital
                </p>
                <p className="mt-0.5">Imbas kod QR ini untuk menyemak ketulenan rekod merit di portal MyKKTF UMS.</p>
              </div>
            </div>

            {/* COLLEGE SEAL & MOTTO */}
            <div className="text-center space-y-1">
              <div className="inline-block px-3 py-1 rounded-full border border-slate-300 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                Cop Rasmi KKTF UMS
              </div>
              <p className="text-[9px] text-slate-500 italic">"Bertekad Cemerlang, Bersama Memimpin"</p>
            </div>

            {/* PRINCIPAL SIGNATURE */}
            <div className="text-right space-y-1">
              <p className="font-serif italic text-sm font-bold text-slate-900">Prof. Madya Ts. Dr. Nur Fadilah binti Darmansah</p>
              <div className="w-48 h-0.5 bg-slate-900 ml-auto" />
              <p className="font-black text-[10px] text-slate-950 leading-tight">
                PROFESOR MADYA TS. DR. NUR FADILAH BINTI DARMANSAH
              </p>
              <p className="text-[9px] font-bold text-slate-800">
                Pengetua Kolej Kediaman Tun Fuad
              </p>
              <p className="text-[8px] text-slate-600">
                Profesor Madya (DS14), Fakulti Kejuruteraan &bull; Universiti Malaysia Sabah
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
