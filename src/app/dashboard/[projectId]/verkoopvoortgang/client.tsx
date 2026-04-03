"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TrendingUp, Clock, Activity, RefreshCw, Radio, VolumeX, Volume2, Users, Euro, CheckCircle2, Timer, MapPin } from "lucide-react";
import { format, parseISO, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { nl } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { useSaleAudio } from "@/hooks/useSaleAudio";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface DashboardUnit {
  id: string;
  code: string;
  name: string;
  status: UnitStatus;
  price: number;
  floor: number;
  size: string;
  reservedAt?: string;
  reservedUntil?: string;
  boughtAt?: string;
}

interface UnitStats {
  total: number;
  beschikbaar: number;
  gereserveerd: number;
  verkocht: number;
  verkochtTotal: number;
  gereserveerdTotal: number;
  totalProjectValue: number;
}

interface ActivityEvent {
  id: string;
  text: string;
  status: UnitStatus;
  time: Date;
}

function LiveDot({ color = "emerald" }: { color?: "emerald" | "yellow" | "amber" }) {
  return (
    <span className={cn("inline-block w-2 h-2 rounded-full animate-pulse flex-shrink-0",
      color === "emerald" && "bg-emerald-400",
      color === "yellow" && "bg-yellow-400",
      color === "amber" && "bg-amber-400"
    )} />
  );
}

function useLiveTimer(startAt?: string) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startAt) return;
    const start = new Date(startAt);
    if (start > new Date()) return;
    const tick = () => setElapsed(differenceInSeconds(new Date(), start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startAt]);
  if (!startAt || new Date(startAt) > new Date()) return null;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${h > 0 ? `${h}u ` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  initialUnits: DashboardUnit[];
  initialStats: UnitStats;
  directusProjectId: number;
  projectName: string;
  projectId: string;
  plausibleSiteId?: string;
  initialSiteVisitors: number;
  initialSalesVisitors: number;
  saleStartsAt?: string;
}

