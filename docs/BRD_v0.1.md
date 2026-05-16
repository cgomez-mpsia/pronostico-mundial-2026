# BRD — Business Requirements Document
## Pronóstico Mundial 2026

---

## Metadatos

| Campo | Valor |
|---|---|
| **Proyecto** | Pronóstico Mundial 2026 |
| **Versión** | 0.1 |
| **Fecha** | 15-May-2026 |
| **Estado** | Borrador |
| **Autor** | Alberto Gomez |
| **Cliente / Sponsor** | Vladimir Mariaca Vargas (organizador del torneo) |
| **Próxima revisión** | Pendiente de aprobación del cliente |
| **Documentos relacionados** | REGLAS_PRONOSTICO_MUNDIAL_2026.md · INVITACION_PRONOSTICO_MUNDIAL_2026.md |

---

## 1. Resumen Ejecutivo

El cliente Vladimir Mariaca Vargas organiza un torneo privado de pronósticos deportivos alrededor del Mundial FIFA 2026 (EE.UU., México, Canadá). El grupo de participantes son personas de su entorno cercano (amigos, conocidos) que pagarán una cuota de inscripción de Bs. 500 para competir por un pozo acumulado a lo largo de todo el torneo.

El objetivo de este proyecto es construir una **aplicación web privada** que gestione de forma automatizada el registro de participantes, la captura de pronósticos, el cálculo de puntos, la tabla de posiciones en tiempo real y la distribución del pozo al final del torneo. La plataforma reemplaza el modelo manual basado en Excel o mensajes de WhatsApp, aportando transparencia, trazabilidad y una experiencia de usuario atractiva.

El producto se desarrollará con Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth + Realtime), Drizzle ORM, TanStack Query y se desplegará en Vercel.

---

## 2. Contexto

### 2.1 Evento deportivo

El Mundial FIFA 2026 se celebra en Estados Unidos, México y Canadá. Por primera vez en la historia participan 48 selecciones. El torneo inicia en junio de 2026 y concluye con la gran final el 19 de julio de 2026. El fixture incluye 48 partidos en fase de grupos más una fase eliminatoria hasta la final.

### 2.2 Contexto del negocio

El torneo de pronósticos es una competencia privada entre un grupo cerrado de participantes. No es un producto comercial público ni una plataforma de apuestas regulada. El organizador actúa como administrador único del sistema y también puede participar como jugador.

La cuota de inscripción es fija en Bs. 500 por persona. El total recaudado forma el pozo del torneo. No existe ninguna comisión para la plataforma; el 100 % del pozo se distribuye entre los ganadores conforme a las reglas establecidas.

### 2.3 Situación actual (antes del sistema)

Sin la aplicación, el organizador gestionaría los pronósticos manualmente vía WhatsApp o Excel, lo que implica:

- Alta probabilidad de errores humanos en el registro y cálculo de puntos.
- Falta de transparencia: los participantes no pueden verificar en tiempo real que sus pronósticos fueron registrados correctamente.
- Carga operativa elevada para el organizador en cada jornada de partidos.
- Riesgo de disputas entre participantes por desacuerdos en el cálculo final.

---

## 3. Problema y Oportunidad

### 3.1 Problema

La gestión manual de un torneo de pronósticos durante 64+ partidos a lo largo de casi dos meses es operativamente inviable sin una herramienta dedicada. Los principales puntos de dolor son:

1. **Error humano en el cálculo de puntos:** con múltiples participantes y docenas de partidos, el riesgo de equivocarse en la asignación de puntos es elevado.
2. **Falta de transparencia:** los participantes no pueden ver el estado real del torneo de forma autónoma.
3. **Gestión del plazo de pronósticos:** controlar manualmente quién envió su pronóstico antes de las 15:00 del día anterior es complejo y propenso a conflictos.
4. **Distribución del pozo:** las reglas de distribución (empates, umbrales de participantes) son lo suficientemente complejas como para requerir cálculo automatizado y auditable.

### 3.2 Oportunidad

El Mundial 2026 es el evento deportivo más visto del planeta. Un torneo de pronósticos bien organizado, con una aplicación propia, eleva significativamente la experiencia de los participantes, refuerza la confianza en la transparencia del proceso y posiciona al organizador como un anfitrión profesional. La plataforma digital convierte una actividad informal en un producto memorable.

