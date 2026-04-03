"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { Users, Eye, Clock, TrendingDown, ShoppingCart, MousePointerClick, Radio, RefreshCw, ChevronDown, Globe, Monitor, Smartphone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDuration, PERIODS } from "@/lib/plausible";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const DROPDOWN_PERIODS = PERIODS.filter((p) => !p.isSubDay);

const DEVICE_COLORS: Record<string, string> = {
  Desktop: "#facc15",
  Mobile:  "#60a5fa",
  Tablet:  "#a78bfa",
};

const SOURCE_COLORS = ["#facc15", "#60a5fa", "#a78bfa", "#34d399", "#f97316", "#f472b6"];

function formatSourceName(source: string) {
  if (!source || source === "(none)") return "Direct";
  return source;
}

function extractUnitPages(pages: { page: string; visitors: number }[], projectSlug: string) {
  return pages
    .filter((p) => p.page.includes(projectSlug))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 6);
}

function PageRow({ page, visitors, max }: { page: string; visitors: number; max: number }) {
  const pct = max > 0 ? Math.round((visitors / max) * 100) : 0;
  const label = page.replace(/^\/[^/]+\//, "/").replace(/\?.*/, "");
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate font-mono" title={page}>{label}</p>
        <div className="mt-1 h-1 bg-blue-900/40 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-400/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-sm font-semibold text-white tabular-nums w-10 text-right">{visitors}</span>
    </div>
  );
}

