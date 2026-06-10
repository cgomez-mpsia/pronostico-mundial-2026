# BRD — Business Requirements Document
## Pronóstico Mundial 2026

---

## Metadatos

| Campo | Valor |
|---|---|
| **Proyecto** | Pronóstico Mundial 2026 |
| **Versión** | 0.9 |
| **Fecha** | 17-May-2026 |
| **Estado** | Implementado — v1 en producción (Vercel) |
| **Autor** | Alberto Gomez |
| **Cliente / Sponsor** | Vladimir Mariaca Vargas (organizador del torneo) |
| **Próxima revisión** | Antes del partido inaugural del Mundial 2026 |
| **Documentos relacionados** | REGLAS_PRONOSTICO_MUNDIAL_2026.md · INVITACION_PRONOSTICO_MUNDIAL_2026.md |

---

## 1. Resumen Ejecutivo

El cliente Vladimir Mariaca Vargas organiza un torneo privado de pronósticos deportivos alrededor del Mundial FIFA 2026 (EE.UU., México, Canadá). El grupo de participantes son personas de su entorno cercano (amigos, conocidos) que pagarán una cuota de inscripción de Bs. 500 para competir por un pozo acumulado a lo largo de todo el torneo.

El objetivo de este proyecto es construir una **aplicación web privada** que gestione de forma automatizada el registro de participantes, la captura de pronósticos, el cálculo de puntos, la tabla de posiciones en tiempo real y la distribución del pozo al final del torneo. La plataforma reemplaza el modelo manual basado en Excel o mensajes de WhatsApp, aportando transparencia, trazabilidad y una experiencia de usuario atractiva.

El producto se desarrollará con Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Auth + Realtime), Drizzle ORM, TanStack Query y se desplegará en Vercel.

---

## 2. Contexto

### 2.1 Evento deportivo

El Mundial FIFA 2026 se celebra en Estados Unidos, México y Canadá. Por primera vez en la historia participan 48 selecciones. El torneo inicia en junio de 2026 y concluye con la gran final el 19 de julio de 2026. El fixture incluye 72 partidos en fase de grupos (12 grupos × 6 partidos) más una fase eliminatoria de 32 partidos hasta la final, para un total de 104 partidos.

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
3. **Gestión del plazo de pronósticos:** controlar manualmente quién envió su pronóstico antes de las 23:59 del día anterior es complejo y propenso a conflictos.
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
| **BO-03** | Garantizar la disponibilidad de la plataforma durante las ventanas críticas de pronósticos (hasta 23:59 del día anterior) con un uptime ≥ 99 % en Vercel + Supabase. | Sin incidentes de caída registrados en ventanas críticas; fallback de WhatsApp activado 0 veces por fallo de plataforma. |
| **BO-04** | Completar el desarrollo y despliegue de la aplicación antes del partido inaugural del Mundial 2026, permitiendo que todos los participantes inscritos elijan su Campeón Mundial antes del primer partido. | App desplegada y accesible; 100 % de inscritos con Campeón elegido antes del partido inaugural. |

---

## 7. Requerimientos de Negocio (MoSCoW)

### Must Have (Imprescindibles)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-001** | El sistema debe permitir al administrador crear cuentas de usuario manualmente, asignarles credenciales (usuario/contraseña) y gestionar el estado de su inscripción (pago de cuota confirmado / pendiente). | El registro es exclusivamente manual según las reglas del cliente. No existe auto-registro público. |
| **BR-002** | El sistema debe permitir a cada participante ingresar un pronóstico de marcador exacto (goles local / goles visitante) para cada partido del Mundial, con un plazo de cierre a las 23:59 hora boliviana (BOT, UTC-4) del día del partido. | Es la funcionalidad central del torneo. Sin ella, no existe competencia. |
| **BR-003** | El sistema debe calcular y asignar puntos automáticamente tras registrar el resultado oficial de cada partido, aplicando: +1 por acertar el resultado (V/E/D), +2 adicionales por marcador exacto (solo si el pronóstico fue ingresado manualmente), máximo 3 puntos por partido. | El motor de puntos es el núcleo de la competencia. Debe ser exacto y reproducible. |
| **BR-004** | El sistema debe tratar el pronóstico no ingresado como 0-0 internamente, mostrando "No pronosticó" en la interfaz. Si el partido termina 0-0, el participante recibe únicamente 1 punto (acertó el empate) pero no los 2 adicionales por marcador exacto. | Regla explícita del cliente para penalizar la omisión de pronósticos sin ser completamente injusta. |
| **BR-005** | El sistema debe bloquear la edición de pronósticos pasadas las 23:59 del día anterior y publicar automáticamente todos los pronósticos de todos los participantes en ese momento. | Garantiza transparencia e impide modificaciones posteriores al conocimiento del plazo. |
| **BR-006** | El sistema debe mantener y mostrar públicamente la tabla de posiciones con los puntos acumulados de todos los participantes, actualizada en tiempo real tras registrar cada resultado. | La tabla en tiempo real es el principal driver de engagement del torneo. |
| **BR-007** | El sistema debe permitir a cada participante seleccionar un equipo como Campeón Mundial antes del partido inaugural. Esta elección debe ser pública desde el momento en que se realiza. Al final del torneo, si el equipo elegido es campeón, el participante recibe +5 puntos. | Regla clave del cliente; aporta un elemento estratégico de alto impacto al torneo. |
| **BR-008** | El sistema debe calcular y mostrar la distribución del pozo al final del torneo: si hay 8 o menos participantes, 100 % al 1er lugar; si hay más de 8, 75 % al 1er lugar y 25 % al 2do lugar. Debe aplicar las reglas de empate correspondientes. | Regla de negocio central; define cómo se reparte el dinero real del torneo. |