---

## 4. Usuarios y Personas

### Persona 1 — Organizador / Administrador

| Campo | Detalle |
|---|---|
| **Nombre** | Vladimir Mariaca Vargas |
| **Rol en el sistema** | Administrador + Participante |
| **Motivación** | Organizar el torneo sin carga operativa excesiva; garantizar transparencia ante los participantes; también competir y potencialmente ganar el pozo |
| **Necesidades clave** | Crear cuentas manualmente; registrar pagos de cuota; cargar resultados de partidos; acceder a un panel de administración; cargar pronósticos manualmente como fallback si la app falla |
| **Frustraciones actuales** | Gestión por WhatsApp es caótica; los participantes cuestionan los cálculos manuales |
| **Nivel técnico** | Medio — usa smartphone, puede navegar paneles de administración simples |

### Persona 2 — Participante

| Campo | Detalle |
|---|---|
| **Perfil** | Adulto del entorno cercano del organizador (amigos, conocidos) |
| **Motivación** | Ganar el pozo; vivir el Mundial con mayor emoción y competitividad |
| **Necesidades clave** | Ingresar pronósticos fácilmente desde el celular; ver la tabla de posiciones en tiempo real; saber cuántos puntos sumó en cada partido; comparar sus pronósticos con los de otros participantes |
| **Frustraciones potenciales** | Olvidar ingresar un pronóstico antes del plazo; no saber si su pronóstico fue guardado correctamente; no entender el cálculo de puntos |
| **Nivel técnico** | Básico-medio — requiere una interfaz simple, intuitiva y sin fricción |

---

## 5. Propuesta de Valor

| Beneficiario | Propuesta de valor |
|---|---|
| **Organizador** | Elimina la carga operativa del torneo (cálculo de puntos, control de plazos, distribución del pozo). Gana credibilidad y transparencia ante los participantes. |
| **Participantes** | Experiencia de usuario atractiva: ingresan pronósticos en segundos, ven su posición en la tabla en tiempo real y pueden comparar sus pronósticos con los de sus rivales. |
| **Torneo** | Transparencia total: las reglas se aplican de forma consistente y automática, eliminando disputas. El historial de pronósticos es auditable. |

---

## 6. Objetivos de Negocio (SMART)

| ID | Objetivo | Indicador de éxito |
|---|---|---|
| **BO-01** | Eliminar la gestión manual del torneo para la fecha de inicio del Mundial (junio 2026), de modo que el 100 % del cálculo de puntos y la distribución del pozo sea automático y auditable. | 0 cálculos manuales de puntos durante el torneo; pozo distribuido por el sistema al final. |
| **BO-02** | Lograr que el 100 % de los participantes inscritos utilicen la plataforma para ingresar sus pronósticos en al menos el 80 % de los partidos de la fase de grupos. | Tasa de participación ≥ 80 % de partidos con pronóstico ingresado por usuario. |
| **BO-03** | Garantizar la disponibilidad de la plataforma durante las ventanas críticas de pronósticos (hasta 15:00 del día anterior a cada partido) con un uptime ≥ 99 % en Vercel + Supabase. | Sin incidentes de caída registrados en ventanas críticas; fallback de WhatsApp activado 0 veces por fallo de plataforma. |
| **BO-04** | Completar el desarrollo y despliegue de la aplicación antes del partido inaugural del Mundial 2026, permitiendo que todos los participantes inscritos elijan su Campeón Mundial antes del primer partido. | App desplegada y accesible; 100 % de inscritos con Campeón elegido antes del partido inaugural. |

---

## 7. Requerimientos de Negocio (MoSCoW)

