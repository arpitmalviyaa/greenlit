// Shown instantly on navigation while the server auth-gate + first render
// resolve, so opening Corpus never feels like a dead click.
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
        <div className="mt-6 flex gap-2">
          {[64, 56, 72, 60, 80].map((w, i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
