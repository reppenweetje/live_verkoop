"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { getProjectConfig, formatUnitCode } from "@/lib/project-config";
import type { PinnedLeadEntry } from "@/lib/directus";

interface UnitLeadsModalProps {
  unitCode: string;
  leads: PinnedLeadEntry[];
  onClose: () => void;
}

function UnitLeadsModal({ unitCode, leads, onClose }: UnitLeadsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Portal naar document.body zodat fixed positioning altijd het volledige viewport dekt,
  // ongeacht overflow/stacking context van parent elementen
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-sm mx-4"
        style={{ background: "#0f1a5c", border: "1px solid rgba(237,255,0,0.15)", padding: "24px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(237,255,0,0.6)" }}>
              Interesse
            </p>
            <h3 className="text-xl font-black text-white" style={{ fontFamily: "'Montserrat',sans-serif" }}>
              {unitCode}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Teller */}
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)" }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="text-sm font-semibold text-emerald-300">
            {leads.length === 0 ? "Nog geen interesse" : `${leads.length} lead${leads.length !== 1 ? "s" : ""} geïnteresseerd`}
          </span>
        </div>

        {/* Lijst */}
        {leads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Niemand heeft deze unit (nog) gefavoriet.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {leads.map((lead) => {
              const isExclusive = lead.totalFavourites === 1;
              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{
                    background: isExclusive ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.04)",
                    border: isExclusive ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: isExclusive ? "rgba(251,191,36,0.2)" : "rgba(99,102,241,0.3)",
                        color: isExclusive ? "#fbbf24" : "#a5b4fc",
                      }}
                    >
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isExclusive ? "#fbbf24" : "#e2e8f0", fontFamily: "'Montserrat',sans-serif" }}
                    >
                      {lead.name}
                    </span>
                  </div>
                  {isExclusive && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>
                      enige keuze
                    </span>
                  )}
                  {!isExclusive && (
                    <span className="text-xs text-gray-500">{lead.totalFavourites} fav.</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-4 text-center">
          Goud = deze unit is hun enige favoriet
        </p>
      </div>
    </div>,
    document.body
  );
}

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface DashboardUnit {
  id: string;
  code: string;
  name: string;
  status: UnitStatus;
  price: number;
  floor: number;
  size: string;
  reservedUntil?: string;
  boughtAt?: string;
}

const PAVERI_LAYOUT = {
  topRow:    [8, 7, 6, 5, 4],
  bottomRow: [9, 10, 11, 12, 13, 14, 15, 16],
  rightCol:  [1, 2, 3],
  rightWidthPct: 17,
  topFlex:    13,
  bottomFlex: 10,
};

function centroid(pts: string) {
  const coords = pts.trim().split(/\s+/).map((p) => {
    const [x, y] = p.split(",").map(Number);
    return { x, y };
  });
  const cx = coords.reduce((s, p) => s + p.x, 0) / coords.length;
  const cy = coords.reduce((s, p) => s + p.y, 0) / coords.length;
  return { cx, cy };
}

type E11Shape =
  | { n: number; kind: "rect"; x: number; y: number; w: number; h: number }
  | { n: number; kind: "poly"; pts: string };

const ELSTER11_SHAPES: E11Shape[] = [
  { n: 1,  kind: "rect", x: 1208.15, y: 131.67, w: 102.49, h: 177.20 },
  { n: 2,  kind: "rect", x: 1112.78, y: 127.11, w:  94.34, h: 181.53 },
  { n: 3,  kind: "rect", x: 1023.99, y: 127.07, w:  87.94, h: 181.53 },
  { n: 4,  kind: "rect", x:  935.27, y: 127.09, w:  87.94, h: 181.53 },
  { n: 5,  kind: "rect", x:  846.53, y: 127.09, w:  87.94, h: 181.53 },
  { n: 6,  kind: "rect", x:  753.22, y: 127.19, w:  92.47, h: 181.53 },
  { n: 7,  kind: "rect", x:  663.39, y: 127.19, w:  89.18, h: 181.53 },
  { n: 8,  kind: "rect", x:  573.63, y: 127.28, w:  89.18, h: 181.53 },
  { n: 9,  kind: "rect", x:  484.29, y: 127.20, w:  88.65, h: 181.53 },
  { n: 10, kind: "poly", pts: "483.45,308.87 377.58,310.75 354.47,124.49 483.45,127.34" },
  { n: 11, kind: "poly", pts: "387.15,389.31 169.81,417.79 133.58,152.65 354.47,124.49" },
  { n: 12, kind: "poly", pts: "402.83,491.70 337.34,500.15 340.62,525.19 186.74,545.55 169.81,417.79 387.15,389.31" },
  { n: 13, kind: "rect", x:  789.87, y: 547.97, w: 136.10, h: 264.08 },
  { n: 14, kind: "rect", x:  926.38, y: 548.11, w: 136.10, h: 264.08 },
  { n: 15, kind: "rect", x: 1062.86, y: 548.22, w: 136.10, h: 264.08 },
];

