---
name: points-engine
description: >
  Implementa o actualiza el motor de cálculo de puntos (src/lib/points.ts) y la distribución
  del pozo (src/lib/prizes.ts) según las reglas BR-002 a BR-008 del FSD §5. Incluye tests
  unitarios exhaustivos para cada caso borde. Es el skill más crítico del proyecto.
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

# Skill: Motor de Puntos y Distribución del Pozo

## 1. Cuándo activarlo

- DURANTE: implementación inicial de `lib/points.ts` o `lib/prizes.ts`, corrección de bugs en el cálculo, adición de casos borde, escritura de tests unitarios.
- ARRANCA cuando: el usuario menciona puntos, premios, pozo, campeón, o cita BR-002..BR-008.
- NO ACTIVAR cuando: el cambio es solo de UI o de schema de BD sin afectar lógica de cálculo.

## 2. Entradas obligatorias

El usuario MUST proporcionar al menos una de:

- Qué parte del motor modificar: `points` (cálculo por partido) o `prizes` (distribución del pozo).
- BR específica a implementar o corregir (ej. `BR-005`).
- Descripción del caso borde a cubrir.

## 3. Fuentes de verdad (orden de precedencia)

1. `docs/FSD_v0.1.md` §5 — reglas de negocio BR-002 a BR-008 (texto completo).
2. `AGENTS.md` §6 — reglas de dominio invariantes (especialmente `is_manually_entered` y los 90 min).
3. `docs/FSD_v0.1.md` §4 FSD-UC-004 — flujo de registro de resultado y disparo del cálculo.
4. Código existente en `src/lib/points.ts` y `src/lib/prizes.ts`.

## 4. Procedimiento

### Para `lib/points.ts` (cálculo por partido):

1. Leer BR-002 (sistema de puntos), BR-003 (motor), BR-004 (0-0 por defecto), BR-005 (solo 90 min).
2. Implementar la función `calculateMatchPoints(prediction, result)`:
   - Si `prediction.isManuallyEntered === false` y `result === '0-0'`: retornar `{ result: 1, exact: 0, total: 1 }`.
   - Si `prediction.isManuallyEntered === false` y `result !== '0-0'`: evaluar solo el resultado (V/E/D) para el +1.
   - Si `prediction.isManuallyEntered === true`: evaluar resultado (+1) y marcador exacto (+2).
3. Cubrir con tests **todos** los casos borde (ver §5).

### Para `lib/prizes.ts` (distribución del pozo):

1. Leer BR-007 (umbral 8 participantes) y BR-008 (empates).
2. Implementar `calculatePrizes(standings, totalPool)`:
   - ≤ 8 participantes: 100% al 1ro.
   - > 8 participantes: 75% al 1ro, 25% al 2do.
   - Empate en 1ro: fusionar 100% y dividir entre empatados; el siguiente no recibe nada.
   - Empate en 2do: dividir el 25% en partes iguales entre empatados.
3. Cubrir con tests todos los casos de empate.

## 5. Casos borde obligatorios en tests

### `points.ts`
| Caso | `isManuallyEntered` | Pronóstico | Resultado real | Puntos esperados |
|------|---------------------|------------|----------------|------------------|
| Score exacto ingresado | `true` | 2-1 | 2-1 | 3 (1+2) |
| Resultado correcto, score incorrecto | `true` | 2-0 | 2-1 | 1 |
| Resultado incorrecto | `true` | 2-1 | 1-2 | 0 |
| No ingresado, partido termina 0-0 | `false` | (0-0 default) | 0-0 | 1 (no +2) |
| No ingresado, partido no termina 0-0 | `false` | (0-0 default) | 1-0 | 0 |
| No ingresado, partido empata ≠ 0-0 | `false` | (0-0 default) | 1-1 | 0 |

### `prizes.ts`
| Caso | Participantes | Situación | Distribución esperada |
|------|--------------|-----------|----------------------|
| Ganador único ≤8 | 5 | Sin empate | 100% al 1ro |
| Ganador único >8 | 10 | Sin empate | 75% 1ro, 25% 2do |
| Empate en 1ro >8 | 10 | 2 empatados en 1ro | 50% cada uno, 3ro sin premio |
| Empate en 2do >8 | 10 | 1 en 1ro, 2 en 2do | 75% al 1ro, 12.5% a cada 2do |
| Todos empatados | 3 | 3 empatados en 1ro | 33.3% cada uno |

## 6. Verificación ("bien hecho")

- `lib/points.ts` y `lib/prizes.ts` son funciones puras (sin side effects, sin I/O).
- Todos los casos de la tabla §5 tienen un test que pasa.
- Cada función tiene comentario de trazabilidad: `// BR-005 · FSD §5`.
- `npx tsc --noEmit` pasa sin errores.
- `npm test` pasa con 100% de cobertura en estos dos archivos.

## 7. Anti-patrones

- Leer de la BD dentro de `lib/points.ts` o `lib/prizes.ts` — son funciones puras.
- Asumir que "no ingresado" = 0 puntos siempre — el caso 0-0 da 1 punto (BR-005).
- Redondear el pozo con `Math.round` sin especificar la precisión — usar `Math.floor` para evitar pagar de más.
- Olvidar el caso "todos empatados en 1ro" cuando hay ≤8 participantes.

## 8. Mini ejemplo de invocación

> "Implementa `lib/points.ts` con todos los casos borde del FSD BR-002 a BR-005."
> "Agrega tests para el caso de empate en 2do lugar en `lib/prizes.ts`."

## 9. Modos de fallo conocidos

- BR-005 y BR-004 parecen contradictorias → No lo son: BR-004 define el default interno (0-0), BR-005 define la penalización del `is_manually_entered = false`. Leer ambas juntas.
- El usuario pide integrar el cálculo directo con Supabase → STOP, separar: el cálculo es puro en `lib/`, la persistencia es en el Route Handler.

## 10. Registro de cambios

| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 0.1.0 | 15-May-2026 | Alberto Gomez | Versión inicial |
