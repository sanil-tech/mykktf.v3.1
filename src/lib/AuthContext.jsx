import React, { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [user, setUser] = useState(null); // merged final user

  const [loading, setLoading] = useState(true);

  // -------------------------
  // LOAD USER (SINGLE SOURCE)
  // -------------------------
  const loadUser = async () => {
    try {
      setLoading(true);

      const auth = await base44.auth.me();

      const students = await base44.entities.Student.filter({
        user_id: auth.id,
      });

      const profile = students?.[0] || null;

      setAuthUser(auth);
      setStudent(profile);

      // FINAL MERGED USER (IMPORTANT)
      setUser({
        id: auth.id,
        email: auth.email,
        role: profile.role,
        ...profile,
      });
    } catch (err) {
      console.error("Auth load failed:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  // -------------------------
  // REFRESH AFTER PROFILE UPDATE
  // -------------------------
  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,        // 👈 USE THIS EVERYWHERE
        authUser,
        student,
        loading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);