### Must Have (Imprescindibles)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-001** | El sistema debe permitir al administrador crear cuentas de usuario manualmente, asignarles credenciales (usuario/contraseña) y gestionar el estado de su inscripción (pago de cuota confirmado / pendiente). | El registro es exclusivamente manual según las reglas del cliente. No existe auto-registro público. |
| **BR-002** | El sistema debe permitir a cada participante ingresar un pronóstico de marcador exacto (goles local / goles visitante) para cada partido del Mundial, con un plazo de cierre a las 15:00 hora boliviana (BOT, UTC-4) del día anterior al partido. | Es la funcionalidad central del torneo. Sin ella, no existe competencia. |
| **BR-003** | El sistema debe calcular y asignar puntos automáticamente tras registrar el resultado oficial de cada partido, aplicando: +1 por acertar el resultado (V/E/D), +2 adicionales por marcador exacto (solo si el pronóstico fue ingresado manualmente), máximo 3 puntos por partido. | El motor de puntos es el núcleo de la competencia. Debe ser exacto y reproducible. |
| **BR-004** | El sistema debe tratar el pronóstico no ingresado como 0-0 internamente, mostrando "No pronosticó" en la interfaz. Si el partido termina 0-0, el participante recibe únicamente 1 punto (acertó el empate) pero no los 2 adicionales por marcador exacto. | Regla explícita del cliente para penalizar la omisión de pronósticos sin ser completamente injusta. |
| **BR-005** | El sistema debe bloquear la edición de pronósticos pasadas las 15:00 del día anterior a cada partido y publicar automáticamente todos los pronósticos de todos los participantes en ese momento. | Garantiza transparencia e impide modificaciones posteriores al conocimiento del plazo. |
| **BR-006** | El sistema debe mantener y mostrar públicamente la tabla de posiciones con los puntos acumulados de todos los participantes, actualizada en tiempo real tras registrar cada resultado. | La tabla en tiempo real es el principal driver de engagement del torneo. |
| **BR-007** | El sistema debe permitir a cada participante seleccionar un equipo como Campeón Mundial antes del partido inaugural. Esta elección debe ser pública desde el momento en que se realiza. Al final del torneo, si el equipo elegido es campeón, el participante recibe +5 puntos. | Regla clave del cliente; aporta un elemento estratégico de alto impacto al torneo. |
| **BR-008** | El sistema debe calcular y mostrar la distribución del pozo al final del torneo: si hay 8 o menos participantes, 100 % al 1er lugar; si hay más de 8, 75 % al 1er lugar y 25 % al 2do lugar. Debe aplicar las reglas de empate correspondientes. | Regla de negocio central; define cómo se reparte el dinero real del torneo. |

### Should Have (Importantes, no bloqueantes)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-009** | El administrador debe poder cargar manualmente el pronóstico de un participante desde el panel de administración, con registro de la fuente (fallback de WhatsApp) y timestamp, siempre que sea antes del plazo de las 15:00. | Fallback operativo requerido por el cliente para casos de fallo de la plataforma o problemas de acceso del participante. |

### Could Have (Deseables)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-010** | El sistema podría enviar notificaciones o recordatorios (por email o similar) a los participantes que aún no han ingresado su pronóstico antes del plazo de las 15:00. | Reduce la tasa de pronósticos no ingresados (que perjudica la competitividad). No es bloqueante para el torneo. |

---

## 8. Reglas de Negocio

| ID | Regla | Origen |
|---|---|---|
| **RB-01** | La cuota de inscripción es fija en Bs. 500 por participante. No hay variaciones ni descuentos. El pozo total es la suma de todas las cuotas pagadas. | REGLAS §1 |
| **RB-02** | Un participante inscrito no puede retirarse del torneo. Si abandona, pierde su cuota de Bs. 500 y no tiene derecho a devolución alguna. | REGLAS §1 |
| **RB-03** | Solo cuentan los 90 minutos reglamentarios de cada partido. El resultado de la prórroga y de los tiros penales no se considera para el cálculo de puntos ni para el pronóstico del marcador. Esto aplica a todos los partidos, incluidos los de fase eliminatoria. | REGLAS §2 |
| **RB-04** | El plazo para ingresar o modificar un pronóstico es las 15:00 hora Bolivia (BOT, UTC-4) del día calendario anterior a la fecha del partido. Pasado ese plazo, los pronósticos se bloquean y se publican. | REGLAS §2 |
| **RB-05** | Un pronóstico no ingresado antes del plazo se evalúa como 0-0. Si el resultado final (a 90 min) es 0-0, el participante recibe únicamente 1 punto por acertar el resultado de empate; no recibe los 2 puntos adicionales por marcador exacto, ya que no ingresó el pronóstico de forma intencional. | REGLAS §2 |
| **RB-06** | La elección del Campeón Mundial debe realizarse antes del inicio del partido inaugural del torneo. Una vez realizada, es pública e irrevocable. Al terminar el torneo, si el equipo elegido es campeón, el participante suma +5 puntos a su total. | REGLAS §2 |
| **RB-07** | Distribución del pozo según número de participantes inscritos: (a) 8 o menos: 100 % al 1er lugar. (b) Más de 8: 75 % al 1er lugar y 25 % al 2do lugar. | REGLAS §4 |
| **RB-08** | Reglas de empate en la distribución del pozo: (a) Empate en 1er lugar: los premios del 1er y 2do lugar (75 % + 25 % = 100 %) se dividen en partes iguales entre los empatados; el siguiente clasificado no recibe premio. (b) Empate en 2do lugar (con un único ganador del 1er lugar): el 25 % del 2do lugar se divide en partes iguales entre todos los empatados. | REGLAS §4 |

