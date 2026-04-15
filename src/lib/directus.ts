const DIRECTUS_URL = process.env.DIRECTUS_URL || "https://cms.reppit.stackingbits.dev";
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || "";

async function directusFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Directus fetch failed: ${res.status} ${endpoint}`);
  }

  const json = await res.json();
  return json.data as T;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht" | "coming_soon";

export interface DirectusUnit {
  id: number;
  project_id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  floor: number;
  group_name: string;
  surface_area: string;
  parking_spaces: number;
  bought: boolean;
  bought_at: string | null;
  bought_by: number | null;
  reserved_by: number | null;
  reserved_at: string | null;
  reserved_until: string | null;
  status_override: UnitStatus | "coming_soon" | null;
  external_url: string | null;
}

export interface DirectusProject {
  id: number;
  name: string;
  slug: string;
  sale_starts_at: string | null;
  created_at: string;
  logo: string | null;
  groundplan_active: boolean;
}

export interface DirectusPinnedUnit {
  id: number;
  customer_id: number;
  unit_id: number;
  project_id: number;
  created_at: string;
}

// ─── Derived types voor het dashboard ────────────────────────────────────────

export interface DashboardUnit {
  id: string;
  code: string;
  name: string;
  type: string;
  floor: number;
  size: string;
  price: number;
  status: UnitStatus;
  reservedAt?: string;
  reservedUntil?: string;
  boughtAt?: string;
  parkingSpaces: number;
  reservedByName?: string;
  boughtByName?: string;
  reservedById?: number;
  boughtById?: number;
}

export interface DashboardProject {
  id: string;
  name: string;
  slug: string;
  saleStartsAt: string | null;
  status: "voorbereiding" | "live" | "afgerond";
  logoUrl: string | null;
}

// ─── Status berekening ────────────────────────────────────────────────────────

// Hardcoded coming_soon overrides per project (unit code → coming_soon)
// Wordt gebruikt als status_override in Directus niet gezet is.
const COMING_SOON_BY_PROJECT: Record<number, string[]> = {
  5: ["U-7", "U-14"],   // De Hofman: unit 7 en 14 nog niet te koop
};

export function getUnitStatus(unit: DirectusUnit): UnitStatus {
  if (unit.status_override === "coming_soon") return "coming_soon";
  if (unit.status_override) return unit.status_override as UnitStatus;

  // Code-level coming_soon override (per project)
  const projectComingSoon = COMING_SOON_BY_PROJECT[unit.project_id] ?? [];
  if (projectComingSoon.includes(unit.code)) return "coming_soon";

  // Alleen de bought boolean is bepalend — bought_at kan ook bij
  // geannuleerde aankopen gezet zijn zonder dat bought op true staat
  if (unit.bought) return "verkocht";

  // Actieve reservering (nog niet verlopen)
  if (unit.reserved_until) {
    const reservedUntil = new Date(unit.reserved_until);
    if (reservedUntil > new Date()) return "gereserveerd";
  }

  return "beschikbaar";
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

const NULL_DATE_PREFIX = "0001-01-01";

export function mapUnit(
  unit: DirectusUnit,
  customerNames: Map<number, string> = new Map()
): DashboardUnit {
  const boughtAt = unit.bought_at && !unit.bought_at.startsWith(NULL_DATE_PREFIX)
    ? unit.bought_at
    : undefined;

  const reservedById = unit.reserved_by && unit.reserved_by > 0 ? unit.reserved_by : undefined;
  const boughtById = unit.bought_by && unit.bought_by > 0 ? unit.bought_by : undefined;

  return {
    id: String(unit.id),
    code: unit.code,
    name: unit.name,
    type: unit.group_name || "Unit",
    floor: unit.floor,
    size: unit.surface_area || "",
    price: unit.price,
    status: getUnitStatus(unit),
    reservedAt: unit.reserved_at ?? undefined,
    reservedUntil: unit.reserved_until ?? undefined,
    boughtAt,
    parkingSpaces: unit.parking_spaces || 0,
    reservedById,
    boughtById,
    reservedByName: reservedById ? customerNames.get(reservedById) : undefined,
    boughtByName: boughtById ? customerNames.get(boughtById) : undefined,
  };
}

export function mapProject(project: DirectusProject): DashboardProject {
  const now = new Date();
  const saleDate = project.sale_starts_at ? new Date(project.sale_starts_at) : null;

  let status: DashboardProject["status"] = "voorbereiding";
  if (saleDate) {
    if (saleDate <= now) status = "live";
    else status = "voorbereiding";
  }

  const logoUrl = project.logo
    ? `${DIRECTUS_URL}/assets/${project.logo}`
    : null;

  return {
    id: String(project.id),
    name: project.name,
    slug: project.slug,
    saleStartsAt: project.sale_starts_at,
    status,
    logoUrl,
  };
}

// ─── Interne medewerkers filter ───────────────────────────────────────────────
// Leads met @repp.nl in hun e-mailadres zijn interne medewerkers en
// worden overal uitgesloten: registraties, heatmap-tellers en lead-profielen.

const INTERNAL_DOMAINS = ["@repp.nl", "@erasauna.nl"];

// Gebruikersnamen die altijd worden uitgefilterd (eigenaar/beheerder accounts)
const INTERNAL_USERNAMES = ["theovanjacobus"];

function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();

  // Domein filter (bijv. @repp.nl, @erasauna.nl)
  if (INTERNAL_DOMAINS.some((d) => lower.includes(d))) return true;

  // Gebruikersnaam filter (bijv. theovanjacobus@gmail.com)
  const username = lower.split("@")[0].split("+")[0];
  if (INTERNAL_USERNAMES.some((u) => username === u)) return true;

  // Subadres filter: alles na + en vóór @ dat "test" bevat
  // Matcht: +test, +test18, +finaltest, +mytest, etc.
  const subMatch = lower.match(/\+([^@]+)@/);
  if (subMatch && subMatch[1].includes("test")) return true;

  return false;
}

// ─── API functies ─────────────────────────────────────────────────────────────

const PRIMARY_SLUGS = ["de-hofman", "depaveri", "elster11", "6th-grid", "test"];

export async function getProjectBySlug(slug: string): Promise<DashboardProject | null> {
  try {
    const raw = await directusFetch<DirectusProject[]>(
      `/items/projects?filter%5Bslug%5D%5B_eq%5D=${encodeURIComponent(slug)}&limit=1`
    );
    return raw.length > 0 ? mapProject(raw[0]) : null;
  } catch {
    return null;
  }
}

export async function getProjects(): Promise<DashboardProject[]> {
  const results = await Promise.all(
    PRIMARY_SLUGS.map((slug) => getProjectBySlug(slug))
  );
  return results.filter(Boolean) as DashboardProject[];
}

export async function getUnitsForProject(projectId: number): Promise<DashboardUnit[]> {
  const raw = await directusFetch<DirectusUnit[]>(
    `/items/units?filter%5Bproject_id%5D%5B_eq%5D=${projectId}&limit=200&sort=floor,code&fields=*`
  );

  // Batch ophalen van klantennamen voor reserved_by en bought_by IDs
  const customerIds = new Set<number>();
  for (const u of raw) {
    if (u.reserved_by && u.reserved_by > 0) customerIds.add(u.reserved_by);
    if (u.bought_by && u.bought_by > 0) customerIds.add(u.bought_by);
  }

  const customerNames = new Map<number, string>();
  if (customerIds.size > 0) {
    try {
      const ids = Array.from(customerIds).join(",");
      const customers = await directusFetch<{ id: number; first_name: string; last_name: string }[]>(
        `/items/customers?filter%5Bid%5D%5B_in%5D=${ids}&fields=id,first_name,last_name&limit=200`
      );
      for (const c of customers) {
        const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
        customerNames.set(c.id, name || `Lead #${c.id}`);
      }
    } catch {
      // Als klantgegevens niet ophaalbaar zijn, gaan we door zonder namen
    }
  }

  return raw.map((u) => mapUnit(u, customerNames));
}