### Should Have (Importantes, no bloqueantes)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-009** | El administrador debe poder cargar manualmente el pronóstico de un participante desde el panel de administración, con registro de la fuente (fallback de WhatsApp) y timestamp, siempre que sea antes de las 23:59. | Fallback operativo requerido por el cliente para casos de fallo de la plataforma o problemas de acceso del participante. |
| **BR-010** | El administrador debe poder crear, editar y gestionar los partidos del fixture desde el panel de administración (fecha, hora, equipos, etapa). | El fixture del Mundial tiene 104 partidos; cargarlo y ajustarlo únicamente por SQL Editor no es operativamente viable. |
| **BR-011** | El administrador debe poder aplicar los +5 puntos de campeón al finalizar el torneo, indicando qué equipo ganó el Mundial. El sistema debe calcular automáticamente qué participantes aciertan y sumar los puntos. | Cierra el cálculo final del torneo; sin esta acción la clasificación final es incompleta. |
| **BR-012** | Cada participante debe poder ver el desglose de puntos partido a partido (pronóstico ingresado, resultado oficial, puntos obtenidos) tanto para sí mismo como para los demás participantes (post-deadline). | Transparencia y auditoría: los participantes necesitan verificar que sus puntos fueron calculados correctamente. |
| **BR-013** | El administrador debe poder visualizar la distribución del pozo en tiempo real (pozo total acumulado, monto estimado para cada posición) durante y al final del torneo. | El admin necesita esta información para preparar la distribución final del dinero. |
| **BR-014** | Cada participante debe poder subir y cambiar su foto de perfil. La foto debe ser visible públicamente en la tabla de posiciones y en la vista de pronósticos de los demás. El participante gestiona su propia foto; el admin no puede editar fotos de otros usuarios. | Aporta identidad visual al torneo — en un grupo privado de amigos, reconocer a cada participante por su foto mejora la experiencia y el engagement. |
| **BR-015** | El sistema debe mostrar un perfil público de cada participante, visible para cualquier usuario autenticado, con: nombre, ranking actual, puntos totales, campeón elegido, pronósticos partido a partido (post-deadline) y estadísticas calculadas (% de resultados correctos, % de scores exactos, racha de partidos con al menos 1 punto). | Aporta transparencia y elemento social al torneo; los participantes pueden comparar su rendimiento con el de los demás. |
| **BR-016** | El participante debe poder ver en su propio perfil: su estado de pago (cuota confirmada o pendiente), la brecha de puntos con el líder actual ("Te faltan X puntos para el 1er lugar") y una opción para cambiar su contraseña. Estas secciones son visibles únicamente para el propio participante. | Información de cuenta y contexto competitivo que el participante necesita sin tener que contactar al admin. |
| **BR-017** | Los partidos de la fase eliminatoria (dieciseisavos, octavos, cuartos, semifinales, tercer puesto y final) deben pre-cargarse con fechas conocidas pero sin equipos asignados ("Por definir"). El administrador asigna los dos equipos de cada partido en cuanto se conocen los clasificados, activando el formulario de pronóstico para los participantes. El panel de administración debe mostrar una alerta cuando un partido tiene equipos pendientes de asignación y su plazo de cierre está a menos de 24 horas. | El fixture eliminatorio del Mundial no puede cargarse completo al inicio; los equipos dependen de quién avanza en cada ronda. El admin necesita un aviso para no perder la ventana de pronósticos (especialmente en octavos, donde el plazo puede ser el mismo día que termina la fase de grupos). |
| **BR-018** | El sistema debe ofrecer una página de reglas del torneo accesible desde la barra de navegación para todos los participantes autenticados. La página debe presentar las reglas en lenguaje claro y de usuario (no técnico): sistema de puntos, plazo de cierre, caso "No pronosticó", selección de campeón, distribución del pozo y la restricción de 90 minutos reglamentarios. | Los participantes necesitan consultar las reglas de forma autónoma durante el torneo, especialmente cuando tienen dudas sobre el cálculo de puntos o el plazo. Reduce la carga de consultas al organizador. |
| **BR-019** | La interfaz debe usar una barra de navegación lateral (sidebar) como estructura principal de navegación, visible en escritorio y accesible como drawer en mobile. El sidebar debe mostrar el avatar y nombre del usuario autenticado en su encabezado, y la sección de "Admin" solo debe ser visible para usuarios con rol admin. | Un sidebar maneja mejor los 5-6 destinos de navegación de la app que un navbar top, especialmente en mobile. El avatar en el header personaliza la experiencia y confirma visualmente quién está conectado. |
| **BR-020** | El sistema debe ofrecer una página de configuración de cuenta (`/settings`) accesible desde el sidebar, donde el participante puede: cambiar su foto de perfil, cambiar su contraseña y ver el estado de su pago (read-only). Estas acciones son privadas y solo accesibles por el propio participante. | Separar la configuración de cuenta del perfil público sigue el patrón estándar (perfil = lo que ven los demás; settings = lo que configurás vos). |
| **BR-021** | El administrador debe poder configurar el torneo desde un panel de ajustes (`/admin/settings`): editar el nombre del torneo, consultar la cuota de inscripción, avanzar el estado del torneo (draft → active → finished) y ejecutar la acción de aplicar puntos de Campeón Mundial. | Centralizar las acciones de configuración global del torneo en un único lugar del panel admin facilita la operación y reduce errores. |
| **BR-022** | Al hacer clic en un partido del fixture, el sistema debe mostrar una página de detalle del partido con: información del partido (equipos, fecha, etapa, resultado si terminó) y los pronósticos de todos los participantes una vez que el plazo de cierre haya pasado. Si el partido tiene resultado registrado, también se muestran los puntos obtenidos por cada participante en ese partido. | Permite ver la vista social del partido (quién pronosticó qué) de forma centralizada, en lugar de tener que revisar el perfil de cada participante individualmente. |
| **BR-023** | Cuando un partido eliminatorio se resuelve más allá de los 90 minutos, el admin debe poder indicar si se decidió en tiempo extra (`a.e.t.`) o en tanda de penales (`pen.`), y seleccionar el equipo ganador final. El resultado de 90 minutos (base para pronósticos y puntos) no cambia. La UI debe mostrar el marcador de 90 minutos acompañado del badge correspondiente ("a.e.t." o "pen.") y el nombre del equipo ganador, para que los participantes entiendan el desenlace sin confundir el resultado de 90 min con el resultado final del partido. | Los participantes pronostican sobre los 90 minutos reglamentarios, pero necesitan saber quién avanzó en la eliminatoria. Sin esta información, ver "1-1" en un partido eliminatorio terminado genera confusión. |
| **BR-024** | El fixture del participante debe mostrar las banderas de los equipos junto a sus nombres, y los partidos deben estar agrupados visualmente por jornada (fecha BOT). Para los partidos de fase de grupos, debe indicarse el grupo al que pertenecen (Grupo A, Grupo B, etc.). | Las banderas permiten identificar los equipos rápidamente sin leer el nombre completo. La agrupación por jornada es el formato estándar de visualización de fixtures deportivos y facilita encontrar los partidos del día. |
| **BR-025** | El sistema debe ofrecer una vista de "Clasificación de grupos" accesible desde el fixture, que muestre para cada grupo la tabla de posiciones con: equipo (bandera + nombre), PJ, G, E, P, GF, GC, DG y Pts. La tabla se calcula en tiempo real desde los resultados de los partidos de fase de grupos registrados. El orden sigue los criterios de desempate FIFA: puntos → diferencia de goles → goles a favor → resultado directo. | Replica la experiencia estándar del seguimiento de un Mundial. Los participantes necesitan ver cómo está cada grupo para contextualizar los pronósticos de fase eliminatoria y saber qué equipos podrían enfrentarse en los dieciseisavos. |
| **BR-036** | *(Futuro — análisis pendiente)* Una vez completada la fase de grupos, el sistema podría proponer automáticamente los emparejamientos de los dieciseisavos de final (R32) basándose en la clasificación final de cada grupo y la tabla de distribución de terceros de la FIFA. El admin revisaría y confirmaría los emparejamientos antes de publicarlos. | Actualmente el admin asigna los equipos de cada partido eliminatorio manualmente. La automatización reduciría el riesgo de error humano y el tiempo de operación, especialmente en los dieciseisavos donde 32 equipos deben emparejarse según reglas complejas (8 mejores terceros distribuidos en brackets predeterminados). Requiere análisis de la tabla de distribución oficial de la FIFA 2026. |
| **BR-027** | En la zona del marcador de la tarjeta de partido (prediction card), los equipos se identifican mediante su **código FIFA de 3 letras** (ej. MEX, ARG, BIH) junto a la bandera, en lugar del nombre completo. El nombre completo se reserva para vistas con mayor espacio (detalle de partido, tabla de grupos). | Los nombres completos de algunos equipos (ej. "Bosnia y Herzegovina", "República de Corea", "Costa de Marfil") truncan visualmente en pantallas móviles en la zona compacta del score. El código de 3 letras es el estándar internacional (FIFA, transmisiones TV) y no necesita truncarse. Requiere el campo `teams.code` en el schema. |
| **BR-028** | La tarjeta de partido debe adoptar un layout centrado en la **hora/score como elemento principal**, flanqueado simétricamente por `[código][bandera]` a cada lado. La etapa del partido ("Primera fase", "Cuartos de Final") se muestra dentro de la tarjeta. La fecha se omite de la tarjeta porque ya actúa como encabezado de sección en el fixture. La línea de metadatos (grupo, plazo de cierre) va debajo del score como información secundaria. | La hora del partido es la información más relevante para el participante al mirar el fixture: necesita saber cuándo juega para decidir cuándo ingresar su pronóstico. El layout actual la entierra en una línea de texto pequeño junto a la fecha. La referencia es el fixture oficial de la FIFA en mobile, que hace de la hora el elemento visual dominante de la tarjeta. |
| **BR-029** | En partidos eliminatorios que se resuelven en prórroga (`extra_time = 'aet'`), el sistema debe almacenar y mostrar **dos marcadores**: el marcador a los 90 minutos (base para pronósticos y puntos) y el marcador al final de la prórroga (para mostrar el resultado real del partido). En partidos que van a penales (`extra_time = 'pen'`), el marcador al final de los 120 minutos debe mostrarse junto al badge "pen." y el equipo ganador. En ambos casos, el admin debe ingresar explícitamente el marcador de 90 min y el marcador final por separado. | El diseño actual almacena un único marcador, lo que genera ambigüedad: si el partido fue 1-1 en 90 min y 2-1 en la prórroga, la UI mostraría "1-1 (a.e.t.)" — ocultando el resultado real. Requiere agregar campos `home_score_full` / `away_score_full` al schema de `matches` y rediseñar el formulario de registro de resultado. **Estado: análisis completado — implementación pendiente.** |

