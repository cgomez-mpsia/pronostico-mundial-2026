// Regla de bloqueo del campeón (BR-010): la elección del Campeón Mundial puede
// modificarse hasta que COMIENCEN LAS SEMIFINALES — decisión del cliente (votación
// unánime 12-Jul-2026; antes se bloqueaba al inicio de cuartos de final).
//
// Un único lugar para la regla: lo usan la page del dashboard (para deshabilitar
// el picker) y el route handler POST /api/champion (para rechazar el cambio).
import { db } from "@/db";
import { matches } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

// Etapa cuyo inicio congela la elección del campeón.
const CHAMPION_LOCK_STAGE = "sf" as const;

/**
 * ¿Está bloqueada la elección del campeón? Se bloquea cuando el deadline (= inicio)
 * del primer partido de semifinales ya pasó. Si aún no hay semifinales cargadas
 * con horario, no está bloqueada.
 */
export async function isChampionLocked(tournamentId: string): Promise<boolean> {
  const firstSF = await db.query.matches.findFirst({
    where: and(eq(matches.tournamentId, tournamentId), eq(matches.stage, CHAMPION_LOCK_STAGE)),
    orderBy: asc(matches.scheduledAt),
    columns: { deadlineAt: true },
  });
  return firstSF?.deadlineAt ? firstSF.deadlineAt <= new Date() : false;
}