export async function getPinnedUnitsForProject(projectId: number): Promise<DirectusPinnedUnit[]> {
  return directusFetch<DirectusPinnedUnit[]>(
    `/items/pinned_units?filter%5Bproject_id%5D%5B_eq%5D=${projectId}&limit=1000`
  );
}

// Geeft een map van unit_id → aantal externe leads dat die unit heeft gepind
// (interne @repp.nl medewerkers worden uitgesloten)
export async function getPinnedUnitCounts(projectId: number): Promise<Record<number, number>> {
  try {
    const pins = await getPinnedUnitsForProject(projectId);

    const customerIds = [...new Set(pins.map((p) => p.customer_id))];
    const customers = customerIds.length > 0 ? await getCustomersByIds(customerIds) : [];
    const internalIds = new Set(
      customers.filter((c) => isInternalEmail(c.email)).map((c) => c.id)
    );

    const counts: Record<number, number> = {};
    pins
      .filter((p) => !internalIds.has(p.customer_id))
      .forEach((p) => {
        counts[p.unit_id] = (counts[p.unit_id] ?? 0) + 1;
      });
    return counts;
  } catch {
    return {};
  }
}

// ─── Customer/registraties types ──────────────────────────────────────────────

export interface DirectusCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  financing: "ja" | "nee" | "wellicht" | null;
  nautical: "ja" | "nee" | null;
  registration_type: "business" | "private" | null;
  kvk_number: string | null;
  created_at: string;
}

