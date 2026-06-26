import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Shuffle, Ban, BarChart2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useJugadores } from '@/hooks/useJugadores'
import { useAsignacionesPartida, useAsignarCampeon, useRerollBaneo } from '@/hooks/usePartida'
import { useAsignacionesRealtime } from '@/hooks/useRealtime'
import { useWildRiftChampions } from '@/lib/champions'
import type { AsignacionConJugador, Jugador } from '@/types/wildrift'

const WR_LINEAS = ['Barón', 'Jungla', 'Mid', 'Dragón', 'Soporte'] as const

export const Route = createFileRoute('/partida/$partidaId')({
  validateSearch: (search: Record<string, unknown>) => ({
    grupoId: String(search.grupoId ?? ''),
    temporadaId: String(search.temporadaId ?? ''),
    numero: Number(search.numero ?? 1),
  }),
  component: PartidaScreen,
})

// ──────────────────────────────────────────────────────────
// JugadorCard
// ──────────────────────────────────────────────────────────

interface JugadorCardProps {
  jugador: Jugador
  asignacion: AsignacionConJugador | undefined
  champions: ReturnType<typeof useWildRiftChampions>['champions']
  rolesOcupados: Set<string>
  isPending: boolean
  error?: string
  onAsignar: (jugadorId: string, rol?: string) => void
  onReroll: (asignacionId: string, jugadorId: string) => void
}

