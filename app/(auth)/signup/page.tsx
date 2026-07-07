"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { SocialAuth, OrDivider } from "@/components/auth/social-auth";
import { AUTH_CARD, AUTH_FIELD, AUTH_LABEL, AUTH_BTN_PRIMARY } from "@/lib/ui/auth";

export default function SignupPage() {
  const [step, setStep] = useState<"account" | "verify">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    track("signup_start");

    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, marketing_opt_in: marketingOptIn },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) {
        setError(signupError.message === "Failed to fetch" ? "Signup could not reach the service. Check your connection and try again." : signupError.message);
        return;
      }
      if (!data.user) {
        setError("Signup failed. Please try again.");
        return;
      }
      // Profile is created by the handle_new_user trigger. Workspace + role are
      // chosen after email confirmation, in onboarding.
      track("signup_complete");
      setStep("verify");
    } catch {
      setError("Signup could not reach the service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "verify") {
    return (
      <div className={AUTH_CARD}>
        <h1 className="text-xl font-semibold text-white">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-400">
          We sent a confirmation link to <span className="text-white">{email}</span>. Click it to
          activate your account, then sign in.
        </p>
        <Link href="/login" className={`${AUTH_BTN_PRIMARY} mt-6`}>
          Go to sign in
        </Link>
        <p className="mt-4 text-center text-sm text-zinc-500">
          {resendState === "sent" ? (
            "Sent — check your inbox and spam folder."
          ) : resendState === "failed" ? (
            "Could not resend right now. Wait a minute and try again."
          ) : (
            <>
              Didn&apos;t get it?{" "}
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendState === "sending"}
                className="text-white underline underline-offset-2 hover:text-zinc-300"
              >
                {resendState === "sending" ? "Sending…" : "Resend email"}
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={AUTH_CARD}>
      <h1 className="text-xl font-semibold text-white">Create your account</h1>
      <p className="mt-1.5 text-sm text-zinc-500">Get started with Greenlit in a minute.</p>

      <div className="mt-6 space-y-4">
        <SocialAuth onError={setError} />
        <OrDivider />

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white">{error}</div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="name" className={AUTH_LABEL}>Your name</label>
            <input id="name" type="text" placeholder="Rahul Sharma" value={name}
              onChange={(e) => setName(e.target.value)} required className={AUTH_FIELD} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className={AUTH_LABEL}>Email</label>
            <input id="email" type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required className={AUTH_FIELD} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className={AUTH_LABEL}>Password</label>
            <input id="password" type="password" placeholder="Min. 8 characters" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={8} className={AUTH_FIELD} />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 accent-[#1D9E75]" />
            <span className="text-xs leading-relaxed text-zinc-500">
              Send me product updates and the occasional marketing email. We&apos;re against spam too — unsubscribe anytime.
            </span>
          </label>

          <button type="submit" disabled={loading} className={AUTH_BTN_PRIMARY}>
            {loading ? "Creating account…" : "Continue with email"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-zinc-600">
        By continuing you agree to our{" "}
        <Link href="/terms" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300">Terms</Link>{" "}
        and{" "}
        <Link href="/security" className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300">Privacy Policy</Link>.
      </p>

      <p className="mt-5 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-white hover:text-zinc-300">Sign in</Link>
      </p>
    </div>
  );
}
