import { describe, expect, it, vi } from "vitest";
import { rankResultsBySeed } from "../shared/dailyChallenge";

const unlockCalls: Array<{ userId: number; styleKey: string }> = [];
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getUserAchievementState: async () => ({ dailyWins: 1, achievementPoints: 10 }),
    unlockStyle: async (input: { userId: number; styleKey: string }) => {
      const existing = unlockCalls.find((item) => item.userId === input.userId && item.styleKey === input.styleKey);
      if (existing) return 101;
      unlockCalls.push(input);
      return 101;
    },
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
const authenticatedContext = { user: { id: 99, openId: "test-user", name: "Test", email: "test@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;

describe("competition security contracts", () => {
  it("filters and orders historical results by shared seed", () => {
    const rows = rankResultsBySeed([{ seed: "alpha", elapsedSeconds: 90, hintsUsed: 2, displayName: "B" }, { seed: "other", elapsedSeconds: 1, hintsUsed: 0, displayName: "X" }, { seed: "alpha", elapsedSeconds: 90, hintsUsed: 1, displayName: "A" }], "alpha");
    expect(rows.map((row) => row.displayName)).toEqual(["A", "B"]);
  });

  it("exposes a typed historical-by-seed query", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.daily.historyBySeed({ seed: "shared-seed-001" })).resolves.toEqual([]);
  });

  it("does not allow unauthenticated clients to unlock achievements", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.profile.unlockStyle({ styleKey: "cluedo" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("makes an eligible unlock idempotent for an authenticated user", async () => { unlockCalls.length = 0; const caller = appRouter.createCaller(authenticatedContext); await expect(caller.profile.unlockStyle({ styleKey: "cluedo" })).resolves.toBe(101); await expect(caller.profile.unlockStyle({ styleKey: "cluedo" })).resolves.toBe(101); expect(unlockCalls).toHaveLength(1); });
});
