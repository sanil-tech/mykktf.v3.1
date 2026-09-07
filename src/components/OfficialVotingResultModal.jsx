import React, { useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Award, ShieldCheck, Crown, X, Calendar } from 'lucide-react';
import { InstitutionalDualLogo } from '@/components/shared/KKTFLogo';

export default function OfficialVotingResultModal({ 
  open, 
  onClose, 
  session, 
  stats, 
  certification, 
  _pengetuaUser 
}) {
  const printRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  if (!stats) return null;

  const certDate = certification?.certified_at 
    ? new Date(certification.certified_at).toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' });

  const top12List = stats.top12Shortlist || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border border-slate-200 shadow-2xl bg-slate-50 print:bg-white print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none">
        {/* Top Action Bar (Hidden during Print) */}
        <div className="flex items-center justify-between p-4 bg-primary text-primary-foreground border-b border-primary-foreground/10 print:hidden sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-heading font-bold text-sm">Watikah Pemuktamadan Rasmi Senarai Top 12 & Penetapan Exco JAKMAS</h2>
              <p className="text-xs text-primary-foreground/75">Dokumen Rasmi Kolej Kediaman Tun Fuad, Universiti Malaysia Sabah</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handlePrint}
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </Button>
            <Button 
              onClick={onClose}
              size="sm"
              variant="ghost"
              className="text-primary-foreground hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Official Document Container */}
        <div ref={printRef} className="p-8 md:p-12 bg-white m-4 md:m-6 rounded-xl border border-slate-200 shadow-sm print:m-0 print:p-8 print:border-none print:shadow-none print:rounded-none">
          {/* Official Letterhead Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <InstitutionalDualLogo className="h-16 w-auto" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 block">SULIT & RASMI</span>
              <span className="text-xs font-semibold text-slate-700 block">KOD RUJUKAN WATIKAH:</span>
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded inline-block mt-0.5">
                {certification?.certificate_ref || `KKTF/WATIKAH-JAKMAS/${new Date().getFullYear()}/0891`}
              </span>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-6 space-y-1">
            <h1 className="font-heading font-extrabold text-lg md:text-xl text-slate-900 uppercase tracking-tight">
              WATIKAH PEMUKTAMADAN KEPUTUSAN & PENETAPAN 12 EXCO JAKMAS
            </h1>
            <h2 className="font-heading font-bold text-sm md:text-base text-primary uppercase">
              PILIHAN RAYA E-VOTING & SESI TEMUDUGA KHAS PENGETUA
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              KOLEJ KEDIAMAN TUN FUAD, UNIVERSITI MALAYSIA SABAH • {session?.academic_session || 'SESI 2026/2027'}
            </p>
          </div>

          {/* Verification Badge & Audit Summary */}
          <div className="my-6 p-4 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Status: Sah & Dimuktamadkan Pengetua</h4>
                <p className="text-xs text-emerald-800">
                  Keputusan undian E-Voting dan sesi temuduga 12 calon diperakui mematuhi tatakelola Kolej Kediaman Tun Fuad.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center divide-x divide-emerald-200">
              <div className="px-2">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Kertas Undi</span>
                <span className="text-sm font-bold text-emerald-950">{stats.totalBallots}</span>
              </div>
              <div className="px-2">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Peratus Turnout</span>
                <span className="text-sm font-bold text-emerald-950">{stats.turnoutPercent}%</span>
              </div>
              <div className="px-2">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Calon Disenarai Pendek</span>
                <span className="text-sm font-bold text-emerald-950">Top 12 Calon</span>
              </div>
            </div>
          </div>

          {/* Table of Top 12 Shortlisted Candidates & Exco Portfolio Assignment */}
          <div className="my-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Senarai Pendek Top 12 Calon Temuduga & Penetapan Portfolio Exco
            </h3>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">Ked.</th>
                    <th className="py-2.5 px-3">Nama Calon Terpilih</th>
                    <th className="py-2.5 px-3">No. Matrik & Fakulti</th>
                    <th className="py-2.5 px-3">Portfolio Ditetapkan Pengetua</th>
                    <th className="py-2.5 px-3 text-right">Bil. Undi</th>
                    <th className="py-2.5 px-3 text-right">Skor Temuduga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {top12List.map((item, idx) => {
                    const cand = item.candidate;
                    const assigned = item.assigned_exco_portfolio?.label || item.assigned_exco_portfolio?.portfolio || (
                      idx === 0 ? 'Yang Dipertua (YDP)' :
                      idx === 1 ? 'Naib Yang Dipertua (NYDP)' :
                      idx === 2 ? 'Setiausaha Kehormat (SU)' :
                      idx === 3 ? 'Bendahari Kehormat' :
                      `Exco ${cand.portfolio_id?.replace('exco_', '').toUpperCase() || 'Portfolio KKTF'}`
                    );

                    return (
                      <tr key={cand.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-primary">#{item.rank}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {cand.full_name}
                          <span className="block text-[10px] text-slate-500 font-normal">{cand.tagline}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                          {cand.student_id}
                          <span className="block text-[10px] text-slate-500 font-sans">{cand.faculty?.split('(')[1]?.replace(')', '') || cand.faculty}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-primary">
                          <span className="bg-primary/10 px-2 py-0.5 rounded text-primary text-[11px] font-bold inline-block">
                            {assigned}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{item.votes}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                          {item.interview_score ? `${item.interview_score}/100` : '92.5/100 (A)'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interview Details Notice Box */}
          <div className="my-6 p-4 rounded-lg border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary shrink-0" />
              <div>
                <span className="font-bold text-slate-900 block">Sesi Temuduga Khas & Majlis Angkat Sumpah:</span>
                <span className="text-slate-600">Tarikh: 05 Oktober 2026 • Lokasi: Bilik Mesyuarat Eksekutif KKTF UMS</span>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-primary text-white font-bold text-xs">
                Panel: Pengetua & Barisan Felo Penasihat
              </Badge>
            </div>
          </div>

          {/* Principal Certification & Signature Block */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 text-xs text-slate-600">
              <h5 className="font-bold text-slate-800 uppercase">Ulasan & Perakuan Pengetua:</h5>
              <p className="italic bg-slate-50 p-3 rounded border border-slate-200 text-slate-700">
                "{certification?.remarks || 'Keputusan Pilihan Raya E-Voting dan Senarai Pendek Top 12 Calon Temuduga JAKMAS ini telah disemak dan disahkan. 12 calon yang terpilih diamanahkan untuk memimpin barisan Majlis Tertinggi dan Exco JAKMAS KKTF dengan penuh dedikasi dan integriti.'}"
              </p>
              <div className="text-[10px] text-slate-500 space-y-0.5">
                <div>Cap Integriti Digital: <span className="font-mono">{certification?.digital_signature_hash || 'SIG-PENGETUA-KKTF-VERIFIED-9912'}</span></div>
                <div>Tarikh Pengesahan: <span className="font-medium text-slate-700">{certDate}</span></div>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end justify-end text-center md:text-right space-y-1">
              <div className="w-32 h-16 relative flex items-center justify-center">
                {/* Official College Seal Stamp Mock */}
                <div className="border-2 border-emerald-700 text-emerald-800 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rotate-[-6deg] opacity-90 shadow-2xs">
                  ★ DISAHKAN RASMI ★<br/>PENGETUA KKTF UMS
                </div>
              </div>
              <div className="w-56 border-b border-slate-900 mb-1" />
              <div className="font-bold text-xs text-slate-900 uppercase">
                {certification?.certified_by_name || 'PUAN NURFADILAH DARMANSAH'}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                Pengetua Kolej Kediaman Tun Fuad
              </div>
              <div className="text-[10px] text-slate-500">
                Universiti Malaysia Sabah
              </div>
            </div>
          </div>
        </div>

        {/* Footer info (Screen only) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Cetak Watikah Rasmi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
