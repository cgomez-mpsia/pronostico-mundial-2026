import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GroupStandings } from "./group-standings";

export default async function GruposPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          ← Fixture
        </Link>
        <h1 className="text-2xl font-semibold">Clasificación de Grupos</h1>
      </div>

      <GroupStandings />
    </div>
  );
}
