import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Copy, Eye, FolderOpen, Lightbulb, RotateCcw, Share2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { ASESIDOKU_THEME_CATALOG } from "@/lib/asesidokuCatalog";

type Difficulty = "facil" | "media" | "dificil" | "experto";
type Puzzle = any;
type Placement = [number, number];

const difficultyOptions: Array<[Difficulty, string, string]> = [
  ["facil", "Fácil", "★"],
  ["media", "Media", "★★"],
  ["dificil", "Difícil", "★★★"],
  ["experto", "Experto", "★★★★"],
];
const emojis: Record<string, string> = {
  clasico: "🔎", sendero: "🥾", faro: "🗼", cena: "🍽️", futbol: "⚽", vecindario: "🏘️", estrella: "🌌", oficina: "🏢", hockey: "🏒", pirata: "🏴‍☠️", doble_a: "🏚️", batalla_estrellas: "✦", caballeros: "♞", asedio: "🏰", formula1: "🏎️",
};
const themeCatalog = ASESIDOKU_THEME_CATALOG;
let asesidokuPromise: Promise<any> | null = null;
const loadAsesidoku = () => {
  asesidokuPromise ??= import("@/lib/asesidokuEngine").then(({ asesidoku }) => asesidoku);
  return asesidokuPromise;
};

function seedForTheme(themeId: string) {
  let value = 2166136261;
  for (const char of `${themeId}-${Date.now()}`) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}
function formatTime(ms: number) { const seconds = Math.floor(ms / 1000); return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; }
function codeFor(puzzle: Puzzle, difficulty: Difficulty) { return `${puzzle.themeId}~${difficulty}~${Number(puzzle.seed).toString(36)}`; }

