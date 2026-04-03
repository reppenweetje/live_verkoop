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
    <div className="flex min-h-screen bg-blue-950">
      <aside className="w-64 bg-blue-900/40 border-r border-blue-800/50 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <div className="mb-8 pb-6 border-b border-yellow-400/10">
            <p className="text-xs font-semibold text-yellow-400/70 uppercase tracking-wider mb-3">Project</p>
            {logo ? (
              <Image src={logo} alt={projectDisplayName} width={180} height={32} className="h-7 w-auto object-contain mb-1" />
            ) : (
              <h2 className="text-lg font-bold text-white">{projectDisplayName}</h2>
            )}
            <div className="flex items-center gap-2 mt-3 px-2 py-1 rounded bg-yellow-400/10 border border-yellow-400/20">
              <span className="pulsing-dot"></span>
              <span className="text-xs font-semibold text-yellow-300">Live Tracking</span>
            </div>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname.includes(item.segment);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "nav-link",
                    isActive && "nav-link-active",
                    item.highlight && !isActive && "border border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10"
                  )}
                >
                  <Icon size={18} className={item.highlight ? "text-yellow-400" : undefined} />
                  <span className={cn("flex-1", item.highlight && !isActive && "text-yellow-300 font-semibold")}>
                    {item.label}
                  </span>
                  {item.highlight && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {item.badge && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-800/50 text-blue-300 font-semibold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-blue-800/50" />
        <div className="p-6 flex flex-col gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors">
            <ChevronRight size={16} className="rotate-180" />
            Terug naar overzicht
          </Link>
          <LogoutButton compact />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
