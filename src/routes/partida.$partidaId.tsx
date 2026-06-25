import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Shuffle, Ban, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm font-semibold mb-3">{jugador.nombre}</p>

        {!asignacion ? (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                type="button"
                className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                  !rol
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground'
                }`}
                onClick={() => setRol(undefined)}
              >
                Cualquier rol
              </button>
              {WR_LINEAS.map((r) => {
                const ocupado = rolesOcupados.has(r)
                const activo = rol === r
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={ocupado}
                    className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                      ocupado
                        ? 'opacity-35 cursor-not-allowed border-border text-muted-foreground line-through'
                        : activo
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-transparent text-muted-foreground border-border hover:border-foreground'
                    }`}
                    onClick={() => !ocupado && setRol((prev) => (prev === r ? undefined : r))}
                  >
                    {r}
                  </button>
                )
              })}
            </div>
            <Button
              size="sm"
              className="w-full"
              disabled={isPending || champions.length === 0}
              onClick={() => onAsignar(jugador.id, rol)}
            >
              <Shuffle className="mr-1.5 h-3.5 w-3.5" />
              {isPending ? 'Asignando...' : champions.length === 0 ? 'Cargando campeones...' : 'Asignar campeón random'}
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            {champion?.image_url && (
              <img
                src={champion.image_url}
                alt={asignacion.champion_name}
                className="h-14 w-14 rounded-md object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{asignacion.champion_name}</p>
              {asignacion.rol_pedido && (
                <Badge variant="secondary" className="mt-0.5 text-xs">
                  {asignacion.rol_pedido}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={isPending}
              onClick={() => onReroll(asignacion.id, jugador.id)}
            >
              <Ban className="mr-1 h-3.5 w-3.5" />
              {isPending ? 'Re-tirando...' : 'Banear'}
            </Button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
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
    // Auto-assign a random free line when player picks "Cualquier rol"
    const lineasLibres = WR_LINEAS.filter((l) => !rolesOcupados.has(l))
    const rolEfectivo = rol ?? lineasLibres[Math.floor(Math.random() * lineasLibres.length)]
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

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/grupos/$grupoId" params={{ grupoId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Partida #{numero}</h1>
      </div>

      {isLoading && <LoadingState message="Cargando partida..." />}
      {pageError && <ErrorState message={pageError.message} />}
      {championsLoading && (
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Cargando campeones...
        </p>
      )}
      {championsError && (
        <p className="mb-4 text-center text-xs text-destructive">
          Error cargando campeones: {championsError}
        </p>
      )}

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
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin jugadores en este grupo.
            </p>
          )}

          {jugadores.length > 0 && (
            <Link
              to="/stats/$partidaId"
              params={{ partidaId }}
              search={{ grupoId, temporadaId, numero }}
            >
              <Button variant="outline" className="w-full mt-2">
                <BarChart2 className="mr-1.5 h-4 w-4" />
                Registrar estadísticas
              </Button>
            </Link>
          )}
        </div>
      )}
    </main>
  )
}
