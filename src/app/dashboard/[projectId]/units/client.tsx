"use client";

import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Building2, TrendingUp, Clock, MapPin, Activity, RefreshCw, Heart } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { FloorPlanHeatmap } from "@/components/floor-plan-heatmap";

type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

interface DashboardUnit {
  id: string;
  code: string;
  name: string;
  type: string;
  floor: number;
  size: string;
  price: number;
  status: UnitStatus;
  reservedAt?: string;
  reservedUntil?: string;
  boughtAt?: string;
  parkingSpaces: number;
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

interface Props {
  initialUnits: DashboardUnit[];
  initialStats: UnitStats;
  projectId: string;
  directusProjectId: number;
  projectName: string;
  initialPinnedCounts: Record<number, number>;
}

export default function UnitsClient({ initialUnits, initialStats, projectId, directusProjectId, projectName, initialPinnedCounts }: Props) {
  const [units, setUnits] = useState(initialUnits);
  const [stats, setStats] = useState(initialStats);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pinnedCounts, setPinnedCounts] = useState(initialPinnedCounts);

  useEffect(() => {
    const poll = async () => {
      try {
        setIsRefreshing(true);
        const [unitsRes, pinnedRes] = await Promise.all([
          fetch(`/api/units?projectId=${directusProjectId}`, { cache: "no-store" }),
          fetch(`/api/pinned-units?projectId=${directusProjectId}`, { cache: "no-store" }),
        ]);
        if (unitsRes.ok) {
          const data = await unitsRes.json();
          setUnits(data.units);
          setStats(data.stats);
        }
        if (pinnedRes.ok) {
          const data = await pinnedRes.json();
          setPinnedCounts(data.counts ?? {});
        }
        setLastUpdated(new Date());
      } catch {} finally {
        setIsRefreshing(false);
      }
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [directusProjectId]);

  const unitsByFloor = useMemo(() => {
    const grouped: Record<number, DashboardUnit[]> = {};
    units.forEach((unit) => {
      if (!grouped[unit.floor]) grouped[unit.floor] = [];
      grouped[unit.floor].push(unit);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a))
      .reduce<Record<number, DashboardUnit[]>>((acc, [floor, floorUnits]) => {
        acc[Number(floor)] = floorUnits.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
        return acc;
      }, {});
  }, [units]);

  const activityFeed = useMemo(() =>
    [...units]
      .filter((u) => u.boughtAt || u.reservedAt)
      .sort((a, b) => new Date(b.boughtAt || b.reservedAt || "").getTime() - new Date(a.boughtAt || a.reservedAt || "").getTime())
      .slice(0, 8)
      .map((unit) => ({
        id: unit.id,
        timestamp: unit.boughtAt || unit.reservedAt!,
        text: unit.status === "verkocht" ? `${unit.code} — ${unit.name} VERKOCHT` : `${unit.code} — ${unit.name} GERESERVEERD`,
        status: unit.status,
      })),
    [units]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Status Units</h1>
            <p className="text-gray-400">{projectName}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw size={12} className={cn("text-yellow-400", isRefreshing && "animate-spin")} />
            <span>Bijgewerkt {format(lastUpdated, "HH:mm:ss", { locale: nl })}</span>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KPICard title="Totaal Units"   value={stats.total}        icon={Building2}   accentColor="yellow" />
          <KPICard title="Verkocht"       value={stats.verkocht}     subtitle={formatCurrency(stats.verkochtTotal)}     icon={TrendingUp}  accentColor="emerald" />
          <KPICard title="Gereserveerd"   value={stats.gereserveerd} subtitle={formatCurrency(stats.gereserveerdTotal)} icon={Clock}       accentColor="gold" />
          <KPICard title="Beschikbaar"    value={stats.beschikbaar}  icon={MapPin}      accentColor="blue" />
        </div>

        <Card className="mb-8">
          <div className="flex items-center gap-2 mb-5">
            <Heart size={18} className="text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Interesse per Unit</h2>
          </div>
          <FloorPlanHeatmap units={units} pinnedCounts={pinnedCounts} projectSlug={projectId} />
        </Card>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Units per Verdieping</h2>
          {Object.entries(unitsByFloor).map(([floor, floorUnits]) => (
            <div key={floor} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-yellow-400/20 border border-yellow-400/50 flex items-center justify-center text-sm font-bold text-yellow-300">{floor}</span>
                Verdieping {floor}
                <span className="text-sm text-gray-500 font-normal ml-2">({floorUnits.length} units)</span>
              </h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {floorUnits.map((unit) => (
                  <div key={unit.id} className={cn("border rounded-lg p-4 transition-all hover:shadow-lg",
                    unit.status === "beschikbaar"  && "bg-blue-900/30 border-blue-600/50 hover:bg-blue-900/50",
                    unit.status === "gereserveerd" && "bg-amber-900/20 border-amber-700/50",
                    unit.status === "verkocht"     && "bg-emerald-900/20 border-emerald-700/50",
                    unit.status === "coming_soon"  && "bg-gray-900/30 border-gray-700/50 opacity-70"
                  )}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white text-sm">{unit.code}</h4>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{unit.name}</p>
                      </div>
                      <Badge variant={unit.status === "beschikbaar" ? "info" : unit.status === "gereserveerd" ? "warning" : unit.status === "verkocht" ? "success" : "default"}>
                        {unit.status === "beschikbaar"  && "Beschikbaar"}
                        {unit.status === "gereserveerd" && "Gereserveerd"}
                        {unit.status === "verkocht"     && "Verkocht"}
                        {unit.status === "coming_soon"  && "Binnenkort"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {unit.size && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Oppervlak:</span>
                          <span className="text-white font-medium truncate ml-2 max-w-[120px]">{unit.size.split("\n")[0]}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Prijs:</span>
                        <span className="text-white font-medium">{formatCurrency(unit.price)}</span>
                      </div>
                      {unit.parkingSpaces > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Parkeerplekken:</span>
                          <span className="text-white font-medium">{unit.parkingSpaces}</span>
                        </div>
                      )}
                      {unit.status === "verkocht" && unit.boughtAt && (
                        <div className="pt-3 mt-3 border-t border-emerald-700/30">
                          <p className="text-xs text-emerald-400">Gekocht op {format(parseISO(unit.boughtAt), "d MMM HH:mm", { locale: nl })}</p>
                        </div>
                      )}
                      {unit.status === "gereserveerd" && unit.reservedUntil && (
                        <div className="pt-3 mt-3 border-t border-amber-700/30">
                          <p className="text-xs text-amber-400">Vrij om {format(parseISO(unit.reservedUntil), "HH:mm", { locale: nl })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {activityFeed.length > 0 && (
          <Card>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-yellow-400" />
              Recente Activiteiten
            </h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {activityFeed.map((event) => (
                <div key={event.id} className={cn("flex items-center justify-between p-3 rounded-lg border",
                  event.status === "verkocht" ? "bg-emerald-900/20 border-emerald-700/30" : "bg-blue-900/20 border-blue-800/50"
                )}>
                  <p className="text-sm font-medium text-white">{event.text}</p>
                  <span className="text-xs text-yellow-400 whitespace-nowrap ml-4">
                    {format(parseISO(event.timestamp), "d MMM HH:mm", { locale: nl })}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