export default function VerkoopvoortgangClient({
  initialUnits, initialStats, directusProjectId, projectName,
  projectId, plausibleSiteId, initialSiteVisitors, initialSalesVisitors, saleStartsAt
}: Props) {
  const [units, setUnits] = useState(initialUnits);
  const [stats, setStats] = useState(initialStats);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [siteVisitors, setSiteVisitors] = useState(initialSiteVisitors);
  const [salesVisitors, setSalesVisitors] = useState(initialSalesVisitors);
  const [muted, setMuted] = useState(false);
  const prevUnitsRef = useRef(initialUnits);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);

  useSaleAudio(units, muted);

  // Detecteer nieuwe verkopen/reserveringen
  useEffect(() => {
    const prev = prevUnitsRef.current;
    const newEvents: ActivityEvent[] = [];
    units.forEach((unit) => {
      const old = prev.find((u) => u.id === unit.id);
      if (!old) return;
      if (old.status !== "verkocht" && unit.status === "verkocht") {
        newEvents.push({ id: unit.id, text: `${unit.code} — ${unit.name} VERKOCHT`, status: "verkocht", time: new Date() });
      } else if (old.status !== "gereserveerd" && unit.status === "gereserveerd") {
        newEvents.push({ id: unit.id, text: `${unit.code} — ${unit.name} GERESERVEERD`, status: "gereserveerd", time: new Date() });
      }
    });
    if (newEvents.length > 0) {
      setRecentActivity((prev) => [...newEvents, ...prev].slice(0, 20));
    }
    prevUnitsRef.current = units;
  }, [units]);

  // Init activity feed
  useEffect(() => {
    const existing = [...initialUnits]
      .filter((u) => u.boughtAt || u.reservedAt)
      .sort((a, b) => new Date(b.boughtAt || b.reservedAt || "").getTime() - new Date(a.boughtAt || a.reservedAt || "").getTime())
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        text: u.status === "verkocht" ? `${u.code} — ${u.name} VERKOCHT` : `${u.code} — ${u.name} GERESERVEERD`,
        status: u.status as UnitStatus,
        time: new Date(u.boughtAt || u.reservedAt || ""),
      }));
    setRecentActivity(existing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollUnits = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/units?projectId=${directusProjectId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnits(data.units);
        setStats(data.stats);
        setLastUpdated(new Date());
      }
    } catch {} finally {
      setIsRefreshing(false);
    }
  }, [directusProjectId]);

  const pollVisitors = useCallback(async () => {
    try {
      // period=today: project-specifieke bezoekers vandaag op kopen.repp.nl/{projectId}
      const res = await fetch(`/api/analytics?slug=${encodeURIComponent(projectId)}&period=today`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setSiteVisitors(d.realtimeSite ?? 0);
        // salesStats.visitors = bezoekers vandaag op kopen.repp.nl/{projectSlug}
        setSalesVisitors(d.salesStats?.visitors ?? 0);
      }
    } catch {}
  }, [projectId]);

  useEffect(() => {
    const unitsInterval    = setInterval(pollUnits, 15000);
    const visitorsInterval = setInterval(pollVisitors, 30000);
    return () => { clearInterval(unitsInterval); clearInterval(visitorsInterval); };
  }, [pollUnits, pollVisitors]);

  const progressPercentage = stats.totalProjectValue > 0 ? Math.min(stats.verkochtTotal / stats.totalProjectValue * 100, 100) : 0;
  const potentialPercentage = stats.totalProjectValue > 0 ? Math.min((stats.verkochtTotal + stats.gereserveerdTotal) / stats.totalProjectValue * 100, 100) : 0;
  const timer = useLiveTimer(saleStartsAt);
  const circumference = 2 * Math.PI * 52;

  const timelineData = useMemo(() => {
    const grouped: Record<string, { sold: number; reserved: number }> = {};
    units.forEach((unit) => {
      const dateStr = unit.boughtAt || unit.reservedAt;
      if (!dateStr) return;
      const date = dateStr.split("T")[0];
      if (!grouped[date]) grouped[date] = { sold: 0, reserved: 0 };
      if (unit.status === "verkocht") grouped[date].sold += 1;
      else if (unit.status === "gereserveerd") grouped[date].reserved += 1;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: format(parseISO(date), "d MMM", { locale: nl }),
        ...data,
      }));
  }, [units]);

  const sortedUnits = useMemo(() => [...units].sort((a, b) => {
    const order: Record<string, number> = { verkocht: 0, gereserveerd: 1, beschikbaar: 2, coming_soon: 3 };
    return (order[a.status] ?? 4) - (order[b.status] ?? 4) || a.code.localeCompare(b.code, undefined, { numeric: true });
  }), [units]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot color="emerald" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Verkoopmoment</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Verkoopvoortgang</h1>
            <p className="text-gray-400 mt-1">{projectName}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {timer && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10">
                <Timer size={13} className="text-yellow-400" />
                <span className="text-sm font-mono font-bold text-yellow-300">{timer}</span>
                <span className="text-xs text-gray-400">live</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw size={12} className={cn("text-yellow-400", isRefreshing && "animate-spin")} />
              <span>Bijgewerkt {format(lastUpdated, "HH:mm:ss", { locale: nl })}</span>
            </div>
            <button
              onClick={() => setMuted((m) => !m)}
              title={muted ? "Geluid aan" : "Geluid uit"}
              className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
                muted ? "border-gray-700 text-gray-600 hover:text-gray-400" : "border-yellow-400/30 text-yellow-400 hover:border-yellow-400"
              )}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-900/40 border border-emerald-700/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle2 size={22} className="text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Verkocht</p>
              <p className="text-2xl font-bold text-white">{stats.verkocht}</p>
              <p className="text-xs text-emerald-400">{formatCurrency(stats.verkochtTotal)}</p>
            </div>
          </div>
          <div className="bg-blue-900/40 border border-amber-700/30 rounded-xl p-4 flex items-center gap-3">
            <Clock size={22} className="text-amber-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Gereserveerd</p>
              <p className="text-2xl font-bold text-white">{stats.gereserveerd}</p>
              <p className="text-xs text-amber-400">{formatCurrency(stats.gereserveerdTotal)}</p>
            </div>
          </div>
          {plausibleSiteId && (
            <div className="bg-blue-900/40 border border-yellow-700/30 rounded-xl p-4 flex items-center gap-3">
              <Radio size={22} className="text-yellow-400 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Live bezoekers site</p>
                <p className="text-2xl font-bold text-white">{siteVisitors}</p>
                <p className="text-xs text-gray-500">{plausibleSiteId}</p>
              </div>
            </div>
          )}
          <div className="bg-blue-900/40 border border-yellow-700/30 rounded-xl p-4 flex items-center gap-3">
            <Users size={22} className="text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Bezoekers verkooptool</p>
              <p className="text-2xl font-bold text-white">{salesVisitors}</p>
              <p className="text-xs text-gray-500">kopen.repp.nl/{projectId} · vandaag</p>
            </div>
          </div>
        </div>

        {/* Progress + chart + activity */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          {/* Sales progress circle */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 flex flex-col items-center justify-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Verkoopvoortgang</p>
            <svg width="120" height="120" viewBox="0 0 120 120" className="rotate-[-90deg]">
              <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
              <circle cx="60" cy="60" r="52" stroke="#fbbf24" strokeWidth="10" fill="none" strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - potentialPercentage / 100)} strokeLinecap="round" opacity="0.35" />
              <circle cx="60" cy="60" r="52" stroke="#34d399" strokeWidth="10" fill="none" strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progressPercentage / 100)} strokeLinecap="round" />
            </svg>
            <div className="text-center mt-4">
              <p className="text-3xl font-bold text-white">{progressPercentage.toFixed(0)}%</p>
              <p className="text-xs text-gray-400 mt-1">verkocht</p>
            </div>
            <div className="w-full mt-4 pt-4 border-t border-blue-800/40 space-y-2 text-xs">
              <div className="flex justify-between text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Verkocht</span>
                <span>{formatCurrency(stats.verkochtTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Gereserveerd</span>
                <span>{formatCurrency(stats.gereserveerdTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Projectwaarde</span>
                <span>{formatCurrency(stats.totalProjectValue)}</span>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-yellow-400" />
              Verkopen en Reserveringen per Dag
            </h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timelineData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickLine={false} width={24} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                  <Bar dataKey="sold" name="Verkocht" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="reserved" name="Gereserveerd" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-52 text-gray-500 text-sm">Nog geen verkoop- of reserveringsdata</div>
            )}
          </div>
        </div>

        {/* Unit grid + activity feed */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Unit status grid */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-yellow-400" />
              Units overzicht
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {sortedUnits.map((unit) => (
                <div key={unit.id} className={cn("rounded-lg p-2 text-center border text-xs font-semibold",
                  unit.status === "verkocht"     && "bg-emerald-900/30 border-emerald-600/40 text-emerald-300",
                  unit.status === "gereserveerd" && "bg-amber-900/30 border-amber-600/40 text-amber-300",
                  unit.status === "beschikbaar"  && "bg-blue-900/30 border-blue-700/40 text-gray-300",
                  unit.status === "coming_soon"  && "bg-gray-900/30 border-gray-700/40 text-gray-500"
                )}>
                  {unit.code.replace(/^U-?/i, "")}
                  <div className="text-[10px] font-normal mt-0.5 opacity-70">
                    {unit.status === "verkocht" ? "✓" : unit.status === "gereserveerd" ? "◷" : unit.status === "coming_soon" ? "…" : "○"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={16} className="text-yellow-400" />
              Live activiteitenfeed
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentActivity.length > 0 ? recentActivity.map((event, i) => (
                <div key={`${event.id}-${i}`} className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-sm",
                  event.status === "verkocht" ? "bg-emerald-900/20 border-emerald-700/30" : "bg-amber-900/20 border-amber-700/30"
                )}>
                  <span className="font-medium text-white">{event.text}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-3">
                    {formatDistanceToNow(event.time, { addSuffix: true, locale: nl })}
                  </span>
                </div>
              )) : (
                <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                  <div className="text-center">
                    <Activity size={24} className="mx-auto mb-2 opacity-30" />
                    <p>Wacht op verkoop- of reserveringsactiviteit...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
