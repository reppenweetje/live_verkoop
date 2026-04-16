"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Clock, Activity, RefreshCw, Radio, VolumeX, Volume2, Users, CheckCircle2, Timer, MapPin, Columns2, Monitor, Euro, UserCheck } from "lucide-react";
import { format, parseISO, formatDistanceToNow, differenceInSeconds } from "date-fns";
import { nl } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { useSaleAudio } from "@/hooks/useSaleAudio";
import { getProjectConfig, formatUnitCode } from "@/lib/project-config";
import type { ActiveLead } from "@/app/api/active-leads/route";

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
  reservedByName?: string;
  boughtByName?: string;
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
  leadName?: string;
}

function ActionBadge({ action, config }: { action?: ActiveLead["currentAction"]; config: ReturnType<typeof getProjectConfig> }) {
  if (!action) return null;
  const code = "unitCode" in action ? formatUnitCode(action.unitCode, config) : null;
  if (action.type === "gekocht") return (
    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80" }}>
      💰 gekocht {code}
    </span>
  );
  if (action.type === "gereserveerd") return (
    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
      ⚡ gereserveerd {code}
    </span>
  );
  if (action.type === "geannuleerd") return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(148,163,184,0.12)", color: "#94a3b8" }}>
      ↩ geannuleerd {code}
    </span>
  );
  if (action.type === "favoriet") return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}>
      ❤ favoriet
    </span>
  );
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#6b7280" }}>
      actief
    </span>
  );
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

