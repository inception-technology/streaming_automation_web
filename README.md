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
