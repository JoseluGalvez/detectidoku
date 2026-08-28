import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }

type Props = { seed?: string };
export default function DailyLeaderboard({ seed }: Props) {
  const [sortBy, setSortBy] = useState<"time" | "hints">("time");
  const [activeSeed] = useState(() => seed ?? window.localStorage.getItem("murdoku-daily-seed") ?? "");
  const leaderboard = trpc.daily.leaderboard.useQuery(undefined, { refetchInterval: 15000 });
  const historical = trpc.daily.historyBySeed.useQuery({ seed: activeSeed }, { enabled: activeSeed.length >= 3, refetchInterval: 15000 });
  const rows = useMemo(() => [...(leaderboard.data ?? [])].sort((a, b) => sortBy === "time" ? a.elapsedSeconds - b.elapsedSeconds || a.hintsUsed - b.hintsUsed : a.hintsUsed - b.hintsUsed || a.elapsedSeconds - b.elapsedSeconds), [leaderboard.data, sortBy]);
  const historyRows = useMemo(() => [...(historical.data ?? [])].sort((a, b) => sortBy === "time" ? a.elapsedSeconds - b.elapsedSeconds || a.hintsUsed - b.hintsUsed : a.hintsUsed - b.hintsUsed || a.elapsedSeconds - b.elapsedSeconds), [historical.data, sortBy]);
  const table = (items: typeof rows) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-400"><tr><th className="pb-2">#</th><th className="pb-2">Detective</th><th className="pb-2 text-right">Tiempo</th><th className="pb-2 text-right">Pistas</th></tr></thead><tbody>{items.map((row, index) => <tr key={row.id} className="border-b border-stone-100 last:border-0"><td className="py-3 font-semibold text-[#c57d20]">{index + 1}</td><td className="py-3 text-stone-700">{row.displayName}</td><td className="py-3 text-right font-mono text-stone-700">{formatTime(row.elapsedSeconds)}</td><td className="py-3 text-right text-stone-500">{row.hintsUsed}</td></tr>)}</tbody></table></div>;
  return <div className="space-y-5"><Card className="border-stone-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-4 w-4 text-[#c57d20]" />Clasificación de hoy<Badge variant="outline" className="ml-auto">{leaderboard.data?.length ?? 0} jugadores</Badge></CardTitle><div className="mt-3 flex gap-2"><Button variant={sortBy === "time" ? "default" : "outline"} size="sm" onClick={() => setSortBy("time")}>Mejor tiempo</Button><Button variant={sortBy === "hints" ? "default" : "outline"} size="sm" onClick={() => setSortBy("hints")}>Menos pistas</Button></div></CardHeader><CardContent>{rows.length ? table(rows) : <p className="text-sm leading-relaxed text-stone-500">Todavía no hay resultados. Completa el reto de hoy para inaugurar la clasificación.</p>}</CardContent></Card><Card className="border-stone-200"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><History className="h-4 w-4 text-[#c57d20]" />Histórico de esta semilla<Badge variant="outline" className="ml-auto">{historyRows.length} partidas</Badge></CardTitle><p className="text-sm text-stone-500">Compara tu marca con todos los jugadores que resolvieron exactamente este Murdoku.</p></CardHeader><CardContent>{activeSeed && historyRows.length ? table(historyRows) : <p className="text-sm leading-relaxed text-stone-500">El histórico aparecerá cuando se registre una partida con una semilla compartida.</p>}</CardContent></Card></div>;
}
