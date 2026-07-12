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
            Puedes ingresar o modificar tu pronóstico <strong>hasta que comience el partido</strong>.
            Al inicio del partido los pronósticos se bloquean y se publican públicamente.
          </li>
          <li>
            Si no ingresas un pronóstico antes del cierre, el sistema lo registra internamente como <strong>0-0</strong>.
            Si el partido termina en empate, obtienes 1 punto por acertar el resultado, pero nunca los +2 de score exacto.
          </li>
          <li>
            <strong>Importante:</strong> los partidos que <strong>no pronostiques</strong> solo pueden darte un{" "}
            <strong>máximo de 2 puntos en todo el torneo</strong> (en total, sumando todos). Una vez alcanzado ese tope,
            los demás partidos sin pronóstico valen <strong>0</strong>. Los puntos de partidos que sí pronosticas y los del
            campeón no tienen ese límite.
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
          La elección del campeón es pública desde el inicio y puede modificarse hasta que comiencen las semifinales.
        </p>
      </section>

      {/* BR-057: regla del clasificado en eliminatorias (desde octavos) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Eliminatorias — el Clasificado (desde Octavos)
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          A partir de <strong>octavos de final</strong>, además del marcador debes elegir{" "}
          <strong>qué selección clasifica</strong> a la siguiente ronda. Es{" "}
          <strong>obligatorio</strong>: la app no te deja guardar el pronóstico sin marcarlo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="pb-2 pr-6 font-medium">Acierto</th>
                <th className="pb-2 font-medium text-right">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y text-zinc-700 dark:text-zinc-300">
              <tr>
                <td className="py-2 pr-6">Acertar el resultado a 90&apos; (gana / empata / pierde)</td>
                <td className="py-2 text-right tabular-nums font-medium">+1</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Acertar el marcador exacto a 90&apos;</td>
                <td className="py-2 text-right tabular-nums font-medium">+2</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Acertar quién clasifica</td>
                <td className="py-2 text-right tabular-nums font-medium">+1</td>
              </tr>
              <tr>
                <td className="py-2 pr-6 font-medium">Máximo por partido</td>
                <td className="py-2 text-right tabular-nums font-semibold">4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            El marcador sigue contando <strong>solo los 90 minutos</strong>: la prórroga y los
            penales no suman goles al marcador.
          </li>
          <li>
            El <strong>clasificado</strong> se mide por el resultado <strong>final</strong> de la
            llave: da igual si se define en los 90&apos;, en tiempo extra o en penales.
          </li>
          <li>
            Aplica a <strong>octavos, cuartos, semifinales, tercer puesto y final</strong>. En la
            final y el tercer puesto se entiende como <strong>quién gana el partido</strong>; en la
            final, ese punto es aparte del bono de +5 por acertar al Campeón.
          </li>
          <li>
            En fase de grupos y dieciseisavos no cambia nada: sigue siendo máximo{" "}
            <strong>3 puntos</strong> por partido.
          </li>
        </ul>
        <p className="text-xs text-zinc-400">
          Ejemplo: pronosticas 1-1 y eliges a Argentina. Termina 1-1 y Argentina gana por penales →
          2 (exacto) + 1 (empate a 90&apos;) + 1 (clasificado) = 4 puntos. Si pronosticabas Brasil 2-1 y
          Brasil pasa por penales tras un 1-1, ganas solo el +1 del clasificado.
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
