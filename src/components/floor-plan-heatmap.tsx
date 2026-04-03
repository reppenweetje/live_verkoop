"use client";

import { useMemo } from "react";

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

function UnitCell({ unit, count, maxCount, style: cellBorder }: {
  unit: DashboardUnit; count: number; maxCount: number; style?: React.CSSProperties;
}) {
  const s = getCellStyle(count, maxCount, unit.status);
  const numLabel = unit.code.replace(/^U-?/i, "");
  const isSold = unit.status === "verkocht";
  const isReserved = unit.status === "gereserveerd";
  const isComingSoon = unit.status === "coming_soon";

  return (
    <div
      title={`Unit ${numLabel}${count > 0 ? ` — ${count} lead${count !== 1 ? "s" : ""} geïnteresseerd` : " — geen interesse"}`}
      style={{ flex: 1, ...cellBorder, backgroundColor: s.bg, opacity: s.opacity as any,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "6px", cursor: "default", position: "relative", transition: "filter 0.15s",
        minWidth: 0, minHeight: 0 }}
      className="hover:brightness-125"
    >
      <span style={{ color: s.numColor, fontSize: "clamp(13px,2.2vw,26px)", fontWeight: 700, lineHeight: 1 }}>
        {numLabel}
      </span>
      <span style={{ color: s.countColor, fontSize: "clamp(8px,1vw,12px)", marginTop: 3, fontWeight: 600, lineHeight: 1 }}>
        {isComingSoon ? "binnenkort" : isSold ? "✓ verkocht" : isReserved ? "◷ reserv." : count > 0 ? `${count}×` : "—"}
      </span>
      {isSold && <div style={{ position: "absolute", top: 4, right: 4, width: 9, height: 9, borderRadius: "50%", backgroundColor: "#34d399", border: "1.5px solid #6ee7b7" }} />}
      {isReserved && <div style={{ position: "absolute", top: 4, right: 4, width: 9, height: 9, borderRadius: "50%", backgroundColor: "#facc15", border: "1.5px solid #fef08a" }} />}
    </div>
  );
}

function PaveriFloorPlan({ unitMap, pinnedCounts, maxCount }: {
  unitMap: Map<number, DashboardUnit>; pinnedCounts: Record<number, number>; maxCount: number;
}) {
  const cfg = PAVERI_LAYOUT;
  const BORDER = "2px solid rgba(255,255,255,0.15)";

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: BORDER, display: "flex", height: 280, gap: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0, minWidth: 0 }}>
        <div style={{ display: "flex", flex: cfg.topFlex, borderBottom: BORDER, gap: 0 }}>
          {cfg.topRow.map((n, i) => {
            const unit = unitMap.get(n);
            if (!unit) return <div key={n} style={{ flex: 1, background: "#0f172a", borderLeft: i > 0 ? BORDER : undefined }} />;
            return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ borderLeft: i > 0 ? BORDER : undefined }} />;
          })}
        </div>
        <div style={{ display: "flex", flex: cfg.bottomFlex, gap: 0 }}>
          {cfg.bottomRow.map((n, i) => {
            const unit = unitMap.get(n);
            if (!unit) return <div key={n} style={{ flex: 1, background: "#0f172a", borderLeft: i > 0 ? BORDER : undefined }} />;
            return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ borderLeft: i > 0 ? BORDER : undefined }} />;
          })}
        </div>
      </div>
      <div style={{ width: `${cfg.rightWidthPct}%`, display: "flex", flexDirection: "column", borderLeft: BORDER, flexShrink: 0, gap: 0 }}>
        {cfg.rightCol.map((n, i) => {
          const flexVal = i === 0 ? cfg.topFlex : Math.round(cfg.bottomFlex / (cfg.rightCol.length - 1));
          const unit = unitMap.get(n);
          if (!unit) return <div key={n} style={{ flex: flexVal, background: "#0f172a", borderTop: i > 0 ? BORDER : undefined }} />;
          return <UnitCell key={unit.id} unit={unit} count={pinnedCounts[Number(unit.id)] ?? 0} maxCount={maxCount} style={{ flex: flexVal, borderTop: i > 0 ? BORDER : undefined }} />;
        })}
      </div>
    </div>
  );
}

