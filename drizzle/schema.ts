import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }), role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const sourceDocuments = mysqlTable("source_documents", {
  id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 255 }).notNull(), origin: varchar("origin", { length: 512 }).notNull(), storageKey: varchar("storageKey", { length: 512 }), notes: text("notes"), uploadedBy: int("uploadedBy"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const murdokuTemplates = mysqlTable("murdoku_templates", {
  id: int("id").autoincrement().primaryKey(), slug: varchar("slug", { length: 128 }).notNull().unique(), title: varchar("title", { length: 255 }).notNull(), size: int("size").notNull(), logicJson: json("logicJson").notNull(), narrativeJson: json("narrativeJson").notNull(), metadataJson: json("metadataJson").notNull(), validationStatus: mysqlEnum("validationStatus", ["pending", "valid", "invalid"]).default("pending").notNull(), sourceDocumentId: int("sourceDocumentId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const generatedCases = mysqlTable("generated_cases", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), templateId: int("templateId").notNull(), title: varchar("title", { length: 255 }).notNull(), preferencesJson: json("preferencesJson").notNull(), logicSnapshotJson: json("logicSnapshotJson").notNull(), narrativeJson: json("narrativeJson").notNull(), validationJson: json("validationJson").notNull(), status: mysqlEnum("status", ["draft", "validated", "archived"]).default("draft").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dailyChallenges = mysqlTable("daily_challenges", {
  id: int("id").autoincrement().primaryKey(), challengeDate: varchar("challengeDate", { length: 10 }).notNull().unique(), seed: varchar("seed", { length: 128 }).notNull(), caseSnapshotJson: json("caseSnapshotJson").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const events = mysqlTable("murdoku_events", {
  id: int("id").autoincrement().primaryKey(), inviteCode: varchar("inviteCode", { length: 32 }).notNull().unique(), hostUserId: int("hostUserId").notNull(), caseSnapshotJson: json("caseSnapshotJson").notNull(), durationSeconds: int("durationSeconds").notNull(), startsAt: timestamp("startsAt").notNull(), endsAt: timestamp("endsAt").notNull(), status: mysqlEnum("status", ["waiting", "live", "finished"]).default("waiting").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const eventParticipants = mysqlTable("event_participants", {
  id: int("id").autoincrement().primaryKey(), eventId: int("eventId").notNull(), userId: int("userId").notNull(), displayName: varchar("displayName", { length: 120 }).notNull(), progressJson: json("progressJson").notNull(), joinedAt: timestamp("joinedAt").defaultNow().notNull(), completedAt: timestamp("completedAt"), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const gameSessions = mysqlTable("game_sessions", {
  id: int("id").autoincrement().primaryKey(), userId: int("userId").notNull(), caseId: int("caseId").notNull(), progressJson: json("progressJson").notNull(), completedAt: timestamp("completedAt"), lastPlayedAt: timestamp("lastPlayedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type MurdokuTemplate = typeof murdokuTemplates.$inferSelect;
export type GeneratedCase = typeof generatedCases.$inferSelect;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type MurdokuEvent = typeof events.$inferSelect;
export type EventParticipant = typeof eventParticipants.$inferSelect;
