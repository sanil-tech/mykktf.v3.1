import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";

import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import WardenDashboard from "@/components/dashboard/WardenDashboard";
import JakmasDashboard from "@/components/dashboard/JakmasDashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // LOAD AUTH + PROFILE
  // -------------------------
  useEffect(() => {
    const init = async () => {
      try {
        const auth = await base44.auth.me();
        setUser(auth);

        if (!auth) {
          setLoading(false);
          return;
        }

        // IMPORTANT: ONLY USE user_id (no email fallback)
        let students = await base44.entities.Student.filter({
          user_id: auth.id,
        });

        let p = students?.[0];

        // auto-create profile if missing
        if (!p) {
          p = await base44.entities.Student.create({
            user_id: auth.id,
            email: auth.email,
            role: "student",
            onboarding_status: "pending",
          });
        }

        setProfile(p);
      } catch (err) {
        console.error("App init error:", err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // -------------------------
  // LOADING STATE
  // -------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -------------------------
  // NOT LOGGED IN → LOGIN
  // -------------------------
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // -------------------------
  // ONBOARDING CHECK (GLOBAL GATE)
  // -------------------------
  const isIncomplete =
    !profile?.full_name ||
    !profile?.phone ||
    !profile?.faculty ||
    !profile?.room_id;

  const needsOnboarding =
    profile?.onboarding_status !== "completed" || isIncomplete;

  // -------------------------
  // ROLE DASHBOARD SELECTOR
  // -------------------------
  const getDashboard = () => {
    const role = profile?.role || "student";

    switch (role) {
      case "admin":
        return <AdminDashboard user={user} profile={profile} />;
      case "warden":
        return <WardenDashboard user={user} profile={profile} />;
      case "jakmas":
        return <JakmasDashboard user={user} profile={profile} />;
      default:
        return <StudentDashboard user={user} profile={profile} />;
    }
  };

  // -------------------------
  // MAIN APP ROUTER
  // -------------------------
  return (
    <BrowserRouter>
      <Routes>

        {/* ONBOARDING GATE (HIGHEST PRIORITY) */}
        {needsOnboarding ? (
          <>
            <Route path="/onboarding" element={<Onboarding user={user} profile={profile} />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </>
        ) : (
          <>
            {/* MAIN DASHBOARD */}
            <Route path="/" element={getDashboard()} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}

      </Routes>
    </BrowserRouter>
  );
}