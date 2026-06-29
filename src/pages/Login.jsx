import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
  const errs = validateStep(3);
  if (Object.keys(errs).length > 0) {
    setErrors(errs);
    return;
  }

  setSaving(true);

  try {
    const payload = {
      ...form,
      year_of_study: Number(form.year_of_study),
      email: form.email || user?.email,
      user_id: user?.id,
      status: "Registered",
      profile_completed: true,
      onboarding_step: "completed",
    };

    console.log("Submitting Student:", payload);

    await base44.entities.Student.create(payload);

    await base44.auth.updateMe({
      role: "student",
    });

    onComplete();
  } catch (err) {
    console.error("Student setup error:", err);
    alert(err?.message || "Failed to save profile");
  } finally {
    setSaving(false);
  }
}
}