function getCellStyle(count: number, max: number, status: UnitStatus | undefined) {
  if (status === "coming_soon") return { bg: "#1e293b", numColor: "#334155", countColor: "#334155", opacity: "0.5" };
  if (status === "verkocht")    return { bg: "#064e3b", numColor: "#6ee7b7", countColor: "#34d399", opacity: "1" };
  if (status === "gereserveerd") return { bg: "#713f00", numColor: "#fef08a", countColor: "#facc15", opacity: "1" };
  if (count === 0)               return { bg: "#450a0a", numColor: "#fca5a5", countColor: "#ef4444", opacity: "1" };
  const ratio = max > 0 ? count / max : 0;
  if (ratio >= 0.7) return { bg: "#14532d", numColor: "#bbf7d0", countColor: "#4ade80", opacity: "1" };
  if (ratio >= 0.4) return { bg: "#166534", numColor: "#86efac", countColor: "#22c55e", opacity: "1" };
  if (ratio >= 0.2) return { bg: "#3f6212", numColor: "#d9f99d", countColor: "#a3e635", opacity: "1" };
  return                 { bg: "#713f12", numColor: "#fde68a", countColor: "#fbbf24", opacity: "1" };
}

function UnitCell({ unit, count, maxCount, style: cellBorder, codeLabel, onClick }: {
  unit: DashboardUnit; count: number; maxCount: number; style?: React.CSSProperties; codeLabel?: string;
  onClick?: () => void;
}) {
  const s = getCellStyle(count, maxCount, unit.status);
  const displayCode = codeLabel ?? unit.code;
  const isSold = unit.status === "verkocht";
  const isReserved = unit.status === "gereserveerd";
  const isComingSoon = unit.status === "coming_soon";

  return (
    <div
      title={`${displayCode}${count > 0 ? ` — ${count} lead${count !== 1 ? "s" : ""} geïnteresseerd` : " — geen interesse"}`}
      onClick={onClick}
      style={{ flex: 1, ...cellBorder, backgroundColor: s.bg, opacity: s.opacity as any,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "6px", cursor: onClick ? "pointer" : "default", position: "relative", transition: "filter 0.15s",
        minWidth: 0, minHeight: 0 }}
      className="hover:brightness-125 active:brightness-150"
    >
      <span style={{ color: s.numColor, fontSize: "clamp(13px,2.2vw,26px)", fontWeight: 700, lineHeight: 1 }}>
        {displayCode}
      </span>
      <span style={{ color: s.countColor, fontSize: "clamp(8px,1vw,12px)", marginTop: 3, fontWeight: 600, lineHeight: 1 }}>
        {isComingSoon ? "binnenkort" : isSold ? "✓ verkocht" : isReserved ? "◷ reserv." : count > 0 ? `${count}×` : "—"}
      </span>
      {isSold && <div style={{ position: "absolute", top: 4, right: 4, width: 9, height: 9, borderRadius: "50%", backgroundColor: "#34d399", border: "1.5px solid #6ee7b7" }} />}
      {isReserved && <div style={{ position: "absolute", top: 4, right: 4, width: 9, height: 9, borderRadius: "50%", backgroundColor: "#facc15", border: "1.5px solid #fef08a" }} />}
    </div>
  );
}

