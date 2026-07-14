"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SocialAuth, OrDivider } from "@/components/auth/social-auth";
import { AUTH_CARD, AUTH_FIELD, AUTH_LABEL, AUTH_BTN_PRIMARY, AUTH_NOTICE, AUTH_ERROR } from "@/lib/ui/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmed") === "1") {
      setNotice("Email confirmed — you can sign in now.");
    } else if (params.get("reset") === "1") {
      setNotice("Password updated — sign in with your new password.");
    } else if (params.get("error") === "confirm_link_expired") {
      setNotice("That confirmation link has expired. Sign in below to request a fresh one.");
    } else if (params.get("error") === "confirm_link_invalid") {
      setNotice("That confirmation link looks incomplete. Sign in below to request a fresh one.");
    }
  }, []);

  async function handleResendConfirmation() {
    setResendState("sending");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResendState(resendError ? "failed" : "sent");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setShowResend(false);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        if (/email not confirmed/i.test(authError.message)) {
          setError("Your email address hasn't been confirmed yet.");
          setShowResend(true);
        } else {
          setError(authError.message === "Failed to fetch" ? "Login could not reach the service. Check your connection and try again." : authError.message);
        }
        return;
      }
      if (!data.user) {
        setError("Login failed. Please try again.");
        return;
      }

      const { data: platformAdmin } = await supabase
        .from("platform_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
      if (platformAdmin) {
        router.push("/master");
        router.refresh();
        return;
      }

      const { data: profile } = await supabase
        .from("profiles").select("role, onboarding_done").eq("id", data.user.id).single();
      if (!profile) {
        router.push("/signup");
        return;
      }

      const destinations: Record<string, string> = {
        agency_admin: profile.onboarding_done ? "/agency" : "/onboarding",
        creator: profile.onboarding_done ? "/creator" : "/onboarding",
        manager: profile.onboarding_done ? "/manager" : "/onboarding",
        brand: profile.onboarding_done ? "/brand" : "/onboarding",
      };
      router.push(destinations[profile.role] ?? "/");
      router.refresh();
    } catch {
      setError("Login could not reach the service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-xl font-semibold text-white">Sign in</h1>
      <p className="mt-1.5 text-sm text-zinc-500">Welcome back to Greenlit.</p>

      <div className="mt-6 space-y-4">
        <SocialAuth onError={setError} />
        <OrDivider />

        <form onSubmit={handleLogin} className="space-y-4">
          {notice && !error && (
            <div className={AUTH_NOTICE}>{notice}</div>
          )}
          {error && (
            <div className={AUTH_ERROR}>
              {error}
              {showResend && (
                <div className="mt-2">
                  {resendState === "sent" ? (
                    <span className="text-zinc-400">Confirmation email sent — check your inbox.</span>
                  ) : resendState === "failed" ? (
                    <span className="text-zinc-400">Could not resend right now. Try again in a minute.</span>
                  ) : (
                    <button type="button" onClick={handleResendConfirmation} disabled={resendState === "sending"}
                      className="underline text-white hover:text-zinc-300">
                      {resendState === "sending" ? "Sending…" : "Resend confirmation email"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className={AUTH_LABEL}>Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required className={AUTH_FIELD} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className={AUTH_LABEL}>Password</label>
              <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-300">
                Forgot password?
              </Link>
            </div>
            <input id="password" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required className={AUTH_FIELD} />
          </div>
          <button type="submit" disabled={loading} className={AUTH_BTN_PRIMARY}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-zinc-500">
        New to Greenlit?{" "}
        <Link href="/signup" className="text-white hover:text-zinc-300">Create an account</Link>
      </p>
    </div>
  );
}
