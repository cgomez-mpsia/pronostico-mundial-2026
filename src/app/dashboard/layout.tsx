import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLayoutUserData } from "@/lib/layout-data";
import { AppLayout } from "@/components/app-layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const data = await getLayoutUserData(user.id);

  return (
    <AppLayout
      fullName={data.fullName}
      avatarUrl={data.avatarUrl}
      isAdmin={data.role === "admin"}
      userId={user.id}
      championFlagUrl={data.championFlagUrl}
      championTeamName={data.championTeamName}
      teams={data.teams}
    >
      {children}
    </AppLayout>
  );
}
