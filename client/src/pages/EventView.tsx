import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock3, Users } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SpatialSolver from "@/components/SpatialSolver";
import type { GeneratedMurdoku } from "@shared/murdokuGenerator";

export default function EventView() {
  const [, params] = useRoute("/event/:inviteCode");
  const code = params?.inviteCode ?? "";
  const [name, setName] = useState("Detective");
  const [now, setNow] = useState(() => Date.now());
  const event = trpc.events.get.useQuery({ inviteCode: code }, { enabled: code.length >= 4, refetchInterval: 5000 });
  const join = trpc.events.join.useMutation({ onSuccess: (data) => { localStorage.setItem("murdoku-event-id", String(data.eventId)); localStorage.setItem("murdoku-display-name", name); toast.success("Te has unido al evento."); }, onError: () => toast.error("No se pudo unir al evento.") });
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const remaining = useMemo(() => event.data ? Math.max(0, Math.ceil((new Date(event.data.endsAt).getTime() - now) / 1000)) : 0, [event.data, now]);
  return <main className="min-h-screen bg-[#f6f5f1] px-4 py-10 text-[#202421]"><div className="mx-auto max-w-3xl"><Button variant="ghost" onClick={() => { window.location.href = "/"; }}><ArrowLeft className="mr-2 h-4 w-4" />Volver a la biblioteca</Button><div className="mt-8"><p className="eyebrow">Evento privado · {code}</p><h1 className="mt-3 font-display text-5xl tracking-tight">La partida compartida.</h1><p className="mt-4 max-w-xl leading-relaxed text-stone-600">Únete con tu nombre, resuelve el mismo caso y compara tu avance sin revelar la solución.</p></div>{event.isLoading ? <Card className="mt-8"><CardContent className="p-6">Cargando evento…</CardContent></Card> : event.error ? <Card className="mt-8 border-rose-200"><CardContent className="p-6 text-rose-700">Este enlace no corresponde a un evento disponible.</CardContent></Card> : <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_.9fr]"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-[#c57d20]" />Tiempo restante</CardTitle><CardDescription>El cierre se valida en el servidor.</CardDescription></CardHeader><CardContent><div className="font-mono text-5xl text-[#c57d20]">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div><Badge className="mt-4" variant={event.data?.status === "finished" ? "destructive" : "outline"}>{event.data?.status === "finished" ? "Evento cerrado" : "Evento activo"}</Badge></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-[#c57d20]" />Participantes</CardTitle><CardDescription>{event.data?.participants.length ?? 0} detectives conectados.</CardDescription></CardHeader><CardContent><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre visible" aria-label="Tu nombre visible" /><Button className="mt-3 w-full bg-[#c57d20] text-white" disabled={event.data?.status === "finished" || join.isPending} onClick={() => join.mutate({ inviteCode: code, displayName: name })}>Unirme a la partida</Button><div className="mt-5 space-y-2">{event.data?.participants.map((participant) => <div key={participant.id} className="flex justify-between rounded-md bg-stone-50 px-3 py-2 text-sm"><span>{participant.displayName}</span><span className="text-stone-500">{participant.completedAt ? "Completado" : `${Object.keys((participant.progressJson ?? {}) as object).length} marcas`}</span></div>)}</div></CardContent></Card></div>}{Boolean(event.data?.caseSnapshotJson) && event.data?.status !== "finished" && <div className="mt-8"><SpatialSolver puzzle={event.data?.caseSnapshotJson as GeneratedMurdoku} /></div>}</div></main>;
}
