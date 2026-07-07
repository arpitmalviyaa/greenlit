"use client";

// Landed here from the recovery link (session is live). Set a new password.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AUTH_CARD, AUTH_FIELD, AUTH_LABEL, AUTH_BTN_PRIMARY } from "@/lib/ui/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Confirm a recovery session exists; if not, the link was bad or expired.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setError("This reset link is invalid or has expired. Request a new one.");
      }
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      router.push("/login?reset=1");
    } catch {
      setError("Could not update your password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-xl font-semibold text-white">Set a new password</h1>
      <p className="mt-1.5 text-sm text-zinc-500">Choose a new password for your account.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white">
            {error}
            {ready && /expired|invalid/.test(error) && (
              <div className="mt-2">
                <Link href="/forgot-password" className="underline text-white hover:text-zinc-300">
                  Request a new link
                </Link>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="password" className={AUTH_LABEL}>New password</label>
          <input id="password" type="password" placeholder="Min. 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={8} className={AUTH_FIELD} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm" className={AUTH_LABEL}>Confirm password</label>
          <input id="confirm" type="password" placeholder="Re-enter password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required minLength={8} className={AUTH_FIELD} />
        </div>
        <button type="submit" disabled={loading} className={AUTH_BTN_PRIMARY}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
