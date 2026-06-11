import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches, participants, predictions, matchPoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateMatchPoints } from "@/lib/points";

const LIVE_ACTIONS = ["start", "goal_home", "goal_away", "undo_home", "undo_away", "finish"] as const;
type LiveAction = (typeof LIVE_ACTIONS)[number];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const callerRow = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { role: true },
  });
  if (callerRow?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  const body = await request.json();
  const { matchId, action }: { matchId: string; action: LiveAction } = body;

  if (!matchId || !LIVE_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, status: true, homeScore: true, awayScore: true, tournamentId: true },
  });
  if (!match) return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });

  if (action === "start") {
    if (match.status !== "scheduled") {
      return NextResponse.json({ error: "Solo se puede iniciar partidos programados." }, { status: 400 });
    }
    await db
      .update(matches)
      .set({ status: "live", homeScore: 0, awayScore: 0 })
      .where(eq(matches.id, matchId));
    return NextResponse.json({ success: true });
  }

  if (match.status !== "live") {
    return NextResponse.json({ error: "El partido no está en vivo." }, { status: 400 });
  }

  const currentHome = match.homeScore ?? 0;
  const currentAway = match.awayScore ?? 0;

  if (action === "goal_home") {
    const newHome = currentHome + 1;
    await db.update(matches).set({ homeScore: newHome }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: newHome, awayScore: currentAway });
  }

  if (action === "goal_away") {
    const newAway = currentAway + 1;
    await db.update(matches).set({ awayScore: newAway }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: currentHome, awayScore: newAway });
  }

  if (action === "undo_home") {
    const newHome = Math.max(0, currentHome - 1);
    await db.update(matches).set({ homeScore: newHome }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: newHome, awayScore: currentAway });
  }

  if (action === "undo_away") {
    const newAway = Math.max(0, currentAway - 1);
    await db.update(matches).set({ awayScore: newAway }).where(eq(matches.id, matchId));
    return NextResponse.json({ success: true, homeScore: currentHome, awayScore: newAway });
  }

  if (action === "finish") {
    const tournamentParticipants = await db.query.participants.findMany({
      where: eq(participants.tournamentId, match.tournamentId),
      columns: { id: true },
    });

    const matchPredictions = await db
      .select({
        participantId: predictions.participantId,
        homeScore: predictions.homeScore,
        awayScore: predictions.awayScore,
        isManuallyEntered: predictions.isManuallyEntered,
        predictionId: predictions.id,
      })
      .from(predictions)
      .where(eq(predictions.matchId, matchId));

    const predByParticipant = new Map(matchPredictions.map((p) => [p.participantId, p]));
    const result = { homeScore: currentHome, awayScore: currentAway };

    await db.transaction(async (tx) => {
      await tx
        .update(matches)
        .set({ status: "finished" })
        .where(eq(matches.id, matchId));

      for (const participant of tournamentParticipants) {
        const pred = predByParticipant.get(participant.id) ?? null;
        const points = calculateMatchPoints(
          pred
            ? {
                homeScore: pred.homeScore,
                awayScore: pred.awayScore,
                isManuallyEntered: pred.isManuallyEntered,
              }
            : null,
          result
        );
        await tx
          .insert(matchPoints)
          .values({
            matchId,
            participantId: participant.id,
            predictionId: pred?.predictionId ?? null,
            resultPoints: points.resultPoints,
            exactPoints: points.exactPoints,
            totalPoints: points.totalPoints,
          })
          .onConflictDoUpdate({
            target: [matchPoints.participantId, matchPoints.matchId],
            set: {
              predictionId: pred?.predictionId ?? null,
              resultPoints: points.resultPoints,
              exactPoints: points.exactPoints,
              totalPoints: points.totalPoints,
            },
          });
      }
    });

    return NextResponse.json({ success: true, participantCount: tournamentParticipants.length });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
