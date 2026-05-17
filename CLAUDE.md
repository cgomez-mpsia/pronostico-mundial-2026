# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Proyecto

**Pronóstico Mundial 2026** — Aplicación web privada para un torneo de predicciones del Mundial FIFA 2026 (EE.UU., México, Canadá). Los participantes pronostican el marcador exacto de cada partido y acumulan puntos. Al final del torneo, el pozo se reparte entre los mejores clasificados.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos / Auth / Realtime | Supabase (PostgreSQL + Supabase Auth + Supabase Realtime) |
| ORM | Drizzle ORM |
| Data fetching / caché | TanStack Query (React Query) |
| Deploy | Vercel |

---

## Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Lint
npm run lint

# Typecheck
npx tsc --noEmit

# Drizzle: generar migraciones
npx drizzle-kit generate

# Drizzle: aplicar migraciones
npx drizzle-kit migrate

# Reset completo de la DB (DESTRUCTIVO): borra todo, crea admin + lo inscribe como participante (hasPaid=true), torneo, 48 equipos y 104 partidos
SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run db:setup

# Solo insertar partidos (requiere torneo y equipos ya cargados)
npm run db:seed-matches
```

---

## Arquitectura General

```
src/
  app/                  # Next.js App Router (páginas y layouts)
    (auth)/             # Rutas protegidas por autenticación
    admin/              # Panel del organizador
    api/                # Route handlers (lógica server-side)
  components/           # Componentes React (shadcn/ui + custom)
  db/                   # Drizzle ORM: schema y cliente
    schema.ts           # Definición de tablas
    index.ts            # Cliente Drizzle conectado a Supabase
    setup.ts            # Reset completo + seed (DESTRUCTIVO)
    seed-matches.ts     # 104 partidos del Mundial 2026 (exporta seedMatches())
  lib/                  # Utilidades y lógica de negocio
    points.ts           # Motor de cálculo de puntos (función pura)
    prizes.ts           # Lógica de distribución del pozo (función pura)
  hooks/                # React hooks (TanStack Query)
```

**Flujo de datos:**
- El cliente usa **TanStack Query** para fetching y caché.
- Las mutations críticas (guardar pronóstico, calcular puntos) pasan por **Route Handlers**.
- La **tabla de posiciones** usa **Supabase Realtime** para actualizaciones en vivo.
- El ORM (**Drizzle**) se usa únicamente en el servidor (Route Handlers y Server Components).

**Autenticación:**
- Manejada por **Supabase Auth**.
- El organizador (admin) crea todas las cuentas manualmente desde el panel de administración.
- No hay registro público — los participantes reciben usuario y contraseña directamente.

---

## Reglas de Negocio (Dominio)

### Inscripción
- Cuota fija: **Bs. 500** por participante. Sin límite de participantes.
- El organizador también puede participar y ganar.
- Una vez inscrito, no se puede retirar (pierde la cuota si abandona).

### Pronósticos
- Cada participante pronostica el **marcador exacto** de cada partido.
- Solo cuentan los **90 minutos reglamentarios incluyendo tiempo de descuento** (ej. 90+3, 90+6) — prórroga y penales no cuentan. El marcador oficial es el del **pitido final** (decisión del cliente Opción A, 17-May-2026).
- Plazo de cierre: **15:00 del día anterior** (hora Bolivia, BOT UTC-4).
- Pasadas las 15:00, los pronósticos se **publican públicamente** y se **bloquean**.
- Antes del partido inaugural se elige el **Campeón Mundial** (visible públicamente desde el inicio).

### Motor de Puntos
| Condición | Puntos |
|---|---|
| Acertar el resultado (V/E/D) | +1 |
| Acertar el score exacto (ingresado manualmente) | +2 adicionales |
| Máximo por partido | 3 |
| Campeón Mundial acertado | +5 (al final del torneo) |

**Caso especial:** pronóstico no ingresado → evaluado como 0-0 internamente (`is_manually_entered = false`). Si el partido termina 0-0, el jugador gana solo 1 punto (empate), nunca los +2.

### Distribución del Pozo
- **≤ 8 participantes:** 100% al 1er lugar.
- **> 8 participantes:** 75% al 1ro, 25% al 2do.
- Empate en 1ro: fusionan 100% y dividen en partes iguales.
- Empate en 2do: el 25% se divide en partes iguales.

---

## Notas Importantes

- **Idioma del proyecto:** español en UI y comentarios de dominio; inglés en código (variables, funciones, tipos).
- Las fechas límite se calculan en **hora boliviana (BOT, UTC-4)** — usar siempre `America/La_Paz`.
- `lib/points.ts` y `lib/prizes.ts` son **funciones puras** — sin I/O, sin efectos secundarios.
- **RLS habilitado** en todas las tablas de Supabase. El cliente Drizzle del servidor usa `service_role`.
- Las etapas válidas de un partido son: `group`, `r32`, `r16`, `qf`, `sf`, `third`, `final` — hay CHECK constraint en DB.
- Horarios de partidos almacenados en UTC; la UI convierte a BOT (`America/La_Paz`). `deadlineAt` = día anterior al partido (en BOT) a las 19:00 UTC (= 15:00 BOT).
