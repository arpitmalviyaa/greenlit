export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg border border-white flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-white text-2xl font-bold tracking-tight">Greenlit</span>
          </div>
          <p className="text-zinc-600 text-sm">Contract intelligence for creators</p>
        </div>
        {children}
      </div>
    </div>
  );
}
