import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Crown, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginAsMapekGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Highlight or activate VIP card if secret query parameter is present (e.g. /login?demo=mapek)
  const isMapekUrl = searchParams.get('demo') === 'mapek' || searchParams.get('guest') === '1' || searchParams.get('mapek') === '1';
  // Master toggle: Set VITE_ENABLE_MAPEK_GUEST=false in .env to disable anytime
  const isGuestDemoEnabled = import.meta.env.VITE_ENABLE_MAPEK_GUEST !== 'false';

  const handleGuestLogin = () => {
    loginAsMapekGuest();
    sessionStorage.setItem('mapek_has_visited_guide', 'true');
    navigate('/guide');
  };

  // Instant one-tap link support: e.g. /login?demo=mapek&direct=1
  useEffect(() => {
    if (isGuestDemoEnabled && isMapekUrl && (searchParams.get('direct') === '1' || searchParams.get('auto') === '1')) {
      handleGuestLogin();
    }
  }, [isMapekUrl, isGuestDemoEnabled, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Selamat Kembali"
      subtitle="Log masuk ke portal rasmi MyKKTF"
      footer={
        <>
          Belum mempunyai akaun?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Daftar akaun baharu
          </Link>
        </>
      }
    >
      {/* 👑 VIP Guest Showcase Entry for Majlis Pengetua MAPEK */}
      {isGuestDemoEnabled && (
        <div className={`mb-6 p-4 rounded-2xl border-2 transition-all duration-300 ${
          isMapekUrl 
            ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40 shadow-lg' 
            : 'border-amber-400/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-sm'
        }`}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/80 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-sm shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Akses Demonstrasi Khas MAPEK
                </h4>
                <span className="bg-amber-400/30 text-amber-800 dark:text-amber-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                  VIP
                </span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-none mt-0.5">
                Majlis Pengetua Kolej Kediaman Universiti Awam
              </p>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Terokai fungsi eksekutif Pengetua Kolej (Dashboard Real-time, Imbasan Pas Residen QR, Transkrip Merit Ber-QR & Hab Hotline 24/7).
          </p>

          <Button
            type="button"
            onClick={handleGuestLogin}
            className="w-full h-11 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold text-xs gap-2 rounded-xl shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Crown className="w-4 h-4" />
            <span>Masuk Sebagai Pengetua Jemputan (Tanpa Kata Laluan)</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </div>
      )}

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Log Masuk dengan Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}