function SourceRow({ source, visitors, max, color }: { source: string; visitors: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((visitors / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-300 truncate">{formatSourceName(source)}</p>
        <div className="mt-1 h-1 bg-blue-900/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      <span className="text-sm font-semibold text-white tabular-nums w-10 text-right">{visitors}</span>
    </div>
  );
}

function PeriodDropdown({ selected, onChange }: { selected: string; onChange: (key: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = DROPDOWN_PERIODS.find((p) => p.key === selected);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border",
          current ? "bg-yellow-400 text-blue-950 border-yellow-400" : "text-gray-300 border-blue-700/50 bg-blue-900/30 hover:border-yellow-400/40 hover:text-white"
        )}
      >
        {current?.label ?? "Kies periode"}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-blue-700/50 bg-[#0d1b3e] shadow-2xl py-1 overflow-hidden">
          {DROPDOWN_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => { onChange(p.key); setOpen(false); }}
              className={cn("w-full text-left px-4 py-2.5 text-sm transition-colors",
                selected === p.key ? "text-yellow-400 bg-yellow-400/10 font-semibold" : "text-gray-300 hover:bg-blue-800/40 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AnalyticsData {
  periodDef: { isRealtime?: boolean; isSubDay?: boolean };
  realtimeSite: number | null;
  realtimeSales: number | null;
  siteStats: { visitors: number; pageviews: number; visit_duration: number; bounce_rate: number } | null;
  salesStats: { visitors: number; pageviews: number; visit_duration: number; bounce_rate: number };
  timeseries: { date: string; visitors: number }[];
  topPages: { page: string; visitors: number }[];
  salesTopPages: { page: string; visitors: number }[];
  devices: { device: string; visitors: number }[];
  sources: { source: string; visitors: number }[];
  browsers: { browser: string; visitors: number }[];
}

interface Props {
  projectId: string;
  projectName: string;
  siteDomain: string | null;
  initialData: AnalyticsData;
}

export default function AnalyticsClient({ projectId, projectName, siteDomain, initialData }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = useCallback(async (period: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics?slug=${projectId}&period=${period}`, { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const handlePeriodChange = useCallback((period: string) => {
    setSelectedPeriod(period);
    fetchData(period);
  }, [fetchData]);

  useEffect(() => {
    if (selectedPeriod !== "5m") return;
    const interval = setInterval(() => fetchData("5m"), 30000);
    return () => clearInterval(interval);
  }, [selectedPeriod, fetchData]);

  const chartData = data.timeseries.map((p) => ({
    date: format(parseISO(p.date), "d MMM", { locale: nl }),
    Bezoekers: p.visitors,
  }));

  const topPagesMax   = data.topPages[0]?.visitors ?? 1;
  const salesPagesMax = data.salesTopPages[0]?.visitors ?? 1;
  const sourcesMax    = data.sources[0]?.visitors ?? 1;
  const browsersMax   = data.browsers[0]?.visitors ?? 1;

  const deviceData = data.devices.map((d) => ({
    name: d.device, value: d.visitors, color: DEVICE_COLORS[d.device] ?? "#6b7280",
  }));
  const deviceTotal = deviceData.reduce((s, d) => s + d.value, 0);

  const unitPages    = extractUnitPages([...data.topPages, ...data.salesTopPages], projectId);
  const unitPagesMax = unitPages[0]?.visitors ?? 1;

  const isRealtime = !!data.periodDef?.isRealtime;
  const isSubDay   = !!data.periodDef?.isSubDay;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
            <p className="text-gray-400">{projectName}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw size={12} className={cn("text-yellow-400/60", isLoading && "animate-spin")} />
            <span>Bijgewerkt {format(lastUpdated, "HH:mm:ss", { locale: nl })}</span>
          </div>
        </div>

        {/* Period selector */}
        <div className="mb-8 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-blue-950/60 rounded-xl border border-blue-800/40">
            <button
              onClick={() => handlePeriodChange("5m")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                selectedPeriod === "5m" ? "bg-yellow-400 text-blue-950 shadow" : "text-gray-400 hover:text-white hover:bg-blue-800/40"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", selectedPeriod === "5m" ? "bg-blue-950 animate-pulse" : "bg-emerald-400 animate-pulse")} />
              Live
            </button>
          </div>
          <PeriodDropdown
            selected={DROPDOWN_PERIODS.some((p) => p.key === selectedPeriod) ? selectedPeriod : "30d"}
            onChange={handlePeriodChange}
          />
        </div>

        {/* Realtime view */}
        {isRealtime && (
          <div className="mb-8 grid gap-6 sm:grid-cols-2 max-w-2xl">
            {siteDomain && (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
                <div className="flex items-center gap-2 mb-3">
                  <Radio size={16} className="text-yellow-400 animate-pulse" />
                  <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Live nu</span>
                </div>
                <p className="text-6xl font-bold text-white tabular-nums">{data.realtimeSite ?? 0}</p>
                <p className="text-gray-400 text-sm mt-2">bezoekers op de site</p>
                <p className="text-gray-600 text-xs mt-1">{siteDomain}</p>
              </div>
            )}
            <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-yellow-400/20 bg-yellow-400/5">
              <div className="flex items-center gap-2 mb-3">
                <Radio size={16} className="text-yellow-400 animate-pulse" />
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Live nu</span>
              </div>
              <p className="text-6xl font-bold text-white tabular-nums">{data.realtimeSales ?? 0}</p>
              <p className="text-gray-400 text-sm mt-2">bezoekers verkooptool</p>
              <p className="text-gray-600 text-xs mt-1">kopen.repp.nl</p>
            </div>
          </div>
        )}

        {/* Sub-day notice */}
        {isSubDay && !isRealtime && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-blue-900/30 border border-blue-800/40 text-xs text-gray-500">
            Plausible biedt geen uurlijkse breakdown — je ziet <strong className="text-gray-400">vandaag</strong> als periode.
          </div>
        )}

        {/* Site stats */}
        {data.siteStats && siteDomain && (
          <>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-3">Projectwebsite — {siteDomain}</p>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
              <KPICard title="Bezoekers"      value={data.siteStats.visitors}                              icon={Users}        accentColor="yellow" />
              <KPICard title="Paginaweergaven" value={data.siteStats.pageviews}                            icon={Eye}          accentColor="blue" />
              <KPICard title="Gem. sessieduur" value={formatDuration(data.siteStats.visit_duration)}       icon={Clock}        accentColor="gold" />
              <KPICard title="Bounce Rate"     value={`${data.siteStats.bounce_rate}%`}                    icon={TrendingDown} accentColor="red" />
            </div>
          </>
        )}

        {/* Sales tool stats */}
        <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-3">
          Verkooptool — kopen.repp.nl/<span className="text-yellow-300">{projectId}</span>
        </p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard title="Bezoekers"       value={data.salesStats.visitors}                             icon={ShoppingCart}       accentColor="emerald" />
          <KPICard title="Paginaweergaven" value={data.salesStats.pageviews}                           icon={MousePointerClick}  accentColor="blue" />
          <KPICard title="Gem. sessieduur" value={formatDuration(data.salesStats.visit_duration)}      icon={Clock}             accentColor="gold" />
          <KPICard title="Bounce Rate"     value={`${data.salesStats.bounce_rate}%`}                   icon={TrendingDown}      accentColor="red" />
        </div>

        {/* Charts row */}
        {!isRealtime && (
          <div className="grid gap-6 lg:grid-cols-3 mb-6">
            <Card className="lg:col-span-2">
              <h3 className="text-base font-bold text-white mb-5">
                Bezoekers per dag
                {siteDomain && <span className="text-xs font-normal text-gray-500 ml-2">({siteDomain})</span>}
              </h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} itemStyle={{ color: "#facc15" }} />
                    <Line type="monotone" dataKey="Bezoekers" stroke="#facc15" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#facc15" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Geen tijdreeksdata beschikbaar</div>
              )}
            </Card>

            {/* Device breakdown */}
            <Card>
              <h3 className="text-base font-bold text-white mb-5 flex items-center gap-2">
                <Monitor size={16} className="text-yellow-400" /> Apparaten
              </h3>
              {deviceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={deviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} (${deviceTotal > 0 ? Math.round(Number(v) / deviceTotal * 100) : 0}%)`, ""]} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {deviceData.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-300">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </span>
                        <span className="text-white font-semibold tabular-nums">{deviceTotal > 0 ? `${Math.round(d.value / deviceTotal * 100)}%` : "—"}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-500 text-sm">Geen data</div>
              )}
            </Card>
          </div>
        )}

        {/* Bottom cards */}
        {!isRealtime && (
          <div className="grid gap-6 lg:grid-cols-3 mb-6">
            {/* Top pages site */}
            {siteDomain && data.topPages.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Globe size={16} className="text-yellow-400" /> Top pagina's — {siteDomain}
                </h3>
                <div className="divide-y divide-blue-800/30">
                  {data.topPages.map((p) => <PageRow key={p.page} page={p.page} visitors={p.visitors} max={topPagesMax} />)}
                </div>
              </Card>
            )}

            {/* Sales tool pages */}
            {data.salesTopPages.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <MousePointerClick size={16} className="text-yellow-400" /> Top pagina's — verkooptool
                </h3>
                <div className="divide-y divide-blue-800/30">
                  {data.salesTopPages.map((p) => <PageRow key={p.page} page={p.page} visitors={p.visitors} max={salesPagesMax} />)}
                </div>
              </Card>
            )}

            {/* Traffic sources */}
            {data.sources.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Smartphone size={16} className="text-yellow-400" /> Verkeersbronnen
                </h3>
                <div className="divide-y divide-blue-800/30">
                  {data.sources.map((s, i) => (
                    <SourceRow key={s.source} source={s.source} visitors={s.visitors} max={sourcesMax} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Browsers & Unit pages */}
        {!isRealtime && (data.browsers.length > 0 || unitPages.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {data.browsers.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Monitor size={16} className="text-yellow-400" /> Browsers
                </h3>
                <div className="divide-y divide-blue-800/30">
                  {data.browsers.map((b, i) => (
                    <SourceRow key={b.browser} source={b.browser} visitors={b.visitors} max={browsersMax} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </div>
              </Card>
            )}

            {unitPages.length > 0 && (
              <Card>
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Eye size={16} className="text-yellow-400" /> Meest bekeken units
                </h3>
                <div className="divide-y divide-blue-800/30">
                  {unitPages.map((p) => <PageRow key={p.page} page={p.page} visitors={p.visitors} max={unitPagesMax} />)}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
