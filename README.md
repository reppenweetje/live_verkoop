# REPP Dashboard

Intern verkoopdashboard voor REPP vastgoedprojecten. Gebouwd op Next.js 14 met realtime data uit Directus en Plausible Analytics.

## Functionaliteiten

- **Projectoverzicht** — portfolio totaaloverzicht met omzet, gereserveerde waarde en beschikbaarheid per project
- **Units** — live unitstatus (beschikbaar / gereserveerd / verkocht / coming soon) met plattegrond-heatmap op basis van favorietendata
- **Verkoopvoortgang** — command center voor het verkoopmoment: live bezoekers, verkoopcijfers, activiteitenfeed en tijdlijn
- **Analytics** — Plausible-integratie per project (bezoekers, paginaweergaven, bronnen, apparaten, browsers)
- **Registraties** — leadoverzicht met uitgebreide leadprofielen (voorkeursunits, favorieten, MR-antwoorden)
- **Authenticatie** — JWT-gebaseerde login met beveiligde httpOnly cookies en middleware-bescherming

## Tech stack

| Onderdeel | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) |
| Taal | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| CMS / database | Directus |
| Analytics | Plausible |
| Authenticatie | jose (JWT) |
| Hosting | Vercel |

## Lokaal opstarten

### 1. Vereisten

- Node.js 18+
- Toegang tot de Directus- en Plausible-omgeving

### 2. Repository clonen

```bash
git clone https://github.com/reppenweetje/live_verkoop.git
cd live_verkoop
npm install
```

### 3. Omgevingsvariabelen instellen

Maak een `.env.local` bestand aan in de root van het project:

```env
# Directus
DIRECTUS_URL=https://cms.reppit.stackingbits.dev
DIRECTUS_TOKEN=<jouw-directus-token>

# Plausible
PLAUSIBLE_TOKEN=<jouw-plausible-token>

# Authenticatie
JWT_SECRET=<willekeurige-string-van-minimaal-32-tekens>

# Gebruikersaccounts (naam|email|wachtwoord, kommagescheiden)
AUTH_USERS=Jesse|jesse@repp.nl|<wachtwoord>,Admin|admin@repp.nl|<wachtwoord>
```

> `.env.local` wordt nooit gecommit (staat in `.gitignore`). Bewaar de tokens veilig.

### 4. Dev server starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — je wordt doorgestuurd naar de loginpagina.

## Deployment op Vercel

1. Importeer de repository in [vercel.com](https://vercel.com)
2. Voeg alle bovenstaande omgevingsvariabelen toe via **Settings → Environment Variables**
3. Vercel deployt automatisch bij elke push naar `main`

> Zorg dat `JWT_SECRET` op Vercel hetzelfde is als lokaal, anders worden bestaande sessies ongeldig na een deploy.

## Beveiliging

- Alle `/dashboard` routes zijn beveiligd via Next.js middleware (`src/middleware.ts`)
- Sessies verlopen automatisch na 7 dagen
- Inloggegevens worden nooit opgeslagen in de repository — alleen in omgevingsvariabelen
- Cookies zijn `httpOnly` en `secure` (in productie)
- Interne REPP-medewerkers (`@repp.nl`) en testaccounts (`+test`) worden automatisch gefilterd uit leads en statistieken

## Projecten

| Project | Slug | Verkoopmoment |
|---------|------|---------------|
| De Hofman | `de-hofman` | 8 april 2026, 20:00 |
| Elster 11 | `elster11` | 9 april 2026, 20:00 |
| De Paveri | `depaveri` | 15 april 2026, 20:00 |

## Mapstructuur

```
src/
├── app/
│   ├── api/               # API routes (units, analytics, auth, registrations)
│   ├── dashboard/         # Dashboard pagina's
│   │   └── [projectId]/   # Per-project pagina's (units, analytics, registraties, verkoopvoortgang)
│   └── login/             # Loginpagina
├── components/            # Gedeelde UI-componenten
├── hooks/                 # Custom React hooks (useSaleAudio)
├── lib/                   # Hulpfuncties (directus.ts, plausible.ts, auth.ts, utils.ts)
└── middleware.ts          # Route-beveiliging
```
