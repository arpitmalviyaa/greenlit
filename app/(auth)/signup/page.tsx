"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { JURISDICTIONS, type JurisdictionCode } from "@/lib/utils/jurisdictions";
import { cn } from "@/lib/utils/cn";

type Step = "account" | "jurisdiction" | "verify";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // IN always pre-selected and locked
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<Set<JurisdictionCode>>(new Set<JurisdictionCode>(["IN"]));

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // Profile row is created by the handle_new_user trigger on auth.users INSERT.
    // Do not insert here — there is no session until email is confirmed, so
    // auth.uid() would be null and RLS would reject the insert.

    setLoading(false);
    setStep("jurisdiction");
  }

  async function handleJurisdictionContinue() {
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // Logged in — create org now with jurisdiction codes
      const codes = Array.from(selectedJurisdictions);
      try {
        const resp = await fetch("/api/org/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() || "My Agency", jurisdiction_codes: codes }),
        });
        if (!resp.ok) {
          const d = await resp.json() as { error?: string };
          setError(d.error ?? "Failed to continue");
          setLoading(false);
          return;
        }
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/agency/onboarding");
      router.refresh();
    } else {
      // Email confirm required — advance to verify step
      setStep("verify");
      setLoading(false);
    }
  }

  function toggleJurisdiction(code: JurisdictionCode) {
    if (code === "IN") return; // locked
    setSelectedJurisdictions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  if (step === "verify") {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur text-white">
        <CardHeader>
          <CardTitle className="text-white">Check your email</CardTitle>
          <CardDescription className="text-slate-400">
            We sent a confirmation link to <strong className="text-white">{email}</strong>.
            Click it to activate your account, then sign in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full border-slate-600 text-slate-300">
              Go to sign in
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (step === "jurisdiction") {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur text-white w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-white">Choose your jurisdictions</CardTitle>
          <CardDescription className="text-slate-400">
            India is always included. Select any additional live jurisdictions your agency operates in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {JURISDICTIONS.map((j) => {
              const isSelected = selectedJurisdictions.has(j.code);
              const isLocked = j.code === "IN";
              const isComingSoon = j.status === "coming_soon";

              return (
                <button
                  key={j.code}
                  type="button"
                  onClick={() => !isComingSoon && toggleJurisdiction(j.code)}
                  disabled={isComingSoon || isLocked}
                  className={cn(
                    "relative text-left rounded-lg border p-3 transition-colors",
                    isComingSoon
                      ? "border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed"
                      : isSelected
                      ? "border-green-500 bg-green-900/20 cursor-pointer"
                      : "border-slate-600 bg-slate-800/50 hover:border-slate-500 cursor-pointer"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{j.flag}</span>
                      <span className="font-medium text-white text-sm">{j.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLocked && (
                        <span className="text-xs bg-green-800 text-green-300 rounded px-1.5 py-0.5">
                          Included
                        </span>
                      )}
                      {isComingSoon && (
                        <span className="text-xs bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">
                          Coming Soon
                        </span>
                      )}
                      {!isLocked && !isComingSoon && (
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center",
                          isSelected ? "bg-green-500 border-green-500" : "border-slate-500"
                        )}>
                          {isSelected && <span className="text-black text-xs font-bold">✓</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">{j.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="greenlit"
            className="w-full"
            onClick={handleJurisdictionContinue}
            disabled={loading}
          >
            {loading ? "Setting up…" : "Continue →"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur text-white">
      <CardHeader>
        <CardTitle className="text-white">Create your agency workspace</CardTitle>
        <CardDescription className="text-slate-400">
          You&apos;ll set up your agency name and details next
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Your name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="rahul@youragency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" variant="greenlit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-sm text-slate-400 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-green-400 hover:text-green-300">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
