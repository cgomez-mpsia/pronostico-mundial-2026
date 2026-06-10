# 🏆 Reglas — Pronóstico Mundial 2026
### EE.UU. · México · Canadá

> Reglas definidas por el cliente. Fuente: imágenes WhatsApp (15-May-2026).

---

## 1. Inscripción y Participantes

- **Límite de participantes:** No hay límite de participantes.
- **Cuota de inscripción:** La cuota fija para participar es de **Bs. 500**.
- Para participar, cada jugador debe depositar la cuota de inscripción.
- El organizador **sí participa** como un jugador más y puede ganar el pozo.
- **Registro:** El registro es **manual**. El organizador crea todas las cuentas en la plataforma y les entrega las credenciales (usuario/contraseña) a cada participante de forma privada (ej. vía WhatsApp).
- **Una vez inscrito, no podrá retirarse** hasta terminar el torneo — si abandona, **pierde su cuota**.

---

## 2. Sistema de Puntos por Partido ⭐ (NUEVO)

> Este sistema reemplaza al del PDF original. Es más simple y directo.

Por cada partido, un participante puede ganar **hasta 3 puntos**:

| Condición | Puntos |
|---|---|
| Acierta el **resultado** del partido (victoria local, empate o victoria visitante) | **+1 punto** |
| Acierta el **score exacto** en los 90 minutos reglamentarios | **+2 puntos adicionales** |
| **Máximo por partido** | **3 puntos** |
| **Pronóstico del Campeón Mundial** (Elegido al inicio del torneo) | **+5 puntos** |

### Reglas clave del pronóstico
- **Pronóstico del Campeón:** Antes del inicio del primer partido del mundial, se debe elegir al equipo campeón. Si acierta, suma 5 puntos al final del torneo.
- **Partidos no pronosticados:** Si un jugador olvida llenar su pronóstico antes de la medianoche del día del partido, visualmente en el sistema aparecerá el mensaje **"No pronosticó"** (para evitar confusiones). Internamente el sistema lo evaluará como **0 - 0 por defecto**. Sin embargo, si el partido termina realmente 0-0, el jugador **solo ganará 1 punto** (por acertar el resultado de empate), perdiendo el derecho a los 3 puntos por score exacto ya que no ingresó el pronóstico intencionalmente.
- Solo cuentan los **90 minutos reglamentarios** — la prórroga y los tiros penales **no se toman en cuenta**.
- Esto aplica para **todos los partidos**, incluidos los de eliminatorias.
- Los pronósticos deben enviarse **antes de la medianoche del día del partido al partido**.
- A partir de la medianoche, los pronósticos de todos los participantes se **mostrarán públicamente** y ya **no pueden modificarse**.

---

## 3. Tabla de Posiciones

- Se mantiene una tabla **permanente y pública** con los puntos acumulados de todos los participantes durante el torneo.
- La tabla se actualiza conforme se van jugando los partidos.

---

## 4. Ganador y Premios

- El **vencedor** es el jugador que acumule la **mayor cantidad de puntos** al final del torneo.
- **Distribución del Pozo:** 
  - Si hay **8 o menos participantes**, el primer lugar se lleva el **100% del pozo**.
  - Si hay **más de 8 participantes**, el premio se reparte: **75% para el 1er lugar** y **25% para el 2do lugar**.
- **Empate:** 
  - Si dos o más jugadores empatan en el **primer lugar**, se fusionan los premios del 1er y 2do lugar (75% + 25% = 100%) y se **dividen en partes iguales** entre ellos (ej. 50% cada uno si son dos). En este caso, el siguiente jugador en la tabla no recibe premio.
  - Si existe empate en el **segundo lugar** (habiendo un solo ganador del 1er lugar), el 25% se divide en partes iguales entre los empatados en esa posición.

> ✅ **Confirmado por el cliente**: Ya no hay premio MVP, pero se agregó un premio para el 2do lugar si hay buena cantidad de inscritos, con reglas claras de empate.

---

## 5. Visibilidad, Transparencia y Fallbacks

- **Pronóstico del Campeón:** Las elecciones de cada jugador se hacen públicas **desde el principio del torneo** (antes del partido inaugural) para evitar susceptibilidades.
- **Pronósticos de Partidos:** 
  - Antes de la medianoche del día anterior a cada partido: son **privados**.
  - Después de las 15:00: los pronósticos de **todos los participantes se hacen visibles**. Si no llenaron, dice "No pronosticó".
- Nadie puede modificar su pronóstico una vez publicado (pasada la medianoche).
- **Fallback en WhatsApp:** Se habilitará un grupo de WhatsApp oficial. Si la app falla por algún motivo, los participantes pueden enviar su pronóstico por el grupo hasta la hora límite (medianoche) y el organizador actualizará la app cuando se restablezca.

---

## 6. Flujo resumido

```text
Inscripción (pago de cuota → habilitación)
    ↓
Inicio del torneo: 
  • Pronóstico del Campeón Mundial (+5 pts posibles al final)
    ↓
Por cada partido:
  • Ingresar pronóstico (score exacto en 90 min)
  • Plazo: medianoche del día del partido (Si olvida: 0-0 automático, max 1 pt)
  • A medianoche → pronósticos se publican y se bloquean
    ↓
Resultado del partido:
  • +1 si acertó resultado (V/E/D)
  • +2 adicionales si acertó score exacto (si lo ingresó manualmente)
    ↓
Tabla de posiciones actualizada en tiempo real
    ↓
Final del torneo → Sumar puntos del Campeón Mundial
    ↓
Repartir Pozo: 
  • <= 8 jugadores: 100% al 1ro
  • > 8 jugadores: 75% al 1ro, 25% al 2do
```

---

## 7. Requerimientos Técnicos para la App

| Módulo | Descripción |
|---|---|
| **Gestión de Usuarios** | Solo el administrador (organizador) puede crear cuentas manualmente. |
| **Inscripción y Pozo** | El admin registra el pago de la cuota (Bs. 500). El pozo es la suma de todos los aportes. |
| **Fixture** | Lista de partidos con fecha/hora, con plazo calculado automáticamente (medianoche del día del partido) |
| **Pronóstico** | Input de score por partido (bloqueado pasado el plazo). Selector de campeón antes del torneo. |
| **Motor de puntos** | +1 por resultado, +2 por score exacto (solo 90 min). +5 por campeón. 0-0 por defecto = max 1 pt. |
| **Visibilidad** | Pronósticos privados hasta el plazo. Campeón visible desde el inicio. Textos de "No pronosticó" visibles. |
| **Tabla de posiciones** | Ranking en tiempo real, actualizado tras cada partido |
| **Gestión del pozo** | Distribución 100% o 75/25 basada en cantidad de inscritos (> 8) |
| **Fallback (Fuera de App)** | En caso de caída de sistema, el administrador puede cargar manualmente pronósticos enviados por WhatsApp a tiempo. |

---

---

*Documento actualizado: 15-May-2026 — Fuente: imágenes WhatsApp del cliente (Vladimir Mariaca Vargas)*
