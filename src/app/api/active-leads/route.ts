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
  const directusProjectId = searchParams.get("directusProjectId");

  // --- Bron 1: Heartbeat (live browsing via script op kopen.repp.nl) ---
  const heartbeatLeads = getOnlineLeads(projectSlug, 2 * 60 * 1000);
  const heartbeatIds = new Set(heartbeatLeads.map((l) => l.id));

  // --- Bron 2: Directus — recente pinned_units activiteit voor DIT project (30 min) ---
  // We gebruiken pinned_units i.p.v. customers.updated_at zodat de activiteit
  // gegarandeerd project-specifiek is en niet lekt naar andere projecten.
  const since30 = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  let directusLeads: ActiveLead[] = [];
  if (directusProjectId) {
    try {
      const since30Enc = encodeURIComponent(since30);
      // Haal recente pins op voor dit specifieke project
      const pinQs = [
        `filter%5Bproject_id%5D%5B_eq%5D=${directusProjectId}`,
        `filter%5Bcreated_at%5D%5B_gte%5D=${since30Enc}`,
        `fields=customer_id,created_at`,
        `limit=200`,
        `sort=-created_at`,
      ].join("&");

      const pinRes = await fetch(`${DIRECTUS_URL}/items/pinned_units?${pinQs}`, {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: "no-store",
      });

      if (pinRes.ok) {
        const pinJson = await pinRes.json();
        const pins: Array<{ customer_id: number; created_at: string }> = pinJson.data ?? [];

        // Meest recente pin-timestamp per klant
        const pinMap = new Map<number, string>();
        for (const p of pins) {
          const existing = pinMap.get(p.customer_id);
          if (!existing || p.created_at > existing) {
            pinMap.set(p.customer_id, p.created_at);
          }
        }

        if (pinMap.size > 0) {
          const customerIds = Array.from(pinMap.keys()).join(",");
          const custRes = await fetch(
            `${DIRECTUS_URL}/items/customers?filter%5Bid%5D%5B_in%5D=${customerIds}&fields=id,first_name,last_name,email,tags,favourites&limit=200`,
            { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
          );

          if (custRes.ok) {
            const custJson = await custRes.json();
            for (const c of custJson.data ?? []) {
              if (isInternalEmail(c.email)) continue;
              const lastActiveAt = pinMap.get(c.id) ?? since30;
              directusLeads.push({
                id: c.id,
                firstName: c.first_name ?? "",
                lastName: c.last_name ?? "",
                email: c.email,
                lastActiveAt,
                favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
                tags: c.tags ?? [],
                source: "directus",
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("active-leads pinned_units error:", err);
    }
  }

  // --- Bron 3: Units met recente unit-actie (reservering, aankoop, annulering) — 5 min window ---
  // Als een lead reserveert, annuleert of koopt, wordt die voor 5 min als actief gemarkeerd.
  const unitActionLeads: ActiveLead[] = [];
  if (directusProjectId) {
    try {
      const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const since5Enc = encodeURIComponent(since5);
      const unitQs = [
        `filter%5Bproject_id%5D%5B_eq%5D=${directusProjectId}`,
        `filter%5Bupdated_at%5D%5B_gte%5D=${since5Enc}`,
        `fields=id,code,reserved_by,bought_by,reserved_at,bought_at,updated_at`,
        `limit=50`,
      ].join("&");

      const unitRes = await fetch(`${DIRECTUS_URL}/items/units?${unitQs}`, {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: "no-store",
      });

      if (unitRes.ok) {
        const unitJson = await unitRes.json();
        const recentUnits: Array<{
          id: number;
          code: string;
          reserved_by: number | null;
          bought_by: number | null;
          reserved_at: string | null;
          bought_at: string | null;
          updated_at: string | null;
        }> = unitJson.data ?? [];

        // Verzamel unieke customer IDs uit recent gewijzigde units
        const actionMap = new Map<number, { unitCode: string; activityAt: string }>();
        for (const u of recentUnits) {
          const activityAt = u.updated_at ?? "";
          if (u.bought_by && u.bought_by > 0) {
            const existing = actionMap.get(u.bought_by);
            if (!existing || activityAt > existing.activityAt) {
              actionMap.set(u.bought_by, { unitCode: u.code, activityAt });
            }
          } else if (u.reserved_by && u.reserved_by > 0) {
            const existing = actionMap.get(u.reserved_by);
            if (!existing || activityAt > existing.activityAt) {
              actionMap.set(u.reserved_by, { unitCode: u.code, activityAt });
            }
          }
        }

        if (actionMap.size > 0) {
          // Klantgegevens ophalen voor deze IDs
          const customerIds = Array.from(actionMap.keys()).join(",");
          const custRes = await fetch(
            `${DIRECTUS_URL}/items/customers?filter%5Bid%5D%5B_in%5D=${customerIds}&fields=id,first_name,last_name,email,tags,favourites&limit=50`,
            { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
          );

          if (custRes.ok) {
            const custJson = await custRes.json();
            for (const c of custJson.data ?? []) {
              if (isInternalEmail(c.email)) continue;
              const action = actionMap.get(c.id);
              if (!action) continue;
              unitActionLeads.push({
                id: c.id,
                firstName: c.first_name ?? "",
                lastName: c.last_name ?? "",
                email: c.email,
                lastActiveAt: action.activityAt,
                favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
                tags: c.tags ?? [],
                source: "directus",
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("active-leads unit-action error:", err);
    }
  }

  // --- Samenvoegen: heartbeat > unit-actie > directus-favorieten ---
  const seenIds = new Set<number>();
  const combined: ActiveLead[] = [];

  // 1. Heartbeat leads (meest actueel — live browsing)
  for (const hb of heartbeatLeads) {
    if (seenIds.has(hb.id)) continue;
    seenIds.add(hb.id);
    const directus = directusLeads.find((d) => d.id === hb.id) ?? unitActionLeads.find((d) => d.id === hb.id);
    if (directus) {
      combined.push({ ...directus, lastActiveAt: new Date(hb.lastSeen).toISOString(), source: "heartbeat" });
    } else {
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

  // 2. Unit-actie leads (reservering/aankoop/annulering — 5 min window)
  for (const ul of unitActionLeads) {
    if (seenIds.has(ul.id)) continue;
    seenIds.add(ul.id);
    // Gebruik de meest recente timestamp als directus ook een recentere heeft
    const directus = directusLeads.find((d) => d.id === ul.id);
    if (directus) {
      const ts1 = new Date(ul.lastActiveAt).getTime();
      const ts2 = new Date(directus.lastActiveAt).getTime();
      combined.push({ ...directus, lastActiveAt: ts1 >= ts2 ? ul.lastActiveAt : directus.lastActiveAt });
    } else {
      combined.push(ul);
    }
  }

  // 3. Directus leads op basis van favoriet-activiteit (30 min window)
  for (const dl of directusLeads) {
    if (!heartbeatIds.has(dl.id) && !seenIds.has(dl.id)) {
      seenIds.add(dl.id);
      combined.push(dl);
    }
  }

  // Sorteren: meest recent actief bovenaan
  combined.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  return NextResponse.json({ activeLeads: combined });
}
