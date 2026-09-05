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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AIAssistant user={enrichedUser} />
    </div>
  );
}