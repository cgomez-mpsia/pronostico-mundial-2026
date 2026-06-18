import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { teams, matches, tournaments } from "@/db/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";
import { fetchGroupStandings, fetchEspnMatches, espnDateWindow } from "@/lib/espn";

// Feed para la tabla de grupos en tiempo real. Fuente primaria: tablas oficiales
// de ESPN (orden con tiebreakers FIFA). Fallback: cálculo desde nuestros partidos
// finalizados si ESPN no responde.
//
// Importante: las tablas oficiales de ESPN solo cuentan partidos FINALIZADOS. Por
// eso, sobre esa base proyectamos los partidos EN VIVO: sumamos el marcador actual
// a las estadísticas de ambos equipos (PJ, GF/GC, G/E/P, Pts) y reordenamos el
// grupo. Cuando el partido termina, ESPN ya lo incluye y la proyección coincide.

export type GroupRow = {
  code: string;
  name: string;
  flagUrl: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: string;
  pts: number;
  // Marcador del partido en curso, desde la perspectiva de este equipo ("2-0"),
  // con el resultado parcial para colorear el badge. null si no juega ahora.
  live: { score: string; outcome: "win" | "loss" | "draw" } | null;
};

export type GroupTable = { group: string; rows: GroupRow[]; hasLive: boolean };

// Fila interna mutable, con diferencia de gol numérica para ordenar.
type Raw = Omit<GroupRow, "dg" | "live"> & { dgNum: number };

type LiveMatch = { homeCode: string; awayCode: string; homeScore: number; awayScore: number };

type LiveBadge = { score: string; outcome: "win" | "loss" | "draw" };

const outcome = (gf: number, against: number): LiveBadge["outcome"] =>
  gf > against ? "win" : gf < against ? "loss" : "draw";

const fmtDg = (n: number) => (n > 0 ? `+${n}` : String(n));

const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// Suma un partido (vs `against` goles) a una fila. Usado para vivo y para el fallback.
function addGame(r: Raw, gf: number, against: number) {
  r.pj++;
  r.gf += gf;
  r.gc += against;
  if (gf > against) { r.g++; r.pts += 3; }
  else if (gf < against) { r.p++; }
  else { r.e++; r.pts++; }
  r.dgNum = r.gf - r.gc;
}

// Fallback: calcula la tabla desde nuestros partidos finalizados (si ESPN falla)
function calculateFromDb(
  groupTeams: { code: string; name: string; flagUrl: string | null; id: string }[],
  finished: { homeTeamId: string | null; awayTeamId: string | null; homeScore: number | null; awayScore: number | null }[]
): Raw[] {
  const byId = new Map<string, Raw>();
  for (const t of groupTeams)
    byId.set(t.id, { code: t.code, name: t.name, flagUrl: t.flagUrl, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dgNum: 0, pts: 0 });

  for (const m of finished) {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null) continue;
    const h = byId.get(m.homeTeamId);
    const a = byId.get(m.awayTeamId);
    if (!h || !a) continue;
    addGame(h, m.homeScore, m.awayScore);
    addGame(a, m.awayScore, m.homeScore);
  }
  return Array.from(byId.values());
}

// Aplica los partidos en vivo a las filas de un grupo (suma el marcador actual a
// las estadísticas). Devuelve true si el grupo tiene algún partido en vivo.
function overlayLive(rows: Raw[], live: LiveMatch[]): boolean {
  const byCode = new Map(rows.map((r) => [r.code, r]));
  let any = false;
  for (const m of live) {
    const h = byCode.get(m.homeCode);
    const a = byCode.get(m.awayCode);
    if (!h || !a) continue; // partido de otro grupo
    addGame(h, m.homeScore, m.awayScore);
    addGame(a, m.awayScore, m.homeScore);
    any = true;
  }
  return any;
}

