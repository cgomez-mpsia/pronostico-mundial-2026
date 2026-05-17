import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// FSD §6 — Modelo de datos completo

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    inscriptionFee: numeric("inscription_fee", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("draft"),
    championApplied: boolean("champion_applied").notNull().default(false),
    championAppliedAt: timestamp("champion_applied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("tournaments_status_check", sql`${t.status} IN ('draft', 'active', 'finished')`),
  ]
);

// Espeja auth.users de Supabase — el id es el UUID de Supabase Auth
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name").notNull(),
    role: text("role").notNull().default("participant"),
    // null = no ha subido foto → UI muestra avatar de iniciales · FSD-UC-011
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("users_role_check", sql`${t.role} IN ('admin', 'participant')`),
  ]
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  flagUrl: text("flag_url"),
  groupName: text("group_name"),
});

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    hasPaid: boolean("has_paid").notNull().default(false),
    // null = no ha elegido campeón aún · BR-010
    championTeamId: uuid("champion_team_id").references(() => teams.id),
    // +5 pts si acertó el campeón · separado de match_points (CHECK <= 3) · FSD-UC-008
    championPoints: integer("champion_points").notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("participants_user_tournament_unique").on(t.userId, t.tournamentId),
  ]
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    // nullable: equipos aún no definidos en fases eliminatorias
    homeTeamId: uuid("home_team_id").references(() => teams.id),
    awayTeamId: uuid("away_team_id").references(() => teams.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    // día anterior a scheduledAt a las 19:00 UTC (15:00 BOT) · RB-04
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    // null hasta que el admin registra el resultado · solo 90 min · RB-03
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    // marcador al final de los 120 min (null si no hubo prórroga) · BR-029
    homeScoreFull: integer("home_score_full"),
    awayScoreFull: integer("away_score_full"),
    status: text("status").notNull().default("scheduled"),
    stage: text("stage").notNull(),
    // null = decidido en 90 min · 'aet' = tiempo extra · 'pen' = penales · BR-023
    extraTime: text("extra_time"),
    // equipo ganador cuando extraTime no es null · BR-023
    matchWinnerId: uuid("match_winner_id").references(() => teams.id),
  },
  (t) => [
    check("matches_status_check", sql`${t.status} IN ('scheduled', 'live', 'finished')`),
    check("matches_stage_check", sql`${t.stage} IN ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final')`),
    check("matches_extra_time_check", sql`${t.extraTime} IS NULL OR ${t.extraTime} IN ('aet', 'pen')`),
  ]
);

export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    // true = ingresado manualmente → elegible para +2 pts por score exacto · BR-004
    // La ausencia de fila equivale a no pronosticar (0-0 por defecto en el cálculo)
    isManuallyEntered: boolean("is_manually_entered").notNull().default(true),
  },
  (t) => [
    unique("predictions_participant_match_unique").on(t.participantId, t.matchId),
  ]
);

// Se inserta cuando el admin registra el resultado de un partido · FSD-UC-004
export const matchPoints = pgTable(
  "match_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null si el participante no ingresó pronóstico
    predictionId: uuid("prediction_id").references(() => predictions.id),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    resultPoints: integer("result_points").notNull().default(0),  // 0 o 1
    exactPoints: integer("exact_points").notNull().default(0),    // 0 o 2
    totalPoints: integer("total_points").notNull().default(0),    // máx 3
  },
  (t) => [
    unique("match_points_participant_match_unique").on(t.participantId, t.matchId),
    check("match_points_total_check", sql`${t.totalPoints} <= 3`),
  ]
);

// Tipos inferidos de Drizzle para usar en el resto de la app
export type Tournament = typeof tournaments.$inferSelect;
export type NewTournament = typeof tournaments.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type MatchPoints = typeof matchPoints.$inferSelect;
export type NewMatchPoints = typeof matchPoints.$inferInsert;
