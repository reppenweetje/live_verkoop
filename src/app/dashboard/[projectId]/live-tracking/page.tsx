"use client";

import { Card } from "@/components/ui/card";
import { Radio, Lock } from "lucide-react";

export default function LiveTrackingPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Live Tracking
          </h1>
          <p className="text-zinc-400">
            Real-time monitoring van bezoekersactiviteit
          </p>
        </div>

        {/* Locked Feature Card */}
        <Card className="max-w-2xl">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 p-4 rounded-full bg-indigo-900/20 border border-indigo-800">
              <Lock size={48} className="text-indigo-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Premium Add-on
            </h2>

            <p className="text-zinc-400 mb-8 max-w-sm">
              Live Tracking is een premium add-on die je in real-time ziet
              waar je bezoekers zich bevinden en welke units ze bekijken.
            </p>

            <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-semibold rounded-lg transition-all transform hover:scale-105">
              Interesse? Neem contact op
            </button>

            {/* Features */}
            <div className="mt-12 grid grid-cols-2 gap-6 w-full text-left">
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <Radio size={20} className="text-indigo-400 mb-2" />
                <h3 className="text-sm font-semibold text-white">
                  Real-time Data
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Live updates van alle bezoekers
                </p>
              </div>
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700">
                <Radio size={20} className="text-indigo-400 mb-2" />
                <h3 className="text-sm font-semibold text-white">
                  Heatmaps
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Zie waar bezoekers klikken
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
