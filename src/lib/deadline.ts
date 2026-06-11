// Calcula deadline_at: 1 hora antes del inicio del partido
export function calculateDeadline(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() - 60 * 60 * 1000);
}
