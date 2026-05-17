// Calcula deadline_at: 15:00 BOT (19:00 UTC) del día calendario anterior al partido
// "Día calendario anterior" se determina en zona horaria boliviana (UTC-4)
export function calculateDeadline(scheduledAt: Date): Date {
  // Convertir a BOT para obtener el día calendario correcto
  const scheduledBOT = new Date(scheduledAt.getTime() - 4 * 60 * 60 * 1000);
  const [year, month, day] = scheduledBOT.toISOString().split("T")[0].split("-").map(Number);
  // Día anterior a medianoche UTC, luego sumar 19h → 19:00 UTC = 15:00 BOT
  const deadline = new Date(Date.UTC(year, month - 1, day - 1, 19, 0, 0, 0));
  return deadline;
}
