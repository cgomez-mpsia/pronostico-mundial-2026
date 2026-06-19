import { db } from "@/db";
import { participants, users, tournaments, matchPoints } from "@/db/schema";
import { eq, or, and, desc, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { calculatePrizes } from "@/lib/prizes";
import { cappedTotalSql } from "@/lib/standings";
import { Badge } from "@/components/ui/badge";

export default async function AdminPrizesPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "draft"),
      eq(tournaments.status, "active"),
      eq(tournaments.status, "finished")
    ),
    columns: { id: true, name: true, inscriptionFee: true },
  });

  if (!tournament) notFound();

  const standings = await db
    .select({
      participantId: participants.id,
      fullName: users.fullName,
      hasPaid: participants.hasPaid,
      totalPoints: cappedTotalSql(),
    })
    .from(participants)
    .innerJoin(users, eq(participants.userId, users.id))
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .where(and(eq(participants.tournamentId, tournament.id), isNull(participants.abandonedAt)))
    .groupBy(participants.id, users.fullName, participants.hasPaid, participants.championPoints)
    .orderBy(desc(cappedTotalSql()));

  const paidCount = standings.filter((r) => r.hasPaid).length;
  const totalPool = paidCount * Number(tournament.inscriptionFee);

  const prizeInput = standings.map((r) => ({
    participantId: r.participantId,
    totalPoints: Number(r.totalPoints),
  }));

  const prizes = calculatePrizes(prizeInput, totalPool);
  const prizeByParticipant = new Map(prizes.map((p) => [p.participantId, p]));

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Distribución del Pozo</h1>
        <p className="text-sm text-zinc-500">{tournament.name}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Pozo total</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          Bs. {totalPool.toLocaleString("es-BO")}
        </p>
        <p className="mt-0.5 text-xs text-zinc-400">
          {paidCount} participante(s) × Bs. {Number(tournament.inscriptionFee).toLocaleString("es-BO")}
          {standings.length > 8
            ? " · Distribución: 75% 1ro / 25% 2do"
            : " · Distribución: 100% al 1ro"}
        </p>
      </div>

      {standings.length === 0 ? (
        <p className="text-sm text-zinc-400">No hay participantes aún.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="pb-2 pr-3 font-medium w-8">#</th>
                <th className="pb-2 pr-3 font-medium">Participante</th>
                <th className="pb-2 pr-3 font-medium text-right">Puntos</th>
                <th className="pb-2 font-medium text-right">Premio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {standings.map((r) => {
                const p = prizeByParticipant.get(r.participantId);
                return (
                  <tr key={r.participantId}>
                    <td className="py-2 pr-3 text-zinc-400 tabular-nums">
                      {p?.rank ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium">{r.fullName}</span>
                      {!r.hasPaid && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {Number(r.totalPoints)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {p?.prize ? (
                        <span className="font-semibold text-success">
                          Bs. {p.prize.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t">
                <td colSpan={3} className="pt-3 text-sm font-medium text-zinc-500">
                  Total repartido
                </td>
                <td className="pt-3 text-right text-sm font-semibold tabular-nums">
                  Bs.{" "}
                  {prizes
                    .reduce((s, p) => s + p.prize, 0)
                    .toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
