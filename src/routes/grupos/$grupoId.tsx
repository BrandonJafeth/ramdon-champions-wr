import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft, UserPlus, UserMinus, Swords, Trophy,
  CalendarPlus, Play, BarChart2, MoonStar, RotateCcw,
} from 'lucide-react'
import { sileo } from 'sileo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

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

const MAX_JUGADORES = 5

// ──────────────────────────────────────────────────────────
// Section header
// ──────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  badge,
  action,
}: {
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="font-display font-semibold text-sm">{title}</h2>
        {badge}
      </div>
      {action}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Avatar
// ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-violet-500/20 text-violet-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-pink-500/20 text-pink-400',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

function Avatar({ name }: { name: string }) {
  return (
    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(name)}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// AgregarJugadorDialog
// ──────────────────────────────────────────────────────────

function AgregarJugadorDialog({
  grupoId,
  lleno,
  jugadoresActuales,
}: {
  grupoId: string
  lleno: boolean
  jugadoresActuales: number
}) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [modo, setModo] = useState<'uno' | 'lote'>('uno')
  const agregar = useAgregarJugador(grupoId)
  const agregarLote = useAgregarJugadores(grupoId)

  const slotsLibres = MAX_JUGADORES - jugadoresActuales

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nombre.trim()
    if (!trimmed) return

    if (modo === 'lote') {
      const nombres = trimmed.split('\n').map((n) => n.trim()).filter(Boolean)
      const recortados = nombres.slice(0, slotsLibres)
      agregarLote.mutate(recortados, {
        onSuccess: () => {
          sileo.success({ title: `${recortados.length} jugadores agregados` })
          setNombre(''); setOpen(false)
        },
        onError: (err) => sileo.error({ title: err.message }),
      })
    } else {
      agregar.mutate(trimmed, {
        onSuccess: () => {
          sileo.success({ title: `${trimmed} agregado` })
          setNombre(''); setOpen(false)
        },
        onError: (err) => sileo.error({ title: err.message }),
      })
    }
  }

  const isPending = agregar.isPending || agregarLote.isPending
  const error = agregar.error ?? agregarLote.error
  const nombresEscritos = nombre.split('\n').map((n) => n.trim()).filter(Boolean).length
  const loteExcede = modo === 'lote' && nombresEscritos > slotsLibres

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant="ghost"
            disabled={lleno}
            className="h-8 px-3 text-xs gap-1.5"
            title={lleno ? `Máximo ${MAX_JUGADORES} jugadores` : undefined}
          />
        }
      >
        <UserPlus className="h-3.5 w-3.5" />
        Agregar
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle className="font-display">
            Agregar jugador{modo === 'lote' ? 'es' : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant={modo === 'uno' ? 'default' : 'outline'} onClick={() => setModo('uno')} className="flex-1">
            Uno
          </Button>
          <Button size="sm" variant={modo === 'lote' ? 'default' : 'outline'} onClick={() => setModo('lote')} className="flex-1">
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
              className="h-11"
            />
          ) : (
            <>
              <textarea
                className="min-h-28 w-full rounded-lg border border-input bg-input px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder={`Un nombre por línea (${slotsLibres} lugar${slotsLibres !== 1 ? 'es' : ''}):\nJuan\nPedro\nMaría`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
              {loteExcede && (
                <p className="text-xs text-amber-400">
                  Solo quedan {slotsLibres} lugar{slotsLibres !== 1 ? 'es' : ''}.
                  Se agregarán los primeros {slotsLibres}.
                </p>
              )}
            </>
          )}
          {error && <p className="text-xs text-destructive">{error.message}</p>}
          <Button type="submit" disabled={isPending || !nombre.trim() || slotsLibres === 0} className="h-11">
            {isPending ? 'Agregando...' : 'Agregar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────────────────
// Jugador row
// ──────────────────────────────────────────────────────────

function JugadorRow({ jugador, grupoId }: { jugador: Jugador; grupoId: string }) {
  const eliminar = useEliminarJugador(grupoId)
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
      <Avatar name={jugador.nombre} />
      <span className="flex-1 text-sm font-medium">{jugador.nombre}</span>
      <button
        type="button"
        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        disabled={eliminar.isPending}
        onClick={() => eliminar.mutate(jugador.id, {
          onSuccess: () => sileo.success({ title: `${jugador.nombre} eliminado` }),
          onError: (err) => sileo.error({ title: err.message }),
        })}
        aria-label={`Eliminar ${jugador.nombre}`}
      >
        <UserMinus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Progreso
// ──────────────────────────────────────────────────────────

function ProgresoGrupo({ progreso, total }: { progreso: ProgresoTemporada[]; total: number }) {
  const usados = progreso.reduce((sum, p) => sum + p.campeones_jugados, 0)
  const pct = total > 0 ? Math.round((usados / total) * 100) : 0

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Campeones usados</span>
        <span className="text-xs font-mono font-medium tabular-nums">
          {usados}<span className="text-muted-foreground">/{total}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
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
  isLast: boolean
}

function NocheRow({ noche, temporadaId, pendingNocheId, onNuevaPartida, isLast }: NocheRowProps) {
  const cerrar = useCerrarNoche(temporadaId)
  const reabrir = useReabrirNoche(temporadaId)

  const fecha = new Date(noche.fecha + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const mutError = cerrar.error ?? reabrir.error

  return (
    <div className={`px-4 py-3 ${!isLast ? 'border-b border-border' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium capitalize">{fecha}</p>
          {mutError && (
            <p className="text-xs text-destructive truncate mt-0.5">{mutError.message}</p>
          )}
        </div>

        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          noche.estado === 'abierta'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-muted text-muted-foreground'
        }`}>
          {noche.estado}
        </span>

        {noche.estado === 'abierta' && (
          <Button
            size="sm"
            className="shrink-0 h-8 px-3 text-xs gap-1.5"
            disabled={pendingNocheId === noche.id}
            onClick={() => onNuevaPartida(noche.id)}
          >
            <Play className="h-3 w-3" />
            {pendingNocheId === noche.id ? '...' : 'Partida'}
          </Button>
        )}

        <button
          type="button"
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          disabled={cerrar.isPending || reabrir.isPending}
          onClick={() =>
            noche.estado === 'abierta'
              ? cerrar.mutate(noche.id, {
                  onSuccess: () => sileo.success({ title: 'Noche cerrada' }),
                  onError: (err) => sileo.error({ title: err.message }),
                })
              : reabrir.mutate(noche.id, {
                  onSuccess: () => sileo.success({ title: 'Noche reabierta' }),
                  onError: (err) => sileo.error({ title: err.message }),
                })
          }
          title={noche.estado === 'abierta' ? 'Cerrar noche' : 'Reabrir noche'}
        >
          {noche.estado === 'abierta' ? (
            <MoonStar className="h-3.5 w-3.5" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────

function GrupoDetalle() {
  const { grupoId } = Route.useParams()
  const navigate = useNavigate()
  const { champions, loading: championsLoading } = useWildRiftChampions()
  const totalCampeones = champions.length > 0 ? champions.length : 139

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

  const hoy = new Date().toLocaleDateString('en-CA')
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-10 pb-12">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link to="/">
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <h1 className="font-display text-2xl font-bold truncate flex-1">
            {grupoNombre || 'Grupo'}
          </h1>
          {temporada && (
            <Link
              to="/ranking/$grupoId"
              params={{ grupoId }}
              search={{ temporadaId, grupoNombre }}
            >
              <button
                type="button"
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-primary transition-colors"
                title="Ver ranking"
              >
                <Trophy className="h-4 w-4" />
              </button>
            </Link>
          )}
        </div>

        {/* ─── Jugadores ─── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <SectionHeader
            icon={<Swords className="h-4 w-4" />}
            title="Jugadores"
            badge={
              jugadores.length > 0 ? (
                <span className="text-xs font-mono text-muted-foreground">
                  {jugadores.length}/{MAX_JUGADORES}
                </span>
              ) : undefined
            }
            action={
              <AgregarJugadorDialog
                grupoId={grupoId}
                lleno={jugadores.length >= MAX_JUGADORES}
                jugadoresActuales={jugadores.length}
              />
            }
          />

          {jugadoresQuery.isLoading && (
            <div className="px-4"><LoadingState message="Cargando..." /></div>
          )}
          {jugadoresQuery.error && (
            <div className="px-4"><ErrorState message={jugadoresQuery.error.message} /></div>
          )}

          {jugadores.length === 0 && !jugadoresQuery.isLoading && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Sin jugadores. Agregá el primero.</p>
            </div>
          )}

          {jugadores.map((j) => (
            <JugadorRow key={j.id} jugador={j} grupoId={grupoId} />
          ))}
        </div>

        {/* ─── Temporada ─── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <SectionHeader
            icon={<BarChart2 className="h-4 w-4" />}
            title="Temporada activa"
          />

          {temporadaQuery.isLoading && (
            <div className="px-4"><LoadingState message="Buscando temporada..." /></div>
          )}
          {temporadaQuery.error && (
            <div className="px-4"><ErrorState message={temporadaQuery.error.message} /></div>
          )}

          {!temporadaQuery.isLoading && !temporada && (
            <div className="px-4 py-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">Sin temporada activa.</p>
              <Button
                size="sm"
                disabled={crearTemporada.isPending}
                onClick={() => crearTemporada.mutate(undefined, {
                  onSuccess: () => sileo.success({ title: 'Temporada iniciada' }),
                  onError: (err) => sileo.error({ title: err.message }),
                })}
                className="h-10 px-5"
              >
                {crearTemporada.isPending ? 'Creando...' : 'Iniciar temporada'}
              </Button>
              {crearTemporada.isError && (
                <p className="mt-2 text-xs text-destructive">{crearTemporada.error.message}</p>
              )}
            </div>
          )}

          {temporada && (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium">{temporada.nombre}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                  activa
                </span>
              </div>

              {progresoQuery.isLoading && (
                <div className="px-4 py-2">
                  <p className="text-xs text-muted-foreground">Cargando progreso...</p>
                </div>
              )}
              {progresoQuery.data && progresoQuery.data.length === 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">Sin partidas jugadas todavía.</p>
                </div>
              )}
              {progresoQuery.data && progresoQuery.data.length > 0 && !championsLoading && (
                <ProgresoGrupo progreso={progresoQuery.data} total={totalCampeones} />
              )}
            </>
          )}
        </div>

        {/* ─── Noches ─── */}
        {temporada && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <SectionHeader
              icon={<MoonStar className="h-4 w-4" />}
              title="Noches de juego"
              badge={
                noches.length > 0 ? (
                  <span className="text-xs font-mono text-muted-foreground">{noches.length}</span>
                ) : undefined
              }
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs gap-1.5"
                  disabled={crearNocheMutation.isPending || nocheHoyExiste}
                  onClick={() => crearNocheMutation.mutate(undefined, {
                    onSuccess: () => sileo.success({ title: 'Noche creada' }),
                    onError: (err) => sileo.error({ title: err.message }),
                  })}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {crearNocheMutation.isPending ? '...' : 'Nueva'}
                </Button>
              }
            />

            {nochesQuery.isLoading && (
              <div className="px-4"><LoadingState message="Cargando noches..." /></div>
            )}
            {crearNocheMutation.isError && (
              <p className="px-4 py-2 text-xs text-destructive">{crearNocheMutation.error.message}</p>
            )}
            {crearPartidaMutation.isError && (
              <p className="px-4 py-2 text-xs text-destructive">{crearPartidaMutation.error.message}</p>
            )}

            {noches.length === 0 && !nochesQuery.isLoading && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">Sin noches. Creá una para jugar.</p>
              </div>
            )}

            {noches.map((noche, i) => (
              <NocheRow
                key={noche.id}
                noche={noche}
                temporadaId={temporadaId}
                pendingNocheId={pendingNocheId}
                onNuevaPartida={handleNuevaPartida}
                isLast={i === noches.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
