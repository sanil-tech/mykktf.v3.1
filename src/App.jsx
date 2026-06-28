import { Toaster } from "@/components/ui/toaster"
import { base44 } from '@/api/base44Client';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import Rooms from '@/pages/Rooms';
import CheckInOut from '@/pages/CheckInOut';
import Leave from '@/pages/Leave';
import Maintenance from '@/pages/Maintenance';
import Visitors from '@/pages/Visitors';
import Parcels from '@/pages/Parcels';
import Discipline from '@/pages/Discipline';
import Facilities from '@/pages/Facilities';
import AttendancePage from '@/pages/AttendancePage';
import Announcements from '@/pages/Announcements';
import Fees from '@/pages/Fees';
import Reports from '@/pages/Reports';
import AuditLog from '@/pages/AuditLog';
import MyProfile from '@/pages/MyProfile';
import StudentSetup from '@/pages/StudentSetup';
import BlockAssignment from '@/pages/BlockAssignment';
import Complaints from '@/pages/Complaints';
import Chat from '@/pages/Chat';
import LeaveMonitor from '@/pages/LeaveMonitor';
import SurveyAnalytics from '@/pages/SurveyAnalytics';
import Events from '@/pages/Events';
import RoomInspections from '@/pages/RoomInspections';
import ResidentDirectory from '@/pages/ResidentDirectory';
import { useState, useEffect } from 'react';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);

  useEffect(() => {
    // Only check setup for newly registered users (no role yet or role is default)
    if (user && !isLoadingAuth) {
      const isStudent = !user.role || user.role === 'student';
      if (isStudent) {
        setCheckingSetup(true);
        base44.entities.Student.filter({ email: user.email }).then(results => {
          setNeedsSetup(results.length === 0);
          setCheckingSetup(false);
        });
      }
    }
  }, [user, isLoadingAuth]);

  if (isLoadingPublicSettings || isLoadingAuth || checkingSetup) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground">Loading KKMS...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  if (needsSetup && user) {
    return <StudentSetup user={user} onComplete={() => { setNeedsSetup(false); window.location.href = '/'; }} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout user={user} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/check-in-out" element={<CheckInOut />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/parcels" element={<Parcels />} />
          <Route path="/discipline" element={<Discipline />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/fees" element={<Fees />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/block-assignment" element={<BlockAssignment />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/leave-monitor" element={<LeaveMonitor />} />
          <Route path="/survey-analytics" element={<SurveyAnalytics />} />
          <Route path="/events" element={<Events />} />
          <Route path="/room-inspections" element={<RoomInspections />} />
          <Route path="/directory" element={<ResidentDirectory />} />
        </Route>
      </Route>

      <Route path="/student-setup" element={<StudentSetup user={user} onComplete={() => { window.location.href = '/'; }} />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState("loading");

  useEffect(() => {
    const init = async () => {
      try {
        const auth = await base44.auth.me();

        let students = await base44.entities.Student.filter({
          user_id: auth.id,
        });

        if (!students.length) {
          students = await base44.entities.Student.filter({
            email: auth.email,
          });
        }

        let profile = students?.[0];

        // AUTO CREATE PROFILE (important fix)
        if (!profile) {
          profile = await base44.entities.Student.create({
            user_id: auth.id,
            email: auth.email,
            role: profile.role || "student",
            onboarding_status: "pending",
          });

          setRoute("onboarding");
          setLoading(false);
          return;
        }

        const incomplete =
          !profile.full_name ||
          !profile.phone ||
          !profile.faculty;

        if (
          profile.onboarding_status !== "completed" ||
          incomplete
        ) {
          setRoute("onboarding");
        } else {
          setRoute("dashboard");
        }

      } catch (err) {
        console.error(err);
        setRoute("dashboard");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  if (route === "onboarding") return <Onboarding />;
  return <Dashboard />;
}
export default App