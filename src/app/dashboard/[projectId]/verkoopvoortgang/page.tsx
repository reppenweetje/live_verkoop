import { getProjectBySlug, getUnitsForProject, calcUnitStats } from "@/lib/directus";
import { getRealtimeVisitors, getSalesToolStats } from "@/lib/plausible";
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
  // siteVisitors = realtime bezoekers op kopen.repp.nl (live teller voor het verkoopmoment)
  // salesVisitors = bezoekers vandaag op kopen.repp.nl/{projectId} (project-specifiek)
  const [siteVisitors, salesStats] = await Promise.all([
    getRealtimeVisitors("kopen.repp.nl"),
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
      initialSiteVisitors={siteVisitors}
      initialSalesVisitors={salesStats.visitors}
      saleStartsAt={saleStartsAt}
    />
  );
}
