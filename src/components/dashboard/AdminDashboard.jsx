import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Building
} from "lucide-react";

export default function AdminDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Fungsi untuk menarik data dari API sebenar
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
    
    // Aktif = Ada nama blok DAN ada nombor bilik
    const checkedIn = students.filter(s => s.block_name && s.room_number).length;
    
    // Menunggu = Tiada nama blok ATAU tiada nombor bilik
    const pending = students.filter(s => !s.block_name || !s.room_number).length;
    
    // Jumlah kenderaan berdaftar (tidak kosong)
    const vehicles = students.filter(s => s.vehicle_reg && s.vehicle_reg.trim() !== '').length;

    return { total, checkedIn, pending, vehicles };
  }, [students]);

  // Logik Carian Senarai Pelajar
  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.block_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
      
      {/* 🌟 HEADER DASHBOARD */}
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

      {/* 📊 SEKSYEN KAD METRIK (100% Selari Dengan Data Sebenar) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KAD 1: Jumlah Residen Berdaftar */}
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

        {/* KAD 2: Residen Aktif (Sudah Check-In) */}
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

        {/* KAD 3: Menunggu Penempatan Bilik */}
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

        {/* KAD 4: Kenderaan Berdaftar */}
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

      {/* 🔍 JADUAL DATA & CARIAN */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Senarai Rekod Residen KKTF</CardTitle>
          <CardDescription>Senarai keseluruhan profil pelajar dan status penempatan semasa.</CardDescription>
          <div className="pt-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari Nama, No. Matrik atau Blok..." 
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
                  <TableHead>Fakulti</TableHead>
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
                        <TableCell className="text-xs max-w-[200px] truncate" title={student.faculty}>
                          {student.faculty || '—'}
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
                            <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                              Sudah Check-In
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
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