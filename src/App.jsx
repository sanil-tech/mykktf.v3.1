import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";

import AdminDashboard from "@/components/dashboard/AdminDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import WardenDashboard from "@/components/dashboard/WardenDashboard";
import JakmasDashboard from "@/components/dashboard/JakmasDashboard";

export default function App() {
  // -----------------------------
  // STATES (IMPORTANT: undefined = not loaded yet)
  // -----------------------------
  const [user, setUser] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  // -----------------------------
  // INIT AUTH (NO LOOP POSSIBLE HERE)
  // -----------------------------
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const authUser = await base44.auth.me();

        if (!mounted) return;

        setUser(authUser || null);
      } catch (err) {
        if (!mounted) return;
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // -----------------------------
  // LOAD PROFILE AFTER AUTH READY
  // -----------------------------
  useEffect(() => {
    if (user === undefined || user === null) return;

    let mounted = true;

    const loadProfile = async () => {
      try {
        const res = await base44.entities.Student.filter({
          user_id: user.id,
        });

        if (!mounted) return;

        let p = res?.[0];

        // AUTO CREATE PROFILE IF MISSING
        if (!p) {
          p = await base44.entities.Student.create({
            user_id: user.id,
            email: user.email,
            role: "student",
            onboarding_status: "pending",
          });
        }

        setProfile(p);
      } catch (err) {
        console.error("Profile load error:", err);
        setProfile(null);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [user]);

  // -----------------------------
  // LOADING STATE (CRITICAL)
  // -----------------------------
  if (loading || user === undefined || profile === undefined) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -----------------------------
  // NOT LOGGED IN → LOGIN PAGE
  // -----------------------------
  if (!user) {
    return <Login />;
  }

  // -----------------------------
  // ONBOARDING CHECK (SAFE GATE)
  // -----------------------------
  const isIncomplete =
    !profile?.full_name ||
    !profile?.phone ||
    !profile?.faculty ||
    !profile?.room_id;

  const needsOnboarding =
    profile?.onboarding_status !== "completed" || isIncomplete;

  if (needsOnboarding) {
    return <Onboarding user={user} profile={profile} />;
  }

  // -----------------------------
  // ROLE ROUTING (FINAL SAFE STEP)
  // -----------------------------
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
}