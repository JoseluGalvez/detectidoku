import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createGeneratedCase, createMurdokuEvent, getDailyChallenge, finishMurdokuEvent, getMurdokuEvent, getMurdokuEventById, listEventParticipants, listGeneratedCases, listTemplates, saveDailyChallenge, upsertEventParticipant } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateNarrativeVariation } from "./murdokuGeneration";
import { validateMurdoku } from "../shared/murdokuLogic";
import { challengeFromSeed, seedForDate, utcChallengeDate } from "../shared/dailyChallenge";
import { nanoid } from "nanoid";

const preferencesSchema = z.object({ theme: z.string().min(1).max(120), tone: z.string().min(1).max(120), names: z.array(z.string().min(1).max(80)).min(2).max(12), story: z.string().min(1).max(1000) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  library: router({
    list: publicProcedure.query(() => listTemplates()),
  }),
  daily: router({
    today: publicProcedure.query(async () => { const challengeDate = utcChallengeDate(); const existing = await getDailyChallenge(challengeDate); if (existing) return existing; const seed = seedForDate(challengeDate); return saveDailyChallenge({ challengeDate, seed, caseSnapshotJson: challengeFromSeed(seed) }); }),
    fromSeed: publicProcedure.input(z.object({ seed: z.string().min(3).max(128) })).query(({ input }) => ({ seed: input.seed, snapshot: challengeFromSeed(input.seed) })),
  }),
  events: router({
    create: protectedProcedure.input(z.object({ snapshot: z.unknown(), durationSeconds: z.number().int().min(60).max(86400), displayName: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => { const inviteCode = nanoid(8).toUpperCase(); const startsAt = new Date(); const endsAt = new Date(startsAt.getTime() + input.durationSeconds * 1000); const id = await createMurdokuEvent({ inviteCode, hostUserId: ctx.user.id, caseSnapshotJson: input.snapshot, durationSeconds: input.durationSeconds, startsAt, endsAt, status: "live" }); await upsertEventParticipant({ eventId: Number(id), userId: ctx.user.id, displayName: input.displayName, progressJson: {}, }); return { id: Number(id), inviteCode, startsAt, endsAt }; }),
    get: publicProcedure.input(z.object({ inviteCode: z.string().min(4).max(32) })).query(async ({ input }) => { const event = await getMurdokuEvent(input.inviteCode); if (!event) throw new Error("event_not_found"); const expired = Date.now() >= new Date(event.endsAt).getTime(); if (expired && event.status !== "finished") await finishMurdokuEvent(event.id); return { ...event, status: expired ? "finished" as const : event.status, participants: await listEventParticipants(event.id) }; }),
    join: protectedProcedure.input(z.object({ inviteCode: z.string().min(4).max(32), displayName: z.string().min(1).max(120) })).mutation(async ({ ctx, input }) => { const event = await getMurdokuEvent(input.inviteCode); if (!event) throw new Error("event_not_found"); if (Date.now() >= new Date(event.endsAt).getTime()) throw new Error("event_finished"); await upsertEventParticipant({ eventId: event.id, userId: ctx.user.id, displayName: input.displayName, progressJson: {} }); return { eventId: event.id, inviteCode: event.inviteCode }; }),
    progress: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), displayName: z.string().min(1).max(120), progress: z.record(z.string(), z.unknown()), completed: z.boolean().optional() })).mutation(async ({ ctx, input }) => { const eventsForProgress = await getMurdokuEventById(input.eventId); if (!eventsForProgress) throw new Error("event_not_found"); if (Date.now() >= new Date(eventsForProgress.endsAt).getTime()) { await finishMurdokuEvent(input.eventId); throw new Error("event_finished"); } await upsertEventParticipant({ eventId: input.eventId, userId: ctx.user.id, displayName: input.displayName, progressJson: input.progress, completedAt: input.completed ? new Date() : null }); return { ok: true }; }),
    participants: publicProcedure.input(z.object({ eventId: z.number().int().positive() })).query(({ input }) => listEventParticipants(input.eventId)),
  }),
  cases: router({
    history: protectedProcedure.query(({ ctx }) => listGeneratedCases(ctx.user.id)),
    generateNarrative: protectedProcedure.input(z.object({ template: z.any(), preferences: preferencesSchema })).mutation(({ input }) => generateNarrativeVariation(input.template, input.preferences)),
    createDraft: protectedProcedure.input(z.object({ templateId: z.number().int().positive(), title: z.string().min(1).max(255), preferences: preferencesSchema, logicSnapshot: z.unknown(), narrative: z.unknown(), validation: z.object({ valid: z.literal(true), solutionCount: z.literal(1) }) })).mutation(async ({ ctx, input }) => { const validation = validateMurdoku(input.logicSnapshot as never); if (!validation.valid || validation.solutionCount !== 1) throw new Error("logic_validation_failed"); const id = await createGeneratedCase({ userId: ctx.user.id, templateId: input.templateId, title: input.title, preferencesJson: input.preferences, logicSnapshotJson: input.logicSnapshot, narrativeJson: input.narrative, validationJson: validation, status: "validated" }); return { id }; }),
  }),
});

export type AppRouter = typeof appRouter;