---

## 9. Supuestos y Restricciones

### 9.1 Supuestos

| # | Supuesto |
|---|---|
| A-01 | El cliente (Vladimir Mariaca Vargas) proveerá el fixture completo del Mundial 2026 (fechas, horarios y equipos de todos los partidos) en formato estructurado antes del inicio del desarrollo o del despliegue. |
| A-02 | El cliente es el único administrador del sistema. No se contempla más de un rol de administrador en esta versión. |
| A-03 | El número total de participantes será razonablemente pequeño (estimado entre 10 y 50 personas), lo que no requiere optimizaciones de escalabilidad extremas. |
| A-04 | Todos los participantes tienen acceso a un smartphone con navegador web moderno. No se requiere una app nativa (iOS/Android). |
| A-05 | Los resultados oficiales de los partidos (marcadores a 90 minutos) serán ingresados manualmente por el administrador. No se integra con ninguna API de resultados deportivos en esta versión. |
| A-06 | El idioma de la interfaz y de toda la aplicación es español. |
| A-07 | La distribución monetaria del pozo se realiza fuera de la plataforma (transferencia bancaria o en efectivo). La app solo calcula y muestra el monto correspondiente a cada ganador; no procesa pagos. |
| A-08 | El grupo de WhatsApp mencionado en las reglas es un canal informal gestionado por el cliente. La app no se integra con WhatsApp; el fallback de WhatsApp implica que el admin ingrese manualmente el pronóstico en la plataforma. |

### 9.2 Restricciones

| # | Restricción |
|---|---|
| R-01 | **Stack tecnológico fijo:** Next.js 15 + TypeScript, Tailwind CSS + shadcn/ui, Supabase, Drizzle ORM, TanStack Query, Vercel. No se pueden sustituir estas tecnologías sin aprobación del cliente. |
| R-02 | **Sin registro público:** La aplicación no permite que los participantes se registren por su cuenta. El administrador crea todas las cuentas manualmente. |
| R-03 | **Sin procesamiento de pagos:** La plataforma no gestiona cobros ni transferencias. El control de pagos de cuotas es responsabilidad del organizador, quien marca manualmente cada cuenta como "cuota pagada". |
| R-04 | **Zona horaria fija:** Todos los plazos (15:00 día anterior) se calculan en hora Bolivia (BOT, UTC-4). El sistema debe respetar esta zona horaria independientemente del servidor o del huso horario del usuario. |
| R-05 | **Aplicación privada:** No es un producto público. No requiere SEO, registro abierto, páginas de marketing ni integración con redes sociales. |
| R-06 | **Sin integración con API de resultados deportivos en v1:** Los resultados de cada partido son ingresados manualmente por el administrador. |
| R-07 | **Presupuesto y tiempo limitados:** El proyecto debe completarse antes del partido inaugural del Mundial 2026. Las funcionalidades se priorizan según MoSCoW. |

---

## 10. Alcance

### 10.1 Dentro del alcance (In scope)

