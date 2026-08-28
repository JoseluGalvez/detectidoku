import { describe, expect, it } from "vitest";
import { challengeFromSeed, seedForDate, utcChallengeDate } from "../shared/dailyChallenge";

describe("daily challenges", () => {
  it("uses UTC dates and reproducible seeds", () => {
    const date = utcChallengeDate(new Date("2026-08-28T23:59:00Z"));
    const seed = seedForDate(date);
    expect(date).toBe("2026-08-28");
    expect(challengeFromSeed(seed)).toEqual(challengeFromSeed(seed));
  });
  it("keeps different shared seeds deterministic and distinct", () => {
    const first = challengeFromSeed("murdoku-2026-08-28");
    const second = challengeFromSeed("murdoku-2026-08-29");
    expect(first.title).not.toBe(second.title);
    expect(first.logic.solution).toEqual(challengeFromSeed("murdoku-2026-08-28").logic.solution);
  });
});