function PaveriFloorPlan({ unitMap, pinnedCounts, maxCount, pinnedLeads, onUnitClick }: {
  unitMap: Map<number, DashboardUnit>; pinnedCounts: Record<number, number>; maxCount: number;
  pinnedLeads?: Record<number, PinnedLeadEntry[]>; onUnitClick?: (unit: DashboardUnit, leads: PinnedLeadEntry[]) => void;
}) {
  const cfg = PAVERI_LAYOUT;
  const BORDER = "2px solid rgba(255,255,255,0.15)";

  const handleClick = (unit: DashboardUnit) => {
    if (onUnitClick && unit.status !== "coming_soon") {
      onUnitClick(unit, pinnedLeads?.[Number(unit.id)] ?? []);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: BORDER, display: "flex", height: 280, gap: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
        <div style={{ display: "flex", flex: cfg.topFlex, borderBottom: BORDER, gap: 0 }}>
          {cfg.topRow.map((n, i) => {
            const unit = unitMap.get(n);
            if (!unit) return <div key={n} style={{ flex: 1, background: "#0f172a", borderLeft: i > 0 ? BORDER : undefined }} />;
            return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ borderLeft: i > 0 ? BORDER : undefined }} onClick={() => handleClick(unit)} />;
          })}
        </div>
        <div style={{ display: "flex", flex: cfg.bottomFlex, gap: 0 }}>
          {cfg.bottomRow.map((n, i) => {
            const unit = unitMap.get(n);
            if (!unit) return <div key={n} style={{ flex: 1, background: "#0f172a", borderLeft: i > 0 ? BORDER : undefined }} />;
            return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ borderLeft: i > 0 ? BORDER : undefined }} onClick={() => handleClick(unit)} />;
          })}
        </div>
      </div>
      <div style={{ width: `${cfg.rightWidthPct}%`, display: "flex", flexDirection: "column", borderLeft: BORDER, flexShrink: 0, gap: 0 }}>
        {cfg.rightCol.map((n, i) => {
          const flexVal = i === 0 ? cfg.topFlex : Math.round(cfg.bottomFlex / (cfg.rightCol.length - 1));
          const unit = unitMap.get(n);
          if (!unit) return <div key={n} style={{ flex: flexVal, background: "#0f172a", borderTop: i > 0 ? BORDER : undefined }} />;
          return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ flex: flexVal, borderTop: i > 0 ? BORDER : undefined }} onClick={() => handleClick(unit)} />;
        })}
      </div>
    </div>
  );
}

