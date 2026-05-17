import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLayoutUserData } from "@/lib/layout-data";
import { AppLayout } from "@/components/app-layout";

export default async function AdminLayout({
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

  if (data.role !== "admin") redirect("/dashboard");

  return (
    <AppLayout
      fullName={data.fullName}
      avatarUrl={data.avatarUrl}
      isAdmin={true}
      userId={user.id}
      championFlagUrl={data.championFlagUrl}
      championTeamName={data.championTeamName}
    >
      {children}
    </AppLayout>
  );
}
