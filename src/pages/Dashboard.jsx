import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import JakmasDashboard from '@/components/dashboard/JakmasDashboard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------------------------
  // LOAD USER (FIXED)
  // ---------------------------
  const loadUser = async () => {
    try {
      setLoading(true);

      // 1. Auth session user (base identity)
      const authUser = await base44.auth.me();

      // 2. Try to get latest profile (if your backend supports it)
      const profileUser = await base44.users?.getMe?.();

      // 3. Merge both to avoid stale data issues
      const mergedUser = {
        ...authUser,
        ...profileUser
      };

      setUser(mergedUser);
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // ---------------------------
  // LOADING UI
  // ---------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ---------------------------
  // ROLE SAFE HANDLING
  // ---------------------------
  const role = user?.role;

  if (role === 'student') {
    return <StudentDashboard user={user} />;
  }

  if (role === 'warden') {
    return <WardenDashboard user={user} />;
  }

  if (role === 'jakmas') {
    return <JakmasDashboard user={user} />;
  }

  // default fallback
  return <AdminDashboard user={user} />;
}