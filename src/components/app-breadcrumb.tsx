"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Crumb = { label: string; href?: string };

function getCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "dashboard") {
    if (segments.length === 1) return [{ label: "Fixture" }];
    if (segments[1] === "standings") return [{ label: "Tabla de Posiciones" }];
    if (segments[1] === "champion") return [{ label: "Mi Campeón" }];
    if (segments[1] === "grupos") return [{ label: "Grupos" }];
    if (segments[1] === "matches") {
      if (segments.length === 2) return [{ label: "Fixture" }];
      return [{ label: "Fixture", href: "/dashboard" }, { label: "Partido" }];
    }
  }

  if (segments[0] === "admin") {
    const adminRoot: Crumb = { label: "Panel Admin", href: "/admin" };
    if (segments.length === 1) return [{ label: "Panel Admin" }];
    if (segments[1] === "fixture") {
      if (segments.length === 2) return [adminRoot, { label: "Partidos" }];
      return [adminRoot, { label: "Partidos", href: "/admin/fixture" }, { label: "Partido" }];
    }
    if (segments[1] === "participants") return [adminRoot, { label: "Participantes" }];
    if (segments[1] === "prizes") return [adminRoot, { label: "Distribución del Pozo" }];
    if (segments[1] === "settings") return [adminRoot, { label: "Configuración" }];
  }

  if (segments[0] === "reglas") return [{ label: "Reglas" }];
  if (segments[0] === "settings") return [{ label: "Mi Cuenta" }];
  if (segments[0] === "profile") return [{ label: "Perfil" }];

  return [];
}

export function AppBreadcrumb() {
  const pathname = usePathname();
  const crumbs = getCrumbs(pathname);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <React.Fragment key={i}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
