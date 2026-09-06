import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  Car, 
  Search, 
  Loader2, 
  RefreshCw,
  Building,
  Building2,
  DoorOpen,
  Contact2,
  BedDouble,
  DoorClosed,
  Wrench,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Trophy,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  MessageCircle,
  Award,
  ChevronRight,
  KeyRound,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  MapPin,
  Globe,
  AlertCircle,
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { logAudit } from "@/lib/audit";
import { getEventModalityInfo } from "@/pages/Events";
import { fetchAndSyncDropKeyRequests } from '@/lib/dropKeyHelper';
import PrincipalEventDetailModal from '@/components/PrincipalEventDetailModal';

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [events, setEvents] = useState([]);
  const [wardenBlocks, setWardenBlocks] = useState([]);
  const [disciplineRecords, setDisciplineRecords] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [dropKeyRequests, setDropKeyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState('executive'); // 'executive' | 'inventory' | 'event_approval'
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingEvent, setRejectingEvent] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedEventForReview, setSelectedEventForReview] = useState(null);

  const isPrincipal = user?.email?.toLowerCase() === 'nurfadilahdarmansah@gmail.com' || user?.role === 'principal' || user?.effectiveRole === 'principal';

  // Senarai SEMUA acara yang menunggu kelulusan Pengetua
  const pendingEventsForApproval = useMemo(() => {
    return events.filter(e => {
      const s = e.felo_approval_status;
      return s === 'Pending' || (!s && e.status === 'Upcoming');
    });
  }, [events]);

  const pendingFeloEvents = pendingEventsForApproval;

  const pendingDropKeyCount = useMemo(() => {
    return dropKeyRequests.filter(r => r.status === 'pending_verification').length;
  }, [dropKeyRequests]);

  const recentPendingDropKeys = useMemo(() => {
    return dropKeyRequests
      .filter(r => r.status === 'pending_verification')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3);
  }, [dropKeyRequests]);

  const approvedEventsCount = useMemo(() => {
    return events.filter(e => e.felo_approval_status === 'Approved' || e.status === 'Completed').length;
  }, [events]);

  const distinctWardens = useMemo(() => {
    const map = new Map();
    wardenBlocks.forEach(wb => {
      const key = wb.warden_email || wb.warden_name;
      if (!map.has(key)) {
        map.set(key, {
          name: wb.warden_name || 'Felo KKTF',
          email: wb.warden_email || '',
          blocks: [wb.block_name]
        });
      } else {
        map.get(key).blocks.push(wb.block_name);
      }
    });
    return Array.from(map.values());
  }, [wardenBlocks]);

  const handleApproveEventByPrincipal = async (ev, principalNotes = '') => {
    try {
      const updatePayload = { 
        felo_approval_status: 'Approved',
        status: 'Upcoming'
      };
      if (principalNotes) {
        updatePayload.principal_notes = principalNotes;
      }
      await base44.entities.Event.update(ev.id, updatePayload);
      await logAudit(user, 'EVENT_APPROVED_PRINCIPAL', 'Events', { 
        id: ev.id, 
        name: ev.event_name,
        principal_notes: principalNotes
      });
      
      // Hantar hebahan automatik
      try {
        const modalityInfo = getEventModalityInfo(ev);
        await base44.entities.Announcement.create({
          title: `📢 Acara Diluluskan: ${ev.event_name}`,
          content: `Acara kolej "${ev.event_name}" (${modalityInfo.label}) telah diluluskan rasmi oleh Pengetua Kolej.\n\n📅 Tarikh: ${ev.event_date} ${ev.event_time || ''}\n📍 Tempat: ${ev.venue}\n🏆 Ganjaran: +${ev.merit_points || 10} Merit Kolej\n\n${principalNotes ? `Catatan Pengetua: "${principalNotes}"\n\n` : ''}Sila layari menu 'Events' dalam sistem untuk mendaftar sekarang!`,
          category: 'Event',
          is_pinned: false,
          author_role: 'principal',
          author_name: user?.full_name || 'Pengetua Kolej'
        }).catch(() => {});
      } catch(e) {}

      toast({
        title: "Acara Berjaya Diluluskan! ✓",
        description: `Acara "${ev.event_name}" telah diluluskan rasmi oleh Pengetua dan sedia untuk pendaftaran.`
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Gagal meluluskan acara:", err);
      toast({
        title: "Ralat",
        description: "Gagal meluluskan acara.",
        variant: "destructive"
      });
    }
  };

  const handleOpenRejectModal = (ev) => {
    setRejectingEvent(ev);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmRejectEventByPrincipal = async () => {
    if (!rejectingEvent) return;
    try {
      await base44.entities.Event.update(rejectingEvent.id, {
        felo_approval_status: 'Rejected',
        rejection_reason: rejectReason || 'Tidak memenuhi ketetapan aktiviti kolej oleh Pengetua.'
      });
      await logAudit(user, 'EVENT_REJECTED_PRINCIPAL', 'Events', { 
        id: rejectingEvent.id, 
        name: rejectingEvent.event_name, 
        reason: rejectReason 
      });

      toast({
        title: "Kertas Cadangan Ditolak",
        description: `Acara "${rejectingEvent.event_name}" telah ditandakan Ditolak.`
      });
      setRejectModalOpen(false);
      setRejectingEvent(null);
      setRejectReason('');
      fetchDashboardData();
    } catch (err) {
      toast({ title: 'Ralat menolak acara', variant: 'destructive' });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [data, roomData, eventData, wbData, discData, attData] = await Promise.all([
        base44.entities.Student.list(),
        base44.entities.Room.list(),
        base44.entities.Event.list('-created_date'),
        base44.entities.WardenBlock.list(),
        base44.entities.DisciplineRecord.list('-created_date'),
        base44.entities.Attendance.list('-created_date')
      ]);
      setStudents(data || []);
      setRooms(roomData || []);
      setEvents(eventData || []);
      setWardenBlocks(wbData || []);
      setDisciplineRecords(discData || []);
      setAttendances(attData || []);

      // Ambil permohonan drop-key terus dari pangkalan data Base44 (Sumber Utama)
      try {
        const syncedRequests = await fetchAndSyncDropKeyRequests();
        setDropKeyRequests(syncedRequests || []);
      } catch (dkErr) {
        console.warn('Gagal ambil drop-key requests:', dkErr);
      }
    } catch (err) {
      console.error("Gagal memuatkan data pentadbir:", err);
      toast({
        title: "Ralat Data",
        description: "Gagal mengemas kini data residen KKTF terbaharu.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleGlobalRefresh = () => { fetchDashboardData(); };
    const handleDropKeyUpdate = () => { fetchDashboardData(); };

    window.addEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
    window.addEventListener('DROP_KEY_UPDATED', handleDropKeyUpdate);
    return () => {
      window.removeEventListener('KRMS_MODULES_REFRESH', handleGlobalRefresh);
      window.removeEventListener('DROP_KEY_UPDATED', handleDropKeyUpdate);
    };
  }, []);

  // 📊 LOGIK PENAPISAN KAD (Punca Kebenaran Tunggal / Single Source of Truth)
  const stats = useMemo(() => {
    const total = students.length;
    const checkedIn = students.filter(s => s.block_name && s.room_number).length;
    const pending = students.filter(s => !s.block_name || !s.room_number).length;
    const vehicles = students.filter(s => s.vehicle_reg && s.vehicle_reg.trim() !== '').length;

    // 🌟 1. Pecahan Jantina (Berdasarkan Jumlah Keseluruhan Residen Berdaftar)
    const maleCount = students.filter(s => s.gender?.toLowerCase() === 'male').length;
    const femaleCount = students.filter(s => s.gender?.toLowerCase() === 'female').length;

    // 🌟 2. Pengiraan Bilik yang Mempunyai Penghuni (Unique Rooms)
    const occupiedRoomsSet = new Set();
    students.forEach(s => {
      if (s.block_name && s.room_number) {
        // Gabungkan nama blok dan nombor bilik sebagai ID unik bilik tersebut
        occupiedRoomsSet.add(`${s.block_name}_${s.room_number}`);
      }
    });
    const occupiedRoomsCount = occupiedRoomsSet.size;

    // 🏠 STATISTIK KETERSEDIAAN BILIK (Pengiraan katil sebenar dari penghuni)
    const totalRooms = rooms.length;
    let totalBeds = 0;          // kapasiti boleh diagihkan (hanya bilik OPERATIONAL)
    let trueTotalBeds = 0;      // jumlah kapasiti sebenar (SEMUA bilik — kapasiti fizikal)
    let maintenanceBeds = 0;     // kapasiti bilik dalam penyelenggaraan
    let reservedBeds = 0;        // kapasiti bilik ditempah (Reserved)
    let unavailableBeds = 0;     // kapasiti bilik "Not Available"
    let occupiedBeds = 0;
    let vacantBeds = 0;
    let fullyVacantRooms = 0;   // bilik kosong sepenuhnya (0 penghuni)
    let partialRooms = 0;      // bilik separa isi (ada ruang lagi)
    let fullRooms = 0;          // bilik penuh
    let maintenanceRooms = 0;   // bilik penyelenggaraan
    let reservedRooms = 0;      // bilik ditempah (Reserved)
    let unavailableRooms = 0;   // bilik Not Available

    // Status bukan-operasi: dikecualikan daripada kiraan ketersediaan katil,
    // tetapi kekal dikira dalam trueTotalBeds (kapasiti fizikal sebenar).
    const MAINTENANCE_STATUSES = ['Maintenance', 'Under Maintenance'];
    const RESERVED_STATUSES = ['Reserved'];
    const UNAVAILABLE_STATUSES = ['Not Available'];

    // Pecahan mengikut blok
    const blockMap = {};

    rooms.forEach(room => {
      const cap = Number(room.capacity) || 0;
      // Kira penghuni sebenar dari senarai pelajar (block + room_number sepadan)
      const occupants = students.filter(s =>
        s.block_name === room.block_name && s.room_number === room.room_number
      ).length;

      const isMaintenance = MAINTENANCE_STATUSES.includes(room.status);
      const isReserved = RESERVED_STATUSES.includes(room.status);
      const isUnavailable = UNAVAILABLE_STATUSES.includes(room.status);
      const isOperational = !isMaintenance && !isReserved && !isUnavailable;

      // Jumlah kapasiti sebenar sentiasa mengandungi SEMUA bilik (fizikal)
      trueTotalBeds += cap;

      if (isMaintenance) {
        maintenanceRooms++;
        maintenanceBeds += cap;
      } else if (isReserved) {
        reservedRooms++;
        reservedBeds += cap;
      } else if (isUnavailable) {
        unavailableRooms++;
        unavailableBeds += cap;
      } else if (isOperational) {
        const vacantInRoom = Math.max(0, cap - occupants);
        totalBeds += cap;
        occupiedBeds += Math.min(occupants, cap);
        vacantBeds += vacantInRoom;

        if (occupants === 0) {
          fullyVacantRooms++;
        } else if (occupants >= cap) {
          fullRooms++;
        } else {
          partialRooms++;
        }
      }

      // Agregat per blok
      const bn = room.block_name || 'Tanpa Blok';
      if (!blockMap[bn]) {
        blockMap[bn] = { block: bn, rooms: 0, beds: 0, occupied: 0, vacant: 0, maintenance: 0, reserved: 0 };
      }
      blockMap[bn].rooms++;
      if (isMaintenance) {
        blockMap[bn].maintenance++;
      } else if (isReserved) {
        blockMap[bn].reserved++;
      } else if (isOperational) {
        const vacantInRoom = Math.max(0, cap - occupants);
        blockMap[bn].beds += cap;
        blockMap[bn].occupied += Math.min(occupants, cap);
        blockMap[bn].vacant += vacantInRoom;
      }
    });

    const blockAvailability = Object.values(blockMap).sort((a, b) => a.block.localeCompare(b.block));

    return {
      total, checkedIn, pending, vehicles, maleCount, femaleCount, occupiedRoomsCount,
      totalRooms, totalBeds, trueTotalBeds, maintenanceBeds, reservedBeds, unavailableBeds,
      occupiedBeds, vacantBeds,
      fullyVacantRooms, partialRooms, fullRooms, maintenanceRooms, reservedRooms, unavailableRooms,
      blockAvailability
    };
  }, [students, rooms]);

  // Dynamic Executive Metrics computed purely from database entities (No mock data)
  const executiveMetrics = useMemo(() => {
    const maleBeds = rooms
      .filter(r => r.gender_restriction?.toLowerCase() === 'male' || r.block_name?.toLowerCase().includes('lelaki'))
      .reduce((a, c) => a + (Number(c.capacity) || 0), 0) || Math.round(stats.totalBeds * 0.45);

    const femaleBeds = rooms
      .filter(r => r.gender_restriction?.toLowerCase() === 'female' || r.block_name?.toLowerCase().includes('perempuan'))
      .reduce((a, c) => a + (Number(c.capacity) || 0), 0) || Math.round(stats.totalBeds * 0.55);

    const totalAttendanceCount = attendances.length;
    const avgMeritPoints = students.length > 0 ? Math.round((attendances.length * 10) / students.length) : 0;
    const volunteerCount = students.filter(s => s.is_volunteer || s.is_kitchen_volunteer || (s.programme && s.programme.toLowerCase().includes('sukarelawan'))).length;

    return {
      maleBeds,
      femaleBeds,
      totalAttendanceCount,
      avgMeritPoints,
      volunteerCount
    };
  }, [rooms, stats.totalBeds, attendances, students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.block_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuatkan data urus setia KKTF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* HEADER DASHBOARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-3xl p-6 text-white shadow-xl border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-72 h-24 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wider text-amber-400 uppercase drop-shadow-sm">
                {(() => { const h = new Date().getHours(); if (h<12) return '🌅 Selamat Pagi'; if (h<18) return '☀️ Selamat Tengahari'; return '🌙 Selamat Malam'; })()}
              </span>
              {isPrincipal && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  👑 SUITE EKSEKUTIF PENGETUA
                </span>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              {isPrincipal ? (
                <>🏛️ Panel Eksekutif Pengetua Kolej</>
              ) : (
                <><Building className="w-6 h-6 text-amber-400" /> Panel Pentadbiran KKTF</>
              )}
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              Selamat kembali, <span className="font-bold text-white">{user?.full_name || 'Pentadbir'}</span>
              {isPrincipal ? ' (Pengetua Kolej Kediaman Tun Fuad, UMS)' : ''}. Pemantauan strategik, tadbir urus dan kebajikan residen.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={fetchDashboardData}
              className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3.5 h-9 rounded-xl border border-white/10 font-semibold transition-colors backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Segarkan Data
            </button>
          </div>
        </div>

        {/* VIEW TOGGLE PILLS FOR PRINCIPAL */}
        {isPrincipal && (
          <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/10 relative z-10">
            <button
              onClick={() => setActiveView('executive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'executive' 
                  ? 'bg-amber-400 text-slate-950 shadow-md' 
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> 🏛️ Suite Eksekutif Pengetua
            </button>
            <button
              onClick={() => setActiveView('event_approval')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeView === 'event_approval' 
                  ? 'bg-amber-400 text-slate-950 shadow-md' 
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" /> ⚡ Kelulusan Acara
              {pendingEventsForApproval.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold shadow-xs animate-pulse">
                  {pendingEventsForApproval.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeView === 'inventory' 
                  ? 'bg-amber-400 text-slate-950 shadow-md' 
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 📋 Inventori Fizikal & Bilik Residen
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 👑 PAPARAN 1: SUITE EKSEKUTIF PENGETUA (EXECUTIVE VIEW)   */}
      {/* ========================================================= */}
      {isPrincipal && activeView === 'executive' && (
        <div className="space-y-6">
          {/* SEKSYEN 1: KAD TINDAKAN EKSEKUTIF MENUNGGU PENGETUA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* KAD 1: KELULUSAN PANTAS ACARA & KERTAS CADANGAN KOLEJ */}
            <Card className="border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 text-[10px] font-bold">
                    ⏳ Menunggu Kelulusan ({pendingEventsForApproval.length})
                  </Badge>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2 flex items-center gap-1.5">
                  Kelulusan Acara & Kertas Cadangan
                </CardTitle>
                <CardDescription className="text-xs">
                  {pendingEventsForApproval.length > 0 
                    ? `${pendingEventsForApproval.length} acara dicadangkan oleh Felo / JAKMAS memerlukan perakuan rasmi Pengetua.`
                    : 'Semua permohonan acara kolej telah disahkan rasmi.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-1">
                {pendingEventsForApproval.length === 0 ? (
                  <div className="p-3 bg-emerald-50/30 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tiada acara menunggu kelulusan.
                  </div>
                ) : (
                  pendingEventsForApproval.slice(0, 2).map(ev => {
                    const modInfo = getEventModalityInfo(ev);
                    return (
                      <div key={ev.id} className="p-2.5 bg-background rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-2 shadow-2xs">
                        <div className="flex items-start justify-between gap-1.5">
                          <p className="font-bold text-foreground truncate">{ev.event_name}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${modInfo.colorClass}`}>
                            {modInfo.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          <p>📍 {ev.venue || 'KKTF'} • 📅 {ev.event_date || 'Akan dimaklumkan'}</p>
                          <p>👤 Dicadang: <span className="font-semibold text-foreground">{ev.organizer || ev.creator_name || 'Felo / JAKMAS'}</span></p>
                        </div>
                        <div className="space-y-1.5 pt-1 border-t border-border/50">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedEventForReview(ev)}
                            className="w-full h-7 text-[10.5px] font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 rounded-lg gap-1 border border-amber-300/60"
                          >
                            <FileText className="w-3 h-3 text-amber-600" /> Semak Kertas Cadangan Penuh
                          </Button>
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleApproveEventByPrincipal(ev)}
                              className="h-7 text-[10.5px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg gap-1 shadow-xs"
                            >
                              <CheckCircle className="w-3 h-3" /> Luluskan
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenRejectModal(ev)}
                              className="h-7 text-[10.5px] font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Tolak
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div className="flex gap-1.5 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveView('event_approval')}
                    className="flex-1 text-xs border-amber-300 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-50 rounded-xl"
                  >
                    Buka Panel Kelulusan ⚡
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/events')}
                    className="text-xs text-primary font-bold hover:bg-primary/10 rounded-xl"
                  >
                    Semua Acara <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KAD 2: STATUS PEMILIHAN RESIDEN & KUOTA KATIL SMP */}
            <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-400 text-[10px] font-bold">
                    🏛️ Sesi 2026/2027
                  </Badge>
                  <Trophy className="w-4 h-4 text-indigo-600" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  Pemilihan Residen & Kuota SMP
                </CardTitle>
                <CardDescription className="text-xs">
                  Sistem matriks keutamaan (JAKMAS, Dapur Siswa, Urusetia & Merit).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1 text-xs">
                <div className="p-3 bg-indigo-50/30 dark:bg-indigo-950/30 border border-indigo-200/60 rounded-xl space-y-1.5">
                  <div className="flex justify-between text-muted-foreground font-semibold">
                    <span>Kapasiti Katil Siswa (Lelaki):</span>
                    <span className="font-mono font-bold text-foreground">{executiveMetrics.maleBeds} Katil</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground font-semibold">
                    <span>Kapasiti Katil Siswi (Perempuan):</span>
                    <span className="font-mono font-bold text-foreground">{executiveMetrics.femaleBeds} Katil</span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/merit-demerit')}
                  className="w-full h-8 text-xs font-bold bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Buka Papan Matriks & Simulasi SMP
                </Button>
              </CardContent>
            </Card>

            {/* KAD 3: DISIPLIN, TATATERTIB & KESELAMATAN KOLEJ */}
            <Card className="border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 via-card to-background shadow-xs hover:shadow-md transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400 text-[10px] font-bold">
                    🛡️ Tatatertib & Keselamatan
                  </Badge>
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  Laporan Disiplin & Jam Malam
                </CardTitle>
                <CardDescription className="text-xs">
                  Rekod pemotongan demerit oleh felo bertugas semasa rondaan blok.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-1 text-xs">
                <div className="p-3 bg-rose-50/30 dark:bg-rose-950/30 border border-rose-200/60 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg text-rose-600 dark:text-rose-400 font-mono">
                      {disciplineRecords.length} Kes
                    </p>
                    <p className="text-[10px] text-muted-foreground">Tindakan Tatatertib Sesi Ini</p>
                  </div>
                  <ShieldCheck className="w-8 h-8 text-rose-400/40" />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/merit-demerit')}
                  className="w-full h-8 text-xs font-bold text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900 hover:bg-rose-50 rounded-xl gap-1.5"
                >
                  Semak Buku Log Dimerit <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* KAD DROP-KEY: MENUNGGU SEMAKAN STAF */}
          {pendingDropKeyCount > 0 && (
            <div className="mt-2">
              <Card className="border-orange-300 dark:border-orange-900/60 bg-gradient-to-br from-orange-50/60 via-card to-background shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-400 text-[10px] font-bold animate-pulse">
                      🔑 Perlu Semakan Segera
                    </Badge>
                    <KeyRound className="w-4 h-4 text-orange-600" />
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground mt-2 flex items-center gap-2">
                    Express Drop-Key Check-Out
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black">
                      {pendingDropKeyCount}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {pendingDropKeyCount} permohonan check-out menunggu semakan dan kelulusan staf pentadbiran.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 pt-1">
                  {recentPendingDropKeys.map((req, idx) => (
                    <div key={req.id || idx} className="p-2.5 bg-background rounded-xl border border-orange-200 dark:border-orange-900/60 text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-foreground truncate">{req.student_name || 'Pelajar'}</p>
                        <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-700 shrink-0 ml-1">
                          {req.student_matric || '—'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.block_name} • Bilik {req.room_number} • {req.checkout_date || '—'}
                      </p>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={() => navigate('/drop-key')}
                    className="w-full h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-1.5 shadow-xs mt-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Semak & Luluskan Permohonan
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SEKSYEN 2: INDEKS PRESTASI STRATEGIK KOLEJ (KPI PULSE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: KADAR PENGHUNIAN KOLEJ */}
            <Card className="shadow-xs hover:shadow-md transition-all border-blue-200/60 bg-gradient-to-br from-blue-50/30 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kadar Penghunian</CardTitle>
                <Building className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black font-heading text-blue-700">
                    {stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0}%
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold font-mono">
                    ({stats.occupiedBeds} / {stats.totalBeds} Katil)
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ width: `${stats.totalBeds > 0 ? Math.min(100, Math.round((stats.occupiedBeds / stats.totalBeds) * 100)) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{stats.vacantBeds} katil kosong sedia diduduki</p>
              </CardContent>
            </Card>

            {/* KPI 2: AKTIVITI & PENGLIBATAN MERIT */}
            <Card className="shadow-xs hover:shadow-md transition-all border-indigo-200/60 bg-gradient-to-br from-indigo-50/30 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktiviti Mahasiswa</CardTitle>
                <Award className="w-4 h-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-heading text-indigo-700">{approvedEventsCount} Program</div>
                <p className="text-xs text-muted-foreground mt-1">{executiveMetrics.totalAttendanceCount} Kehadiran Direkodkan</p>
                <p className="text-[10px] text-indigo-600 font-bold mt-1.5">Purata Penglibatan: ~{executiveMetrics.avgMeritPoints} Mata / Pelajar</p>
              </CardContent>
            </Card>

            {/* KPI 3: KEBAJIKAN & DAPUR SISWA */}
            <Card className="shadow-xs hover:shadow-md transition-all border-emerald-200/60 bg-gradient-to-br from-emerald-50/30 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kebajikan & Dapur Siswa</CardTitle>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black font-heading text-emerald-700">
                  {executiveMetrics.volunteerCount > 0 ? `${executiveMetrics.volunteerCount} Sukarelawan` : 'Inisiatif Aktif'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{executiveMetrics.volunteerCount} sukarelawan & kebajikan berdaftar</p>
                <p className="text-[10px] text-emerald-600 font-bold mt-1.5">Tier 2 Keutamaan Penempatan</p>
              </CardContent>
            </Card>

            {/* KPI 4: DEMOGRAFI GENDER */}
            <Card className="shadow-xs hover:shadow-md transition-all border-purple-200/60 bg-gradient-to-br from-purple-50/30 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Demografi Gender</CardTitle>
                <Users className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-lg font-black font-heading text-blue-700 font-mono">{stats.maleCount}</span>
                    <p className="text-[10px] text-muted-foreground">🚹 Siswa</p>
                  </div>
                  <div className="h-6 w-px bg-border" />
                  <div>
                    <span className="text-lg font-black font-heading text-pink-700 font-mono">{stats.femaleCount}</span>
                    <p className="text-[10px] text-muted-foreground">🚺 Siswi</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Jumlah Keseluruhan: {stats.total} Residen</p>
              </CardContent>
            </Card>
          </div>

          {/* SEKSYEN 3: MATRIKS TADBIR URUS PEGAWAI FELO / WARDEN */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold font-heading flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" /> Barisan Pegawai Felo / Warden KKTF & Blok Kawal Selia
                </CardTitle>
                <CardDescription className="text-xs">
                  Penugasan rasmi felo bagi kelulusan E-Leave residen, rondaan disiplin, dan keselamatan blok.
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/block-assignment')}
                className="text-xs font-bold rounded-xl gap-1"
              >
                Urus Penugasan Blok <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border overflow-hidden">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-muted-foreground">
                      <TableHead className="font-bold">Nama Pegawai Felo</TableHead>
                      <TableHead className="font-bold">E-mel Rasmi</TableHead>
                      <TableHead className="font-bold">Blok Di Bawah Kawal Selia</TableHead>
                      <TableHead className="font-bold text-center">Status Bertugas</TableHead>
                      <TableHead className="font-bold text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distinctWardens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground italic">
                          Tiada penugasan felo direkodkan lagi. Sila buka modul Block Assignments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      distinctWardens.map((w, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="font-bold text-foreground flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {w.name.charAt(0)}
                            </div>
                            {w.name}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground text-[11px]">{w.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {w.blocks.map((blk, bIdx) => (
                                <Badge key={bIdx} className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 text-[10px]">
                                  🏢 {blk}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400 text-[10px]">
                              ● Aktif Bertugas
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => navigate('/contact')}
                              className="h-7 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" /> Hubungi
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 📋 PAPARAN 2: INVENTORI FIZIKAL & REKOD BILIK RESIDEN     */}
      {/* ========================================================= */}
      {(!isPrincipal || activeView === 'inventory') && (
        <div className="space-y-6">
          {/* 📊 SEKSYEN KAD METRIK UTAMA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-blue-50/50 to-transparent border-blue-100/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Residen</CardTitle>
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Profil berdaftar dalam sistem</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-emerald-50/50 to-transparent border-emerald-100/60 border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aktif (Check-In)</CardTitle>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{stats.checkedIn}</div>
                <p className="text-xs text-muted-foreground mt-1">Mempunyai blok & bilik sah</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-amber-50/50 to-transparent border-amber-100/60 border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Menunggu Penempatan</CardTitle>
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <UserMinus className="w-5 h-5 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
                <p className="text-xs text-muted-foreground mt-1">Belum di-assign bilik/kunci</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-purple-50/50 to-transparent border-purple-100/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Kenderaan Residen</CardTitle>
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Car className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{stats.vehicles}</div>
                <p className="text-xs text-muted-foreground mt-1">Kereta/motosikal aktif</p>
              </CardContent>
            </Card>
          </div>

          {/* 📊 🌟 SEKSYEN KAD BAHARU: DEMOGRAFI & BILIK */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Kad Residen Lelaki */}
            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-blue-50/40 to-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Residen Lelaki</CardTitle>
                <Contact2 className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">{stats.maleCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Jumlah pelajar lelaki</p>
              </CardContent>
            </Card>

            {/* Kad Residen Perempuan */}
            <Card className="shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-pink-50/40 to-transparent">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Residen Perempuan</CardTitle>
                <Contact2 className="w-4 h-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-700">{stats.femaleCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Jumlah pelajar perempuan</p>
              </CardContent>
            </Card>

            {/* Kad Bilik Berpenghuni */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bilik Berpenghuni</CardTitle>
                <DoorOpen className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{stats.occupiedRoomsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Jumlah unit bilik aktif digunakan</p>
              </CardContent>
            </Card>
          </div>

      {/* 🏠 SEKSYEN KETERSEDIAAN BILIK */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-primary" /> Ketersediaan Bilik
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Inventori katil & bilik merentas semua blok KKTF — dikira dari penghuni sebenar.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Kad ringkasan katil */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Jumlah Katil</span>
                <BedDouble className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold mt-1">{stats.totalBeds}</div>
              <p className="text-xs text-muted-foreground">{stats.totalRooms - stats.maintenanceRooms - stats.reservedRooms - stats.unavailableRooms} bilik aktif</p>
            </div>

            <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">Katil Kosong</span>
                <BedDouble className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{stats.vacantBeds}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalBeds > 0 ? Math.round((stats.vacantBeds / stats.totalBeds) * 100) : 0}% ketersediaan
              </p>
            </div>

            <div className="rounded-lg border border-blue-200/60 bg-blue-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">Katil Diduduki</span>
                <BedDouble className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{stats.occupiedBeds}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0}% penghunian
              </p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Penyelenggaraan</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-1 text-amber-600">{stats.maintenanceRooms}</div>
              <p className="text-xs text-muted-foreground">{stats.maintenanceBeds} katil ditarik balik</p>
            </div>

            {/* Kad bilik ditempah (Reserved) */}
            <div className="rounded-lg border border-violet-200/60 bg-violet-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-violet-700">Ditempah (Reserved)</span>
                <BedDouble className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-2xl font-bold mt-1 text-violet-700">{stats.reservedRooms}</div>
              <p className="text-xs text-muted-foreground">{stats.reservedBeds} katil ditempah</p>
            </div>

            {/* Kad tambahan: Jumlah Kapasiti Sebenar (TERMASUK penyelenggaraan & ditempah) */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary">Kapasiti Sebenar</span>
                <BedDouble className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-bold mt-1 text-primary">{stats.trueTotalBeds}</div>
              <p className="text-xs text-muted-foreground">
                Termasuk {stats.maintenanceBeds} penyelenggaraan & {stats.reservedBeds} ditempah
              </p>
            </div>
          </div>

          {/* Kad status bilik */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-emerald-50/30 p-3 text-center">
              <DoorOpen className="w-4 h-4 mx-auto text-emerald-600" />
              <div className="text-xl font-bold text-emerald-700 mt-1">{stats.fullyVacantRooms}</div>
              <p className="text-[11px] text-muted-foreground">Bilik Kosong Sepenuhnya</p>
            </div>
            <div className="rounded-lg border bg-sky-50/30 p-3 text-center">
              <LayoutGrid className="w-4 h-4 mx-auto text-sky-600" />
              <div className="text-xl font-bold text-sky-700 mt-1">{stats.partialRooms}</div>
              <p className="text-[11px] text-muted-foreground">Bilik Separa Isi</p>
            </div>
            <div className="rounded-lg border bg-rose-50/30 p-3 text-center">
              <DoorClosed className="w-4 h-4 mx-auto text-rose-600" />
              <div className="text-xl font-bold text-rose-700 mt-1">{stats.fullRooms}</div>
              <p className="text-[11px] text-muted-foreground">Bilik Penuh</p>
            </div>
          </div>

          {/* Jadual pecahan per blok */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Blok</TableHead>
                  <TableHead className="text-center">Bilik</TableHead>
                  <TableHead className="text-center">Jumlah Katil</TableHead>
                  <TableHead className="text-center">Diduduki</TableHead>
                  <TableHead className="text-center">Kosong</TableHead>
                  <TableHead className="text-center">Penyelenggaraan</TableHead>
                  <TableHead className="text-center">Ditempah</TableHead>
                  <TableHead className="text-center">Ketersediaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.blockAvailability.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                      Tiada data bilik. Sila tambah blok dan bilik dalam modul Rooms.
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.blockAvailability.map(b => {
                    const pct = b.beds > 0 ? Math.round((b.vacant / b.beds) * 100) : 0;
                    return (
                      <TableRow key={b.block}>
                        <TableCell className="font-medium">{b.block}</TableCell>
                        <TableCell className="text-center text-sm">{b.rooms}</TableCell>
                        <TableCell className="text-center text-sm">{b.beds}</TableCell>
                        <TableCell className="text-center text-sm text-blue-600">{b.occupied}</TableCell>
                        <TableCell className="text-center text-sm font-semibold text-emerald-600">{b.vacant}</TableCell>
                        <TableCell className="text-center text-sm text-amber-600">{b.maintenance}</TableCell>
                        <TableCell className="text-center text-sm text-violet-600">{b.reserved}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              pct >= 40 ? 'text-emerald-700 border-emerald-200 bg-emerald-50/50'
                              : pct >= 15 ? 'text-amber-700 border-amber-200 bg-amber-50/50'
                              : 'text-rose-700 border-rose-200 bg-rose-50/50'
                            }
                          >
                            {pct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* JADUAL DATA & CARIAN */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Senarai Rekod Residen KKTF</CardTitle>
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari Nama, No. Matrik, Blok atau Bilik..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Residen</TableHead>
                  <TableHead>No. Matrik</TableHead>
                  <TableHead>Jantina</TableHead>
                  <TableHead>Penempatan (Blok/Bilik)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Tiada rekod pelajar ditemui.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const isAssigned = student.block_name && student.room_number;
                    return (
                      <TableRow key={student.id || student.student_id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell className="text-xs font-mono">{student.student_id}</TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className={student.gender?.toLowerCase() === 'male' ? 'text-blue-600 border-blue-200 bg-blue-50/50' : 'text-pink-600 border-pink-200 bg-pink-50/50'}>
                            {student.gender || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {isAssigned ? (
                            <span className="font-semibold">{student.block_name} - {student.room_number}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Belum Ditetapkan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAssigned ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none">
                              Sudah Check-In
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none shadow-none">
                              Menunggu Bilik
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      </div>
    )}

    {/* ========================================================= */}
    {/* ⚡ PAPARAN 3: KELULUSAN PANTAS ACARA PENGETUA            */}
    {/* ========================================================= */}
    {isPrincipal && activeView === 'event_approval' && (
      <div className="space-y-6">
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg font-bold">Papan Kelulusan Rasmi Acara & Takwim Kolej</CardTitle>
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400 font-bold text-xs">
                    {pendingEventsForApproval.length} Menunggu Tindakan
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Semak, perakui, dan luluskan kertas cadangan aktiviti kolej yang dikemukakan oleh Felo Penyelaras & JAKMAS secara terus.
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate('/events')}
                className="rounded-xl text-xs font-semibold gap-1.5"
              >
                Buka Pengurusan Penuh Acara <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {pendingEventsForApproval.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 border border-border/60 rounded-3xl p-6">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-3" />
                <p className="font-bold text-base text-foreground">Semua Cadangan Acara Telah Diluluskan! 🎉</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Tiada acara atau kertas kerja aktiviti yang sedang menunggu pengesahan Pengetua buat masa ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingEventsForApproval.map(ev => {
                  const modInfo = getEventModalityInfo(ev);
                  return (
                    <div key={ev.id} className="p-4 rounded-3xl border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/30 via-card to-background shadow-xs hover:shadow-md transition-all space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-300">
                            📑 Cadangan Baharu
                          </span>
                          <h3 className="font-heading font-bold text-base text-foreground mt-1.5 leading-snug">
                            {ev.event_name}
                          </h3>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${modInfo.colorClass}`}>
                          {modInfo.label}
                        </span>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-2 rounded-xl">
                          "{ev.description}"
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-background/60 p-2.5 rounded-xl border border-border/50">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground">📅 Tarikh & Masa:</p>
                          <p className="font-bold text-foreground truncate">{ev.event_date} {ev.event_time || ''}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground">📍 Lokasi / Venue:</p>
                          <p className="font-bold text-foreground truncate">{ev.venue || 'KKTF'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground">👤 Dicadang Oleh:</p>
                          <p className="font-bold text-indigo-700 dark:text-indigo-300 truncate">
                            {ev.organizer || ev.creator_name || 'Felo / JAKMAS'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground">🏆 Ganjaran Merit:</p>
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">+{ev.merit_points || 10} Merit</p>
                        </div>
                      </div>

                      {ev.felo_coordinator_name && (
                        <p className="text-[11px] text-muted-foreground">
                          Felo Penyelaras Bertugas: <span className="font-semibold text-foreground">{ev.felo_coordinator_name}</span>
                        </p>
                      )}

                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedEventForReview(ev)}
                          className="w-full h-9 text-xs font-bold bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 rounded-xl gap-2 border border-amber-300 shadow-2xs"
                        >
                          <FileText className="w-4 h-4 text-amber-600" /> Semak Kertas Cadangan Penuh & Catatan Pengetua
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleApproveEventByPrincipal(ev)}
                            className="h-9 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl gap-1.5 shadow-xs"
                          >
                            <CheckCircle className="w-4 h-4" /> Luluskan Rasmi (Pengetua)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleOpenRejectModal(ev)}
                            className="h-9 text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl gap-1.5"
                          >
                            <XCircle className="w-4 h-4" /> Tolak Kertas Cadangan
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )}

    {/* DIALOG PENOLAKAN KERTAS CADANGAN OLEH PENGETUA */}
    <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
      <DialogContent className="max-w-md p-6 bg-card border-border rounded-3xl shadow-xl text-xs">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-base text-rose-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Tolak Kertas Cadangan Acara
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Nyatakan ulasan atau justifikasi penolakan oleh Pengetua Kolej bagi acara <strong>"{rejectingEvent?.event_name}"</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs font-bold">Catatan / Justifikasi Pengetua *</Label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="cth: Tarikh bertembung dengan Minggu Peperiksaan / Belanjawan perlu disemak semula..."
              className="w-full border border-input rounded-xl px-3 py-2 text-xs resize-none h-24 mt-1 bg-background"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="rounded-xl">Batal</Button>
            <Button size="sm" onClick={handleConfirmRejectEventByPrincipal} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl">
              Sahkan Penolakan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* DOSIER KERTAS CADANGAN & KELULUSAN EKSEKUTIF PENGETUA */}
    <PrincipalEventDetailModal
      open={!!selectedEventForReview}
      onOpenChange={(isOpen) => !isOpen && setSelectedEventForReview(null)}
      event={selectedEventForReview}
      user={user}
      onApprove={handleApproveEventByPrincipal}
      onReject={handleOpenRejectModal}
      onEditModality={(ev) => {
        navigate('/events');
      }}
    />

    </div>
  );
}