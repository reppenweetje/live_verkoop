import { getProjectBySlug } from "@/lib/directus";
import { getSiteStats, getSalesToolStats, getTimeseries, getTopPages, getSalesToolTopPages, getDeviceBreakdown, getTrafficSources, getBrowserBreakdown, SLUG_TO_SITE } from "@/lib/plausible";
import { notFound } from "next/navigation";
import AnalyticsClient from "./client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const siteDomain = SLUG_TO_SITE[projectId] ?? null;
  const q = { period: "30d" as const };

  const [siteStats, salesStats, timeseries, topPages, salesTopPages, devices, sources, browsers] = await Promise.all([
    siteDomain ? getSiteStats(siteDomain, q)      : Promise.resolve(null),
    getSalesToolStats(projectId, q),
    siteDomain ? getTimeseries(siteDomain, q)     : Promise.resolve([]),
    siteDomain ? getTopPages(siteDomain, q)        : Promise.resolve([]),
    getSalesToolTopPages(projectId, q),
    siteDomain ? getDeviceBreakdown(siteDomain, q) : Promise.resolve([]),
    siteDomain ? getTrafficSources(siteDomain, q)  : Promise.resolve([]),
    siteDomain ? getBrowserBreakdown(siteDomain, q): Promise.resolve([]),
  ]);

  return (
    <AnalyticsClient
      projectId={projectId}
      projectName={project.name}
      siteDomain={siteDomain}
      initialData={{
        periodDef: { isRealtime: false, isSubDay: false },
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
      }}
    />
  );
}
