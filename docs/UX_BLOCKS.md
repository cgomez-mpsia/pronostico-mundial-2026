# UX_BLOCKS — Análisis de Estructura y Blocks shadcn/ui
## Pronóstico Mundial 2026

---

| Campo | Valor |
|---|---|
| **Versión** | 0.1 |
| **Fecha** | 2026-05-17 |
| **Autor** | Alberto Gomez |
| **Estado** | Análisis completado — implementación pendiente |

---

## 1. Estado actual de la UI

### 1.1 Árbol de rutas

```
/                        → redirect (admin → /admin, user → /dashboard)
/login                   → formulario de login (fuera del layout)

/dashboard               → fixture del participante
/dashboard/standings     → tabla de posiciones (Realtime)
/dashboard/champion      → selección de campeón
/dashboard/grupos        → clasificación de grupos
/dashboard/matches/[id]  → detalle de partido

/profile/[userId]        → perfil público + tabs

/settings                → configuración de cuenta (avatar, contraseña)
/reglas                  → página estática de reglas

/admin                   → home del admin (stats)
/admin/fixture           → gestión de partidos + registro de resultados
/admin/fixture/[matchId] → pronósticos de un partido
/admin/participants      → gestión de participantes
/admin/prizes            → distribución del pozo
/admin/settings          → configuración del torneo
```

### 1.2 Layout actual

```
SidebarProvider
  AppSidebar
    [Header]  Avatar + Nombre
    [Nav]     Fixture · Standings · Campeón · Reglas · Mi Perfil
    [Admin]   Fixture · Participantes · Pozo · Config   ← solo admin
    [Footer]  Settings · Cerrar sesión
  SidebarInset
    <header>  SidebarTrigger  ← SOLO ESTO, nada más
    <main>    {children}
```

### 1.3 Componentes shadcn en uso

`button` · `input` · `label` · `card` · `sidebar` · `sheet` · `alert` · `badge` · `checkbox` · `dropdown-menu` · `separator` · `skeleton` · `tooltip`

---

## 2. Problemas UX identificados

### P1 — Header vacío (impacto alto)

El `<header>` de `app-layout.tsx` solo contiene `<SidebarTrigger />`. Es espacio muerto.

```tsx
// Actual
<header className="flex h-12 items-center gap-2 border-b px-4">
  <SidebarTrigger />   ← único elemento
</header>
```

**Consecuencia:** En mobile, el usuario ve un ícono de hamburguesa y nada más — sin saber en qué sección está. En desktop con sidebar abierto, el header es completamente inútil.

**Fix:** El header debe mostrar: `SidebarTrigger | Breadcrumb(s) | [acciones contextuales]`

---

### P2 — Sin orientación en rutas profundas (impacto alto)

Rutas como `/admin/fixture/[matchId]` no tienen ningún indicador de jerarquía. El admin no sabe que está dentro de Fixture → partido específico.

---

### P3 — Admin ve dos listas de "Fixture" (impacto medio)

El sidebar muestra:
- `Fixture` → `/dashboard` (fixture del participante)
- `Fixture` → `/admin/fixture` (fixture del admin)

Mismo ícono, mismo label, destinos distintos. Confuso.

---

### P4 — "Settings" aparece dos veces con el mismo ícono (impacto bajo)

`Settings` (Lucide) se usa tanto en `adminNav` para `/admin/settings` como en el footer para `/settings`. El admin ve dos ítems con el mismo ícono en la misma sidebar.

---

### P5 — Sección Admin no tiene estado activo de grupo (impacto medio)

La sección "Panel Admin" no se distingue visualmente cuando el usuario está navegando dentro de ella. No hay indicador de contexto global (¿estoy en modo participante o modo admin?).

---

### P6 — Login page sin polish (impacto bajo)

El login no usa ningún block de shadcn. Es un formulario sin estructura visual definida.

---

### P7 — Tabla de participantes (admin) sin sorting ni filtro (impacto medio)

La página `/admin/participants` probablemente muestra una tabla básica. Con múltiples participantes, no hay forma de filtrar por "pago pendiente" ni ordenar por nombre.

---

## 3. Shadcn blocks recomendados por sección

### 3.1 Layout global → `sidebar-10` + fragmentos de `sidebar-07`

