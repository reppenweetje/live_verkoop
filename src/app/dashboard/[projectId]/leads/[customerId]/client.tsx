"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Phone, Building2, Anchor, CreditCard, CheckCircle, Clock, Calendar, Heart, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";

interface LeadUnit {
  id: string;
  code: string;
  name: string;
  price: number;
  status: string;
  pinnedAt?: string;
  boughtAt?: string;
  reservedAt?: string;
}

interface MrAnswer {
  id: number;
  question?: { question_text: string };
  answer_text?: string;
}

interface LeadProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  financing: string | null;
  nautical: boolean;
  registrationType: string | null;
  kvkNumber: string | null;
  registeredAt: string;
  pinnedUnits: LeadUnit[];
  boughtUnits: LeadUnit[];
  mrAnswers: MrAnswer[];
}

interface Props {
  profile: LeadProfile;
  projectId: string;
  projectName: string;
}

function FinancingValue({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-500">—</span>;
  const map: Record<string, { label: string; color: string }> = {
    ja:       { label: "Ja",      color: "text-emerald-400" },
    nee:      { label: "Nee",     color: "text-red-400" },
    wellicht: { label: "Wellicht", color: "text-amber-400" },
  };
  const item = map[value] ?? { label: value, color: "text-gray-300" };
  return <span className={item.color}>{item.label}</span>;
}

export default function LeadProfileClient({ profile, projectId, projectName }: Props) {
  const initials = profile.name.split(" ").filter((n) => n.length > 0).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-indigo-900 to-blue-950 px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <Link href={`/dashboard/${projectId}/registrations`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors w-fit">
          <ArrowLeft size={16} />
          Terug naar Registraties
        </Link>

        {/* Header card */}
        <Card className="mb-6">
          <div className="flex items-start gap-6 flex-wrap">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/20 border border-yellow-400/30 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-yellow-300">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
                {profile.nautical && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-xs font-semibold text-yellow-300">
                    <Anchor size={11} /> Nautisch
                  </span>
                )}
                {profile.registrationType === "business" && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-xs font-semibold text-blue-300">
                    <Building2 size={11} /> Zakelijk
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">{projectName}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <Calendar size={12} />
                <span>Geregistreerd op {format(parseISO(profile.registeredAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact gegevens */}
          <Card>
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4">Contact</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-gray-500 flex-shrink-0" />
                <a href={`mailto:${profile.email}`} className="text-sm text-gray-300 hover:text-yellow-300 transition-colors truncate">{profile.email}</a>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={14} className="text-gray-500 flex-shrink-0" />
                  <a href={`tel:${profile.phone}`} className="text-sm text-gray-300 hover:text-yellow-300 transition-colors">{profile.phone}</a>
                </div>
              )}
            </div>
          </Card>

          {/* Profiel details */}
          <Card>
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4">Profiel</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Type</span>
                <span className="text-gray-200">
                  {profile.registrationType === "business" ? "Zakelijk" : profile.registrationType === "private" ? "Particulier" : "—"}
                </span>
              </div>
              {profile.kvkNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-400">KvK</span>
                  <span className="text-gray-200">{profile.kvkNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Nautisch</span>
                <span className={profile.nautical ? "text-yellow-300" : "text-gray-500"}>{profile.nautical ? "Ja" : "Nee"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Financiering</span>
                <FinancingValue value={profile.financing} />
              </div>
            </div>
          </Card>

          {/* Gepinde units */}
          <Card>
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart size={14} /> Gepinde Units ({profile.pinnedUnits.length})
            </h2>
            {profile.pinnedUnits.length > 0 ? (
              <div className="space-y-2">
                {profile.pinnedUnits.map((unit) => (
                  <div key={unit.id} className={cn("flex items-center justify-between p-2 rounded-lg border text-xs",
                    unit.status === "verkocht"     && "bg-emerald-900/20 border-emerald-700/30",
                    unit.status === "gereserveerd" && "bg-amber-900/20 border-amber-700/30",
                    unit.status === "beschikbaar"  && "bg-blue-900/20 border-blue-700/30"
                  )}>
                    <span className="font-semibold text-white">{unit.code}</span>
                    <span className="text-gray-400 truncate max-w-[80px] mx-2">{unit.name}</span>
                    <Badge variant={unit.status === "verkocht" ? "success" : unit.status === "gereserveerd" ? "warning" : "info"} className="text-xs">
                      {unit.status === "verkocht" ? "✓" : unit.status === "gereserveerd" ? "◷" : "○"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Geen units gepind</p>
            )}
          </Card>
        </div>

        {/* Gekochte units */}
        {profile.boughtUnits.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle size={14} /> Gekochte Units ({profile.boughtUnits.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile.boughtUnits.map((unit) => (
                <div key={unit.id} className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-700/30">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-white">{unit.code}</p>
                      <p className="text-xs text-gray-400">{unit.name}</p>
                    </div>
                    <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-300">{formatCurrency(unit.price)}</p>
                  {unit.boughtAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {format(parseISO(unit.boughtAt), "d MMM yyyy HH:mm", { locale: nl })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* MR Antwoorden */}
        {profile.mrAnswers.length > 0 && (
          <Card className="mt-6">
            <h2 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Vragenlijst ({profile.mrAnswers.length} antwoorden)
            </h2>
            <div className="space-y-4">
              {profile.mrAnswers.map((answer) => (
                <div key={answer.id} className="p-4 rounded-lg bg-blue-900/20 border border-blue-800/40">
                  {answer.question?.question_text && (
                    <p className="text-xs font-semibold text-gray-400 mb-2">{answer.question.question_text}</p>
                  )}
                  <p className="text-sm text-gray-200">{answer.answer_text ?? "—"}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
