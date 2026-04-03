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
    <div
      className="min-h-screen flex items-center justify-center px-4 diamond-pattern"
      style={{ background: "linear-gradient(160deg, #0f0f70 0%, #0a0a55 50%, #0f0f70 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(27,35,170,0.4)" }} />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: "rgba(237,255,0,0.04)" }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/repp-logo.svg"
              alt="REPP"
              width={56}
              height={56}
              className="object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <h1
            className="text-3xl font-bold tracking-tight text-white uppercase"
            style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.12em" }}
          >
            REPP
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#d8d6d6" }}>
            Real Estate Performance Partner
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(27, 35, 170, 0.22)",
            border: "1px solid rgba(237, 255, 0, 0.12)",
            backdropFilter: "blur(20px)",
          }}
        >
          <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            Inloggen
          </h2>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "#d8d6d6" }}>
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
                className="w-full px-4 py-3 rounded-lg text-white text-sm transition-all outline-none"
                style={{
                  background: "rgba(15, 15, 112, 0.6)",
                  border: "1px solid rgba(27, 35, 170, 0.6)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(237,255,0,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(27,35,170,0.6)"; }}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "#d8d6d6" }}>
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
                className="w-full px-4 py-3 rounded-lg text-white text-sm transition-all outline-none"
                style={{
                  background: "rgba(15, 15, 112, 0.6)",
                  border: "1px solid rgba(27, 35, 170, 0.6)",
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(237,255,0,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(27,35,170,0.6)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-bold text-sm transition-all duration-150 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? "rgba(237,255,0,0.6)" : "#edff00",
                color: "#0f0f70",
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-midnite/30 border-t-midnite rounded-full animate-spin" style={{ borderTopColor: "#0f0f70" }} />
                  Inloggen…
                </span>
              ) : (
                "Inloggen"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(216,214,214,0.4)" }}>
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
