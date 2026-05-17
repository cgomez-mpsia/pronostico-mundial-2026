/**
 * Script de setup completo — DESTRUCTIVO.
 * Borra todos los datos, recrea el usuario admin y carga equipos + torneo.
 *
 * Uso:
 *   SEED_ADMIN_EMAIL=admin@mundial.com SEED_ADMIN_PASSWORD=admin123 npx tsx src/db/setup.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { users, tournaments, teams } from "./schema";
import { seedMatches } from "./seed-matches";

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD.");
  process.exit(1);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

// ─── Equipos ────────────────────────────────────────────────────────────────

const TEAMS = [
  // Grupo A
  { name: "México",               flagUrl: "https://flagcdn.com/w80/mx.png",     groupName: "A" },
  { name: "Sudáfrica",            flagUrl: "https://flagcdn.com/w80/za.png",     groupName: "A" },
  { name: "Corea del Sur",        flagUrl: "https://flagcdn.com/w80/kr.png",     groupName: "A" },
  { name: "Chequia",              flagUrl: "https://flagcdn.com/w80/cz.png",     groupName: "A" },
  // Grupo B
  { name: "Canadá",               flagUrl: "https://flagcdn.com/w80/ca.png",     groupName: "B" },
  { name: "Bosnia y Herzegovina", flagUrl: "https://flagcdn.com/w80/ba.png",     groupName: "B" },
  { name: "Catar",                flagUrl: "https://flagcdn.com/w80/qa.png",     groupName: "B" },
  { name: "Suiza",                flagUrl: "https://flagcdn.com/w80/ch.png",     groupName: "B" },
  // Grupo C
  { name: "Brasil",               flagUrl: "https://flagcdn.com/w80/br.png",     groupName: "C" },
  { name: "Marruecos",            flagUrl: "https://flagcdn.com/w80/ma.png",     groupName: "C" },
  { name: "Haití",                flagUrl: "https://flagcdn.com/w80/ht.png",     groupName: "C" },
  { name: "Escocia",              flagUrl: "https://flagcdn.com/w80/gb-sct.png", groupName: "C" },
  // Grupo D
  { name: "Estados Unidos",       flagUrl: "https://flagcdn.com/w80/us.png",     groupName: "D" },
  { name: "Paraguay",             flagUrl: "https://flagcdn.com/w80/py.png",     groupName: "D" },
  { name: "Australia",            flagUrl: "https://flagcdn.com/w80/au.png",     groupName: "D" },
  { name: "Turquía",              flagUrl: "https://flagcdn.com/w80/tr.png",     groupName: "D" },
  // Grupo E
  { name: "Alemania",             flagUrl: "https://flagcdn.com/w80/de.png",     groupName: "E" },
  { name: "Curazao",              flagUrl: "https://flagcdn.com/w80/cw.png",     groupName: "E" },
  { name: "Costa de Marfil",      flagUrl: "https://flagcdn.com/w80/ci.png",     groupName: "E" },
  { name: "Ecuador",              flagUrl: "https://flagcdn.com/w80/ec.png",     groupName: "E" },
  // Grupo F
  { name: "Países Bajos",         flagUrl: "https://flagcdn.com/w80/nl.png",     groupName: "F" },
  { name: "Japón",                flagUrl: "https://flagcdn.com/w80/jp.png",     groupName: "F" },
  { name: "Suecia",               flagUrl: "https://flagcdn.com/w80/se.png",     groupName: "F" },
  { name: "Túnez",                flagUrl: "https://flagcdn.com/w80/tn.png",     groupName: "F" },
  // Grupo G
  { name: "Bélgica",              flagUrl: "https://flagcdn.com/w80/be.png",     groupName: "G" },
  { name: "Egipto",               flagUrl: "https://flagcdn.com/w80/eg.png",     groupName: "G" },
  { name: "Irán",                 flagUrl: "https://flagcdn.com/w80/ir.png",     groupName: "G" },
  { name: "Nueva Zelanda",        flagUrl: "https://flagcdn.com/w80/nz.png",     groupName: "G" },
  // Grupo H
  { name: "España",               flagUrl: "https://flagcdn.com/w80/es.png",     groupName: "H" },
  { name: "Cabo Verde",           flagUrl: "https://flagcdn.com/w80/cv.png",     groupName: "H" },
  { name: "Arabia Saudí",         flagUrl: "https://flagcdn.com/w80/sa.png",     groupName: "H" },
  { name: "Uruguay",              flagUrl: "https://flagcdn.com/w80/uy.png",     groupName: "H" },
  // Grupo I
  { name: "Francia",              flagUrl: "https://flagcdn.com/w80/fr.png",     groupName: "I" },
  { name: "Senegal",              flagUrl: "https://flagcdn.com/w80/sn.png",     groupName: "I" },
  { name: "Iraq",                 flagUrl: "https://flagcdn.com/w80/iq.png",     groupName: "I" },
  { name: "Noruega",              flagUrl: "https://flagcdn.com/w80/no.png",     groupName: "I" },
  // Grupo J
  { name: "Argentina",            flagUrl: "https://flagcdn.com/w80/ar.png",     groupName: "J" },
  { name: "Argelia",              flagUrl: "https://flagcdn.com/w80/dz.png",     groupName: "J" },
  { name: "Austria",              flagUrl: "https://flagcdn.com/w80/at.png",     groupName: "J" },
  { name: "Jordania",             flagUrl: "https://flagcdn.com/w80/jo.png",     groupName: "J" },
  // Grupo K
  { name: "Portugal",             flagUrl: "https://flagcdn.com/w80/pt.png",     groupName: "K" },
  { name: "RD Congo",             flagUrl: "https://flagcdn.com/w80/cd.png",     groupName: "K" },
  { name: "Uzbekistán",           flagUrl: "https://flagcdn.com/w80/uz.png",     groupName: "K" },
  { name: "Colombia",             flagUrl: "https://flagcdn.com/w80/co.png",     groupName: "K" },
  // Grupo L
  { name: "Inglaterra",           flagUrl: "https://flagcdn.com/w80/gb-eng.png", groupName: "L" },
  { name: "Croacia",              flagUrl: "https://flagcdn.com/w80/hr.png",     groupName: "L" },
  { name: "Ghana",                flagUrl: "https://flagcdn.com/w80/gh.png",     groupName: "L" },
  { name: "Panamá",               flagUrl: "https://flagcdn.com/w80/pa.png",     groupName: "L" },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function setup() {
  console.log("⚠️  RESET COMPLETO — se borrarán todos los datos.\n");

  // 1. Truncar tablas de la app (CASCADE respeta FK order)
  console.log("▶ Truncando tablas...");
  await db.execute(
    sql`TRUNCATE match_points, predictions, participants, matches, teams, tournaments, users CASCADE`
  );
  console.log("  ✓ Tablas vaciadas.");

  // 2. Eliminar todos los usuarios de Supabase Auth
  console.log("▶ Eliminando usuarios de Supabase Auth...");
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  for (const u of authUsers?.users ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(u.id);
  }
  console.log(`  ✓ ${authUsers?.users?.length ?? 0} usuario(s) eliminado(s) de Auth.`);

  // 3. Crear usuario admin en Supabase Auth
  console.log("▶ Creando usuario admin...");
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail!,
    password: adminPassword!,
    email_confirm: true,
  });
  if (authError) {
    console.error("  ✗ Error al crear admin en Auth:", authError.message);
    process.exit(1);
  }
  const adminId = authData.user.id;
  console.log(`  ✓ Admin creado: ${adminId}`);

  // 4. Insertar en tabla users
  console.log("▶ Insertando usuario admin en users...");
  await db.insert(users).values({
    id: adminId,
    email: adminEmail!,
    fullName: "Organizador",
    role: "admin",
  });
  console.log("  ✓ users insertado.");

  // 5. Crear torneo
  console.log("▶ Insertando torneo...");
  await db.insert(tournaments).values({
    name: "Pronóstico Mundial 2026",
    inscriptionFee: "500.00",
    status: "draft",
    championApplied: false,
  });
  console.log("  ✓ tournaments insertado.");

  // 6. Insertar 48 equipos
  console.log("▶ Insertando 48 equipos...");
  await db.insert(teams).values(TEAMS);
  console.log("  ✓ 48 equipos insertados.");

  // 7. Insertar 104 partidos
  console.log("▶ Obteniendo IDs de equipos y torneo...");
  const [tournament] = await db.select({ id: tournaments.id }).from(tournaments).limit(1);
  const teamRows = await db.select({ id: teams.id, name: teams.name }).from(teams);
  const teamsByName: Record<string, string> = {};
  for (const t of teamRows) teamsByName[t.name] = t.id;

  console.log("▶ Insertando 104 partidos...");
  await seedMatches(db, tournament.id, teamsByName);
  console.log("  ✓ 104 partidos insertados.");

  await pool.end();
  console.log("\n✅ Setup completado. La base de datos está lista.");
}

setup().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});
