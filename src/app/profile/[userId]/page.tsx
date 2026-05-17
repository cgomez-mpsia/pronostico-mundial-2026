import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, tournaments, teams, matches, predictions, matchPoints } from "@/db/schema";
import { eq, and, or, asc, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { UserAvatar } from "@/components/user-avatar";
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
    columns: { id: true, hasPaid: true, championPoints: true, championTeamId: true },
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
    .orderBy(asc(matches.scheduledAt));

  // Stats calculadas en servidor
  const totalMatches = breakdown.length;
  const resultHits = breakdown.filter((r) => r.resultPoints > 0).length;
  const exactHits = breakdown.filter((r) => r.exactPoints > 0).length;
  const pctResult = totalMatches > 0 ? Math.round((resultHits / totalMatches) * 100) : null;
  const pctExact = totalMatches > 0 ? Math.round((exactHits / totalMatches) * 100) : null;

  // Racha: partidos más recientes consecutivos con puntos
  const sortedDesc = [...breakdown].sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  );
  let streak = 0;
  for (const r of sortedDesc) {
    if (r.totalPoints > 0) streak++;
    else break;
  }

  // Puntos totales propios
  const myMatchPoints = breakdown.reduce((s, r) => s + r.totalPoints, 0);
  const myTotalPoints = myMatchPoints + (participant.championPoints ?? 0);

  // Standings para rank y brecha con el líder
  const allTotals = await db
    .select({
      participantId: participants.id,
      totalPoints: sql<number>`COALESCE(SUM(${matchPoints.totalPoints}), 0) + ${participants.championPoints}`,
    })
    .from(participants)
    .leftJoin(matchPoints, eq(matchPoints.participantId, participants.id))
    .where(eq(participants.tournamentId, tournament.id))
    .groupBy(participants.id, participants.championPoints)
    .orderBy(desc(sql`COALESCE(SUM(${matchPoints.totalPoints}), 0) + ${participants.championPoints}`));

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
          <h1 className="text-2xl font-semibold">{profileUser.fullName}</h1>
          <p className="text-sm text-zinc-500">
            #{rank} · {myTotalPoints} pts
          </p>
        </div>
      </div>

      {/* Tabs: Resumen + Desglose */}
      <ProfileTabs
        championTeam={championTeam ?? null}
        pctResult={pctResult}
        pctExact={pctExact}
        streak={streak}
        totalMatches={totalMatches}
        isOwnProfile={isOwnProfile}
        hasPaid={participant.hasPaid}
        gap={gap}
        isLeader={gap === 0}
        breakdown={breakdown.map((r) => ({
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
        }))}
        championPoints={participant.championPoints}
        myTotalPoints={myTotalPoints}
      />
    </div>
  );
}
