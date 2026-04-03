"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Inloggen mislukt. Probeer opnieuw.");
        return;
      }

      const from = searchParams.get("from") ?? "/dashboard";
      router.push(from);
      router.refresh();
    } catch {
      setError("Er is een fout opgetreden. Probeer opnieuw.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-400/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-5">
            <Image
              src="/repp-logo.svg"
              alt="REPP"
              width={64}
              height={64}
              className="object-contain drop-shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">REPP Dashboard</h1>
          <p className="text-blue-300/70 text-sm mt-1">Verkoopintelligentie · Realtimedata</p>
        </div>

        {/* Card */}
        <div className="bg-blue-900/40 border border-blue-700/40 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Inloggen</h2>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-1.5">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@repp.nl"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-blue-950/60 border border-blue-700/50 rounded-lg text-white placeholder-blue-500/50 focus:outline-none focus:border-yellow-400/70 focus:ring-1 focus:ring-yellow-400/50 transition-all text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-1.5">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-blue-950/60 border border-blue-700/50 rounded-lg text-white placeholder-blue-500/50 focus:outline-none focus:border-yellow-400/70 focus:ring-1 focus:ring-yellow-400/50 transition-all text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-yellow-400 hover:bg-yellow-300 disabled:bg-blue-800 disabled:text-blue-500 text-blue-950 font-bold rounded-lg transition-all duration-150 shadow-lg hover:shadow-yellow-400/20 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-blue-950/30 border-t-blue-950 rounded-full animate-spin" />
                  Inloggen…
                </span>
              ) : (
                "Inloggen"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-500/60 text-xs mt-6">
          © {new Date().getFullYear()} REPP · Alleen voor intern gebruik
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
