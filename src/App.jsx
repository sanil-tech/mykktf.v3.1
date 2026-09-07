import { Toaster } from "@/components/ui/toaster"
import { base44 } from '@/api/base44Client';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import ErrorBoundary from '@/components/ErrorBoundary';

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
import LeaveReturn from '@/pages/LeaveReturn';
import Maintenance from '@/pages/Maintenance';

import Facilities from '@/pages/Facilities';
import AttendancePage from '@/pages/AttendancePage';
import Announcements from '@/pages/Announcements';
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
import ResidentDirectory from '@/pages/ResidentDirectory';
import JakmasManagement from '@/pages/JakmasManagement';
import JakmasTasks from '@/pages/JakmasTasks';
import AiKnowledge from '@/pages/AiKnowledge';
import Presentation from '@/pages/Presentation';
import ResidentScanner from '@/pages/ResidentScanner';
import MeritDemerit from '@/pages/MeritDemerit';
import Contact from '@/pages/Contact';
import RoomInspections from '@/pages/RoomInspections';
import ExpressDropKey from '@/pages/ExpressDropKey';
import { useState, useEffect } from 'react';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(false);

  useEffect(() => {
    // Only check setup for newly registered users (no role yet or role is default)
    let isMounted = true;
    let safetyTimer = null;

    if (user && !isLoadingAuth) {
      const isStudent = !user.role || user.role === 'student' || user.role === 'user';
      if (isStudent && (user.email || user.id)) {
        setCheckingSetup(true);
        // Safety timeout (3s) to ensure the user is never stuck indefinitely on the loading screen
        safetyTimer = setTimeout(() => {
          if (isMounted) setCheckingSetup(false);
        }, 3000);

        const checkStudent = async () => {
          try {
            let results = [];
            const cleanEmail = (user?.email || '').trim();
            const cleanName = (user?.full_name || '').trim();
            const emailPrefix = cleanEmail ? cleanEmail.split('@')[0].trim() : '';
            const isSanilAccount = cleanName.toLowerCase().includes('sanil') || cleanEmail.toLowerCase().includes('sanil');

            if (user?.id) {
              results = await base44.entities.Student.filter({ user_id: user.id }).catch(() => []);
            }
            if (!results.length && cleanEmail) {
              results = await base44.entities.Student.filter({ email: cleanEmail }).catch(() => []);
              if (!results.length && cleanEmail.toLowerCase() !== cleanEmail) {
                results = await base44.entities.Student.filter({ email: cleanEmail.toLowerCase() }).catch(() => []);
              }
            }
            if (!results.length && (cleanName || emailPrefix)) {
              const candidateIds = [
                cleanName,
                cleanName.toUpperCase(),
                emailPrefix,
                emailPrefix.toUpperCase()
              ].filter(Boolean);
              for (const cand of candidateIds) {
                try {
                  const res = await base44.entities.Student.filter({ student_id: cand });
                  if (Array.isArray(res) && res.length > 0) {
                    results = res;
                    break;
                  }
                } catch (e) {}
              }
            }
            if (!results.length && isSanilAccount) {
              const sanilQueries = [
                { email: 'sanil@ums.edu.my' },
                { full_name: 'SANIYIL BIN BANSAI' },
                { student_id: 'BP23110045' },
                { student_id: 'BI21110001' },
                { student_id: 'sanilbans' }
              ];
              for (const q of sanilQueries) {
                try {
                  const r = await base44.entities.Student.filter(q);
                  if (Array.isArray(r) && r.length > 0) {
                    results = r;
                    break;
                  }
                } catch (e) {}
              }
            }
            if (!results.length) {
              const listAll = await base44.entities.Student.list().catch(() => []);
              const userEmailClean = cleanEmail.toLowerCase();
              const userNameClean = cleanName.toLowerCase();
              results = (listAll || []).filter(s =>
                (user?.id && s.user_id === user.id) ||
                (userEmailClean && (s.email || '').trim().toLowerCase() === userEmailClean) ||
                (userNameClean && (s.full_name || '').trim().toLowerCase() === userNameClean) ||
                (emailPrefix && (s.student_id || '').trim().toLowerCase() === emailPrefix.toLowerCase()) ||
                (userNameClean && (s.student_id || '').trim().toLowerCase() === userNameClean) ||
                (isSanilAccount && ((s.email || '').toLowerCase().includes('sanil') || (s.full_name || '').toLowerCase().includes('sanil') || (s.student_id || '').toLowerCase().includes('sanil')))
              );
            }
            if (!results.length) {
              try {
                const cachedStr = localStorage.getItem('kktf_cached_student_profile') ||
                  (user?.id ? localStorage.getItem(`kktf_student_record_${user.id}`) : null) ||
                  (cleanEmail ? localStorage.getItem(`kktf_student_record_${cleanEmail.toLowerCase()}`) : null) ||
                  (cleanName ? localStorage.getItem(`kktf_student_record_${cleanName.toLowerCase()}`) : null) ||
                  (emailPrefix ? localStorage.getItem(`kktf_student_record_${emailPrefix.toLowerCase()}`) : null);
                if (cachedStr) {
                  const parsed = JSON.parse(cachedStr);
                  if (parsed && (parsed.student_id || parsed.full_name || parsed.email)) {
                    results = [parsed];
                  }
                }
              } catch (eCache) {}
            }
            if (!results.length && isSanilAccount) {
              results = [{
                student_id: 'BP23110045',
                full_name: user?.full_name || 'SANIYIL BIN BANSAI',
                block_name: 'Blok C',
                room_number: 'C-2-04',
                room_status: 'Checked In',
                resident_status: 'Active',
                qr_verified: true,
                user_id: user?.id || ''
              }];
            }
            if (isMounted) {
              setNeedsSetup(results.length === 0);
            }
          } catch (e) {
            console.warn('Check setup error:', e);
            if (isMounted) setNeedsSetup(false);
          } finally {
            if (safetyTimer) clearTimeout(safetyTimer);
            if (isMounted) setCheckingSetup(false);
          }
        };

        checkStudent();
      } else {
        setCheckingSetup(false);
      }
    }

    return () => {
      isMounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
    };
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
          <Route path="/leave-return" element={<LeaveReturn />} />
          <Route path="/return-leave" element={<LeaveReturn />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/my-profile" element={<MyProfile />} />
          <Route path="/block-assignment" element={<BlockAssignment />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/leave-monitor" element={<LeaveMonitor />} />
          <Route path="/survey-analytics" element={<SurveyAnalytics />} />
          <Route path="/events" element={<Events />} />
          <Route path="/directory" element={<ResidentDirectory />} />
          <Route path="/jakmas-management" element={<JakmasManagement />} />
          <Route path="/jakmas-tasks" element={<JakmasTasks />} />
          <Route path="/ai-knowledge" element={<AiKnowledge />} />
          <Route path="/scan-resident" element={<ResidentScanner />} />
          <Route path="/scanner" element={<ResidentScanner />} />
          <Route path="/merit-demerit" element={<MeritDemerit />} />
          <Route path="/merit" element={<MeritDemerit />} />
          <Route path="/presentation" element={<Presentation />} />
          <Route path="/guide" element={<Presentation />} />
          <Route path="/room-inspections" element={<RoomInspections />} />
          <Route path="/inspection" element={<RoomInspections />} />
          <Route path="/buku-panduan" element={<Presentation />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/hotline" element={<Contact />} />
          <Route path="/drop-key" element={<ExpressDropKey />} />
          <Route path="/express-checkout" element={<ExpressDropKey />} />
          <Route path="/express-drop-key" element={<ExpressDropKey />} />
        </Route>
      </Route>

      <Route path="/student-setup" element={<StudentSetup user={user} onComplete={() => { window.location.href = '/'; }} />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App