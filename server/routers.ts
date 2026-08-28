import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createGeneratedCase, listGeneratedCases, listTemplates } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { generateNarrativeVariation } from "./murdokuGeneration";
import { validateMurdoku } from "../shared/murdokuLogic";

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
  cases: router({
    history: protectedProcedure.query(({ ctx }) => listGeneratedCases(ctx.user.id)),
    generateNarrative: protectedProcedure.input(z.object({ template: z.any(), preferences: preferencesSchema })).mutation(({ input }) => generateNarrativeVariation(input.template, input.preferences)),
    createDraft: protectedProcedure.input(z.object({ templateId: z.number().int().positive(), title: z.string().min(1).max(255), preferences: preferencesSchema, logicSnapshot: z.unknown(), narrative: z.unknown(), validation: z.object({ valid: z.literal(true), solutionCount: z.literal(1) }) })).mutation(async ({ ctx, input }) => { const validation = validateMurdoku(input.logicSnapshot as never); if (!validation.valid || validation.solutionCount !== 1) throw new Error("logic_validation_failed"); const id = await createGeneratedCase({ userId: ctx.user.id, templateId: input.templateId, title: input.title, preferencesJson: input.preferences, logicSnapshotJson: input.logicSnapshot, narrativeJson: input.narrative, validationJson: validation, status: "validated" }); return { id }; }),
  }),
});

export type AppRouter = typeof appRouter;
