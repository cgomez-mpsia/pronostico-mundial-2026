// Calcula deadline_at: medianoche BOT (00:00 BOT = 04:00 UTC) del día del partido
// "Día del partido" se determina en zona horaria boliviana (UTC-4)
export function calculateDeadline(scheduledAt: Date): Date {
  // Convertir a BOT para obtener el día calendario correcto
  const scheduledBOT = new Date(scheduledAt.getTime() - 4 * 60 * 60 * 1000);
  const [year, month, day] = scheduledBOT.toISOString().split("T")[0].split("-").map(Number);
  // Medianoche BOT del día del partido = 04:00 UTC del mismo día (en BOT)
  const deadline = new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
  return deadline;
}
