import { describe, expect, it } from "vitest";
import { validateNarrativeVariation } from "./murdokuGeneration";
import type { MurdokuTemplate } from "../shared/murdokuLogic";

const template = { title: "Caso", clues: [{ id: "c1", text: "", references: [] }, { id: "c2", text: "", references: [] }] } as MurdokuTemplate;

describe("narrative generation contract", () => {
  it("accepts a variation that preserves every clue id", () => {
    expect(validateNarrativeVariation(template, { title: "Caso nuevo", intro: "Intro", setting: "Lugar", clues: [{ id: "c2", text: "x" }, { id: "c1", text: "y" }] })).toBe(true);
  });
  it("rejects missing or invented clue ids", () => {
    expect(validateNarrativeVariation(template, { title: "Caso nuevo", intro: "Intro", setting: "Lugar", clues: [{ id: "c1", text: "x" }, { id: "otro", text: "y" }] })).toBe(false);
  });
});
