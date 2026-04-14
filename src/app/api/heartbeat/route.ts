import { NextResponse } from "next/server";
import { heartbeatStore, pruneHeartbeats } from "@/lib/heartbeat-store";

export const dynamic = "force-dynamic";

// POST /api/heartbeat
// Body: { customerId: number, name: string, projectSlug: string, secret?: string }
// Wordt elke ~30s aangeroepen vanuit kopen.repp.nl
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, name, projectSlug } = body;

    if (!customerId || typeof customerId !== "number") {
      return NextResponse.json({ error: "customerId vereist" }, { status: 400 });
    }

    pruneHeartbeats();
    heartbeatStore.set(customerId, {
      name: String(name || "Onbekend"),
      projectSlug: String(projectSlug || ""),
      lastSeen: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ongeldige request" }, { status: 400 });
  }
}

// GET /api/heartbeat?projectSlug=de-hofman
// Geeft lijst van online leads terug (laatste 2 minuten)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("projectSlug") ?? "";
  const windowMs = Number(searchParams.get("windowMs") ?? 2 * 60 * 1000);

  pruneHeartbeats();
  const cutoff = Date.now() - windowMs;
  const leads: Array<{ id: number; name: string; lastSeen: number }> = [];

  for (const [id, entry] of heartbeatStore.entries()) {
    if (entry.lastSeen >= cutoff && (!projectSlug || entry.projectSlug === projectSlug)) {
      leads.push({ id, name: entry.name, lastSeen: entry.lastSeen });
    }
  }

  return NextResponse.json({
    leads: leads.sort((a, b) => b.lastSeen - a.lastSeen),
    total: leads.length,
  });
}
