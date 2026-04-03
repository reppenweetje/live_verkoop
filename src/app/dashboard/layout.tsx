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
    <div className="min-h-screen" style={{ background: "#0f0f70" }}>
      {/* Topnav */}
      <nav
        className="sticky top-0 z-40"
        style={{
          background: "rgba(15, 15, 112, 0.96)",
          borderBottom: "1px solid rgba(237, 255, 0, 0.1)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: "#edff00" }}
            >
              <Image
                src="/repp-logo.svg"
                alt="REPP"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            <span
              className="text-lg font-bold text-white tracking-widest uppercase"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              REPP
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(27, 35, 170, 0.5)", border: "1px solid rgba(27, 35, 170, 0.7)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "#edff00" }}
              >
                <User size={13} style={{ color: "#0f0f70" }} />
              </div>
              <span className="text-sm text-white font-medium" style={{ fontFamily: "'Montserrat', sans-serif" }}>
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
