import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await base44.auth.login({
        email,
        password,
      });

      if (!res?.access_token) {
        throw new Error("Login failed");
      }

      // IMPORTANT: set token FIRST
      base44.auth.setToken(res.access_token);
      localStorage.setItem("base44_token", res.access_token);

      // allow auth sync
      await new Promise((r) => setTimeout(r, 300));

      // go dashboard
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Login"
      subtitle="Welcome back"
      footer={
        <p>
          Don't have account?{" "}
          <Link to="/register" className="text-blue-600">
            Register
          </Link>
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
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

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}