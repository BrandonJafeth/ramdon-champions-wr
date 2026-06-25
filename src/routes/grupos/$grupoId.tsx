import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, UserPlus, UserMinus, Swords, Trophy, CalendarPlus, Play, BarChart2, MoonStar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useGrupos } from '@/hooks/useGrupos'
import { useJugadores, useAgregarJugador, useAgregarJugadores, useEliminarJugador } from '@/hooks/useJugadores'
import { useTemporadaActiva, useCrearTemporada, useProgresoTemporada } from '@/hooks/useTemporada'
import { useNoches, useCrearNoche, useCerrarNoche, useReabrirNoche } from '@/hooks/useNoches'
import { useCrearPartida } from '@/hooks/usePartida'
import { useWildRiftChampions } from '@/lib/champions'
import type { Jugador, Noche, ProgresoTemporada } from '@/types/wildrift'

export const Route = createFileRoute('/grupos/$grupoId')({
  component: GrupoDetalle,
})

// ──────────────────────────────────────────────────────────
// Jugadores section
// ──────────────────────────────────────────────────────────

function AgregarJugadorDialog({ grupoId }: { grupoId: string }) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [modo, setModo] = useState<'uno' | 'lote'>('uno')
  const agregar = useAgregarJugador(grupoId)
  const agregarLote = useAgregarJugadores(grupoId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) return

    if (modo === 'lote') {
      const nombres = trimmed
        .split('\n')
        .map((n) => n.trim())
        .filter(Boolean)
      agregarLote.mutate(nombres, {
        onSuccess: () => { setNombre(''); setOpen(false) },
      })
    } else {
      agregar.mutate(trimmed, {
        onSuccess: () => { setNombre(''); setOpen(false) },
      })
    }
  }

  const isPending = agregar.isPending || agregarLote.isPending
  const error = agregar.error ?? agregarLote.error

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        Agregar
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar jugador{modo === 'lote' ? 'es' : ''}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant={modo === 'uno' ? 'default' : 'outline'}
            onClick={() => setModo('uno')}
          >
            Uno
          </Button>
          <Button
            size="sm"
            variant={modo === 'lote' ? 'default' : 'outline'}
            onClick={() => setModo('lote')}
          >
            Varios
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {modo === 'uno' ? (
            <Input
              placeholder="Nombre del jugador"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          ) : (
            <textarea
              className="min-h-25 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder={'Un nombre por línea:\nJuan\nPedro\nMaría'}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          )}
          {error && <p className="text-xs text-destructive">{error.message}</p>}
          <Button type="submit" disabled={isPending || !nombre.trim()}>
            {isPending ? 'Agregando...' : 'Agregar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function JugadorRow({ jugador, grupoId }: { jugador: Jugador; grupoId: string }) {
  const eliminar = useEliminarJugador(grupoId)
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm font-medium">{jugador.nombre}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        disabled={eliminar.isPending}
        onClick={() => eliminar.mutate(jugador.id)}
      >
        <UserMinus className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Progreso group total
// ──────────────────────────────────────────────────────────

function ProgresoGrupo({
  progreso,
  total,
}: {
  progreso: ProgresoTemporada[]
  total: number
}) {
  const usados = progreso.reduce((sum, p) => sum + p.campeones_jugados, 0)
  const pct = total > 0 ? Math.round((usados / total) * 100) : 0

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">
          Campeones jugados{total > 0 ? ` (de ${total})` : ''}
        </span>
        <span className="text-xs font-medium tabular-nums">{usados}/{total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Noche row
// ──────────────────────────────────────────────────────────

interface NocheRowProps {
  noche: Noche
  temporadaId: string
  pendingNocheId: string | null
  onNuevaPartida: (nocheId: string) => void
  showSeparator: boolean
}

function NocheRow({ noche, temporadaId, pendingNocheId, onNuevaPartida, showSeparator }: NocheRowProps) {
  const cerrar = useCerrarNoche(temporadaId)
  const reabrir = useReabrirNoche(temporadaId)

  const fecha = new Date(noche.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const mutError = cerrar.error ?? reabrir.error

  return (
    <>
      <div className="flex items-center gap-2 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{fecha}</p>
          {mutError && (
            <p className="text-xs text-destructive truncate">{mutError.message}</p>
          )}
        </div>
        <Badge
          variant={noche.estado === 'abierta' ? 'default' : 'secondary'}
          className="text-xs shrink-0"
        >
          {noche.estado}
        </Badge>
        {noche.estado === 'abierta' && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 h-7 px-2"
            disabled={pendingNocheId === noche.id}
            onClick={() => onNuevaPartida(noche.id)}
          >
            <Play className="mr-1 h-3 w-3" />
            {pendingNocheId === noche.id ? '...' : 'Partida'}
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          disabled={cerrar.isPending || reabrir.isPending}
          onClick={() =>
            noche.estado === 'abierta'
              ? cerrar.mutate(noche.id)
              : reabrir.mutate(noche.id)
          }
          title={noche.estado === 'abierta' ? 'Cerrar noche' : 'Reabrir noche'}
        >
          {noche.estado === 'abierta' ? (
            <MoonStar className="h-3.5 w-3.5" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      {showSeparator && <Separator />}
    </>
  )
}

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────

function GrupoDetalle() {
  const { grupoId } = Route.useParams()
  const navigate = useNavigate()
  const { champions } = useWildRiftChampions()
  const totalCampeones = champions.length

  const gruposQuery = useGrupos()
  const grupoNombre = gruposQuery.data?.find((g) => g.id === grupoId)?.nombre ?? ''

  const jugadoresQuery = useJugadores(grupoId)
  const temporadaQuery = useTemporadaActiva(grupoId)
  const crearTemporada = useCrearTemporada(grupoId)

  const temporadaId = temporadaQuery.data?.id ?? ''
  const progresoQuery = useProgresoTemporada(temporadaId)
  const nochesQuery = useNoches(temporadaId)
  const crearNocheMutation = useCrearNoche(temporadaId)
  const crearPartidaMutation = useCrearPartida(temporadaId)

  const jugadores = jugadoresQuery.data ?? []
  const temporada = temporadaQuery.data
  const noches = nochesQuery.data ?? []

  const hoy = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
  const nocheHoyExiste = noches.some((n) => n.fecha === hoy)

  const [pendingNocheId, setPendingNocheId] = useState<string | null>(null)

  function handleNuevaPartida(nocheId: string) {
    setPendingNocheId(nocheId)
    crearPartidaMutation.mutate(nocheId, {
      onSuccess: (partida) => {
        setPendingNocheId(null)
        void navigate({
          to: '/partida/$partidaId',
          params: { partidaId: partida.id },
          search: { grupoId, temporadaId, numero: partida.numero },
        })
      },
      onError: () => setPendingNocheId(null),
    })
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold flex-1 truncate">{grupoNombre || 'Grupo'}</h1>
      </div>

      {/* Jugadores */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Jugadores
              {jugadores.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {jugadores.length}
                </Badge>
              )}
            </CardTitle>
            <AgregarJugadorDialog grupoId={grupoId} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {jugadoresQuery.isLoading && <LoadingState message="Cargando jugadores..." />}
          {jugadoresQuery.error && <ErrorState message={jugadoresQuery.error.message} />}
          {jugadores.length === 0 && !jugadoresQuery.isLoading && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Sin jugadores. Agregá el primero.
            </p>
          )}
          {jugadores.map((j, i) => (
            <div key={j.id}>
              <JugadorRow jugador={j} grupoId={grupoId} />
              {i < jugadores.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Temporada */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="h-4 w-4" />
              Temporada activa
            </CardTitle>
            {temporada && (
              <Link
                to="/ranking/$grupoId"
                params={{ grupoId }}
                search={{ temporadaId, grupoNombre }}
              >
                <Button size="sm" variant="ghost" className="h-8 px-2 gap-1.5 text-muted-foreground">
                  <BarChart2 className="h-4 w-4" />
                  <span className="text-xs">Ranking</span>
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {temporadaQuery.isLoading && <LoadingState message="Buscando temporada..." />}
          {temporadaQuery.error && <ErrorState message={temporadaQuery.error.message} />}

          {!temporadaQuery.isLoading && !temporada && (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-muted-foreground">Sin temporada activa.</p>
              <Button
                size="sm"
                disabled={crearTemporada.isPending}
                onClick={() => crearTemporada.mutate(undefined)}
              >
                {crearTemporada.isPending ? 'Creando...' : 'Iniciar temporada'}
              </Button>
              {crearTemporada.isError && (
                <p className="mt-2 text-xs text-destructive">{crearTemporada.error.message}</p>
              )}
            </div>
          )}

          {temporada && (
            <div className="py-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{temporada.nombre}</span>
                <Badge variant="secondary" className="text-xs">activa</Badge>
              </div>

              {/* Progreso */}
              {progresoQuery.isLoading && (
                <p className="text-xs text-muted-foreground py-2">Cargando progreso...</p>
              )}
              {progresoQuery.data && progresoQuery.data.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">
                  Sin partidas jugadas todavía.
                </p>
              )}
              {progresoQuery.data && progresoQuery.data.length > 0 && (
                <div className="mb-3">
                  <ProgresoGrupo
                    progreso={progresoQuery.data}
                    total={totalCampeones}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Noches */}
      {temporada && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MoonStar className="h-4 w-4" />
                Noches
                {noches.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{noches.length}</Badge>
                )}
              </CardTitle>
              <Button
                size="sm"
                disabled={crearNocheMutation.isPending || nocheHoyExiste}
                onClick={() => crearNocheMutation.mutate(undefined)}
              >
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                {crearNocheMutation.isPending ? 'Creando...' : 'Nueva noche'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {nochesQuery.isLoading && <LoadingState message="Cargando noches..." />}
            {crearNocheMutation.isError && (
              <p className="mb-2 text-xs text-destructive">{crearNocheMutation.error.message}</p>
            )}
            {crearPartidaMutation.isError && (
              <p className="mb-2 text-xs text-destructive">{crearPartidaMutation.error.message}</p>
            )}
            {noches.length === 0 && !nochesQuery.isLoading && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin noches. Creá una para empezar.
              </p>
            )}
            {noches.map((noche, i) => (
              <NocheRow
                key={noche.id}
                noche={noche}
                temporadaId={temporadaId}
                pendingNocheId={pendingNocheId}
                onNuevaPartida={handleNuevaPartida}
                showSeparator={i < noches.length - 1}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
