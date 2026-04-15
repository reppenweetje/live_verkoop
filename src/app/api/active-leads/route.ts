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

export type ActiveLeadAction =
  | { type: "gereserveerd"; unitCode: string }
  | { type: "gekocht"; unitCode: string }
  | { type: "geannuleerd"; unitCode: string }
  | { type: "favoriet" }
  | { type: "browsing" };

export interface ActiveLead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  lastActiveAt: string;
  favouriteCount: number;
  tags: string[];
  source: "heartbeat" | "directus";
  currentAction?: ActiveLeadAction;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("projectSlug") ?? "";
  const directusProjectId = searchParams.get("directusProjectId");

  // --- Bron 1: Heartbeat (live browsing via script op kopen.repp.nl) ---
  const heartbeatLeads = getOnlineLeads(projectSlug, 5 * 60 * 1000);
  const heartbeatIds = new Set(heartbeatLeads.map((l) => l.id));

  // --- Bron 2: Directus — recente pinned_units activiteit voor DIT project (5 min) ---
  // We gebruiken pinned_units i.p.v. customers.updated_at zodat de activiteit
  // gegarandeerd project-specifiek is en niet lekt naar andere projecten.
  const since5 = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  let directusLeads: ActiveLead[] = [];
  if (directusProjectId) {
    try {
      const since5Enc = encodeURIComponent(since5);
      // Haal recente pins op voor dit specifieke project
      const pinQs = [
        `filter%5Bproject_id%5D%5B_eq%5D=${directusProjectId}`,
        `filter%5Bcreated_at%5D%5B_gte%5D=${since5Enc}`,
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
              const lastActiveAt = pinMap.get(c.id) ?? since5;
              directusLeads.push({
                id: c.id,
                firstName: c.first_name ?? "",
                lastName: c.last_name ?? "",
                email: c.email,
                lastActiveAt,
                favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
                tags: c.tags ?? [],
                source: "directus",
                currentAction: { type: "favoriet" },
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
        `fields=id,code,bought,reserved_by,bought_by,reserved_until,reserved_at,bought_at,updated_at`,
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
          bought: boolean;
          reserved_by: number | null;
          bought_by: number | null;
          reserved_until: string | null;
          reserved_at: string | null;
          bought_at: string | null;
          updated_at: string | null;
        }> = unitJson.data ?? [];

        const now = new Date();

        // Bepaal actietype per unit en wijs toe aan de juiste klant
        const actionMap = new Map<number, {
          unitCode: string;
          activityAt: string;
          actionType: "gereserveerd" | "gekocht" | "geannuleerd";
        }>();

        for (const u of recentUnits) {
          const activityAt = u.updated_at ?? "";

          // Bepaal actietype op basis van huidige staat van de unit
          const isBought = u.bought === true;
          const hasActiveReservation = u.reserved_until
            ? new Date(u.reserved_until) > now
            : false;

          const actionType = isBought
            ? "gekocht"
            : hasActiveReservation
            ? "gereserveerd"
            : "geannuleerd";

          // Bepaal welke klant de actie heeft uitgevoerd
          const customerId = isBought
            ? (u.bought_by && u.bought_by > 0 ? u.bought_by : null)
            : (u.reserved_by && u.reserved_by > 0 ? u.reserved_by : null);

          if (!customerId) continue;

          const existing = actionMap.get(customerId);
          if (!existing || activityAt > existing.activityAt) {
            actionMap.set(customerId, { unitCode: u.code, activityAt, actionType });
          }
        }

        if (actionMap.size > 0) {
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
                currentAction: { type: action.actionType, unitCode: action.unitCode },
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
  // currentAction prioriteit: unit-actie (gereserveerd/gekocht/geannuleerd) > favoriet > browsing
  const seenIds = new Set<number>();
  const combined: ActiveLead[] = [];

  // Helper: meest relevante currentAction kiezen (unit-actie wint van favoriet/browsing)
  function bestAction(a?: ActiveLeadAction, b?: ActiveLeadAction): ActiveLeadAction | undefined {
    const rank = (ac?: ActiveLeadAction) => {
      if (!ac) return 0;
      if (ac.type === "gekocht") return 4;
      if (ac.type === "gereserveerd") return 3;
      if (ac.type === "geannuleerd") return 2;
      if (ac.type === "favoriet") return 1;
      return 0;
    };
    return rank(a) >= rank(b) ? a : b;
  }

  // 1. Heartbeat leads (meest actueel — live browsing)
  for (const hb of heartbeatLeads) {
    if (seenIds.has(hb.id)) continue;
    seenIds.add(hb.id);
    const unitLead = unitActionLeads.find((d) => d.id === hb.id);
    const directus = directusLeads.find((d) => d.id === hb.id);
    const base = unitLead ?? directus;
    const action = bestAction(unitLead?.currentAction, directus?.currentAction) ?? { type: "browsing" as const };
    if (base) {
      combined.push({ ...base, lastActiveAt: new Date(hb.lastSeen).toISOString(), source: "heartbeat", currentAction: action });
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
        currentAction: { type: "browsing" },
      });
    }
  }

  // 2. Unit-actie leads (reservering/aankoop/annulering — 5 min window)
  for (const ul of unitActionLeads) {
    if (seenIds.has(ul.id)) continue;
    seenIds.add(ul.id);
    const directus = directusLeads.find((d) => d.id === ul.id);
    if (directus) {
      const ts1 = new Date(ul.lastActiveAt).getTime();
      const ts2 = new Date(directus.lastActiveAt).getTime();
      combined.push({
        ...directus,
        lastActiveAt: ts1 >= ts2 ? ul.lastActiveAt : directus.lastActiveAt,
        currentAction: bestAction(ul.currentAction, directus.currentAction),
      });
    } else {
      combined.push(ul);
    }
  }

  // 3. Directus leads op basis van favoriet-activiteit (5 min window)
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
