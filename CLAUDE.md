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
- Plazo de cierre: **1 hora antes del inicio del partido** (hora Bolivia, BOT UTC-4).
- Pasado el plazo, los pronósticos se **publican públicamente** y se **bloquean**.
- Antes del partido inaugural se elige el **Campeón Mundial** (visible públicamente desde el inicio).

### Motor de Puntos
| Condición | Puntos |
|---|---|
| Acertar el resultado (V/E/D) | +1 |
| Acertar el score exacto (ingresado manualmente) | +2 adicionales |
| Acertar el clasificado de la llave (desde octavos, BR-057) | +1 |
| Máximo por partido | 3 (grupos/r32) · 4 (desde octavos) |
| Campeón Mundial acertado | +5 (al final del torneo) |

**Caso especial:** pronóstico no ingresado → evaluado como 0-0 internamente (`is_manually_entered = false`). Si el partido termina en empate, el jugador gana 1 punto (acierta el empate), nunca los +2 (ni el +1 del clasificado, que exige pick explícito).

**Regla del clasificado (BR-057, desde octavos — decisión del cliente 03-Jul-2026):** en las etapas `r16`, `qf`, `sf`, `third` y `final` (constante `QUALIFIER_STAGES` en `lib/points.ts`) el pronóstico incluye elegir **qué equipo avanza/gana la llave**. Es **obligatorio**: la API rechaza guardar sin `qualifierTeamId` válido, y si el partido aún no tiene equipos definidos el pronóstico queda **bloqueado** ("cuando se conozcan los rivales"). El +1 es **independiente del marcador** y se mide por el resultado **final** de la llave (90', prórroga o penales): `resolveQualifierTeamId` = `matchWinnerId ?? ganador a 90'`. En la final/tercer puesto se entiende como "quién gana el partido", **aparte** del +5 del campeón. Grupos y `r32` no cambian (máx 3). El pick vive en `predictions.qualifier_team_id`; el punto en `match_points.qualifier_points` (CHECK `total_points <= 4`). Al finalizar un knockout empatado a 90', tanto el form de resultado como el flujo en vivo del admin **exigen** prórroga/penales + ganador (el sync automático nunca cierra esos partidos — los deja pendientes). La tabla en vivo suma el +1 hipotético solo si hay ganador parcial a 90' (en empate el clasificado es desconocido).

**Tope de pronósticos no colocados (BR-006):** un participante solo puede acumular **un máximo de 2 puntos en todo el torneo** por partidos que no pronosticó (sin fila de predicción). Una vez alcanzado el tope, los siguientes partidos no colocados aportan **0**. Los puntos de partidos con pronóstico y los del campeón **no** tienen tope. El tope es acumulado por jugador e independiente del orden, por lo que **no se aplica por partido** sino al agregar el total (cada partido sigue guardando sus puntos crudos en `match_points`):
- Cálculo por partido: `lib/points.ts` → `calculateMatchPoints` (sin cambios, da el punto crudo).
- Tope al total: `lib/points.ts` → `applyUnplacedCap` / `UNPLACED_POINTS_CAP` (JS) y `lib/standings.ts` → `cappedTotalSql` (SQL). Usados por la tabla oficial, el reparto del pozo y el perfil.
- En `match_points`, "no colocado" se identifica por `prediction_id IS NULL`. Invariante garantizado por `applyMatchResult`: enlaza `prediction_id` **solo** para pronósticos manuales (`is_manually_entered=true`), de modo que las agregaciones SQL del tope coinciden con `calculateMatchPoints` (que usa `isManuallyEntered`) aunque existieran pronósticos no manuales.
- La vista **"Hoy"** muestra el incremento del día ya topado: a los no-colocados de hoy les resta lo que el jugador ya gastó del tope en días previos (`min(2, prior+hoy) − min(2, prior)`), de modo que los deltas diarios suman exactamente el total topado.
- **Detalle por-partido** (partido, "Hoy", fixture, perfil): un empate no colocado topado se muestra como `0 (tope)`. `points.ts` → `selectCappedOutUnplacedKeys` (pura) y `standings.ts` → `getCappedOutUnplacedKeys` (consulta) atribuyen el tope a partidos puntuales con orden DETERMINISTA `(scheduledAt, matchId)`, compartido por todas las vistas para que coincidan partidos simultáneos.
- La página pública **`/reglas`** documenta el tope para los participantes.

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
- Horarios de partidos almacenados en UTC; la UI convierte a BOT (`America/La_Paz`). `deadlineAt` = `scheduledAt - 1 hora`.