**Block de referencia:** [sidebar-10](https://ui.shadcn.com/blocks#sidebar-10)

El block `sidebar-10` es el más completo del catálogo shadcn:
- Sidebar con grupos de navegación
- Header con `SidebarTrigger` + `Breadcrumb` + `UserNav` (avatar/nombre en la esquina)
- El breadcrumb actúa como título de página en mobile

De `sidebar-07` se toma el patrón de **grupos colapsables** para la sección Admin.

**Cambios en `app-layout.tsx`:**

```tsx
// Propuesto
<header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
  <SidebarTrigger className="-ml-1" />
  <Separator orientation="vertical" className="mr-2 h-4" />
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>{/* generado dinámicamente */}</BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
</header>
```

**Cambios en `app-sidebar.tsx` — sección Admin colapsable:**

```tsx
// Sección admin: colapsable, expandida cuando pathname starts with /admin
<Collapsible defaultOpen={pathname.startsWith("/admin")}>
  <SidebarGroup>
    <CollapsibleTrigger asChild>
      <SidebarGroupLabel className="cursor-pointer">
        Panel Admin <ChevronDown className="ml-auto" />
      </SidebarGroupLabel>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarGroupContent>...</SidebarGroupContent>
    </CollapsibleContent>
  </SidebarGroup>
</Collapsible>
```

**Solución al problema de los dos "Fixture":** renombrar en el sidebar:
- Participante: `Fixture` → se mantiene (es el destino principal)
- Admin: `Fixture` → `Gestión de Fixture` o simplemente `Partidos`

---

### 3.2 Login → `login-01`

**Block de referencia:** [login-01](https://ui.shadcn.com/blocks#login-01)

Card centrado, fondo neutro, sin imagen lateral. Apropiado para una app privada sin branding elaborado. Estructura:

```
┌─────────────────────────────────┐
│                                 │
│     🏆  Pronóstico Mundial 26   │
│     Ingresá tus credenciales    │
│                                 │
│     Email ________________      │
│     Contraseña ____________     │
│                                 │
│     [ Iniciar sesión ]          │
│                                 │
└─────────────────────────────────┘
```

Cambios respecto al `login-02` (que incluye link de "registrarse"): no se muestra ese link porque no hay auto-registro.

---

### 3.3 Admin home `/admin` → `dashboard-01`

**Block de referencia:** [dashboard-01](https://ui.shadcn.com/blocks#dashboard-01)

El admin home actualmente muestra contadores básicos (N participantes, N partidos, N pronósticos, Bs. X en pozo). El block `dashboard-01` provee una cuadrícula de stat cards que encaja directamente:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 24       │ │ 104      │ │ 1,872    │ │ Bs.12000 │
│ Partic.  │ │ Partidos │ │ Pronóst. │ │ Pozo     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

Cards con: valor grande, label pequeño, variación opcional (ej. "8 pendientes de pago").

---

### 3.4 Participantes admin → `data-table`

**Block de referencia:** [table](https://ui.shadcn.com/blocks#table) + [data-table](https://ui.shadcn.com/docs/components/data-table)

La tabla de participantes necesita:
- Ordenar por nombre / estado de pago
- Filtrar por "pago pendiente" (acción más frecuente del admin)
- Acciones por fila: toggle pago, reset contraseña

Estructura de columnas:

| # | Participante | Email | Estado pago | Campeón | Fecha | Acciones |
|---|---|---|---|---|---|---|
| 1 | [Avatar] Juan Pérez | juan@... | ✓ Pagado | ARG | 12 may | `⋮` |
| 2 | [Avatar] María López | maria@... | ⚠ Pendiente | — | 13 may | `⋮` |

El `⋮` abre un `DropdownMenu` con: "Marcar como pagado / pendiente" + "Resetear contraseña".

---

### 3.5 Tabla de posiciones `/dashboard/standings` → tabla custom (sin data-table)

La standings usa **Supabase Realtime** — los datos se actualizan en tiempo real, no necesitan paginación ni filtros. No aplica el data-table complejo. Pero sí aplica el patrón visual del `table` block:

| Pos | Participante | Pts | Resultados | Exactos | Campeón |
|---|---|---|---|---|---|
| 1 🥇 | [Avatar] Juan | 47 | 32 | 5 | ARG |
| 2 🥈 | [Avatar] María | 44 | 30 | 4 | BRA |

Mejoras pendientes respecto al estado actual:
- Columna `Pos` con medalla para top 3
- `Campeón` como bandera pequeña (no solo código)
- Highlight de la propia fila del usuario autenticado

---

### 3.6 Settings `/settings` → `settings-01` pattern

**Block de referencia:** [settings-01](https://ui.shadcn.com/blocks#settings-01) (si existe) o patrón de `card` + sections

La página de settings tiene tres secciones: foto de perfil, contraseña, estado de pago. El patrón correcto:

```
Configuración de cuenta
├─ Foto de perfil          [Card]
│   [Avatar grande] [Subir foto]
│
├─ Seguridad               [Card]
│   Contraseña actual ___
│   Nueva contraseña ___
│   [Guardar]
│
└─ Estado de inscripción   [Card / read-only]
    ✓ Cuota pagada · Bs. 500
```

Cada sección en su propio `<Card>` con `<CardHeader>` + `<CardContent>`. Este es el patrón que usa shadcn en todos sus ejemplos de settings.

---

### 3.7 Perfil público `/profile/[userId]` → tabs + card stats

El perfil ya usa tabs (Resumen / Desglose). Mejora pendiente basada en el bloque de perfil que usa shadcn en sus demos:

```
┌─────────────────────────────────────────────────┐
│  [Avatar 80px]  Juan Pérez                      │
│                 #3 en la tabla · 44 pts         │
│                 Campeón: 🇦🇷 Argentina           │
└─────────────────────────────────────────────────┘
  [ Resumen ]  [ Desglose ]

Resumen:
  ┌────────┐ ┌────────┐ ┌────────┐
  │  67%   │ │  12%   │ │  5 pts │
  │Resultad│ │Exactos │ │Campeón │
  └────────┘ └────────┘ └────────┘
```

---

### 3.8 Detalle de partido `/dashboard/matches/[matchId]`

No hay un block exacto en shadcn para esto. La estructura natural es:

```
[Card hero del partido: equipos + score + badges]
─────────────────────────────────────────────────
Pronósticos de los participantes (tabla post-deadline)

| Participante | Pronóstico | Puntos |
|--------------|------------|--------|
| [Av] Juan    | 1 — 0      | 1 pt   |
| [Av] María   | 2 — 1      | 3 pts  |
```

Usa la misma `PredictionCard` ya existente como header, más una tabla simple debajo.

---

## 4. Priorización de implementación

| Prioridad | Sección | Block | Impacto UX | Esfuerzo |
|---|---|---|---|---|
| 🔴 Alta | Layout global (header vacío) | sidebar-10 | Alto | Bajo |
| 🔴 Alta | Breadcrumbs dinámicos | sidebar-10 | Alto | Medio |
| 🟡 Media | Sección Admin colapsable | sidebar-07 | Medio | Bajo |
| 🟡 Media | Tabla de participantes | data-table | Medio | Medio |
| 🟡 Media | Login page | login-01 | Medio | Bajo |
| 🟢 Baja | Admin home stats | dashboard-01 | Bajo | Bajo |
| 🟢 Baja | Settings cards | card pattern | Bajo | Bajo |
| 🟢 Baja | Standings mejoras | tabla custom | Bajo | Bajo |

---

## 5. Cambios concretos en `app-layout.tsx` y `app-sidebar.tsx`

### `app-layout.tsx` — antes vs. después

```tsx
// ANTES
<header className="flex h-12 items-center gap-2 border-b border-zinc-200 px-4">
  <SidebarTrigger />
</header>

// DESPUÉS
<header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
  <SidebarTrigger className="-ml-1" />
  <Separator orientation="vertical" className="mr-2 h-4" />
  <AppBreadcrumb />   {/* nuevo componente — lee pathname y genera breadcrumbs */}
</header>
```

### Breadcrumb por ruta

| Ruta | Breadcrumbs |
|---|---|
| `/dashboard` | Fixture |
| `/dashboard/standings` | Tabla de Posiciones |
| `/dashboard/champion` | Mi Campeón |
| `/dashboard/matches/[id]` | Fixture › [Equipo A vs Equipo B] |
| `/dashboard/grupos` | Grupos |
| `/admin` | Admin |
| `/admin/fixture` | Admin › Fixture |
| `/admin/fixture/[id]` | Admin › Fixture › [Equipo A vs Equipo B] |
| `/admin/participants` | Admin › Participantes |
| `/admin/prizes` | Admin › Distribución del Pozo |
| `/admin/settings` | Admin › Configuración |
| `/profile/[userId]` | Perfil |
| `/settings` | Configuración de cuenta |
| `/reglas` | Reglas |

### `app-sidebar.tsx` — cambios de labels

| Actual | Propuesto | Razón |
|---|---|---|
| `Fixture` (admin nav) | `Partidos` | Evita duplicado con el "Fixture" del participante |
| `Settings` (footer) | `Mi Cuenta` | Diferencia del `Settings` de admin/settings |
| `Panel Admin` (group label) | `Admin` | Más conciso + colapsable |

---

## 6. Componentes shadcn a instalar

```bash
# Para breadcrumbs (sidebar-10)
npx shadcn@latest add breadcrumb

# Para grupos colapsables en sidebar (sidebar-07)
# Usa Collapsible — ya disponible como primitivo de Radix/shadcn
npx shadcn@latest add collapsible

# Para data-table de participantes
# (no hay un solo componente — se construye con table + sorting)
npx shadcn@latest add table
```

---

## 7. Referencias

| Block | URL |
|---|---|
| sidebar-10 | https://ui.shadcn.com/blocks#sidebar-10 |
| sidebar-07 | https://ui.shadcn.com/blocks#sidebar-07 |
| login-01 | https://ui.shadcn.com/blocks#login-01 |
| dashboard-01 | https://ui.shadcn.com/blocks#dashboard-01 |
| data-table | https://ui.shadcn.com/docs/components/data-table |
| breadcrumb | https://ui.shadcn.com/docs/components/breadcrumb |
| collapsible | https://ui.shadcn.com/docs/components/collapsible |

---

*Análisis elaborado por Alberto Gomez · 2026-05-17*
