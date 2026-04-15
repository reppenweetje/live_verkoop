"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import {
  Users, Eye, Clock, TrendingDown, ShoppingCart, MousePointerClick, Radio,
  RefreshCw, ChevronDown, Globe, Monitor, Smartphone, Rocket, Heart, Star,
  CheckCircle, Trophy, UserPlus, CalendarClock, Settings, X, Plus, Trash2,
  Flag, Megaphone, PartyPopper, Milestone as MilestoneIcon,
} from "lucide-react";
import { format, parseISO, eachMonthOfInterval, startOfMonth } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatDuration, PERIODS } from "@/lib/plausible";
import { getProjectConfig, formatUnitCode } from "@/lib/project-config";
import type { TimelineData, Milestone, SaleEvent } from "@/app/api/timeline/route";
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

// ─── Horizontal timeline component ───────────────────────────────────────────


// ─── Horizontal timeline component ───────────────────────────────────────────

/**
 * Spacing algorithm:
 *  1. Forward pass – ensure MIN_GAP between consecutive positions.
 *  2. If the last item exceeds USABLE_MAX, anchor it there and pull
 *     neighbours back (backward pass), then forward-pass once more.
 * This keeps labels readable while preserving relative order.
 */
function applyMinSpacing(rawPcts: number[], min: number, max: number): number[] {
  if (rawPcts.length === 0) return [];
  const p = [...rawPcts];
  const n = p.length;
  // Forward
  for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1] + min);
  // Compress from right if overflowing
  if (p[n - 1] > max) {
    p[n - 1] = max;
    for (let i = n - 2; i >= 0; i--) p[i] = Math.min(p[i], p[i + 1] - min);
    p[0] = Math.max(0, p[0]);
    for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1] + min);
  }
  return p;
}