| **BR-030** | El header de todas las páginas autenticadas debe mostrar **breadcrumbs dinámicos** que reflejen la jerarquía de navegación actual, junto al botón de apertura del sidebar. En mobile, los breadcrumbs actúan como título de página. Referencia de implementación: shadcn/ui block `sidebar-10`. | El header actual solo contiene el botón de hamburguesa — en mobile el usuario no tiene ningún indicador de en qué sección se encuentra. Rutas profundas como `/admin/fixture/[matchId]` requieren mostrar la jerarquía completa para orientar al admin. |
| **BR-031** | La sección "Panel Admin" del sidebar debe ser **colapsable**, expandida automáticamente cuando el usuario está en rutas `/admin/*` y colapsada cuando está en rutas de participante. Referencia: shadcn/ui block `sidebar-07`. | Un admin que navega como participante no necesita ver permanentemente todos los ítems del panel admin. La lista actual es larga para usuarios admin y genera ruido visual cuando se navega en modo participante. |
| **BR-032** | El sidebar debe eliminar la **ambigüedad de labels duplicados**: el ítem de fixture del admin se llamará "Partidos" en lugar de "Fixture" (para diferenciarlo del "Fixture" del participante), y el ítem de configuración del footer se llamará "Mi Cuenta" en lugar de "Settings" (para diferenciarlo de la "Configuración" del panel admin). | Actualmente aparecen dos ítems con label "Fixture" y dos con ícono de engranaje. Un admin ve cuatro ítems que se solapan visualmente — esto genera confusión sobre a qué sección corresponde cada uno. |
| **BR-033** | La página de login debe seguir el patrón de **card centrado** (shadcn/ui block `login-01`): formulario en card, sin links de auto-registro, sin imágenes laterales ni branding elaborado. Debe mostrar el nombre del torneo como encabezado del card. | La app es privada y el login es la única pantalla pública. Un card centrado limpio es consistente con el carácter privado de la plataforma y no genera confusión sobre la posibilidad de registrarse. |
| **BR-034** | La página de inicio del admin (`/admin`) debe presentar las estadísticas del torneo en formato de **stat cards** (shadcn/ui block `dashboard-01`): participantes pagados / pendientes, partidos jugados / pendientes de resultado, total de pronósticos ingresados y pozo acumulado. | El admin home actualmente muestra información plana sin jerarquía visual. Las stat cards permiten captar el estado del torneo de un vistazo y actúan como punto de partida para las acciones más urgentes (ej. ver cuántos partidos tienen resultado pendiente). |
| **BR-035** | La tabla de participantes del admin (`/admin/participants`) debe implementar el patrón **data-table** de shadcn/ui: columnas con ordenamiento por nombre y estado de pago, filtro por "pago pendiente", y menú contextual por fila (`⋮`) con las acciones "Marcar como pagado / pendiente" y "Resetear contraseña". | A medida que el número de participantes crece (estimado 20-50), una lista sin filtros obliga al admin a recorrerla entera para encontrar participantes con pago pendiente. El filtro por pago pendiente es la acción más frecuente del admin durante el período de inscripción. |
| **BR-037** | La zona del score/inputs de la prediction card debe centrarse matemáticamente mediante **CSS Grid de 3 columnas** (`grid-cols-[1fr_auto_1fr]`): columnas laterales (`1fr`) para el código + bandera de cada equipo, columna central (`auto`) para la hora, el score o los inputs de pronóstico. El centrado debe ser independiente de la longitud de los nombres de equipo. | El layout actual usa `flex justify-center`. Con equipos de nombres asimétricos (ej. "Bosnia y Herzegovina" vs "Canadá"), el score se desplaza visualmente hacia el equipo con nombre más corto. El CSS Grid garantiza que la columna central esté siempre en el centro matemático del card. |
| **BR-038** | El plazo de cierre del partido en la prediction card debe mostrarse **siempre en formato 24 horas** (ej. "Cierra: mar, 10 jun, 00:00"). La función que genera `deadlineAtLabel` debe pasar `hour12: false` a `Intl.DateTimeFormat`. La zona horaria es siempre BOT (`America/La_Paz`). | La función `formatBOT` usada en `dashboard/page.tsx` para `deadlineAtLabel` no establece `hour12: false`, produciendo "03:00 p. m." en locales en español. El horario del partido ya se formatea correctamente en 24h mediante `formatBOTTime`. La inconsistencia dentro del mismo card genera confusión. |
| **BR-039** | La línea de metadatos secundaria de la prediction card debe mostrar **únicamente el plazo de cierre** claramente etiquetado ("Cierra: mié, 10 jun, 00:00") para partidos en estado `scheduled`. El horario del partido no debe repetirse en esta línea (ya es el hero visual central del card). | La meta-line actual incluye "Grupo A · 15:00 · Cierra: mié, 10 jun, 03:00 p. m." — el horario 15:00 duplica el hero central cuando el card está colapsado, y carece de sentido cuando el card está abierto (mostrando los inputs). Eliminar la redundancia simplifica la lectura. |
| **BR-040** | La etiqueta de etapa del partido ("Primera fase", "Octavos de Final", etc.) **no debe repetirse dentro del cuerpo de la prediction card** cuando el fixture ya muestra esa etapa como encabezado de sección. Para partidos eliminatorios donde el encabezado de sección no sea visible como contexto inmediato, puede mantenerse como dato secundario en la meta-line. | Mostrar "Primera fase" en cada card de una sección titulada "Primera fase" duplica información y consume espacio visual. En el fixture agrupado por etapa/jornada, el encabezado provee el contexto necesario. |
| **BR-041** | El botón "Guardar pronóstico" de la prediction card debe tener un **peso visual reducido**: `size="sm"`, alineado a la derecha del área de acción, sin ser full-width. El indicador de carga (`isPending`) se mantiene con spinner dentro del botón. | Con hasta 104 prediction cards en el fixture, un botón full-width de fondo sólido en cada card satura visualmente la página y compite con los CTAs de navegación. Los botones de acción en listas largas deben ser compactos y discretos. |
| **BR-042** | La prediction card debe mostrar un **indicador visual de pronóstico guardado** (ej. ícono de check o texto "Guardado") cuando el participante ya tiene un pronóstico activo para ese partido. El indicador debe ser visible en el estado colapsado del card sin necesidad de expandirlo. El indicador no aplica a partidos con deadline vencido (ahí el card muestra los valores bloqueados). | Con 104 partidos en el fixture, el participante no puede saber de un vistazo cuáles tienen pronóstico guardado. Actualmente debe expandir cada card para verificarlo — esto genera fricción y aumenta el riesgo de pronósticos olvidados. |
| **BR-043** | El hero del card de fixture del admin (zona de equipo / hora / score) debe centrarse matemáticamente mediante **CSS Grid de 3 columnas** (`grid-cols-[1fr_auto_1fr]`), de forma consistente con el card del participante (BR-037). El centrado debe ser independiente de la longitud de los nombres de equipo. | Con equipos de nombres asimétricos como "Bosnia y Herzegovina" vs "Canadá", el hero del card del admin se desplaza visualmente hacia el lado más corto, al igual que en el card del participante. El grid garantiza centrado independiente del contenido lateral. |
| **BR-044** | Los inputs de resultado del card del admin deben iniciar **vacíos** (sin valor por defecto). El `placeholder` de cada input debe ser `—`. El botón "Registrar resultado" debe estar **deshabilitado** hasta que ambos campos contengan un valor numérico ≥ 0. | El valor inicial `0` es ambiguo: el admin no puede distinguir entre "aún no ingresé nada" y "el resultado fue 0-0". El estado vacío con placeholder y botón deshabilitado comunica claramente el estado pendiente del formulario. |
| **BR-045** | El formulario de resultado del card del admin debe mostrar la sección de desempate (AET / Penales) mediante **reveal condicional**: la sección aparece únicamente cuando (a) el partido pertenece a una etapa eliminatoria (`stage ≠ 'group'`) **Y** (b) los dos scores ingresados en los inputs son iguales. La sección incluye: selector AET / Penales, inputs para el marcador final de los 120 min, y selector de equipo ganador visible solo cuando se elige "Penales". Para todos los demás casos (fase de grupos o scores distintos), la sección no existe. | El reveal condicional evita mostrar la complejidad del desempate en los ~72 partidos de fase de grupos (siempre simples) y en los eliminatorios que se definen en 90 min. Mostrar la sección siempre generaría errores del admin (marcaría desempate donde no hubo) y aumentaría la carga cognitiva en cada registro de resultado. |
| **BR-046** | Las páginas de detalle de partido — `/dashboard/matches/[matchId]` (participante) y `/admin/fixture/[matchId]` (admin) — deben mostrar el **marcador real del partido finalizado**: para partidos resueltos en AET o penales, el score que aparece en el encabezado de la página es el marcador de los **120 minutos** (`homeScoreFull — awayScoreFull`), no el de los 90 minutos. Para partidos resueltos en 90 minutos, se sigue mostrando `homeScore — awayScore`. Este comportamiento es consistente con el card del fixture principal (BR-029). | Actualmente las páginas de detalle consultan únicamente `homeScore`/`awayScore`. Un partido que terminó 2-2 en 90 min y 3-2 en el tiempo extra muestra "2 — 2" en el detalle — contradice el score que el participante ve en el fixture principal. La inconsistencia genera confusión. |
| **BR-047** | Las páginas de detalle de partido deben mostrar — debajo del score — el **badge de resolución** (`a.e.t.` / `pen.`) y el **nombre del equipo que avanza** cuando el partido terminó en AET o penales. Este comportamiento es consistente con la prediction card del fixture principal. | Sin el badge ni el nombre del ganador, el detalle de un partido eliminatorio AET/PEN da una imagen incompleta: el participante ve un score pero no puede saber de un vistazo cómo se resolvió el desempate. |
| **BR-048** | Todos los botones que ejecutan operaciones asíncronas (fetch, router.refresh) deben mostrar un **spinner animado** (`Loader2`) junto al label del botón mientras el request está en vuelo, además de estar deshabilitados. El patrón es: `{loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}` antes del texto. | Un botón deshabilitado con texto estático ("Guardando…") no da certeza visual suficiente en conexiones lentas. El spinner animado comunica que el sistema está activo y procesando, reduciendo la incertidumbre del usuario. |
| **BR-049** | Los **campos de texto** (Input) y checkboxes de un formulario deben deshabilitarse (`disabled={loading}`) mientras el request de submit está en vuelo. Aplica a: formulario de nuevo participante, inputs de pronóstico en prediction-card. | Sin deshabilitar los inputs, el usuario puede editar datos mientras el POST está en curso, generando discrepancias entre lo que se envió al servidor y lo que el usuario ve en pantalla. |
| **BR-050** | El botón "Guardar" de `prediction-row` (admin) debe mostrar `"Guardando…"` con spinner durante el POST. El texto anterior era `"…"` — un carácter que parece un error de UI, no un estado de carga. Los inputs de score también deben deshabilitarse durante el loading. | "…" es visualmente ambiguo y no comunica intención. Un usuario al que se le trunca el texto de un botón no sabe si el sistema está procesando o si hay un error de layout. |
| **BR-051** | El `confirm()` nativo del navegador en `prediction-row` (admin) debe reemplazarse por `AlertDialog` de shadcn/ui — consistente con el estándar de la app establecido en BR-036..035. | El `confirm()` nativo rompe el estilo visual de la app y no puede personalizarse. Toda confirmación destructiva usa `AlertDialog`. |
| **BR-052** | El componente `FixtureRealtime` debe mostrar un **toast informativo** (`"Resultados actualizados"`) cuando el suscriptor Realtime detecta un cambio en la tabla `matches` y dispara `router.refresh()`. El toast tiene duración de 2.5 s. | Sin el toast, el contenido de la pantalla cambia de forma silenciosa cuando el admin registra un resultado. El participante ve un "salto" visual sin entender por qué cambiaron los datos. El toast da contexto al refresco. |
| **BR-053** | El listado de partidos del admin (`/admin/fixture`) debe usar `grid gap-3 sm:grid-cols-2`, igual que el fixture del participante: 2 columnas en pantallas `sm`+ y 1 columna en mobile. El skeleton de carga del admin fixture debe reflejar la estructura real del card (hero row con nombre/bandera/hora, línea de metadatos, divisor, área del formulario de resultado con inputs de score y botón) y respetar el mismo layout 2 columnas. | Consistencia visual entre el fixture del participante y el del admin. El skeleton anterior no representaba correctamente la estructura del card, generando un salto visual brusco al completar la carga. |
| **BR-054** | La página de login debe mostrar un **estado de carga** mientras el Server Action está en vuelo: el botón de submit muestra un spinner `Loader2` y cambia el label a "Iniciando sesión…" (deshabilitado); los campos de email y contraseña quedan deshabilitados. Se implementa mediante un componente client `LoginForm` que usa `useFormStatus` de `react-dom`. Extiende BR-048/BR-049 al formulario de login. | Sin estado de carga en el login, el usuario puede pulsar el botón repetidamente o editar los campos mientras la autenticación está en curso, generando requests duplicados y confusión. |
| **BR-055** | La tabla de posiciones debe mostrar un **avatar de 28px** por cada fila de participante: foto (`avatarUrl`) si está disponible, o un círculo de iniciales (primera letra del nombre + primera letra del apellido, fondo zinc) si no. El endpoint `/api/standings` debe incluir `avatarUrl` en el SELECT y en el GROUP BY. Completa el requisito de avatar visible en tabla de posiciones de BR-014/BR-019. | El avatar personaliza la tabla de posiciones, hace más fácil identificar a cada participante de un vistazo y aumenta el engagement del torneo. Sin él, la tabla es una lista de nombres sin identidad visual. |
| **BR-056** | El avatar de cada participante (tabla de posiciones + sidebar) debe mostrar el **badge de la bandera de su campeón elegido** posicionado absolutamente en la esquina inferior derecha del avatar, con un ring blanco para contraste. Especificaciones de tamaño: standings = 10×14px (`h-2.5 w-3.5`), sidebar = 45% del diámetro del avatar. El badge muestra el nombre del equipo en `title` (tooltip on hover). Solo visible si el participante tiene campeón seleccionado. El API de standings debe hacer JOIN con la tabla `teams` (alias `champion_team`) para retornar `championFlagUrl` y `championTeamName`. El sidebar recibe los datos del campeón vía un helper compartido `getLayoutUserData(userId)` en `src/lib/layout-data.ts` que realiza dos queries en paralelo (user + participant JOIN tournament JOIN teams). Los 5 layouts (dashboard, admin, settings, reglas, profile/[userId]) usan este helper y propagan `championFlagUrl`/`championTeamName` por `AppLayout → AppSidebar → UserAvatar`. | El badge de campeón en el avatar comunica de forma compacta y visual la elección estratégica de cada participante sin necesitar texto adicional. Elimina la necesidad de navegar a la página de campeón para ver qué eligió cada uno. |

