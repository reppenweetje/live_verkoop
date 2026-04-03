"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Building2, Zap, Clock, TrendingUp, Euro, CheckCircle2, Timer } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface DashboardProject {
  id: string;
  slug: string;
  name: string;
  status: string;
  saleStartsAt: string | null;
}

interface ProjectStat {
  slug: string;
  name: string;
  totalProjectValue: number;
  verkochtTotal: number;
  gereserveerdTotal: number;
  verkocht: number;
  gereserveerd: number;
  beschikbaar: number;
  total: number;
}

interface PortfolioStats {
  totalProjectValue: number;
  verkochtTotal: number;
  gereserveerdTotal: number;
  verkocht: number;
  gereserveerd: number;
  beschikbaar: number;
  totalUnits: number;
  perProject: ProjectStat[];
}

// ─── Categoriestructuur ───────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "project-r",
    label: "Project R",
    description: "Eigen ontwikkeling",
    subcategories: [
      {
        id: "eigen",
        label: null,
        slugs: ["de-hofman"],
      },
    ],
  },
  {
    id: "rapid",
    label: "Reppit",
    description: "Verkoop als dienst",
    subcategories: [
      {
        id: "bedrijfsunits",
        label: "Bedrijfsunits",
        slugs: ["depaveri", "elster11"],
      },
      {
        id: "garageboxen",
        label: "Garageboxen",
        slugs: ["6th-grid"],
      },
    ],
  },
];

const SLUG_TO_LOGO: Record<string, string> = {
  "de-hofman": "/logos/de-hofman.svg",
  depaveri:    "/logos/depaveri.svg",
  elster11:    "/logos/elster11.svg",
  "6th-grid":  "/logos/6th-grid.svg",
};

const SLUG_TO_SALE_DATE: Record<string, string> = {
  "de-hofman": "2026-04-08T20:00:00",
  elster11:    "2026-04-09T20:00:00",
  depaveri:    "2026-04-15T20:00:00",
};

// ─── Portfolio overzicht ──────────────────────────────────────────────────────