- Panel de administración para gestión de participantes (crear, habilitar, marcar cuota pagada).
- Panel de administración para gestión del fixture (lista de partidos, ingreso de resultados).
- Autenticación de usuarios con Supabase Auth (login, logout, cambio de contraseña).
- Módulo de pronósticos: ingreso de marcador exacto por partido, con validación de plazo.
- Selector de Campeón Mundial (antes del partido inaugural, público desde el momento de la elección).
- Motor de cálculo de puntos: +1 resultado, +2 marcador exacto, +5 campeón, regla 0-0 por defecto.
- Publicación automática de pronósticos a las 15:00 del día anterior a cada partido.
- Tabla de posiciones en tiempo real (Supabase Realtime).
- Vista de detalle de partidos: pronósticos de todos los participantes (post-publicación).
- Cálculo y visualización de la distribución del pozo al final del torneo.
- Carga manual de pronósticos por el administrador (fallback de WhatsApp).
- Diseño responsive optimizado para mobile (los participantes usan smartphone).

### 10.2 Fuera del alcance (Out of scope — v1)

- Registro público de participantes.
- Procesamiento de pagos o cobros en línea.
- Integración con API de resultados deportivos (ej. API-Football, SportMonks).
- Notificaciones push o emails automáticos.
- Versión nativa iOS/Android.
- Soporte para múltiples administradores o roles adicionales.
- Torneos de pronósticos para otros eventos deportivos distintos al Mundial 2026.
- Historial de torneos anteriores.
- Estadísticas avanzadas (gráficas de rendimiento, análisis predictivo).
- Integración directa con WhatsApp Business API.

---

## 11. Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| **RK-01** | El administrador olvida ingresar el resultado de un partido a tiempo, retrasando la actualización de la tabla de posiciones. | Media | Alto | Implementar notificaciones internas en el panel de admin; procedimiento claro de operación post-partido. |
| **RK-02** | Un participante no puede acceder a la plataforma antes del plazo de las 15:00 (fallo de internet, credenciales olvidadas). | Media | Medio | Canal de WhatsApp como fallback oficial; el admin puede cargar el pronóstico manualmente antes del plazo. |
| **RK-03** | El fixture oficial del Mundial 2026 sufre cambios de horario o reprogramaciones por la FIFA. | Baja | Alto | El admin debe poder editar fechas y horarios de partidos desde el panel de administración; el sistema recalcula los plazos automáticamente. |
| **RK-04** | La plataforma (Vercel/Supabase) experimenta caída justo antes del cierre de pronósticos a las 15:00. | Baja | Alto | Plan de fallback documentado: participantes envían pronóstico por WhatsApp; el admin los carga manualmente cuando se restablezca el servicio. |
| **RK-05** | El desarrollo no queda listo antes del partido inaugural del Mundial, impidiendo que los participantes elijan su Campeón Mundial. | Baja-Media | Muy Alto | Priorizar en desarrollo: auth + pronóstico de campeón + pronóstico de partidos de fase de grupos (funcionalidades críticas). Tabla de posiciones y panel completo pueden desplegarse en iteraciones posteriores pero antes del inicio del torneo. |
| **RK-06** | Disputas entre participantes por la interpretación de reglas de empate o del caso del pronóstico 0-0 no ingresado. | Media | Medio | Las reglas de negocio están documentadas y son visibles en la plataforma. El sistema aplica las reglas de forma consistente y auditable. Se recomienda que el cliente comunique las reglas antes del inicio del torneo. |
| **RK-07** | Un participante intenta manipular su pronóstico después del plazo de las 15:00. | Baja | Alto | El sistema bloquea la edición a nivel de aplicación y de base de datos (RLS en Supabase). Los logs de auditoría permiten verificar cualquier intento. |

---

## 12. Trazabilidad a PRD / FSD

La siguiente tabla mapea los requerimientos de negocio de este BRD a las secciones esperadas del PRD (Product Requirements Document) y del FSD (Functional Specification Document) que se elaborarán en fases siguientes.

