import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { dailyChallenges, eventParticipants, events, generatedCases, InsertUser, murdokuTemplates, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() { if (!_db && process.env.DATABASE_URL) { try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; } } return _db; }

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId }; const updateSet: Record<string, unknown> = {};
  (['name', 'email', 'loginMethod'] as const).forEach((field) => { if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; } });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; } else { values.lastSignedIn = new Date(); updateSet.lastSignedIn = new Date(); }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function listTemplates() { const db = await getDb(); if (!db) return []; return db.select().from(murdokuTemplates).where(eq(murdokuTemplates.validationStatus, "valid")).orderBy(desc(murdokuTemplates.updatedAt)).limit(100); }
export async function listGeneratedCases(userId: number) { const db = await getDb(); if (!db) return []; return db.select().from(generatedCases).where(eq(generatedCases.userId, userId)).orderBy(desc(generatedCases.updatedAt)).limit(100); }
export async function createGeneratedCase(input: typeof generatedCases.$inferInsert) { const db = await getDb(); if (!db) throw new Error("database_unavailable"); const result = await db.insert(generatedCases).values(input); return result[0].insertId; }
export async function getDailyChallenge(challengeDate: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(dailyChallenges).where(eq(dailyChallenges.challengeDate, challengeDate)).limit(1))[0]; }
export async function saveDailyChallenge(input: typeof dailyChallenges.$inferInsert) { const db = await getDb(); if (!db) throw new Error("database_unavailable"); await db.insert(dailyChallenges).values(input).onDuplicateKeyUpdate({ set: { seed: input.seed, caseSnapshotJson: input.caseSnapshotJson } }); return getDailyChallenge(input.challengeDate); }
export async function createMurdokuEvent(input: typeof events.$inferInsert) { const db = await getDb(); if (!db) throw new Error("database_unavailable"); const result = await db.insert(events).values(input); return result[0].insertId; }
export async function getMurdokuEvent(inviteCode: string) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(events).where(eq(events.inviteCode, inviteCode)).limit(1))[0]; }
export async function getMurdokuEventById(eventId: number) { const db = await getDb(); if (!db) return undefined; return (await db.select().from(events).where(eq(events.id, eventId)).limit(1))[0]; }
export async function finishMurdokuEvent(eventId: number) { const db = await getDb(); if (!db) throw new Error("database_unavailable"); await db.update(events).set({ status: "finished" }).where(eq(events.id, eventId)); }
export async function listEventParticipants(eventId: number) { const db = await getDb(); if (!db) return []; return db.select().from(eventParticipants).where(eq(eventParticipants.eventId, eventId)).orderBy(desc(eventParticipants.updatedAt)).limit(100); }
export async function upsertEventParticipant(input: typeof eventParticipants.$inferInsert) { const db = await getDb(); if (!db) throw new Error("database_unavailable"); const existing = (await db.select().from(eventParticipants).where(and(eq(eventParticipants.eventId, input.eventId), eq(eventParticipants.userId, input.userId))).limit(1))[0]; if (existing) { await db.update(eventParticipants).set({ displayName: input.displayName, progressJson: input.progressJson, completedAt: input.completedAt }).where(eq(eventParticipants.id, existing.id)); return existing.id; } const result = await db.insert(eventParticipants).values(input); return result[0].insertId; }
