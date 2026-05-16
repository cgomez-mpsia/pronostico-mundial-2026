/**
 * Seed de los 48 equipos clasificados al Mundial FIFA 2026
 * Ejecutar: npx tsx scripts/seed-teams.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool, { schema });

// 48 equipos clasificados al Mundial 2026 (EE.UU., México, Canadá)
const TEAMS = [
  // CONCACAF (anfitriones + clasificados)
  { name: "Estados Unidos", groupName: "A" },
  { name: "México", groupName: "B" },
  { name: "Canadá", groupName: "C" },
  { name: "Costa Rica", groupName: "D" },
  { name: "Honduras", groupName: "E" },
  { name: "Panamá", groupName: "F" },
  // CONMEBOL
  { name: "Argentina", groupName: "G" },
  { name: "Brasil", groupName: "H" },
  { name: "Uruguay", groupName: "A" },
  { name: "Colombia", groupName: "B" },
  { name: "Ecuador", groupName: "C" },
  { name: "Paraguay", groupName: "D" },
  { name: "Bolivia", groupName: "E" },
  { name: "Venezuela", groupName: "F" },
  { name: "Chile", groupName: "G" },
  // UEFA
  { name: "Francia", groupName: "H" },
  { name: "España", groupName: "A" },
  { name: "Alemania", groupName: "B" },
  { name: "Inglaterra", groupName: "C" },
  { name: "Portugal", groupName: "D" },
  { name: "Países Bajos", groupName: "E" },
  { name: "Italia", groupName: "F" },
  { name: "Bélgica", groupName: "G" },
  { name: "Croatia", groupName: "H" },
  { name: "Serbia", groupName: "A" },
  { name: "Dinamarca", groupName: "B" },
  { name: "Austria", groupName: "C" },
  { name: "Suiza", groupName: "D" },
  { name: "Turquía", groupName: "E" },
  { name: "Polonia", groupName: "F" },
  { name: "Escocia", groupName: "G" },
  { name: "Ucrania", groupName: "H" },
  { name: "Hungría", groupName: "A" },
  { name: "Eslovaquia", groupName: "B" },
  { name: "Albania", groupName: "C" },
  { name: "Grecia", groupName: "D" },
  // AFC
  { name: "Japón", groupName: "E" },
  { name: "Corea del Sur", groupName: "F" },
  { name: "Arabia Saudita", groupName: "G" },
  { name: "Irán", groupName: "H" },
  { name: "Australia", groupName: "A" },
  { name: "Uzbekistán", groupName: "B" },
  // CAF
  { name: "Marruecos", groupName: "C" },
  { name: "Senegal", groupName: "D" },
  { name: "Egipto", groupName: "E" },
  { name: "Nigeria", groupName: "F" },
  // OFC + interconfederal
  { name: "Nueva Zelanda", groupName: "G" },
  { name: "Por definir (playoff)", groupName: "H" },
];

async function main() {
  console.log(`Insertando ${TEAMS.length} equipos…`);
  await db
    .insert(schema.teams)
    .values(TEAMS)
    .onConflictDoNothing();
  console.log("✓ Equipos insertados");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
