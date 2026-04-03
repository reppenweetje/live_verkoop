import { NextResponse } from "next/server";
import { getRegistrationsForProject } from "@/lib/directus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = Number(searchParams.get("projectId") || "1");
  try {
    const registrations = await getRegistrationsForProject(projectId);
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error("Registrations API error:", error);
    return NextResponse.json({ error: "Kon registraties niet ophalen" }, { status: 500 });
  }
}
