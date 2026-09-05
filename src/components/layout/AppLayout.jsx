import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistant from '@/components/AIAssistant';
import { fetchActiveJakmasAppointment, computeEffectiveRole } from '@/lib/jakmas';
import { base44 } from '@/api/base44Client';

export default function AppLayout({ user }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [jakmasAppointment, setJakmasAppointment] = useState(null);
  const [isStudentVerified, setIsStudentVerified] = useState(true);

  const baseRole = user?.role || 'student';
  const isStudentBase = !baseRole || baseRole === 'student' || baseRole === 'user';

  useEffect(() => {
    if (!isStudentBase || !user?.id) return;
    fetchActiveJakmasAppointment(user.id).then(setJakmasAppointment);
  }, [user?.id, isStudentBase]);

  const hasJakmas = !!jakmasAppointment;
  const effectiveRole = computeEffectiveRole(baseRole, jakmasAppointment);
  const enrichedUser = { ...user, jakmasAppointment, effectiveRole };

  // Semakan ketat pintu utama untuk peranan pelajar:
  // Pelajar yang belum melengkapkan pengaktifan QR disekat dari mengakses modul kolej
  useEffect(() => {
    if (!isStudentBase || hasJakmas) {
      setIsStudentVerified(true);
      return;
    }

    async function checkStudentStatus() {
      try {
        let studs = [];
        if (user?.id) {
          studs = await base44.entities.Student.filter({ user_id: user.id }, '-created_date');
        }
        if (!studs.length && user?.email) {
          studs = await base44.entities.Student.filter({ email: user.email.trim() }, '-created_date');
        }
        if (studs.length > 0) {
          const s = studs[0];
          const hasRoom = Boolean(s.block_name && s.room_number);
          const isQrVerified = Boolean(
            s.qr_verified === true || 
            s.qr_verified === 'true' || 
            s.qr_verified === 1 || 
            s.qr_verified === '1'
          );
          const isRoomCheckedIn = String(s.room_status || '').trim().toLowerCase() === 'checked in';
          const isPending = String(s.room_status || '').trim().toLowerCase() === 'pending verification' ||
                            String(s.room_status || '').trim().toLowerCase() === 'pending key';
          setIsStudentVerified(hasRoom && isQrVerified && isRoomCheckedIn && !isPending);
        } else {
          setIsStudentVerified(false);
        }
      } catch (err) {
        console.warn('AppLayout verification check error:', err);
      }
    }

    checkStudentStatus();
  }, [user?.id, user?.email, isStudentBase, hasJakmas, location.pathname]);

  const handleReturnToSuperAdmin = () => {
    localStorage.removeItem('mykktf_active_persona');
    window.location.reload();
  };

  // Sekat laluan modul jika pelajar belum mengimbas QR di pintu utama
  const publicAllowedPaths = ['/', '/guide', '/buku-panduan', '/presentation', '/contact', '/hotline'];
  const isBlockedRoute = isStudentBase && !hasJakmas && !isStudentVerified && !publicAllowedPaths.includes(location.pathname);

  if (isBlockedRoute) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        userRole={effectiveRole}
        hasJakmas={hasJakmas}
        isStudentVerified={isStudentVerified}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} user={enrichedUser} />
        {user?.is_persona_switched && (user?.email?.toLowerCase() === 'sanil@ums.edu.my' || user?.real_email?.toLowerCase() === 'sanil@ums.edu.my') && (
          <div className="bg-emerald-950 text-emerald-100 border-b border-emerald-700/60 px-4 py-2 text-xs flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong>MOD OPERASI FELO AKTIF ({user.active_warden_block || 'Blok B'}):</strong> Skop kerja, pemantauan aduan kerosakan, dan borang A4 dikhususkan atas nama Felo Blok ini.
              </span>
            </div>
            <button 
              type="button"
              onClick={handleReturnToSuperAdmin}
              className="text-[11px] font-bold text-amber-300 hover:text-white underline cursor-pointer shrink-0 ml-2"
            >
              👑 Kembali ke Super Admin
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AIAssistant user={enrichedUser} />
    </div>
  );
}