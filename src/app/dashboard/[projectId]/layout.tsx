"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { useState } from "react";
import { Building2, BarChart3, Users, Radio, ChevronRight, TrendingUp, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/LogoutButton";
import { getProjectConfig } from "@/lib/project-config";

const SLUG_TO_LOGO: Record<string, string> = {
  "de-hofman": "/logos/de-hofman.svg",
  depaveri:    "/logos/depaveri.svg",
  elster11:    "/logos/elster11.svg",
  "6th-grid":  "/logos/6th-grid.svg",
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const projectDisplayName = projectId.toUpperCase().replace(/-/g, " ");
  const logo = SLUG_TO_LOGO[projectId];
  const config = getProjectConfig(projectId);
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { label: "Verkoopvoortgang", href: `/dashboard/${projectId}/verkoopvoortgang`, icon: TrendingUp, segment: "verkoopvoortgang", highlight: true },
    { label: config.navLabel,    href: `/dashboard/${projectId}/units`,            icon: Building2,  segment: "units" },
    { label: "Analytics",        href: `/dashboard/${projectId}/analytics`,        icon: BarChart3,  segment: "analytics" },
    { label: "Registraties",     href: `/dashboard/${projectId}/registrations`,    icon: Users,      segment: "registrations" },
    { label: "Live Tracking",    href: `/dashboard/${projectId}/live-tracking`,    icon: Radio,      segment: "live-tracking", badge: "Add-on" },
  ];

  return (
    <div className="flex min-h-screen" style={{ background: "#0f0f70" }}>
      {/* Sidebar */}
      <aside
        className="sticky top-0 h-screen flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: collapsed ? "56px" : "256px",
          background: "rgba(27, 35, 170, 0.18)",
          borderRight: "1px solid rgba(237, 255, 0, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Topbalk: logo/naam + toggle knop — altijd zichtbaar */}
        <div
          className="flex-shrink-0 flex items-center"
          style={{
            borderBottom: "1px solid rgba(237, 255, 0, 0.08)",
            height: "64px",
            padding: collapsed ? "0 8px" : "0 16px 0 24px",
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {!collapsed && (
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(237,255,0,0.6)", fontFamily: "'Montserrat', sans-serif" }}>
                Project
              </p>
              {logo ? (
                <Image src={logo} alt={projectDisplayName} width={140} height={24} className="h-6 w-auto object-contain" />
              ) : (
                <span className="text-sm font-bold text-white truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>{projectDisplayName}</span>
              )}
            </div>
          )}
          {collapsed && logo && (
            <Image src={logo} alt={projectDisplayName} width={28} height={28} className="w-7 h-7 object-contain flex-shrink-0" />
          )}
          {collapsed && !logo && (
            <span className="text-xs font-black text-white">{projectDisplayName.charAt(0)}</span>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-white/10 ml-2"
              title="Sidebar inklappen"
              style={{ color: "rgba(237,255,0,0.5)" }}
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        {/* Uitgeklapt: live tracking badge */}
        {!collapsed && (
          <div className="flex-shrink-0 px-6 py-3" style={{ borderBottom: "1px solid rgba(237, 255, 0, 0.08)" }}>
            <div
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{ background: "rgba(237,255,0,0.08)", border: "1px solid rgba(237,255,0,0.15)" }}
            >
              <span className="pulsing-dot" />
              <span className="text-xs font-bold" style={{ color: "#edff00", fontFamily: "'Montserrat', sans-serif" }}>
                Live Tracking
              </span>
            </div>
          </div>
        )}

        {/* Toggle knop (ingeklapt, onder logo) */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex-shrink-0 flex items-center justify-center h-10 w-full transition-colors hover:bg-white/10"
            title="Sidebar uitklappen"
            style={{ color: "rgba(237,255,0,0.5)", borderBottom: "1px solid rgba(237, 255, 0, 0.08)" }}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto space-y-1" style={{ padding: collapsed ? "12px 8px" : "16px 24px" }}>
          {navItems.map((item) => {
            const isActive = pathname.includes(item.segment);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn("nav-link relative", isActive && "nav-link-active", collapsed && "justify-center")}
                style={{
                  ...(item.highlight && !isActive ? {
                    border: "1px solid rgba(237,255,0,0.15)",
                    background: "rgba(237,255,0,0.04)",
                  } : {}),
                  ...(collapsed ? { padding: "10px", minWidth: 0 } : {}),
                }}
              >
                <Icon size={18} style={{ color: item.highlight ? "#edff00" : undefined, flexShrink: 0 }} />
                {!collapsed && (
                  <>
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
                  </>
                )}
                {collapsed && isActive && (
                  <span className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full" style={{ background: "#edff00" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(237,255,0,0.08)", padding: collapsed ? "12px 8px" : "20px 24px" }}>
          {collapsed ? (
            <Link
              href="/dashboard"
              title="Terug naar overzicht"
              className="flex justify-center p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: "#d8d6d6" }}
            >
              <ChevronRight size={16} className="rotate-180" />
            </Link>
          ) : (
            <div className="flex flex-col gap-4">
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
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
