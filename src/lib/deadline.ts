// Calcula deadline_at: 23:59 BOT del día anterior al partido (= 03:59 UTC del día del partido en BOT)
// "Día del partido" se determina en zona horaria boliviana (UTC-4)
export function calculateDeadline(scheduledAt: Date): Date {
  // Convertir a BOT para obtener el día calendario correcto
  const scheduledBOT = new Date(scheduledAt.getTime() - 4 * 60 * 60 * 1000);
  const [year, month, day] = scheduledBOT.toISOString().split("T")[0].split("-").map(Number);
  // 23:59 BOT del día anterior al partido = 03:59 UTC del día del partido (en BOT)
  const deadline = new Date(Date.UTC(year, month - 1, day, 3, 59, 0, 0));
  return deadline;
}
