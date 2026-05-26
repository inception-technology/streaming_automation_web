# streaming-automation-web

Monorepo TypeScript du projet streaming_automation : dashboard Next.js (Phase 1), future Render Studio desktop app (Phase 1+), packages partagés (UI, Remotion templates, API client).

## Stack

- pnpm workspaces + Turborepo
- Next.js 14 (App Router) + TypeScript + Tailwind
- Clerk (`@clerk/nextjs`)
- TanStack Query, Zustand
- Remotion Player (preview navigateur)

## Pré-requis

- Node.js >= 20 (voir `.nvmrc`)
- pnpm 9+ : `npm install -g pnpm@9` ou `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- Doppler CLI configuré (`doppler setup` dans `apps/dashboard/`)

## Installation

```powershell
pnpm install
```

## Variables d'environnement

Toutes injectées par Doppler en local (`doppler run -- pnpm dev`), par
l'intégration Doppler ↔ Vercel en preview/prod. Référence complète :
[apps/dashboard/.env.example](apps/dashboard/.env.example).

Préfixe `NEXT_PUBLIC_*` = exposé au bundle navigateur ; tout le reste reste
côté serveur (Node runtime / Edge).

| Variable                                              | Requise | Défaut       | Rôle                                                                     |
|-------------------------------------------------------|---------|--------------|--------------------------------------------------------------------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                   | **oui** | —            | Clé publique Clerk (`pk_test_…` / `pk_live_…`) — **même valeur** que `CLERK_PUBLISHABLE_KEY` côté `api/` |
| `CLERK_SECRET_KEY`                                    | **oui** | —            | Clé secrète Clerk — server-side uniquement (`sk_test_…` / `sk_live_…`) — **même valeur** que `CLERK_SECRET_KEY` côté `api/` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                       | non     | `/sign-in`   | Route de la page sign-in (lue par `<ClerkProvider>`)                     |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                       | non     | `/sign-up`   | Route de la page sign-up                                                 |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`     | non     | `/dashboard` | Redirection post sign-in si pas de `redirect_url`                        |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`     | non     | `/dashboard` | Redirection post sign-up si pas de `redirect_url`                        |
| `NEXT_PUBLIC_API_URL`                                 | **oui** | —            | URL HTTP(S) de l'API FastAPI (ex. `http://localhost:8000` en dev, `https://api-staging.keekku.com` en preview). L'URL WebSocket est dérivée automatiquement (`http→ws`, `https→wss`) — pas de variable séparée. |
| `NEXT_PUBLIC_SENTRY_DSN`                              | non     | —            | DSN Sentry exposé au navigateur ; vide = désactivé. *Non branché côté code actuellement — réservé pour Phase 1+.* |

## Lancer en dev

```powershell
cd apps\dashboard
doppler run -- pnpm dev
```

Dashboard : http://localhost:3000

## Build

```powershell
pnpm build              # via Turborepo, build de tous les apps
pnpm --filter dashboard build
```

## Structure

```
web/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── apps/
│   └── dashboard/                  # Next.js (Phase 0)
└── packages/                       # Phase 1+
    ├── ui/                         # composants Tailwind partagés
    ├── api-client/                 # client TS généré depuis l'OpenAPI FastAPI
    └── remotion-templates/         # compositions Remotion versionnées
```
