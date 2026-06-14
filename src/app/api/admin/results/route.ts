import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyMatchResult } from "@/lib/apply-result";

export async function POST(request: NextRequest) {
  // 1. Verificar admin
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const callerRow = await db.query.users.findFirst({
    where: eq(users.id, caller.id),
    columns: { role: true },
  });

  if (callerRow?.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }

  // 2. Parsear body
  const { matchId, homeScore, awayScore, homeScoreFull, awayScoreFull, extraTime, matchWinnerId } = await request.json();

  if (
    !matchId ||
    typeof homeScore !== "number" ||
    typeof awayScore !== "number" ||
    homeScore < 0 ||
    awayScore < 0
  ) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const validExtraTime = extraTime === null || extraTime === undefined || ["aet", "pen"].includes(extraTime);
  if (!validExtraTime) {
    return NextResponse.json({ error: "Valor de tiempo extra inválido." }, { status: 400 });
  }
  if (extraTime && !matchWinnerId) {
    return NextResponse.json({ error: "Debes indicar el equipo ganador." }, { status: 400 });
  }
  if (!extraTime && matchWinnerId) {
    return NextResponse.json({ error: "matchWinnerId requiere extraTime." }, { status: 400 });
  }
  if (extraTime && (typeof homeScoreFull !== "number" || typeof awayScoreFull !== "number")) {
    return NextResponse.json({ error: "Se requiere el marcador a los 120 min." }, { status: 400 });
  }

  // 3. Verificar que el partido existe
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { id: true, tournamentId: true, status: true, stage: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  if (match.stage === "group" && extraTime) {
    return NextResponse.json({ error: "Los partidos de fase de grupos no pueden tener tiempo extra." }, { status: 400 });
  }

  // 4. Aplicar resultado y recalcular puntos · source='manual' (el organizador lo ingresó)
  const participantCount = await applyMatchResult({
    matchId,
    tournamentId: match.tournamentId,
    homeScore,
    awayScore,
    homeScoreFull: extraTime ? homeScoreFull : null,
    awayScoreFull: extraTime ? awayScoreFull : null,
    extraTime: extraTime ?? null,
    matchWinnerId: matchWinnerId ?? null,
    source: "manual",
  });

  return NextResponse.json({
    success: true,
    participantCount,
  });
}