function toRows(raw: Raw[], hasLive: boolean, badge: Map<string, LiveBadge>): GroupRow[] {
  const rows = raw.map((r) => ({
    code: r.code,
    name: r.name,
    flagUrl: r.flagUrl,
    pj: r.pj, g: r.g, e: r.e, p: r.p, gf: r.gf, gc: r.gc,
    dg: fmtDg(r.dgNum),
    pts: r.pts,
    live: badge.get(r.code) ?? null,
    _dgNum: r.dgNum,
  }));
  // Si el grupo tiene partido en vivo, reordenamos por puntos proyectados; si no,
  // preservamos el orden oficial de ESPN (que respeta los tiebreakers FIFA).
  if (hasLive) {
    rows.sort((a, b) => b.pts - a.pts || b._dgNum - a._dgNum || b.gf - a.gf || a.name.localeCompare(b.name, "es"));
  }
  return rows.map(({ _dgNum, ...r }) => r); // eslint-disable-line @typescript-eslint/no-unused-vars
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });
  if (!tournament) return NextResponse.json({ groups: [], hasLive: false } satisfies { groups: GroupTable[]; hasLive: boolean });

  // Equipos de fase de grupos (nombre en español + bandera), mapeados por code
  const groupTeams = await db
    .select({ id: teams.id, name: teams.name, flagUrl: teams.flagUrl, code: teams.code, groupName: teams.groupName })
    .from(teams)
    .where(isNotNull(teams.groupName));
  const byCode = new Map(groupTeams.map((t) => [t.code, t]));

  // Partidos en vivo (para proyectar puntos) + badge de marcador por equipo,
  // desde la perspectiva de cada equipo (Canadá "2-0" verde, Catar "0-2" rojo).
  const live: LiveMatch[] = [];
  const badge = new Map<string, LiveBadge>();
  try {
    const espnMatches = await fetchEspnMatches(espnDateWindow(new Date()));
    for (const m of espnMatches) {
      if (m.status !== "live") continue;
      const hs = m.homeScore ?? 0;
      const as = m.awayScore ?? 0;
      live.push({ homeCode: m.homeCode, awayCode: m.awayCode, homeScore: hs, awayScore: as });
      badge.set(m.homeCode, { score: `${hs}-${as}`, outcome: outcome(hs, as) });
      badge.set(m.awayCode, { score: `${as}-${hs}`, outcome: outcome(as, hs) });
    }
  } catch {
    // sin datos en vivo, las tablas oficiales igual se muestran
  }

  // Fuente primaria: tablas oficiales de ESPN
  let groups: GroupTable[] = [];
  try {
    const espn = await fetchGroupStandings();
    groups = espn.map((g) => {
      const raw: Raw[] = g.entries.map((e) => {
        const t = byCode.get(e.code);
        return {
          code: e.code,
          name: t?.name ?? e.code,
          flagUrl: t?.flagUrl ?? null,
          pj: e.pj, g: e.w, e: e.d, p: e.l, gf: e.gf, gc: e.ga, dgNum: e.gf - e.ga, pts: e.pts,
        };
      });
      const hasLive = overlayLive(raw, live);
      return { group: g.group, rows: toRows(raw, hasLive, badge), hasLive };
    });
  } catch {
    groups = [];
  }

  // Fallback: calcular desde nuestra DB si ESPN no respondió
  if (groups.length === 0) {
    const finished = await db
      .select({
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(and(eq(matches.tournamentId, tournament.id), eq(matches.stage, "group"), eq(matches.status, "finished")));

    const teamsByGroup = new Map<string, { id: string; code: string; name: string; flagUrl: string | null }[]>();
    for (const t of groupTeams) {
      if (!t.groupName) continue;
      const list = teamsByGroup.get(t.groupName) ?? [];
      list.push({ id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl });
      teamsByGroup.set(t.groupName, list);
    }
    groups = GROUP_NAMES.filter((gn) => teamsByGroup.get(gn)?.length).map((gn) => {
      const raw = calculateFromDb(teamsByGroup.get(gn)!, finished);
      const hasLive = overlayLive(raw, live);
      // El fallback no tiene orden oficial: ordenar siempre.
      return { group: gn, rows: toRows(raw, true, badge), hasLive };
    });
  }

  groups.sort((a, b) => a.group.localeCompare(b.group));

  return NextResponse.json({ groups, hasLive: groups.some((g) => g.hasLive) } satisfies { groups: GroupTable[]; hasLive: boolean });
}
