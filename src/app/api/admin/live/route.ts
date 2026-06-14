import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches, matchPoints } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyMatchResult } from "@/lib/apply-result";

const LIVE_ACTIONS = ["start", "goal_home", "goal_away", "undo_home", "undo_away", "finish", "reopen"] as const;
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
    // source='manual': el organizador controla este partido → el sync no lo toca
    await db
      .update(matches)
      .set({ status: "live", homeScore: 0, awayScore: 0, resultSource: "manual" })
      .where(eq(matches.id, matchId));
    return NextResponse.json({ success: true });
  }

  if (action === "reopen") {
    if (match.status !== "finished") {
      return NextResponse.json({ error: "Solo se puede reabrir partidos finalizados." }, { status: 400 });
    }
    // source='manual': al reabrir, el organizador toma el control → el sync no lo pisa
    await db.transaction(async (tx) => {
      await tx.delete(matchPoints).where(eq(matchPoints.matchId, matchId));
      await tx.update(matches).set({ status: "live", resultSource: "manual" }).where(eq(matches.id, matchId));
    });
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
    // El partido en vivo se decide a los 90 min (sin prórroga en este flujo manual).
    const participantCount = await applyMatchResult({
      matchId,
      tournamentId: match.tournamentId,
      homeScore: currentHome,
      awayScore: currentAway,
      source: "manual",
    });

    return NextResponse.json({ success: true, participantCount });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
