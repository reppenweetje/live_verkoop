"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { Building2, BarChart3, Users, Radio, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";

const SLUG_TO_LOGO: Record<string, string> = {
  "de-hofman": "/logos/de-hofman.svg",
  depaveri:    "/logos/depaveri.svg",
  elster11:    "/logos/elster11.svg",
  "6th-grid":  "/logos/elster11.svg",
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const projectDisplayName = projectId.toUpperCase().replace(/-/g, " ");
  const logo = SLUG_TO_LOGO[projectId];

  const navItems = [
    { label: "Verkoopvoortgang", href: `/dashboard/${projectId}/verkoopvoortgang`, icon: TrendingUp, segment: "verkoopvoortgang", highlight: true },
    { label: "Units",            href: `/dashboard/${projectId}/units`,            icon: Building2,  segment: "units" },
    { label: "Analytics",        href: `/dashboard/${projectId}/analytics`,        icon: BarChart3,  segment: "analytics" },
    { label: "Registraties",     href: `/dashboard/${projectId}/registrations`,    icon: Users,      segment: "registrations" },
    { label: "Live Tracking",    href: `/dashboard/${projectId}/live-tracking`,    icon: Radio,      segment: "live-tracking", badge: "Add-on" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#0f0f70" }}>
      {/* Sidebar */}
      <aside
        className="w-64 sticky top-0 h-screen overflow-y-auto flex flex-col"
        style={{
          background: "rgba(27, 35, 170, 0.18)",
          borderRight: "1px solid rgba(237, 255, 0, 0.08)",
        }}
      >
        <div className="p-6 flex-1">
          {/* Project header */}
          <div className="mb-8 pb-6" style={{ borderBottom: "1px solid rgba(237, 255, 0, 0.08)" }}>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "rgba(237,255,0,0.6)", fontFamily: "'Montserrat', sans-serif" }}
            >
              Project
            </p>
            {logo ? (
              <Image src={logo} alt={projectDisplayName} width={180} height={32} className="h-7 w-auto object-contain mb-1" />
            ) : (
              <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {projectDisplayName}
              </h2>
            )}
            <div
              className="flex items-center gap-2 mt-3 px-2 py-1 rounded"
              style={{ background: "rgba(237,255,0,0.08)", border: "1px solid rgba(237,255,0,0.15)" }}
            >
              <span className="pulsing-dot" />
              <span className="text-xs font-bold" style={{ color: "#edff00", fontFamily: "'Montserrat', sans-serif" }}>
                Live Tracking
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.includes(item.segment);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("nav-link", isActive && "nav-link-active")}
                  style={item.highlight && !isActive ? {
                    border: "1px solid rgba(237,255,0,0.15)",
                    background: "rgba(237,255,0,0.04)",
                  } : undefined}
                >
                  <Icon size={18} style={{ color: item.highlight ? "#edff00" : undefined }} />
                  <span
                    className="flex-1"
                    style={{
                      color: item.highlight && !isActive ? "#edff00" : undefined,
                      fontWeight: item.highlight ? 700 : undefined,
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {item.label}
                  </span>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#edff00" }} />
                  )}
                  {item.badge && (
                    <span
                      className="ml-auto text-xs px-2 py-0.5 rounded font-bold"
                      style={{ background: "rgba(27,35,170,0.5)", color: "#d8d6d6" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid rgba(237,255,0,0.08)" }}>
          <div className="p-6 flex flex-col gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: "#d8d6d6", fontFamily: "'Montserrat', sans-serif" }}
            >
              <ChevronRight size={16} className="rotate-180" />
              Terug naar overzicht
            </Link>
            <LogoutButton compact />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
