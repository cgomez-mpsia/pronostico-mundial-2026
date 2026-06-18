"use client";

import type { LiveEvent, LiveEventType } from "@/lib/espn";
import type { MomentumPoint } from "@/lib/momentum";

interface Props {
  momentum: MomentumPoint[];
  events: LiveEvent[];
  maxMinute: number;
  homeColor: string; // hex sin '#'
  awayColor: string;
  homeCode: string;
  awayCode: string;
  homeFlagUrl: string | null;
  awayFlagUrl: string | null;
}

const EVENT_ICON: Record<LiveEventType, string> = {
  goal: "⚽",
  yellow: "🟨",
  red: "🟥",
  sub: "🔁",
  other: "•",
};

const EVENT_LABEL: Record<LiveEventType, string> = {
  goal: "Gol",
  yellow: "Amarilla",
  red: "Roja",
  sub: "Cambio",
  other: "",
};

export function MomentumChart({
  momentum,
  events,
  maxMinute,
  homeColor,
  awayColor,
  homeCode,
  awayCode,
  homeFlagUrl,
  awayFlagUrl,
}: Props) {
  const home = `#${homeColor}`;
  const away = `#${awayColor}`;
  const span = Math.max(45, maxMinute);
  const pct = (minute: number) => `${Math.min(100, (minute / span) * 100)}%`;

  // Eventos destacables sobre la línea: goles y tarjetas. Los cambios se omiten
  // del gráfico (se agrupan al minuto 45 y se apelmazan); quedan en el detalle.
  const markers = events.filter((e) => e.type === "goal" || e.type === "red" || e.type === "yellow");

  return (
    <div className="select-none">
      {/* Leyenda */}
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-zinc-500">
        <span className="flex items-center gap-1.5">
          {homeFlagUrl && <img src={homeFlagUrl} alt="" className="h-3 w-[18px] rounded-[2px] object-cover" />}
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: home }} />
          {homeCode}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-400">Dinámica del partido</span>
        <span className="flex items-center gap-1.5">
          {awayCode}
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: away }} />
          {awayFlagUrl && <img src={awayFlagUrl} alt="" className="h-3 w-[18px] rounded-[2px] object-cover" />}
        </span>
      </div>

      {/* Área del gráfico */}
      <div className="relative h-32 w-full overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
        {/* Barras de momentum: una columna por minuto */}
        <div className="absolute inset-0 flex items-stretch">
          {momentum.map((p) => {
            const up = p.value > 0;
            const h = `${Math.abs(p.value) * 100}%`;
            return (
              <div key={p.minute} className="flex h-full flex-1 flex-col">
                <div className="flex h-1/2 items-end justify-center">
                  {up && (
                    <div
                      className="w-full rounded-t-[1px]"
                      style={{ height: h, background: `linear-gradient(to top, ${home}, ${home}33)` }}
                    />
                  )}
                </div>
                <div className="flex h-1/2 items-start justify-center">
                  {!up && p.value < 0 && (
                    <div
                      className="w-full rounded-b-[1px]"
                      style={{ height: h, background: `linear-gradient(to bottom, ${away}, ${away}33)` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Línea base central */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-300 dark:bg-zinc-600" />

        {/* Divisor de medio tiempo */}
        {span > 45 && (
          <div
            className="absolute inset-y-2 w-px border-l border-dashed border-zinc-300 dark:border-zinc-600"
            style={{ left: pct(45) }}
          />
        )}

        {/* Marcadores de eventos sobre la línea base */}
        {markers.map((e, i) => (
          <div
            key={`${e.minuteValue}-${i}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] leading-none"
            style={{ left: pct(e.minuteValue), top: e.side === "home" ? "calc(50% - 9px)" : "calc(50% + 9px)" }}
            title={`${EVENT_LABEL[e.type]} ${e.minute} · ${e.player}`}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
              {EVENT_ICON[e.type]}
            </span>
          </div>
        ))}
      </div>

      {/* Eje de tiempo */}
      <div className="relative mt-1 h-3 text-[10px] font-medium text-zinc-400">
        <span className="absolute left-0">IN</span>
        <span className="absolute -translate-x-1/2" style={{ left: pct(45) }}>MT</span>
        <span className="absolute right-0">{span >= 90 ? "F" : `${span}'`}</span>
      </div>
    </div>
  );
}
