"use client";

// Provider buttons must match the providers actually enabled in Supabase.
// Google is currently enabled in production; Apple stays hidden until its
// dashboard credentials exist and NEXT_PUBLIC_APPLE_AUTH_ENABLED=true is set.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon, AppleIcon } from "@/components/ui/brand-icons";
import { AUTH_BTN_OUTLINE } from "@/lib/ui/auth";

export function SocialAuth({ onError }: { onError?: (msg: string) => void }) {
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);

  async function signIn(provider: "google" | "apple") {
    setBusy(provider);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        const label = provider === "google" ? "Google" : "Apple";
        onError?.(
          /not enabled|unsupported|provider/i.test(error.message)
            ? `${label} sign-in is coming soon. Use your email for now.`
            : error.message
        );
        setBusy(null);
      }
      // On success the browser redirects to the provider — no reset needed.
    } catch {
      onError?.("Could not reach the sign-in service. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2.5">
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false" && (
        <button type="button" onClick={() => signIn("google")} disabled={busy !== null} className={AUTH_BTN_OUTLINE}>
          <GoogleIcon />
          {busy === "google" ? "Connecting…" : "Continue with Google"}
        </button>
      )}
      {process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true" && (
        <button type="button" onClick={() => signIn("apple")} disabled={busy !== null} className={AUTH_BTN_OUTLINE}>
          <AppleIcon />
          {busy === "apple" ? "Connecting…" : "Continue with Apple"}
        </button>
      )}
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-xs uppercase tracking-widest text-zinc-600">or</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
