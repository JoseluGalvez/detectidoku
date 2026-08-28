import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { generatedCases, InsertUser, murdokuTemplates, users } from "../drizzle/schema";
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
