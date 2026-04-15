/**
 * Per-project configuratie voor terminologie en weergave-opties.
 * Voeg hier een slug toe om de standaardteksten te overschrijven.
 */

export interface ProjectConfig {
  /** Label voor de individuele eenheid (enkelvoud) */
  unitSingular: string;
  /** Label voor meerdere eenheden (meervoud) */
  unitPlural: string;
  /** Sidebar nav-label */
  navLabel: string;
  /** Interesse-sectie label */
  interestLabel: string;
  /** Groeperingslabel (bv. "Verdieping" of "Sectie") */
  groupLabel: string;
  /** Prefix voor unit-codes in de weergave (bv. "U" → "BOX") */
  codePrefix: string;
}

const DEFAULT_CONFIG: ProjectConfig = {
  unitSingular:  "Unit",
  unitPlural:    "Units",
  navLabel:      "Units",
  interestLabel: "Interesse per Unit",
  groupLabel:    "Verdieping",
  codePrefix:    "U",
};

const PROJECT_CONFIGS: Record<string, Partial<ProjectConfig>> = {
  "6th-grid": {
    unitSingular:  "Garagebox",
    unitPlural:    "Garageboxen",
    navLabel:      "Garageboxen",
    interestLabel: "Interesse per Garagebox",
    groupLabel:    "Sectie",
    codePrefix:    "BOX",
  },
};

export function getProjectConfig(slug: string): ProjectConfig {
  return { ...DEFAULT_CONFIG, ...(PROJECT_CONFIGS[slug] ?? {}) };
}

/**
 * Transformeert een Directus unit-code naar de project-specifieke weergave.
 * Voorbeelden:
 *   "U-1"     → "U-1"  (standaard)
 *   "U-0-0.1" → "BOX-0.1"  (6th Grid: neemt het laatste segment na de prefix)
 */
export function formatUnitCode(code: string, config: ProjectConfig): string {
  // Verwijder het letter-prefix (bv. "U-")
  const withoutPrefix = code.replace(/^[A-Za-z]+-?/i, "");
  // Als er nog een '-' in zit (bv. "0-0.1"), neem alleen het deel na de eerste '-'
  const segments = withoutPrefix.split("-");
  const num = segments.length > 1 ? segments.slice(1).join("-") : segments[0];
  return `${config.codePrefix}-${num}`;
}
