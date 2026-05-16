---
name: drizzle-schema
description: >
  Crea o modifica el schema de Drizzle ORM (db/schema.ts) basándose en el modelo de datos
  del FSD §6. Genera la migración correspondiente. Entrada: entidad o cambio a modelar.
  Salida: schema.ts actualizado + migración SQL lista para aplicar.
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

# Skill: Drizzle Schema

## 1. Cuándo activarlo

- DURANTE: creación inicial del schema, adición de tablas, cambio de columnas o relaciones.
- ARRANCA cuando: el usuario pide crear o modificar una tabla de la BD, o citar el FSD §6.
- NO ACTIVAR cuando: el cambio es solo en la UI o en lógica de negocio sin afectar la BD.

## 2. Entradas obligatorias

El usuario MUST proporcionar al menos una de:

- Nombre de la entidad a crear/modificar (ej. `predictions`, `matches`).
- Referencia al FSD §6 (diccionario de datos o diagrama ER).
- Descripción del cambio requerido.

## 3. Fuentes de verdad (orden de precedencia)

1. `docs/FSD_v0.1.md` §6.1 — diagrama ER (Mermaid).
2. `docs/FSD_v0.1.md` §6.2 — diccionario de datos (tipos, obligatoriedad, validaciones).
3. `AGENTS.md` §6 — reglas de dominio invariantes que afectan el schema.
4. `src/db/schema.ts` existente — convenciones de nombres y estilo actuales.

## 4. Procedimiento

1. Leer el diccionario de datos del FSD §6.2 para la entidad afectada.
2. Verificar relaciones en el diagrama ER del FSD §6.1.
3. Revisar el `schema.ts` existente para respetar convenciones (snake_case en BD, camelCase en TypeScript).
4. Escribir la tabla en Drizzle con:
   - Tipos correctos (`uuid`, `text`, `integer`, `boolean`, `timestamp with time zone`).
   - Constraints: `primaryKey`, `notNull`, `references`, `unique` según el diccionario.
   - `timestamps`: `created_at` y `updated_at` en todas las tablas principales.
5. Ejecutar `npx drizzle-kit generate` para generar la migración SQL.
6. Revisar el SQL generado antes de aplicar.

## 5. Salida esperada

- `src/db/schema.ts` actualizado.
- Archivo de migración en `drizzle/` generado por `drizzle-kit`.
- Nota sobre políticas RLS que deben crearse en Supabase para la nueva tabla (entrada para el skill `supabase-rls`).

## 6. Verificación ("bien hecho")

- Los nombres de columnas en BD son `snake_case`; los tipos inferidos de Drizzle son `camelCase`.
- Toda FK tiene `references(() => tabla.id, { onDelete: 'cascade' })` o la política correcta según el FSD.
- `deadline_at` y `scheduled_at` son `timestamp('...', { withTimezone: true })` — nunca `timestamp` sin timezone.
- `npx tsc --noEmit` pasa sin errores tras el cambio.
- `npx drizzle-kit generate` produce una migración limpia (sin drops inesperados).

## 7. Anti-patrones

- Usar `timestamp` sin timezone para fechas con plazos (corrompe el cálculo BOT UTC-4).
- Renombrar columnas del diccionario FSD "para que suenen mejor" — rompe trazabilidad.
- Aplicar la migración (`drizzle-kit migrate`) sin revisar el SQL generado primero.
- Poner lógica de negocio en constraints de BD que debería estar en `lib/points.ts`.

## 8. Mini ejemplo de invocación

> "Crea la tabla `predictions` según el FSD §6."
> "Agrega la columna `is_manually_entered` a `predictions`."

## 9. Modos de fallo conocidos

- El diccionario FSD §6.2 no especifica el tipo de una columna → STOP, preguntar antes de asumir.
- `drizzle-kit generate` produce un DROP inesperado → STOP, mostrar el SQL al usuario antes de continuar.

## 10. Registro de cambios

| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 0.1.0 | 15-May-2026 | Alberto Gomez | Versión inicial |
