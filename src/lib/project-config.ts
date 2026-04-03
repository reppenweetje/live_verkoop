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
}

const DEFAULT_CONFIG: ProjectConfig = {
  unitSingular:  "Unit",
  unitPlural:    "Units",
  navLabel:      "Units",
  interestLabel: "Interesse per Unit",
  groupLabel:    "Verdieping",
};

const PROJECT_CONFIGS: Record<string, Partial<ProjectConfig>> = {
  "6th-grid": {
    unitSingular:  "Garagebox",
    unitPlural:    "Garageboxen",
    navLabel:      "Garageboxen",
    interestLabel: "Interesse per Garagebox",
    groupLabel:    "Sectie",
  },
};

export function getProjectConfig(slug: string): ProjectConfig {
  return { ...DEFAULT_CONFIG, ...(PROJECT_CONFIGS[slug] ?? {}) };
}
