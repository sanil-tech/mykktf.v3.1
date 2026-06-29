import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Loader2 } from "lucide-react";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import AuthLayout from "@/components/AuthLayout";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  // STEP 1: REGISTER
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP
  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await base44.auth.verifyOtp({
        email,
        otpCode,
      });

      if (!result?.access_token) {
        throw new Error("Invalid OTP");
      }

      // 1. SET TOKEN FIRST (IMPORTANT FIX FOR 401)
      base44.auth.setToken(result.access_token);
      localStorage.setItem("base44_token", result.access_token);

      // 2. WAIT A MOMENT FOR AUTH STATE TO SYNC
      await new Promise((r) => setTimeout(r, 300));

      // 3. FORCE ROLE = STUDENT
      await base44.auth.updateMe({
        role: "student",
      });

      // 4. GET USER (NOW SAFE)
      const me = await base44.auth.me();

      // 5. CREATE STUDENT PROFILE ONLY IF NOT EXISTS
      const existing = await base44.entities.Student.filter({
        user_id: me.id,
      });

      if (existing.length === 0) {
        await base44.entities.Student.create({
          user_id: me.id,
          email: me.email,
          status: "Registered",
          profile_completed: false,
          onboarding_step: "welcome",
        });
      }

      toast({
        title: "Account created",
        description: "Welcome! Please complete your profile.",
      });

      // 6. REDIRECT CLEANLY
      window.location.replace("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // RESEND OTP
  const handleResend = async () => {
    try {
      await base44.auth.resendOtp(email);

      toast({
        title: "Code sent",
        description: "Check your email.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  // OTP SCREEN
  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-6">
          <InputOTP value={otpCode} onChange={setOtpCode} maxLength={6}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button
          className="w-full"
          disabled={loading || otpCode.length < 6}
          onClick={handleVerify}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>

        <p className="text-center text-sm mt-4">
          Didn’t get code?{" "}
          <button className="text-blue-600 underline" onClick={handleResend}>
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  // REGISTER SCREEN
  return (
    <AuthLayout
      icon={UserPlus}
      title="Create account"
      subtitle="Sign up to continue"
      footer={
        <p>
          Already have account?{" "}
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Confirm Password</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}