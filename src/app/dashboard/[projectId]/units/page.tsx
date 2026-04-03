import { getProjectBySlug, getUnitsForProject, calcUnitStats, getPinnedUnitCounts } from "@/lib/directus";
import { notFound } from "next/navigation";
import UnitsClient from "./client";

export const dynamic = "force-dynamic";

export default async function UnitsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await getProjectBySlug(projectId);
  if (!project) notFound();

  const [units, pinnedCounts] = await Promise.all([
    getUnitsForProject(Number(project.id)),
    getPinnedUnitCounts(Number(project.id)),
  ]);
  const stats = calcUnitStats(units);

  return (
    <UnitsClient
      initialUnits={units}
      initialStats={stats}
      projectId={projectId}
      directusProjectId={Number(project.id)}
      projectName={project.name}
      initialPinnedCounts={pinnedCounts}
    />
  );
}
