import { NextResponse } from "next/server";
import { getPinnedUnitCounts } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = Number(searchParams.get("projectId") || "1");
  try {
    const counts = await getPinnedUnitCounts(projectId);
    return NextResponse.json({ counts });
  } catch (error) {
    console.error("Pinned units API error:", error);
    return NextResponse.json({ error: "Kon pinned units niet ophalen" }, { status: 500 });
  }
}
