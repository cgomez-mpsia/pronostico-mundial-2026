import type { LiveEvent, LiveEventType } from "@/lib/espn";

const EVENT_ICON: Record<LiveEventType, string> = {
  goal: "⚽",
  yellow: "🟨",
  red: "🟥",
  sub: "🔁",
  other: "•",
};

const EVENT_LABEL: Record<LiveEventType, string> = {
  goal: "Gol",
  yellow: "Tarjeta amarilla",
  red: "Tarjeta roja",
  sub: "Cambio",
  other: "Incidencia",
};

interface Props {
  events: LiveEvent[];
  homeCode: string;
  awayCode: string;
  homeFlagUrl: string | null;
  awayFlagUrl: string | null;
}

/**
 * Línea de tiempo de incidencias a dos lados: eventos del equipo local a la
 * izquierda, del visitante a la derecha, con el minuto en el centro. Cada evento
 * viene atribuido a su equipo (LiveEvent.side) desde el summary de ESPN.
 */
export function MatchTimeline({ events, homeCode, awayCode, homeFlagUrl, awayFlagUrl }: Props) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      {/* Cabecera: equipos a cada lado */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <span className="flex items-center justify-start gap-1.5 text-xs font-semibold">
          {homeFlagUrl && <img src={homeFlagUrl} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />}
          {homeCode}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Incidencias</span>
        <span className="flex items-center justify-end gap-1.5 text-xs font-semibold">
          {awayCode}
          {awayFlagUrl && <img src={awayFlagUrl} alt="" className="h-3.5 w-5 rounded-[2px] object-cover" />}
        </span>
      </div>

      {/* Filas: local izquierda · minuto · visitante derecha */}
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {events.map((e, i) => {
          const icon = (
            <span className="shrink-0" title={EVENT_LABEL[e.type]}>
              {EVENT_ICON[e.type]}
            </span>
          );
          const isGoal = e.type === "goal";
          const isSub = e.type === "sub";
          const home = e.side === "home";
          const name = isSub ? (
            // Cambio: quién entra (verde ↑) y quién sale (rojo ↓), una línea cada uno.
            <span className={`flex flex-col gap-0.5 ${home ? "items-end" : "items-start"}`}>
              <span className="inline-flex items-center gap-1 text-success">
                {home ? <>{e.playerIn} <span aria-hidden>↑</span></> : <><span aria-hidden>↑</span> {e.playerIn}</>}
              </span>
              {e.playerOut && (
                <span className="inline-flex items-center gap-1 text-xs text-live">
                  {home ? <>{e.playerOut} <span aria-hidden>↓</span></> : <><span aria-hidden>↓</span> {e.playerOut}</>}
                </span>
              )}
            </span>
          ) : (
            <span className={isGoal ? "font-semibold" : "text-zinc-600 dark:text-zinc-300"}>
              {e.player || EVENT_LABEL[e.type]}
            </span>
          );
          return (
            <li key={`${e.minuteValue}-${i}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-2.5 text-sm">
              {/* Local */}
              <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                {e.side === "home" && (
                  <>
                    {name}
                    {icon}
                  </>
                )}
              </div>
              {/* Minuto */}
              <span className="w-14 shrink-0 text-center text-xs font-medium tabular-nums text-zinc-400">
                {e.minute}
              </span>
              {/* Visitante */}
              <div className="flex min-w-0 items-center justify-start gap-2">
                {e.side === "away" && (
                  <>
                    {icon}
                    {name}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
