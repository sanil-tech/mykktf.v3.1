import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  CalendarOff, 
  Wrench, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  Building2, 
  Users, 
  DoorOpen, 
  MessageSquare, 
  ShieldCheck,
  Award,
  Medal,
  ArrowRight,
  Layers,
  Sparkles,
  CalendarCheck,
  CheckCircle2
} from 'lucide-react';
import { getStoredFeloExcoAppointments } from '@/lib/jakmas';

export default function WardenDashboard({ user }) {
  const [leaves, setLeaves] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [wardenBlocks, setWardenBlocks] = useState([]);
  const [feloAppointment, setFeloAppointment] = useState(null);
  const [pendingSportsClaims, setPendingSportsClaims] = useState(0);
  const [stats, setStats] = useState({ totalStudents: 0, occupiedRooms: 0, vacantRooms: 0, activeComplaints: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      // 1. Kenal pasti blok kawal selia warden / felo
      const wb = await base44.entities.WardenBlock.filter({ warden_user_id: user?.id }).catch(() => []);
      let myWb = wb;
      if (!myWb || myWb.length === 0) {
        try {
          const allWb = await base44.entities.WardenBlock.list();
          myWb = (allWb || []).filter(w => 
            w.warden_user_id === user?.id || 
            (w.warden_email && user?.email && w.warden_email.toLowerCase() === user?.email.toLowerCase()) ||
            (user?.full_name && w.warden_name && (
              user.full_name.toLowerCase().includes(w.warden_name.toLowerCase()) ||
              w.warden_name.toLowerCase().includes(user.full_name.toLowerCase())
            ))
          );
        } catch (e) {}
      }
      setWardenBlocks(myWb || []);
      const blockNames = (myWb || []).map(w => w.block_name);

      // 2. Semak status pelantikan rasmi Felo Penyelaras Exco JAKMAS
      const allAppointments = getStoredFeloExcoAppointments();
      const myAppt = allAppointments.find(a => 
        a.status === 'active' && (
          a.fellow_user_id === user?.id || 
          (a.fellow_email && user?.email && a.fellow_email.toLowerCase() === user?.email.toLowerCase()) ||
          (a.fellow_name && user?.full_name && (
            a.fellow_name.toLowerCase().includes(user.full_name.toLowerCase()) ||
            user.full_name.toLowerCase().includes(a.fellow_name.toLowerCase())
          ))
        )
      );
      setFeloAppointment(myAppt || null);

      // 3. Semak jumlah tuntutan merit sukan yang belum disahkan (untuk Felo Penyelaras Sukan)
      try {
        const raw = localStorage.getItem('kktf_custom_merit_transactions');
        if (raw) {
          const txs = JSON.parse(raw);
          if (Array.isArray(txs)) {
            const pendingCount = txs.filter(t => t.is_sports_claim && t.status === 'pending').length;
            setPendingSportsClaims(pendingCount);
          }
        }
      } catch (e) {}

      // 4. Muat data operasi asrama
      const [allLeaves, allMaint, allStudents, allRooms, allComplaints] = await Promise.all([
        base44.entities.LeaveApplication.list('-created_date'),
        base44.entities.MaintenanceRequest.filter({ status: 'Submitted' }, '-created_date'),
        base44.entities.Student.list(),
        base44.entities.Room.list(),
        base44.entities.Complaint.list('-created_date'),
      ]);

      if (blockNames.length > 0) {
        const blockStudents = allStudents.filter(s => blockNames.includes(s.block_name));
        const blockRooms = allRooms.filter(r => blockNames.includes(r.block_name));
        const blockComplaints = allComplaints.filter(c => blockNames.includes(c.block_name));

        const pendingLeaves = allLeaves.filter(lv => blockNames.includes(lv.block_name) && lv.status === 'Pending');
        setLeaves(pendingLeaves);
        setMaintenance(allMaint.filter(mx => blockNames.includes(mx.block_name)));

        setStats({
          totalStudents: blockStudents.length,
          occupiedRooms: blockRooms.filter(r => r.status === 'Occupied' || r.status === 'Full').length,
          vacantRooms: blockRooms.filter(r => r.status === 'Available').length,
          activeComplaints: blockComplaints.filter(c => c.status === 'Submitted' || c.status === 'Under Review').length,
        });
      } else {
        setLeaves(allLeaves.filter(l => l.status === 'Pending'));
        setMaintenance(allMaint);
      }
    } catch (error) {
      console.error("Gagal memuatkan data WardenDashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeave(id, status) {
    await base44.entities.LeaveApplication.update(id, { status, approved_by: user?.full_name || user?.email });
    load();
  }

  async function updateMaintenance(id, status) {
    await base44.entities.MaintenanceRequest.update(id, { status });
    load();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-64 h-24 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-wider text-amber-400 uppercase drop-shadow-sm px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
              {(() => { const h = new Date().getHours(); if (h<12) return '🌅 Selamat Pagi'; if (h<18) return '☀️ Selamat Tengahari'; return '🌙 Selamat Malam'; })()}
            </span>
            {feloAppointment ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-xs font-semibold backdrop-blur-md">
                <Medal className="w-3.5 h-3.5 text-amber-400" />
                Felo Penyelaras Exco JAKMAS ({feloAppointment.academic_session || 'Sesi 2025/2026'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/10 text-xs font-medium backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Pegawai Felo / Warden Kolej Kediaman Tun Fuad
              </span>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0" />
              Selamat Datang, {user?.full_name || 'Felo / Warden'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 mt-1">
              Berikut adalah ringkasan kawal selia blok dan penugasan rasmi portfolio kolej yang memerlukan perhatian anda.
            </p>
          </div>

          {/* Badges Bar: Portfolios & Blocks */}
          <div className="pt-1 flex flex-wrap items-center gap-2">
            {/* Block Badges */}
            {wardenBlocks.length > 0 && wardenBlocks.map(wb => (
              <span key={wb.id} className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1 rounded-xl flex items-center gap-1.5 border border-white/15 backdrop-blur-sm transition-colors text-white font-medium">
                <Building2 className="w-3.5 h-3.5 text-amber-400" /> {wb.block_name}
              </span>
            ))}

            {/* If Appointed to Exco Portfolios */}
            {feloAppointment && (feloAppointment.portfolios || []).map((port, i) => (
              <span key={i} className="text-xs bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-100 border border-indigo-400/40 px-3 py-1 rounded-xl flex items-center gap-1.5 font-medium shadow-xs backdrop-blur-md transition-colors">
                <Award className="w-3.5 h-3.5 text-indigo-300" />
                {port}
              </span>
            ))}

            {!feloAppointment && (
              <span className="text-xs bg-amber-500/10 text-amber-200/90 border border-amber-400/20 px-3 py-1 rounded-xl flex items-center gap-1.5 backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Penyelarasan Exco JAKMAS: Menunggu pengesahan watikah daripada Pengetua Kolej
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {wardenBlocks.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-blue-50/40 to-transparent">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-emerald-50/40 to-transparent">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.vacantRooms}</p>
              <p className="text-xs text-muted-foreground">Vacant Rooms</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-amber-50/40 to-transparent">
            <div className="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
              <CalendarOff className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{leaves.length}</p>
              <p className="text-xs text-muted-foreground">Pending Leaves</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all bg-gradient-to-br from-rose-50/40 to-transparent">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-rose-700">{stats.activeComplaints}</p>
              <p className="text-xs text-muted-foreground">Active Complaints</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards (when no blocks assigned) */}
      {wardenBlocks.length === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
              <CalendarOff className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{leaves.length}</p>
              <p className="text-xs text-muted-foreground">Pending Leaves</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{maintenance.length}</p>
              <p className="text-xs text-muted-foreground">New Damage Reports</p>
            </div>
          </div>
        </div>
      )}

      {/* SEKSYEN JAWATAN & WATIKAH FELO PENYELARAS EXCO JAKMAS */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/50 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold font-heading text-foreground">
                  Watikah Penyelarasan Exco JAKMAS
                </h2>
                {feloAppointment ? (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                    Aktif Berkhidmat ({feloAppointment.academic_session || 'Sesi 2025/2026'})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 border-amber-200">
                    Menunggu Lantikan Rasmi Pengetua
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Penyeliaan berwibawa aktiviti mahasiswa & Majlis Perwakilan Kolej Kediaman Tun Fuad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="text-xs rounded-xl h-9 gap-1.5">
              <Link to="/jakmas-management">
                <Users className="w-3.5 h-3.5" />
                <span>Direktori JAKMAS</span>
              </Link>
            </Button>
          </div>
        </div>

        {feloAppointment ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Portfolios & Appointment Specs */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Portfolio Exco Diselaras ({feloAppointment.portfolios?.length || 0}):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(feloAppointment.portfolios || []).map((port, idx) => {
                    const isSports = port.toLowerCase().includes('sukan');
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSports 
                            ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/70 dark:border-amber-800/60 shadow-xs' 
                            : 'bg-muted/40 border-border/80'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-2 rounded-xl shrink-0 ${isSports ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'}`}>
                            {isSports ? <Medal className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground leading-tight">{port}</p>
                            <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                              {isSports ? 'Pengesah Rasmi Tuntutan Merit Sukan' : 'Penyelaras Aktiviti & Exco'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Watikah Credentials Table */}
              <div className="bg-muted/30 border border-border rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">No. Watikah Pelantikan:</span>
                  <span className="font-mono font-bold text-foreground">{feloAppointment.letter_ref || 'UMS/KKTF/WATIKAH-FELO/2025/AKTIF'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Sesi / Tempoh Perkhidmatan:</span>
                  <span className="font-medium text-foreground">{feloAppointment.academic_session || 'Sesi 2025/2026'} ({feloAppointment.appointment_date} → {feloAppointment.term_end})</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Pihak Berkuasa Melantik:</span>
                  <span className="font-medium text-foreground">{feloAppointment.appointed_by || 'Pengetua Kolej Kediaman Tun Fuad'}</span>
                </div>
                {feloAppointment.notes && (
                  <div className="pt-1 text-[11px] text-muted-foreground italic">
                    &ldquo;{feloAppointment.notes}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Action Hub For This Felo */}
            <div className="lg:col-span-5 space-y-3">
              <p className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Pusat Tindakan & Akses Penyelaras:
              </p>

              {/* Special Card if Felo coordinates Sukan & Rekreasi */}
              {(feloAppointment.portfolios || []).some(p => p.toLowerCase().includes('sukan')) && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Medal className="w-4 h-4 text-amber-600" />
                      Tuntutan Merit Sukan Kolej
                    </span>
                    {pendingSportsClaims > 0 ? (
                      <Badge className="bg-amber-600 text-white text-[10px] animate-pulse">
                        {pendingSportsClaims} Menunggu
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Terkini
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sebagai Felo Penyelaras Sukan, anda bertanggungjawab menyemak dan mengesahkan sumbangan merit atlet kolej.
                  </p>
                  <Button size="sm" asChild className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold h-8 gap-1.5">
                    <Link to="/merit?tab=matrix">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Semak Tuntutan Sukan Pelajar
                    </Link>
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Button variant="outline" size="sm" asChild className="w-full justify-between h-9 text-xs rounded-xl bg-card hover:bg-muted/60">
                  <Link to="/jakmas-management">
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Pengurusan Exco & Tugasan JAKMAS
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </Button>

                <Button variant="outline" size="sm" asChild className="w-full justify-between h-9 text-xs rounded-xl bg-card hover:bg-muted/60">
                  <Link to="/events">
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-emerald-600" />
                      Pantau & Sahkan Program Kolej
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </Button>

                <Button variant="outline" size="sm" asChild className="w-full justify-between h-9 text-xs rounded-xl bg-card hover:bg-muted/60">
                  <Link to="/merit">
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-cyan-600" />
                      Transkrip Merit Mahasiswa
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Pending Official Appointment */
          <div className="p-6 rounded-2xl bg-muted/30 border border-dashed border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Status: Felo / Warden Kolej Berdaftar</span>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Kawal Selia Blok</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Anda kini aktif mengawal selia {wardenBlocks.map(b => b.block_name).join(', ') || 'Blok Kolej Kediaman Tun Fuad'}. 
                Lantikan rasmi bagi jawatan <strong>Felo Penyelaras Exco JAKMAS</strong> akan dimuktamadkan oleh Pengetua Kolej secara berfasa. 
                Portfolio dan akses pengesahan khusus akan muncul di ruangan ini sebaik sahaja watikah rasmi didaftarkan.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild className="rounded-xl text-xs shrink-0 gap-1.5">
              <Link to="/jakmas-management">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lihat Struktur 9 Exco Kolej</span>
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Pending Leave Applications */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500" /> Pending Leave Applications
          </h2>
          <Link to="/leave" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {leaves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Check className="w-8 h-8 text-green-400" />
            <p className="text-sm text-muted-foreground">All caught up! No pending leaves.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {leaves.map(l => (
              <div key={l.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.student_name}</p>
                  <p className="text-xs text-muted-foreground">{l.leave_type} · {l.departure_date} → {l.return_date}</p>
                  <p className="text-xs text-muted-foreground truncate">{l.destination}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => updateLeave(l.id, 'Approved')}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => updateLeave(l.id, 'Rejected')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Damage Reports */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-heading font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500" /> New Damage Reports
          </h2>
          <Link to="/maintenance" className="text-xs text-primary hover:underline">View All</Link>
        </div>
        {maintenance.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Check className="w-8 h-8 text-green-400" />
            <p className="text-sm text-muted-foreground">No new damage reports.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {maintenance.map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.student_name}</p>
                  <p className="text-xs text-muted-foreground">Room {m.room_number}{m.block_name ? ` · ${m.block_name}` : ''} · <span className="font-medium text-foreground">{m.category}</span></p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => updateMaintenance(m.id, 'Assigned')}>
                  Assign
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}