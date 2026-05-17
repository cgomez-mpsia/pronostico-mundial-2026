import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface AppLayoutProps {
  fullName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  userId: string;
  children: React.ReactNode;
}

export function AppLayout({ fullName, avatarUrl, isAdmin, userId, children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        fullName={fullName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        userId={userId}
      />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <SidebarTrigger />
        </header>
        <main className="flex-1">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