### Could Have (Deseables)

| ID | Requerimiento | Justificación |
|---|---|---|
| **BR-010** | El sistema podría enviar notificaciones o recordatorios (por email o similar) a los participantes que aún no han ingresado su pronóstico antes de las 23:59. | Reduce la tasa de pronósticos no ingresados (que perjudica la competitividad). No es bloqueante para el torneo. |

---

## 8. Reglas de Negocio

| ID | Regla | Origen |
|---|---|---|
| **RB-01** | La cuota de inscripción es fija en Bs. 500 por participante. No hay variaciones ni descuentos. El pozo total es la suma de todas las cuotas pagadas. | REGLAS §1 |
| **RB-02** | Un participante inscrito no puede retirarse del torneo. Si abandona, pierde su cuota de Bs. 500 y no tiene derecho a devolución alguna. | REGLAS §1 |
| **RB-03** | Solo cuentan los 90 minutos reglamentarios de cada partido, incluyendo el tiempo de descuento (tiempo añadido, p.ej. minutos 90+1 a 90+6). El marcador oficial para pronósticos es el marcador **al pitido final**, incluidos los goles en tiempo de descuento. La prórroga (30 min extra en eliminatoria) y los tiros penales no se consideran. Esto aplica a todos los partidos, incluidos los de fase eliminatoria. **Decisión del cliente: Opción A confirmada el 17-May-2026** — el tiempo de descuento es parte del tiempo reglamentario; el admin ingresa un único marcador (el del pitido final). | REGLAS §2 |
| **RB-04** | El plazo para ingresar o modificar un pronóstico es la las 23:59 (23:59 BOT, hora Bolivia UTC-4) del día del partido. Pasado ese plazo, los pronósticos se bloquean y se publican. | REGLAS §2 |
| **RB-05** | Un pronóstico no ingresado antes del plazo se evalúa como 0-0. Si el resultado final (a 90 min) es 0-0, el participante recibe únicamente 1 punto por acertar el resultado de empate; no recibe los 2 puntos adicionales por marcador exacto, ya que no ingresó el pronóstico de forma intencional. | REGLAS §2 |
| **RB-06** | La elección del Campeón Mundial debe realizarse antes del inicio del partido inaugural del torneo. Una vez realizada, es pública e irrevocable. Al terminar el torneo, si el equipo elegido es campeón, el participante suma +5 puntos a su total. | REGLAS §2 |
| **RB-07** | Distribución del pozo según número de participantes inscritos: (a) 8 o menos: 100 % al 1er lugar. (b) Más de 8: 75 % al 1er lugar y 25 % al 2do lugar. | REGLAS §4 |
| **RB-08** | Reglas de empate en la distribución del pozo: (a) Empate en 1er lugar: los premios del 1er y 2do lugar (75 % + 25 % = 100 %) se dividen en partes iguales entre los empatados; el siguiente clasificado no recibe premio. (b) Empate en 2do lugar (con un único ganador del 1er lugar): el 25 % del 2do lugar se divide en partes iguales entre todos los empatados. | REGLAS §4 |
| **RB-09** | Estado del torneo y efecto en la UI del participante: (a) `draft` — el participante puede iniciar sesión, ver el fixture y elegir campeón, pero no puede ingresar pronósticos. (b) `active` — todo habilitado. (c) `finished` — pronósticos bloqueados, no se puede elegir campeón, la acción de puntos de campeón queda disponible para el admin. | Necesario para gestionar el período previo al inicio del torneo (carga del fixture, inscripción de participantes) sin abrir la ventana de pronósticos. |
| **RB-10** | Desempate en la tabla de posiciones: cuando dos o más participantes tienen el mismo puntaje total, comparten el mismo rango numérico. El orden de presentación dentro del empate es alfabético por nombre (A→Z). El desempate alfabético es solo de visualización — no afecta la distribución del pozo (que usa puntaje únicamente). | Garantiza un orden de presentación determinístico y neutral cuando hay empates. |

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
| R-04 | **Zona horaria fija:** Todos los plazos (23:59 del día anterior) se calculan en hora Bolivia (BOT, UTC-4). El sistema debe respetar esta zona horaria independientemente del servidor o del huso horario del usuario. |
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
- Publicación automática de pronósticos a las 23:59 del día anterior.
- Tabla de posiciones en tiempo real (Supabase Realtime).
- Vista de detalle de partidos: pronósticos de todos los participantes (post-publicación).
- Cálculo y visualización de la distribución del pozo al final del torneo.
- Carga manual de pronósticos por el administrador (fallback de WhatsApp).
- Diseño responsive optimizado para mobile (los participantes usan smartphone).
- Perfil de participante: foto de perfil (subida y cambio por el propio usuario, almacenada en Supabase Storage, visible en standings y vista de pronósticos).
- Perfil público de participante: estadísticas (% resultados, % exactos, racha), pronósticos post-deadline, campeón elegido.
- Perfil privado (solo el propio participante): estado de pago, brecha con el líder, cambio de contraseña.
- Gestión de partidos eliminatorios con equipos TBD: pre-carga con fechas y asignación tardía de equipos; alerta en panel admin cuando el deadline se acerca con equipos sin asignar.
- Página de reglas del torneo: accesible desde la navbar, contenido estático en lenguaje de usuario.
- Sidebar de navegación (shadcn/ui): avatar del usuario en el header, ítems de navegación, sección Admin condicional.
- Avatar del usuario visible en: sidebar header, tabla de posiciones, vista de pronósticos post-deadline, página de perfil.
- Página de settings (/settings): foto de perfil, cambio de contraseña, estado de pago.
- Panel de configuración del torneo para admin (/admin/settings): nombre, estado, acción de puntos de campeón.
- Página de detalle de partido (/dashboard/matches/[matchId]): pronósticos post-deadline de todos los participantes y puntos obtenidos.
- Página de Campeón (/dashboard/champion): selector de campeón propio (antes del torneo) y vista pública de los picks de todos los participantes.
- Perfil público con tabs: Resumen (stats, campeón) y Desglose (puntos partido a partido).
- Sistema de feedback global (toasts via shadcn/ui Sonner) para confirmaciones de acciones.
- Filtro "Solo partidos abiertos" en el fixture del participante (toggle en /dashboard).
- Reseteo de contraseña de participante por el admin desde el panel de participantes.
- Matriz de estados del torneo (draft/active/finished) con efectos sobre las acciones disponibles.
- Panel de inicio del admin (/admin): resumen de estado del torneo (participantes, partidos, predicciones, pozo).
- Lista de participantes en admin: columnas definidas (nombre, email, estado de pago, campeón, fecha) con toggle de pago inline.
- Creación de cuentas sin email de confirmación: `email_confirm: true` en Supabase Auth Admin API para evitar emails automáticos al participante.
- Teclado numérico en campos de score en mobile (`inputMode="numeric"`).

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
| **RK-02** | Un participante no puede acceder a la plataforma antes de las 23:59 (fallo de internet, credenciales olvidadas). | Media | Medio | Canal de WhatsApp como fallback oficial; el admin puede cargar el pronóstico manualmente antes del plazo. |
| **RK-03** | El fixture oficial del Mundial 2026 sufre cambios de horario o reprogramaciones por la FIFA. | Baja | Alto | El admin debe poder editar fechas y horarios de partidos desde el panel de administración; el sistema recalcula los plazos automáticamente. |
| **RK-04** | La plataforma (Vercel/Supabase) experimenta caída justo antes del cierre de pronósticos a las 15:00. | Baja | Alto | Plan de fallback documentado: participantes envían pronóstico por WhatsApp; el admin los carga manualmente cuando se restablezca el servicio. |
| **RK-05** | El desarrollo no queda listo antes del partido inaugural del Mundial, impidiendo que los participantes elijan su Campeón Mundial. | Baja-Media | Muy Alto | Priorizar en desarrollo: auth + pronóstico de campeón + pronóstico de partidos de fase de grupos (funcionalidades críticas). Tabla de posiciones y panel completo pueden desplegarse en iteraciones posteriores pero antes del inicio del torneo. |
| **RK-06** | Disputas entre participantes por la interpretación de reglas de empate o del caso del pronóstico 0-0 no ingresado. | Media | Medio | Las reglas de negocio están documentadas y son visibles en la plataforma. El sistema aplica las reglas de forma consistente y auditable. Se recomienda que el cliente comunique las reglas antes del inicio del torneo. |
| **RK-07** | Un participante intenta manipular su pronóstico después de las 23:59. | Baja | Alto | El sistema bloquea la edición a nivel de aplicación y de base de datos (RLS en Supabase). Los logs de auditoría permiten verificar cualquier intento. |

