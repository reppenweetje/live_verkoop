import { getProjectBySlug, getUnitsForProject, calcUnitStats } from "@/lib/directus";
import { getRealtimeVisitors, getSalesToolStats, SLUG_TO_SITE } from "@/lib/plausible";
import { notFound } from "next/navigation";
import VerkoopvoortgangClient from "./client";

export const dynamic = "force-dynamic";

const SLUG_TO_SALE_DATE: Record<string, string> = {
  "de-hofman": "2026-04-08T20:00:00",
  elster11:    "2026-04-09T20:00:00",
  depaveri:    "2026-04-15T20:00:00",
};

export default async function VerkoopvoortgangPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const directusProjectId = Number(project.id);
  const units = await getUnitsForProject(directusProjectId);
  const stats = calcUnitStats(units);
  const siteDomain = SLUG_TO_SITE[projectId] ?? null;

  // siteVisitors = realtime bezoekers project-website (bijv. elster11.nl)
  // salesVisitors = bezoekers vandaag op kopen.repp.nl/{projectId} (project-specifiek)
  const [siteVisitors, salesStats] = await Promise.all([
    siteDomain ? getRealtimeVisitors(siteDomain) : Promise.resolve(0),
    getSalesToolStats(projectId, { period: "day" }),
  ]);

  const saleStartsAt = SLUG_TO_SALE_DATE[projectId] ?? project.saleStartsAt;

  return (
    <VerkoopvoortgangClient
      initialUnits={units}
      initialStats={stats}
      directusProjectId={directusProjectId}
      projectName={project.name}
      projectId={projectId}
      plausibleSiteId={siteDomain ?? undefined}
      initialSiteVisitors={siteVisitors}
      initialSalesVisitors={salesStats.visitors}
      saleStartsAt={saleStartsAt}
    />
  );
}
