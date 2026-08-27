import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  DoorOpen,
  Contact2,
  BedDouble,
  DoorClosed,
  Wrench,
  LayoutGrid
} from "lucide-react";

export default function AdminDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [data, roomData] = await Promise.all([
        base44.entities.Student.list(),
        base44.entities.Room.list()
      ]);
      setStudents(data || []);
      setRooms(roomData || []);
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
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0B1E36] via-[#132A4A] to-[#1E3A60] rounded-2xl p-6 text-white shadow-lg border border-[#1E3A60]">
        <div className="absolute top-0 right-0 transform translate-x-6 -translate-y-6 w-44 h-44 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 transform translate-y-12 w-60 h-20 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <p className="text-xs font-bold tracking-wider text-amber-400 uppercase drop-shadow-sm mb-1">
              {(() => { const h = new Date().getHours(); if (h<12) return '🌅 Selamat Pagi'; if (h<18) return '☀️ Selamat Tengahari'; return '🌙 Selamat Malam'; })()}
            </p>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Building className="w-6 h-6 text-amber-400" /> Panel Pentadbiran KKTF
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              Selamat kembali, <span className="font-semibold text-white">{user?.full_name || 'Pentadbir'}</span>. Kawalan penempatan Kolej Kediaman Tun Fuad.
            </p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white px-4 h-9 rounded-xl border border-white/10 font-semibold transition-colors backdrop-blur-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Segarkan Data
          </button>
        </div>
      </div>

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
                  <TableHead className="text-center">Ketersediaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.blockAvailability.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
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
  );
}