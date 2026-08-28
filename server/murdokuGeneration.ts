import { invokeLLM } from "./_core/llm";
import type { MurdokuTemplate } from "../shared/murdokuLogic";

export type NarrativePreferences = { theme: string; tone: string; names: string[]; story: string };
export type NarrativeVariation = { title: string; intro: string; setting: string; clues: { id: string; text: string }[] };

export function buildNarrativePrompt(template: MurdokuTemplate, preferences: NarrativePreferences) {
  return `Adapta únicamente la capa narrativa del Murdoku "${template.title}". Tema: ${preferences.theme}. Tono: ${preferences.tone}. Personajes: ${preferences.names.join(", ")}. Premisa: ${preferences.story}. Conserva exactamente los ids de pistas (${template.clues.map((clue) => clue.id).join(", ")}), devuelve una pista por id y no inventes ni alteres relaciones, respuestas, entidades lógicas o solución.`;
}

export function validateNarrativeVariation(template: MurdokuTemplate, variation: NarrativeVariation) {
  const expected = template.clues.map((clue) => clue.id).sort();
  const received = variation.clues.map((clue) => clue.id).sort();
  return Boolean(variation.title && variation.intro && variation.setting && JSON.stringify(expected) === JSON.stringify(received));
}

export async function generateNarrativeVariation(template: MurdokuTemplate, preferences: NarrativePreferences) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Eres un redactor de juegos de lógica. Devuelve JSON válido. Nunca cambies la lógica del puzzle." },
      { role: "user", content: buildNarrativePrompt(template, preferences) },
    ],
    response_format: { type: "json_schema", json_schema: { name: "murdoku_narrative", strict: true, schema: { type: "object", properties: { title: { type: "string" }, intro: { type: "string" }, setting: { type: "string" }, clues: { type: "array", items: { type: "object", properties: { id: { type: "string" }, text: { type: "string" } }, required: ["id", "text"], additionalProperties: false } } }, required: ["title", "intro", "setting", "clues"], additionalProperties: false } } },
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("invalid_llm_response");
  const variation = JSON.parse(content) as NarrativeVariation;
  if (!validateNarrativeVariation(template, variation)) throw new Error("narrative_contract_failed");
  return variation;
}
