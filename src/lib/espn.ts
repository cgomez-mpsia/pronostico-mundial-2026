import { computeMomentum, parseClock, parseMinute, timelineMinute, type MomentumAction, type MomentumPoint } from "@/lib/momentum";

// Cliente del scoreboard de ESPN para el Mundial · fuente de marcadores en vivo.
//
// ESPN expone un JSON público (no documentado) más rápido que el plan free de
// football-data. Sin API key, un simple GET con User-Agent.
//   GET site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
//
// Las abreviaturas de ESPN coinciden 1:1 con nuestros teams.code (48/48), así que
// el matching con nuestros partidos es por el par de códigos de equipo.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";
const SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary";

// Gol / tarjeta / cambio dentro de un partido
export type EspnPlay = {
  minute: string; // "27'"
  type: string; // "Goal", "Yellow Card", "Red Card", ...
  player: string;
  isGoal: boolean;
  isCard: boolean;
};

export type EspnMatch = {
  espnId: string;
  date: string; // ISO
  homeCode: string;
  awayCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  detail: string; // "FT", "AET", "HT", "45'", etc.
  clock: string; // minuto de juego en vivo: "73'", "90'+6'"
  plays: EspnPlay[]; // goles/tarjetas/cambios con minuto y jugador
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team?: { abbreviation?: string };
};

type EspnDetail = {
  clock?: { displayValue?: string };
  type?: { text?: string };
  scoringPlay?: boolean;
  athletesInvolved?: { displayName?: string }[];
};

type EspnEvent = {
  id: string;
  date: string;
  status?: { displayClock?: string; type?: { state?: string; detail?: string } };
  competitions?: { competitors?: EspnCompetitor[]; details?: EspnDetail[] }[];
};

/** "YYYYMMDD" en UTC, para el parámetro ?dates de ESPN. */
export function espnDate(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Ventana de fechas (UTC) alrededor de `now` para cubrir partidos que cruzan medianoche. */
export function espnDateWindow(now: Date): string[] {
  const DAY = 86_400_000;
  return [espnDate(new Date(now.getTime() - DAY)), espnDate(now), espnDate(new Date(now.getTime() + DAY))];
}

function mapStatus(state: string | undefined): EspnMatch["status"] {
  if (state === "in") return "live";
  if (state === "post") return "finished";
  return "scheduled"; // "pre"
}

function toScore(s: string | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** GET a ESPN con timeout (aborta fetches colgados) y User-Agent. null si falla. */
async function espnFetch(url: string, timeoutMs = 4500): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    return null; // timeout o error de red
  } finally {
    clearTimeout(timer);
  }
}

/** Trae los partidos del Mundial para las fechas dadas (dedupe por id).
 *  Las fechas se piden en paralelo para minimizar la latencia. */
export async function fetchEspnMatches(dates: string[]): Promise<EspnMatch[]> {
  const out: EspnMatch[] = [];
  const seen = new Set<string>();

  const responses = await Promise.all(dates.map((dt) => espnFetch(`${SCOREBOARD}?dates=${dt}`)));

  for (const res of responses) {
    if (!res || !res.ok) continue;
    const data = (await res.json()) as { events?: EspnEvent[] };

    for (const e of data.events ?? []) {
      if (seen.has(e.id)) continue;
      const comp = e.competitions?.[0];
      const home = comp?.competitors?.find((c) => c.homeAway === "home");
      const away = comp?.competitors?.find((c) => c.homeAway === "away");
      const homeCode = home?.team?.abbreviation;
      const awayCode = away?.team?.abbreviation;
      if (!homeCode || !awayCode) continue;

      const plays: EspnPlay[] = (comp?.details ?? []).map((x) => {
        const type = x.type?.text ?? "";
        return {
          minute: x.clock?.displayValue ?? "",
          type,
          player: (x.athletesInvolved ?? []).map((a) => a.displayName ?? "").filter(Boolean).join(", "),
          isGoal: !!x.scoringPlay,
          isCard: /card/i.test(type),
        };
      });

      seen.add(e.id);
      out.push({
        espnId: e.id,
        date: e.date,
        homeCode,
        awayCode,
        homeScore: toScore(home?.score),
        awayScore: toScore(away?.score),
        status: mapStatus(e.status?.type?.state),
        detail: e.status?.type?.detail ?? "",
        clock: e.status?.displayClock ?? "",
        plays,
      });
    }
  }

  return out;
}

/** Trae el partido de ESPN que coincide con el par de códigos, en la fecha dada.
 *  Usa una ventana (±1 día) por si el partido cae en otra fecha UTC. */
export async function fetchEspnByCodes(
  homeCode: string,
  awayCode: string,
  date: Date
): Promise<EspnMatch | null> {
  const ms = await fetchEspnMatches(espnDateWindow(date));
  return (
    ms.find(
      (e) =>
        (e.homeCode === homeCode && e.awayCode === awayCode) ||
        (e.homeCode === awayCode && e.awayCode === homeCode)
    ) ?? null
  );
}

