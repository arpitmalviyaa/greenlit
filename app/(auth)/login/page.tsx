"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Fetch profile to determine redirect
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done")
      .eq("id", data.user.id)
      .single();

    if (!profile) {
      router.push("/signup");
      return;
    }

    const destinations: Record<string, string> = {
      agency_admin: profile.onboarding_done ? "/agency" : "/agency/onboarding",
      creator: "/creator",
      manager: "/manager",
      brand: "/brand",
    };

    router.push(destinations[profile.role] ?? "/");
    router.refresh();
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur text-white">
      <CardHeader>
        <CardTitle className="text-white">Sign in</CardTitle>
        <CardDescription className="text-slate-400">
          Enter your credentials to access your workspace
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@agency.com"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            variant="greenlit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-slate-400 text-center">
            New agency?{" "}
            <Link href="/signup" className="text-green-400 hover:text-green-300">
              Create your workspace
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
