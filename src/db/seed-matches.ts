/**
 * Seed de los 104 partidos del Mundial 2026.
 * Exporta seedMatches() para ser llamado desde setup.ts.
 *
 * Todos los horarios están en BOT (UTC-4).
 * deadlineAt = medianoche BOT del día del partido (00:00 BOT = 04:00 UTC).
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { matches, teams, tournaments } from "./schema";
import { eq } from "drizzle-orm";

// ─── Conversión BOT → UTC ─────────────────────────────────────────────────────

function botMatch(date: string, time: string): { scheduledAt: Date; deadlineAt: Date } {
  const scheduledAt = new Date(`${date}T${time}:00-04:00`);
  const [year, month, day] = date.split("-").map(Number);
  // 23:59 BOT del día anterior = 03:59 UTC del día del partido (en BOT)
  const deadlineAt = new Date(Date.UTC(year, month - 1, day, 3, 59, 0));
  return { scheduledAt, deadlineAt };
}

// ─── Fixture ─────────────────────────────────────────────────────────────────

type MatchDef = {
  date: string;
  time: string;
  home: string | null;
  away: string | null;
  stage: string;
};

const FIXTURE: MatchDef[] = [
  // ── FASE DE GRUPOS ────────────────────────────────────────────────────────
  // Jornada 1
  { date: "2026-06-11", time: "15:00", home: "México",              away: "Sudáfrica",          stage: "group" },
  { date: "2026-06-11", time: "22:00", home: "Corea del Sur",       away: "Chequia",            stage: "group" },
  { date: "2026-06-12", time: "15:00", home: "Canadá",              away: "Bosnia y Herzegovina", stage: "group" },
  { date: "2026-06-12", time: "21:00", home: "Estados Unidos",      away: "Paraguay",           stage: "group" },
  { date: "2026-06-13", time: "15:00", home: "Catar",               away: "Suiza",              stage: "group" },
  { date: "2026-06-13", time: "18:00", home: "Brasil",              away: "Marruecos",          stage: "group" },
  { date: "2026-06-13", time: "21:00", home: "Haití",               away: "Escocia",            stage: "group" },
  { date: "2026-06-14", time: "00:00", home: "Australia",           away: "Turquía",            stage: "group" },
  { date: "2026-06-14", time: "13:00", home: "Alemania",            away: "Curazao",            stage: "group" },
  { date: "2026-06-14", time: "16:00", home: "Países Bajos",        away: "Japón",              stage: "group" },
  { date: "2026-06-14", time: "19:00", home: "Costa de Marfil",     away: "Ecuador",            stage: "group" },
  { date: "2026-06-14", time: "22:00", home: "Suecia",              away: "Túnez",              stage: "group" },
  { date: "2026-06-15", time: "12:00", home: "España",              away: "Cabo Verde",         stage: "group" },
  { date: "2026-06-15", time: "15:00", home: "Bélgica",             away: "Egipto",             stage: "group" },
  { date: "2026-06-15", time: "18:00", home: "Arabia Saudí",        away: "Uruguay",            stage: "group" },
  { date: "2026-06-15", time: "21:00", home: "Irán",                away: "Nueva Zelanda",      stage: "group" },
  { date: "2026-06-16", time: "15:00", home: "Francia",             away: "Senegal",            stage: "group" },
  { date: "2026-06-16", time: "18:00", home: "Iraq",                away: "Noruega",            stage: "group" },
  { date: "2026-06-16", time: "21:00", home: "Argentina",           away: "Argelia",            stage: "group" },
  { date: "2026-06-17", time: "00:00", home: "Austria",             away: "Jordania",           stage: "group" },
  { date: "2026-06-17", time: "13:00", home: "Portugal",            away: "RD Congo",           stage: "group" },
  { date: "2026-06-17", time: "16:00", home: "Inglaterra",          away: "Croacia",            stage: "group" },
  { date: "2026-06-17", time: "19:00", home: "Ghana",               away: "Panamá",             stage: "group" },
  { date: "2026-06-17", time: "22:00", home: "Uzbekistán",          away: "Colombia",           stage: "group" },
  // Jornada 2
  { date: "2026-06-18", time: "12:00", home: "Chequia",             away: "Sudáfrica",          stage: "group" },
  { date: "2026-06-18", time: "15:00", home: "Suiza",               away: "Bosnia y Herzegovina", stage: "group" },
  { date: "2026-06-18", time: "18:00", home: "Canadá",              away: "Catar",              stage: "group" },
  { date: "2026-06-18", time: "21:00", home: "México",              away: "Corea del Sur",      stage: "group" },
  { date: "2026-06-19", time: "15:00", home: "Estados Unidos",      away: "Australia",          stage: "group" },
  { date: "2026-06-19", time: "18:00", home: "Escocia",             away: "Marruecos",          stage: "group" },
  { date: "2026-06-19", time: "20:30", home: "Brasil",              away: "Haití",              stage: "group" },
  { date: "2026-06-19", time: "23:00", home: "Turquía",             away: "Paraguay",           stage: "group" },
  { date: "2026-06-20", time: "13:00", home: "Países Bajos",        away: "Suecia",             stage: "group" },
  { date: "2026-06-20", time: "16:00", home: "Alemania",            away: "Costa de Marfil",    stage: "group" },
  { date: "2026-06-20", time: "20:00", home: "Ecuador",             away: "Curazao",            stage: "group" },
  { date: "2026-06-21", time: "00:00", home: "Túnez",               away: "Japón",              stage: "group" },
  { date: "2026-06-21", time: "12:00", home: "España",              away: "Arabia Saudí",       stage: "group" },
  { date: "2026-06-21", time: "15:00", home: "Bélgica",             away: "Irán",               stage: "group" },
  { date: "2026-06-21", time: "18:00", home: "Uruguay",             away: "Cabo Verde",         stage: "group" },
  { date: "2026-06-21", time: "21:00", home: "Nueva Zelanda",       away: "Egipto",             stage: "group" },
  { date: "2026-06-22", time: "13:00", home: "Argentina",           away: "Austria",            stage: "group" },
  { date: "2026-06-22", time: "17:00", home: "Francia",             away: "Iraq",               stage: "group" },
  { date: "2026-06-22", time: "20:00", home: "Noruega",             away: "Senegal",            stage: "group" },
  { date: "2026-06-22", time: "23:00", home: "Jordania",            away: "Argelia",            stage: "group" },
  { date: "2026-06-23", time: "13:00", home: "Portugal",            away: "Uzbekistán",         stage: "group" },
  { date: "2026-06-23", time: "16:00", home: "Inglaterra",          away: "Ghana",              stage: "group" },
  { date: "2026-06-23", time: "19:00", home: "Panamá",              away: "Croacia",            stage: "group" },
  { date: "2026-06-23", time: "22:00", home: "Colombia",            away: "RD Congo",           stage: "group" },
  // Jornada 3 (simultáneos por grupo)
  { date: "2026-06-24", time: "15:00", home: "Suiza",               away: "Canadá",             stage: "group" },
  { date: "2026-06-24", time: "15:00", home: "Bosnia y Herzegovina", away: "Catar",             stage: "group" },
  { date: "2026-06-24", time: "18:00", home: "Escocia",             away: "Brasil",             stage: "group" },
  { date: "2026-06-24", time: "18:00", home: "Marruecos",           away: "Haití",              stage: "group" },
  { date: "2026-06-24", time: "21:00", home: "Chequia",             away: "México",             stage: "group" },
  { date: "2026-06-24", time: "21:00", home: "Sudáfrica",           away: "Corea del Sur",      stage: "group" },
  { date: "2026-06-25", time: "16:00", home: "Curazao",             away: "Costa de Marfil",    stage: "group" },
  { date: "2026-06-25", time: "16:00", home: "Ecuador",             away: "Alemania",           stage: "group" },
  { date: "2026-06-25", time: "19:00", home: "Japón",               away: "Suecia",             stage: "group" },
  { date: "2026-06-25", time: "19:00", home: "Túnez",               away: "Países Bajos",       stage: "group" },
  { date: "2026-06-25", time: "22:00", home: "Turquía",             away: "Estados Unidos",     stage: "group" },
  { date: "2026-06-25", time: "22:00", home: "Paraguay",            away: "Australia",          stage: "group" },
  { date: "2026-06-26", time: "15:00", home: "Noruega",             away: "Francia",            stage: "group" },
  { date: "2026-06-26", time: "15:00", home: "Senegal",             away: "Iraq",               stage: "group" },
  { date: "2026-06-26", time: "20:00", home: "Cabo Verde",          away: "Arabia Saudí",       stage: "group" },
  { date: "2026-06-26", time: "20:00", home: "Uruguay",             away: "España",             stage: "group" },
  { date: "2026-06-26", time: "23:00", home: "Egipto",              away: "Irán",               stage: "group" },
  { date: "2026-06-26", time: "23:00", home: "Nueva Zelanda",       away: "Bélgica",            stage: "group" },
  { date: "2026-06-27", time: "17:00", home: "Panamá",              away: "Inglaterra",         stage: "group" },
  { date: "2026-06-27", time: "17:00", home: "Croacia",             away: "Ghana",              stage: "group" },
  { date: "2026-06-27", time: "19:30", home: "Colombia",            away: "Portugal",           stage: "group" },
  { date: "2026-06-27", time: "19:30", home: "RD Congo",            away: "Uzbekistán",         stage: "group" },
  { date: "2026-06-27", time: "22:00", home: "Argelia",             away: "Austria",            stage: "group" },
  { date: "2026-06-27", time: "22:00", home: "Jordania",            away: "Argentina",          stage: "group" },

  // ── DIECISEISAVOS DE FINAL (R32) ──────────────────────────────────────────
  { date: "2026-06-28", time: "15:00", home: null, away: null, stage: "r32" },
  { date: "2026-06-29", time: "13:00", home: null, away: null, stage: "r32" },
  { date: "2026-06-29", time: "16:30", home: null, away: null, stage: "r32" },
  { date: "2026-06-29", time: "21:00", home: null, away: null, stage: "r32" },
  { date: "2026-06-30", time: "13:00", home: null, away: null, stage: "r32" },
  { date: "2026-06-30", time: "17:00", home: null, away: null, stage: "r32" },
  { date: "2026-06-30", time: "21:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-01", time: "12:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-01", time: "16:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-01", time: "20:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-02", time: "15:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-02", time: "19:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-02", time: "23:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-03", time: "14:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-03", time: "18:00", home: null, away: null, stage: "r32" },
  { date: "2026-07-03", time: "21:30", home: null, away: null, stage: "r32" },

  // ── OCTAVOS DE FINAL (R16) ────────────────────────────────────────────────
  { date: "2026-07-04", time: "13:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-04", time: "17:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-05", time: "16:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-05", time: "20:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-06", time: "15:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-06", time: "20:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-07", time: "12:00", home: null, away: null, stage: "r16" },
  { date: "2026-07-07", time: "16:00", home: null, away: null, stage: "r16" },

  // ── CUARTOS DE FINAL ──────────────────────────────────────────────────────
  { date: "2026-07-09", time: "16:00", home: null, away: null, stage: "qf" },
  { date: "2026-07-10", time: "15:00", home: null, away: null, stage: "qf" },
  { date: "2026-07-11", time: "17:00", home: null, away: null, stage: "qf" },
  { date: "2026-07-11", time: "21:00", home: null, away: null, stage: "qf" },

  // ── SEMIFINALES ───────────────────────────────────────────────────────────
  { date: "2026-07-14", time: "15:00", home: null, away: null, stage: "sf" },
  { date: "2026-07-15", time: "15:00", home: null, away: null, stage: "sf" },

  // ── TERCER PUESTO ─────────────────────────────────────────────────────────
  { date: "2026-07-18", time: "17:00", home: null, away: null, stage: "third" },

  // ── FINAL ─────────────────────────────────────────────────────────────────
  { date: "2026-07-19", time: "15:00", home: null, away: null, stage: "final" },
];

// ─── seedMatches ─────────────────────────────────────────────────────────────

export async function seedMatches(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  tournamentId: string,
  teamsByName: Record<string, string>
): Promise<void> {
  const rows = FIXTURE.map((m) => {
    const { scheduledAt, deadlineAt } = botMatch(m.date, m.time);
    return {
      tournamentId,
      homeTeamId: m.home ? teamsByName[m.home] ?? null : null,
      awayTeamId: m.away ? teamsByName[m.away] ?? null : null,
      scheduledAt,
      deadlineAt,
      stage: m.stage,
      status: "scheduled" as const,
    };
  });

  // Check for unknown team names
  const missingTeams = FIXTURE.filter(
    (m) =>
      (m.home && !teamsByName[m.home]) ||
      (m.away && !teamsByName[m.away])
  );
  if (missingTeams.length > 0) {
    console.error("  ✗ Equipos no encontrados en DB:");
    missingTeams.forEach((m) => {
      if (m.home && !teamsByName[m.home]) console.error(`    - "${m.home}"`);
      if (m.away && !teamsByName[m.away]) console.error(`    - "${m.away}"`);
    });
    throw new Error("Equipos faltantes — verifica los nombres.");
  }

  await db.insert(matches).values(rows);
}

// ─── Standalone runner ────────────────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    });
    const db = drizzle(pool);

    console.log("▶ Obteniendo torneo...");
    const [tournament] = await db.select({ id: tournaments.id }).from(tournaments).limit(1);
    if (!tournament) {
      console.error("  ✗ No hay torneos en la base de datos. Ejecuta setup.ts primero.");
      process.exit(1);
    }

    console.log("▶ Obteniendo equipos...");
    const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams);
    const teamsByName: Record<string, string> = {};
    for (const t of teamRows) teamsByName[t.name] = t.id;

    console.log(`▶ Insertando ${FIXTURE.length} partidos...`);
    await seedMatches(db, tournament.id, teamsByName);
    console.log(`  ✓ ${FIXTURE.length} partidos insertados.`);

    await pool.end();
    console.log("\n✅ Partidos cargados.");
  })().catch((err) => {
    console.error("Error inesperado:", err);
    process.exit(1);
  });
}
