import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users, participants, tournaments } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { AvatarForm } from "./avatar-form";
import { PasswordForm } from "./password-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true, name: true },
  });

  const [row, participant] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { fullName: true, avatarUrl: true },
    }),
    tournament
      ? db.query.participants.findFirst({
          where: and(
            eq(participants.userId, user.id),
            eq(participants.tournamentId, tournament.id)
          ),
          columns: { hasPaid: true },
        })
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="space-y-10 p-6 lg:p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-500">Gestiona tu cuenta y preferencias.</p>
      </div>

      {/* Sección 1 — Foto de perfil */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Foto de perfil
        </h2>
        <AvatarForm
          fullName={row?.fullName ?? ""}
          avatarUrl={row?.avatarUrl}
        />
      </section>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* Sección 2 — Contraseña */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Contraseña
        </h2>
        <PasswordForm />
      </section>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* Sección 3 — Estado de cuenta (read-only) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Estado de cuenta
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <dt className="text-zinc-500 w-20 shrink-0">Cuota</dt>
            {participant?.hasPaid ? (
              <dd className="font-medium text-green-600 dark:text-green-400">
                Confirmada ✓
              </dd>
            ) : (
              <dd className="font-medium text-amber-500">
                Pendiente de confirmación
              </dd>
            )}
          </div>
          {tournament && (
            <div className="flex items-center gap-3">
              <dt className="text-zinc-500 w-20 shrink-0">Torneo</dt>
              <dd>{tournament.name}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