function JugadorCard({
  jugador,
  asignacion,
  champions,
  rolesOcupados,
  isPending,
  error,
  onAsignar,
  onReroll,
}: JugadorCardProps) {
  const [rol, setRol] = useState<string | undefined>()

  const champion = asignacion
    ? champions.find((c) => c.id === asignacion.champion_id)
    : null

  if (asignacion) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Champion hero image strip */}
        {champion?.image_url && (
          <div className="relative h-28 overflow-hidden">
            <img
              src={champion.image_url}
              alt={asignacion.champion_name}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 flex items-end justify-between">
              <div>
                <p className="font-display font-bold text-base leading-tight">
                  {asignacion.champion_name}
                </p>
                {asignacion.rol_pedido && (
                  <span className="text-xs text-muted-foreground">{asignacion.rol_pedido}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">{jugador.nombre}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs gap-1.5 shrink-0"
            disabled={isPending}
            onClick={() => onReroll(asignacion.id, jugador.id)}
          >
            <Ban className="h-3 w-3" />
            {isPending ? '...' : 'Banear'}
          </Button>
        </div>

        {error && <p className="px-4 pb-3 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  // Unassigned state
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="font-display font-semibold text-base mb-3">{jugador.nombre}</p>

        {/* Role pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            type="button"
            className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
              !rol
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
            }`}
            onClick={() => setRol(undefined)}
          >
            Cualquier
          </button>
          {WR_LINEAS.map((r) => {
            const ocupado = rolesOcupados.has(r)
            const activo = rol === r
            return (
              <button
                key={r}
                type="button"
                disabled={ocupado}
                className={`h-7 px-3 rounded-full text-xs font-medium border transition-colors ${
                  ocupado
                    ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground line-through'
                    : activo
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
                onClick={() => !ocupado && setRol((prev) => (prev === r ? undefined : r))}
              >
                {r}
              </button>
            )
          })}
        </div>

        <Button
          className="w-full h-10 gap-2"
          disabled={isPending || champions.length === 0}
          onClick={() => onAsignar(jugador.id, rol)}
        >
          <Shuffle className="h-4 w-4" />
          {isPending
            ? 'Asignando...'
            : champions.length === 0
              ? 'Cargando campeones...'
              : 'Asignar random'}
        </Button>
      </div>

      {error && <p className="px-4 pb-3 text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// PartidaScreen
// ──────────────────────────────────────────────────────────

function PartidaScreen() {
  const { partidaId } = Route.useParams()
  const { grupoId, temporadaId, numero } = Route.useSearch()

  const jugadoresQuery = useJugadores(grupoId)
  const asignacionesQuery = useAsignacionesPartida(partidaId)
  const { champions, loading: championsLoading, error: championsError } = useWildRiftChampions()

  const asignarMutation = useAsignarCampeon(partidaId, temporadaId)
  const rerollMutation = useRerollBaneo(partidaId, temporadaId)

  useAsignacionesRealtime(partidaId)

  const jugadores = jugadoresQuery.data ?? []
  const asignaciones = (asignacionesQuery.data ?? []).filter((a) => a.estado !== 'baneado')

  const rolesOcupados = new Set(
    asignaciones.map((a) => a.rol_pedido).filter((r): r is string => Boolean(r))
  )

  const [pendingJugadorId, setPendingJugadorId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  function clearError(jugadorId: string) {
    setErrors((prev) => {
      const next = new Map(prev)
      next.delete(jugadorId)
      return next
    })
  }

  function handleAsignar(jugadorId: string, rol?: string) {
    clearError(jugadorId)
    setPendingJugadorId(jugadorId)
    let rolEfectivo: string | undefined = rol
    if (!rolEfectivo) {
      const lineasLibres = WR_LINEAS.filter((l) => !rolesOcupados.has(l))
      rolEfectivo = lineasLibres.length > 0
        ? lineasLibres[Math.floor(Math.random() * lineasLibres.length)]
        : undefined
    }
    asignarMutation.mutate(
      { jugadorId, rol: rolEfectivo },
      {
        onSuccess: () => setPendingJugadorId(null),
        onError: (err) => {
          setPendingJugadorId(null)
          setErrors((prev) => new Map(prev).set(jugadorId, err.message))
        },
      }
    )
  }

  function handleReroll(asignacionId: string, jugadorId: string) {
    clearError(jugadorId)
    setPendingJugadorId(jugadorId)
    rerollMutation.mutate(
      { asignacionAnteriorId: asignacionId },
      {
        onSuccess: () => setPendingJugadorId(null),
        onError: (err) => {
          setPendingJugadorId(null)
          setErrors((prev) => new Map(prev).set(jugadorId, err.message))
        },
      }
    )
  }

  const isLoading = jugadoresQuery.isLoading || asignacionesQuery.isLoading
  const pageError = jugadoresQuery.error ?? asignacionesQuery.error
  const asignadosCount = asignaciones.length
  const totalCount = jugadores.length

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-10 pb-28">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link to="/grupos/$grupoId" params={{ grupoId }}>
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold">Partida #{numero}</h1>
          </div>
          {totalCount > 0 && (
            <span className="text-sm font-mono text-muted-foreground shrink-0 tabular-nums">
              {asignadosCount}/{totalCount}
            </span>
          )}
        </div>

        {championsLoading && (
          <p className="mb-4 text-center text-xs text-muted-foreground">
            Cargando campeones...
          </p>
        )}
        {championsError && (
          <p className="mb-4 text-center text-xs text-destructive">
            Error al cargar campeones: {championsError}
          </p>
        )}

        {isLoading && <LoadingState message="Cargando partida..." />}
        {pageError && <ErrorState message={pageError.message} />}

        {!isLoading && !pageError && (
          <div className="flex flex-col gap-3">
            {jugadores.map((jugador) => {
              const asignacion = asignaciones.find((a) => a.jugador_id === jugador.id) as
                | AsignacionConJugador
                | undefined
              return (
                <JugadorCard
                  key={jugador.id}
                  jugador={jugador}
                  asignacion={asignacion}
                  champions={champions}
                  rolesOcupados={rolesOcupados}
                  isPending={pendingJugadorId === jugador.id}
                  error={errors.get(jugador.id)}
                  onAsignar={handleAsignar}
                  onReroll={handleReroll}
                />
              )
            })}

            {jugadores.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">Sin jugadores en este grupo.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA fijo — ir a stats */}
      {jugadores.length > 0 && !isLoading && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm px-4 py-3">
          <div className="mx-auto max-w-md">
            <Link
              to="/stats/$partidaId"
              params={{ partidaId }}
              search={{ grupoId, temporadaId, numero }}
            >
              <Button className="w-full h-12 text-base gap-2">
                <BarChart2 className="h-5 w-5" />
                Registrar estadísticas
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
