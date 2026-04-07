import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DIRECTUS_URL = process.env.DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN!;

const INTERNAL_DOMAINS = ["@repp.nl"];

function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (INTERNAL_DOMAINS.some((d) => lower.includes(d))) return true;
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
    const params = new URLSearchParams({
      "filter[pinned_changed_at][_gte]": since,
      "fields": "id,first_name,last_name,email,pinned_changed_at,tags,favourites",
      "limit": "100",
      "sort": "-pinned_changed_at",
    });

    const res = await fetch(
      `${DIRECTUS_URL}/items/customers?${params}`,
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
      pinned_changed_at: string;
      tags: string[];
      favourites: string[] | null;
    }> = json.data ?? [];

    const filtered = customers
      .filter((c) => !isInternalEmail(c.email))
      .filter((c) => {
        if (!projectSlug) return true;
        return Array.isArray(c.tags) && c.tags.includes(projectSlug);
      })
      .map((c): ActiveLead => ({
        id: c.id,
        firstName: c.first_name ?? "",
        lastName: c.last_name ?? "",
        email: c.email,
        lastActiveAt: c.pinned_changed_at,
        favouriteCount: Array.isArray(c.favourites) ? c.favourites.length : 0,
        tags: c.tags ?? [],
      }));

    return NextResponse.json({ activeLeads: filtered });
  } catch (err) {
    console.error("active-leads error:", err);
    return NextResponse.json({ activeLeads: [] });
  }
}