export interface DashboardRegistration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  financing: "ja" | "nee" | "wellicht" | null;
  nautical: boolean;
  registrationType: "business" | "private" | null;
  kvkNumber: string | null;
  registeredAt: string;
  pinnedUnitCodes: string[];
}

export async function getCustomersByIds(ids: number[]): Promise<DirectusCustomer[]> {
  if (ids.length === 0) return [];
  return directusFetch<DirectusCustomer[]>(
    `/items/customers?filter%5Bid%5D%5B_in%5D=${ids.join(",")}&fields=id,first_name,last_name,email,phone_number,financing,nautical,registration_type,kvk_number,created_at&limit=500`
  );
}

export interface PinnedLeadEntry {
  id: number;
  name: string;
  totalFavourites: number; // totaal aantal gepinde units van deze lead (over dit project)
}

// Geeft per unit_id een lijst van leads die die unit hebben gepind
export async function getPinnedLeadsByUnit(
  projectId: number
): Promise<Record<number, PinnedLeadEntry[]>> {
  try {
    const pins = await getPinnedUnitsForProject(projectId);

    const customerIds = [...new Set(pins.map((p) => p.customer_id))];
    if (customerIds.length === 0) return {};

    // Haal klanten op inclusief favourites veld voor totaal-telling
    const raw = await directusFetch<Array<{
      id: number; first_name: string; last_name: string; email: string; favourites: unknown[];
    }>>(
      `/items/customers?filter%5Bid%5D%5B_in%5D=${customerIds.join(",")}&fields=id,first_name,last_name,email,favourites&limit=500`
    );

    const customerMap = new Map(raw.map((c) => [c.id, c]));

    const result: Record<number, PinnedLeadEntry[]> = {};
    for (const pin of pins) {
      const customer = customerMap.get(pin.customer_id);
      if (!customer || isInternalEmail(customer.email)) continue;
      if (!result[pin.unit_id]) result[pin.unit_id] = [];
      // Voorkom dubbelen (één lead kan meerdere pinnen voor dezelfde unit hebben)
      if (!result[pin.unit_id].some((e) => e.id === customer.id)) {
        result[pin.unit_id].push({
          id: customer.id,
          name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email,
          totalFavourites: Array.isArray(customer.favourites) ? customer.favourites.length : 0,
        });
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function getRegistrationsForProject(
  projectId: number
): Promise<DashboardRegistration[]> {
  const pinnedUnits = await getPinnedUnitsForProject(projectId);

  const units = await getUnitsForProject(projectId);
  const unitCodeMap = new Map<number, string>(
    units.map((u) => [Number(u.id), u.code.replace(/^U-/i, "")])
  );

  const byCustomer = new Map<number, { unitCodes: string[]; createdAt: string }>();
  for (const pu of pinnedUnits) {
    if (!byCustomer.has(pu.customer_id)) {
      byCustomer.set(pu.customer_id, { unitCodes: [], createdAt: pu.created_at });
    }
    const code = unitCodeMap.get(pu.unit_id);
    if (code) byCustomer.get(pu.customer_id)!.unitCodes.push(code);
  }

  const customerIds = [...byCustomer.keys()];
  const customers = await getCustomersByIds(customerIds);

  // Interne medewerkers uitsluiten
  return customers
    .filter((c) => !isInternalEmail(c.email))
    .map((c) => {
      const pinData = byCustomer.get(c.id);
      return {
        id: String(c.id),
        name: `${c.first_name} ${c.last_name}`.trim(),
        email: c.email,
        phone: c.phone_number ?? null,
        financing: c.financing ?? null,
        nautical: c.nautical === "ja",
        registrationType: c.registration_type ?? null,
        kvkNumber: c.kvk_number ?? null,
        registeredAt: c.created_at,
        pinnedUnitCodes: (pinData?.unitCodes ?? []).sort(
          (a, b) => Number(a) - Number(b)
        ),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()
    );
}

// ─── Lead profiel types & functies ───────────────────────────────────────────

export interface MrAnswer {
  id: number;
  customer_id: number;
  question_id: number;
  option_id: number;
  created_at: string;
}

export interface LeadUnit {
  id: string;
  code: string;
  name: string;
  price: number;
  status: UnitStatus;
  boughtAt?: string;
  reservedAt?: string;
  pinnedAt?: string;
}

export interface LeadProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  financing: "ja" | "nee" | "wellicht" | null;
  nautical: boolean;
  registrationType: "business" | "private" | null;
  kvkNumber: string | null;
  registeredAt: string;
  pinnedUnits: LeadUnit[];
  boughtUnits: LeadUnit[];
  mrAnswers: MrAnswer[];
}

export async function getCustomerById(customerId: number): Promise<DirectusCustomer | null> {
  try {
    return await directusFetch<DirectusCustomer>(
      `/items/customers/${customerId}?fields=id,first_name,last_name,email,phone_number,financing,nautical,registration_type,kvk_number,created_at`
    );
  } catch {
    return null;
  }
}

export async function getLeadProfile(
  customerId: number,
  projectId: number
): Promise<LeadProfile | null> {
  const [customer, allUnits, pinnedRaw, mrAnswers] = await Promise.all([
    getCustomerById(customerId),
    getUnitsForProject(projectId),
    directusFetch<DirectusPinnedUnit[]>(
      `/items/pinned_units?filter%5Bcustomer_id%5D%5B_eq%5D=${customerId}&filter%5Bproject_id%5D%5B_eq%5D=${projectId}&limit=100`
    ),
    directusFetch<MrAnswer[]>(
      `/items/mr_answers?filter%5Bcustomer_id%5D%5B_eq%5D=${customerId}&limit=100&sort=question_id`
    ).catch(() => [] as MrAnswer[]),
  ]);

  // Interne medewerker: geen profiel tonen
  if (!customer || isInternalEmail(customer.email)) return null;

  const unitMap = new Map(allUnits.map((u) => [Number(u.id), u]));

  const pinnedUnits: LeadUnit[] = pinnedRaw
    .map((p) => {
      const u = unitMap.get(p.unit_id);
      if (!u) return null;
      return {
        id: u.id,
        code: u.code,
        name: u.name,
        price: u.price,
        status: u.status,
        pinnedAt: p.created_at,
        boughtAt: u.boughtAt,
        reservedAt: u.reservedAt,
      } as LeadUnit;
    })
    .filter(Boolean) as LeadUnit[];

  const boughtUnits = pinnedUnits.filter((u) => u.status === "verkocht");

  return {
    id: String(customer.id),
    name: `${customer.first_name} ${customer.last_name}`.trim(),
    email: customer.email,
    phone: customer.phone_number ?? null,
    financing: customer.financing ?? null,
    nautical: customer.nautical === "ja",
    registrationType: customer.registration_type ?? null,
    kvkNumber: customer.kvk_number ?? null,
    registeredAt: customer.created_at,
    pinnedUnits,
    boughtUnits,
    mrAnswers,
  };
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

export function calcUnitStats(units: DashboardUnit[]) {
  const beschikbaar = units.filter((u) => u.status === "beschikbaar");
  const gereserveerd = units.filter((u) => u.status === "gereserveerd");
  const verkocht = units.filter((u) => u.status === "verkocht");
  const activeUnits = units.filter((u) => u.status !== "coming_soon");

  const verkochtTotal = verkocht.reduce((sum, u) => sum + u.price, 0);
  const gereserveerdTotal = gereserveerd.reduce((sum, u) => sum + u.price, 0);
  const totalProjectValue = activeUnits.reduce((sum, u) => sum + u.price, 0);

  return {
    total: activeUnits.length,
    beschikbaar: beschikbaar.length,
    gereserveerd: gereserveerd.length,
    verkocht: verkocht.length,
    verkochtTotal,
    gereserveerdTotal,
    totalProjectValue,
  };
}
