import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import JakmasDashboard from '@/components/dashboard/JakmasDashboard';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      setLoading(true);

      // 1. AUTH ONLY (identity + role only)
      const auth = await base44.auth.me();

      // 2. REAL PROFILE SOURCE (IMPORTANT FIX)
      const students = await base44.entities.Student.filter({
        user_id: auth.id,
      });

      const profile = students?.[0] || null;

      // 3. FINAL MERGED USER (PROFILE WINS)
      const merged = {
        id: auth.id,
        email: auth.email,
        role: auth.role,
        ...profile,
      };

      setUser(merged);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const role = user?.role;

  if (role === 'student') return <StudentDashboard user={user} />;
  if (role === 'warden') return <WardenDashboard user={user} />;
  if (role === 'jakmas') return <JakmasDashboard user={user} />;

  return <AdminDashboard user={user} />;
  console.log("AUTH:", auth);
console.log("STUDENTS:", students);
}