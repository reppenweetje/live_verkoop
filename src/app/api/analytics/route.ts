import { NextResponse } from "next/server";
import {
  PERIODS,
  SLUG_TO_SITE,
  getSiteStats,
  getSalesToolStats,
  getTimeseries,
  getTopPages,
  getSalesToolTopPages,
  getDeviceBreakdown,
  getTrafficSources,
  getBrowserBreakdown,
  getRealtimeVisitors,
} from "@/lib/plausible";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("slug") || "de-hofman";
  const periodKey = searchParams.get("period") || "30d";

  const periodDef = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[11];
  const siteDomain = SLUG_TO_SITE[projectSlug] ?? null;
  const q = periodDef.query();

  try {
    const { query: _q, ...safePeriodDef } = periodDef;

    if (periodDef.isRealtime) {
      const [realtimeSite, realtimeSales, siteStats, salesStats] = await Promise.all([
        siteDomain ? getRealtimeVisitors(siteDomain) : Promise.resolve(0),
        getRealtimeVisitors("kopen.repp.nl"),
        siteDomain ? getSiteStats(siteDomain, { period: "day" }) : Promise.resolve(null),
        getSalesToolStats(projectSlug, { period: "day" }),
      ]);
      return NextResponse.json({
        periodDef: safePeriodDef,
        realtimeSite,
        realtimeSales,
        siteStats,
        salesStats,
        timeseries: [],
        topPages: [],
        salesTopPages: [],
        devices: [],
        sources: [],
        browsers: [],
      });
    }

    const [siteStats, salesStats, timeseries, topPages, salesTopPages, devices, sources, browsers] =
      await Promise.all([
        siteDomain ? getSiteStats(siteDomain, q)     : Promise.resolve(null),
        getSalesToolStats(projectSlug, q),
        siteDomain ? getTimeseries(siteDomain, q)    : Promise.resolve([]),
        siteDomain ? getTopPages(siteDomain, q)      : Promise.resolve([]),
        getSalesToolTopPages(projectSlug, q),
        siteDomain ? getDeviceBreakdown(siteDomain, q): Promise.resolve([]),
        siteDomain ? getTrafficSources(siteDomain, q) : Promise.resolve([]),
        siteDomain ? getBrowserBreakdown(siteDomain, q): Promise.resolve([]),
      ]);

    return NextResponse.json({
      periodDef: safePeriodDef,
      realtimeSite: null,
      realtimeSales: null,
      siteStats,
      salesStats,
      timeseries,
      topPages,
      salesTopPages,
      devices,
      sources,
      browsers,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Kon analytics niet ophalen" }, { status: 500 });
  }
}
