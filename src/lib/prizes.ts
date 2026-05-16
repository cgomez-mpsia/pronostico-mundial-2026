// Distribución del pozo · BR-007, BR-008

export type Standing = {
  participantId: string;
  totalPoints: number;
};

export type PrizeResult = {
  participantId: string;
  totalPoints: number;
  rank: number;
  prize: number; // monto en Bs. (floor a 2 decimales)
};

/**
 * Calcula la distribución del pozo entre los participantes.
 *
 * BR-007: ≤8 participantes → 100% al 1ro
 *         >8 participantes → 75% al 1ro, 25% al 2do
 * BR-008: Empate en 1ro → fusionar 100% y dividir entre empatados (el siguiente no cobra)
 *         Empate en 2do → dividir el 25% entre los empatados
 */
export function calculatePrizes(
  standings: Standing[],
  totalPool: number
): PrizeResult[] {
  if (standings.length === 0) return [];

  const sorted = [...standings].sort((a, b) => b.totalPoints - a.totalPoints);
  const participantCount = sorted.length;

  // Asignar rank (los empatados comparten el mismo rank)
  const ranked: (Standing & { rank: number })[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const rank =
      i === 0 ? 1
      : sorted[i - 1].totalPoints === sorted[i].totalPoints
        ? ranked[i - 1].rank
        : i + 1;
    ranked.push({ ...sorted[i], rank });
  }

  // Determinar estructura de premios · BR-007
  const use75_25 = participantCount > 8;
  const prize1st = use75_25 ? totalPool * 0.75 : totalPool;
  const prize2nd = use75_25 ? totalPool * 0.25 : 0;

  const firstPlacePoints = ranked[0].totalPoints;
  const firstPlaceGroup = ranked.filter((r) => r.totalPoints === firstPlacePoints);

  // BR-008a: empate en 1ro → fusionar 1ro + 2do y dividir entre todos los empatados
  if (firstPlaceGroup.length > 1) {
    const sharedPrize = floor2((prize1st + prize2nd) / firstPlaceGroup.length);
    return ranked.map((r) => ({
      ...r,
      prize: r.totalPoints === firstPlacePoints ? sharedPrize : 0,
    }));
  }

  // Sin empate en 1ro
  if (!use75_25) {
    return ranked.map((r) => ({
      ...r,
      prize: r.rank === 1 ? floor2(prize1st) : 0,
    }));
  }

  // >8 participantes, ganador único en 1ro — verificar empate en 2do · BR-008b
  const secondPlacePoints = ranked[1]?.totalPoints ?? -1;
  const secondPlaceGroup = ranked.filter(
    (r) => r.totalPoints === secondPlacePoints && r.rank !== 1
  );

  const sharedSecond = floor2(prize2nd / secondPlaceGroup.length);

  return ranked.map((r) => {
    if (r.rank === 1) return { ...r, prize: floor2(prize1st) };
    if (r.totalPoints === secondPlacePoints) return { ...r, prize: sharedSecond };
    return { ...r, prize: 0 };
  });
}

function floor2(n: number): number {
  return Math.floor(n * 100) / 100;
}
