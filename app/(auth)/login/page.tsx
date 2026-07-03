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

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === "Failed to fetch" ? "Login could not reach the auth service. Please check your connection and try again." : authError.message);
        return;
      }

      if (!data.user) {
        setError("Login failed. Please try again.");
        return;
      }

      const { data: platformAdmin } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (platformAdmin) {
        router.push("/master");
        router.refresh();
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
    } catch {
      setError("Login could not reach the auth service. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-white/15 bg-black text-white shadow-none">
      <CardHeader>
        <CardTitle className="text-white">Sign in</CardTitle>
        <CardDescription className="text-zinc-500">
          Enter your credentials to access your workspace
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-white/30 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-white/15 bg-black text-white placeholder:text-zinc-700 focus-visible:ring-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="border-white/15 bg-black text-white placeholder:text-zinc-700 focus-visible:ring-white"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-zinc-200"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-sm text-zinc-600 text-center">
            New agency?{" "}
            <Link href="/signup" className="text-white hover:text-zinc-300">
              Create your workspace
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
