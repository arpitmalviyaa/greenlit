// Shared auth/onboarding styling tokens. One source of truth so every input,
// select, card and button in the sign-in surface is visually identical.
// Dark, minimalist. Tailwind scans lib/**, so class strings here are picked up.

export const AUTH_CARD =
  "w-full rounded-2xl border border-white/10 bg-[#0b0b0c] p-7 sm:p-8";

export const AUTH_FIELD =
  "flex h-11 w-full rounded-lg border border-white/12 bg-white/[0.03] px-3.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20 disabled:opacity-50";

export const AUTH_LABEL = "text-sm text-zinc-400";

// Primary action — white on black.
export const AUTH_BTN_PRIMARY =
  "flex h-11 w-full items-center justify-center rounded-lg bg-white text-sm font-medium text-black transition-colors hover:bg-zinc-200 disabled:opacity-50";

// Secondary / OAuth — outlined, still white text.
export const AUTH_BTN_OUTLINE =
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-white/12 bg-white/[0.02] text-sm font-medium text-white transition-colors hover:bg-white/[0.06] disabled:opacity-50";