export default function AsesidokuExperience() {
  const [screen, setScreen] = useState<"picker" | "game">("picker");
  const [difficulty, setDifficulty] = useState<Difficulty>("media");
  const [themeId, setThemeId] = useState("clasico");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [placements, setPlacements] = useState<Record<number, Placement>>({});
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [engine, setEngine] = useState<any>(null);
  const [loadingEngine, setLoadingEngine] = useState(false);

  const themes = themeCatalog;
  const visiblePeople = puzzle?.people?.filter((person: any) => !person.isVictim) ?? [];

  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    const parts = hash.split("~");
    if (parts.length !== 3 || !themeCatalog.some(({ id }) => id === parts[0])) return;
    const parsedDifficulty = (difficultyOptions.some(([key]) => key === parts[1]) ? parts[1] : "media") as Difficulty;
    const seed = Number.parseInt(parts[2], 36);
    if (Number.isFinite(seed)) void startCase(parts[0], parsedDifficulty, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (screen !== "game" || !startedAt || solved) return;
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [screen, startedAt, solved]);

  async function startCase(nextThemeId = themeId, nextDifficulty = difficulty, seed = seedForTheme(nextThemeId)) {
    setLoadingEngine(true);
    try {
      const nextEngine = engine ?? await loadAsesidoku();
      const theme = nextEngine?.THEME_BY_ID?.[nextThemeId];
      if (!theme) return;
      const nextPuzzle = nextEngine.generatePuzzle(theme, nextDifficulty, seed);
      setEngine(nextEngine);
      setThemeId(nextThemeId); setDifficulty(nextDifficulty); setPuzzle(nextPuzzle); setPlacements({}); setSelectedPerson(null); setSolved(false); setShowSolution(false); setElapsed(0); setStartedAt(Date.now()); setScreen("game");
      window.location.hash = codeFor(nextPuzzle, nextDifficulty);
    } catch {
      toast.error("No se pudo cargar el motor procedural", { description: "Reintenta el caso en unos segundos." });
    } finally {
      setLoadingEngine(false);
    }
  }
  function toggleCell(row: number, col: number) {
    if (solved || selectedPerson === null) return;
    const occupiedBy = Object.entries(placements).find(([, position]) => position[0] === row && position[1] === col)?.[0];
    if (occupiedBy && Number(occupiedBy) !== selectedPerson) return;
    setPlacements((current) => ({ ...current, [selectedPerson]: current[selectedPerson]?.[0] === row && current[selectedPerson]?.[1] === col ? undefined as never : [row, col] }));
  }
  function checkSolution() {
    if (!puzzle) return;
    const correct = puzzle.solution.every((position: Placement, personIndex: number) => placements[personIndex]?.[0] === position[0] && placements[personIndex]?.[1] === position[1]);
    if (!correct) { toast("Todavía hay posiciones por revisar", { description: "Comprueba filas, columnas y habitaciones antes de enviar el caso." }); return; }
    setSolved(true); toast.success("Caso resuelto", { description: `Tiempo: ${formatTime(elapsed)}` });
  }
  function shareCase() { navigator.clipboard?.writeText(window.location.href); toast.success("Código de caso copiado"); }
  function personAt(row: number, col: number) { return Object.entries(placements).find(([, position]) => position[0] === row && position[1] === col)?.[0]; }

  if (screen === "picker") return <main className="asesidoku-shell"><header className="asesidoku-header"><button className="asesidoku-brand" onClick={() => setScreen("picker")}><span className="asesidoku-brand-badge">A</span><span><strong>ASESIDOKU</strong><small>casos procedurales · solución única</small></span></button><nav><a href="/studio">Murdoku Studio</a><a href="/profile">Mi perfil</a></nav></header><section className="asesidoku-picker"><div className="asesidoku-hero"><Badge className="asesidoku-label"><Sparkles className="mr-2 h-3.5 w-3.5" /> Motor Asesidoku integrado</Badge><h1>El misterio<br /><em>empieza aquí.</em></h1><p>Elige una escena, coloca a cada sospechoso y descubre quién compartía habitación con la víctima. El generador procedural verifica una única solución antes de mostrar cada caso.</p><div className="asesidoku-links"><Button className="asesidoku-primary" disabled={loadingEngine} onClick={() => void startCase()}>{loadingEngine ? "Cargando motor…" : "Jugar un caso"}</Button><Button variant="outline" className="asesidoku-outline" onClick={() => { window.location.href = "/studio"; }}><FolderOpen className="mr-2 h-4 w-4" />Abrir Murdoku Studio</Button></div></div><div className="asesidoku-difficulty">{difficultyOptions.map(([key, label, stars]) => <button key={key} aria-pressed={difficulty === key} onClick={() => setDifficulty(key)}>{label}<span>{stars}</span></button>)}</div><div className="asesidoku-theme-grid">{themes.map((theme: any) => <button key={theme.id} className={`asesidoku-theme-card ${theme.id === themeId ? "selected" : ""}`} onClick={() => { setThemeId(theme.id); void startCase(theme.id, difficulty); }}><span className="asesidoku-theme-emoji" style={theme.visualAsset ? { backgroundImage: `url(${theme.visualAsset})` } : undefined}>{!theme.visualAsset && (emojis[theme.id] ?? "🕵️")}</span><div><h3>{theme.name}</h3><p>{theme.tagline}</p></div>{theme.adjacencyMode && <small>Regla especial</small>}</button>)}</div></section><footer className="asesidoku-footer">Asesidoku × Murdoku Case Studio · lógica, narrativa y escenas compartibles</footer></main>;

  return <main className="asesidoku-shell"><header className="asesidoku-header"><button className="asesidoku-brand" onClick={() => { setScreen("picker"); window.location.hash = ""; }}><span className="asesidoku-brand-badge">A</span><span><strong>ASESIDOKU</strong><small>{puzzle?.title}</small></span></button><div className="asesidoku-header-actions"><Button variant="outline" className="asesidoku-outline" onClick={shareCase}><Share2 className="mr-2 h-4 w-4" />Compartir caso</Button><Button variant="outline" className="asesidoku-outline" onClick={() => startCase(themeId, difficulty)}><RotateCcw className="mr-2 h-4 w-4" />Nuevo caso</Button><a href="/studio">Murdoku Studio</a></div></header><section className="asesidoku-game"><aside className="asesidoku-case-panel"><span className="asesidoku-file-tab">EXPEDIENTE Nº {String(Number(puzzle.seed) % 100000).padStart(5, "0")}</span><h1>{puzzle.title}</h1><p className="asesidoku-tagline">{puzzle.tagline}</p><p className="asesidoku-intro">{puzzle.intro}</p><div className="asesidoku-meta"><span>{"★".repeat(puzzle.difficulty.stars)} {puzzle.difficulty.label}</span><span>Tablero {puzzle.n}×{puzzle.n}</span><span>{puzzle.rooms.length} habitaciones</span><span>{formatTime(elapsed)}</span></div><h2>Sospechosos</h2><div className="asesidoku-suspects">{visiblePeople.map((person: any, index: number) => <button key={person.personIdx} className={`asesidoku-suspect ${selectedPerson === person.personIdx ? "armed" : ""} ${placements[person.personIdx] ? "placed" : ""}`} onClick={() => setSelectedPerson(person.personIdx)}><span className="suspect-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{person.name}</strong><small>{engine?.clueTextFor?.(puzzle, person) ?? "Pista verificable del expediente."}</small></span>{placements[person.personIdx] && <Check className="h-4 w-4" />}</button>)}</div><div className="asesidoku-controls"><Button className="asesidoku-primary" onClick={checkSolution}><Check className="mr-2 h-4 w-4" />Comprobar</Button><Button variant="outline" className="asesidoku-outline" onClick={() => setShowSolution((value) => !value)}><Eye className="mr-2 h-4 w-4" />{showSolution ? "Ocultar" : "Revelar"}</Button><Button variant="outline" className="asesidoku-outline" onClick={() => { setPlacements({}); setSelectedPerson(null); }}><X className="mr-2 h-4 w-4" />Vaciar</Button></div>{showSolution && <div className="asesidoku-solution">La solución queda protegida en el motor: {puzzle.people.filter((person: any) => !person.isVictim)[puzzle.murdererIdx]?.name ?? "responsable"} compartía habitación con la víctima.</div>}{solved && <div className="asesidoku-success"><Check className="h-4 w-4" />Caso resuelto en {formatTime(elapsed)}</div>}</aside><section className="asesidoku-scene-panel"><div className="asesidoku-scene-header"><div><span className="asesidoku-label-text">Escena del crimen</span><h2>Coloca las fichas</h2><p>Selecciona un sospechoso y toca una casilla libre.</p></div><div className="asesidoku-scene-actions"><Button variant="outline" className="asesidoku-outline" onClick={() => toast("Pista desbloqueada", { description: "Empieza por las pistas de habitación y esquina." })}><Lightbulb className="mr-2 h-4 w-4" />Pista</Button><span className="asesidoku-timer">{formatTime(elapsed)}</span></div></div><div className="asesidoku-board" style={{ gridTemplateColumns: `repeat(${puzzle.n}, minmax(34px, 1fr))` }}>{Array.from({ length: puzzle.n * puzzle.n }, (_, index) => { const row = Math.floor(index / puzzle.n); const col = index % puzzle.n; const occupant = personAt(row, col); const room = puzzle.roomOf[row]?.[col] ?? 0; const person = occupant === undefined ? null : puzzle.people[Number(occupant)]; return <button key={`${row}-${col}`} className={`asesidoku-cell room-${room % 6} ${occupant ? "occupied" : ""}`} onClick={() => toggleCell(row, col)} aria-label={`Fila ${row + 1}, columna ${col + 1}`}>{person ? <span><b>{person.name.slice(0, 1)}</b><small>{person.name}</small></span> : <span className="cell-coordinate">{row + 1},{col + 1}</span>}</button>; })}</div><div className="asesidoku-legend"><span><i className="legend-dot gold" />Habitaciones verificadas</span><span><i className="legend-dot red" />Víctima / responsable</span><span><Copy className="h-3.5 w-3.5" />Código compartible en la URL</span></div><div className="asesidoku-bridge"><strong>¿Quieres crear una variación narrativa?</strong><span>La matriz queda protegida mientras Murdoku Studio cambia nombres, tono, temática y pistas.</span><a href="/studio">Continuar en Murdoku Studio →</a></div></section></section></main>;
}
