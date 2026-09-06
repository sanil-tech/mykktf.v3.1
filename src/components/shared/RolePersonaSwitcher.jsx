import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Crown, 
  ChevronDown, 
  CheckCircle2, 
  Building2, 
  ArrowRight, 
  Sparkles,
  AlertTriangle,
  FileCheck2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";

export default function RolePersonaSwitcher({ user }) {
  const [open, setOpen] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [officialAssignments, setOfficialAssignments] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');

  // Hanya akaun Sanil / Super Admin yang mempunyai ciri penukaran dwifungsi (Super Admin <-> Felo Blok)
  const isSanil = 
    user?.email?.toLowerCase() === 'sanil@ums.edu.my' || 
    user?.real_email?.toLowerCase() === 'sanil@ums.edu.my';

  const currentPersona = user?.is_persona_switched ? user?.role : (user?.real_role || user?.role || 'super_admin');
  const activeWardenBlock = user?.active_warden_block || localStorage.getItem('mykktf_felo_assigned_block') || '';

  // Muat turun rekod lantikan rasmi dari Pengetua (WardenBlock)
  const loadOfficialAssignments = async () => {
    if (!isSanil) return;
    setLoadingAssignments(true);
    try {
      const allWb = await base44.entities.WardenBlock.list().catch(() => []);
      const userEmail = (user?.email || user?.real_email || '').toLowerCase();
      const userId = user?.id;

      const myWb = (allWb || []).filter(w => {
        const matchesId = userId && w.warden_user_id === userId;
        const matchesEmail = w.warden_email && userEmail && w.warden_email.toLowerCase() === userEmail;
        const matchesName = user?.full_name && w.warden_name && (
          user.full_name.toLowerCase().includes(w.warden_name.toLowerCase()) ||
          w.warden_name.toLowerCase().includes(user.full_name.toLowerCase())
        );
        return matchesId || matchesEmail || matchesName;
      });

      setOfficialAssignments(myWb);

      if (myWb.length > 0) {
        const assignedNames = myWb.map(w => w.block_name).filter(Boolean);
        const saved = localStorage.getItem('mykktf_felo_assigned_block');
        if (saved && assignedNames.includes(saved)) {
          setSelectedBlock(saved);
        } else {
          setSelectedBlock(assignedNames[0]);
          localStorage.setItem('mykktf_felo_assigned_block', assignedNames[0]);
        }
      } else {
        setSelectedBlock('');
      }
    } catch (err) {
      console.warn('Gagal memuat turun data WardenBlock rasmi:', err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadOfficialAssignments();
  }, [user?.id, user?.email]);

  if (!isSanil) return null;

  const hasOfficialAppointment = officialAssignments.length > 0;
  const officialBlockNames = officialAssignments.map(w => w.block_name).filter(Boolean);
  const appointmentTerm = officialAssignments[0]?.appointment_term || 'Sesi 2025/2026';

  const handleSwitchToWarden = () => {
    if (!hasOfficialAppointment || !selectedBlock) {
      toast.error('Tiada Lantikan Blok Rasmi', {
        description: 'Pengetua perlu menugaskan blok jagaan anda terlebih dahulu di modul Agihan Blok.'
      });
      return;
    }

    localStorage.setItem('mykktf_active_persona', 'warden');
    localStorage.setItem('mykktf_felo_assigned_block', selectedBlock);
    // Padam kekunci bypass lama jika ada
    localStorage.removeItem('mykktf_persona_block');

    toast.success(`Beralih ke Mod Felo (${selectedBlock})!`, {
      description: `Lantikan rasmi Pengetua disahkan (${appointmentTerm}). Skop rondaan dan semakan dikhususkan untuk ${selectedBlock}.`
    });
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 350);
  };

  const handleSwitchToSuperAdmin = () => {
    localStorage.setItem('mykktf_active_persona', 'super_admin');
    toast.success('Beralih ke Mod Pentadbir (Super Admin)!', {
      description: 'Akses penuh pentadbiran keseluruhan kolej (Semua Blok A-N) diaktifkan.'
    });
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 350);
  };

  return (
    <>
      {/* TRIGGER BADGE / BUTTON IN TOPBAR */}
      {currentPersona === 'warden' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOfficialAssignments();
            setOpen(true);
          }}
          className="h-8 text-xs font-bold gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 rounded-xl shadow-xs animate-in fade-in"
          title="Tukar mod tugas aktif (Felo vs Super Admin)"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Mod Felo: <strong>{activeWardenBlock || selectedBlock || 'Blok Jagaan'}</strong></span>
          <ChevronDown className="w-3 h-3 text-emerald-600/70" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOfficialAssignments();
            setOpen(true);
          }}
          className="h-8 text-xs font-bold gap-1.5 bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 dark:text-slate-200 border-slate-400/40 rounded-xl shadow-xs"
          title="Tukar mod tugas aktif (Felo vs Super Admin)"
        >
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Mod: <strong>Super Admin</strong></span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      )}

      {/* PERSONA SWITCHER DIALOG MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-6 bg-card border border-border rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-heading font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" /> Pengasingan Kuasa & Peranan Bertugas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Akaun anda mempunyai autoriti dwifungsi: <strong>Super Admin Kolej</strong> dan <strong>Felo Blok Lantikan Pengetua</strong>. Tiada pintasan blok (bypass) dibenarkan – lantikan felo mematuhi penugasan rasmi Pengetua.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-3">
            {/* OPTION 1: SUPER ADMIN MODE */}
            <div 
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                currentPersona !== 'warden'
                  ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                  : 'border-border bg-muted/20 hover:border-slate-300'
              }`}
              onClick={handleSwitchToSuperAdmin}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">Mod Pentadbir (Super Admin)</h4>
                      {currentPersona !== 'warden' && (
                        <Badge className="bg-indigo-600 text-white text-[9px] px-2 py-0.5">Sedang Aktif</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Akses kuasa penuh pentadbiran keseluruhan kolej: Audit log, agihan blok felo, penetapan sistem, dan pengurusan merentas semua blok A hingga N.
                    </p>
                  </div>
                </div>
                {currentPersona !== 'warden' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
              </div>
            </div>

            {/* OPTION 2: WARDEN / FELO MODE (STRICT PENGETUA APPOINTMENT) */}
            <div 
              className={`p-4 rounded-2xl border-2 transition-all ${
                currentPersona === 'warden'
                  ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                  : 'border-border bg-muted/20 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">Mod Operasi Felo Blok</h4>
                      {currentPersona === 'warden' && (
                        <Badge className="bg-emerald-600 text-white text-[9px] px-2 py-0.5">Sedang Aktif</Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Tugas rasmi felo di tapak: Rondaan blok, kelulusan e-leave blok, dan pemeriksaan bilik. Mengikut tata kelola kolej, peranan ini tertakluk kepada <strong>blok jagaan yang ditetapkan oleh Pengetua</strong>.
                    </p>

                    {/* STATUS LANTIKAN PENGETUA */}
                    {loadingAssignments ? (
                      <div className="text-xs text-muted-foreground py-1">Menyemak rekod lantikan Pengetua...</div>
                    ) : hasOfficialAppointment ? (
                      <div className="pt-2 space-y-2">
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                          <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold">Lantikan Rasmi Pengetua Disahkan</p>
                            <p className="text-[11px] text-muted-foreground">
                              Sesi: {appointmentTerm} • Blok Sah: <strong className="text-foreground">{officialBlockNames.join(', ')}</strong>
                            </p>
                          </div>
                        </div>

                        {/* Jika lebih daripada 1 blok ditugaskan oleh Pengetua, benarkan pilihan antara blok lantikan sahaja */}
                        {officialBlockNames.length > 1 ? (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs font-semibold text-foreground shrink-0 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Pilih Blok Bertugas:
                            </span>
                            <Select value={selectedBlock} onValueChange={setSelectedBlock}>
                              <SelectTrigger className="h-8 text-xs w-40 bg-background">
                                <SelectValue placeholder="Pilih Blok" />
                              </SelectTrigger>
                              <SelectContent>
                                {officialBlockNames.map(block => (
                                  <SelectItem key={block} value={block}>{block}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Blok Ditugaskan: <strong className="text-foreground">{officialBlockNames[0]}</strong></span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* AMARAN: TIADA LANTIKAN PENGETUA LAGI */
                      <div className="pt-2 space-y-2">
                        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold text-amber-800 dark:text-amber-300">Tiada Rekod Agihan Blok oleh Pengetua</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Mengikut tatacara sebenar, Pengetua perlu menetapkan blok jagaan anda melalui modul <strong>Agihan Blok (Block Assignment)</strong> terlebih dahulu. Tiada jalan pintas (bypass) dibenarkan.
                            </p>
                            <div className="pt-1">
                              <Link 
                                to="/block-assignment" 
                                onClick={() => setOpen(false)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Buka Modul Agihan Blok (Pengetua / Admin) <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {currentPersona === 'warden' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>

              {/* ACTIVATE WARDEN BUTTON */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {hasOfficialAppointment ? '✓ Sah disahkan Pengetua' : '⚠️ Menunggu penugasan Pengetua'}
                </span>
                <Button 
                  size="sm"
                  disabled={!hasOfficialAppointment || !selectedBlock}
                  onClick={handleSwitchToWarden}
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 disabled:opacity-50"
                >
                  <Shield className="w-3.5 h-3.5" /> 
                  {hasOfficialAppointment ? `Aktifkan Mod Felo (${selectedBlock})` : 'Memerlukan Lantikan Pengetua'}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Tatacara Pentadbiran & Lantikan Kolej MyKKTF</span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
