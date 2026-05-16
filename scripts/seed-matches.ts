/**
 * Seed de partidos de prueba (grupo A, primeros 3 partidos)
 * Ejecutar: npx tsx scripts/seed-matches.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { eq, or } from "drizzle-orm";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema });

// deadline_at = día anterior al partido a las 19:00 UTC (= 15:00 BOT)
function deadline(matchDate: Date): Date {
  const d = new Date(matchDate);
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(19, 0, 0, 0);
  return d;
}

async function main() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(schema.tournaments.status, "active"),
      eq(schema.tournaments.status, "draft")
    ),
    columns: { id: true },
  });

  if (!tournament) {
    console.error("No hay torneo activo. Ejecuta seed-tournament.ts primero.");
    process.exit(1);
  }

  // Buscar equipos para los partidos
  const teamNames = ["México", "Uruguay", "España", "Argentina", "Brasil", "Francia"];
  const allTeams = await db
    .select({ id: schema.teams.id, name: schema.teams.name })
    .from(schema.teams);

  const byName = new Map(allTeams.map((t) => [t.name, t.id]));

  const find = (name: string) => {
    const id = byName.get(name);
    if (!id) throw new Error(`Equipo no encontrado: ${name}`);
    return id;
  };

  // Fechas de partidos (junio 2026 — ajusta según fixture real)
  const match1Date = new Date("2026-06-11T22:00:00Z"); // México vs Uruguay
  const match2Date = new Date("2026-06-12T01:00:00Z"); // España vs Argentina
  const match3Date = new Date("2026-06-13T00:00:00Z"); // Brasil vs Francia

  const matchesToInsert = [
    {
      tournamentId: tournament.id,
      homeTeamId: find("México"),
      awayTeamId: find("Uruguay"),
      scheduledAt: match1Date,
      deadlineAt: deadline(match1Date),
      stage: "group" as const,
    },
    {
      tournamentId: tournament.id,
      homeTeamId: find("España"),
      awayTeamId: find("Argentina"),
      scheduledAt: match2Date,
      deadlineAt: deadline(match2Date),
      stage: "group" as const,
    },
    {
      tournamentId: tournament.id,
      homeTeamId: find("Brasil"),
      awayTeamId: find("Francia"),
      scheduledAt: match3Date,
      deadlineAt: deadline(match3Date),
      stage: "group" as const,
    },
  ];

  await db.insert(schema.matches).values(matchesToInsert);
  console.log(`✓ ${matchesToInsert.length} partidos insertados`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
