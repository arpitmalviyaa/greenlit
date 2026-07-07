"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AUTH_CARD, AUTH_FIELD, AUTH_LABEL, AUTH_BTN_PRIMARY } from "@/lib/ui/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } catch {
      setError("Could not reach the service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={AUTH_CARD}>
        <h1 className="text-xl font-semibold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-400">
          If an account exists for <span className="text-white">{email}</span>, we&apos;ve sent a link
          to reset your password. It expires in an hour.
        </p>
        <Link href="/login" className={`${AUTH_BTN_PRIMARY} mt-6`}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-xl font-semibold text-white">Reset your password</h1>
      <p className="mt-1.5 text-sm text-zinc-500">
        Enter your email and we&apos;ll send you a link to set a new one.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white">{error}</div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="email" className={AUTH_LABEL}>Email</label>
          <input id="email" type="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required className={AUTH_FIELD} />
        </div>
        <button type="submit" disabled={loading} className={AUTH_BTN_PRIMARY}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-zinc-500">
        Remembered it?{" "}
        <Link href="/login" className="text-white hover:text-zinc-300">Sign in</Link>
      </p>
    </div>
  );
}
