import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { participants, tournaments, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { StandingsTable } from "./standings-table";

export default async function StandingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tournament = await db.query.tournaments.findFirst({
    where: or(
      eq(tournaments.status, "active"),
      eq(tournaments.status, "draft")
    ),
    columns: { id: true, name: true },
  });

  const [participant, userRow] = await Promise.all([
    tournament
      ? db.query.participants.findFirst({
          where: eq(participants.userId, user.id),
          columns: { id: true },
        })
      : null,
    db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    }),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Tabla de Posiciones</h1>
        {tournament && (
          <p className="text-sm text-zinc-500">{tournament.name}</p>
        )}
      </div>
      <StandingsTable currentUserId={participant?.id ?? ""} isAdmin={userRow?.role === "admin"} />
    </div>
  );
}