function Elster11FloorPlan({ unitMap, pinnedCounts, maxCount, pinnedLeads, onUnitClick }: {
  unitMap: Map<number, DashboardUnit>; pinnedCounts: Record<number, number>; maxCount: number;
  pinnedLeads?: Record<number, PinnedLeadEntry[]>; onUnitClick?: (unit: DashboardUnit, leads: PinnedLeadEntry[]) => void;
}) {
  return (
    <svg
      viewBox="125 115 1200 715"
      style={{ width: "100%", display: "block", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.15)", background: "#0f172a" }}
      aria-label="Elster 11 plattegrond"
    >
      {ELSTER11_SHAPES.map((shape) => {
        const unit = unitMap.get(shape.n);
        const count = unit ? (pinnedCounts[Number(unit.id)] ?? 0) : 0;
        const s = getCellStyle(count, maxCount, unit?.status ?? "beschikbaar");
        const isSold = unit?.status === "verkocht";
        const isReserved = unit?.status === "gereserveerd";
        const isComingSoon = unit?.status === "coming_soon";
        const subLabel = isComingSoon ? "binnenkort" : isSold ? "✓ verkocht" : isReserved ? "◷ reserv." : count > 0 ? `${count}×` : "—";
        const clickable = unit && !isComingSoon;

        let cx: number, cy: number, dotX: number, dotY: number;
        if (shape.kind === "rect") {
          cx = shape.x + shape.w / 2; cy = shape.y + shape.h / 2;
          dotX = shape.x + shape.w - 14; dotY = shape.y + 14;
        } else {
          const c = centroid(shape.pts); cx = c.cx; cy = c.cy;
          const first = shape.pts.trim().split(/\s+/)[0].split(",").map(Number);
          dotX = first[0] - 14; dotY = first[1] + 14;
        }

        return (
          <g
            key={shape.n}
            style={{ cursor: clickable ? "pointer" : "default" }}
            onClick={() => { if (clickable && onUnitClick) onUnitClick(unit!, pinnedLeads?.[Number(unit!.id)] ?? []); }}
          >
            {shape.kind === "rect"
              ? <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={s.bg} stroke="rgba(255,255,255,0.18)" strokeWidth="2" opacity={s.opacity} />
              : <polygon points={shape.pts} fill={s.bg} stroke="rgba(255,255,255,0.18)" strokeWidth="2" opacity={s.opacity} />}
            <text x={cx} y={cy - 14} textAnchor="middle" dominantBaseline="middle" fill={s.numColor} fontSize="38" fontWeight="700" fontFamily="system-ui, sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>{shape.n}</text>
            <text x={cx} y={cy + 22} textAnchor="middle" dominantBaseline="middle" fill={s.countColor} fontSize="18" fontWeight="600" fontFamily="system-ui, sans-serif" style={{ pointerEvents: "none", userSelect: "none" }}>{subLabel}</text>
            {(isSold || isReserved) && <circle cx={dotX} cy={dotY} r="7" fill={isSold ? "#34d399" : "#facc15"} stroke={isSold ? "#6ee7b7" : "#fef08a"} strokeWidth="1.5" />}
          </g>
        );
      })}
    </svg>
  );
}

// ─── 6th Grid plattegrond (3 verdiepingen) ────────────────────────────────────

type G6Shape =
  | { code: string; kind: "rect"; x: number; y: number; w: number; h: number }
  | { code: string; kind: "path"; d: string; cx: number; cy: number };

const G6_BG: G6Shape[] = [
  { code:"0.1",  kind:"rect", x:1118.3, y:63,    w:67.5,  h:154.6 },
  { code:"0.2",  kind:"rect", x:1048,   y:63.1,  w:67.5,  h:154.6 },
  { code:"0.3",  kind:"rect", x:1047.9, y:220.4, w:137.9, h:71.4  },
  { code:"0.4",  kind:"rect", x:1047.9, y:294.5, w:137.9, h:71.4  },
  { code:"0.5",  kind:"rect", x:1048,   y:368.6, w:137.9, h:71.4  },
  { code:"0.6",  kind:"rect", x:1048,   y:442.7, w:137.9, h:71.4  },
  { code:"0.7",  kind:"rect", x:1048,   y:516.8, w:137.9, h:71.4  },
  { code:"0.8",  kind:"rect", x:815.1,  y:522.9, w:137.9, h:65.3  },
  { code:"0.9",  kind:"rect", x:815.1,  y:455,   w:137.9, h:65.3  },
  { code:"0.10", kind:"rect", x:815,    y:387,   w:137.9, h:65.3  },
  { code:"0.11", kind:"rect", x:815,    y:319.1, w:137.9, h:65.3  },
  { code:"0.12", kind:"path", cx:870, cy:240, d:"M952.9,280.1v22.7c0,7.5-6.1,13.6-13.6,13.6h-110.6c-7.5,0-13.6-6.1-13.6-13.6v-109.8c0-7.5,6.1-13.6,13.6-13.6h73.2c7.5,0,13.6,6.1,13.6,13.6v73.5h23.8c7.5,0,13.6,6.1,13.6,13.6h0Z" },
  { code:"0.13", kind:"rect", x:885.4,  y:62.9,  w:67.5,  h:113.7 },
  { code:"0.14", kind:"rect", x:815.2,  y:63,    w:67.5,  h:113.7 },
  { code:"0.15", kind:"rect", x:612.4,  y:438.9, w:107.8, h:62.2  },
  { code:"0.16", kind:"rect", x:612.4,  y:374,   w:107.8, h:62.2  },
  { code:"0.17", kind:"rect", x:612.4,  y:309.1, w:107.8, h:62.2  },
  { code:"0.18", kind:"rect", x:612.3,  y:244.2, w:107.8, h:62.2  },
  { code:"0.19", kind:"rect", x:612.4,  y:179.3, w:107.8, h:62.2  },
  { code:"0.20", kind:"rect", x:612.3,  y:62.9,  w:107.8, h:113.7 },
  { code:"0.21", kind:"rect", x:282.8,  y:336.2, w:224,   h:65.9  },
  { code:"0.22", kind:"rect", x:282.8,  y:267.6, w:224,   h:65.9  },
  { code:"0.23", kind:"rect", x:282.7,  y:199,   w:224,   h:65.9  },
  { code:"0.24", kind:"rect", x:396.1,  y:63,    w:110.6, h:133.3 },
  { code:"0.25", kind:"rect", x:282.8,  y:63,    w:110.6, h:133.3 },
  { code:"0.26", kind:"rect", x:508,    y:697.9, w:65.3,  h:137.9 },
  { code:"0.27", kind:"rect", x:576.1,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.28", kind:"rect", x:644.1,  y:697.8, w:65.3,  h:137.9 },
  { code:"0.29", kind:"rect", x:712.2,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.30", kind:"rect", x:780.2,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.31", kind:"rect", x:848.2,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.32", kind:"rect", x:916.3,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.33", kind:"rect", x:984.4,  y:697.9, w:65.3,  h:137.9 },
  { code:"0.34", kind:"rect", x:1052.4, y:697.9, w:65.3,  h:137.9 },
  { code:"0.35", kind:"rect", x:1120.5, y:697.9, w:65.3,  h:137.9 },
];

const G6_V1: G6Shape[] = [
  { code:"1.1",  kind:"rect", x:1047.9, y:63.1,  w:137.9, h:72.7  },
  { code:"1.2",  kind:"rect", x:1047.9, y:138.4, w:137.9, h:72.7  },
  { code:"1.3",  kind:"rect", x:1047.3, y:213.6, w:137.9, h:72.7  },
  { code:"1.4",  kind:"rect", x:1047.3, y:289.1, w:137.9, h:72.7  },
  { code:"1.5",  kind:"rect", x:1047.4, y:364.5, w:137.9, h:72.7  },
  { code:"1.6",  kind:"rect", x:1047.4, y:440,   w:137.9, h:72.7  },
  { code:"1.7",  kind:"rect", x:1047.4, y:515.5, w:137.9, h:72.7  },
  { code:"1.8",  kind:"rect", x:814.5,  y:522.9, w:137.9, h:65.3  },
  { code:"1.9",  kind:"rect", x:814.5,  y:455,   w:137.9, h:65.3  },
  { code:"1.10", kind:"rect", x:814.4,  y:387,   w:137.9, h:65.3  },
  { code:"1.11", kind:"rect", x:814.4,  y:319.1, w:137.9, h:65.3  },
  { code:"1.12", kind:"path", cx:870, cy:240, d:"M952.3,280.1v22.7c0,7.5-6.1,13.6-13.6,13.6h-110.6c-7.5,0-13.6-6.1-13.6-13.6v-109.8c0-7.5,6.1-13.6,13.6-13.6h73.2c7.5,0,13.6,6.1,13.6,13.6v73.5h23.8c7.5,0,13.6,6.1,13.6,13.6h0Z" },
  { code:"1.13", kind:"rect", x:611.8,  y:438.9, w:107.8, h:62.2  },
  { code:"1.14", kind:"rect", x:611.8,  y:374,   w:107.8, h:62.2  },
  { code:"1.15", kind:"rect", x:611.8,  y:309.1, w:107.8, h:62.2  },
  { code:"1.16", kind:"rect", x:611.7,  y:244.2, w:107.8, h:62.2  },
  { code:"1.17", kind:"rect", x:611.8,  y:179.3, w:107.8, h:62.2  },
  { code:"1.18", kind:"rect", x:282.2,  y:336.2, w:224,   h:98.8  },
  { code:"1.19", kind:"rect", x:282.2,  y:267.6, w:117.9, h:65.9  },
  { code:"1.20", kind:"rect", x:282.1,  y:199,   w:117.9, h:65.9  },
  { code:"1.21", kind:"rect", x:281.9,  y:131.2, w:117.9, h:65.9  },
  { code:"1.22", kind:"rect", x:282.2,  y:62.9,  w:117.9, h:65.9  },
  { code:"1.23", kind:"rect", x:507.4,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.24", kind:"rect", x:575.5,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.25", kind:"rect", x:643.5,  y:697.8, w:65.3,  h:137.9 },
  { code:"1.26", kind:"rect", x:711.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.27", kind:"rect", x:779.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.28", kind:"rect", x:847.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.29", kind:"rect", x:915.7,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.30", kind:"rect", x:983.8,  y:697.9, w:65.3,  h:137.9 },
  { code:"1.31", kind:"rect", x:1051.8, y:697.9, w:65.3,  h:137.9 },
  { code:"1.32", kind:"rect", x:1119.9, y:697.9, w:65.3,  h:137.9 },
];

const G6_V2: G6Shape[] = [
  { code:"2.1",  kind:"rect", x:1047.9, y:63.1,  w:137.9, h:82.6  },
  { code:"2.2",  kind:"rect", x:1048,   y:148.6, w:137.9, h:60.4  },
  { code:"2.3",  kind:"rect", x:1047.4, y:211.5, w:137.9, h:60.4  },
  { code:"2.4",  kind:"rect", x:1047.3, y:274.5, w:137.9, h:61.2  },
  { code:"2.5",  kind:"rect", x:1047.2, y:337.8, w:137.9, h:61    },
  { code:"2.6",  kind:"rect", x:1047.4, y:401,   w:137.9, h:60.8  },
  { code:"2.7",  kind:"rect", x:1047.5, y:464.1, w:137.9, h:60.7  },
  { code:"2.8",  kind:"rect", x:1047.4, y:527.4, w:137.9, h:60.7  },
  { code:"2.9",  kind:"rect", x:814.5,  y:522.9, w:137.6, h:65.3  },
  { code:"2.10", kind:"rect", x:884.6,  y:454.9, w:67.6,  h:65.3  },
  { code:"2.11", kind:"rect", x:814.2,  y:455,   w:67.6,  h:65.3  },
  { code:"2.12", kind:"rect", x:885.2,  y:386.8, w:67.6,  h:65.3  },
  { code:"2.13", kind:"rect", x:814.9,  y:387.1, w:67.6,  h:65.3  },
  { code:"2.14", kind:"rect", x:884.3,  y:319,   w:67.6,  h:65.3  },
  { code:"2.15", kind:"rect", x:814.3,  y:319,   w:67.6,  h:65.3  },
  { code:"2.16", kind:"path", cx:870, cy:240, d:"M952.3,280.1v22.7c0,7.5-6.1,13.6-13.6,13.6h-110.6c-7.5,0-13.6-6.1-13.6-13.6v-109.8c0-7.5,6.1-13.6,13.6-13.6h73.2c7.5,0,13.6,6.1,13.6,13.6v73.5h23.8c7.5,0,13.6,6.1,13.6,13.6h0Z" },
  { code:"2.17", kind:"rect", x:611.8,  y:449.4, w:107.8, h:51.7  },
  { code:"2.18", kind:"rect", x:611.8,  y:395.3, w:107.8, h:51.9  },
  { code:"2.19", kind:"rect", x:611.8,  y:341.3, w:107.8, h:52    },
  { code:"2.20", kind:"rect", x:611.7,  y:287.5, w:107.8, h:51.5  },
  { code:"2.21", kind:"rect", x:611.8,  y:233.4, w:107.8, h:51.7  },
  { code:"2.22", kind:"rect", x:611.9,  y:179.3, w:107.8, h:51.7  },
  { code:"2.23", kind:"rect", x:282.2,  y:336.2, w:224,   h:98.8  },
  { code:"2.24", kind:"rect", x:282.2,  y:267.6, w:117.9, h:65.9  },
  { code:"2.25", kind:"rect", x:282.1,  y:199,   w:117.9, h:65.9  },
  { code:"2.26", kind:"rect", x:281.9,  y:131.2, w:117.9, h:65.9  },
  { code:"2.27", kind:"rect", x:282.2,  y:62.9,  w:117.9, h:65.9  },
  { code:"2.28", kind:"rect", x:507.4,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.29", kind:"rect", x:575.5,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.30", kind:"rect", x:643.5,  y:697.8, w:65.3,  h:137.9 },
  { code:"2.31", kind:"rect", x:711.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.32", kind:"rect", x:779.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.33", kind:"rect", x:847.6,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.34", kind:"rect", x:915.7,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.35", kind:"rect", x:983.8,  y:697.9, w:65.3,  h:137.9 },
  { code:"2.36", kind:"rect", x:1051.8, y:697.9, w:65.3,  h:137.9 },
  { code:"2.37", kind:"rect", x:1119.9, y:697.9, w:65.3,  h:137.9 },
];

type G6Floor = "BG" | "V1" | "V2";
const G6_FLOORS: { key: G6Floor; label: string; shapes: G6Shape[] }[] = [
  { key: "BG", label: "Begane grond", shapes: G6_BG },
  { key: "V1", label: "1e verdieping", shapes: G6_V1 },
  { key: "V2", label: "2e verdieping", shapes: G6_V2 },
];

function SixthGridFloorPlan({ units, pinnedCounts, maxCount, pinnedLeads, onUnitClick }: {
  units: DashboardUnit[]; pinnedCounts: Record<number, number>; maxCount: number;
  pinnedLeads?: Record<number, PinnedLeadEntry[]>; onUnitClick?: (unit: DashboardUnit, leads: PinnedLeadEntry[]) => void;
}) {
  const [activeFloor, setActiveFloor] = useState<G6Floor>("BG");

  // Bouw code → unit map: "U-0-0.1" → key "0.1"
  const unitByCode = useMemo(() => {
    const m = new Map<string, DashboardUnit>();
    for (const u of units) {
      const parts = u.code.split("-");
      const code = parts.length >= 3 ? parts.slice(2).join("-") : parts[parts.length - 1];
      if (code) m.set(code, u);
    }
    return m;
  }, [units]);

  const floorData = G6_FLOORS.find((f) => f.key === activeFloor)!;

  return (
    <div>
      {/* Verdieping tabs */}
      <div className="flex gap-2 mb-3">
        {G6_FLOORS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFloor(f.key)}
            className="px-3 py-1 rounded text-xs font-semibold border transition-colors"
            style={activeFloor === f.key
              ? { background: "rgba(237,255,0,0.12)", color: "#edff00", borderColor: "rgba(237,255,0,0.3)" }
              : { background: "transparent", color: "#6b7280", borderColor: "rgba(255,255,255,0.08)" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <svg
        viewBox="260 45 940 815"
        style={{ width: "100%", display: "block", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.15)", background: "#0f172a" }}
        aria-label={`6th Grid plattegrond — ${floorData.label}`}
      >
        {floorData.shapes.map((shape) => {
          const unit = unitByCode.get(shape.code);
          const count = unit ? (pinnedCounts[Number(unit.id)] ?? 0) : 0;
          const s = getCellStyle(count, maxCount, unit?.status ?? "beschikbaar");
          const isSold = unit?.status === "verkocht";
          const isReserved = unit?.status === "gereserveerd";
          const isComingSoon = unit?.status === "coming_soon";
          const subLabel = isComingSoon ? "binnenkort" : isSold ? "✓ verkocht" : isReserved ? "◷ reserv." : count > 0 ? `${count}×` : "—";
          const clickable = unit && !isComingSoon;

          let cx: number, cy: number, dotX: number, dotY: number;
          if (shape.kind === "rect") {
            cx = shape.x + shape.w / 2; cy = shape.y + shape.h / 2;
            dotX = shape.x + shape.w - 10; dotY = shape.y + 10;
          } else {
            cx = shape.cx; cy = shape.cy;
            dotX = cx + 30; dotY = cy - 30;
          }

          const minDim = shape.kind === "rect" ? Math.min(shape.w, shape.h) : 65;
          const codeFontSize = Math.min(18, Math.max(10, minDim / 3.5));
          const subFontSize = Math.min(11, Math.max(8, minDim / 6));

          return (
            <g
              key={shape.code}
              style={{ cursor: clickable ? "pointer" : "default" }}
              onClick={() => { if (clickable && onUnitClick) onUnitClick(unit!, pinnedLeads?.[Number(unit!.id)] ?? []); }}
            >
              {shape.kind === "rect"
                ? <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx="10" ry="10"
                    fill={s.bg} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" opacity={s.opacity} />
                : <path d={shape.d} fill={s.bg} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" opacity={s.opacity} />}
              <text x={cx} y={cy - codeFontSize * 0.6} textAnchor="middle" dominantBaseline="middle"
                fill={s.numColor} fontSize={codeFontSize} fontWeight="700" fontFamily="system-ui,sans-serif"
                style={{ pointerEvents: "none", userSelect: "none" }}>
                {shape.code}
              </text>
              <text x={cx} y={cy + subFontSize * 1.2} textAnchor="middle" dominantBaseline="middle"
                fill={s.countColor} fontSize={subFontSize} fontWeight="600" fontFamily="system-ui,sans-serif"
                style={{ pointerEvents: "none", userSelect: "none" }}>
                {subLabel}
              </text>
              {(isSold || isReserved) && (
                <circle cx={dotX} cy={dotY} r="5" fill={isSold ? "#34d399" : "#facc15"} stroke={isSold ? "#6ee7b7" : "#fef08a"} strokeWidth="1.5" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LegendItem({ bg, border, label }: { bg: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: bg, border: `2px solid ${border}`, display: "inline-block", flexShrink: 0 }} />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

function RankedList({ units, pinnedCounts, maxCount, config }: {
  units: DashboardUnit[]; pinnedCounts: Record<number, number>; maxCount: number; config: ReturnType<typeof getProjectConfig>;
}) {
  const ranked = useMemo(() =>
    units.map((u) => ({ unit: u, count: pinnedCounts[Number(u.id)] ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    [units, pinnedCounts]
  );
  if (ranked.length === 0) return null;

  return (
    <div className="pt-4 border-t border-blue-800/40">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Meest begeerde {config.unitPlural.toLowerCase()}</p>
      <div className="space-y-2">
        {ranked.map(({ unit, count }) => {
          const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          const codeLabel = formatUnitCode(unit.code, config);
          const ratio = maxCount > 0 ? count / maxCount : 0;
          const barColor = ratio >= 0.7 ? "#16a34a" : ratio >= 0.4 ? "#22c55e" : ratio >= 0.2 ? "#84cc16" : "#f59e0b";
          return (
            <div key={unit.id} className="flex items-center gap-3">
              <span className="w-10 text-center text-xs font-bold text-white tabular-nums">{codeLabel}</span>
              <div className="flex-1 h-2.5 bg-blue-950/60 rounded-full overflow-hidden border border-blue-800/40">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="text-xs font-semibold text-gray-300 w-16 text-right tabular-nums">{count} lead{count !== 1 ? "s" : ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FloorPlanHeatmapProps {
  units: DashboardUnit[];
  pinnedCounts: Record<number, number>;
  pinnedLeads?: Record<number, PinnedLeadEntry[]>;
  projectSlug: string;
}

export function FloorPlanHeatmap({ units, pinnedCounts, pinnedLeads, projectSlug }: FloorPlanHeatmapProps) {
  const config = getProjectConfig(projectSlug);
  const [modal, setModal] = useState<{ unit: DashboardUnit; leads: PinnedLeadEntry[] } | null>(null);

  const handleUnitClick = useCallback((unit: DashboardUnit, leads: PinnedLeadEntry[]) => {
    setModal({ unit, leads });
  }, []);

  const sorted = useMemo(() =>
    [...units].sort((a, b) => {
      const na = parseInt(a.code.replace(/\D/g, ""), 10) || 0;
      const nb = parseInt(b.code.replace(/\D/g, ""), 10) || 0;
      return na - nb;
    }),
    [units]
  );

  const maxCount = useMemo(() => Math.max(0, ...Object.values(pinnedCounts)), [pinnedCounts]);

  const unitMap = useMemo(() => {
    const m = new Map<number, DashboardUnit>();
    for (const u of sorted) {
      const n = parseInt(u.code.replace(/\D/g, ""), 10);
      if (!isNaN(n)) m.set(n, u);
    }
    return m;
  }, [sorted]);

  if (sorted.length === 0) return null;

  const isPaveri    = projectSlug === "depaveri";
  const isElster11  = projectSlug === "elster11";
  const isSixthGrid = projectSlug === "6th-grid";
  const columns = sorted.length <= 7 ? sorted.length : 7;
  const rows: DashboardUnit[][] = [];
  if (!isPaveri && !isElster11 && !isSixthGrid) {
    for (let i = 0; i < sorted.length; i += columns) {
      rows.push(sorted.slice(i, i + columns));
    }
  }

  return (
    <div className="space-y-6">
      {modal && (
        <UnitLeadsModal
          unitCode={formatUnitCode(modal.unit.code, config)}
          leads={modal.leads}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex items-center gap-5 flex-wrap text-xs">
        <LegendItem bg="#450a0a" border="#7f1d1d" label="Nog geen favorieten" />
        <LegendItem bg="#713f00" border="#854d00" label="Gereserveerd" />
        <LegendItem bg="#1e293b" border="#334155" label="Coming soon" />
      </div>

      {isPaveri ? (
        <PaveriFloorPlan unitMap={unitMap} pinnedCounts={pinnedCounts} maxCount={maxCount} pinnedLeads={pinnedLeads} onUnitClick={handleUnitClick} />
      ) : isElster11 ? (
        <Elster11FloorPlan unitMap={unitMap} pinnedCounts={pinnedCounts} maxCount={maxCount} pinnedLeads={pinnedLeads} onUnitClick={handleUnitClick} />
      ) : isSixthGrid ? (
        <SixthGridFloorPlan units={sorted} pinnedCounts={pinnedCounts} maxCount={maxCount} pinnedLeads={pinnedLeads} onUnitClick={handleUnitClick} />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "2px solid rgba(255,255,255,0.15)", display: "inline-grid", gridTemplateRows: `repeat(${rows.length}, 1fr)`, width: "100%" }}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, borderTop: rowIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined }}>
              {Array.from({ length: columns }).map((_, colIdx) => {
                const unit = row[colIdx];
                if (!unit) return <div key={`empty-${colIdx}`} style={{ borderLeft: colIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined, background: "#0f172a", aspectRatio: "1" }} />;
                const count = pinnedCounts[Number(unit.id)] ?? 0;
                const codeLabel = formatUnitCode(unit.code, config);
                return (
                  <UnitCell
                    key={unit.id} unit={unit} count={count} maxCount={maxCount} codeLabel={codeLabel}
                    style={{ borderLeft: colIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined, aspectRatio: "1" }}
                    onClick={unit.status !== "coming_soon" ? () => handleUnitClick(unit, pinnedLeads?.[Number(unit.id)] ?? []) : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      <RankedList units={sorted} pinnedCounts={pinnedCounts} maxCount={maxCount} config={config} />
    </div>
  );
}
