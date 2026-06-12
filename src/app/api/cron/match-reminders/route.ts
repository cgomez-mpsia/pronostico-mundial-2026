import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { matches, participants, predictions, pushSubscriptions, notificationLog, teams, tournaments } from "@/db/schema";
import { eq, and, gte, lt, or, inArray, notExists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const THRESHOLDS = [
  { type: "2h",    minBefore: 115, maxBefore: 125, label: "2 horas" },
  { type: "30min", minBefore: 25,  maxBefore: 35,  label: "30 minutos" },
  { type: "15min", minBefore: 10,  maxBefore: 20,  label: "15 minutos" },
] as const;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  let totalSent = 0;

  const tournament = await db.query.tournaments.findFirst({
    where: or(eq(tournaments.status, "active"), eq(tournaments.status, "draft")),
    columns: { id: true },
  });
  if (!tournament) return NextResponse.json({ sent: 0 });

  const homeTeam = alias(teams, "home_team");
  const awayTeam = alias(teams, "away_team");

  for (const threshold of THRESHOLDS) {
    const windowStart = new Date(now.getTime() + threshold.minBefore * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + threshold.maxBefore * 60 * 1000);

    // Partidos programados dentro de la ventana de tiempo
    const upcomingMatches = await db
      .select({
        id: matches.id,
        scheduledAt: matches.scheduledAt,
        homeTeamName: homeTeam.name,
        awayTeamName: awayTeam.name,
      })
      .from(matches)
      .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
      .where(
        and(
          eq(matches.tournamentId, tournament.id),
          eq(matches.status, "scheduled"),
          gte(matches.scheduledAt, windowStart),
          lt(matches.scheduledAt, windowEnd)
        )
      );

    if (upcomingMatches.length === 0) continue;

    const matchIds = upcomingMatches.map((m) => m.id);

    // Participantes del torneo que NO tienen pronóstico para alguno de estos partidos
    // y que NO recibieron ya esta notificación
    const allParticipants = await db
      .select({ id: participants.id, userId: participants.userId })
      .from(participants)
      .where(eq(participants.tournamentId, tournament.id));

    for (const match of upcomingMatches) {
      const matchLabel = `${match.homeTeamName ?? "Local"} vs ${match.awayTeamName ?? "Visitante"}`;
      const scheduledLabel = new Intl.DateTimeFormat("es-BO", {
        timeZone: "America/La_Paz",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(match.scheduledAt);

      for (const participant of allParticipants) {
        // ¿Ya fue notificado?
        const alreadySent = await db.query.notificationLog.findFirst({
          where: and(
            eq(notificationLog.participantId, participant.id),
            eq(notificationLog.matchId, match.id),
            eq(notificationLog.type, threshold.type)
          ),
        });
        if (alreadySent) continue;

        // ¿Ya tiene pronóstico?
        const hasPrediction = await db.query.predictions.findFirst({
          where: and(
            eq(predictions.participantId, participant.id),
            eq(predictions.matchId, match.id)
          ),
        });
        if (hasPrediction) continue;

        // Obtener suscripciones push del usuario
        const subs = await db
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, participant.userId));

        if (subs.length === 0) continue;

        // Registrar notificación ANTES de enviar (evita reenvío si el push falla a medias)
        await db.insert(notificationLog).values({
          participantId: participant.id,
          matchId: match.id,
          type: threshold.type,
        }).onConflictDoNothing();

        const payload = JSON.stringify({
          title: `⚽ Faltan ${threshold.label}`,
          body: `${matchLabel} · ${scheduledLabel} BOT — ¡Carga tu pronóstico!`,
          url: "/dashboard",
          tag: `reminder-${match.id}-${threshold.type}`,
        });

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            totalSent++;
          } catch (err: unknown) {
            // Suscripción expirada o inválida → limpiar
            if (
              typeof err === "object" && err !== null &&
              "statusCode" in err &&
              (err.statusCode === 404 || err.statusCode === 410)
            ) {
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent, checkedAt: now.toISOString() });
}
