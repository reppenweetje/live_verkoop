import { NextResponse } from "next/server";
import { getPinnedLeadsByUnit } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = Number(searchParams.get("projectId") || "1");
  try {
    const leads = await getPinnedLeadsByUnit(projectId);
    return NextResponse.json({ leads });
  } catch (error) {
    console.error("Pinned leads API error:", error);
    return NextResponse.json({ error: "Kon pinned leads niet ophalen" }, { status: 500 });
  }
}
