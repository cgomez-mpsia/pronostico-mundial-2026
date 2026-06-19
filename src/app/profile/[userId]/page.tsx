import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, tournaments, teams, matches, predictions, matchPoints } from "@/db/schema";
import { eq, and, or, asc, desc, lte, ne, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { UserAvatar } from "@/components/user-avatar";
import { UNPLACED_POINTS_CAP } from "@/lib/points";
import { cappedTotalSql } from "@/lib/standings";
import { ProfileTabs } from "./profile-tabs";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: profileUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  if (!sessionUser) redirect("/login");

  // Usuario del perfil solicitado
  const profileUser = await db.query.users.findFirst({
    where: eq(users.id, profileUserId),
    columns: { fullName: true, avatarUrl: true },
  });

  if (!profileUser) notFound();

  // Torneo activo
  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });

  if (!tournament) notFound();

  // Participante del perfil en el torneo activo
  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.userId, profileUserId),
      eq(participants.tournamentId, tournament.id)
    ),
    columns: { id: true, hasPaid: true, championPoints: true, championTeamId: true, abandonedAt: true },
  });

  if (!participant) notFound();

  // Equipo campeón elegido
  const championTeam = participant.championTeamId
    ? await db.query.teams.findFirst({
        where: eq(teams.id, participant.championTeamId),
        columns: { name: true, flagUrl: true },
      })
    : null;

  // Match points con detalle de partido y pronóstico
  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const breakdown = await db
    .select({
      matchId: matchPoints.matchId,
      resultPoints: matchPoints.resultPoints,
      exactPoints: matchPoints.exactPoints,
      totalPoints: matchPoints.totalPoints,
      scheduledAt: matches.scheduledAt,
      stage: matches.stage,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      matchHomeScore: matches.homeScore,
      matchAwayScore: matches.awayScore,
      predHomeScore: predictions.homeScore,
      predAwayScore: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
    })
    .from(matchPoints)
    .innerJoin(matches, eq(matchPoints.matchId, matches.id))
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .leftJoin(predictions, eq(matchPoints.predictionId, predictions.id))
    .where(eq(matchPoints.participantId, participant.id))
    // Mismo orden determinista que getCappedOutUnplacedKeys (BR-006): así el
    // partido marcado "0 (tope)" aquí coincide con el del detalle/posiciones.
    .orderBy(asc(matches.scheduledAt), asc(matchPoints.matchId));

  // Pronósticos de partidos ya cerrados (deadline pasado) pero aún SIN resultado
  // registrado. No tienen match_points todavía, así que no aparecen en `breakdown`.
  // Los mostramos para que el participante pueda verificar que su pronóstico quedó
  // guardado tras el cierre, aunque aún no haya puntos. No cuentan en las estadísticas.
  const now = new Date();
  const pending = await db
    .select({
      matchId: predictions.matchId,
      scheduledAt: matches.scheduledAt,
      homeTeamName: homeTeam.name,
      awayTeamName: awayTeam.name,
      predHomeScore: predictions.homeScore,
      predAwayScore: predictions.awayScore,
      isManuallyEntered: predictions.isManuallyEntered,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(
      and(
        eq(predictions.participantId, participant.id),
        lte(matches.deadlineAt, now),
        ne(matches.status, "finished")
      )
    )
    .orderBy(asc(matches.scheduledAt));

  // BR-006: tope acumulado de puntos por partidos sin pronóstico colocado.
  // `breakdown` viene ordenado cronológico (asc). Marcamos `cappedOut` en los
  // partidos no colocados cuyo punto ya no cuenta por haberse alcanzado el tope,
  // para que el desglose y el total titular cuadren exactamente.
  const breakdownCapped: Array<
    (typeof breakdown)[number] & { cappedOut: boolean; effectivePoints: number }
  > = [];
  let unplacedCounted = 0;
  for (const r of breakdown) {
    const placed = r.isManuallyEntered === true;
    let cappedOut = false;
    if (!placed && r.totalPoints > 0) {
      if (unplacedCounted + r.totalPoints <= UNPLACED_POINTS_CAP) {
        unplacedCounted += r.totalPoints;
      } else {
        cappedOut = true;
      }
    }
    breakdownCapped.push({ ...r, cappedOut, effectivePoints: cappedOut ? 0 : r.totalPoints });
  }

  // Stats de exactitud: medidas SOLO sobre los partidos que el jugador realmente
  // pronosticó (isManuallyEntered=true). Un 0-0 "de suerte" sin pronóstico no es
  // un acierto real, así que ni cuenta como acierto ni infla el denominador.
  const totalMatches = breakdown.length; // partidos finalizados (gate para mostrar stats)
  const predictedMatches = breakdown.filter((r) => r.isManuallyEntered === true);
  const predictedCount = predictedMatches.length;
  const resultHits = predictedMatches.filter((r) => r.resultPoints > 0).length;
  const exactHits = predictedMatches.filter((r) => r.exactPoints > 0).length;
  const pctResult = predictedCount > 0 ? Math.round((resultHits / predictedCount) * 100) : null;
  const pctExact = predictedCount > 0 ? Math.round((exactHits / predictedCount) * 100) : null;

  // Racha: partidos más recientes consecutivos con puntos que cuentan
  const sortedDesc = [...breakdownCapped].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  let streak = 0;
  for (const r of sortedDesc) {
    if (r.effectivePoints > 0) streak++;
    else break;
  }

  // Puntos totales propios (con tope BR-006 aplicado)
  const myMatchPoints = breakdownCapped.reduce((s, r) => s + r.effectivePoints, 0);
  const myTotalPoints = myMatchPoints + (participant.championPoints ?? 0);

  // Standings para rank y brecha con el líder
  const allTotals = await db
    .select({
      participantId: participants.id,
      totalPoints: cappedTotalSql(),
    })
    .from(participants)
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .where(and(eq(participants.tournamentId, tournament.id), isNull(participants.abandonedAt)))
    .groupBy(participants.id, participants.championPoints)
    .orderBy(desc(cappedTotalSql()));

  const leaderPoints = allTotals[0] ? Number(allTotals[0].totalPoints) : 0;
  const myRankEntry = allTotals.findIndex((r) => r.participantId === participant.id);
  // Calcular rank con lógica de empates
  let rank = 1;
  for (let i = 0; i < myRankEntry; i++) {
    if (Number(allTotals[i].totalPoints) > myTotalPoints) rank = i + 2;
  }

  const isOwnProfile = sessionUser.id === profileUserId;
  const gap = leaderPoints - myTotalPoints;

  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-5">
        <UserAvatar
          fullName={profileUser.fullName}
          avatarUrl={profileUser.avatarUrl}
          size={80}
        />
        <div>
          <h1 className="text-2xl font-semibold">
            {profileUser.fullName}
            {participant.abandonedAt && (
              <span className="ml-2 align-middle rounded-full border border-warning/25 px-2 py-0.5 text-xs font-medium text-warning">
                Abandonó
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500">
            {participant.abandonedAt
              ? `Fuera de competición · ${myTotalPoints} pts`
              : `#${rank} · ${myTotalPoints} pts`}
          </p>
        </div>
      </div>

      {/* Tabs: Resumen + Desglose */}
      <ProfileTabs
        championTeam={championTeam ?? null}
        pctResult={pctResult}
        pctExact={pctExact}
        resultHits={resultHits}
        exactHits={exactHits}
        predictedCount={predictedCount}
        streak={streak}
        totalMatches={totalMatches}
        isOwnProfile={isOwnProfile}
        hasPaid={participant.hasPaid}
        gap={gap}
        isLeader={gap === 0}
        breakdown={breakdownCapped.map((r) => ({
          matchId: r.matchId,
          homeTeamName: r.homeTeamName ?? "Por definir",
          awayTeamName: r.awayTeamName ?? "Por definir",
          matchHomeScore: r.matchHomeScore,
          matchAwayScore: r.matchAwayScore,
          predHomeScore: r.predHomeScore ?? null,
          predAwayScore: r.predAwayScore ?? null,
          isManuallyEntered: r.isManuallyEntered ?? false,
          resultPoints: r.resultPoints,
          exactPoints: r.exactPoints,
          totalPoints: r.totalPoints,
          cappedOut: r.cappedOut,
        }))}
        championPoints={participant.championPoints}
        myTotalPoints={myTotalPoints}
        pending={pending.map((r) => ({
          matchId: r.matchId,
          homeTeamName: r.homeTeamName ?? "Por definir",
          awayTeamName: r.awayTeamName ?? "Por definir",
          predHomeScore: r.predHomeScore ?? null,
          predAwayScore: r.predAwayScore ?? null,
          isManuallyEntered: r.isManuallyEntered ?? false,
        }))}
      />
    </div>
  );
}
