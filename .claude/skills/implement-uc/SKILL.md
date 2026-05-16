---
name: implement-uc
description: >
  Implementa un caso de uso del FSD (FSD-UC-001 a FSD-UC-006) en Next.js 15 App Router.
  Entrada: ID del caso de uso (ej. FSD-UC-002). Salida: Route Handler + Server/Client Component
  + tipos TypeScript, con trazabilidad explícita a FSD, BR y NFR.
allowed-tools:
  - read
  - edit
  - write
  - bash
model-tier: sonnet
fsd-version-min: v0.1
status: stable
owner: Alberto Gomez
---

# Skill: Implementar Caso de Uso (FSD-UC-NNN)

## 1. Cuándo activarlo

- DURANTE: implementación de funcionalidades nuevas o refactor de existentes.
- ARRANCA cuando: el usuario cita un `FSD-UC-NNN` y pide implementarlo.
- NO ACTIVAR cuando: el usuario está modificando reglas de negocio o documentación.

## 2. Entradas obligatorias

El usuario MUST proporcionar:

- ID del caso de uso: `FSD-UC-001` … `FSD-UC-006`.

Si falta, responder: "¿Qué caso de uso implemento? (FSD-UC-001 a FSD-UC-006)"

## 3. Fuentes de verdad (orden de precedencia)

1. `docs/FSD_v0.1.md` §4 — definición del caso de uso (flujo, precondiciones, Gherkin).
2. `docs/FSD_v0.1.md` §5 — reglas de negocio (BR) que aplican al UC.
3. `docs/FSD_v0.1.md` §6 — modelo de datos (entidades y atributos).
4. `AGENTS.md` §6 — reglas de dominio invariantes.
5. Código existente en `src/` — estilo, nombres, convenciones actuales.

## 4. Procedimiento

1. Leer el UC completo del FSD: flujo principal, flujos alternativos, precondiciones, postcondiciones, criterios Gherkin y BRs aplicables.
2. Resumir en 3–5 líneas qué se va a implementar, sin supuestos extras.
3. Identificar los archivos a crear o modificar:
   - Route Handler: `src/app/api/<recurso>/route.ts`
   - Server Component (si aplica): `src/app/(auth)/<ruta>/page.tsx`
   - Client Component (si aplica): `src/components/<nombre>.tsx`
   - Hook TanStack Query (si aplica): `src/hooks/use-<nombre>.ts`
4. Implementar el cambio mínimo que cumple el flujo principal y los flujos alternativos. Sin feature creep.
5. Validar server-side en el Route Handler: plazo (`deadline_at`), rol, RLS. Nunca solo en el cliente.
6. Añadir comentario de trazabilidad en funciones críticas: `// FSD-UC-002 · BR-004`.

## 5. Salida esperada

Archivos creados/modificados + tabla de trazabilidad:

| FSD ID | Archivo | Qué implementa |
|--------|---------|----------------|
| FSD-UC-002 flujo principal | `src/app/api/predictions/route.ts` | POST guardar pronóstico |
| BR-004 | `src/app/api/predictions/route.ts:42` | Flag `is_manually_entered` |
| BR-005 | `src/app/api/predictions/route.ts:28` | Validación de `deadline_at` |

## 6. Verificación ("bien hecho")

- Toda lógica crítica referencia un ID del FSD en comentario.
- La validación del plazo (`deadline_at` en BOT, UTC-4) ocurre en el servidor.
- El campo `is_manually_entered` se setea correctamente en `predictions`.
- Drizzle no se importa en Client Components.
- TanStack Query no se usa en Server Components ni Route Handlers.
- TypeScript sin errores (`npx tsc --noEmit`). Lint sin warnings nuevos.

## 7. Anti-patrones

- Validar el plazo solo en el cliente (puede manipularse).
- Asumir comportamiento no especificado en el FSD sin preguntar.
- Mezclar lógica de puntos con la capa de presentación — eso vive en `lib/points.ts`.
- Exponer el rol `admin` directamente desde el cliente.

## 8. Mini ejemplo de invocación

> "Implementa FSD-UC-002 (ingresar pronóstico) en `src/app/api/predictions/`."

## 9. Modos de fallo conocidos

- El FSD cita una BR inexistente → STOP, indicar la inconsistencia al usuario.
- El plazo calculado difiere del esperado → revisar `AGENTS.md §6` (siempre `America/La_Paz`).

## 10. Registro de cambios

| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 0.1.0 | 15-May-2026 | Alberto Gomez | Versión inicial |
