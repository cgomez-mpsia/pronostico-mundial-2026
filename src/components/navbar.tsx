import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { fullName: true, role: true },
  });

  const isAdmin = row?.role === "admin";

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight"
          >
            Mundial 2026
          </Link>
          <Link
            href="/dashboard/standings"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Posiciones
          </Link>
          <Link
            href="/dashboard/champion"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Campeón
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-zinc-400 sm:block">
            {row?.fullName}
          </span>
          <form action={logoutAction}>
            <Button variant="outline" size="sm" type="submit">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
