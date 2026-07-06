export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <span className="text-[#1D9E75] text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            greenlit
          </span>
          <p className="text-zinc-500 text-sm mt-2">Contract intelligence for the creator economy</p>
        </div>
        {children}
      </div>
    </div>
  );
}
