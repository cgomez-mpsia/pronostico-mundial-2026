import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { teams, matches, tournaments } from "@/db/schema";
import { eq, and, or, asc, isNotNull } from "drizzle-orm";
import { fetchGroupStandings } from "@/lib/espn";

type Row = {
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
};

const fmtDg = (n: number) => (n > 0 ? `+${n}` : String(n));

// Fallback: calcula la tabla desde nuestros partidos finalizados (si ESPN falla)
function calculateFromDb(
  groupTeams: { id: string; name: string; flagUrl: string | null }[],
  finished: { homeTeamId: string | null; awayTeamId: string | null; homeScore: number | null; awayScore: number | null }[]
): Row[] {
  const s = new Map<string, Row & { id: string; dgNum: number }>();
  for (const t of groupTeams)
    s.set(t.id, { id: t.id, name: t.name, flagUrl: t.flagUrl, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: "0", dgNum: 0, pts: 0 });

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
  for (const r of s.values()) { r.dgNum = r.gf - r.gc; r.dg = fmtDg(r.dgNum); }
  return Array.from(s.values()).sort((a, b) =>
    b.pts - a.pts || b.dgNum - a.dgNum || b.gf - a.gf || a.name.localeCompare(b.name, "es")
  );
}

const GROUP_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });
  if (!tournament) redirect("/dashboard");

  // Equipos de fase de grupos (para nombre en español + bandera, mapeados por code)
  const groupTeams = await db
    .select({ id: teams.id, name: teams.name, flagUrl: teams.flagUrl, code: teams.code, groupName: teams.groupName })
    .from(teams)
    .where(isNotNull(teams.groupName))
    .orderBy(asc(teams.name));

  const byCode = new Map(groupTeams.map((t) => [t.code, t]));

  // Fuente primaria: tablas oficiales de ESPN
  let groups: { group: string; rows: Row[] }[] = [];
  try {
    const espn = await fetchGroupStandings();
    groups = espn.map((g) => ({
      group: g.group,
      rows: g.entries.map((e) => {
        const t = byCode.get(e.code);
        return {
          name: t?.name ?? e.code,
          flagUrl: t?.flagUrl ?? null,
          pj: e.pj, g: e.w, e: e.d, p: e.l, gf: e.gf, gc: e.ga, dg: e.gd, pts: e.pts,
        };
      }),
    }));
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

    const teamsByGroup = new Map<string, { id: string; name: string; flagUrl: string | null }[]>();
    for (const t of groupTeams) {
      if (!t.groupName) continue;
      const list = teamsByGroup.get(t.groupName) ?? [];
      list.push({ id: t.id, name: t.name, flagUrl: t.flagUrl });
      teamsByGroup.set(t.groupName, list);
    }
    groups = GROUP_NAMES.filter((gn) => teamsByGroup.get(gn)?.length).map((gn) => ({
      group: gn,
      rows: calculateFromDb(teamsByGroup.get(gn)!, finished),
    }));
  }

  // Ordenar por letra de grupo
  groups.sort((a, b) => a.group.localeCompare(b.group));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          ← Fixture
        </Link>
        <h1 className="text-2xl font-semibold">Clasificación de Grupos</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map(({ group, rows }) => (
          <div key={group} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <h2 className="text-sm font-semibold">Grupo {group}</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-400">
                  <th className="px-4 py-1.5 text-left font-medium">Equipo</th>
                  <th className="px-1 py-1.5 text-center font-medium">PJ</th>
                  <th className="px-1 py-1.5 text-center font-medium">G</th>
                  <th className="px-1 py-1.5 text-center font-medium">E</th>
                  <th className="px-1 py-1.5 text-center font-medium">P</th>
                  <th className="px-1 py-1.5 text-center font-medium">GF</th>
                  <th className="px-1 py-1.5 text-center font-medium">GC</th>
                  <th className="px-1 py-1.5 text-center font-medium">DG</th>
                  <th className="px-2 py-1.5 text-center font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((s, idx) => (
                  <tr key={s.name} className={idx < 2 && s.pj > 0 ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 shrink-0 text-right text-zinc-400">{idx + 1}</span>
                        {s.flagUrl && <img src={s.flagUrl} alt="" className="h-3.5 w-5 shrink-0 rounded-sm object-cover" />}
                        <span className="truncate font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.pj}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.g}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.e}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.p}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gf}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gc}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.dg}</td>
                    <td className="px-2 py-2 text-center font-bold tabular-nums">{s.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-zinc-400">Las tablas se mostrarán cuando empiece el torneo.</p>
      )}
    </div>
  );
}
