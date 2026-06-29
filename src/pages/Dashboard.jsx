import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import WardenDashboard from '@/components/dashboard/WardenDashboard';
import JakmasDashboard from '@/components/dashboard/JakmasDashboard';
import ProfileCompletionForm from '@/pages/MyProfile';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current session user profile
  const fetchUser = () => {
    base44.auth.me().then(u => { 
      setUser(u); 
      setLoading(false); 
    });
  };

  useEffect(() => {
    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 1. GATING STEP: Check if profile fields exist (or explicit boolean flag)
  // Adjust this condition based on your exact profile entity schema key
  const hasCompletedProfile = user?.profile_completed || (user?.student_id && user?.gender);

  if (!hasCompletedProfile) {
    return (
      <ProfileCompletionForm 
        user={user} 
        onComplete={() => {
          setLoading(true);
          fetchUser(); // Re-trigger user fetch to unlock dashboards smoothly
        }} 
      />
    );
  }

  // 2. DASHBOARD ROUTING (Only accessible after profile validation passes)
  if (user?.role === 'student') return <StudentDashboard user={user} />;
  if (user?.role === 'warden') return <WardenDashboard user={user} />;
  if (user?.role === 'jakmas') return <JakmasDashboard user={user} />;
  
  return <AdminDashboard user={user} />;
}