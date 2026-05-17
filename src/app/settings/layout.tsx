import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AppLayout } from "@/components/app-layout";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const row = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    columns: { fullName: true, role: true, avatarUrl: true },
  });

  return (
    <AppLayout
      fullName={row?.fullName ?? ""}
      avatarUrl={row?.avatarUrl}
      isAdmin={row?.role === "admin"}
      userId={user.id}
    >
      {children}
    </AppLayout>
  );
}
