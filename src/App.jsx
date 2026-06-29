import { Toaster } from "@/components/ui/toaster";
import { base44 } from "@/api/base44Client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Students from "@/pages/Students";
import Rooms from "@/pages/Rooms";
import CheckInOut from "@/pages/CheckInOut";
import Leave from "@/pages/Leave";
import Maintenance from "@/pages/Maintenance";
import Visitors from "@/pages/Visitors";
import Parcels from "@/pages/Parcels";
import Discipline from "@/pages/Discipline";
import Facilities from "@/pages/Facilities";
import AttendancePage from "@/pages/AttendancePage";
import Announcements from "@/pages/Announcements";
import Fees from "@/pages/Fees";
import Reports from "@/pages/Reports";
import AuditLog from "@/pages/AuditLog";
import MyProfile from "@/pages/MyProfile";
import StudentSetup from "@/pages/StudentSetup";
import BlockAssignment from "@/pages/BlockAssignment";
import Complaints from "@/pages/Complaints";
import Chat from "@/pages/Chat";
import LeaveMonitor from "@/pages/LeaveMonitor";
import SurveyAnalytics from "@/pages/SurveyAnalytics";
import Events from "@/pages/Events";
import RoomInspections from "@/pages/RoomInspections";
import ResidentDirectory from "@/pages/ResidentDirectory";

const AuthenticatedApp = () => {
  const {
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    navigateToLogin,
    user,
  } = useAuth();

  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);

  // ✅ SAFE ROLE CHECK (ONLY ONCE)
  const isAdmin = useMemo(() => {
    return (
      user?.role === "super_admin" ||
      user?.role === "warden" ||
      user?.role === "staff" ||
      user?.role === "jakmas"
    );
  }, [user?.role]);

  useEffect(() => {
    if (!user || isLoadingAuth) return;

    // ❌ ADMIN NEVER GOES TO SETUP
    if (isAdmin) {
      setNeedsSetup(false);
      return;
    }

    // ❌ WAIT FOR VALID USER
    if (!user?.id) return;

    const checkStudent = async () => {
      setCheckingSetup(true);

      try {
        const results = await base44.entities.Student.filter({
          user_id: user.id,
        });

        setNeedsSetup(results.length === 0);
      } catch (err) {
        console.error("Student check failed:", err);
        setNeedsSetup(true);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkStudent();
  }, [user, isLoadingAuth, isAdmin]);

  // LOADING STATE
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

  // AUTH ERROR
  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    }
    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  // ✅ STUDENT SETUP (ONLY NON-ADMINS)
  if (needsSetup && user && !isAdmin) {
    return (
      <StudentSetup
        user={user}
        onComplete={() => {
          setNeedsSetup(false);
          window.location.href = "/";
        }}
      />
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        element={
          <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />
        }
      >
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

      <Route path="*" element={<Navigate to="/" replace />} />
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
  );
}

export default App;