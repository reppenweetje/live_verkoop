// In-memory heartbeat store — overleeft meerdere requests in één serverproces.
// Op Vercel: werkt binnen één function instance. Voldoende voor een live verkoopdag.

declare global {
  // eslint-disable-next-line no-var
  var __heartbeatStore: Map<number, { name: string; projectSlug: string; lastSeen: number }> | undefined;
}

if (!globalThis.__heartbeatStore) {
  globalThis.__heartbeatStore = new Map();
}

export const heartbeatStore = globalThis.__heartbeatStore;

// Houd de store schoon: verwijder entries ouder dan 10 minuten
export function pruneHeartbeats() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, entry] of heartbeatStore.entries()) {
    if (entry.lastSeen < cutoff) heartbeatStore.delete(id);
  }
}

export function getOnlineLeads(projectSlug: string, windowMs = 2 * 60 * 1000) {
  pruneHeartbeats();
  const cutoff = Date.now() - windowMs;
  const results: Array<{ id: number; name: string; lastSeen: number }> = [];
  for (const [id, entry] of heartbeatStore.entries()) {
    if (entry.lastSeen >= cutoff && (!projectSlug || entry.projectSlug === projectSlug)) {
      results.push({ id, name: entry.name, lastSeen: entry.lastSeen });
    }
  }
  return results.sort((a, b) => b.lastSeen - a.lastSeen);
}