| ID BRD | Requerimiento de negocio | Módulo PRD | Sección FSD |
|---|---|---|---|
| **BR-001** | Gestión manual de cuentas por el administrador | Gestión de Usuarios | FSD §Administración de Usuarios: flujo de creación, roles, credenciales |
| **BR-002** | Ingreso de pronósticos con plazo 15:00 BOT | Módulo de Pronósticos | FSD §Pronósticos: UI de ingreso, validación de plazo, zona horaria |
| **BR-003** | Motor de puntos (+1/+2/max 3) | Motor de Puntos | FSD §Motor de Puntos: algoritmo de cálculo, casos de prueba |
| **BR-004** | Caso especial: pronóstico no ingresado = 0-0 | Motor de Puntos | FSD §Motor de Puntos: caso especial 0-0 por defecto |
| **BR-005** | Bloqueo y publicación automática a las 15:00 | Módulo de Pronósticos | FSD §Pronósticos: lógica de cierre, visibilidad post-plazo |
| **BR-006** | Tabla de posiciones en tiempo real | Tabla de Posiciones | FSD §Tabla de Posiciones: Supabase Realtime, ranking, puntaje acumulado |
| **BR-007** | Pronóstico del Campeón Mundial (+5 pts) | Módulo de Pronósticos | FSD §Campeón Mundial: selector, visibilidad pública, cálculo al final |
| **BR-008** | Distribución del pozo y reglas de empate | Módulo de Premiación | FSD §Distribución del Pozo: algoritmo, umbrales, casos de empate |
| **BR-009** | Carga manual de pronósticos por admin (fallback) | Gestión de Administración | FSD §Panel Admin: carga manual, registro de fuente, restricción de plazo |
| **BR-010** | Recordatorios / notificaciones de plazo | (Could Have — v2) | FSD §Notificaciones (v2) |
| **RB-01** | Cuota fija Bs. 500 — cálculo del pozo | Gestión de Inscripciones | FSD §Inscripción: registro de pago, cálculo automático del pozo total |
| **RB-02** | No retiro una vez inscrito | Gestión de Inscripciones | FSD §Inscripción: estado de cuenta, política de no devolución |
| **RB-03** | Solo 90 minutos reglamentarios | Motor de Puntos | FSD §Motor de Puntos: definición del resultado oficial |
| **RB-04** | Plazo 15:00 BOT día anterior | Módulo de Pronósticos | FSD §Pronósticos: cálculo de deadline, zona horaria BOT (UTC-4) |
| **RB-05** | Penalización pronóstico no ingresado (0-0 default) | Motor de Puntos | FSD §Motor de Puntos: flag `ingresado_manualmente`, caso 0-0 |
| **RB-06** | Campeón Mundial: irrevocable, público, +5 pts | Módulo de Pronósticos | FSD §Campeón Mundial: visibilidad, bloqueo post-selección |
| **RB-07** | Distribución 100 % / 75-25 % según inscritos | Módulo de Premiación | FSD §Distribución del Pozo: umbral 8 participantes |
| **RB-08** | Empates en 1er y 2do lugar | Módulo de Premiación | FSD §Distribución del Pozo: casos de empate, fusión de premios |

---

## 13. Glosario

| Término | Definición |
|---|---|
| **Pozo** | Total del dinero recaudado por las cuotas de inscripción de todos los participantes (N × Bs. 500). |
| **Pronóstico** | Predicción del marcador exacto (goles local – goles visitante) que un participante ingresa para un partido antes del plazo. |
| **Score exacto** | Coincidencia exacta entre el pronóstico de un participante y el resultado oficial del partido a 90 minutos. |
| **Resultado** | Desenlace del partido en términos de victoria local (V), empate (E) o victoria visitante (D), independientemente del marcador. |
| **BOT** | Bolivia Time, UTC-4. Zona horaria oficial para todos los plazos del torneo. |
| **Deadline** | 15:00 hora boliviana (BOT) del día calendario anterior a la fecha del partido. |
| **Fallback** | Mecanismo alternativo (WhatsApp + carga manual por el admin) para registrar pronósticos en caso de fallo de la plataforma. |
| **Campeón Mundial** | Equipo elegido por el participante como ganador del Mundial 2026. Se elige antes del partido inaugural y vale +5 puntos si acierta. |
| **Admin** | El organizador (Vladimir Mariaca Vargas) en su rol de administrador del sistema. |
| **Fixture** | Lista completa de los partidos del Mundial 2026 con fechas, horarios y equipos. |

---

*Documento elaborado por Alberto Gomez · 15-May-2026 · Versión 0.1 — Sujeto a revisión y aprobación del cliente.*
