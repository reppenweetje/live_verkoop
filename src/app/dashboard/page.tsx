import { getProjects as getAllProjects, getUnitsForProject, calcUnitStats } from "@/lib/directus";
import DashboardClient from "./client";

export const dynamic = "force-dynamic";

// Directus project IDs per slug (voor snelle parallel fetch)
const SLUG_TO_PROJECT_ID: Record<string, number> = {
  "de-hofman": 5,
  depaveri:    8,
  elster11:    7,
};

export default async function DashboardPage() {
  const projects = await getAllProjects();

  // Parallel units ophalen voor alle primaire projecten
  const projectStats = await Promise.all(
    projects.map(async (project) => {
      const directusId = SLUG_TO_PROJECT_ID[project.slug];
      if (!directusId) return null;
      const units = await getUnitsForProject(directusId);
      const stats = calcUnitStats(units);
      return { slug: project.slug, name: project.name, ...stats };
    })
  );

  const validStats = projectStats.filter(Boolean) as NonNullable<typeof projectStats[0]>[];

  // Gecombineerde portfolio statistieken
  const portfolio = {
    totalProjectValue:  validStats.reduce((s, p) => s + p.totalProjectValue, 0),
    verkochtTotal:      validStats.reduce((s, p) => s + p.verkochtTotal, 0),
    gereserveerdTotal:  validStats.reduce((s, p) => s + p.gereserveerdTotal, 0),
    verkocht:           validStats.reduce((s, p) => s + p.verkocht, 0),
    gereserveerd:       validStats.reduce((s, p) => s + p.gereserveerd, 0),
    beschikbaar:        validStats.reduce((s, p) => s + p.beschikbaar, 0),
    totalUnits:         validStats.reduce((s, p) => s + p.total, 0),
    perProject:         validStats,
  };

  return <DashboardClient projects={projects} portfolio={portfolio} />;
}
