// Cliente de football-data.org (plan free) para el Mundial 2026 · sync automático
//
// Plan free: 10 req/min, "scores delayed" (no es tiempo real), incluye la FIFA
// World Cup (code 'WC', id 2000). Una sola llamada trae los 104 partidos.
//
// Doc: https://docs.football-data.org/general/v4/match.html

const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC"; // FIFA World Cup

// ─── Tipos crudos de la API (solo los campos que usamos) ──────────────────────

type ApiTeam = {
  id: number | null;
  name: string | null;
  tla: string | null;
  crest: string | null;
};

type ApiScoreLine = { home: number | null; away: number | null };

export type ApiMatch = {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  stage: string;
  group: string | null;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: ApiScoreLine;
    halfTime: ApiScoreLine;
    regularTime?: ApiScoreLine; // resultado a los 90' cuando hubo prórroga/penales (v4)
    extraTime?: ApiScoreLine;
    penalties?: ApiScoreLine;
  };
};

// ─── Mapeos API → dominio ─────────────────────────────────────────────────────

// stage de la API → stage de nuestro schema (CHECK constraint)
export const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "r32",
  LAST_16: "r16",
  QUARTER_FINALS: "qf",
  SEMI_FINALS: "sf",
  THIRD_PLACE: "third",
  FINAL: "final",
};

// tla de la API → code nuestro (setup.ts). Solo difiere Uruguay (URY vs URU).
export const API_TLA_TO_CODE: Record<string, string> = {
  URY: "URU",
};

/** Normaliza el tla de la API al code que usamos en la tabla teams. */
export function apiTlaToCode(tla: string): string {
  return API_TLA_TO_CODE[tla] ?? tla;
}

/** Convierte el status de la API a nuestro enum (scheduled | live | finished). */
export function mapStatus(status: ApiMatch["status"]): "scheduled" | "live" | "finished" {
  if (status === "FINISHED" || status === "AWARDED") return "finished";
  if (status === "IN_PLAY" || status === "PAUSED") return "live";
  return "scheduled"; // SCHEDULED, TIMED, SUSPENDED, POSTPONED, CANCELLED
}

export type MappedResult = {
  // marcador a los 90' reglamentarios — el que puntúa · BR-005
  homeScore: number;
  awayScore: number;
  // marcador a los 120' (solo si hubo prórroga/penales) · BR-029
  homeScoreFull: number | null;
  awayScoreFull: number | null;
  extraTime: "aet" | "pen" | null;
  // 'home' | 'away' — qué lado ganó (para resolver matchWinnerId) · null si empate/90'
  winnerSide: "home" | "away" | null;
};

/**
 * Traduce el `score` de un partido FINISHED al modelo del torneo.
 *
 * Regla del dominio (Opción A): solo cuentan los 90 minutos reglamentarios.
 *   · duration REGULAR        → fullTime ES el marcador a 90'
 *   · EXTRA_TIME / PENALTIES  → regularTime es el marcador a 90'; fullTime es a 120'
 *
 * Devuelve null si el partido no trae marcador utilizable.
 */
export function mapResult(m: ApiMatch): MappedResult | null {
  const { score } = m;
  const ninety = score.duration === "REGULAR" ? score.fullTime : score.regularTime ?? score.fullTime;

  if (ninety?.home == null || ninety?.away == null) return null;

  const decidedInRegular = score.duration === "REGULAR";
  const extraTime: "aet" | "pen" | null = decidedInRegular
    ? null
    : score.duration === "PENALTY_SHOOTOUT"
      ? "pen"
      : "aet";

  // El ganador solo importa cuando hubo prórroga/penales (90' empatado) · BR-023
  let winnerSide: "home" | "away" | null = null;
  if (extraTime) {
    if (score.winner === "HOME_TEAM") winnerSide = "home";
    else if (score.winner === "AWAY_TEAM") winnerSide = "away";
  }

  return {
    homeScore: ninety.home,
    awayScore: ninety.away,
    homeScoreFull: extraTime ? score.fullTime.home : null,
    awayScoreFull: extraTime ? score.fullTime.away : null,
    extraTime,
    winnerSide,
  };
}

// ─── Llamada a la API ─────────────────────────────────────────────────────────

/**
 * Trae partidos del Mundial. Sin filtros devuelve los 104.
 * Pasá dateFrom/dateTo (yyyy-MM-dd) para acotar la ventana en el cron.
 */
export async function fetchWorldCupMatches(opts?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ApiMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("Falta FOOTBALL_DATA_API_KEY en el entorno.");

  const url = new URL(`${API_BASE}/competitions/${COMPETITION}/matches`);
  if (opts?.dateFrom) url.searchParams.set("dateFrom", opts.dateFrom);
  if (opts?.dateTo) url.searchParams.set("dateTo", opts.dateTo);

  const res = await fetch(url, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org respondió ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { matches?: ApiMatch[] };
  return data.matches ?? [];
}
