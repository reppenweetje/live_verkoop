import Link from "next/link";
import Image from "next/image";
import { User } from "lucide-react";
import { getAuthUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  return (
    <div className="min-h-screen bg-blue-950">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-blue-950/95 backdrop-blur border-b border-yellow-400/10">
        <div className="mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-yellow-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Image
                src="/repp-logo.svg"
                alt="REPP"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">REPP</span>
          </Link>

          {/* Right: User + Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-800/50 border border-blue-700/40">
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                <User size={13} className="text-blue-950" />
              </div>
              <span className="text-sm text-white font-medium">
                {user?.name ?? user?.email ?? "Gebruiker"}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="relative">{children}</main>
    </div>
  );
}