function PortfolioOverview({ portfolio }: { portfolio: PortfolioStats }) {
  const soldPct      = portfolio.totalProjectValue > 0 ? (portfolio.verkochtTotal / portfolio.totalProjectValue) * 100 : 0;
  const reservedPct  = portfolio.totalProjectValue > 0 ? (portfolio.gereserveerdTotal / portfolio.totalProjectValue) * 100 : 0;
  const availableVal = portfolio.totalProjectValue - portfolio.verkochtTotal - portfolio.gereserveerdTotal;

  return (
    <div className="mb-12 rounded-2xl overflow-hidden" style={{ background: "rgba(27,35,170,0.22)", border: "1px solid rgba(237,255,0,0.12)" }}>
      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid rgba(237,255,0,0.08)" }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-yellow-400/70 uppercase tracking-widest mb-1">Portfolio</p>
            <h2 className="text-2xl font-bold text-white">Totaaloverzicht</h2>
            <p className="text-gray-400 text-sm mt-1">{portfolio.totalUnits} actieve units · {portfolio.perProject.length} projecten</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Totale portfoliowaarde</p>
            <p className="text-3xl font-bold text-white">{formatCurrency(portfolio.totalProjectValue)}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span style={{ color: "#d8d6d6" }}>Verkoopvoortgang</span>
            <span style={{ color: "#d8d6d6" }}>{soldPct.toFixed(1)}% verkocht · {(soldPct + reservedPct).toFixed(1)}% incl. gereserveerd</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(15,15,112,0.6)", border: "1px solid rgba(27,35,170,0.5)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(soldPct + reservedPct, 100)}%`, background: "linear-gradient(90deg, #34d399, #10b981, #fbbf24)" }}
            />
          </div>
          <div className="relative -mt-3 h-3">
            <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 bg-emerald-500" style={{ width: `${Math.min(soldPct, 100)}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Verkocht</span>
            <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Gereserveerd</span>
            <span className="flex items-center gap-1.5 text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-800 inline-block" /> Beschikbaar</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0" style={{ borderTop: "1px solid rgba(237,255,0,0.08)", display: "grid" }}>
        <div className="p-6 flex items-start gap-3" style={{ borderRight: "1px solid rgba(237,255,0,0.06)", borderBottom: "1px solid rgba(237,255,0,0.06)" }}>
          <div className="p-2 rounded-lg" style={{ background: "rgba(16,185,129,0.15)" }}><CheckCircle2 size={18} style={{ color: "#10b981" }} /></div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#d8d6d6" }}>Omzet behaald</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.verkochtTotal)}</p>
            <p className="text-xs mt-0.5" style={{ color: "#10b981" }}>{portfolio.verkocht} unit{portfolio.verkocht !== 1 ? "s" : ""} verkocht</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3" style={{ borderRight: "1px solid rgba(237,255,0,0.06)", borderBottom: "1px solid rgba(237,255,0,0.06)" }}>
          <div className="p-2 rounded-lg" style={{ background: "rgba(251,191,36,0.15)" }}><Timer size={18} style={{ color: "#fbbf24" }} /></div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#d8d6d6" }}>Gereserveerde waarde</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.gereserveerdTotal)}</p>
            <p className="text-xs mt-0.5" style={{ color: "#fbbf24" }}>{portfolio.gereserveerd} unit{portfolio.gereserveerd !== 1 ? "s" : ""} gereserveerd</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3" style={{ borderRight: "1px solid rgba(237,255,0,0.06)", borderBottom: "1px solid rgba(237,255,0,0.06)" }}>
          <div className="p-2 rounded-lg" style={{ background: "rgba(27,35,170,0.4)" }}><Euro size={18} style={{ color: "#d8d6d6" }} /></div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#d8d6d6" }}>Nog beschikbaar</p>
            <p className="text-xl font-bold text-white">{formatCurrency(availableVal)}</p>
            <p className="text-xs mt-0.5" style={{ color: "#d8d6d6" }}>{portfolio.beschikbaar} unit{portfolio.beschikbaar !== 1 ? "s" : ""} beschikbaar</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3" style={{ borderBottom: "1px solid rgba(237,255,0,0.06)" }}>
          <div className="p-2 rounded-lg" style={{ background: "rgba(237,255,0,0.1)" }}><TrendingUp size={18} style={{ color: "#edff00" }} /></div>
          <div>
            <p className="text-xs mb-0.5" style={{ color: "#d8d6d6" }}>Potentieel (incl. reserv.)</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.verkochtTotal + portfolio.gereserveerdTotal)}</p>
            <p className="text-xs mt-0.5" style={{ color: "#edff00" }}>{soldPct > 0 || reservedPct > 0 ? `${(soldPct + reservedPct).toFixed(1)}% van portfolio` : "Nog geen activiteit"}</p>
          </div>
        </div>
      </div>

      {portfolio.perProject.length > 0 && (
        <div className="px-8 py-5" style={{ borderTop: "1px solid rgba(237,255,0,0.08)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(237,255,0,0.5)", fontFamily: "'Montserrat',sans-serif" }}>Per project</p>
          <div className="space-y-3">
            {portfolio.perProject.map((p) => {
              const logo = SLUG_TO_LOGO[p.slug];
              const pPct = p.totalProjectValue > 0 ? (p.verkochtTotal / p.totalProjectValue) * 100 : 0;
              const rPct = p.totalProjectValue > 0 ? (p.gereserveerdTotal / p.totalProjectValue) * 100 : 0;
              return (
                <Link key={p.slug} href={`/dashboard/${p.slug}/verkoopvoortgang`} className="group flex items-center gap-4 hover:bg-blue-800/20 rounded-xl px-3 py-2 -mx-3 transition-colors">
                  <div className="w-28 flex-shrink-0">
                    {logo
                      ? <Image src={logo} alt={p.name} width={120} height={22} className="h-5 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                      : <span className="text-xs font-semibold text-gray-400">{p.name}</span>}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-blue-950/60 rounded-full overflow-hidden border border-blue-800/30">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pPct + rPct, 100)}%`, background: "linear-gradient(90deg, #10b981, #fbbf24)" }} />
                      <div className="h-full rounded-full -mt-2 bg-emerald-500" style={{ width: `${Math.min(pPct, 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 w-40">
                    <p className="text-xs text-white font-semibold">{formatCurrency(p.verkochtTotal)}</p>
                    <p className="text-xs text-gray-500">{p.verkocht}v · {p.gereserveerd}r · {p.beschikbaar}b · {p.total} units</p>
                  </div>
                  <span className="text-gray-600 group-hover:text-yellow-400 transition-colors text-sm">→</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

const SLUG_TO_AUDIO: Record<string, string> = {
  "de-hofman": "/audio/hofman.mp3",
  elster11:    "/audio/elster11.m4a",
  depaveri:    "/audio/paveri.m4a",
};

// Audio-objecten op module-niveau zodat ze blijven afspelen tijdens client-side navigatie
const audioInstances: Record<string, HTMLAudioElement> = {};

function getAudio(slug: string): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const src = SLUG_TO_AUDIO[slug];
  if (!src) return null;
  if (!audioInstances[slug]) {
    audioInstances[slug] = new Audio(src);
  }
  return audioInstances[slug];
}

function ProjectCard({ project, stat }: { project: DashboardProject; stat?: ProjectStat }) {
  const logo      = SLUG_TO_LOGO[project.slug];
  const saleDate  = SLUG_TO_SALE_DATE[project.slug] ?? project.saleStartsAt;
  const hasJingle = project.slug in SLUG_TO_AUDIO;
  const router    = useRouter();

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!hasJingle) return;
    e.preventDefault();
    const audio = getAudio(project.slug);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    router.push(`/dashboard/${project.slug}/units`);
  }, [hasJingle, project.slug, router]);

  return (
    <div
      className="h-full block cursor-pointer"
      onClick={hasJingle ? handleClick : undefined}
    >
      {/* Wikkel in Link alleen als er geen jingle is, anders navigeert handleClick */}
      <div
        className="group relative overflow-hidden rounded-2xl transition-all duration-300 h-full flex flex-col"
        style={{
          background: "rgba(27, 35, 170, 0.25)",
          border: "1px solid rgba(237, 255, 0, 0.1)",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(237,255,0,0.35)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(237,255,0,0.1)"; }}
        onClick={!hasJingle ? () => router.push(`/dashboard/${project.slug}/units`) : undefined}
      >
      >
        <div className="relative flex flex-col justify-between flex-1 p-7">
          <div className="mb-5 h-8 flex items-center">
            {logo
              ? <Image src={logo} alt={project.name} width={220} height={40} className="h-8 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
              : <span className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat',sans-serif" }}>{project.name}</span>
            }
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs" style={{ color: "rgba(216,214,214,0.5)" }}>{project.slug}</p>
              {project.status === "live" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(237,255,0,0.1)", border: "1px solid rgba(237,255,0,0.25)" }}>
                  <span className="pulsing-dot" />
                  <span className="text-xs font-bold" style={{ color: "#edff00", fontFamily: "'Montserrat',sans-serif" }}>Live</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {saleDate && (
                <div className="flex items-center gap-2.5">
                  <Zap size={14} style={{ color: "#edff00" }} className="flex-shrink-0" />
                  <span className="text-sm" style={{ color: "#d8d6d6" }}>
                    Verkoopmoment: {format(new Date(saleDate), "d MMM HH:mm", { locale: nl })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Building2 size={14} style={{ color: "#edff00" }} className="flex-shrink-0" />
                <span className="text-sm" style={{ color: "#d8d6d6" }}>
                  {stat ? `${stat.total} units · ${stat.beschikbaar} beschikbaar` : "Units dashboard"}
                </span>
              </div>
            </div>

            {stat && stat.totalProjectValue > 0 && (
              <div className="mt-4">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(15,15,112,0.6)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((stat.verkochtTotal / stat.totalProjectValue) * 100, 100)}%`,
                      background: "#10b981",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: "rgba(216,214,214,0.5)" }}>
                  <span>{formatCurrency(stat.verkochtTotal)} verkocht</span>
                  <span>{formatCurrency(stat.totalProjectValue)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(237,255,0,0.08)" }}>
            {project.status === "live" && (
              <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: "rgba(237,255,0,0.1)", color: "#edff00", border: "1px solid rgba(237,255,0,0.25)", fontFamily: "'Montserrat',sans-serif" }}>Live</span>
            )}
            {project.status === "voorbereiding" && (
              <span className="rounded-lg px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5" style={{ background: "rgba(27,35,170,0.4)", color: "#d8d6d6", border: "1px solid rgba(27,35,170,0.6)", fontFamily: "'Montserrat',sans-serif" }}>
                <Clock size={11} /> In voorbereiding
              </span>
            )}
            {project.status === "afgerond" && (
              <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: "rgba(27,35,170,0.2)", color: "#d8d6d6", border: "1px solid rgba(27,35,170,0.4)", fontFamily: "'Montserrat',sans-serif" }}>Afgerond</span>
            )}
          </div>
        </div>

        <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "rgba(237,255,0,0.15)", border: "1px solid rgba(237,255,0,0.3)", color: "#edff00" }}>→</div>
        </div>
      </div>
    </div>
  );
}

// ─── Hoofdcomponent ───────────────────────────────────────────────────────────

export default function DashboardClient({ projects, portfolio }: { projects: DashboardProject[]; portfolio: PortfolioStats }) {
  const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));

  return (
    <div className="min-h-screen px-6 py-12 diamond-pattern" style={{ background: "#0f0f70" }}>
      <div className="max-w-7xl mx-auto">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 uppercase tracking-wide" style={{ fontFamily: "'Montserrat',sans-serif" }}>Projecten</h1>
          <p className="text-lg" style={{ color: "#d8d6d6" }}>Selecteer een project om de dashboard te bekijken</p>
        </div>

        {/* Categorieën */}
        {CATEGORIES.map((category) => {
          const categoryProjects = category.subcategories.flatMap((s) => s.slugs).map((slug) => projectBySlug[slug]).filter(Boolean);
          if (categoryProjects.length === 0) return null;

          return (
            <div key={category.id} className="mb-12">
              {/* Categorie header */}
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-2xl font-bold text-white uppercase tracking-wide" style={{ fontFamily: "'Montserrat',sans-serif" }}>{category.label}</h2>
                <span className="text-sm" style={{ color: "rgba(216,214,214,0.6)" }}>{category.description}</span>
              </div>

              {/* Subcategorieën */}
              {category.subcategories.map((sub) => {
                const subProjects = sub.slugs.map((slug) => projectBySlug[slug]).filter(Boolean);
                if (subProjects.length === 0) return null;

                return (
                  <div key={sub.id} className="mb-8">
                    {sub.label && (
                      <div className="flex items-center gap-3 mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(237,255,0,0.5)", fontFamily: "'Montserrat',sans-serif" }}>{sub.label}</p>
                        <div className="flex-1 h-px" style={{ background: "rgba(237,255,0,0.1)" }} />
                      </div>
                    )}
                    <div className={cn(
                      "grid gap-6",
                      subProjects.length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    )}>
                      {subProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          stat={portfolio.perProject.find((s) => s.slug === project.slug)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Portfolio overzicht */}
        <PortfolioOverview portfolio={portfolio} />
      </div>
    </div>
  );
}
