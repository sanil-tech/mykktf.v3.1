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
  Phone
} from "lucide-react";

export default function Contact() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [wardenAssignments, setWardenAssignments] = useState([]);
  const [assignedFelo, setAssignedFelo] = useState(null);
  const [loading, setLoading] = useState(true);

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
            // Find assigned fellow for this student's block
            const feloMatch = (wBlocks || []).find(w => w.block_name === myStud.block_name);
            setAssignedFelo(feloMatch || null);
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

  const getFeloWhatsAppLink = () => {
    const feloPhone = assignedFelo?.phone || '60138765432';
    const cleanPhone = feloPhone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Salam Felo KKTF ${assignedFelo?.warden_name || ''},\n\nSaya ${studentProfile?.full_name || currentUser?.full_name || 'Residen'} (No. Matrik: ${studentProfile?.student_id || '-'}) dari ${studentProfile?.block_name || 'KKTF'} Bilik ${studentProfile?.room_number || '-'}.\n\nSaya ingin memaklumkan / berhubung mengenai:`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const getGuardWhatsAppLink = () => {
    const guardPhone = '6088320000';
    const text = encodeURIComponent(
      `🚨 KECEMASAN / BANTUAN KESELAMATAN KKTF:\n\nNama: ${studentProfile?.full_name || currentUser?.full_name || 'Residen'}\nNo. Matrik: ${studentProfile?.student_id || '-'}\nLokasi: ${studentProfile?.block_name || 'Blok Kediaman'} - Bilik ${studentProfile?.room_number || '-'}\n\nButiran Kecemasan:`
    );
    return `https://wa.me/${guardPhone}?text=${text}`;
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
            <p className="text-xs text-slate-200 mt-1">
              Saluran perhubungan rasmi Felo Blok, Pondok Keselamatan 24 Jam, Pusat Kesihatan UMS & Kaunter Pejabat Kolej Kediaman Tun Fuad.
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

      {/* SEKSYEN 1: KAD PINTAR FELO BLOK JAGAAN PELAJAR */}
      <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-card to-background shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold font-heading text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Pegawai Felo / Warden Blok Jagaan Anda
              </CardTitle>
              <CardDescription className="text-xs">
                Felo bertanggungjawab bagi kebajikan, kelulusan E-Leave, dan keselamatan di blok kediaman anda.
              </CardDescription>
            </div>
            {studentProfile?.block_name && (
              <Badge className="bg-indigo-700 text-white font-bold text-xs px-3 py-1 rounded-xl w-fit">
                🏢 {studentProfile.block_name} {studentProfile.room_number ? `- Bilik ${studentProfile.room_number}` : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-background border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-lg border border-indigo-200 dark:border-indigo-800">
                {assignedFelo?.warden_name ? assignedFelo.warden_name.charAt(0) : 'F'}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">
                  {assignedFelo?.warden_name || 'Puan Norazilah binti Tuman'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pegawai Felo / Warden KKTF &bull; {assignedFelo?.warden_email || 'zeela@ums.edu.my'}
                </p>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  Blok Kawal Selia: {studentProfile?.block_name || 'Block B & Block G'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <a 
                href={getFeloWhatsAppLink()} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 md:flex-none"
              >
                <Button 
                  size="sm" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1.5 shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp Felo (1-Klik)
                </Button>
              </a>

              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/chat')}
                className="flex-1 md:flex-none text-xs font-bold rounded-xl gap-1.5"
              >
                <MessageCircle className="w-4 h-4 text-indigo-600" /> Chat Dalam App
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEKSYEN 2: TALIAN KECEMASAN 24/7 (EMERGENCY RESPONSE) */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" /> Talian Hotline Kecemasan 24 Jam
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* POS JAGA KKTF */}
          <Card className="border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 text-[10px] font-bold">
                  24 Jam Pos Jaga
                </Badge>
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Pondok Keselamatan KKTF</CardTitle>
              <CardDescription className="text-xs">Pengawal bertugas di pos kawalan pintu masuk kolej.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-rose-100 dark:border-rose-900/50 font-mono font-bold text-rose-700 dark:text-rose-300">
                📞 +60 88-320 000 (Samb. KKTF)
              </div>
              <a href={getGuardWhatsAppLink()} target="_blank" rel="noreferrer" className="block">
                <Button size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl gap-1">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp Kecemasan Pos Jaga
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* PUSAT KESIHATAN UNIVERSITI (PKU) */}
          <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold">
                  Klinik & Ambulans
                </Badge>
                <Ambulance className="w-4 h-4 text-emerald-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Pusat Kesihatan UMS (PKU)</CardTitle>
              <CardDescription className="text-xs">Rawatan kecemasan & perkhidmatan ambulans kampus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-emerald-100 dark:border-emerald-900/50 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                🚑 +60 88-320 000 (Samb. PKU)
              </div>
              <a href="tel:+6088320000" className="block">
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl gap-1">
                  <Phone className="w-3.5 h-3.5" /> Panggil Ambulans PKU
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* PEJABAT PENTADBIRAN KKTF */}
          <Card className="border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 text-[10px] font-bold">
                  Waktu Pejabat
                </Badge>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Kaunter Pejabat KKTF</CardTitle>
              <CardDescription className="text-xs">Isnin - Jumaat (8.00 pagi - 5.00 petang).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-blue-100 dark:border-blue-900/50 font-mono font-bold text-blue-700 dark:text-blue-300 truncate">
                ✉️ kktf@ums.edu.my
              </div>
              <a href="mailto:kktf@ums.edu.my" className="block">
                <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                  <Mail className="w-3.5 h-3.5" /> Hantar E-mel Rasmi
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* EXCO KEBAJIKAN JAKMAS */}
          <Card className="border-purple-200/80 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 text-[10px] font-bold">
                  Suara Mahasiswa
                </Badge>
                <HeartHandshake className="w-4 h-4 text-purple-600" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground mt-2">Biro Kebajikan JAKMAS</CardTitle>
              <CardDescription className="text-xs">Aduan residen & inisiatif Dapur Siswa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              <div className="p-2.5 bg-background rounded-xl border border-purple-100 dark:border-purple-900/50 font-mono font-bold text-purple-700 dark:text-purple-300">
                📷 @kktf_ums (Instagram)
              </div>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="block">
                <Button size="sm" variant="outline" className="w-full font-bold text-xs rounded-xl gap-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                  <ExternalLink className="w-3.5 h-3.5" /> Media Sosial JAKMAS
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SEKSYEN 3: BORANG PERTANYAAN / MAKLUM BALAS RASMI SEHENTI */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold font-heading flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" /> Hantar Pertanyaan / Bantuan Terus kepada Pengurusan KKTF
          </CardTitle>
          <CardDescription className="text-xs">
            Mesej anda akan direkodkan terus ke dalam sistem urus setia untuk tindakan susulan pentadbiran.
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
                  placeholder="cth: Masalah bekalan air Blok G Aras 2"
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
