// Cliente del scoreboard de ESPN para el Mundial · fuente de marcadores en vivo.
//
// ESPN expone un JSON público (no documentado) más rápido que el plan free de
// football-data. Sin API key, un simple GET con User-Agent.
//   GET site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD
//
// Las abreviaturas de ESPN coinciden 1:1 con nuestros teams.code (48/48), así que
// el matching con nuestros partidos es por el par de códigos de equipo.

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

export type EspnMatch = {
  espnId: string;
  date: string; // ISO
  homeCode: string;
  awayCode: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "scheduled" | "live" | "finished";
  detail: string; // "FT", "AET", "HT", "45'", etc.
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  score?: string;
  team?: { abbreviation?: string };
};

type EspnEvent = {
  id: string;
  date: string;
  status?: { type?: { state?: string; detail?: string } };
  competitions?: { competitors?: EspnCompetitor[] }[];
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
      });
    }
  }

  return out;
}
