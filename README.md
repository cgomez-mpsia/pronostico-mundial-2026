# Pronóstico Mundial 2026

Aplicación web privada para gestionar un torneo de predicciones del Mundial FIFA 2026 (EE.UU., México, Canadá).

## Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **ORM:** Drizzle ORM
- **Data fetching:** TanStack Query
- **Deploy:** Vercel

## Inicio rápido

```bash
cp .env.local.example .env.local
# Completar variables de entorno con credenciales de Supabase

npm install
npm run dev
```

## Documentación

| Documento | Descripción |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Guía para Claude Code (stack, arquitectura, reglas) |
| [AGENTS.md](./AGENTS.md) | Guardrails y reglas para agentes IA |
| [docs/BRD_v0.1.md](./docs/BRD_v0.1.md) | Business Requirements Document |
| [docs/PRD_v0.1.md](./docs/PRD_v0.1.md) | Product Requirements Document |
| [docs/FSD_v0.1.md](./docs/FSD_v0.1.md) | Functional Specification Document |

## Comandos

```bash
npm run dev                  # Servidor de desarrollo
npm run build                # Build de producción
npm run lint                 # Lint
npx tsc --noEmit             # Typecheck
npx drizzle-kit generate     # Generar migración
npx drizzle-kit migrate      # Aplicar migración
```
