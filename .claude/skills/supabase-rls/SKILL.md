---
name: supabase-rls
description: >
  Configura políticas de Row Level Security (RLS) en Supabase para una tabla del proyecto,
  basándose en los actores y permisos del FSD §3. Entrada: nombre de tabla. Salida: SQL
  con políticas RLS listas para ejecutar en el SQL Editor de Supabase.
allowed-tools:
  - read
  - write
  - bash
model-tier: sonnet
fsd-version-min: v0.1
status: stable
owner: Alberto Gomez
---

# Skill: Supabase Row Level Security (RLS)

## 1. Cuándo activarlo

- DURANTE: creación de una tabla nueva, revisión de permisos, auditoría de seguridad.
- ARRANCA cuando: el usuario pide configurar RLS, habla de permisos de tabla, o crea una tabla nueva con `drizzle-schema`.
- NO ACTIVAR cuando: el cambio es solo de lógica de negocio sin afectar permisos de datos.

## 2. Entradas obligatorias

El usuario MUST proporcionar:

- Nombre de la tabla a proteger (ej. `predictions`, `matches`).

Si falta, responder: "¿Para qué tabla configuro RLS?"

## 3. Fuentes de verdad (orden de precedencia)

1. `docs/FSD_v0.1.md` §3 — actores y roles (Participante, Admin, Sistema) con sus permisos.
2. `docs/FSD_v0.1.md` §4 — casos de uso que acceden a la tabla (qué actor hace qué operación).
3. `AGENTS.md` §6 y §7 — reglas de dominio y seguridad invariantes.
4. `docs/FSD_v0.1.md` §6 — modelo de datos (relaciones entre tablas).

## 4. Procedimiento

1. Leer el FSD §3 para identificar qué rol puede hacer SELECT / INSERT / UPDATE / DELETE en la tabla.
2. Determinar las condiciones de visibilidad:
   - ¿Un participante puede ver datos de otros participantes? (ej. pronósticos: NO antes del plazo, SÍ después).
   - ¿Solo el admin puede escribir? (ej. `matches`, `match_points`).
3. Generar SQL con el siguiente patrón:

```sql
-- Habilitar RLS
ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;

-- Política para participantes autenticados
CREATE POLICY "<tabla>_select_participant"
ON <tabla> FOR SELECT
TO authenticated
USING (<condición>);

-- Política para admin
CREATE POLICY "<tabla>_all_admin"
ON <tabla> FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

4. Para `predictions`: la visibilidad pre/post plazo depende de `matches.deadline_at`:
   - Pre-plazo: un participante solo ve SUS pronósticos.
   - Post-plazo: todos los participantes ven todos los pronósticos del partido.

## 5. Políticas por tabla (referencia rápida)

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `users` | Propio registro | Admin | Admin | Admin |
| `participants` | Propio registro | Admin | Admin | Admin |
| `teams` | Todos (public) | Admin | Admin | Admin |
| `matches` | Todos (public) | Admin | Admin | Admin |
| `predictions` | Pre-plazo: solo propias. Post-plazo: todas del partido | Participante (antes del plazo) | Participante (antes del plazo) | Nunca |
| `match_points` | Todos (public, post-cálculo) | Sistema (service role) | Sistema | Nunca |

## 6. Verificación ("bien hecho")

- RLS está habilitado (`ENABLE ROW LEVEL SECURITY`) en la tabla.
- Un participante no puede leer pronósticos de otros antes del plazo (probado en Supabase Table Editor).
- El admin puede hacer todas las operaciones.
- El service role (usado por Route Handlers del servidor) no está restringido por RLS (Supabase bypasses RLS for service role by default — verificar que el cliente Drizzle usa `service_role` key, no `anon`).
- No existe ninguna política que permita a un participante modificar `match_points`.

## 7. Anti-patrones

- Deshabilitar RLS temporalmente "para probar" y olvidar rehabilitarlo.
- Usar la `anon` key de Supabase en el servidor — siempre usar `service_role` en Route Handlers.
- Crear una política `FOR ALL TO public` en tablas con datos sensibles.
- Olvidar la política post-plazo en `predictions` (el torneo pierde transparencia).

## 8. Mini ejemplo de invocación

> "Configura RLS para la tabla `predictions`."
> "Revisa que la tabla `match_points` no sea editable por participantes."

## 9. Modos de fallo conocidos

- La condición de plazo en la política RLS de `predictions` requiere JOIN con `matches` → es válido en Supabase; mostrar el SQL con el JOIN explícito.
- El cliente Drizzle en desarrollo usa `anon` key y RLS bloquea las queries → verificar que `DATABASE_URL` usa `service_role`.

## 10. Registro de cambios

| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 0.1.0 | 15-May-2026 | Alberto Gomez | Versión inicial |