function HorizontalTimeline({
  allMilestones,
  totalSellable,
  soldCount,
  reservedCount,
}: {
  allMilestones: (Milestone & { _customIcon?: string })[];
  totalSellable: number;
  soldCount: number;
  reservedCount: number;
}) {
  const datedItems = allMilestones
    .filter((m) => m.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  const undatedItems = allMilestones.filter((m) => !m.date);

  if (datedItems.length === 0) return null;

  const minTs      = new Date(datedItems[0].date!).getTime();
  const maxDatedTs = new Date(datedItems[datedItems.length - 1].date!).getTime();
  const bufferMs   = Math.max((maxDatedTs - minTs) * 0.22, 30 * 24 * 3600 * 1000);
  const rangeMs    = maxDatedTs + bufferMs - minTs;

  const USABLE  = undatedItems.length > 0 ? 86 : 96; // % of bar width for dated items
  const MIN_GAP = 14; // % — wide enough so 90px-centred labels don't collide

  const rawPcts  = datedItems.map((m) =>
    ((new Date(m.date!).getTime() - minTs) / rangeMs) * USABLE
  );
  const positions = applyMinSpacing(rawPcts, MIN_GAP, USABLE);

  const soldPct     = totalSellable > 0 ? (soldCount     / totalSellable) * 100 : 0;
  const reservedPct = totalSellable > 0 ? (reservedCount / totalSellable) * 100 : 0;

  // Geometry constants (px)
  const LABEL_AREA = 105; // space above / below the line
  const CONN_H     = 24;  // connector line height
  const LBL_W      = 90;  // label box width
  const LINE_Y     = LABEL_AREA; // y-coordinate of the timeline line

  // Decide label horizontal anchor based on position
  function tx(pct: number) {
    if (pct < 10) return "translateX(-5%)";
    if (pct > 84) return "translateX(-95%)";
    return "translateX(-50%)";
  }
  function textAlign(pct: number): string {
    if (pct < 10) return "text-left";
    if (pct > 84) return "text-right";
    return "text-center";
  }

  // ── Month axis ────────────────────────────────────────────────────────────
  const allMonths = eachMonthOfInterval({
    start: startOfMonth(new Date(minTs)),
    end:   new Date(minTs + rangeMs),
  }).map((d, i, arr) => {
    const pct    = ((d.getTime() - minTs) / rangeMs) * 100;
    const isNew  = i === 0 || d.getFullYear() !== arr[i - 1].getFullYear();
    const label  = isNew
      ? format(d, "MMM ''yy", { locale: nl })
      : format(d, "MMM",       { locale: nl });
    return { pct, label, isNew };
  }).filter((m) => m.pct >= 0 && m.pct <= 100);

  return (
    <div className="space-y-6">
      {/* ── Timeline band ──────────────────────────────────────────────────── */}
      <div className="relative overflow-visible" style={{ height: `${LINE_Y * 2 + 2}px` }}>

        {/* Horizontal rule */}
        <div
          className="absolute left-0 right-0"
          style={{ top: `${LINE_Y}px`, height: "2px", background: "rgba(59,130,246,0.22)" }}
        />

        {/* Dated milestones */}
        {datedItems.map((m, idx) => {
          const pct   = positions[idx];
          const above = idx % 2 === 0;
          const ta    = textAlign(pct);
          const tX    = tx(pct);

          const dot = (
            <div
              className={cn(
                "rounded-full z-10 flex-shrink-0",
                m.completed
                  ? "bg-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.5)]"
                  : "border-2 border-dashed border-blue-600/50 bg-[#0b1d40]"
              )}
              style={{ width: "13px", height: "13px" }}
            />
          );

          const label = (
            <div className={cn("flex flex-col gap-0", ta === "text-left" ? "items-start" : ta === "text-right" ? "items-end" : "items-center")} style={{ width: `${LBL_W}px` }}>
              <p className={cn("text-[12px] font-semibold leading-tight w-full", ta, m.completed ? "text-white" : "text-blue-700/50")}>
                {m.label}
              </p>
              <p className={cn("text-[10.5px] text-gray-500 tabular-nums mt-1 w-full", ta)}>
                {format(parseISO(m.date!), "d MMM yyyy", { locale: nl })}
              </p>
              {m.context && (
                <p className={cn("text-[9.5px] text-gray-600 mt-0.5 leading-tight w-full", ta)}>
                  {m.context}
                </p>
              )}
            </div>
          );

          const connector = (
            <div className="w-px bg-blue-700/25 flex-shrink-0" style={{ height: `${CONN_H}px` }} />
          );

          return (
            <div
              key={m.key}
              className="absolute"
              style={{ left: `${pct}%`, top: `${LINE_Y}px` }}
            >
              {/* Dot centred on the line */}
              <div
                className="absolute"
                style={{ left: "0", top: "0", transform: "translate(-50%, -50%)", zIndex: 10 }}
              >
                {dot}
              </div>

              {above ? (
                /* Label above */
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    bottom: `${CONN_H + 10}px`,
                    left: "0",
                    transform: tX,
                  }}
                >
                  {label}
                  <div className="mt-2">{connector}</div>
                </div>
              ) : (
                /* Label below */
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    top: `${CONN_H + 10}px`,
                    left: "0",
                    transform: tX,
                  }}
                >
                  {connector}
                  <div className="mt-2">{label}</div>
                </div>
              )}
            </div>
          );
        })}

        {/* Undated milestone — always at far right, label goes left */}
        {undatedItems.map((m) => (
          <div
            key={m.key}
            className="absolute"
            style={{ right: "0", top: `${LINE_Y}px` }}
          >
            {/* Dashed ring */}
            <div
              className="absolute rounded-full border-2 border-dashed border-yellow-400/25"
              style={{ width: "18px", height: "18px", right: "0", top: "0", transform: "translate(50%, -50%)" }}
            />
            {/* Label above, right-aligned */}
            <div
              className="absolute flex flex-col items-end"
              style={{ bottom: `${CONN_H + 10}px`, right: "0", width: `${LBL_W}px` }}
            >
              <p className="text-[12px] font-semibold text-yellow-400/40 text-right w-full leading-tight">
                {m.label}
              </p>
              <p className="text-[10px] text-blue-800/70 mt-1 text-right w-full">
                nog niet bereikt
              </p>
              <div className="mt-2 w-px bg-blue-700/20 self-center" style={{ height: `${CONN_H}px` }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Maand-as ─────────────────────────────────────────────────────── */}
      <div className="relative" style={{ height: "32px", marginTop: "-4px" }}>
        {/* Subtiele verbindingslijn met de tijdlijn erboven */}
        <div className="absolute left-0 right-0 top-0 h-px" style={{ background: "rgba(59,130,246,0.15)" }} />

        {allMonths.map(({ pct, label, isNew }) => (
          <div
            key={label + pct}
            className="absolute top-0"
            style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          >
            {/* Tick */}
            <div
              className="mx-auto"
              style={{
                width: "1px",
                height: isNew ? "10px" : "6px",
                background: isNew ? "rgba(148,163,184,0.5)" : "rgba(71,85,105,0.5)",
              }}
            />
            {/* Label */}
            <p
              className={cn(
                "tabular-nums mt-1 whitespace-nowrap text-center",
                isNew ? "text-gray-400 text-[10px] font-semibold" : "text-blue-800/70 text-[9.5px]"
              )}
              style={{ transform: "translateX(-50%)", position: "relative", left: "50%" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Verkoopvoortgang balk ─────────────────────────────────────────── */}
      {totalSellable > 0 && (
        <div className="space-y-3 pt-2">
          {/* Legend row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-400/80 flex-shrink-0" />
                <strong className="text-white">{soldCount}</strong> verkocht &mdash; {Math.round(soldPct)}%
              </span>
              {reservedCount > 0 && (
                <span className="flex items-center gap-2 text-gray-500">
                  <span className="w-3 h-3 rounded-sm bg-yellow-400/55 flex-shrink-0" />
                  <strong className="text-gray-300">{reservedCount}</strong> gereserveerd &mdash; {Math.round(reservedPct)}%
                </span>
              )}
            </div>
            <span className="text-[11px] text-gray-600">
              {soldCount + reservedCount} / {totalSellable} units
            </span>
          </div>

          {/* Bar */}
          <div
            className="relative rounded-lg overflow-hidden border border-blue-800/25"
            style={{ height: "28px", background: "rgba(23,37,84,0.35)" }}
          >
            {soldPct > 0 && (
              <div
                className="absolute left-0 top-0 h-full transition-all duration-700"
                style={{ width: `${soldPct}%`, background: "rgba(52,211,153,0.72)" }}
              />
            )}
            {reservedPct > 0 && (
              <div
                className="absolute top-0 h-full transition-all duration-700"
                style={{ left: `${soldPct}%`, width: `${reservedPct}%`, background: "rgba(250,204,21,0.50)" }}
              />
            )}
            {/* Percentage label */}
            {(soldPct + reservedPct) > 8 && (
              <span className="absolute inset-y-0 left-3 flex items-center text-[11px] font-bold text-white/75 select-none pointer-events-none">
                {Math.round(soldPct + reservedPct)}%
              </span>
            )}
          </div>

          {/* Axis */}
          <div className="flex justify-between text-[10.5px] text-blue-800/55">
            <span>0%</span>
            <span className="flex items-center gap-1">
              <Trophy size={10} className="text-yellow-400/35" />
              100% uitverkocht &nbsp;({totalSellable} units)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline settings ────────────────────────────────────────────────────────

export interface CustomMilestone {
  id: string;
  label: string;
  date: string;       // ISO date string (datetime-local input value)
  context: string;
  icon: string;       // icon key
}

export interface TimelineSettings {
  hiddenMilestones: string[];       // standard milestone keys to hide
  customMilestones: CustomMilestone[];
}

const DEFAULT_SETTINGS: TimelineSettings = { hiddenMilestones: [], customMilestones: [] };

function loadSettings(projectId: string): TimelineSettings {
  try {
    const raw = localStorage.getItem(`timeline-settings-${projectId}`);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(projectId: string, settings: TimelineSettings) {
  localStorage.setItem(`timeline-settings-${projectId}`, JSON.stringify(settings));
}

// ─── Milestone icon mapping ───────────────────────────────────────────────────

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  "project-gestart":     CalendarClock,
  "eerste-registratie":  UserPlus,
  "eerste-favoriet":     Heart,
  "verkoopmoment":       Rocket,
  "eerste-reservering":  Clock,
  "eerste-verkoop":      Star,
  "uitverkocht":         Trophy,
  // Custom icon options
  "flag":                Flag,
  "megaphone":           Megaphone,
  "party":               PartyPopper,
  "milestone":           MilestoneIcon,
  "check":               CheckCircle,
  "star":                Star,
  "calendar":            CalendarClock,
  "rocket":              Rocket,
};

const STANDARD_MILESTONES: { key: string; label: string }[] = [
  { key: "project-gestart",    label: "Project aangemaakt" },
  { key: "eerste-registratie", label: "Eerste registratie" },
  { key: "eerste-favoriet",    label: "Eerste favoriet" },
  { key: "verkoopmoment",      label: "Verkoopmoment gestart" },
  { key: "eerste-reservering", label: "Eerste reservering" },
  { key: "eerste-verkoop",     label: "Eerste verkoop" },
  { key: "uitverkocht",        label: "Volledig uitverkocht" },
];

const CUSTOM_ICON_OPTIONS: { key: string; label: string; Icon: React.ElementType }[] = [
  { key: "flag",       label: "Vlag",         Icon: Flag },
  { key: "megaphone",  label: "Megafoon",     Icon: Megaphone },
  { key: "party",      label: "Feest",        Icon: PartyPopper },
  { key: "milestone",  label: "Mijlpaal",     Icon: MilestoneIcon },
  { key: "check",      label: "Vinkje",       Icon: CheckCircle },
  { key: "star",       label: "Ster",         Icon: Star },
  { key: "calendar",   label: "Kalender",     Icon: CalendarClock },
  { key: "rocket",     label: "Raket",        Icon: Rocket },
];

// ─── Settings panel ───────────────────────────────────────────────────────────

function TimelineSettingsPanel({
  projectId,
  settings,
  onSave,
  onClose,
}: {
  projectId: string;
  settings: TimelineSettings;
  onSave: (s: TimelineSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<TimelineSettings>(() => JSON.parse(JSON.stringify(settings)));
  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newContext, setNewContext] = useState("");
  const [newIcon, setNewIcon] = useState("flag");

  function toggleMilestone(key: string) {
    setDraft((prev) => {
      const hidden = prev.hiddenMilestones.includes(key)
        ? prev.hiddenMilestones.filter((k) => k !== key)
        : [...prev.hiddenMilestones, key];
      return { ...prev, hiddenMilestones: hidden };
    });
  }

  function addCustom() {
    if (!newLabel.trim() || !newDate) return;
    const custom: CustomMilestone = {
      id: Date.now().toString(),
      label: newLabel.trim(),
      date: new Date(newDate).toISOString(),
      context: newContext.trim(),
      icon: newIcon,
    };
    setDraft((prev) => ({ ...prev, customMilestones: [...prev.customMilestones, custom] }));
    setNewLabel(""); setNewDate(""); setNewContext(""); setNewIcon("flag");
  }

  function removeCustom(id: string) {
    setDraft((prev) => ({ ...prev, customMilestones: prev.customMilestones.filter((c) => c.id !== id) }));
  }

  function handleSave() {
    saveSettings(projectId, draft);
    onSave(draft);
    onClose();
  }

  const panel = (
    <div className="fixed inset-0 z-[9999] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md h-full bg-[#0a1628] border-l border-blue-800/50 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-800/40">
          <div>
            <h2 className="text-base font-bold text-white">Tijdlijn instellingen</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configureer de mijlpalen voor dit project</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-blue-800/40 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

          {/* Section 1: Standaard mijlpalen */}
          <div>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-4">
              Standaard mijlpalen
            </p>
            <p className="text-xs text-gray-500 mb-4">Zet mijlpalen aan of uit op de tijdlijn.</p>
            <div className="space-y-2">
              {STANDARD_MILESTONES.map(({ key, label }) => {
                const hidden = draft.hiddenMilestones.includes(key);
                const Icon = MILESTONE_ICONS[key] ?? CheckCircle;
                return (
                  <button
                    key={key}
                    onClick={() => toggleMilestone(key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      hidden
                        ? "border-blue-800/30 bg-blue-950/30 text-gray-600"
                        : "border-yellow-400/20 bg-yellow-400/5 text-white"
                    )}
                  >
                    <Icon size={14} className={hidden ? "text-gray-700" : "text-yellow-400"} />
                    <span className="text-sm flex-1">{label}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-semibold",
                      hidden ? "bg-blue-900/40 text-gray-600" : "bg-yellow-400/15 text-yellow-400"
                    )}>
                      {hidden ? "verborgen" : "zichtbaar"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Aangepaste mijlpalen */}
          <div>
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest mb-4">
              Aangepaste mijlpalen
            </p>

            {/* Existing customs */}
            {draft.customMilestones.length > 0 && (
              <div className="space-y-2 mb-5">
                {draft.customMilestones.map((c) => {
                  const Icon = MILESTONE_ICONS[c.icon] ?? Flag;
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-800/40 bg-blue-900/20">
                      <Icon size={14} className="text-yellow-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{c.label}</p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {format(parseISO(c.date), "d MMM yyyy · HH:mm", { locale: nl })}
                        </p>
                        {c.context && <p className="text-xs text-gray-600 mt-0.5 truncate">{c.context}</p>}
                      </div>
                      <button
                        onClick={() => removeCustom(c.id)}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new */}
            <div className="space-y-3 rounded-xl border border-blue-800/40 bg-blue-950/40 p-4">
              <p className="text-xs font-semibold text-gray-400">Nieuwe mijlpaal toevoegen</p>

              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Naam (bijv. Bezichtigingsdag)"
                className="w-full px-3 py-2 rounded-lg bg-blue-900/50 border border-blue-700/40 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/40"
              />

              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-blue-900/50 border border-blue-700/40 text-sm text-white focus:outline-none focus:border-yellow-400/40 [color-scheme:dark]"
              />

              <input
                type="text"
                value={newContext}
                onChange={(e) => setNewContext(e.target.value)}
                placeholder="Toelichting (optioneel)"
                className="w-full px-3 py-2 rounded-lg bg-blue-900/50 border border-blue-700/40 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-400/40"
              />

              {/* Icon picker */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Icoon</p>
                <div className="grid grid-cols-4 gap-2">
                  {CUSTOM_ICON_OPTIONS.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setNewIcon(key)}
                      title={label}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all",
                        newIcon === key
                          ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                          : "border-blue-800/40 bg-blue-900/30 text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <Icon size={14} />
                      <span className="text-[10px]">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addCustom}
                disabled={!newLabel.trim() || !newDate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-yellow-400 text-blue-950 text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-300"
              >
                <Plus size={14} /> Toevoegen
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-blue-800/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-blue-700/40 text-sm text-gray-400 hover:text-white hover:border-blue-600 transition-all"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg bg-yellow-400 text-blue-950 text-sm font-bold hover:bg-yellow-300 transition-all"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}

function MilestoneRow({ milestone, iconOverride }: { milestone: Milestone; iconOverride?: string }) {
  const Icon = (iconOverride ? MILESTONE_ICONS[iconOverride] : MILESTONE_ICONS[milestone.key]) ?? CheckCircle;
  return (
    <div className="flex items-start gap-4">
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
        milestone.completed
          ? "bg-yellow-400/20 text-yellow-400 ring-2 ring-yellow-400/40"
          : "bg-blue-900/40 text-blue-700 ring-2 ring-blue-800/30"
      )}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className={cn("text-sm font-semibold", milestone.completed ? "text-white" : "text-blue-700")}>
            {milestone.label}
          </span>
          {milestone.date ? (
            <span className="text-xs text-gray-400 tabular-nums">
              {format(parseISO(milestone.date), "d MMM yyyy · HH:mm", { locale: nl })}
            </span>
          ) : (
            <span className="text-xs text-blue-800">—</span>
          )}
        </div>
        {milestone.context && (
          <p className="text-xs text-gray-500 mt-0.5">{milestone.context}</p>
        )}
      </div>
    </div>
  );
}

function EventRow({ event, projectId }: { event: SaleEvent; projectId: string }) {
  const config = getProjectConfig(projectId);
  const displayCode = formatUnitCode(event.unitCode, config);
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-blue-800/20 last:border-0">
      <span className="text-xs text-gray-500 tabular-nums w-32 flex-shrink-0">
        {format(parseISO(event.date), "d MMM · HH:mm", { locale: nl })}
      </span>
      <span className="text-xs font-mono text-gray-300 w-16 flex-shrink-0">{displayCode}</span>
      <span className={cn(
        "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
        event.type === "verkocht"
          ? "bg-green-400/15 text-green-400"
          : "bg-yellow-400/15 text-yellow-400"
      )}>
        {event.type}
      </span>
      <span className="text-xs text-gray-400 flex-1 truncate">{event.leadName}</span>
      <span className="text-xs text-white font-semibold tabular-nums flex-shrink-0">
        {event.price > 0 ? `€${event.price.toLocaleString("nl-NL")}` : "—"}
      </span>
    </div>
  );
}

export default function AnalyticsClient({ projectId, projectName, siteDomain, initialData }: Props) {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineSettings, setTimelineSettings] = useState<TimelineSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Laad settings vanuit localStorage (na mount)
  useEffect(() => {
    setTimelineSettings(loadSettings(projectId));
  }, [projectId]);

  // Haal timeline eenmalig op (onafhankelijk van geselecteerde periode)
  useEffect(() => {
    let cancelled = false;
    setTimelineLoading(true);
    fetch(`/api/timeline?slug=${projectId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: TimelineData) => { if (!cancelled) setTimelineData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setTimelineLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

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
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
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

        {/* ── Verkooptraject ─────────────────────────────────────────────────── */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-semibold text-yellow-400 uppercase tracking-widest">
              Verkooptraject
            </p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-blue-800/40 border border-transparent hover:border-blue-700/40 transition-all"
            >
              <Settings size={12} />
              Tijdlijn instellen
            </button>
          </div>

          {timelineLoading ? (
            <div className="text-gray-600 text-sm animate-pulse">Tijdlijn laden…</div>
          ) : !timelineData ? (
            <div className="text-gray-600 text-sm">Kon tijdlijndata niet ophalen.</div>
          ) : (() => {
            // Combineer standaard mijlpalen (gefilterd) + aangepaste mijlpalen
            const visibleStandard = timelineData.milestones.filter(
              (m) => !timelineSettings.hiddenMilestones.includes(m.key)
            );
            const customAsStandard = timelineSettings.customMilestones.map((c) => ({
              key: `custom-${c.id}`,
              label: c.label,
              date: c.date,
              context: c.context,
              completed: new Date(c.date) <= new Date(),
              _customIcon: c.icon,
            } as Milestone & { _customIcon?: string }));
            const allMilestones = [...visibleStandard, ...customAsStandard].sort((a, b) => {
              if (!a.date && !b.date) return 0;
              if (!a.date) return 1;
              if (!b.date) return -1;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            });

            return (
              <div className="space-y-6">
                {/* Horizontale tijdlijn + voortgangsbalk */}
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <CalendarClock size={16} className="text-yellow-400" /> Mijlpalen
                      {timelineSettings.customMilestones.length > 0 && (
                        <span className="text-xs font-normal text-gray-500">
                          +{timelineSettings.customMilestones.length} aangepast
                        </span>
                      )}
                    </h3>
                  </div>
                  {allMilestones.length === 0 ? (
                    <p className="text-sm text-gray-600 py-4">
                      Alle mijlpalen zijn verborgen. Pas de instellingen aan.
                    </p>
                  ) : (
                    <HorizontalTimeline
                      allMilestones={allMilestones}
                      totalSellable={timelineData.totalSellable}
                      soldCount={timelineData.soldCount}
                      reservedCount={timelineData.reservedCount}
                    />
                  )}
                </Card>

                {/* Verkoopgebeurtenissen — full width */}
                <Card>
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Star size={16} className="text-yellow-400" /> Verkopen &amp; reserveringen
                  </h3>
                  {timelineData.events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Star size={28} className="text-blue-800 mb-3" />
                      <p className="text-sm text-gray-600">Nog geen verkopen of reserveringen</p>
                      <p className="text-xs text-gray-700 mt-1">Ze verschijnen hier zodra het verkoopmoment start</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-0 divide-y divide-blue-800/20 sm:divide-y-0">
                      {timelineData.events.map((ev, i) => (
                        <EventRow key={`${ev.unitCode}-${ev.type}-${i}`} event={ev} projectId={projectId} />
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            );
          })()}
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <TimelineSettingsPanel
            projectId={projectId}
            settings={timelineSettings}
            onSave={setTimelineSettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