---

## 12. Trazabilidad a PRD / FSD

La siguiente tabla mapea los requerimientos de negocio de este BRD a las secciones esperadas del PRD (Product Requirements Document) y del FSD (Functional Specification Document) que se elaborarán en fases siguientes.

| ID BRD | Requerimiento de negocio | Módulo PRD | Sección FSD |
|---|---|---|---|
| **BR-001** | Gestión manual de cuentas por el administrador | Gestión de Usuarios | FSD §Administración de Usuarios: flujo de creación, roles, credenciales |
| **BR-002** | Ingreso de pronósticos con plazo 23:59 BOT | Módulo de Pronósticos | FSD §Pronósticos: UI de ingreso, validación de plazo, zona horaria |
| **BR-003** | Motor de puntos (+1/+2/max 3) | Motor de Puntos | FSD §Motor de Puntos: algoritmo de cálculo, casos de prueba |
| **BR-004** | Caso especial: pronóstico no ingresado = 0-0 | Motor de Puntos | FSD §Motor de Puntos: caso especial 0-0 por defecto |
| **BR-005** | Bloqueo y publicación automática a las 23:59 | Módulo de Pronósticos | FSD §Pronósticos: lógica de cierre, visibilidad post-plazo |
| **BR-006** | Tabla de posiciones en tiempo real | Tabla de Posiciones | FSD §Tabla de Posiciones: Supabase Realtime, ranking, puntaje acumulado |
| **BR-007** | Pronóstico del Campeón Mundial (+5 pts) | Módulo de Pronósticos | FSD §Campeón Mundial: selector, visibilidad pública, cálculo al final |
| **BR-008** | Distribución del pozo y reglas de empate | Módulo de Premiación | FSD §Distribución del Pozo: algoritmo, umbrales, casos de empate |
| **BR-009** | Carga manual de pronósticos por admin (fallback) | Gestión de Administración | FSD §Panel Admin: carga manual, registro de fuente, restricción de plazo |
| **BR-010** | Recordatorios / notificaciones de plazo | (Could Have — v2) | FSD §Notificaciones (v2) |
| **RB-01** | Cuota fija Bs. 500 — cálculo del pozo | Gestión de Inscripciones | FSD §Inscripción: registro de pago, cálculo automático del pozo total |
| **RB-02** | No retiro una vez inscrito | Gestión de Inscripciones | FSD §Inscripción: estado de cuenta, política de no devolución |
| **RB-03** | Solo 90 minutos reglamentarios | Motor de Puntos | FSD §Motor de Puntos: definición del resultado oficial |
| **RB-04** | Plazo 23:59 BOT día anterior | Módulo de Pronósticos | FSD §Pronósticos: cálculo de deadline, zona horaria BOT (UTC-4) |
| **RB-05** | Penalización pronóstico no ingresado (0-0 default) | Motor de Puntos | FSD §Motor de Puntos: flag `ingresado_manualmente`, caso 0-0 |
| **RB-06** | Campeón Mundial: irrevocable, público, +5 pts | Módulo de Pronósticos | FSD §Campeón Mundial: visibilidad, bloqueo post-selección |
| **RB-07** | Distribución 100 % / 75-25 % según inscritos | Módulo de Premiación | FSD §Distribución del Pozo: umbral 8 participantes |
| **RB-08** | Empates en 1er y 2do lugar | Módulo de Premiación | FSD §Distribución del Pozo: casos de empate, fusión de premios |
| **BR-014** | Foto de perfil: subida, cambio, visibilidad pública | Perfil de Participante | FSD-UC-011: gestión de foto de perfil |
| **BR-015** | Perfil público del participante (estadísticas) | Perfil de Participante | FSD-UC-012: ver perfil público |
| **BR-016** | Perfil privado (estado de pago, brecha, contraseña) | Perfil de Participante | FSD-UC-013: gestionar perfil privado |
| **BR-017** | Partidos eliminatorios TBD + alerta admin | Gestión del Fixture | FSD-UC-007 (flujo de asignación eliminatoria) + FSD-UC-014 (alerta admin) |
| **BR-018** | Página de reglas del torneo | Información / UX | FSD-UC-014: página de reglas |
| **BR-019** | Sidebar de navegación con avatar | UI / Layout | FSD-UC-015: layout con sidebar y avatar |
| **BR-020** | Página de settings del participante | Configuración de cuenta | FSD-UC-016: gestión de settings |
| **BR-021** | Configuración del torneo (admin) | Panel de administración | FSD-UC-017: admin configura el torneo |
| **BR-022** | Página de detalle de partido con pronósticos post-deadline | Vista de partido | FSD-UC-018: detalle de partido |
| **BR-023** | Resultado completo en eliminatoria (a.e.t. / pen.) | Registro de resultados | FSD-UC-004 (actualización) + schema matches |
| **BR-024** | Fixture con banderas y agrupación por jornada | Fixture / UX | FSD-UC-021 (nuevo) |
| **BR-025** | Tabla de clasificación de grupos | Fixture / Grupos | FSD-UC-020 (nuevo) |
| **BR-030** | Breadcrumbs dinámicos en header | UI / Layout | FSD-UC-015 (actualización) |
| **BR-031** | Sidebar Admin colapsable (sidebar-07) | UI / Layout | FSD-UC-015 (actualización) |
| **BR-032** | Sidebar labels sin duplicados | UI / Layout | FSD-UC-015 (actualización) |
| **BR-033** | Login page card centrado (login-01) | Autenticación / UX | FSD-UC-001 (actualización) |
| **BR-034** | Admin home stat cards (dashboard-01) | Panel Admin | FSD-UC-019 (actualización) |
| **BR-035** | Tabla participantes con data-table | Panel Admin | FSD-UC-022 (nuevo) |
| **BR-036** | Auto-bracket eliminatorio (análisis pendiente) | Gestión del Fixture | Pendiente — v2 |
| **BR-037** | Prediction card — score centrado con CSS Grid 3 columnas | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-038** | Prediction card — deadline en formato 24h | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-039** | Prediction card — meta-line sin redundancias | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-040** | Prediction card — sin etiqueta de etapa duplicada | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-041** | Prediction card — botón de acción compacto | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-042** | Prediction card — indicador visual de pronóstico guardado | Fixture / UX | FSD-UC-002 (actualización) |
| **BR-043** | Admin fixture card — hero centrado con CSS Grid 3 columnas | Admin / Fixture UX | FSD-UC-004 (actualización) |
| **BR-044** | Admin fixture card — inputs vacíos con placeholder, botón deshabilitado | Admin / Fixture UX | FSD-UC-004 (actualización) |
| **BR-045** | Admin fixture card — reveal condicional de sección AET/PEN | Admin / Fixture UX | FSD-UC-004 (actualización) |
| **BR-046** | Detalle de partido — score real (120 min) para AET/PEN | Fixture / UX | FSD-UC-018 (actualización) |
| **BR-047** | Detalle de partido — badge de resolución y equipo que avanza | Fixture / UX | FSD-UC-018 (actualización) |
| **BR-048** | Spinner Loader2 animado en todos los botones async | UX / Feedback de carga | PRD-REQ-101 |
| **BR-049** | Inputs deshabilitados durante submit en formularios | UX / Integridad de datos | PRD-REQ-102..103 |
| **BR-050** | prediction-row — label "Guardando…" con spinner, inputs bloqueados | UX / Admin Fixture | PRD-REQ-104 |
| **BR-051** | prediction-row — confirm() nativo → AlertDialog | UX / Consistencia shadcn | PRD-REQ-105 |
| **BR-052** | FixtureRealtime — toast "Resultados actualizados" en refresh | UX / Realtime feedback | PRD-REQ-106 |
| **BR-053** | Admin fixture — grid 2 columnas + skeleton actualizado | Admin / Fixture UX | PRD US-049, FSD IN-29 |
| **BR-054** | Login page — loading state via useFormStatus (LoginForm client component) | Autenticación / UX | PRD US-050, FSD IN-30 |
| **BR-055** | Standings table — avatar 28px por fila (foto o iniciales). `/api/standings` incluye `avatarUrl` | Tabla de Posiciones | PRD US-051, FSD IN-31 |
| **BR-056** | Champion flag badge en avatar (standings + sidebar). `getLayoutUserData` helper compartido | Perfil / Avatar / Layout | PRD US-052, FSD IN-32 |
| **BR-027** | Código FIFA de 3 letras en tarjeta de partido | Fixture / UX mobile | FSD-UC-021 (actualización) + schema teams |
| **BR-028** | Layout centrado en hora/score en tarjeta de partido | Fixture / UX | FSD-UC-021 (actualización) |
| **RB-09** | Estados del torneo y efectos en UI | Gestión del Torneo | FSD-UC-017 (admin) + Matriz de estados |
| **RB-10** | Desempate alfabético en standings | Tabla de Posiciones | FSD-UC-003 (standings tiebreaker) |
| Técnico | Creación de usuarios sin email de confirmación (email_confirm: true) | Gestión de Usuarios | FSD-UC-005 (decisión técnica) |
| Técnico | Admin landing page con stats del torneo | Panel Admin | FSD-UC-019: admin home |

