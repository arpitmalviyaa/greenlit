export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-[#1D9E75] text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            greenlit
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
