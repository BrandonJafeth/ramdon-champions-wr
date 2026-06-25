import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Clock, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
// Stepper (mobile-friendly +/- control)
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
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-border text-base leading-none hover:bg-muted disabled:opacity-40"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
        >
          −
        </button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          className="h-8 w-8 rounded-full border border-border text-base leading-none hover:bg-muted"
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
  const [kills, setKills] = useState(0)
  const [deaths, setDeaths] = useState(0)
  const [assists, setAssists] = useState(0)
  const [resultado, setResultado] = useState<'gano' | 'perdio'>('gano')
  const guardar = useGuardarStats(partidaId)

  if (stats) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{jugador.nombre}</p>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">
              {stats.kills}/{stats.deaths}/{stats.assists}
            </span>
            <Badge
              className={`text-xs text-white ${
                stats.resultado === 'gano'
                  ? 'bg-green-600 hover:bg-green-600'
                  : 'bg-red-600 hover:bg-red-600'
              }`}
            >
              {stats.resultado === 'gano' ? 'Ganó' : 'Perdió'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  function handleGuardar() {
    guardar.mutate({ jugadorId: jugador.id, kills, deaths, assists, resultado })
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">{jugador.nombre}</p>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex gap-2 mb-4">
          <Stepper value={kills} onChange={setKills} label="Kills" />
          <Stepper value={deaths} onChange={setDeaths} label="Deaths" />
          <Stepper value={assists} onChange={setAssists} label="Assists" />
        </div>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-sm font-medium border transition-colors ${
              resultado === 'gano'
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-transparent text-muted-foreground border-border hover:border-green-500'
            }`}
            onClick={() => setResultado('gano')}
          >
            Ganó
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-1.5 text-sm font-medium border transition-colors ${
              resultado === 'perdio'
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-transparent text-muted-foreground border-border hover:border-destructive'
            }`}
            onClick={() => setResultado('perdio')}
          >
            Perdió
          </button>
        </div>

        {guardar.isError && (
          <p className="mb-2 text-xs text-destructive">{guardar.error.message}</p>
        )}

        <Button
          size="sm"
          className="w-full"
          disabled={guardar.isPending}
          onClick={handleGuardar}
        >
          {guardar.isPending ? 'Guardando...' : 'Guardar stats'}
        </Button>
      </CardContent>
    </Card>
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
    <main className="mx-auto max-w-md px-4 py-6 pb-32">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/partida/$partidaId"
          params={{ partidaId }}
          search={{ grupoId, temporadaId, numero }}
        >
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Stats Partida #{numero}</h1>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {submitidos}/{total}
        </span>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-4 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((submitidos / total) * 100)}%` }}
          />
        </div>
      )}

      {isLoading && <LoadingState message="Cargando stats..." />}
      {pageError && <ErrorState message={pageError.message} />}

      {!isLoading && !pageError && (
        <div className="flex flex-col gap-3">
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

      {/* Cerrar partida — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-md">
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
            className="w-full"
            disabled={!todosLisios || finalizarMutation.isPending}
            onClick={handleCerrar}
          >
            <BarChart2 className="mr-1.5 h-4 w-4" />
            {finalizarMutation.isPending ? 'Cerrando...' : 'Cerrar partida'}
          </Button>
        </div>
      </div>
    </main>
  )
}