// ─── Tablas de grupos oficiales ───────────────────────────────────────────────

export type EspnStanding = {
  code: string;
  rank: number;
  pj: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: string; // "+2"
  pts: number;
};

type EspnStat = { name?: string; value?: number; displayValue?: string };

/** Tablas oficiales de los 12 grupos, con el orden/tiebreakers de ESPN. */
export async function fetchGroupStandings(): Promise<{ group: string; entries: EspnStanding[] }[]> {
  const res = await espnFetch(STANDINGS);
  if (!res || !res.ok) return [];
  const data = (await res.json()) as {
    children?: { name?: string; standings?: { entries?: { team?: { abbreviation?: string }; stats?: EspnStat[] }[] } }[];
  };

  const groups: { group: string; entries: EspnStanding[] }[] = [];
  for (const child of data.children ?? []) {
    const group = (child.name ?? "").replace(/^Group\s+/i, "").trim();
    const entries: EspnStanding[] = (child.standings?.entries ?? [])
      .map((e) => {
        const stat = (n: string) => e.stats?.find((s) => s.name === n);
        const num = (n: string) => Number(stat(n)?.value ?? 0);
        return {
          code: e.team?.abbreviation ?? "",
          rank: num("rank"),
          pj: num("gamesPlayed"),
          w: num("wins"),
          d: num("ties"),
          l: num("losses"),
          gf: num("pointsFor"),
          ga: num("pointsAgainst"),
          gd: stat("pointDifferential")?.displayValue ?? String(num("pointDifferential")),
          pts: num("points"),
        };
      })
      .sort((a, b) => a.rank - b.rank);
    if (entries.length) groups.push({ group, entries });
  }
  return groups;
}

// ─── Resumen en vivo (eventos + stats + momentum) ──────────────────────────────
//
// Usa el endpoint `summary?event={id}`, más rico que el scoreboard:
//   GET site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=ID
// De ahí salen los eventos clave (goles/tarjetas/cambios), las estadísticas
// agregadas (posesión/tiros) y el commentary jugada-a-jugada del que derivamos
// la curva de momentum (ver lib/momentum.ts).

export type LiveEventType = "goal" | "yellow" | "red" | "sub" | "other";

export type LiveEvent = {
  minute: string; // "16'"
  minuteValue: number; // para ordenar / posicionar
  type: LiveEventType;
  side: "home" | "away";
  player: string;
  // Solo en cambios: ESPN lista al que entra primero ("X replaces Y").
  playerIn?: string;
  playerOut?: string;
};

export type LiveStatPair = { home: number; away: number };

export type LiveSummary = {
  homeScore: number | null;
  awayScore: number | null;
  clock: string; // "47'", "HT", "FT"
  status: EspnMatch["status"];
  homeColor: string; // hex sin '#', p. ej. "ed2224"
  awayColor: string;
  events: LiveEvent[];
  momentum: MomentumPoint[];
  maxMinute: number;
  // Posición (en minutos de la línea de tiempo) del medio tiempo = final real del
  // 1T (45 + descuento). null si el 2T aún no empieza. htLabel: etiqueta "45+4'".
  htMark: number | null;
  htLabel: string | null;
  possession: LiveStatPair | null;
  shots: LiveStatPair | null;
  shotsOnTarget: LiveStatPair | null;
};

type SummaryCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: { id?: string; abbreviation?: string; displayName?: string; color?: string };
};
type SummaryKeyEvent = {
  type?: { type?: string; text?: string };
  clock?: { displayValue?: string };
  period?: { number?: number };
  team?: { id?: string };
  participants?: { athlete?: { displayName?: string } }[];
};
type SummaryCommentary = {
  time?: { displayValue?: string };
  play?: {
    type?: { text?: string };
    team?: { displayName?: string };
    clock?: { displayValue?: string };
    period?: { number?: number };
  };
};
type SummaryBoxTeam = {
  team?: { id?: string };
  statistics?: { name?: string; value?: number; displayValue?: string }[];
};
type SummaryResponse = {
  header?: { competitions?: { competitors?: SummaryCompetitor[] }[] };
  keyEvents?: SummaryKeyEvent[];
  commentary?: SummaryCommentary[];
  boxscore?: { teams?: SummaryBoxTeam[] };
};

function keyEventType(type: string | undefined): LiveEventType {
  if (!type) return "other";
  if (/goal/.test(type)) return "goal";
  if (type === "yellow-card") return "yellow";
  if (type === "red-card") return "red";
  if (type === "substitution") return "sub";
  return "other";
}

