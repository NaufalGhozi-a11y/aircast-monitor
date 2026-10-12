"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RadioTower, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Enter both username and password.");
      return;
    }

    // Frontend-only mock: no real authentication yet. Any non-empty
    // credentials are accepted so the flow can be wired to a real
    // Laravel/FastAPI auth endpoint later without touching this UI.
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-15 w-15 items-center justify-center rounded-md bg-accent/15 text-accent">
            <img
              src="/svara-logo.png"
              alt="Logo Perusahaan"
              className="h-20 w-20 object-contain"
            />
          </div>
          <div>
            <div className="text-[20px] font-semibold text-base-50">AirCast Monitor</div>
            <div className="text-[12px] text-base-400">Sign in to the operations dashboard</div>
          </div>
        </div>

        <div className="rounded-md border border-base-700 bg-base-900 p-6 shadow-panel">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-[12px] text-status-critical">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-400" />
                <Input
                  id="username"
                  autoComplete="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="mb-1.5 text-[11px] text-accent hover:text-accent-bright"
                  onClick={() => setError("Password reset isn't available in this preview.")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-8 pr-9"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-100"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[12px] text-base-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 accent-accent"
              />
              Keep me signed in
            </label>

            <Button variant="primary" size="md" type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-base-400">
          Preview build — any username and password will sign you in.
        </p>
      </div>
    </div>
  );
}
