// Calcula deadline_at: al INICIO del partido — los pronósticos se pueden
// ingresar hasta que arranca · decisión del cliente 04-Jul-2026 (antes era
// 1 hora antes del inicio).
export function calculateDeadline(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime());
}
