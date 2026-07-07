"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { AUTH_CARD, AUTH_FIELD, AUTH_LABEL, AUTH_BTN_PRIMARY } from "@/lib/ui/auth";

// One workspace-setup step for every account type. The dropdown picks the role;
// the API sets it and creates the workspace.
const ACCOUNT_TYPES = [
  { value: "agency", label: "Agency" },
  { value: "manager", label: "Talent manager" },
  { value: "creator", label: "Creator" },
  { value: "brand", label: "Brand" },
] as const;

const NAME_PLACEHOLDER: Record<string, string> = {
  agency: "Viral Ventures Agency",
  manager: "Your management name",
  creator: "Your name or handle",
  brand: "Your brand name",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<string>("agency");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/org/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName, account_type: accountType }),
      });
      const data = await res.json() as { error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push(data.redirect ?? "/agency");
      router.refresh();
    } catch {
      setError("Could not create the workspace. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-[#1D9E75] text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            greenlit
          </span>
          <h1 className="mt-4 text-xl font-semibold text-white">Set up your workspace</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Takes 30 seconds. You can change it later.</p>
        </div>

        <div className={AUTH_CARD}>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-white/15 px-3.5 py-2.5 text-sm text-white">{error}</div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="accountType" className={AUTH_LABEL}>I&apos;m a…</label>
              <div className="relative">
                <select
                  id="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className={`${AUTH_FIELD} appearance-none pr-10 cursor-pointer`}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value} className="bg-[#0b0b0c] text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="workspaceName" className={AUTH_LABEL}>Workspace name</label>
              <input
                id="workspaceName"
                type="text"
                placeholder={NAME_PLACEHOLDER[accountType]}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                required
                minLength={2}
                className={AUTH_FIELD}
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Your workspace includes
              </p>
              {[
                "Contract analysis with AI risk scoring",
                "Content compliance checks",
                "A dated record of every check",
                "Rights and exclusivity tracking",
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[#1D9E75] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{feature}</span>
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} className={AUTH_BTN_PRIMARY}>
              {loading ? "Creating workspace…" : "Create workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
