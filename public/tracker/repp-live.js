/**
 * REPP Live Tracker — v1.0
 * Plaatsen in kopen.repp.nl zodat het dashboard "Nu online" kan tonen.
 *
 * Werking:
 *   - Leest customerId en naam van de ingelogde lead uit window.__reppUser
 *   - Pingt elke 30s naar het REPP Dashboard /api/heartbeat
 *   - Detecteert ook muis- en toetsenbordactiviteit voor accurate "actief" status
 *
 * Installatie in kopen.repp.nl (Next.js):
 *   1. Zet dit bestand in public/repp-live.js
 *   2. Voeg toe in _app.tsx of layout.tsx:
 *
 *      <Script src="/repp-live.js" strategy="afterInteractive" />
 *
 *   3. Zet de gebruikersdata beschikbaar als window.__reppUser (zie onderaan)
 *
 * In het project (bijv. in _app.tsx na inloggen):
 *   window.__reppUser = {
 *     customerId: customer.id,          // number — Directus customer ID
 *     name: `${customer.first_name} ${customer.last_name}`,
 *     projectSlug: "de-hofman",         // bijv. slug van het project
 *   };
 */

(function () {
  "use strict";

  var DASHBOARD_URL = "https://repp-dashboard.vercel.app/api/heartbeat";
  // Gebruik localhost:3000 voor lokale ontwikkeling:
  // var DASHBOARD_URL = "http://localhost:3000/api/heartbeat";

  var INTERVAL_MS = 30_000; // elke 30 seconden pingen
  var lastActivity = Date.now();
  var intervalId = null;

  function getUser() {
    return window.__reppUser || null;
  }

  function ping() {
    var user = getUser();
    if (!user || !user.customerId) return;

    // Niet pingen als lead al meer dan 2 minuten inactief is
    if (Date.now() - lastActivity > 2 * 60 * 1000) return;

    fetch(DASHBOARD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: user.customerId,
        name: user.name || "Onbekend",
        projectSlug: user.projectSlug || "",
      }),
      // keepalive zodat het ook werkt als de pagina wordt gesloten
      keepalive: true,
    }).catch(function () {
      // stil mislukken — dashboard niet bereikbaar is geen probleem
    });
  }

  function onActivity() {
    lastActivity = Date.now();
  }

  function start() {
    // Track muis- en toetsenbordactiviteit
    document.addEventListener("mousemove", onActivity, { passive: true });
    document.addEventListener("keydown", onActivity, { passive: true });
    document.addEventListener("click", onActivity, { passive: true });
    document.addEventListener("scroll", onActivity, { passive: true });
    document.addEventListener("touchstart", onActivity, { passive: true });

    // Direct pingen bij start
    ping();

    // Daarna elke 30 seconden
    intervalId = setInterval(ping, INTERVAL_MS);
  }

  // Start zodra DOM beschikbaar is
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
