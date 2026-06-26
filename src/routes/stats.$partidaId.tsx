import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Clock, BarChart2, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useJugadores } from '@/hooks/useJugadores'
import { useStatsPartida, useGuardarStats, useFinalizarPartida } from '@/hooks/useStats'
import { useStatsRealtime } from '@/hooks/useRealtime'
import type { Jugador, StatsConJugador } from '@/types/wildrift'

export const Route = createFileRoute('/stats/$partidaId')({
  validateSearch: (search: Record<string, unknown>) => ({
    grupoId: String(search.grupoId ?? ''),
    temporadaId: String(search.temporadaId ?? ''),
    numero: Number(search.numero ?? 1),
  }),
  component: StatsScreen,
})

// ──────────────────────────────────────────────────────────
// Stepper
// ──────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground tracking-wide truncate w-full text-center">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-border bg-muted text-sm leading-none hover:bg-accent active:scale-95 transition-all disabled:opacity-30 shrink-0"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
        >
          −
        </button>
        <span className="w-7 text-center text-sm font-mono font-bold tabular-nums shrink-0">{value}</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-border bg-muted text-sm leading-none hover:bg-accent active:scale-95 transition-all shrink-0"
          onClick={() => onChange(Math.min(99, value + 1))}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// JugadorStatsCard
// ──────────────────────────────────────────────────────────

interface JugadorStatsCardProps {
  jugador: Jugador
  stats: StatsConJugador | undefined
  partidaId: string
}

function JugadorStatsCard({ jugador, stats, partidaId }: JugadorStatsCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [kills, setKills] = useState(stats?.kills ?? 0)
  const [deaths, setDeaths] = useState(stats?.deaths ?? 0)
  const [assists, setAssists] = useState(stats?.assists ?? 0)
  const [resultado, setResultado] = useState<'gano' | 'perdio'>(stats?.resultado ?? 'gano')
  const guardar = useGuardarStats(partidaId)

  function enterEdit() {
    setKills(stats?.kills ?? 0)
    setDeaths(stats?.deaths ?? 0)
    setAssists(stats?.assists ?? 0)
    setResultado(stats?.resultado ?? 'gano')
    setIsEditing(true)
  }

  function handleGuardar() {
    guardar.mutate(
      { jugadorId: jugador.id, kills, deaths, assists, resultado },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  // Saved, read-only view
  if (stats && !isEditing) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-sm truncate">{jugador.nombre}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-sm font-medium">
              <span className="text-emerald-400">{stats.kills}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-400">{stats.deaths}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-blue-400">{stats.assists}</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              stats.resultado === 'gano'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400'
            }`}>
              {stats.resultado === 'gano' ? 'Victoria' : 'Derrota'}
            </span>
            <button
              type="button"
              onClick={enterEdit}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Editar stats"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Edit / new entry form
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-sm">{jugador.nombre}</p>
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-0.5 mb-4">
          <Stepper value={kills} onChange={setKills} label="Kills" />
          <Stepper value={deaths} onChange={setDeaths} label="Deaths" />
          <Stepper value={assists} onChange={setAssists} label="Assists" />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border transition-all active:scale-95 ${
              resultado === 'gano'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-transparent text-muted-foreground border-border hover:border-emerald-500/40 hover:text-emerald-400'
            }`}
            onClick={() => setResultado('gano')}
          >
            Victoria
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold border transition-all active:scale-95 ${
              resultado === 'perdio'
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-transparent text-muted-foreground border-border hover:border-red-500/40 hover:text-red-400'
            }`}
            onClick={() => setResultado('perdio')}
          >
            Derrota
          </button>
        </div>

        {guardar.isError && (
          <p className="mb-2 text-xs text-destructive">{guardar.error.message}</p>
        )}

        <Button
          size="sm"
          className="w-full h-10"
          disabled={guardar.isPending}
          onClick={handleGuardar}
        >
          {guardar.isPending ? 'Guardando...' : isEditing ? 'Actualizar stats' : 'Guardar stats'}
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// StatsScreen
// ──────────────────────────────────────────────────────────

function StatsScreen() {
  const { partidaId } = Route.useParams()
  const { grupoId, temporadaId, numero } = Route.useSearch()
  const navigate = useNavigate()

  const jugadoresQuery = useJugadores(grupoId)
  const statsQuery = useStatsPartida(partidaId)
  const finalizarMutation = useFinalizarPartida(partidaId, temporadaId)

  useStatsRealtime(partidaId)

  const jugadores = jugadoresQuery.data ?? []
  const stats = statsQuery.data ?? []
  const submitidos = stats.length
  const total = jugadores.length
  const todosLisios = total > 0 && submitidos >= total

  const isLoading = jugadoresQuery.isLoading || statsQuery.isLoading
  const pageError = jugadoresQuery.error ?? statsQuery.error

  function handleCerrar() {
    finalizarMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: '/grupos/$grupoId', params: { grupoId } })
      },
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 pt-10 pb-32">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <Link
            to="/partida/$partidaId"
            params={{ partidaId }}
            search={{ grupoId, temporadaId, numero }}
          >
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold truncate">Stats Partida #{numero}</h1>
          </div>
          <span className="text-sm font-mono font-semibold text-muted-foreground shrink-0 tabular-nums">
            {submitidos}/{total}
          </span>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mb-5 h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.round((submitidos / total) * 100)}%` }}
            />
          </div>
        )}

        {isLoading && <LoadingState message="Cargando stats..." />}
        {pageError && <ErrorState message={pageError.message} />}

        {!isLoading && !pageError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {jugadores.map((jugador) => {
              const jugadorStats = stats.find((s) => s.jugador_id === jugador.id) as
                | StatsConJugador
                | undefined
              return (
                <JugadorStatsCard
                  key={jugador.id}
                  jugador={jugador}
                  stats={jugadorStats}
                  partidaId={partidaId}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Cerrar partida — fijo abajo */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto w-full max-w-2xl">
          {!todosLisios && total > 0 && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              Esperando a {total - submitidos} jugador{total - submitidos !== 1 ? 'es' : ''}…
            </p>
          )}
          {finalizarMutation.isError && (
            <p className="mb-2 text-center text-xs text-destructive">
              {finalizarMutation.error.message}
            </p>
          )}
          <Button
            className="w-full h-12 text-base gap-2"
            disabled={!todosLisios || finalizarMutation.isPending}
            onClick={handleCerrar}
          >
            <BarChart2 className="h-5 w-5" />
            {finalizarMutation.isPending ? 'Cerrando...' : 'Cerrar partida'}
          </Button>
        </div>
      </div>
    </main>
  )
}
