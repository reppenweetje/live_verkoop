import { NextResponse } from "next/server";
import { getOnlineLeads } from "@/lib/heartbeat-store";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN!;

const INTERNAL_DOMAINS = ["@repp.nl", "@erasauna.nl"];
const INTERNAL_USERNAMES = ["theovanjacobus"];

function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (INTERNAL_DOMAINS.some((d) => lower.includes(d))) return true;
  const username = lower.split("@")[0].split("+")[0];
  if (INTERNAL_USERNAMES.some((u) => username === u)) return true;
  const subMatch = lower.match(/\+([^@]+)@/);
  if (subMatch && subMatch[1].includes("test")) return true;
  return false;
}

export interface ActiveLead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  lastActiveAt: string;
  favouriteCount: number;
  tags: string[];
  source: "heartbeat" | "directus";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("projectSlug") ?? "";

  // --- Bron 1: Heartbeat (live browsing via script op kopen.repp.nl) ---
  const heartbeatLeads = getOnlineLeads(projectSlug, 2 * 60 * 1000); // 2 minuten window
  const heartbeatIds = new Set(heartbeatLeads.map((l) => l.id));

  // --- Bron 2: Directus — recente favoriet/profiel wijzigingen (30 min) ---
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  let directusLeads: ActiveLead[] = [];
  try {
    const sinceEnc = encodeURIComponent(since);
    const qs = [
      `filter%5B_or%5D%5B0%5D%5Bpinned_changed_at%5D%5B_gte%5D=${sinceEnc}`,
      `filter%5B_or%5D%5B1%5D%5Bupdated_at%5D%5B_gte%5D=${sinceEnc}`,
      `fields=id,first_name,last_name,email,pinned_changed_at,updated_at,tags,favourites`,
      `limit=100`,
      `sort=-updated_at`,
    ].join("&");

    const res = await fetch(`${DIRECTUS_URL}/items/customers?${qs}`, {
      headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const customers: Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        pinned_changed_at: string | null;
        updated_at: string | null;
        tags: string[];
        favourites: string[] | null;
      }> = json.data ?? [];

      directusLeads = customers
        .filter((c) => !isInternalEmail(c.email))
        .filter((c) => {
          if (!projectSlug) return true;
          return Array.isArray(c.tags) && c.tags.includes(projectSlug);
        })
        .map((c): ActiveLead => {
          const ts1 = c.pinned_changed_at ? new Date(c.pinned_changed_at).getTime() : 0;
          const ts2 = c.updated_at ? new Date(c.updated_at).getTime() : 0;
          const lastActiveAt = ts1 >= ts2 ? (c.pinned_changed_at ?? c.updated_at ?? "") : (c.updated_at ?? "");
          return {
            id: c.id,
            firstName: c.first_name ?? "",
            lastName: c.last_name ?? "",
            email: c.email,
            lastActiveAt,
            favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
            tags: c.tags ?? [],
            source: "directus",
          };
        });
    }
  } catch (err) {
    console.error("active-leads directus error:", err);
  }

  // --- Samenvoegen: heartbeat leads krijgen voorrang (actueler) ---
  // Directus leads die ook in heartbeat zitten worden niet dubbel geteld
  const combined: ActiveLead[] = [];

  // Eerst heartbeat leads — we hebben alleen id+name, dus enrich vanuit directus
  for (const hb of heartbeatLeads) {
    const directus = directusLeads.find((d) => d.id === hb.id);
    if (directus) {
      combined.push({ ...directus, lastActiveAt: new Date(hb.lastSeen).toISOString(), source: "heartbeat" });
    } else {
      // Heartbeat lead staat niet in directus (nog niet actief geweest in 30 min) — voeg toch toe
      const nameParts = hb.name.trim().split(" ");
      combined.push({
        id: hb.id,
        firstName: nameParts[0] ?? hb.name,
        lastName: nameParts.slice(1).join(" ") || "",
        email: "",
        lastActiveAt: new Date(hb.lastSeen).toISOString(),
        favouriteCount: 0,
        tags: [],
        source: "heartbeat",
      });
    }
  }

  // Dan directus leads die NIET via heartbeat kwamen
  for (const dl of directusLeads) {
    if (!heartbeatIds.has(dl.id)) {
      combined.push(dl);
    }
  }

  return NextResponse.json({ activeLeads: combined });
}
