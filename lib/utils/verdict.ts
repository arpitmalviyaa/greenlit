// Shared 3-level verdict language + colors (calm commercial tone, 1.4 spec).
export type Verdict = "safe" | "negotiate" | "hold";

export function verdictFromRisk(score: number | null | undefined): Verdict {
  const s = Number(score ?? 0);
  if (s >= 70) return "hold";
  if (s >= 35) return "negotiate";
  return "safe";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  safe: "Looks safe to proceed",
  negotiate: "Worth negotiating first",
  hold: "Hold — material issues",
};

export const VERDICT_CHIP: Record<Verdict, string> = {
  safe: "bg-[#1D9E75]/10 text-[#157A5B] border-[#1D9E75]/30",
  negotiate: "bg-amber-50 text-amber-800 border-amber-300",
  hold: "bg-red-50 text-red-800 border-red-200",
};

export const VERDICT_BAND: Record<Verdict, string> = {
  safe: "bg-[#1D9E75]/10 border-[#1D9E75]/40",
  negotiate: "bg-amber-50 border-amber-300",
  hold: "bg-red-50 border-red-300",
};
