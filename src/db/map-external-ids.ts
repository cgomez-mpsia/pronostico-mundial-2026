/**
 * Mapeo one-time de IDs de football-data.org a nuestras tablas.
 * Escribe teams.externalId y matches.externalId. Idempotente: se puede re-correr.
 *
 *   npm run db:map-ids            # mapea y escribe
 *   npm run db:map-ids -- --dry   # solo reporta, no escribe
 *
 * Estrategia:
 *   · Equipos: por code (tla de la API → code nuestro; solo Uruguay difiere).
 *   · Partidos de grupos: por el par de equipos (externalIds) + stage.
 *   · Partidos de eliminación: por (stage + horario). Los horarios son únicos
 *     dentro de cada fase; si alguno no calza exacto, se emparejan por orden
 *     cronológico dentro de la fase. El reporte permite verificar a ojo.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { matches, teams } from "./schema";
import { fetchWorldCupMatches, STAGE_MAP, apiTlaToCode, type ApiMatch } from "../lib/football-data";

const DRY = process.argv.includes("--dry");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  });
  const db = drizzle(pool, { schema: { matches, teams } });

  console.log(DRY ? "🔍 Modo dry-run (no escribe)\n" : "✍️  Escribiendo externalId\n");

  const apiMatches = await fetchWorldCupMatches();
  console.log(`API: ${apiMatches.length} partidos\n`);

  // ── 1. Equipos ──────────────────────────────────────────────────────────────
  const ourTeams = await db.select({ id: teams.id, code: teams.code, name: teams.name }).from(teams);

  // tla normalizado (code) → id de la API
  const apiTeamByCode = new Map<string, { id: number; name: string }>();
  for (const m of apiMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t.id && t.tla) apiTeamByCode.set(apiTlaToCode(t.tla), { id: t.id, name: t.name ?? "" });
    }
  }

  const teamExtId = new Map<string, number>(); // ourTeamId → apiId
  let teamsOk = 0;
  const teamsMissing: string[] = [];
  for (const t of ourTeams) {
    const api = apiTeamByCode.get(t.code);
    if (!api) {
      teamsMissing.push(`${t.code} (${t.name})`);
      continue;
    }
    teamExtId.set(t.id, api.id);
    teamsOk++;
    if (!DRY) await db.update(teams).set({ externalId: api.id }).where(eq(teams.id, t.id));
  }
  console.log(`Equipos mapeados: ${teamsOk}/${ourTeams.length}`);
  if (teamsMissing.length) console.log(`  ⚠ sin mapear: ${teamsMissing.join(", ")}`);

  // ── 2. Partidos de fase de grupos (por par de equipos) ───────────────────────
  const ourMatches = await db
    .select({
      id: matches.id,
      stage: matches.stage,
      scheduledAt: matches.scheduledAt,
      homeTeamId: matches.homeTeamId,
      awayTeamId: matches.awayTeamId,
    })
    .from(matches);

  const pairKey = (a: number, b: number) => [a, b].sort((x, y) => x - y).join("-");

  // API: par de externalIds → apiMatch (solo grupos, con ambos equipos)
  const apiGroupByPair = new Map<string, ApiMatch>();
  for (const m of apiMatches) {
    if (STAGE_MAP[m.stage] === "group" && m.homeTeam.id && m.awayTeam.id) {
      apiGroupByPair.set(pairKey(m.homeTeam.id, m.awayTeam.id), m);
    }
  }

  const mapping: { ourId: string; apiId: number }[] = [];
  let groupOk = 0;
  const groupMissing: string[] = [];
  for (const m of ourMatches) {
    if (m.stage !== "group") continue;
    const h = m.homeTeamId && teamExtId.get(m.homeTeamId);
    const a = m.awayTeamId && teamExtId.get(m.awayTeamId);
    if (!h || !a) {
      groupMissing.push(m.id);
      continue;
    }
    const api = apiGroupByPair.get(pairKey(h, a));
    if (!api) {
      groupMissing.push(`${m.id} (par ${h}-${a})`);
      continue;
    }
    mapping.push({ ourId: m.id, apiId: api.id });
    groupOk++;
  }
  console.log(`\nPartidos de grupos mapeados: ${groupOk}`);
  if (groupMissing.length) console.log(`  ⚠ sin mapear: ${groupMissing.length}`);

  // ── 3. Partidos de eliminación (por stage + horario) ─────────────────────────
  const STAGES_KO = ["r32", "r16", "qf", "sf", "third", "final"];
  let koOk = 0;
  const koReport: string[] = [];
  for (const stage of STAGES_KO) {
    const ours = ourMatches
      .filter((m) => m.stage === stage)
      .sort((x, y) => x.scheduledAt.getTime() - y.scheduledAt.getTime());
    const api = apiMatches
      .filter((m) => STAGE_MAP[m.stage] === stage)
      .sort((x, y) => new Date(x.utcDate).getTime() - new Date(y.utcDate).getTime());

    if (ours.length !== api.length) {
      koReport.push(`  ⚠ ${stage}: ${ours.length} nuestros vs ${api.length} API — revisar manualmente`);
    }
    // Emparejar por orden cronológico dentro de la fase (horarios únicos por fase)
    for (let i = 0; i < Math.min(ours.length, api.length); i++) {
      mapping.push({ ourId: ours[i].id, apiId: api[i].id });
      koOk++;
      const same = ours[i].scheduledAt.getTime() === new Date(api[i].utcDate).getTime();
      koReport.push(
        `  ${stage} #${i + 1}: ${ours[i].scheduledAt.toISOString()} → api ${api[i].id} ${same ? "✓" : "≈ (" + api[i].utcDate + ")"}`
      );
    }
  }
  console.log(`\nPartidos de eliminación mapeados: ${koOk}`);
  koReport.forEach((l) => console.log(l));

  // ── 4. Escribir matches.externalId ───────────────────────────────────────────
  if (!DRY) {
    for (const { ourId, apiId } of mapping) {
      await db.update(matches).set({ externalId: apiId }).where(eq(matches.id, ourId));
    }
    console.log(`\n✅ Escritos ${mapping.length} matches.externalId`);
  } else {
    console.log(`\n(dry-run) se habrían escrito ${mapping.length} matches.externalId`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
