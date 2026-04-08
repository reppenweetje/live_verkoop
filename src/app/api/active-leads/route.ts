import { NextResponse } from "next/server";

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
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("projectSlug") ?? "";
  // Actief = pinned_changed_at in de laatste 30 minuten
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  try {
    // Node.js fetch hercodeerd brackets via WHATWG URL parser — gebruik pre-encoded %5B/%5D
    // zodat Directus de OR-filter correct parseert (zie ook directus.ts)
    const sincEnc = encodeURIComponent(since);
    const qs = [
      `filter%5B_or%5D%5B0%5D%5Bpinned_changed_at%5D%5B_gte%5D=${sincEnc}`,
      `filter%5B_or%5D%5B1%5D%5Bupdated_at%5D%5B_gte%5D=${sincEnc}`,
      `fields=id,first_name,last_name,email,pinned_changed_at,updated_at,tags,favourites`,
      `limit=100`,
      `sort=-updated_at`,
    ].join("&");

    const res = await fetch(
      `${DIRECTUS_URL}/items/customers?${qs}`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ activeLeads: [] });
    }

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

    const filtered = customers
      .filter((c) => !isInternalEmail(c.email))
      .filter((c) => {
        if (!projectSlug) return true;
        return Array.isArray(c.tags) && c.tags.includes(projectSlug);
      })
      .map((c): ActiveLead => {
        // Meest recente activiteit gebruiken als "laatste actief" timestamp
        const ts1 = c.pinned_changed_at ? new Date(c.pinned_changed_at).getTime() : 0;
        const ts2 = c.updated_at        ? new Date(c.updated_at).getTime()        : 0;
        const lastActiveAt = ts1 >= ts2 ? (c.pinned_changed_at ?? c.updated_at ?? "") : (c.updated_at ?? "");
        return {
          id: c.id,
          firstName: c.first_name ?? "",
          lastName: c.last_name ?? "",
          email: c.email,
          lastActiveAt,
          favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
          tags: c.tags ?? [],
        };
      });

    return NextResponse.json({ activeLeads: filtered });
  } catch (err) {
    console.error("active-leads error:", err);
    return NextResponse.json({ activeLeads: [] });
  }
}
