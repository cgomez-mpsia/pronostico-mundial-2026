---
name: review-spec
description: >
  Verifica que el código implementado cumple con el FSD: trazabilidad de casos de uso,
  reglas de negocio y NFRs. Entrada: archivo o PR a revisar. Salida: reporte de cobertura
  con gaps y recomendaciones concretas.
allowed-tools:
  - read
  - bash
model-tier: sonnet
fsd-version-min: v0.1
status: stable
owner: Alberto Gomez
---

# Skill: Review Spec (Verificación de Trazabilidad FSD ↔ Código)

## 1. Cuándo activarlo

- DURANTE: revisión de PR, auditoría de implementación, antes de marcar un UC como "Implementado" en `AGENTS.md §11`.
- ARRANCA cuando: el usuario pide verificar si el código cumple el FSD, o antes de hacer merge de un PR.
- NO ACTIVAR cuando: el usuario está escribiendo código nuevo — este skill es de revisión, no de implementación.

## 2. Entradas obligatorias

El usuario MUST proporcionar al menos una de:

- Ruta del archivo a revisar (ej. `src/app/api/predictions/route.ts`).
- ID del caso de uso implementado (ej. `FSD-UC-002`).
- Descripción del cambio a auditar.

## 3. Fuentes de verdad (orden de precedencia)

1. `docs/FSD_v0.1.md` §4 — criterios de aceptación Gherkin del UC.
2. `docs/FSD_v0.1.md` §5 — reglas de negocio (BR) aplicables.
3. `docs/FSD_v0.1.md` §10 — NFRs con métricas y umbrales.
4. `AGENTS.md` §6 — reglas de dominio invariantes.
5. Código del archivo o PR proporcionado.

## 4. Procedimiento

1. Leer el UC completo del FSD (flujo principal, alternativos, Gherkin, BRs).
2. Leer el código proporcionado.
3. Para cada criterio Gherkin del UC, verificar si hay implementación correspondiente.
4. Para cada BR aplicable al UC, verificar si hay validación en el servidor.
5. Revisar NFRs relevantes (validación de plazo, zona horaria, bloqueo post-deadline).
6. Generar el reporte (ver §5).

## 5. Salida esperada

Reporte con tres secciones:

### ✅ Cubierto
| FSD ID | Criterio | Archivo:línea |
|--------|----------|---------------|
| FSD-UC-002 AC1 | Pronóstico guardado antes del plazo | `api/predictions/route.ts:45` |
| BR-005 | Validación deadline_at en servidor | `api/predictions/route.ts:28` |

### ⚠️ Parcialmente cubierto
| FSD ID | Criterio | Gap identificado |
|--------|----------|-----------------|
| BR-004 | Flag `is_manually_entered` | Se setea en `true` siempre; falta el caso de carga manual del admin |

### ❌ No cubierto
| FSD ID | Criterio | Acción recomendada |
|--------|----------|-------------------|
| FSD-UC-002 AC3 | Flujo alternativo: partido ya iniciado | Agregar validación de `match.status !== 'finished'` |

## 6. Verificación ("bien hecho")

- Todos los criterios Gherkin del UC tienen una fila en la tabla (✅, ⚠️ o ❌).
- Todas las BRs del UC están revisadas.
- Los gaps ❌ tienen una acción recomendada concreta (no genérica).
- El reporte es objetivo — no inventar problemas ni ignorar gaps reales.

## 7. Anti-patrones

- Aprobar código que no valida el plazo server-side (es el error más crítico del proyecto).
- Ignorar el flag `is_manually_entered` — es el corazón de BR-004/BR-005.
- Reportar como ✅ un criterio que solo está cubierto en el cliente (debe ser server-side).
- Revisar solo el happy path y omitir flujos alternativos del FSD.

## 8. Mini ejemplo de invocación

> "Revisa si `src/app/api/predictions/route.ts` cumple FSD-UC-002."
> "Audita el motor de puntos contra BR-002 a BR-005."

## 9. Modos de fallo conocidos

- El código no tiene comentarios de trazabilidad (`// FSD-UC-NNN`) → hacer la revisión igual, inferir desde el nombre de funciones y variables.
- El UC en el FSD tiene criterios Gherkin ambiguos → marcar como ⚠️ y escalar al usuario.

## 10. Registro de cambios

| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 0.1.0 | 15-May-2026 | Alberto Gomez | Versión inicial |
