"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function AgencyOnboardingPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/org/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agencyName }),
    });

    const data = await res.json() as { error?: string; organisation?: { id: string } };

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    router.push("/agency");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="text-white text-3xl font-bold">Greenlit</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Set up your agency</h1>
          <p className="text-slate-400 mt-2">
            This takes 30 seconds. You can change everything later.
          </p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardHeader>
            <CardTitle className="text-white">Agency details</CardTitle>
            <CardDescription className="text-slate-400">
              What should we call your workspace?
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleCreate}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-900/50 border border-red-700 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="agencyName" className="text-slate-300">Agency name</Label>
                <Input
                  id="agencyName"
                  type="text"
                  placeholder="Viral Ventures Agency"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  required
                  minLength={2}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="rounded-lg bg-slate-900/50 border border-slate-700 p-4 space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Your workspace includes
                </p>
                {[
                  "Contract analysis with AI risk scoring",
                  "Content compliance scanner (15 checkers)",
                  "Approval vault with evidence hashing",
                  "Creator rights and exclusivity tracker",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="greenlit" className="w-full" disabled={loading}>
                {loading ? "Creating workspace…" : "Create workspace →"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
