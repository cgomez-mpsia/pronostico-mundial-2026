"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Flame,
  Trophy,
  Star,
  BookOpen,
  LayoutGrid,
  User,
  Users,
  Coins,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { UserAvatar } from "@/components/user-avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  fullName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  userId: string;
  championFlagUrl?: string | null;
  championTeamName?: string | null;
}

const participantNav = [
  { href: "/dashboard", label: "Fixture", icon: CalendarDays },
  { href: "/dashboard/hoy", label: "Hoy", icon: Flame },
  { href: "/dashboard/grupos", label: "Grupos", icon: LayoutGrid },
  { href: "/dashboard/standings", label: "Tabla de Posiciones", icon: Trophy },
  { href: "/dashboard/champion", label: "Mi Campeón", icon: Star },
  { href: "/reglas", label: "Reglas", icon: BookOpen },
];

const adminNav = [
  { href: "/admin/fixture", label: "Partidos", icon: CalendarDays },
  { href: "/admin/participants", label: "Participantes", icon: Users },
  { href: "/admin/prizes", label: "Distribución del Pozo", icon: Coins },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AppSidebar({ fullName, avatarUrl, isAdmin, userId, championFlagUrl, championTeamName }: AppSidebarProps) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(() => pathname.startsWith("/admin"));

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar>
      {/* Header con avatar y nombre */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar
              fullName={fullName}
              avatarUrl={avatarUrl}
              size={40}
              championFlagUrl={championFlagUrl}
              championTeamName={championTeamName}
            />
          <span className="text-sm font-medium leading-tight truncate">{fullName}</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Navegación principal */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {participantNav.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={isActive(href)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Mi Perfil — enlaza al perfil propio */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href={`/profile/${userId}`} />}
                  isActive={isActive(`/profile/${userId}`)}
                >
                  <User />
                  <span>Mi Perfil</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Panel Admin — colapsable, solo visible para admins */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
              <SidebarGroup>
                <SidebarGroupLabel
                  render={
                    <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between hover:text-sidebar-foreground" />
                  }
                >
                  Panel Admin
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-200"
                    style={{ transform: adminOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
                  />
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {adminNav.map(({ href, label, icon: Icon }) => (
                        <SidebarMenuItem key={href}>
                          <SidebarMenuButton
                            render={<Link href={href} />}
                            isActive={isActive(href)}
                          >
                            <Icon />
                            <span>{label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer con Mi Cuenta y logout */}
      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isActive("/settings")}
            >
              <Settings />
              <span>Mi Cuenta</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton render={<button type="submit" />}>
                <LogOut />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
