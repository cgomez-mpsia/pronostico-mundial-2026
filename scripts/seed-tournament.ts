/**
 * Crea el torneo principal en la DB
 * Ejecutar: npx tsx scripts/seed-tournament.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool, { schema });

async function main() {
  const [tournament] = await db
    .insert(schema.tournaments)
    .values({
      name: "Mundial FIFA 2026",
      inscriptionFee: "500.00",
      status: "draft",
    })
    .returning({ id: schema.tournaments.id, name: schema.tournaments.name });

  console.log(`✓ Torneo creado: ${tournament.name} (${tournament.id})`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