/** Resumen en vivo de un partido por su id de ESPN (eventos, stats, momentum). */
export async function fetchEspnSummary(espnId: string): Promise<LiveSummary | null> {
  const res = await espnFetch(`${SUMMARY}?event=${espnId}`);
  if (!res || !res.ok) return null;
  const data = (await res.json()) as SummaryResponse;

  const competitors = data.header?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  // Mapas teamId → lado y displayName → lado, para atribuir eventos y commentary.
  const sideById = new Map<string, "home" | "away">();
  const sideByName = new Map<string, "home" | "away">();
  if (home.team.id) sideById.set(home.team.id, "home");
  if (away.team.id) sideById.set(away.team.id, "away");
  if (home.team.displayName) sideByName.set(home.team.displayName, "home");
  if (away.team.displayName) sideByName.set(away.team.displayName, "away");

  // ── Línea de tiempo segmentada por periodos ───────────────────────────────
  // El descuento del 1T ("45'+n") debe ir ANTES del 2T y no chocar con sus
  // minutos. Calculamos el descuento del 1T (s1) y desplazamos el 2T por s1, y
  // ubicamos el medio tiempo en 45 + s1 (final real del primer tiempo).
  const inferPeriod = (declared: number | undefined, base: number) =>
    declared && declared > 0 ? declared : base <= 45 ? 1 : 2;

  let s1 = 0;
  let hasSecondHalf = false;
  const scan = (declared: number | undefined, display: string) => {
    const pc = parseClock(display);
    if (!pc) return;
    const period = inferPeriod(declared, pc.base);
    if (period >= 2) hasSecondHalf = true;
    if (period === 1 && pc.base >= 45 && pc.extra > 0) s1 = Math.max(s1, pc.extra);
  };
  for (const k of data.keyEvents ?? []) scan(k.period?.number, k.clock?.displayValue ?? "");
  for (const c of data.commentary ?? []) scan(c.play?.period?.number, c.play?.clock?.displayValue ?? c.time?.displayValue ?? "");

  let maxMinute = 0;

  // Eventos clave: goles, tarjetas y cambios.
  const events: LiveEvent[] = [];
  for (const k of data.keyEvents ?? []) {
    const type = keyEventType(k.type?.type);
    if (type === "other") continue;
    const side = k.team?.id ? sideById.get(k.team.id) : undefined;
    if (!side) continue;
    const display = k.clock?.displayValue ?? "";
    const pc = parseClock(display);
    const t = pc ? timelineMinute(inferPeriod(k.period?.number, pc.base), pc.base, pc.extra, s1) : 0;
    maxMinute = Math.max(maxMinute, t);
    const names = (k.participants ?? []).map((p) => p.athlete?.displayName ?? "").filter(Boolean);
    events.push({
      minute: display,
      minuteValue: t,
      type,
      side,
      // En un cambio, ESPN ordena [entra, sale]; para el resto, el jugador del evento.
      player: type === "sub" ? (names[0] ?? "") : names.join(" → "),
      ...(type === "sub" ? { playerIn: names[0], playerOut: names[1] } : {}),
    });
  }
  events.sort((a, b) => a.minuteValue - b.minuteValue);

  // Momentum derivado del commentary jugada-a-jugada.
  const actions: MomentumAction[] = [];
  for (const c of data.commentary ?? []) {
    const p = c.play;
    if (!p?.team?.displayName) continue;
    const side = sideByName.get(p.team.displayName);
    if (!side) continue;
    const pc = parseClock(p.clock?.displayValue ?? c.time?.displayValue ?? "");
    if (!pc) continue;
    const t = timelineMinute(inferPeriod(p.period?.number, pc.base), pc.base, pc.extra, s1);
    maxMinute = Math.max(maxMinute, t);
    actions.push({ minute: t, side, type: p.type?.text ?? "" });
  }
  const momentum = computeMomentum(actions, maxMinute);
  const htMark = hasSecondHalf ? 45 + s1 : null;
  const htLabel = hasSecondHalf ? (s1 > 0 ? `45+${s1}'` : "45'") : null;

  // Estadísticas agregadas (posesión / tiros).
  const statBySide = (name: string): LiveStatPair | null => {
    const pair: Partial<LiveStatPair> = {};
    for (const t of data.boxscore?.teams ?? []) {
      const side = t.team?.id ? sideById.get(t.team.id) : undefined;
      if (!side) continue;
      const stat = t.statistics?.find((s) => s.name === name);
      if (stat?.value == null) continue;
      pair[side] = stat.value;
    }
    return pair.home != null && pair.away != null ? (pair as LiveStatPair) : null;
  };

  return {
    homeScore: toScore(home.score),
    awayScore: toScore(away.score),
    clock: "", // lo completa el llamador con el clock del scoreboard si lo necesita
    status: "live",
    homeColor: home.team.color || "3f6212",
    awayColor: away.team.color || "9f1239",
    events,
    momentum,
    maxMinute: Math.max(45, maxMinute),
    htMark,
    htLabel,
    possession: statBySide("possessionPct"),
    shots: statBySide("totalShots"),
    shotsOnTarget: statBySide("shotsOnTarget"),
  };
}
