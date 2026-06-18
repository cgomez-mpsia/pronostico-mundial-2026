import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { teams, matches, tournaments } from "@/db/schema";
import { eq, and, or, isNotNull } from "drizzle-orm";
import { fetchGroupStandings, fetchEspnMatches, espnDateWindow } from "@/lib/espn";

// Feed para la tabla de grupos en tiempo real. Fuente primaria: tablas oficiales
// de ESPN (orden con tiebreakers FIFA). Fallback: cálculo desde nuestros partidos
// finalizados si ESPN no responde. Además marca, por equipo, el marcador del
// partido que esté jugando ahora mismo (badge "1-1" como en el scoreboard).

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
  live: string | null; // "1-1" si el equipo está jugando ahora
};

export type GroupTable = { group: string; rows: GroupRow[]; hasLive: boolean };

const fmtDg = (n: number) => (n > 0 ? `+${n}` : String(n));

const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

// Fallback: calcula la tabla desde nuestros partidos finalizados (si ESPN falla)
function calculateFromDb(
  groupTeams: { code: string; name: string; flagUrl: string | null; id: string }[],
  finished: { homeTeamId: string | null; awayTeamId: string | null; homeScore: number | null; awayScore: number | null }[]
): Omit<GroupRow, "live">[] {
  const s = new Map<
    string,
    { id: string; code: string; name: string; flagUrl: string | null; pj: number; g: number; e: number; p: number; gf: number; gc: number; dgNum: number; pts: number }
  >();
  for (const t of groupTeams)
    s.set(t.id, { id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dgNum: 0, pts: 0 });

  for (const m of finished) {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null) continue;
    const h = s.get(m.homeTeamId);
    const a = s.get(m.awayTeamId);
    if (!h || !a) continue;
    h.pj++; a.pj++;
    h.gf += m.homeScore; h.gc += m.awayScore;
    a.gf += m.awayScore; a.gc += m.homeScore;
    if (m.homeScore > m.awayScore) { h.g++; h.pts += 3; a.p++; }
    else if (m.homeScore < m.awayScore) { a.g++; a.pts += 3; h.p++; }
    else { h.e++; a.e++; h.pts++; a.pts++; }
  }
  for (const r of s.values()) r.dgNum = r.gf - r.gc;
  return Array.from(s.values())
    .sort((a, b) => b.pts - a.pts || b.dgNum - a.dgNum || b.gf - a.gf || a.name.localeCompare(b.name, "es"))
    .map((r) => ({ code: r.code, name: r.name, flagUrl: r.flagUrl, pj: r.pj, g: r.g, e: r.e, p: r.p, gf: r.gf, gc: r.gc, dg: fmtDg(r.dgNum), pts: r.pts }));
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

  // Marcadores en vivo por código de equipo (partido que se juega ahora)
  const liveByCode = new Map<string, string>();
  try {
    const espnMatches = await fetchEspnMatches(espnDateWindow(new Date()));
    for (const m of espnMatches) {
      if (m.status !== "live") continue;
      const score = `${m.homeScore ?? 0}-${m.awayScore ?? 0}`;
      liveByCode.set(m.homeCode, score);
      liveByCode.set(m.awayCode, score);
    }
  } catch {
    // sin marcadores en vivo, las tablas igual se muestran
  }

  // Fuente primaria: tablas oficiales de ESPN
  let groups: GroupTable[] = [];
  try {
    const espn = await fetchGroupStandings();
    groups = espn.map((g) => {
      const rows: GroupRow[] = g.entries.map((e) => {
        const t = byCode.get(e.code);
        return {
          code: e.code,
          name: t?.name ?? e.code,
          flagUrl: t?.flagUrl ?? null,
          pj: e.pj, g: e.w, e: e.d, p: e.l, gf: e.gf, gc: e.ga, dg: e.gd, pts: e.pts,
          live: liveByCode.get(e.code) ?? null,
        };
      });
      return { group: g.group, rows, hasLive: rows.some((r) => r.live !== null) };
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
      const rows: GroupRow[] = calculateFromDb(teamsByGroup.get(gn)!, finished).map((r) => ({
        ...r,
        live: liveByCode.get(r.code) ?? null,
      }));
      return { group: gn, rows, hasLive: rows.some((r) => r.live !== null) };
    });
  }

  groups.sort((a, b) => a.group.localeCompare(b.group));

  return NextResponse.json({ groups, hasLive: groups.some((g) => g.hasLive) } satisfies { groups: GroupTable[]; hasLive: boolean });
}
