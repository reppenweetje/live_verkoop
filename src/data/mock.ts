// Mock data for development — will be replaced with live Directus data

export type UnitStatus = "beschikbaar" | "gereserveerd" | "verkocht";

export interface Unit {
  id: string;
  name: string;
  type: string;
  floor: number;
  size: number; // m²
  price: number;
  status: UnitStatus;
  reservedBy?: string;
  soldTo?: string;
  reservedAt?: string;
  soldAt?: string;
}

export interface Project {
  id: string;
  name: string;
  subtitle: string;
  location: string;
  totalUnits: number;
  launchDate: string;
  status: "voorbereiding" | "live" | "afgerond";
  image?: string;
}

export interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
  favoriteUnits: string[];
  financing: "ja" | "nee" | "wellicht";
  nautical: boolean;
  viewCount: number;
  lastActive?: string;
}

export interface LiveVisitor {
  id: string;
  sessionId: string;
  name?: string;
  currentPage: string;
  position: { x: number; y: number };
  isRegistered: boolean;
  startedAt: string;
}

export const projects: Project[] = [
  {
    id: "pier14",
    name: "PIER 14",
    subtitle: "Koopomgeving Fase II",
    location: "Amsterdam",
    totalUnits: 24,
    launchDate: "2025-03-15",
    status: "live",
  },
  {
    id: "haven-west",
    name: "Haven West",
    subtitle: "Appartementen aan het IJ",
    location: "Amsterdam",
    totalUnits: 48,
    launchDate: "2026-06-01",
    status: "voorbereiding",
  },
  {
    id: "parkzicht",
    name: "Parkzicht Residences",
    subtitle: "Luxe wonen in het groen",
    location: "Haarlem",
    totalUnits: 32,
    launchDate: "2026-09-15",
    status: "voorbereiding",
  },
];

export const units: Unit[] = [
  { id: "101", name: "Unit 101", type: "Appartement", floor: 1, size: 72, price: 385000, status: "verkocht", soldTo: "Jan de Vries", soldAt: "2025-03-15T10:02:00" },
  { id: "102", name: "Unit 102", type: "Appartement", floor: 1, size: 85, price: 425000, status: "verkocht", soldTo: "Maria Bakker", soldAt: "2025-03-15T10:05:00" },
  { id: "103", name: "Unit 103", type: "Appartement", floor: 1, size: 65, price: 345000, status: "gereserveerd", reservedBy: "Pieter Drost", reservedAt: "2025-03-15T10:08:00" },
  { id: "104", name: "Unit 104", type: "Penthouse", floor: 1, size: 110, price: 595000, status: "gereserveerd", reservedBy: "Gertjan Hootsen", reservedAt: "2025-03-15T10:12:00" },
  { id: "105", name: "Unit 105", type: "Appartement", floor: 1, size: 78, price: 395000, status: "beschikbaar" },
  { id: "106", name: "Unit 106", type: "Appartement", floor: 1, size: 92, price: 465000, status: "verkocht", soldTo: "Sophie van den Bos", soldAt: "2025-03-15T10:15:00" },
  { id: "201", name: "Unit 201", type: "Appartement", floor: 2, size: 72, price: 395000, status: "beschikbaar" },
  { id: "202", name: "Unit 202", type: "Appartement", floor: 2, size: 85, price: 445000, status: "gereserveerd", reservedBy: "Umut Guler", reservedAt: "2025-03-15T10:20:00" },
  { id: "203", name: "Unit 203", type: "Appartement", floor: 2, size: 65, price: 355000, status: "verkocht", soldTo: "Danny Schild", soldAt: "2025-03-15T10:22:00" },
  { id: "204", name: "Unit 204", type: "Penthouse", floor: 2, size: 110, price: 625000, status: "beschikbaar" },
  { id: "205", name: "Unit 205", type: "Appartement", floor: 2, size: 78, price: 405000, status: "beschikbaar" },
  { id: "206", name: "Unit 206", type: "Appartement", floor: 2, size: 92, price: 475000, status: "gereserveerd", reservedBy: "Rienk Halsema", reservedAt: "2025-03-15T10:30:00" },
  { id: "301", name: "Unit 301", type: "Appartement", floor: 3, size: 72, price: 410000, status: "beschikbaar" },
  { id: "302", name: "Unit 302", type: "Appartement", floor: 3, size: 85, price: 455000, status: "verkocht", soldTo: "Theo Jac", soldAt: "2025-03-15T10:35:00" },
  { id: "303", name: "Unit 303", type: "Appartement", floor: 3, size: 65, price: 365000, status: "beschikbaar" },
  { id: "304", name: "Unit 304", type: "Penthouse", floor: 3, size: 130, price: 725000, status: "gereserveerd", reservedBy: "Jeroen Arissen", reservedAt: "2025-03-15T10:40:00" },
  { id: "305", name: "Unit 305", type: "Appartement", floor: 3, size: 78, price: 415000, status: "beschikbaar" },
  { id: "306", name: "Unit 306", type: "Appartement", floor: 3, size: 92, price: 485000, status: "beschikbaar" },
  { id: "401", name: "Unit 401", type: "Penthouse", floor: 4, size: 145, price: 825000, status: "verkocht", soldTo: "Mike Dawud", soldAt: "2025-03-15T10:45:00" },
  { id: "402", name: "Unit 402", type: "Penthouse", floor: 4, size: 160, price: 895000, status: "beschikbaar" },
  { id: "403", name: "Unit 403", type: "Penthouse", floor: 4, size: 135, price: 775000, status: "gereserveerd", reservedBy: "Wim Barten", reservedAt: "2025-03-15T10:50:00" },
  { id: "404", name: "Unit 404", type: "Penthouse", floor: 4, size: 155, price: 875000, status: "beschikbaar" },
  { id: "501", name: "Unit 501", type: "Penthouse XL", floor: 5, size: 200, price: 1250000, status: "verkocht", soldTo: "Jesse van Riessen", soldAt: "2025-03-15T10:55:00" },
  { id: "502", name: "Unit 502", type: "Penthouse XL", floor: 5, size: 210, price: 1350000, status: "beschikbaar" },
];

