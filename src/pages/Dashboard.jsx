import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import JakmasDashboard from '@/components/dashboard/JakmasDashboard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matrixId, setMatrixId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => { 
      setUser(u); 
      setLoading(false); 
    }).catch(() => setLoading(false));
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!matrixId.trim()) {
      toast({ title: "Ralat", description: "Sila masukkan No. Matrik anda." });
      return;
    }

    setSubmitting(true);
    try {
      // Simpan No Matrik ke dalam metadata/profil user
      // Ini bertindak sebagai bukti mereka sudah "Check-In"
      await base44.auth.updateMe({ 
        metadata: { matrixId: matrixId, checkedIn: true } 
      });
      
      toast({ title: "Berjaya", description: "Check-in selesai! Selamat datang ke portal kolej." });
      window.location.reload(); 
    } catch (err) {
      toast({ title: "Gagal Check-In", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ====================================================================
  // 🎯 UNVERIFIED STUDENT CHECK-IN (Bagi yang belum isi No Matrik)
  // ====================================================================
  // Jika mereka adalah 'student' tapi fail metadata matrixId masih kosong, tunjuk welcome screen
  if (user?.role === 'student' && !user?.metadata?.matrixId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
        <div className="max-w-md w-full space-y-6 text-center bg-card p-8 rounded-xl border shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight">Selamat Datang! 👋</h1>
          <p className="text-muted-foreground">
            Sila lengkapkan maklumat profil anda untuk proses pengesahan dan Check-In kolej kediaman KKMS.
          </p>

          <form onSubmit={handleCheckIn} className="space-y-4 text-left mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">No. Matrik Pelajar</label>
              <Input 
                placeholder="Contoh: BI21110043" 
                value={matrixId} 
                onChange={(e) => setMatrixId(e.target.value)}
                disabled={submitting}
              />
            </div>

            <Button type="submit" className="w-full h-12 mt-2" disabled={submitting}>
              {submitting ? "Memproses Check-In..." : "Sahkan & Check-In"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // ====================================================================
  // 🛡️ DASHBOARD PERANAN SEDIA ADA (SAFE & UNTOUCHED)
  // ====================================================================
  if (user?.role === 'student') return <StudentDashboard user={user} />;
  if (user?.role === 'warden') return <WardenDashboard user={user} />;
  if (user?.role === 'jakmas') return <JakmasDashboard user={user} />;
  
  return <AdminDashboard user={user} />;
}