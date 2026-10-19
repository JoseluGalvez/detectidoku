import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { generateDeterministicMurdoku, type GeneratedMurdoku, type InterviewConfig } from "@shared/murdokuGenerator";
import { trpc } from "@/lib/trpc";

const config: InterviewConfig = { players: 1, ageRange: "Adultos", difficulty: "Medio", theme: "Mansión", tone: "Misterioso", suspectCount: 4, locationCount: 4, objectCount: 2, twists: false, customNames: ["Ada", "Bruno", "Celia", "Dario"], format: "Juego online", hints: true, timeLimit: false };
const sample = generateDeterministicMurdoku(config);
export default function QualityReport() {
  const [seed] = useState(() => new URLSearchParams(window.location.search).get("seed") ?? "");
  const qualityInput = useMemo(() => ({ seed }), [seed]);
  const saved = trpc.profile.quality.useQuery(qualityInput, { enabled: seed.length >= 3 });
  const puzzle = (saved.data?.snapshotJson as GeneratedMurdoku | undefined) ?? sample;
  const checks = puzzle.qualityReport.checks;
  return <main className="min-h-screen bg-[#f6f5f1] px-5 py-10 text-[#202421] md:px-10"><div className="mx-auto max-w-4xl"><button onClick={() => window.history.back()} className="mb-8 flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Volver</button><div className="mb-8"><div className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-stone-500"><ShieldCheck className="h-4 w-4 text-[#c57d20]" /> Control Murdokeando.md</div><h1 className="mt-3 font-display text-5xl tracking-[-.04em]">Informe de calidad.</h1><p className="mt-3 max-w-2xl text-stone-600">Cada generación se evalúa antes de guardarse. La creatividad puede cambiar; las restricciones y la solución única permanecen protegidas.</p>{seed && <p className="mt-3 text-xs uppercase tracking-[.16em] text-[#a96818]">Semilla archivada · {seed}{saved.isLoading ? " · cargando snapshot" : saved.data ? "" : " · fallback de ejemplo"}</p>}</div><Card className="border-stone-200"><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3">{puzzle.title}<Badge className={puzzle.qualityReport.passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}>{checks.filter((check) => check.status === "cumple").length}/{checks.length} cumplen</Badge></CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{checks.map((check) => <div key={check.id} className="rounded-lg border border-stone-100 bg-white p-3"><div className="flex items-center gap-2"><span className={check.status === "cumple" ? "text-emerald-600" : "text-amber-600"}>{check.status === "cumple" ? "✓" : "!"}</span><span className="text-sm font-medium">{check.id} · {check.label}</span><Badge variant="outline" className="ml-auto text-[10px]">{check.severity}</Badge></div><p className="mt-2 text-xs leading-relaxed text-stone-500">{check.evidence}</p></div>)}</CardContent></Card></div></main>;
}
