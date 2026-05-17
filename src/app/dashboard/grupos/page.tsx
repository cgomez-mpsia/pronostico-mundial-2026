import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { teams, matches, tournaments } from "@/db/schema";
import { eq, and, or, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

type TeamStat = {
  teamId: string;
  name: string;
  flagUrl: string | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
};

function calculateStandings(
  groupTeams: { id: string; name: string; flagUrl: string | null }[],
  finishedMatches: {
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number | null;
    awayScore: number | null;
  }[]
): TeamStat[] {
  const stats = new Map<string, TeamStat>();
  for (const t of groupTeams) {
    stats.set(t.id, { teamId: t.id, name: t.name, flagUrl: t.flagUrl, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 });
  }

  for (const m of finishedMatches) {
    if (!m.homeTeamId || !m.awayTeamId || m.homeScore === null || m.awayScore === null) continue;
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;

    home.pj++; away.pj++;
    home.gf += m.homeScore; home.gc += m.awayScore;
    away.gf += m.awayScore; away.gc += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.g++; home.pts += 3; away.p++;
    } else if (m.homeScore < m.awayScore) {
      away.g++; away.pts += 3; home.p++;
    } else {
      home.e++; home.pts++; away.e++; away.pts++;
    }
  }

  for (const s of stats.values()) s.dg = s.gf - s.gc;

  return Array.from(stats.values()).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name, "es");
  });
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

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  const [allGroupTeams, finishedMatches] = await Promise.all([
    db
      .select({ id: teams.id, name: teams.name, flagUrl: teams.flagUrl, groupName: teams.groupName })
      .from(teams)
      .where(and(
        // groupName not null — solo equipos de fase de grupos
        eq(teams.groupName, teams.groupName)
      ))
      .orderBy(asc(teams.name)),
    db
      .select({
        homeTeamId: matches.homeTeamId,
        awayTeamId: matches.awayTeamId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .where(and(
        eq(matches.tournamentId, tournament.id),
        eq(matches.stage, "group"),
        eq(matches.status, "finished")
      )),
  ]);

  // Agrupar equipos por grupo
  const teamsByGroup = new Map<string, { id: string; name: string; flagUrl: string | null }[]>();
  for (const t of allGroupTeams) {
    if (!t.groupName) continue;
    const list = teamsByGroup.get(t.groupName) ?? [];
    list.push({ id: t.id, name: t.name, flagUrl: t.flagUrl });
    teamsByGroup.set(t.groupName, list);
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          ← Fixture
        </Link>
        <h1 className="text-2xl font-semibold">Clasificación de Grupos</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {GROUP_NAMES.map((groupName) => {
          const groupTeams = teamsByGroup.get(groupName);
          if (!groupTeams?.length) return null;

          const standings = calculateStandings(groupTeams, finishedMatches);

          return (
            <div
              key={groupName}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
                <h2 className="text-sm font-semibold">Grupo {groupName}</h2>
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
                  {standings.map((s, idx) => (
                    <tr
                      key={s.teamId}
                      className={
                        idx < 2 && s.pj > 0
                          ? "bg-emerald-50/50 dark:bg-emerald-900/10"
                          : ""
                      }
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 shrink-0 text-right text-zinc-400">
                            {idx + 1}
                          </span>
                          {s.flagUrl && (
                            <img
                              src={s.flagUrl}
                              alt=""
                              className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
                            />
                          )}
                          <span className="truncate font-medium">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.pj}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.g}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.e}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.p}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gf}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">{s.gc}</td>
                      <td className="px-1 py-2 text-center tabular-nums text-zinc-500">
                        {s.dg > 0 ? `+${s.dg}` : s.dg}
                      </td>
                      <td className="px-2 py-2 text-center font-bold tabular-nums">{s.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {teamsByGroup.size === 0 && (
        <p className="text-sm text-zinc-400">
          Los grupos se mostrarán cuando los equipos estén cargados.
        </p>
      )}
    </div>
  );
}