---

## 13. Glosario

| Término | Definición |
|---|---|
| **Pozo** | Total del dinero recaudado por las cuotas de inscripción de todos los participantes (N × Bs. 500). |
| **Pronóstico** | Predicción del marcador exacto (goles local – goles visitante) que un participante ingresa para un partido antes del plazo. |
| **Score exacto** | Coincidencia exacta entre el pronóstico de un participante y el resultado oficial del partido a 90 minutos. |
| **Resultado** | Desenlace del partido en términos de victoria local (V), empate (E) o victoria visitante (D), independientemente del marcador. |
| **BOT** | Bolivia Time, UTC-4. Zona horaria oficial para todos los plazos del torneo. |
| **Deadline** | 23:59 BOT del día del partido. |
| **Fallback** | Mecanismo alternativo (WhatsApp + carga manual por el admin) para registrar pronósticos en caso de fallo de la plataforma. |
| **Campeón Mundial** | Equipo elegido por el participante como ganador del Mundial 2026. Se elige antes del partido inaugural y vale +5 puntos si acierta. |
| **Admin** | El organizador (Vladimir Mariaca Vargas) en su rol de administrador del sistema. |
| **Fixture** | Lista completa de los partidos del Mundial 2026 con fechas, horarios y equipos. |

---

*Documento elaborado por Alberto Gomez · 15-May-2026 · Versión 0.1 — Sujeto a revisión y aprobación del cliente.*
