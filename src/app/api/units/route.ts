import { NextResponse } from "next/server";
import { getUnitsForProject, calcUnitStats } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = Number(searchParams.get("projectId") || "1");
  try {
    const units = await getUnitsForProject(projectId);
    const stats = calcUnitStats(units);
    return NextResponse.json({ units, stats });
  } catch (error) {
    console.error("Units API error:", error);
    return NextResponse.json({ error: "Kon units niet ophalen" }, { status: 500 });
  }
}
