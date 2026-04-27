export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">CloudSourceHRM</h1>
          <p className="text-muted-foreground mt-1">SaaS HRM Platform by SHIRO Technologies</p>
        </div>
        {children}
      </div>
    </div>
  );
}
