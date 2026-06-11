import { db } from "@/db";
import { tournaments } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export default async function ReglasPage() {
  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { name: true, inscriptionFee: true },
  });

  const fee = tournament?.inscriptionFee
    ? Number(tournament.inscriptionFee).toLocaleString("es-BO")
    : "—";

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Reglas del Torneo</h1>
        {tournament && <p className="text-sm text-zinc-500">{tournament.name}</p>}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Inscripción
        </h2>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Cuota fija de <strong>Bs. {fee}</strong> por participante.</li>
          <li>No hay límite de participantes.</li>
          <li>Una vez inscrito no es posible retirarse — la cuota no se devuelve.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Pronósticos
        </h2>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Cada participante pronostica el <strong>marcador exacto</strong> de cada partido.</li>
          <li>Solo cuentan los <strong>90 minutos reglamentarios</strong> — prórroga y penales no se consideran.</li>
          <li>
            El plazo de cierre es <strong>1 hora antes</strong> del inicio de cada partido.
            Pasada esa hora los pronósticos se bloquean y se publican públicamente.
          </li>
          <li>
            Si no ingresas un pronóstico antes del cierre, el sistema lo registra internamente como <strong>0-0</strong>.
            Si el partido termina 0-0, obtienes 1 punto por acertar el resultado, pero nunca los +2 de score exacto.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Sistema de Puntos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="pb-2 pr-6 font-medium">Condición</th>
                <th className="pb-2 font-medium text-right">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-2 pr-6">Acertar el resultado (victoria / empate / derrota)</td>
                <td className="py-2 text-right tabular-nums font-medium">+1</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Acertar el score exacto (ingresado manualmente)</td>
                <td className="py-2 text-right tabular-nums font-medium">+2 adicionales</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Máximo por partido</td>
                <td className="py-2 text-right tabular-nums font-medium">3</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Acertar el Campeón Mundial</td>
                <td className="py-2 text-right tabular-nums font-medium">+5</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-400">
          La elección del campeón es pública desde el inicio y puede modificarse hasta que comience la fase de cuartos de final.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Distribución del Pozo
        </h2>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li><strong>8 participantes o menos:</strong> el 100% del pozo al 1er lugar.</li>
          <li><strong>Más de 8 participantes:</strong> 75% al 1er lugar y 25% al 2do lugar.</li>
          <li>En caso de empate en el 1er lugar: los premios del 1ro y 2do se fusionan y se dividen en partes iguales entre los empatados.</li>
          <li>En caso de empate en el 2do lugar: el 25% se divide en partes iguales entre los empatados.</li>
        </ul>
      </section>
    </div>
  );
}