function ActivityTicker({ events }: { events: ActivityEvent[] }) {
  const hasActivity = events.length > 0;
  const items = hasActivity
    ? events
    : [{ id: "p1", text: "Wacht op activiteit...", status: "beschikbaar" as UnitStatus, time: new Date() }];

  const speed = hasActivity ? Math.max(18, 45 - events.length * 3) : 45;
  const doubled = [...items, ...items];

  return (
    <div
      className="w-full flex items-center"
      style={{
        background: "rgba(15,15,80,0.95)",
        height: 38,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* LIVE badge */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 h-full" style={{ borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-bold tracking-widest" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Montserrat',sans-serif" }}>LIVE</span>
      </div>

      {/* Scrollende items met fade aan de randen */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
        }}
      >
        <div
          className="flex items-center whitespace-nowrap"
          style={{ animation: `ticker-scroll ${speed}s linear infinite` }}
        >
          {doubled.map((event, i) => {
            const isSold     = event.status === "verkocht";
            const isReserved = event.status === "gereserveerd";
            return (
              <span key={`${event.id}-${i}`} className="inline-flex items-center gap-2 px-6 text-xs">
                {isSold     && <span>💰</span>}
                {isReserved && <span>⚡</span>}
                <span style={{
                  color: isSold ? "#4ade80" : isReserved ? "#facc15" : "rgba(255,255,255,0.25)",
                  fontWeight: isSold || isReserved ? 600 : 400,
                  fontFamily: "'Montserrat',sans-serif",
                }}>
                  {event.text}
                </span>
                {event.leadName && (isSold || isReserved) && (
                  <span style={{ color: isSold ? "rgba(74,222,128,0.7)" : "rgba(250,204,21,0.7)", fontSize: 10, fontWeight: 500 }}>
                    door {event.leadName}
                  </span>
                )}
                {(isSold || isReserved) && (
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
                    · {formatDistanceToNow(event.time, { addSuffix: true, locale: nl })}
                  </span>
                )}
                <span style={{ color: "rgba(255,255,255,0.1)", marginLeft: 8 }}>·</span>
              </span>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

interface Props {
  initialUnits: DashboardUnit[];
  initialStats: UnitStats;
  directusProjectId: number;
  projectName: string;
  projectId: string;
  initialSiteVisitors: number;
  initialSalesVisitors: number;
  saleStartsAt?: string;
}

export default function VerkoopvoortgangClient({
  initialUnits, initialStats, directusProjectId, projectName,
  projectId, initialSiteVisitors, initialSalesVisitors, saleStartsAt
}: Props) {
  const config = getProjectConfig(projectId);
  const [units, setUnits] = useState(initialUnits);
  const [stats, setStats] = useState(initialStats);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [siteVisitors, setSiteVisitors] = useState(initialSiteVisitors);
  const [salesVisitors, setSalesVisitors] = useState(initialSalesVisitors);
  const [muted, setMuted] = useState(false);
  const [portraitMode, setPortraitMode] = useState(false);
  const prevUnitsRef = useRef(initialUnits);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [activeLeads, setActiveLeads] = useState<ActiveLead[]>([]);

  // Portrait mode persisteren in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vv_portrait");
    if (stored === "1") setPortraitMode(true);
  }, []);

  const togglePortrait = useCallback(() => {
    setPortraitMode((p) => {
      localStorage.setItem("vv_portrait", p ? "0" : "1");
      return !p;
    });
  }, []);

  // 6th Grid jingle bij verkoop of reservering (overschrijft generieke geluiden)
  const jingleSrc = projectId === "6th-grid" ? "/audio/6th-grid.mp3" : undefined;
  const { audioUnlocked, manualUnlock } = useSaleAudio(units, muted, jingleSrc);

  // Detecteer nieuwe verkopen/reserveringen
  useEffect(() => {
    const prev = prevUnitsRef.current;
    const newEvents: ActivityEvent[] = [];
    units.forEach((unit) => {
      const old = prev.find((u) => u.id === unit.id);
      if (!old) return;
      if (old.status !== "verkocht" && unit.status === "verkocht") {
        const leadName = unit.boughtByName || unit.reservedByName;
        newEvents.push({
          id: unit.id,
          text: `${formatUnitCode(unit.code, config)} VERKOCHT`,
          leadName,
          status: "verkocht",
          time: new Date(),
        });
      } else if (old.status !== "gereserveerd" && unit.status === "gereserveerd") {
        const leadName = unit.reservedByName;
        newEvents.push({
          id: unit.id,
          text: `${formatUnitCode(unit.code, config)} GERESERVEERD`,
          leadName,
          status: "gereserveerd",
          time: new Date(),
        });
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
      .slice(0, 15)
      .map((u) => ({
        id: u.id,
        text: u.status === "verkocht"
          ? `${formatUnitCode(u.code, config)} VERKOCHT`
          : `${formatUnitCode(u.code, config)} GERESERVEERD`,
        leadName: u.status === "verkocht" ? (u.boughtByName || u.reservedByName) : u.reservedByName,
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
      const res = await fetch(`/api/analytics?slug=${encodeURIComponent(projectId)}&period=today`, { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setSiteVisitors(d.realtimeSite ?? 0);
        setSalesVisitors(d.salesStats?.visitors ?? 0);
      }
    } catch {}
  }, [projectId]);

  const pollActiveLeads = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/active-leads?projectSlug=${encodeURIComponent(projectId)}&directusProjectId=${directusProjectId}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const d = await res.json();
        setActiveLeads(d.activeLeads ?? []);
      }
    } catch {}
  }, [projectId, directusProjectId]);

  useEffect(() => {
    pollActiveLeads(); // direct ophalen bij mount
    const unitsInterval    = setInterval(pollUnits, 3000);
    const visitorsInterval = setInterval(pollVisitors, 15000);
    const leadsInterval    = setInterval(pollActiveLeads, 3000);
    return () => {
      clearInterval(unitsInterval);
      clearInterval(visitorsInterval);
      clearInterval(leadsInterval);
    };
  }, [pollUnits, pollVisitors, pollActiveLeads]);

  const progressPercentage = stats.totalProjectValue > 0 ? Math.min(stats.verkochtTotal / stats.totalProjectValue * 100, 100) : 0;
  const potentialPercentage = stats.totalProjectValue > 0 ? Math.min((stats.verkochtTotal + stats.gereserveerdTotal) / stats.totalProjectValue * 100, 100) : 0;
  const timer = useLiveTimer(saleStartsAt);
  const circumference = 2 * Math.PI * 52;

  const timelineData = useMemo(() => {
    const grouped: Record<string, { sold: number; reserved: number }> = {};
    units.forEach((unit) => {
      if (unit.status === "verkocht" && unit.boughtAt) {
        const date = unit.boughtAt.split("T")[0];
        if (!grouped[date]) grouped[date] = { sold: 0, reserved: 0 };
        grouped[date].sold += 1;
      } else if (unit.status === "gereserveerd" && unit.reservedAt) {
        const date = unit.reservedAt.split("T")[0];
        if (!grouped[date]) grouped[date] = { sold: 0, reserved: 0 };
        grouped[date].reserved += 1;
      }
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

  // ─── Gedeelde blokken ─────────────────────────────────────────────────────

  const headerControls = (
    <div className="flex items-center gap-2 flex-wrap">
      {timer && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10">
          <Timer size={13} className="text-yellow-400" />
          <span className="text-sm font-mono font-bold text-yellow-300">{timer}</span>
          <span className="text-xs text-gray-400">live</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <RefreshCw size={12} className={cn("text-yellow-400", isRefreshing && "animate-spin")} />
        <span>{format(lastUpdated, "HH:mm:ss", { locale: nl })}</span>
      </div>
      {/* Audio-knop: ontgrendelt iOS audio context bij eerste tap én toggelt mute */}
      <button
        onClick={() => { manualUnlock(); setMuted((m) => !m); }}
        title={!audioUnlocked ? "Tik om audio in te schakelen" : muted ? "Geluid aan" : "Geluid uit"}
        className={cn(
          "flex items-center gap-1.5 px-2 h-8 rounded-full border transition-colors text-xs font-medium",
          !audioUnlocked
            ? "border-yellow-400 text-yellow-400 bg-yellow-400/10 animate-pulse"
            : muted
              ? "border-gray-700 text-gray-600"
              : "border-yellow-400/30 text-yellow-400"
        )}
      >
        {!audioUnlocked ? (
          <><Volume2 size={13} /><span>Audio aan</span></>
        ) : muted ? (
          <VolumeX size={14} />
        ) : (
          <Volume2 size={14} />
        )}
      </button>
      <button onClick={togglePortrait} title={portraitMode ? "Volledig scherm" : "Portrait mode"}
        className={cn("w-8 h-8 rounded-full flex items-center justify-center border transition-colors",
          portraitMode ? "border-yellow-400 text-yellow-400 bg-yellow-400/10" : "border-gray-700 text-gray-500 hover:text-gray-300"
        )}>
        {portraitMode ? <Monitor size={14} /> : <Columns2 size={14} />}
      </button>
    </div>
  );

  const kpiCards = (compact = false) => (
    <div className={cn("grid gap-3 mb-4", compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4 mb-6")}>
      <div className="bg-blue-900/40 border border-emerald-700/30 rounded-xl p-3 flex items-center gap-3">
        <CheckCircle2 size={compact ? 18 : 22} className="text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Verkocht</p>
          <p className={cn("font-bold text-white", compact ? "text-xl" : "text-2xl")}>{stats.verkocht}</p>
          <p className="text-xs text-emerald-400">{formatCurrency(stats.verkochtTotal)}</p>
        </div>
      </div>
      <div className="bg-blue-900/40 border border-amber-700/30 rounded-xl p-3 flex items-center gap-3">
        <Clock size={compact ? 18 : 22} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Gereserveerd</p>
          <p className={cn("font-bold text-white", compact ? "text-xl" : "text-2xl")}>{stats.gereserveerd}</p>
          <p className="text-xs text-amber-400">{formatCurrency(stats.gereserveerdTotal)}</p>
        </div>
      </div>
      <div className="bg-blue-900/40 border border-yellow-700/30 rounded-xl p-3 flex items-center gap-3">
        <Radio size={compact ? 18 : 22} className="text-yellow-400 animate-pulse flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Live bezoekers</p>
          <p className={cn("font-bold text-white", compact ? "text-xl" : "text-2xl")}>{siteVisitors}</p>
          <p className="text-xs text-gray-500">kopen.repp.nl</p>
        </div>
      </div>
      <div className="bg-blue-900/40 border border-yellow-700/30 rounded-xl p-3 flex items-center gap-3">
        <Users size={compact ? 18 : 22} className="text-yellow-400 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Vandaag</p>
          <p className={cn("font-bold text-white", compact ? "text-xl" : "text-2xl")}>{salesVisitors}</p>
          <p className="text-xs text-gray-500">{projectId}</p>
        </div>
      </div>
    </div>
  );

  const progressCircle = (size: number = 120, strokeW: number = 10) => {
    const r = (size / 2) - strokeW;
    const circ = 2 * Math.PI * r;
    return (
      <div className="flex flex-col items-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Verkoopvoortgang</p>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
          <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke="#fbbf24" strokeWidth={strokeW} fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - potentialPercentage / 100)} strokeLinecap="round" opacity="0.35" />
          <circle cx={size/2} cy={size/2} r={r} stroke="#34d399" strokeWidth={strokeW} fill="none"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - progressPercentage / 100)} strokeLinecap="round" />
        </svg>
        <div className="text-center mt-3">
          <p className="text-3xl font-bold text-white">{progressPercentage.toFixed(0)}%</p>
          <p className="text-xs text-gray-400 mt-0.5">verkocht</p>
        </div>
        <div className="w-full mt-3 pt-3 border-t border-blue-800/40 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-300">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" />Verkocht</span>
            <span>{formatCurrency(stats.verkochtTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Gereserveerd</span>
            <span>{formatCurrency(stats.gereserveerdTotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Totaal</span>
            <span>{formatCurrency(stats.totalProjectValue)}</span>
          </div>
        </div>
      </div>
    );
  };

  const unitGrid = (cols: 3 | 4 = 4) => (
    <div>
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <MapPin size={14} className="text-yellow-400" />
        {config.unitPlural} overzicht
      </h3>
      <div className={cn("grid gap-1.5", cols === 3 ? "grid-cols-3" : "grid-cols-4")}>
        {sortedUnits.map((unit) => (
          <div
            key={unit.id}
            className="rounded-lg p-1.5 text-center border text-xs font-bold transition-all duration-500"
            style={
              unit.status === "verkocht"
                ? { background: "rgba(0,255,136,0.12)", border: "1.5px solid rgba(0,255,136,0.5)", color: "#00ff88", boxShadow: "0 0 8px rgba(0,255,136,0.2)" }
                : unit.status === "gereserveerd"
                ? { background: "rgba(237,255,0,0.1)", border: "1.5px solid rgba(237,255,0,0.5)", color: "#edff00", boxShadow: "0 0 8px rgba(237,255,0,0.15)" }
                : unit.status === "coming_soon"
                ? { background: "rgba(30,41,59,0.4)", border: "1px solid rgba(71,85,105,0.3)", color: "#475569" }
                : { background: "rgba(30,58,138,0.25)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd" }
            }
          >
            {formatUnitCode(unit.code, config)}
            <div className="text-[9px] font-normal mt-0.5 opacity-80">
              {unit.status === "verkocht" ? "✓" : unit.status === "gereserveerd" ? "◷" : unit.status === "coming_soon" ? "…" : "○"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Portrait mode layout ──────────────────────────────────────────────────
  if (portraitMode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0f0f70 0%, #0d0d5e 100%)" }}>
        {/* Ticker bovenaan */}
        <ActivityTicker events={recentActivity} />

        {/* Compacte header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(237,255,0,0.08)" }}>
          <div className="flex items-center gap-2">
            <LiveDot color="emerald" />
            <div>
              <span className="text-sm font-bold text-white" style={{ fontFamily: "'Montserrat',sans-serif" }}>Verkoopvoortgang</span>
              <span className="text-xs text-gray-500 ml-2">{projectName}</span>
            </div>
          </div>
          {headerControls}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* KPI's 2x2 */}
          {kpiCards(true)}

          {/* Omzet compact */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><Euro size={11} className="text-emerald-400" />Omzet behaald</p>
              <p className="text-xl font-black text-emerald-300" style={{ fontFamily: "'Montserrat',sans-serif" }}>{formatCurrency(stats.verkochtTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{stats.verkocht} verkocht</p>
              <p className="text-xs text-amber-400">{stats.gereserveerd} gereserveerd</p>
            </div>
          </div>

          {/* Nu online — namen met groene stip */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={11} className="text-emerald-400" />
                Actief
              </p>
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: activeLeads.length > 0 ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", color: activeLeads.length > 0 ? "#4ade80" : "#6b7280" }}>
                <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", activeLeads.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600")} />
                {activeLeads.length} actief
              </span>
            </div>
            {activeLeads.length === 0 ? (
              <p className="text-xs text-gray-600 py-2 text-center">Geen leads actief in de afgelopen 5 min</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {activeLeads.map((lead) => (
                  <div key={lead.id} className="flex items-start gap-2.5">
                    <span className="relative flex-shrink-0 mt-0.5">
                      <span className="w-6 h-6 rounded-full bg-blue-700/60 flex items-center justify-center text-xs font-bold text-white">
                        {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                      </span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 animate-pulse"
                        style={{ borderColor: "rgba(15,15,80,0.9)" }} />
                    </span>
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-white truncate">{lead.firstName} {lead.lastName}</p>
                      <ActionBadge action={lead.currentAction} config={config} />
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 mt-0.5">
                      {formatDistanceToNow(new Date(lead.lastActiveAt), { addSuffix: false, locale: nl })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Progress circle + unit grid naast elkaar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4">
              {progressCircle(100, 8)}
            </div>
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4">
              {unitGrid(3)}
            </div>
          </div>

          {/* Activiteitenfeed compact */}
          <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Activity size={13} className="text-yellow-400" />
              Live activiteiten
            </h3>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {recentActivity.length > 0 ? recentActivity.slice(0, 8).map((event, i) => (
                <div key={`${event.id}-${i}`} className={cn(
                  "flex items-start justify-between px-3 py-2 rounded-lg border text-xs",
                  event.status === "verkocht" ? "bg-emerald-900/20 border-emerald-700/30" : "bg-amber-900/20 border-amber-700/30"
                )}>
                  <div className="flex-1 min-w-0">
                    <span className={cn("font-semibold", event.status === "verkocht" ? "text-emerald-300" : "text-amber-300")}>
                      {event.text}
                    </span>
                    {event.leadName && (
                      <p className="text-gray-400 mt-0.5">door <span className="text-white">{event.leadName}</span></p>
                    )}
                  </div>
                  <span className="text-gray-500 whitespace-nowrap ml-2 flex-shrink-0 mt-0.5">
                    {formatDistanceToNow(event.time, { addSuffix: true, locale: nl })}
                  </span>
                </div>
              )) : (
                <p className="text-gray-500 text-xs text-center py-4">Wacht op activiteit...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normale (volledig scherm) layout ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950">
      {/* Ticker */}
      <ActivityTicker events={recentActivity} />

      <div className="px-6 py-8">
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
            {headerControls}
          </div>

          {/* Top KPIs */}
          {kpiCards(false)}

          {/* Progress + omzet + velocity */}
          <div className="grid gap-6 lg:grid-cols-3 mb-6">
            {/* Voortgang cirkel */}
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 flex flex-col items-center justify-center">
              {progressCircle(120, 10)}
            </div>

            {/* Omzetmeter */}
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-3">
                <Euro size={15} className="text-emerald-400" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Omzet behaald</p>
              </div>
              <p
                className="font-black text-emerald-300 leading-none mb-1 transition-all duration-700"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", fontFamily: "'Montserrat',sans-serif", textShadow: "0 0 30px rgba(74,222,128,0.3)" }}
              >
                {formatCurrency(stats.verkochtTotal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.verkocht} unit{stats.verkocht !== 1 ? "s" : ""} verkocht</p>

              <div className="mt-4 pt-4 border-t border-blue-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} className="text-amber-400" />
                  <p className="text-xs text-gray-400">Incl. reserveringen</p>
                </div>
                <p className="text-lg font-bold text-amber-300">{formatCurrency(stats.verkochtTotal + stats.gereserveerdTotal)}</p>
                <p className="text-xs text-gray-500">{stats.verkocht + stats.gereserveerd} van {stats.total} {stats.total === 1 ? "unit" : "units"}</p>
              </div>
            </div>

            {/* Nu online — actieve leads */}
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserCheck size={15} className="text-emerald-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actief</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: activeLeads.length > 0 ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", color: activeLeads.length > 0 ? "#4ade80" : "#6b7280" }}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", activeLeads.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600")} />
                  {activeLeads.length} actief
                </span>
              </div>

              {activeLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <p className="text-xs text-gray-600 text-center">Geen leads actief in de afgelopen 5 min</p>
                </div>
              ) : (
                <div className="flex-1 space-y-2 overflow-y-auto max-h-44">
                  {activeLeads.map((lead) => (
                    <div key={lead.id} className="flex items-start justify-between py-1.5 border-b border-blue-800/30 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex-shrink-0">
                          <span className="w-6 h-6 rounded-full bg-blue-700/50 flex items-center justify-center text-xs font-bold text-white">
                            {lead.firstName.charAt(0)}{lead.lastName.charAt(0)}
                          </span>
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 animate-pulse"
                            style={{ borderColor: "rgba(15,15,80,0.9)" }} />
                        </span>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <p className="text-xs font-semibold text-white truncate">{lead.firstName} {lead.lastName}</p>
                          <ActionBadge action={lead.currentAction} config={config} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2 flex-shrink-0 mt-0.5">
                        {formatDistanceToNow(new Date(lead.lastActiveAt), { addSuffix: true, locale: nl })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-600 mt-3 pt-2 border-t border-blue-800/30">
                Actief in de afgelopen 5 min · verlengt bij nieuwe actie
              </p>
            </div>
          </div>

          {/* Unit grid + activity feed */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6">
              {unitGrid(4)}
            </div>
            <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-yellow-400" />
                Live activiteitenfeed
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recentActivity.length > 0 ? recentActivity.map((event, i) => (
                  <div key={`${event.id}-${i}`} className={cn(
                    "flex items-start justify-between p-3 rounded-lg border text-sm",
                    event.status === "verkocht" ? "bg-emerald-900/20 border-emerald-700/30" : "bg-amber-900/20 border-amber-700/30"
                  )}>
                    <div className="flex-1 min-w-0">
                      <span className={cn("font-bold", event.status === "verkocht" ? "text-emerald-300" : "text-amber-300")}>
                        {event.text}
                      </span>
                      {event.leadName && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          door <span className="font-semibold text-white">{event.leadName}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-3 flex-shrink-0 mt-0.5">
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
    </div>
  );
}
