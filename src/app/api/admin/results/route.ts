import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { applyMatchResult, espnDecidedInRegulation } from "@/lib/apply-result";

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
    columns: { id: true, tournamentId: true, status: true, stage: true, homeTeamId: true, awayTeamId: true, scheduledAt: true },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado." }, { status: 404 });
  }

  if (matchWinnerId && matchWinnerId !== match.homeTeamId && matchWinnerId !== match.awayTeamId) {
    return NextResponse.json({ error: "El ganador debe ser uno de los dos equipos del partido." }, { status: 400 });
  }

  if (match.stage === "group" && extraTime) {
    return NextResponse.json({ error: "Los partidos de fase de grupos no pueden tener tiempo extra." }, { status: 400 });
  }

  // BR-057: en eliminatorias, un empate a 90' debe traer cómo se resolvió la
  // llave — sin ganador no se puede puntuar el clasificado.
  if (match.stage !== "group" && homeScore === awayScore && !extraTime) {
    return NextResponse.json(
      { error: "Empate a los 90' en eliminatoria: indica prórroga o penales y el equipo que avanza." },
      { status: 400 }
    );
  }

  // BR-003 (red de seguridad): cerrar una eliminatoria como resultado liso de 90'
  // (sin prórroga) solo si ESPN no contradice. Si ESPN reporta prórroga/penales, el
  // marcador ingresado podría ser el de 120' (que no cuenta) → se rechaza. Best-effort:
  // si ESPN no tiene el dato (null), no bloquea.
  if (match.stage !== "group" && !extraTime) {
    const decided = await espnDecidedInRegulation(match.homeTeamId, match.awayTeamId, match.scheduledAt);
    if (decided === false) {
      return NextResponse.json(
        {
          error:
            "ESPN reporta que este partido fue a prórroga/penales. Ingresá el marcador de los " +
            "90' (que suele ser empate) y marcá la prórroga/penales con el equipo que avanza.",
          inExtraTime: true,
        },
        { status: 409 }
      );
    }
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
