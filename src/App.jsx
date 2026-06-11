import { Toaster } from "@/components/ui/toaster"
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
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
        </Route>
      </Route>

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

export default App