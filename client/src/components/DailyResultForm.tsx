import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function DailyResultForm() {
  const [displayName, setDisplayName] = useState("Detective");
  const [elapsedSeconds, setElapsedSeconds] = useState("600");
  const [hintsUsed, setHintsUsed] = useState("0"); const daily = trpc.daily.today.useQuery();
  const utils = trpc.useUtils();
  const submit = trpc.daily.submitResult.useMutation({ onSuccess: () => { toast.success("Resultado registrado en la clasificación."); utils.daily.leaderboard.invalidate(); }, onError: () => toast.error("Inicia sesión para registrar tu resultado.") });
  return <Card className="border-stone-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Flag className="h-4 w-4 text-[#c57d20]" />Registrar resultado</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nombre" aria-label="Nombre para la clasificación" /><Input type="number" min="0" value={elapsedSeconds} onChange={(e) => setElapsedSeconds(e.target.value)} placeholder="Segundos" aria-label="Tiempo empleado en segundos" /><Input type="number" min="0" value={hintsUsed} onChange={(e) => setHintsUsed(e.target.value)} placeholder="Pistas" aria-label="Pistas utilizadas" /><Button className="sm:col-span-3 bg-[#c57d20] text-white" disabled={submit.isPending} onClick={() => submit.mutate({ displayName, elapsedSeconds: Number(elapsedSeconds), hintsUsed: Number(hintsUsed), seed: daily.data?.seed ?? "", solution: ((daily.data?.caseSnapshotJson as { logic?: { solution?: number[] } } | undefined)?.logic?.solution ?? []) })}>Enviar al ranking</Button></CardContent></Card>;
}
