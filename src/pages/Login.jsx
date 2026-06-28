import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";

import AdminDashboard from "@/components/dashboard/AdminDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import WardenDashboard from "@/components/dashboard/WardenDashboard";
import JakmasDashboard from "@/components/dashboard/JakmasDashboard";

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // -----------------------------
  // STEP 1: LOCK AUTH UNTIL CONFIRMED
  // -----------------------------
  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      try {
        const u = await base44.auth.me();

        if (!active) return;

        setUser(u || null);
      } catch (err) {
        setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    initAuth();

    return () => {
      active = false;
    };
  }, []);

  // -----------------------------
  // STEP 2: LOAD PROFILE ONLY AFTER AUTH READY
  // -----------------------------
  useEffect(() => {
    if (!authReady || !user) return;

    let active = true;

    const loadProfile = async () => {
      const res = await base44.entities.Student.filter({
        user_id: user.id,
      });

      if (!active) return;

      let p = res?.[0];

      if (!p) {
        p = await base44.entities.Student.create({
          user_id: user.id,
          email: user.email,
          role: "student",
          onboarding_status: "pending",
        });
      }

      setProfile(p);
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [authReady, user]);

  // -----------------------------
  // HARD LOCK (THIS IS WHAT STOPS LOOP)
  // -----------------------------
  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -----------------------------
  // NOT LOGGED IN
  // -----------------------------
  if (!user) {
    return <Login />;
  }

  // -----------------------------
  // PROFILE LOADING LOCK
  // -----------------------------
  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -----------------------------
  // ONBOARDING GATE
  // -----------------------------
  const incomplete =
    !profile.full_name ||
    !profile.phone ||
    !profile.faculty ||
    !profile.room_id;

  if (profile.onboarding_status !== "completed" || incomplete) {
    return <Onboarding user={user} profile={profile} />;
  }

  // -----------------------------
  // DASHBOARD ROUTING
  // -----------------------------
  switch (profile.role) {
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