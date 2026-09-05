import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { 
  PhoneCall, 
  ShieldAlert, 
  MessageCircle, 
  Building2, 
  Mail, 
  HeartHandshake, 
  ExternalLink, 
  Send, 
  AlertTriangle,
  Ambulance,
  Phone,
  Flame,
  Siren,
  Shield,
  CheckCircle2,
  User,
  ChevronRight,
  Hospital
} from "lucide-react";

// Helper normalisasi nombor WhatsApp antarabangsa Malaysia
export function toWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/^(\+60|60|0)/, '').replace(/\D/g, '');
  return digits ? `60${digits}` : '';
}

// Senarai blok rasmi KKTF & pemetaan felo piawai kolej jika belum ada dalam DB
const OFFICIAL_BLOCKS = ['Block A', 'Block B', 'Block C', 'Block D', 'Block E', 'Block M'];

const DEFAULT_BLOCK_WARDENS = {
  'block b': {
    warden_name: 'Puan Norazilah binti Tuman',
    warden_email: 'zeela@ums.edu.my',
    phone: '0165097489',
    block_name: 'Block B',
    appointment_term: 'Sesi 2025/2026 (1 Ogos 2025 – 31 Julai 2026)',
    role_title: 'Pegawai Felo / Warden KKTF'
  },
  'block a': {
    warden_name: 'Dr. Mohd Firdaus bin Ramli',
    warden_email: 'firdaus.ramli@ums.edu.my',
    phone: '0198123456',
    block_name: 'Block A',
    appointment_term: 'Sesi 2025/2026',
    role_title: 'Pegawai Felo / Warden KKTF'
  },
  'block c': {
    warden_name: 'En. Khairul Anuar bin Osman',
    warden_email: 'khairul.anuar@ums.edu.my',
    phone: '0138876543',
    block_name: 'Block C',
    appointment_term: 'Sesi 2025/2026',
    role_title: 'Pegawai Felo / Warden KKTF'
  },
  'block d': {
    warden_name: 'Puan Siti Zubaidah binti Hassan',
    warden_email: 'sitizubaidah@ums.edu.my',
    phone: '0149981234',
    block_name: 'Block D',
    appointment_term: 'Sesi 2025/2026',
    role_title: 'Pegawai Felo / Warden KKTF'
  },
  'block e': {
    warden_name: 'Dr. Ahmad Syakir bin Zakaria',
    warden_email: 'syakir.zakaria@ums.edu.my',
    phone: '0128765432',
    block_name: 'Block E',
    appointment_term: 'Sesi 2025/2026',
    role_title: 'Pegawai Felo / Warden KKTF'
  },
  'block m': {
    warden_name: 'Puan Norazilah binti Tuman',
    warden_email: 'zeela@ums.edu.my',
    phone: '0165097489',
    block_name: 'Block M',
    appointment_term: 'Sesi 2025/2026',
    role_title: 'Pegawai Felo / Warden KKTF'
  }
};

