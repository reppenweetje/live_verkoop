"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { Users, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Phone, Mail, Building2, Anchor, CreditCard, BellOff, Clock } from "lucide-react";
import { format, parseISO, isAfter, subDays, differenceInDays } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

type DashboardRegistration = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  financing: string | null;
  nautical: boolean;
  registrationType: string | null;
  kvkNumber: string | null;
  registeredAt: string;
  pinnedUnitCodes: string[];
};

function FinancingBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <Badge variant={value === "ja" ? "success" : value === "nee" ? "danger" : "warning"}>
      {value === "ja" ? "Ja" : value === "nee" ? "Nee" : "Wellicht"}
    </Badge>
  );
}

function MiniProfile({ reg }: { reg: DashboardRegistration }) {
  return (
    <div className="px-6 pb-5 pt-2 bg-blue-950/40 border-t border-blue-800/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Contact</p>
          {reg.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Phone size={13} className="text-gray-500 flex-shrink-0" />
              <a href={`tel:${reg.phone}`} className="hover:text-yellow-300 transition-colors">{reg.phone}</a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Mail size={13} className="text-gray-500 flex-shrink-0" />
            <a href={`mailto:${reg.email}`} className="hover:text-yellow-300 transition-colors truncate">{reg.email}</a>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Profiel</p>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Building2 size={13} className="text-gray-500 flex-shrink-0" />
            <span>{reg.registrationType === "business" ? "Zakelijk" : reg.registrationType === "private" ? "Particulier" : "Onbekend"}</span>
          </div>
          {reg.kvkNumber && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CreditCard size={13} className="text-gray-500 flex-shrink-0" />
              <span>KvK {reg.kvkNumber}</span>
            </div>
          )}
          {reg.nautical && (
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Anchor size={13} className="text-yellow-400 flex-shrink-0" />
              <span className="text-yellow-300">Nautisch</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">Financiering</p>
          <FinancingBadge value={reg.financing} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-2">
            Gepinde Units ({reg.pinnedUnitCodes.length})
          </p>
          {reg.pinnedUnitCodes.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {reg.pinnedUnitCodes.map((code) => (
                <Badge key={code} variant="info" className="text-xs">{code}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-gray-600 text-sm">Geen units gepind</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface Props {
  registrations: DashboardRegistration[];
  projectName: string;
  projectId: string;
  directusProjectId: number;
}

export default function RegistrationsClient({ registrations: initialRegistrations, projectName, projectId, directusProjectId }: Props) {
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        setIsRefreshing(true);
        const res = await fetch(`/api/registrations?projectId=${directusProjectId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setRegistrations(data.registrations);
          setLastUpdated(new Date());
        }
      } catch {} finally {
        setIsRefreshing(false);
      }
    };
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, [directusProjectId]);

  const total = registrations.length;
  const thisWeek = registrations.filter((r) =>
    isAfter(parseISO(r.registeredAt), subDays(new Date(), 7))
  ).length;
  const withFinancing = registrations.filter((r) => r.financing === "ja").length;

  // Stille leads: geregistreerd maar nog nooit iets gedaan (geen favorieten)
  const stilleLeads = registrations
    .filter((r) => r.pinnedUnitCodes.length === 0)
    .sort((a, b) => parseISO(a.registeredAt).getTime() - parseISO(b.registeredAt).getTime());

  const [stilleOpen, setStilleOpen] = useState(true);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Registraties</h1>
            <p className="text-gray-400">{projectName}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw size={12} className={cn("text-yellow-400", isRefreshing && "animate-spin")} />
            <span>{lastUpdated ? `Bijgewerkt ${format(lastUpdated, "HH:mm:ss", { locale: nl })}` : "Laden..."}</span>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-2 sm:grid-cols-4 mb-8">
          <KPICard title="Totale Registraties" value={total} icon={Users} accentColor="yellow" />
          <KPICard title="Afgelopen 7 Dagen" value={thisWeek} icon={CheckCircle} accentColor="emerald" />
          <KPICard title="Met Financiering" value={withFinancing} icon={CreditCard} accentColor="gold" />
          <KPICard title="Stille Leads" value={stilleLeads.length} icon={BellOff} accentColor="amber" />
        </div>

        {/* Stille leads sectie */}
        {stilleLeads.length > 0 && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(251,146,60,0.25)", background: "rgba(251,146,60,0.04)" }}>
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-orange-500/5 transition-colors"
              onClick={() => setStilleOpen((o) => !o)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(251,146,60,0.15)" }}>
                  <BellOff size={16} style={{ color: "#fb923c" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                    Stille leads
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(251,146,60,0.2)", color: "#fb923c" }}>
                      {stilleLeads.length}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Geregistreerd maar nog niks gedaan — geen favorieten, nooit teruggekomen</p>
                </div>
              </div>
              {stilleOpen ? <ChevronUp size={16} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />}
            </button>

            {stilleOpen && (
              <div className="border-t" style={{ borderColor: "rgba(251,146,60,0.15)" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(251,146,60,0.1)" }}>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Naam</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Geregistreerd</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stil sinds</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Financiering</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stilleLeads.map((reg, i) => {
                      const dagenStil = differenceInDays(new Date(), parseISO(reg.registeredAt));
                      const isOud = dagenStil > 14;
                      return (
                        <tr
                          key={reg.id}
                          className="hover:bg-orange-500/5 transition-colors"
                          style={{ borderBottom: i < stilleLeads.length - 1 ? "1px solid rgba(251,146,60,0.08)" : undefined }}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}
                              >
                                {reg.name.charAt(0)}
                              </span>
                              <Link
                                href={`/dashboard/${projectId}/leads/${reg.id}`}
                                className="text-sm font-semibold text-white hover:text-orange-300 transition-colors"
                              >
                                {reg.name}
                              </Link>
                              {reg.registrationType === "business" && (
                                <span className="text-xs text-gray-600 ml-1">zakelijk</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <a href={`mailto:${reg.email}`} className="text-sm text-gray-400 hover:text-orange-300 transition-colors">
                              {reg.email}
                            </a>
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-sm text-gray-400">
                              {format(parseISO(reg.registeredAt), "d MMM yyyy", { locale: nl })}
                            </p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1.5">
                              <Clock size={11} style={{ color: isOud ? "#fb923c" : "#6b7280" }} />
                              <span
                                className="text-sm font-semibold"
                                style={{ color: isOud ? "#fb923c" : "#9ca3af" }}
                              >
                                {dagenStil === 0 ? "Vandaag" : dagenStil === 1 ? "1 dag" : `${dagenStil} dagen`}
                              </span>
                              {isOud && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(251,146,60,0.12)", color: "#fb923c" }}>
                                  inactief
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <FinancingBadge value={reg.financing} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-3" style={{ borderTop: "1px solid rgba(251,146,60,0.1)" }}>
                  <p className="text-xs text-gray-600">
                    Tip: neem contact op met stille leads voor het verkoopmoment — ze zijn wel geïnteresseerd, maar hebben een zetje nodig.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-blue-800/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Naam</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">E-mail</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Datum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Units</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Financiering</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Profiel</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg, index) => (
                  <Fragment key={reg.id}>
                    <tr
                      onClick={() => toggleExpand(reg.id)}
                      className={cn(
                        "hover:bg-blue-900/30 transition-colors cursor-pointer",
                        index % 2 === 0 ? "bg-blue-950/20" : "",
                        expandedId === reg.id && "bg-blue-900/30 border-b-0"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {reg.nautical && <Anchor size={13} className="text-yellow-400 flex-shrink-0" />}
                          <Link
                            href={`/dashboard/${projectId}/leads/${reg.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-white hover:text-yellow-300 transition-colors underline-offset-2 hover:underline"
                          >
                            {reg.name}
                          </Link>
                        </div>
                        {reg.registrationType === "business" && (
                          <p className="text-xs text-gray-500 mt-0.5">Zakelijk</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">{reg.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">
                          {format(parseISO(reg.registeredAt), "d MMM yyyy", { locale: nl })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(reg.registeredAt), "HH:mm", { locale: nl })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        {reg.pinnedUnitCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {reg.pinnedUnitCodes.slice(0, 4).map((code) => (
                              <Badge key={code} variant="info" className="text-xs">{code}</Badge>
                            ))}
                            {reg.pinnedUnitCodes.length > 4 && (
                              <span className="text-xs text-gray-500">+{reg.pinnedUnitCodes.length - 4}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <FinancingBadge value={reg.financing} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-yellow-400 transition-colors">
                          {expandedId === reg.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === reg.id && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <MiniProfile reg={reg} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      Geen registraties gevonden voor dit project
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-blue-800/50">
            <p className="text-sm text-gray-400">
              {total} registratie{total !== 1 ? "s" : ""} — klik op een rij voor het mini-profiel
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
