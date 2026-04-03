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
 * Transformeert een Directus unit-code (bv. "U-1") naar de project-specifieke weergave (bv. "BOX-1").
 * Werkt ook als het broncode-prefix al klopt.
 */
export function formatUnitCode(code: string, config: ProjectConfig): string {
  // Haal het getal eruit (bijv. "U-14" → "14", "U14" → "14")
  const num = code.replace(/^[A-Za-z]+-?/i, "");
  return `${config.codePrefix}-${num}`;
}
