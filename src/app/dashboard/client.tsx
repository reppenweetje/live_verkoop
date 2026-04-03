"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Building2, Zap, Clock, TrendingUp, Euro, CheckCircle2, Timer } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

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
    <div className="mb-12 rounded-2xl border border-yellow-400/15 bg-gradient-to-br from-blue-900/50 to-indigo-900/40 overflow-hidden">
      <div className="px-8 pt-8 pb-6 border-b border-blue-800/40">
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
            <span>Verkoopvoortgang</span>
            <span>{soldPct.toFixed(1)}% verkocht · {(soldPct + reservedPct).toFixed(1)}% incl. gereserveerd</span>
          </div>
          <div className="h-3 bg-blue-950/60 rounded-full overflow-hidden border border-blue-800/40">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-blue-800/30">
        <div className="p-6 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-900/30"><CheckCircle2 size={18} className="text-emerald-400" /></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Omzet behaald</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.verkochtTotal)}</p>
            <p className="text-xs text-emerald-400 mt-0.5">{portfolio.verkocht} unit{portfolio.verkocht !== 1 ? "s" : ""} verkocht</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-900/30"><Timer size={18} className="text-amber-400" /></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Gereserveerde waarde</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.gereserveerdTotal)}</p>
            <p className="text-xs text-amber-400 mt-0.5">{portfolio.gereserveerd} unit{portfolio.gereserveerd !== 1 ? "s" : ""} gereserveerd</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-900/40"><Euro size={18} className="text-blue-300" /></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Nog beschikbaar</p>
            <p className="text-xl font-bold text-white">{formatCurrency(availableVal)}</p>
            <p className="text-xs text-blue-400 mt-0.5">{portfolio.beschikbaar} unit{portfolio.beschikbaar !== 1 ? "s" : ""} beschikbaar</p>
          </div>
        </div>
        <div className="p-6 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-yellow-900/20"><TrendingUp size={18} className="text-yellow-400" /></div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Potentieel (incl. reserv.)</p>
            <p className="text-xl font-bold text-white">{formatCurrency(portfolio.verkochtTotal + portfolio.gereserveerdTotal)}</p>
            <p className="text-xs text-yellow-400 mt-0.5">{soldPct > 0 || reservedPct > 0 ? `${(soldPct + reservedPct).toFixed(1)}% van portfolio` : "Nog geen activiteit"}</p>
          </div>
        </div>
      </div>

      {portfolio.perProject.length > 0 && (
        <div className="px-8 py-5 border-t border-blue-800/40">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Per project</p>
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

function ProjectCard({ project, stat }: { project: DashboardProject; stat?: ProjectStat }) {
  const logo     = SLUG_TO_LOGO[project.slug];
  const saleDate = SLUG_TO_SALE_DATE[project.slug] ?? project.saleStartsAt;

  return (
    <Link href={`/dashboard/${project.slug}/units`} className="h-full block">
      <div className="group relative overflow-hidden rounded-2xl border border-yellow-400/20 hover:border-yellow-400/50 bg-gradient-to-br from-blue-900/60 to-indigo-900/60 transition-all duration-300 hover:shadow-2xl cursor-pointer h-full flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative flex flex-col justify-between flex-1 p-7">
          <div className="mb-5 h-8 flex items-center">
            {logo
              ? <Image src={logo} alt={project.name} width={220} height={40} className="h-8 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
              : <span className="text-lg font-bold text-white">{project.name}</span>
            }
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500 text-xs">{project.slug}</p>
              {project.status === "live" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30">
                  <span className="pulsing-dot" />
                  <span className="text-xs font-semibold text-yellow-300">Live</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {saleDate && (
                <div className="flex items-center gap-2.5">
                  <Zap size={14} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">
                    Verkoopmoment: {format(new Date(saleDate), "d MMM HH:mm", { locale: nl })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Building2 size={14} className="text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-gray-300">
                  {stat ? `${stat.total} units · ${stat.beschikbaar} beschikbaar` : "Units dashboard"}
                </span>
              </div>
            </div>

            {stat && stat.totalProjectValue > 0 && (
              <div className="mt-4">
                <div className="h-1.5 bg-blue-950/60 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min((stat.verkochtTotal / stat.totalProjectValue) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatCurrency(stat.verkochtTotal)} verkocht</span>
                  <span>{formatCurrency(stat.totalProjectValue)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-blue-800/40 mt-6 pt-5">
            {project.status === "live" && (
              <span className="bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 rounded-lg px-3 py-1 text-xs font-semibold">Live</span>
            )}
            {project.status === "voorbereiding" && (
              <span className="bg-blue-400/10 text-blue-300 border border-blue-400/30 rounded-lg px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5">
                <Clock size={11} /> In voorbereiding
              </span>
            )}
            {project.status === "afgerond" && (
              <span className="bg-gray-800/50 text-gray-400 border border-gray-700 rounded-lg px-3 py-1 text-xs font-semibold">Afgerond</span>
            )}
          </div>
        </div>

        <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-300 text-sm">→</div>
        </div>
      </div>
    </Link>
  );
}

// ─── Hoofdcomponent ───────────────────────────────────────────────────────────

export default function DashboardClient({ projects, portfolio }: { projects: DashboardProject[]; portfolio: PortfolioStats }) {
  const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-12">
      <div className="max-w-7xl mx-auto">

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white mb-2">Projecten</h1>
          <p className="text-gray-400 text-lg">Selecteer een project om de dashboard te bekijken</p>
        </div>

        {/* Categorieën */}
        {CATEGORIES.map((category) => {
          const categoryProjects = category.subcategories.flatMap((s) => s.slugs).map((slug) => projectBySlug[slug]).filter(Boolean);
          if (categoryProjects.length === 0) return null;

          return (
            <div key={category.id} className="mb-12">
              {/* Categorie header */}
              <div className="flex items-baseline gap-3 mb-6">
                <h2 className="text-2xl font-bold text-white">{category.label}</h2>
                <span className="text-sm text-gray-500">{category.description}</span>
              </div>

              {/* Subcategorieën */}
              {category.subcategories.map((sub) => {
                const subProjects = sub.slugs.map((slug) => projectBySlug[slug]).filter(Boolean);
                if (subProjects.length === 0) return null;

                return (
                  <div key={sub.id} className="mb-8">
                    {sub.label && (
                      <div className="flex items-center gap-3 mb-4">
                        <p className="text-xs font-semibold text-yellow-400/60 uppercase tracking-widest">{sub.label}</p>
                        <div className="flex-1 h-px bg-yellow-400/10" />
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
