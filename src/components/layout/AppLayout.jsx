import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AIAssistant from '@/components/AIAssistant';
import { fetchActiveJakmasAppointment, computeEffectiveRole } from '@/lib/jakmas';

export default function AppLayout({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [jakmasAppointment, setJakmasAppointment] = useState(null);

  const baseRole = user?.role || 'student';
  const isStudentBase = !baseRole || baseRole === 'student' || baseRole === 'user';

  useEffect(() => {
    if (!isStudentBase || !user?.id) return;
    fetchActiveJakmasAppointment(user.id).then(setJakmasAppointment);
  }, [user?.id, isStudentBase]);

  const hasJakmas = !!jakmasAppointment;
  const effectiveRole = computeEffectiveRole(baseRole, jakmasAppointment);
  const enrichedUser = { ...user, jakmasAppointment, effectiveRole };

  const handleReturnToSuperAdmin = () => {
    localStorage.removeItem('mykktf_active_persona');
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        userRole={effectiveRole}
        hasJakmas={hasJakmas}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setSidebarOpen(true)} user={enrichedUser} />
        {user?.is_persona_switched && (
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