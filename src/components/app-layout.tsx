import { AppSidebar } from "@/components/app-sidebar";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { PushNotifications } from "@/components/push-notifications";
import { PresenceProvider, OnlineCount } from "@/components/online-presence";
import { LiveUpdates } from "@/components/live-updates";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AppLayoutProps {
  fullName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  userId: string;
  championFlagUrl?: string | null;
  championTeamName?: string | null;
  children: React.ReactNode;
}

export function AppLayout({ fullName, avatarUrl, isAdmin, userId, championFlagUrl, championTeamName, children }: AppLayoutProps) {
  return (
    <PresenceProvider userId={userId} fullName={fullName}>
      {/* Entrega de actualizaciones en vivo por polling (gol/inicio/final/posición) */}
      <LiveUpdates currentUserId={userId} />
      <SidebarProvider>
        <AppSidebar
          fullName={fullName}
          avatarUrl={avatarUrl}
          isAdmin={isAdmin}
          userId={userId}
          championFlagUrl={championFlagUrl}
          championTeamName={championTeamName}
        />
        <SidebarInset>
          <header className="flex h-12 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
            <SidebarTrigger />
            <div className="ml-1 flex-1">
              <AppBreadcrumb />
            </div>
            <OnlineCount />
            <PushNotifications isAdmin={isAdmin} />
          </header>
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </PresenceProvider>
  );
}
