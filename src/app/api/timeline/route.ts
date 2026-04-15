import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, getUnitsForProject } from "@/lib/directus";

function isInternal(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (["@repp.nl", "@erasauna.nl"].some((d) => lower.includes(d))) return true;
  const username = lower.split("@")[0].split("+")[0];
  if (["theovanjacobus"].includes(username)) return true;
  const sub = lower.match(/\+([^@]+)@/);
  if (sub && sub[1].includes("test")) return true;
  return false;
}

const DIRECTUS_URL = process.env.DIRECTUS_URL || "https://cms.reppit.stackingbits.dev";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";

export const dynamic = "force-dynamic";

async function dFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Directus ${res.status} ${path}`);
  return (await res.json()).data as T;
}

export interface SaleEvent {
  type: "verkocht" | "gereserveerd";
  date: string;
  unitCode: string;
  leadName: string;
  price: number;
}

export interface Milestone {
  key: string;
  label: string;
  date: string | null;
  context: string;
  completed: boolean;
}

export interface TimelineData {
  milestones: Milestone[];
  events: SaleEvent[];
  totalSellable: number;
  soldCount: number;
  reservedCount: number;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const project = await getProjectBySlug(slug);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const pid = Number(project.id);

    // Parallel ophalen: units + pinned_units (voor klant-IDs) + eerste favoriet + project aanmaakdatum
    const [units, allPins, firstPinRaw, projectRaw] = await Promise.all([
      getUnitsForProject(pid),
      dFetch<{ customer_id: number; created_at: string }[]>(
        `/items/pinned_units?filter%5Bproject_id%5D%5B_eq%5D=${pid}&fields=customer_id,created_at&limit=1000`
      ).catch(() => [] as { customer_id: number; created_at: string }[]),
      dFetch<{ created_at: string }[]>(
        `/items/pinned_units?filter%5Bproject_id%5D%5B_eq%5D=${pid}&sort=created_at&limit=1&fields=created_at`
      ).catch(() => [] as { created_at: string }[]),
      dFetch<{ created_at: string }[]>(
        `/items/projects?filter%5Bid%5D%5B_eq%5D=${pid}&fields=created_at&limit=1`
      ).catch(() => [] as { created_at: string }[]),
    ]);

    // Klant-IDs uit pinned_units + units (reserved_by + bought_by)
    const customerIdSet = new Set<number>(allPins.map((p) => p.customer_id));
    for (const u of units) {
      if (u.reservedById) customerIdSet.add(u.reservedById);
      if (u.boughtById) customerIdSet.add(u.boughtById);
    }

    // Vroegste registratiedatum ophalen (met interne filter)
    let firstRegistrationAt: string | null = null;
    let regCountAtSale: number | null = null;
    if (customerIdSet.size > 0) {
      try {
        const ids = Array.from(customerIdSet).join(",");
        const customerData = await dFetch<{ id: number; email: string; created_at: string }[]>(
          `/items/customers?filter%5Bid%5D%5B_in%5D=${ids}&fields=id,email,created_at&limit=500`
        );
        const external = customerData.filter((c) => !isInternal(c.email));
        if (external.length > 0) {
          const sorted = external.slice().sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          firstRegistrationAt = sorted[0].created_at;

          // Hoeveel waren er geregistreerd vóór het verkoopmoment?
          if (project.saleStartsAt) {
            const saleTs = new Date(project.saleStartsAt).getTime();
            regCountAtSale = external.filter(
              (c) => new Date(c.created_at).getTime() <= saleTs
            ).length;
          }
        }
      } catch { /* skip */ }
    }

    // ── Milestones berekenen ────────────────────────────────────────────────────

    // Vroegste reserved_at + bought_at per unit (inclusief verlopen reserveringen)
    const allReservedAt = units
      .map((u) => u.reservedAt)
      .filter(Boolean) as string[];
    const allBoughtAt = units
      .filter((u) => u.status === "verkocht" && u.boughtAt)
      .map((u) => u.boughtAt) as string[];

    const firstReservedAt = allReservedAt.length > 0
      ? allReservedAt.reduce((a, b) => (a < b ? a : b))
      : null;
    const firstBoughtAt = allBoughtAt.length > 0
      ? allBoughtAt.reduce((a, b) => (a < b ? a : b))
      : null;

    // Vind unit die het eerst werd verkocht / gereserveerd
    const firstBoughtUnit = firstBoughtAt
      ? units.find((u) => u.boughtAt === firstBoughtAt)
      : null;
    const firstReservedUnit = firstReservedAt
      ? units.find((u) => u.reservedAt === firstReservedAt)
      : null;

    // Volledig uitverkocht?
    const sellableUnits = units.filter((u) => u.status !== "coming_soon");
    const allSold = sellableUnits.length > 0 && sellableUnits.every((u) => u.status === "verkocht");
    const lastBoughtAt = allSold && allBoughtAt.length > 0
      ? allBoughtAt.reduce((a, b) => (a > b ? a : b))
      : null;

    const milestones: Milestone[] = [
      {
        key: "project-gestart",
        label: "Project aangemaakt",
        date: projectRaw[0]?.created_at ?? null,
        context: "",
        completed: !!projectRaw[0]?.created_at,
      },
      {
        key: "eerste-registratie",
        label: "Eerste registratie",
        date: firstRegistrationAt,
        context: "",
        completed: !!firstRegistrationAt,
      },
      {
        key: "eerste-favoriet",
        label: "Eerste favoriet",
        date: firstPinRaw[0]?.created_at ?? null,
        context: "",
        completed: !!firstPinRaw[0]?.created_at,
      },
      {
        key: "verkoopmoment",
        label: "Verkoopmoment gestart",
        date: project.saleStartsAt ?? null,
        context: regCountAtSale !== null ? `${regCountAtSale} leads geregistreerd` : "",
        completed: project.saleStartsAt ? new Date(project.saleStartsAt) <= new Date() : false,
      },
      {
        key: "eerste-reservering",
        label: "Eerste reservering",
        date: firstReservedAt,
        context: firstReservedUnit ? `${firstReservedUnit.code}${firstReservedUnit.reservedByName ? ` · ${firstReservedUnit.reservedByName}` : ""}` : "",
        completed: !!firstReservedAt,
      },
      {
        key: "eerste-verkoop",
        label: "Eerste verkoop",
        date: firstBoughtAt,
        context: firstBoughtUnit ? `${firstBoughtUnit.code}${firstBoughtUnit.boughtByName ? ` · ${firstBoughtUnit.boughtByName}` : ""}` : "",
        completed: !!firstBoughtAt,
      },
      {
        key: "uitverkocht",
        label: "Volledig uitverkocht",
        date: lastBoughtAt,
        context: allSold ? `${sellableUnits.length} units in totaal` : "",
        completed: allSold,
      },
    ]
      // Sorteer op datum (pending milestones achteraan)
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    // ── Verkoopgebeurtenissen ───────────────────────────────────────────────────

    const events: SaleEvent[] = [];

    // Alle verkochte units
    for (const u of units) {
      if (u.status === "verkocht" && u.boughtAt) {
        events.push({
          type: "verkocht",
          date: u.boughtAt,
          unitCode: u.code,
          leadName: u.boughtByName ?? "—",
          price: u.price,
        });
      }
    }

    // Actieve reserveringen
    for (const u of units) {
      if (u.status === "gereserveerd" && u.reservedAt) {
        events.push({
          type: "gereserveerd",
          date: u.reservedAt,
          unitCode: u.code,
          leadName: u.reservedByName ?? "—",
          price: u.price,
        });
      }
    }

    // Nieuwste eerst
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSellable = units.filter((u) => u.status !== "coming_soon").length;
    const soldCount = units.filter((u) => u.status === "verkocht").length;
    const reservedCount = units.filter((u) => u.status === "gereserveerd").length;

    return NextResponse.json({ milestones, events, totalSellable, soldCount, reservedCount } satisfies TimelineData);
  } catch (err) {
    console.error("Timeline API error:", err);
    return NextResponse.json({ error: "Kon timeline niet ophalen" }, { status: 500 });
  }
}