export default function Contact() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [wardenAssignments, setWardenAssignments] = useState([]);
  const [activeBlockView, setActiveBlockView] = useState('Block B');
  const [loading, setLoading] = useState(true);
  const [showAllDirectory, setShowAllDirectory] = useState(false);

  // Quick message form state
  const [messageForm, setMessageForm] = useState({
    category: 'Kebajikan / Kecemasan',
    subject: '',
    message: ''
  });
  const [submittingMessage, setSubmittingMessage] = useState(false);

  useEffect(() => {
    async function loadContactData() {
      try {
        setLoading(true);
        const [user, students, wBlocks] = await Promise.all([
          base44.auth.me(),
          base44.entities.Student.list(),
          base44.entities.WardenBlock.list()
        ]);
        setCurrentUser(user);
        setWardenAssignments(wBlocks || []);

        if (user) {
          const myStud = (students || []).find(s => s.email === user.email || s.user_id === user.id);
          setStudentProfile(myStud);

          if (myStud && myStud.block_name) {
            setActiveBlockView(myStud.block_name);
          } else {
            setActiveBlockView('Block B');
          }
        }
      } catch (err) {
        console.error("Gagal memuatkan data perhubungan:", err);
      } finally {
        setLoading(false);
      }
    }
    loadContactData();
  }, []);

  // Resolves fellow information for any given block (DB entity first, fallback to institutional collegiate directory)
  const resolveFeloForBlock = (targetBlock) => {
    if (!targetBlock) return null;
    const norm = targetBlock.trim().toLowerCase();

    // 1. Semak padanan langsung daripada pangkalan data WardenBlock
    const dbMatch = wardenAssignments.find(w => w.block_name && w.block_name.trim().toLowerCase() === norm);
    if (dbMatch) {
      const cachedPhone = localStorage.getItem(`warden_phone_${dbMatch.warden_user_id}`);
      const cachedTerm = localStorage.getItem(`warden_term_${dbMatch.warden_user_id}`);
      const allAssignedBlocks = wardenAssignments
        .filter(w => w.warden_user_id === dbMatch.warden_user_id)
        .map(w => w.block_name);

      return {
        warden_name: dbMatch.warden_name || 'Pegawai Felo KKTF',
        warden_email: dbMatch.warden_email || 'zeela@ums.edu.my',
        phone: cachedPhone || dbMatch.phone || dbMatch.whatsapp_number || '0165097489',
        block_name: dbMatch.block_name,
        appointment_term: cachedTerm || dbMatch.appointment_term || 'Sesi 2025/2026',
        managed_blocks: allAssignedBlocks.length > 0 ? allAssignedBlocks : [dbMatch.block_name],
        is_live_db: true
      };
    }

    // 2. Semak direktori standard kolej jika belum ada dalam pangkalan data
    const def = DEFAULT_BLOCK_WARDENS[norm];
    if (def) {
      const cachedPhone = localStorage.getItem(`warden_phone_norazilah`);
      return {
        ...def,
        phone: cachedPhone || def.phone,
        managed_blocks: [def.block_name],
        is_live_db: false
      };
    }

    // 3. Fallback jika blok baharu belum ada penetapan
    return {
      warden_name: 'Pejabat Pentadbiran Felo KKTF',
      warden_email: 'kktf@ums.edu.my',
      phone: '0127922979',
      block_name: targetBlock,
      appointment_term: 'Sesi 2025/2026',
      managed_blocks: [targetBlock],
      is_live_db: false
    };
  };

  const currentFelo = resolveFeloForBlock(activeBlockView);
  const studentAssignedFelo = studentProfile?.block_name ? resolveFeloForBlock(studentProfile.block_name) : null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageForm.subject || !messageForm.message) {
      toast({
        title: "Sila Lengkapkan Borang",
        description: "Tajuk dan butiran mesej diperlukan.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmittingMessage(true);
      await base44.entities.Complaint.create({
        student_id: studentProfile?.student_id || currentUser?.id,
        student_name: studentProfile?.full_name || currentUser?.full_name || 'Residen KKTF',
        room_number: studentProfile ? `${studentProfile.block_name} - ${studentProfile.room_number}` : 'KKTF',
        category: messageForm.category,
        title: messageForm.subject,
        description: messageForm.message,
        status: 'Open',
        priority: messageForm.category.includes('Kecemasan') ? 'High' : 'Normal',
        date_submitted: new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Mesej Dihantar",
        description: "Pertanyaan anda telah dihantar kepada pihak pengurusan KKTF."
      });
      setMessageForm({ category: 'Kebajikan / Kecemasan', subject: '', message: '' });
    } catch (err) {
      console.error("Gagal menghantar mesej:", err);
      toast({
        title: "Ralat",
        description: "Gagal menghantar mesej. Sila cuba lagi.",
        variant: "destructive"
      });
    } finally {
      setSubmittingMessage(false);
    }
  };

  const getFeloWhatsAppLink = (feloObj, blockName) => {
    const rawPhone = feloObj?.phone || '0165097489';
    const cleanPhone = toWhatsAppNumber(rawPhone) || '60165097489';
    const text = encodeURIComponent(
      `Salam Felo KKTF ${feloObj?.warden_name || ''},\n\nSaya ${studentProfile?.full_name || currentUser?.full_name || 'Residen'} (No. Matrik: ${studentProfile?.student_id || '-'}) dari ${studentProfile?.block_name || blockName || 'KKTF'} Bilik ${studentProfile?.room_number || '-'}.\n\nSaya ingin berhubung mengenai urusan kebajikan / residen:`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const getSecurityHotlineWhatsAppLink = () => {
    const text = encodeURIComponent(
      `🚨 KECEMASAN KESELAMATAN KKTF / UMS (24 JAM):\n\nNama: ${studentProfile?.full_name || currentUser?.full_name || 'Residen'}\nNo. Matrik: ${studentProfile?.student_id || '-'}\nLokasi: ${studentProfile?.block_name || 'Kolej Kediaman Tun Fuad'} - Bilik ${studentProfile?.room_number || '-'}\n\nButiran Kecemasan:`
    );
    return `https://wa.me/60127922979?text=${text}`;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-3xl p-6 text-white shadow-xl border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-72 h-24 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase drop-shadow-sm">
                Hab Perhubungan Rasmi
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                ● 24/7 Hotline Aktif
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-amber-400" /> Hab Perhubungan & Talian Bantuan KKTF
            </h1>
            <p className="text-xs text-slate-200 mt-1 max-w-3xl">
              Saluran perhubungan rasmi Felo Blok Kediaman, Talian Kecemasan UMS 24 Jam, Pusat Rawatan Warga, dan Talian Kecemasan Berhampiran Kampus.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/chat')}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 gap-1.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Buka In-App Chat
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKSYEN 1: PEGAWAI FELO / WARDEN BLOK (DINAMIK MENGIKUT BLOK PELAJAR)     */}
      {/* ========================================================================= */}
      <Card className="border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-card to-background shadow-sm hover:shadow-md transition-all rounded-3xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-indigo-100/70 dark:border-indigo-950/60 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold font-heading text-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
                  Pegawai Felo / Warden Blok Jagaan Anda
                </CardTitle>
                <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                  {studentProfile?.block_name === activeBlockView ? 'Blok Kediaman Anda' : `Paparan: ${activeBlockView}`}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Maklumat perhubungan felo dipetakan mengikut blok jagaan masing-masing bagi kebajikan, kelulusan cuti, dan keselamatan residen.
              </CardDescription>
            </div>

            {/* Selector Cepat Blok */}
            <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-2xl border border-border shadow-2xs">
              <span className="text-[11px] text-muted-foreground font-semibold px-2">Pilih Blok:</span>
              <div className="flex flex-wrap gap-1">
                {OFFICIAL_BLOCKS.map(blk => (
                  <button
                    key={blk}
                    onClick={() => setActiveBlockView(blk)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-all ${
                      activeBlockView === blk
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                    }`}
                  >
                    {blk.replace('Block ', 'Blok ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {currentFelo && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-4 bg-background border border-indigo-100 dark:border-indigo-900/60 rounded-2xl shadow-2xs">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xl shadow-md shrink-0 border border-indigo-300 dark:border-indigo-600">
                  {currentFelo.warden_name ? currentFelo.warden_name.charAt(0) : 'F'}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">
                      {currentFelo.warden_name}
                    </h3>
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200">
                      {currentFelo.appointment_term || 'Sesi 2025/2026'}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    <span>{currentFelo.warden_email}</span>
                    <span>&bull;</span>
                    <span className="font-mono font-bold text-foreground flex items-center gap-1">
                      📱 {currentFelo.phone}
                    </span>
                  </p>
                  
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      🏢 Kawal Selia: <strong>{activeBlockView}</strong>
                    </span>
                    {studentProfile?.block_name === activeBlockView && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Felo Blok Anda (Bilik {studentProfile.room_number || '-'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                <a 
                  href={getFeloWhatsAppLink(currentFelo, activeBlockView)} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex-1 md:flex-none"
                >
                  <Button 
                    size="sm" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs px-4"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Felo (1-Klik)
                  </Button>
                </a>

                <a 
                  href={`tel:${currentFelo.phone}`} 
                  className="flex-1 md:flex-none"
                >
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full text-xs font-bold rounded-xl gap-1.5 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                  >
                    <Phone className="w-3.5 h-3.5 text-indigo-600" /> Panggil Felo
                  </Button>
                </a>

                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => navigate('/chat')}
                  className="flex-1 md:flex-none text-xs font-bold rounded-xl gap-1 text-muted-foreground"
                >
                  In-App Chat
                </Button>
              </div>
            </div>
          )}

          {/* Collapsible Full Directory by Block */}
          <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-indigo-900/40 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground italic">
              💡 <em>Memerlukan bantuan felo dari blok lain? Anda boleh menukar butang blok di atas atau buka senarai direktori penuh.</em>
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowAllDirectory(!showAllDirectory)}
              className="text-indigo-600 dark:text-indigo-400 text-xs font-bold p-0 h-auto"
            >
              {showAllDirectory ? 'Sembunyikan Direktori Semua Blok ▲' : 'Lihat Direktori Semua Blok KKTF ▼'}
            </Button>
          </div>

          {showAllDirectory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 pt-2">
              {OFFICIAL_BLOCKS.map(blk => {
                const f = resolveFeloForBlock(blk);
                const isMy = studentProfile?.block_name === blk;
                return (
                  <div key={blk} className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                    isMy 
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-2xs' 
                      : 'bg-card border-border hover:border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">{blk}</span>
                      {isMy && <Badge className="bg-indigo-600 text-[10px]">Blok Anda</Badge>}
                    </div>
                    <p className="font-semibold text-foreground truncate">{f.warden_name}</p>
                    <p className="text-muted-foreground font-mono text-[11px] flex items-center gap-1">
                      📱 {f.phone}
                    </p>
                    <div className="pt-1 flex gap-1.5">
                      <a 
                        href={getFeloWhatsAppLink(f, blk)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1"
                      >
                        <Button size="sm" className="w-full h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg gap-1">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </Button>
                      </a>
                      <a href={`tel:${f.phone}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full h-7 text-[11px] font-bold rounded-lg gap-1">
                          <Phone className="w-3 h-3 text-indigo-600" /> Panggil
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* SEKSYEN 2: NOMBOR PENTING KECEMASAN UMS (DALAM KAMPUS 24 JAM)             */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Nombor Penting Kecemasan UMS (Dalam Kampus 24 Jam)
          </h3>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
            Talian Hotline Bebas Tol Kampus
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. HOTLINE KESELAMATAN UMS (24 JAM) */}
          <Card className="border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/40 via-card to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 text-[10px] font-bold">
                  24 Jam Mudah Alih
                </Badge>
                <Siren className="w-4 h-4 text-amber-600 animate-pulse" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Hotline Keselamatan UMS</CardTitle>
              <CardDescription className="text-xs">Talian mudah alih kecemasan 24 jam anggota ronda & kawalan kampus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-amber-200 dark:border-amber-900/60 font-mono font-bold text-amber-700 dark:text-amber-300 text-sm flex items-center justify-between">
                <span>📱 012-7922979</span>
                <span className="text-[10px] font-normal text-muted-foreground">(24 Jam)</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href="tel:0127922979" className="block">
                  <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl gap-1">
                    <Phone className="w-3.5 h-3.5" /> Panggil
                  </Button>
                </a>
                <a href={getSecurityHotlineWhatsAppLink()} target="_blank" rel="noreferrer" className="block">
                  <Button size="sm" variant="outline" className="w-full border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950 font-bold text-xs rounded-xl gap-1">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* 2. BAHAGIAN KESELAMATAN UMS (PEJABAT) */}
          <Card className="border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/40 via-card to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 text-[10px] font-bold">
                  Pusat Kawalan
                </Badge>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Bahagian Keselamatan UMS</CardTitle>
              <CardDescription className="text-xs">Pejabat Pusat Kawalan Keselamatan Universiti Malaysia Sabah.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-blue-200 dark:border-blue-900/60 font-mono font-bold text-blue-700 dark:text-blue-300 text-xs space-y-0.5">
                <p>📞 088-329053 (Talian Utama)</p>
                <p>📞 088-329013 (Talian Kedua)</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a href="tel:088329053" className="block">
                  <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 font-bold text-xs rounded-xl gap-1">
                    <Phone className="w-3.5 h-3.5" /> Dail 088-329053
                  </Button>
                </a>
                <a href="tel:088329013" className="block">
                  <Button size="sm" variant="outline" className="w-full border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50 font-bold text-xs rounded-xl gap-1">
                    <Phone className="w-3.5 h-3.5" /> Dail 088-329013
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* 3. PUSAT RAWATAN WARGA UMS (KESIHATAN) */}
          <Card className="border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/40 via-card to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold">
                  Klinik & Rawatan
                </Badge>
                <Ambulance className="w-4 h-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Pusat Rawatan Warga UMS</CardTitle>
              <CardDescription className="text-xs">Klinik Kesihatan Universiti, rawatan pesakit luar & kecemasan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-emerald-200 dark:border-emerald-900/60 font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
                <span>🚑 088-321645</span>
                <span className="text-[10px] font-normal text-muted-foreground">(Klinik Kampus)</span>
              </div>
              <a href="tel:088321645" className="block">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs">
                  <Phone className="w-3.5 h-3.5" /> Panggil Pusat Rawatan (088-321645)
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKSYEN 3: NOMBOR KECEMASAN LUAR KAMPUS (KAWASAN BERHAMPIRAN)              */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Nombor Kecemasan Luar Kampus (Kawasan Berhampiran)
          </h3>
          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
            Respon Kecemasan Pihak Berkuasa
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. BALAI POLIS ALAMESRA */}
          <Card className="border-border hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-indigo-200 text-indigo-700 dark:text-indigo-300">
                  Polis (PDRM)
                </Badge>
                <Shield className="w-4 h-4 text-indigo-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Balai Polis Alamesra</CardTitle>
              <CardDescription className="text-xs">Kawalan keselamatan & laporan polis berhampiran kampus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-muted/40 rounded-xl font-mono font-bold text-foreground text-sm">
                📞 088-488222
              </div>
              <a href="tel:088488222" className="block">
                <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" /> Panggil Balai Polis
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* 2. BALAI BOMBA & PENYELAMAT MENGGATAL */}
          <Card className="border-border hover:border-orange-300 dark:hover:border-orange-700 shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-orange-200 text-orange-700 dark:text-orange-300">
                  Bomba (JBPM)
                </Badge>
                <Flame className="w-4 h-4 text-orange-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Balai Bomba Menggatal</CardTitle>
              <CardDescription className="text-xs">Operasi kebocoran, kebakaran, dan penyelamatan kecemasan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-muted/40 rounded-xl font-mono font-bold text-foreground text-sm">
                🚒 088-473970
              </div>
              <a href="tel:088473970" className="block">
                <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-950">
                  <Phone className="w-3.5 h-3.5 text-orange-600" /> Panggil Bomba
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* 3. HOSPITAL WANITA DAN KANAK-KANAK LIKAS */}
          <Card className="border-border hover:border-cyan-300 dark:hover:border-cyan-700 shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] font-bold border-cyan-200 text-cyan-700 dark:text-cyan-300">
                  Hospital Rujukan
                </Badge>
                <Hospital className="w-4 h-4 text-cyan-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Hospital Likas (HWKKL)</CardTitle>
              <CardDescription className="text-xs">Hospital kerajaan rujukan kecemasan & rawatan pakar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-muted/40 rounded-xl font-mono font-bold text-foreground text-sm">
                🏥 088-522600
              </div>
              <a href="tel:088522600" className="block">
                <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950">
                  <Phone className="w-3.5 h-3.5 text-cyan-600" /> Panggil Hospital
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* 4. TALIAN KECEMASAN AM NEGARA (999) */}
          <Card className="border-rose-300 dark:border-rose-900 bg-gradient-to-br from-rose-50/50 via-card to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                  Talian Am 999
                </Badge>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Talian Kecemasan Am</CardTitle>
              <CardDescription className="text-xs">Sistem Respon Kecemasan Malaysia (MERS 999).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-rose-200 dark:border-rose-800 font-mono font-black text-rose-700 dark:text-rose-400 text-base text-center">
                🚨 999
              </div>
              <a href="tel:999" className="block">
                <Button size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs">
                  <Phone className="w-3.5 h-3.5" /> Dail 999 Segera
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEKSYEN 4: KAUNTER PEJABAT KKTF & KEBAJIKAN JAKMAS                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* PEJABAT PENTADBIRAN KKTF */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-bold">Waktu Pejabat</Badge>
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground mt-1">Kaunter Pejabat Pentadbiran KKTF</CardTitle>
            <CardDescription className="text-xs">Isnin - Jumaat (8.00 pagi - 5.00 petang) untuk urusan rasmi kolej.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1 text-xs">
            <div className="p-2.5 bg-muted/40 rounded-xl font-mono text-foreground flex items-center justify-between">
              <span>✉️ kktf@ums.edu.my</span>
              <span className="text-[10px] text-muted-foreground">Kolej Tun Fuad</span>
            </div>
            <a href="mailto:kktf@ums.edu.my" className="block">
              <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1">
                <Mail className="w-3.5 h-3.5" /> Hantar E-mel Rasmi
              </Button>
            </a>
          </CardContent>
        </Card>

        {/* BIRO KEBAJIKAN JAKMAS */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] font-bold text-purple-700 dark:text-purple-300">Suara Mahasiswa</Badge>
              <HeartHandshake className="w-4 h-4 text-purple-600" />
            </div>
            <CardTitle className="text-sm font-bold text-foreground mt-1">Biro Kebajikan JAKMAS KKTF</CardTitle>
            <CardDescription className="text-xs">Wakil kepimpinan pelajar bagi bantuan kecemasan & kebajikan residen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1 text-xs">
            <div className="p-2.5 bg-muted/40 rounded-xl font-mono text-foreground flex items-center justify-between">
              <span>📷 @kktf_ums</span>
              <span className="text-[10px] text-muted-foreground">Instagram Rasmi</span>
            </div>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block">
              <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-950/40">
                <ExternalLink className="w-3.5 h-3.5 text-purple-600" /> Media Sosial JAKMAS
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SEKSYEN 5: BORANG PERTANYAAN / MAKLUM BALAS RASMI SEHENTI                 */}
      {/* ========================================================================= */}
      <Card className="border-border shadow-sm rounded-3xl">
        <CardHeader>
          <CardTitle className="text-base font-bold font-heading flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Hantar Pertanyaan / Bantuan Terus kepada Pengurusan KKTF
          </CardTitle>
          <CardDescription className="text-xs">
            Mesej anda akan direkodkan terus ke dalam sistem urus setia untuk tindakan susulan pentadbiran kolej.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kategori Pertanyaan *</Label>
                <Select 
                  value={messageForm.category} 
                  onValueChange={(val) => setMessageForm(f => ({ ...f, category: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kebajikan / Kecemasan">🚨 Kebajikan & Kecemasan Siswa</SelectItem>
                    <SelectItem value="Fasiliti & Bilik">🛠️ Kerosakan Bilik & Fasiliti</SelectItem>
                    <SelectItem value="E-Leave & Keselamatan">🚪 E-Leave / Jam Malam</SelectItem>
                    <SelectItem value="Merit & Aktiviti">🏆 Merit & Aktiviti Kolej</SelectItem>
                    <SelectItem value="Pertanyaan Umum">💬 Pertanyaan Umum Pentadbiran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tajuk Ringkas *</Label>
                <Input
                  value={messageForm.subject}
                  onChange={(e) => setMessageForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="cth: Masalah kebajikan / pertanyaan kemudahan kolej"
                  className="h-9 text-xs bg-background"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Kandungan Mesej / Keterangan Terperinci *</Label>
              <Textarea
                value={messageForm.message}
                onChange={(e) => setMessageForm(f => ({ ...f, message: e.target.value }))}
                placeholder="Nyatakan butiran permohonan atau masalah anda..."
                className="text-xs bg-background h-24"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={submittingMessage}
                className="bg-[#132644] hover:bg-[#1a335c] text-white font-bold text-xs rounded-xl gap-2 shadow-xs px-5"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                {submittingMessage ? 'Menghantar...' : 'Hantar Mesej Rasmi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
