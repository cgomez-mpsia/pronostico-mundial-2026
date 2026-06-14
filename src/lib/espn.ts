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

/** Trae los partidos del Mundial para las fechas dadas (dedupe por id). */
export async function fetchEspnMatches(dates: string[]): Promise<EspnMatch[]> {
  const out: EspnMatch[] = [];
  const seen = new Set<string>();

  for (const dt of dates) {
    const res = await fetch(`${SCOREBOARD}?dates=${dt}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) continue;
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

/** Trae el partido de ESPN que coincide con el par de códigos, en la fecha dada. */
export async function fetchEspnByCodes(
  homeCode: string,
  awayCode: string,
  date: Date
): Promise<EspnMatch | null> {
  const ms = await fetchEspnMatches([espnDate(date)]);
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
  const res = await fetch(STANDINGS, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
  if (!res.ok) return [];
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