function Elster11FloorPlan({ unitMap, pinnedCounts, maxCount }: {
  unitMap: Map<number, DashboardUnit>; pinnedCounts: Record<number, number>; maxCount: number;
}) {
  return (
    <svg viewBox="125 115 1200 715" style={{ width: "100%", display: "block", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.15)", background: "#0f172a" }} aria-label="Elster 11 plattegrond">
      {ELSTER11_SHAPES.map((shape) => {
        const unit = unitMap.get(shape.n);
        const count = unit ? (pinnedCounts[Number(unit.id)] ?? 0) : 0;
        const s = getCellStyle(count, maxCount, unit?.status ?? "beschikbaar");
        const isSold = unit?.status === "verkocht";
        const isReserved = unit?.status === "gereserveerd";
        const isComingSoon = unit?.status === "coming_soon";
        const subLabel = isComingSoon ? "binnenkort" : isSold ? "✓ verkocht" : isReserved ? "◷ reserv." : count > 0 ? `${count}×` : "—";

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
          <g key={shape.n}>
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

function LegendItem({ bg, border, label }: { bg: string; border: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: bg, border: `2px solid ${border}`, display: "inline-block", flexShrink: 0 }} />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

function RankedList({ units, pinnedCounts, maxCount }: {
  units: DashboardUnit[]; pinnedCounts: Record<number, number>; maxCount: number;
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
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Meest begeerde units</p>
      <div className="space-y-2">
        {ranked.map(({ unit, count }) => {
          const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          const numLabel = unit.code.replace(/^U-?/i, "");
          const ratio = maxCount > 0 ? count / maxCount : 0;
          const barColor = ratio >= 0.7 ? "#16a34a" : ratio >= 0.4 ? "#22c55e" : ratio >= 0.2 ? "#84cc16" : "#f59e0b";
          return (
            <div key={unit.id} className="flex items-center gap-3">
              <span className="w-6 text-center text-xs font-bold text-white tabular-nums">{numLabel}</span>
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
  projectSlug: string;
}

export function FloorPlanHeatmap({ units, pinnedCounts, projectSlug }: FloorPlanHeatmapProps) {
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

  const isPaveri  = projectSlug === "depaveri";
  const isElster11 = projectSlug === "elster11";
  const columns = sorted.length <= 7 ? sorted.length : 7;
  const rows: DashboardUnit[][] = [];
  if (!isPaveri && !isElster11) {
    for (let i = 0; i < sorted.length; i += columns) {
      rows.push(sorted.slice(i, i + columns));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5 flex-wrap text-xs">
        <LegendItem bg="#450a0a" border="#7f1d1d" label="Nog geen favorieten" />
        <LegendItem bg="#713f00" border="#854d00" label="Gereserveerd" />
        <LegendItem bg="#1e293b" border="#334155" label="Coming soon" />
      </div>

      {isPaveri ? (
        <PaveriFloorPlan unitMap={unitMap} pinnedCounts={pinnedCounts} maxCount={maxCount} />
      ) : isElster11 ? (
        <Elster11FloorPlan unitMap={unitMap} pinnedCounts={pinnedCounts} maxCount={maxCount} />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "2px solid rgba(255,255,255,0.15)", display: "inline-grid", gridTemplateRows: `repeat(${rows.length}, 1fr)`, width: "100%" }}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, borderTop: rowIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined }}>
              {Array.from({ length: columns }).map((_, colIdx) => {
                const unit = row[colIdx];
                if (!unit) return <div key={`empty-${colIdx}`} style={{ borderLeft: colIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined, background: "#0f172a", aspectRatio: "1" }} />;
                const count = pinnedCounts[Number(unit.id)] ?? 0;
                return <UnitCell key={unit.id} unit={unit} count={count} maxCount={maxCount} style={{ borderLeft: colIdx > 0 ? "2px solid rgba(255,255,255,0.15)" : undefined, aspectRatio: "1" }} />;
              })}
            </div>
          ))}
        </div>
      )}

      <RankedList units={sorted} pinnedCounts={pinnedCounts} maxCount={maxCount} />
    </div>
  );
}
