import { db } from "@/db";
import { participants, matches, predictions, tournaments } from "@/db/schema";
import { eq, or, count, and } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

const sections = [
  {
    href: "/admin/fixture",
    title: "Fixture",
    description: "Cargar partidos, registrar resultados y calcular puntos.",
  },
  {
    href: "/admin/participants",
    title: "Participantes",
    description: "Crear cuentas y confirmar pagos.",
  },
  {
    href: "/admin/prizes",
    title: "Distribución del Pozo",
    description: "Ver cómo se reparte el premio entre los clasificados.",
  },
  {
    href: "/admin/settings",
    title: "Configuración",
    description: "Nombre del torneo, estado y campeón mundial.",
  },
];

export default async function AdminPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft"),
      eq(tournaments.status, "finished")
    ),
    columns: { id: true, inscriptionFee: true },
  });

  let stats = {
    paidCount: 0,
    totalParticipants: 0,
    finishedMatches: 0,
    totalMatches: 0,
    totalPredictions: 0,
    totalPool: 0,
  };

  if (tournament) {
    const [participantStats, matchStats, predStats] = await Promise.all([
      db
        .select({ hasPaid: participants.hasPaid, total: count() })
        .from(participants)
        .where(eq(participants.tournamentId, tournament.id))
        .groupBy(participants.hasPaid),
      db
        .select({ status: matches.status, total: count() })
        .from(matches)
        .where(eq(matches.tournamentId, tournament.id))
        .groupBy(matches.status),
      db
        .select({ total: count() })
        .from(predictions)
        .innerJoin(participants, eq(predictions.participantId, participants.id))
        .where(
          and(
            eq(participants.tournamentId, tournament.id),
            eq(predictions.isManuallyEntered, true)
          )
        ),
    ]);

    const paidRow = participantStats.find((r) => r.hasPaid);
    const unpaidRow = participantStats.find((r) => !r.hasPaid);
    stats.paidCount = Number(paidRow?.total ?? 0);
    stats.totalParticipants = stats.paidCount + Number(unpaidRow?.total ?? 0);

    const finishedRow = matchStats.find((r) => r.status === "finished");
    stats.finishedMatches = Number(finishedRow?.total ?? 0);
    stats.totalMatches = matchStats.reduce((s, r) => s + Number(r.total), 0);

    stats.totalPredictions = Number(predStats[0]?.total ?? 0);
    stats.totalPool = stats.paidCount * Number(tournament.inscriptionFee);
  }

  const statCards = [
    {
      label: "Participantes",
      value: `${stats.paidCount} / ${stats.totalParticipants}`,
      sub: "pagados / total",
    },
    {
      label: "Partidos",
      value: `${stats.finishedMatches} / ${stats.totalMatches}`,
      sub: "jugados / total",
    },
    {
      label: "Pronósticos enviados",
      value: stats.totalPredictions.toString(),
      sub: "ingresados manualmente",
    },
    {
      label: "Pozo total",
      value: `Bs. ${stats.totalPool.toLocaleString("es-BO")}`,
      sub: `${stats.paidCount} × Bs. ${Number(tournament?.inscriptionFee ?? 500).toLocaleString("es-BO")}`,
    },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <h1 className="text-2xl font-semibold">Panel de Administración</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-zinc-400">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