export const registrations: Registration[] = [
  { id: "1", name: "Daan Hofman", email: "daan01@gmail.com", phone: "0617149194", registeredAt: "2025-03-27T14:30:00", favoriteUnits: ["101", "203"], financing: "nee", nautical: false, viewCount: 12, lastActive: "2025-03-31T09:15:00" },
  { id: "2", name: "Jan van Dijkhuizen", email: "janvandijkhuizen@hotmail.com", phone: "0654673035", registeredAt: "2025-03-25T10:00:00", favoriteUnits: ["104", "304"], financing: "nee", nautical: true, viewCount: 8, lastActive: "2025-03-30T16:20:00" },
  { id: "3", name: "Umut Guler", email: "m-k2@hotmail.nl", phone: "0629480640", registeredAt: "2025-03-25T11:30:00", favoriteUnits: ["202", "302", "402"], financing: "nee", nautical: false, viewCount: 15, lastActive: "2025-03-31T10:05:00" },
  { id: "4", name: "Pieter Drost", email: "pieterdrost64@gmail.com", phone: "0651986303", registeredAt: "2025-03-23T09:00:00", favoriteUnits: ["103", "203", "303"], financing: "nee", nautical: false, viewCount: 22, lastActive: "2025-03-31T08:45:00" },
  { id: "5", name: "Gertjan Hootsen", email: "hootsenbestrating@gmail.com", phone: "0629503550", registeredAt: "2025-03-22T15:30:00", favoriteUnits: ["104", "204", "304"], financing: "nee", nautical: true, viewCount: 18, lastActive: "2025-03-30T20:10:00" },
  { id: "6", name: "Theo Jac", email: "theovanjacobus@gmail.com", phone: "0622222222", registeredAt: "2025-03-18T12:00:00", favoriteUnits: ["302"], financing: "wellicht", nautical: false, viewCount: 6, lastActive: "2025-03-28T14:30:00" },
  { id: "7", name: "Jeroen Arissen", email: "info@arissen-elektro.nl", phone: "0622891850", registeredAt: "2025-03-18T08:00:00", favoriteUnits: ["304", "401", "501"], financing: "nee", nautical: true, viewCount: 25, lastActive: "2025-03-31T10:30:00" },
  { id: "8", name: "Danny Schild", email: "info@dtn-elektro.nl", phone: "0612161167", registeredAt: "2025-03-16T14:00:00", favoriteUnits: ["203", "303"], financing: "wellicht", nautical: false, viewCount: 9, lastActive: "2025-03-29T11:00:00" },
  { id: "9", name: "Flip Jacobs", email: "flip@repp.nl", phone: "0630856088", registeredAt: "2025-03-16T10:00:00", favoriteUnits: ["501"], financing: "ja", nautical: false, viewCount: 3, lastActive: "2025-03-31T07:00:00" },
  { id: "10", name: "Mike Dawud", email: "mike.dawud@outtask.nl", phone: "0655710999", registeredAt: "2025-03-15T09:00:00", favoriteUnits: ["401", "501", "502"], financing: "nee", nautical: true, viewCount: 31, lastActive: "2025-03-31T10:45:00" },
  { id: "11", name: "Sophie van den Bos", email: "sophie@repp.nl", phone: "0631539732", registeredAt: "2025-03-04T16:00:00", favoriteUnits: ["106", "206"], financing: "ja", nautical: false, viewCount: 14, lastActive: "2025-03-30T18:00:00" },
  { id: "12", name: "Jacco Kingsbergen", email: "info@stadsbouwers.nl", phone: "0640247801", registeredAt: "2025-03-11T11:00:00", favoriteUnits: ["204", "304", "404"], financing: "nee", nautical: true, viewCount: 20, lastActive: "2025-03-31T09:30:00" },
];

// Analytics mock data
export const analyticsData = {
  visitors: 466,
  pageviews: 2176,
  downloads: 79,
  avgTime: "4m 12s",
  bounceRate: 32,
  visitorsChange: 12.5,
  pageviewsChange: 8.3,
  downloadsChange: -3.2,
};

export const visitorTimeseries = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2025, 2, i + 1).toISOString().split("T")[0],
  visitors: Math.floor(Math.random() * 80 + 30),
  pageviews: Math.floor(Math.random() * 200 + 50),
}));

export const deviceData = [
  { name: "Mobiel", value: 67.4, color: "#6366f1" },
  { name: "Desktop", value: 30.9, color: "#22c55e" },
  { name: "Tablet", value: 1.7, color: "#f97316" },
];

export const browserData = [
  { name: "Chrome", value: 41.0, color: "#6366f1" },
  { name: "Safari", value: 32.8, color: "#8b5cf6" },
  { name: "Samsung", value: 7.9, color: "#f59e0b" },
  { name: "Edge", value: 6.2, color: "#ef4444" },
  { name: "Firefox", value: 5.1, color: "#a855f7" },
  { name: "Overig", value: 7.0, color: "#6b7280" },
];
