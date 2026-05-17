"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Trophy,
  Star,
  BookOpen,
  User,
  Users,
  Coins,
  Settings,
  LogOut,
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { UserAvatar } from "@/components/user-avatar";
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
}

const participantNav = [
  { href: "/dashboard", label: "Fixture", icon: CalendarDays },
  { href: "/dashboard/standings", label: "Tabla de Posiciones", icon: Trophy },
  { href: "/dashboard/champion", label: "Mi Campeón", icon: Star },
  { href: "/reglas", label: "Reglas", icon: BookOpen },
];

const adminNav = [
  { href: "/admin/fixture", label: "Fixture", icon: CalendarDays },
  { href: "/admin/participants", label: "Participantes", icon: Users },
  { href: "/admin/prizes", label: "Distribución del Pozo", icon: Coins },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

export function AppSidebar({ fullName, avatarUrl, isAdmin, userId }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Sidebar>
      {/* Header con avatar y nombre */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar fullName={fullName} avatarUrl={avatarUrl} size={40} />
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

        {/* Panel Admin — solo visible para admins */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Panel Admin</SidebarGroupLabel>
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
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer con settings y logout */}
      <SidebarFooter className="px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/settings" />}
              isActive={isActive("/settings")}
            >
              <Settings />
              <span>Settings</span>
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
