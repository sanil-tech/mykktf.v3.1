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
  Contact2
} from "lucide-react";

export default function AdminDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.Student.list();
      setStudents(data || []);
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

    return { total, checkedIn, pending, vehicles, maleCount, femaleCount, occupiedRoomsCount };
  }, [students]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building className="w-6 h-6 text-primary" /> Panel Pentadbiran KKTF
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Selamat kembali, <span className="font-semibold text-foreground">{user?.full_name || 'Pentadbir'}</span>. Kawalan penempatan Kolej Kediaman Tun Fuad.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center gap-2 text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 h-9 rounded-md border font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Segarkan Data
        </button>
      </div>

      {/* 📊 SEKSYEN KAD METRIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Residen</CardTitle>
            <Users className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Profil berdaftar dalam sistem</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aktif (Check-In)</CardTitle>
            <UserCheck className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
            <p className="text-xs text-muted-foreground mt-1">Mempunyai blok & bilik sah</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Menunggu Penempatan</CardTitle>
            <UserMinus className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Belum di-assign bilik/kunci</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kenderaan Residen</CardTitle>
            <Car className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">Kereta/motosikal aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* 📊 🌟 SEKSYEN KAD BAHARU: DEMOGRAFI & BILIK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Kad Residen Lelaki */}
        <Card className="shadow-sm bg-gradient-to-br from-blue-50/40 to-transparent">
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
        <Card className="shadow-sm bg-gradient-to-br from-pink-50/40 to-transparent">
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