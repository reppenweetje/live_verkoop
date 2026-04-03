import { subDays, format as dateFnsFormat } from "date-fns";

const PLAUSIBLE_TOKEN = process.env.PLAUSIBLE_TOKEN || "";
const BASE = "https://plausible.io/api/v1";

function fmt(d: Date) {
  return dateFnsFormat(d, "yyyy-MM-dd");
}

export type PeriodQuery = { period: string; date?: string };

export type PeriodDef = {
  key: string;
  label: string;
  isRealtime: boolean;
  isSubDay: boolean;
  query: () => PeriodQuery;
};

export const PERIODS: PeriodDef[] = [
  { key: "5m",  label: "5 min",  isRealtime: true,  isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "15m", label: "15 min", isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "30m", label: "30 min", isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "1h",  label: "1 uur",  isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "3h",  label: "3 uur",  isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "6h",  label: "6 uur",  isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "12h", label: "12 uur", isRealtime: false, isSubDay: true,  query: () => ({ period: "day" }) },
  { key: "today",     label: "Vandaag",            isRealtime: false, isSubDay: false, query: () => ({ period: "day", date: fmt(new Date()) }) },
  { key: "yesterday", label: "Gisteren",           isRealtime: false, isSubDay: false, query: () => ({ period: "day", date: fmt(subDays(new Date(), 1)) }) },
  { key: "3d",  label: "Afgelopen 3 dagen",        isRealtime: false, isSubDay: false, query: () => ({ period: "custom", date: `${fmt(subDays(new Date(), 2))},${fmt(new Date())}` }) },
  { key: "7d",  label: "Afgelopen 7 dagen",        isRealtime: false, isSubDay: false, query: () => ({ period: "7d" }) },
  { key: "14d", label: "Afgelopen 14 dagen",       isRealtime: false, isSubDay: false, query: () => ({ period: "custom", date: `${fmt(subDays(new Date(), 13))},${fmt(new Date())}` }) },
  { key: "30d", label: "Afgelopen 30 dagen",       isRealtime: false, isSubDay: false, query: () => ({ period: "30d" }) },
  { key: "6mo", label: "Afgelopen 6 maanden",      isRealtime: false, isSubDay: false, query: () => ({ period: "6mo" }) },
  { key: "12mo",label: "Afgelopen jaar",           isRealtime: false, isSubDay: false, query: () => ({ period: "12mo" }) },
];

export const SLUG_TO_SITE: Record<string, string> = {
  "de-hofman": "dehofman.nl",
  depaveri:    "depaveri.nl",
  elster11:    "elster11.nl",
};

async function plausibleFetch(path: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${PLAUSIBLE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function periodParams(q: PeriodQuery) {
  const base = `period=${q.period}`;
  return q.date ? `${base}&date=${q.date}` : base;
}

export async function getSiteStats(siteId: string, q: PeriodQuery = { period: "30d" }) {
  const data = await plausibleFetch(
    `/stats/aggregate?site_id=${siteId}&${periodParams(q)}&metrics=visitors,pageviews,visit_duration,bounce_rate`
  );
  if (!data) return { visitors: 0, pageviews: 0, visit_duration: 0, bounce_rate: 0 };
  return {
    visitors:      data.results.visitors?.value      ?? 0,
    pageviews:     data.results.pageviews?.value     ?? 0,
    visit_duration:data.results.visit_duration?.value?? 0,
    bounce_rate:   data.results.bounce_rate?.value   ?? 0,
  };
}

export async function getTimeseries(siteId: string, q: PeriodQuery = { period: "30d" }) {
  const data = await plausibleFetch(`/stats/timeseries?site_id=${siteId}&${periodParams(q)}&metrics=visitors`);
  return data?.results ?? [];
}

export async function getTopPages(siteId: string, q: PeriodQuery = { period: "30d" }, limit = 8) {
  const data = await plausibleFetch(
    `/stats/breakdown?site_id=${siteId}&${periodParams(q)}&property=event:page&limit=${limit}`
  );
  return data?.results ?? [];
}

export async function getDeviceBreakdown(siteId: string, q: PeriodQuery = { period: "30d" }) {
  const data = await plausibleFetch(
    `/stats/breakdown?site_id=${siteId}&${periodParams(q)}&property=visit:device`
  );
  return data?.results ?? [];
}

export async function getSalesToolStats(projectSlug: string, q: PeriodQuery = { period: "30d" }) {
  const filter = `event:page==/${projectSlug}**`;
  const data = await plausibleFetch(
    `/stats/aggregate?site_id=kopen.repp.nl&${periodParams(q)}&metrics=visitors,pageviews,visit_duration,bounce_rate&filters=${filter}`
  );
  if (!data) return { visitors: 0, pageviews: 0, visit_duration: 0, bounce_rate: 0 };
  return {
    visitors:      data.results.visitors?.value      ?? 0,
    pageviews:     data.results.pageviews?.value     ?? 0,
    visit_duration:data.results.visit_duration?.value?? 0,
    bounce_rate:   data.results.bounce_rate?.value   ?? 0,
  };
}

export async function getSalesToolTopPages(projectSlug: string, q: PeriodQuery = { period: "30d" }, limit = 8) {
  const filter = `event:page==/${projectSlug}**`;
  const data = await plausibleFetch(
    `/stats/breakdown?site_id=kopen.repp.nl&${periodParams(q)}&property=event:page&filters=${filter}&limit=${limit}`
  );
  return data?.results ?? [];
}

export async function getTrafficSources(siteId: string, q: PeriodQuery = { period: "30d" }, limit = 8) {
  const data = await plausibleFetch(
    `/stats/breakdown?site_id=${siteId}&${periodParams(q)}&property=visit:source&limit=${limit}`
  );
  return data?.results ?? [];
}

export async function getBrowserBreakdown(siteId: string, q: PeriodQuery = { period: "30d" }, limit = 8) {
  const data = await plausibleFetch(
    `/stats/breakdown?site_id=${siteId}&${periodParams(q)}&property=visit:browser&limit=${limit}`
  );
  return data?.results ?? [];
}

export async function getRealtimeVisitors(siteId: string): Promise<number> {
  const data = await plausibleFetch(`/stats/realtime/visitors?site_id=${siteId}`);
  return data ?? 0;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
