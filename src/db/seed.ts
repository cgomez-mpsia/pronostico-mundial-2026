/**
 * Seed inicial — ejecutar una única vez por entorno (producción / desarrollo).
 * Crea el usuario admin en Supabase Auth + tabla users, y el torneo inicial.
 *
 * Uso:
 *   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=Secreto123! npx tsx src/db/seed.ts
 *
 * Requiere las variables de entorno del .env.local (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, tournaments } from "./schema";

const adminEmail = process.env.SEED_ADMIN_EMAIL;
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error(
    "Faltan variables de entorno: SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD son requeridos."
  );
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

async function seed() {
  console.log("▶ Creando usuario admin en Supabase Auth...");

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: adminEmail!,
      password: adminPassword!,
      email_confirm: true,
    });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("  ⚠  El usuario admin ya existe en Supabase Auth — saltando.");
    } else {
      console.error("  ✗  Error al crear usuario en Auth:", authError.message);
      process.exit(1);
    }
  } else {
    const userId = authData.user.id;
    console.log(`  ✓  Usuario Auth creado: ${userId}`);

    console.log("▶ Insertando registro en tabla users...");
    await db
      .insert(users)
      .values({
        id: userId,
        email: adminEmail!,
        fullName: "Organizador",
        role: "admin",
      })
      .onConflictDoNothing();
    console.log("  ✓  users insertado.");
  }

  console.log("▶ Insertando torneo inicial...");
  await db
    .insert(tournaments)
    .values({
      name: "Pronóstico Mundial 2026",
      inscriptionFee: "500.00",
      status: "draft",
      championApplied: false,
    })
    .onConflictDoNothing();
  console.log("  ✓  tournaments insertado.");

  await pool.end();
  console.log("\n✅ Seed completado.");
}

seed().catch((err) => {
  console.error("Error inesperado en seed:", err);
  process.exit(1);
});
