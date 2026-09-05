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
  RefreshCw,
  Wrench,
  Users
} from "lucide-react";
import { toast } from "sonner";

const COLLEGE_BLOCKS = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Block G',
  'Block H'
];

export default function RolePersonaSwitcher({ user }) {
  const [open, setOpen] = useState(false);
  const [targetBlock, setTargetBlock] = useState('Block B');

  // Only sanil@ums.edu.my is allowed to have access to dual mode (RolePersonaSwitcher)
  const isSanil = 
    user?.email?.toLowerCase() === 'sanil@ums.edu.my' || 
    user?.real_email?.toLowerCase() === 'sanil@ums.edu.my';

  const currentPersona = user?.is_persona_switched ? user?.role : (user?.real_role || user?.role || 'super_admin');
  const currentBlock = user?.active_warden_block || localStorage.getItem('mykktf_persona_block') || 'Block B';

  useEffect(() => {
    if (user?.active_warden_block) {
      setTargetBlock(user.active_warden_block);
    } else {
      const savedBlock = localStorage.getItem('mykktf_persona_block');
      if (savedBlock) setTargetBlock(savedBlock);
    }
  }, [user]);

  if (!isSanil) return null;

  const handleSwitchToWarden = () => {
    localStorage.setItem('mykktf_active_persona', 'warden');
    localStorage.setItem('mykktf_persona_block', targetBlock);
    toast.success(`Beralih ke Mod Felo (${targetBlock})!`, {
      description: 'Skop dashboard, aduan kerosakan, dan dokumen laporan kini dikhususkan untuk blok anda.'
    });
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleSwitchToSuperAdmin = () => {
    const isBaseWarden = user?.real_role === 'warden' || (!user?.real_role && user?.role === 'warden');
    if (isBaseWarden) {
      localStorage.setItem('mykktf_active_persona', 'super_admin');
    } else {
      localStorage.removeItem('mykktf_active_persona');
    }
    toast.success('Beralih ke Mod Pentadbir (Super Admin)!', {
      description: 'Akses penuh pentadbiran keseluruhan kolej (Semua Blok A-H) telah diaktifkan.'
    });
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <>
      {/* TRIGGER BADGE / BUTTON IN TOPBAR */}
      {currentPersona === 'warden' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 text-xs font-bold gap-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 rounded-xl shadow-xs animate-in fade-in"
          title="Tukar mod tugas aktif (Felo vs Super Admin)"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Mod Felo: <strong>{currentBlock}</strong></span>
          <ChevronDown className="w-3 h-3 text-emerald-600/70" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
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
              <Sparkles className="w-5 h-5 text-indigo-600" /> Pengasingan Tugas & Peranan Aktif
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Akaun anda mempunyai keistimewaan dwifungsi sebagai Pentadbir Sistem dan Felo Blok. Pilih mod untuk menyelaraskan skop kerja anda.
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
                      Skop penuh kolej: Semua blok (A hingga H), audit log, konfigurasi sistem, dan data makro pengurusan universiti.
                    </p>
                  </div>
                </div>
                {currentPersona !== 'warden' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                )}
              </div>
            </div>

            {/* OPTION 2: WARDEN / FELO MODE */}
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
                      <h4 className="font-bold text-sm text-foreground">Mod Operasi Felo (Rondaan Tapak)</h4>
                      {currentPersona === 'warden' && (
                        <Badge className="bg-emerald-600 text-white text-[9px] px-2 py-0.5">Sedang Aktif</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Skop kerja ditapis khas: Hanya laporan kerosakan, residen, dan semakan bilik bagi blok jagaan anda. Dokumen A4 dan cop masa foto dilesenkan atas nama <strong>Felo Pemeriksa</strong>.
                    </p>

                    {/* SELECT SPECIFIC BLOCK FOR FELO */}
                    <div className="pt-2 flex items-center gap-3">
                      <span className="text-xs font-semibold text-foreground shrink-0 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Blok Jagaan:
                      </span>
                      <Select value={targetBlock} onValueChange={setTargetBlock}>
                        <SelectTrigger className="h-8 text-xs w-36 bg-background">
                          <SelectValue placeholder="Pilih Blok" />
                        </SelectTrigger>
                        <SelectContent>
                          {COLLEGE_BLOCKS.map(block => (
                            <SelectItem key={block} value={block}>{block}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {currentPersona === 'warden' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </div>

              {/* ACTIVATE WARDEN BUTTON IF NOT ALREADY ACTIVE OR CHANGED BLOCK */}
              <div className="mt-3 pt-3 border-t border-border flex justify-end">
                <Button 
                  size="sm"
                  onClick={handleSwitchToWarden}
                  className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> 
                  {currentPersona === 'warden' && currentBlock === targetBlock 
                    ? 'Kemaskini Blok Felo' 
                    : `Aktifkan Mod Felo (${targetBlock})`}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Sistem Pengasingan Kuasa MyKKTF v3.1</span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 text-xs">
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
