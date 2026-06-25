import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useRankingTemporada, useRankingHistorico } from '@/hooks/useRanking'
import type { RankingRow, RankingViewRow } from '@/types/wildrift'

export const Route = createFileRoute('/ranking/$grupoId')({
  validateSearch: (search: Record<string, unknown>) => ({
    temporadaId: String(search.temporadaId ?? ''),
    grupoNombre: String(search.grupoNombre ?? ''),
  }),
  component: RankingScreen,
})

// ──────────────────────────────────────────────────────────
// Medal helper
// ──────────────────────────────────────────────────────────

function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-base">🥇</span>
  if (pos === 2) return <span className="text-base">🥈</span>
  if (pos === 3) return <span className="text-base">🥉</span>
  return <span className="text-xs text-muted-foreground tabular-nums">{pos}</span>
}

// ──────────────────────────────────────────────────────────
// Temporada ranking table (full stats)
// ──────────────────────────────────────────────────────────

function TablaTemporada({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin partidas jugadas esta temporada.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => {
        const kda = row.kda.toFixed(2)
        const pos = i + 1
        return (
          <Card key={row.jugador_id} className={pos === 1 ? 'border-amber-300 dark:border-amber-600' : ''}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-7 flex justify-center shrink-0">
                  <Medal pos={pos} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{row.jugador_nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.total_kills}/{row.total_deaths}/{row.total_assists}
                    <span className="mx-1.5 opacity-40">·</span>
                    {row.partidas_jugadas} partida{row.partidas_jugadas !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{kda}</p>
                  <p className="text-xs text-muted-foreground">KDA</p>
                </div>
                <div className="shrink-0 flex gap-1">
                  <Badge className="text-xs bg-green-600 text-white hover:bg-green-600">
                    {row.victorias}V
                  </Badge>
                  {row.derrotas > 0 && (
                    <Badge className="text-xs bg-red-600 text-white hover:bg-red-600">
                      {row.derrotas}D
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Histórico ranking table (view: victorias + kda only)
// ──────────────────────────────────────────────────────────

function TablaHistorico({ rows }: { rows: RankingViewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos históricos todavía.
      </p>
    )
  }

  // Sort by victorias desc, kda desc
  const sorted = [...rows].sort((a, b) => b.victorias - a.victorias || b.kda - a.kda)

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((row, i) => {
        const pos = i + 1
        const nombre = String((row as Record<string, unknown>).jugador_nombre ?? row.jugador_id)
        const kda = typeof row.kda === 'number' ? row.kda.toFixed(2) : '—'
        return (
          <Card key={row.jugador_id} className={pos === 1 ? 'border-amber-300 dark:border-amber-600' : ''}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-7 flex justify-center shrink-0">
                  <Medal pos={pos} />
                </div>
                <p className="flex-1 text-sm font-semibold truncate">{nombre}</p>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{kda}</p>
                  <p className="text-xs text-muted-foreground">KDA</p>
                </div>
                <Badge className="shrink-0 text-xs bg-green-600 text-white hover:bg-green-600">
                  {row.victorias}V
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// RankingScreen
// ──────────────────────────────────────────────────────────

type Tab = 'temporada' | 'historico'

function RankingScreen() {
  const { grupoId } = Route.useParams()
  const { temporadaId, grupoNombre } = Route.useSearch()
  const [tab, setTab] = useState<Tab>('temporada')

  const temporadaQuery = useRankingTemporada(temporadaId)
  const historicoQuery = useRankingHistorico(grupoId)

  const activeQuery = tab === 'temporada' ? temporadaQuery : historicoQuery

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Link to="/grupos/$grupoId" params={{ grupoId }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" />
          <h1 className="text-xl font-bold truncate">
            Ranking{grupoNombre ? ` · ${grupoNombre}` : ''}
          </h1>
        </div>
      </div>

      {/* Toggle tabs */}
      <div className="mb-4 flex rounded-lg border border-border p-0.5 bg-muted">
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === 'temporada'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('temporada')}
        >
          Temporada
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === 'historico'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTab('historico')}
        >
          Histórico
        </button>
      </div>

      {activeQuery.isLoading && <LoadingState message="Cargando ranking..." />}
      {activeQuery.error && <ErrorState message={activeQuery.error.message} />}

      {!activeQuery.isLoading && !activeQuery.error && (
        <>
          {tab === 'temporada' && !temporadaId && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin temporada activa.
            </p>
          )}
          {tab === 'temporada' && temporadaId && (
            <TablaTemporada rows={(temporadaQuery.data ?? []) as RankingRow[]} />
          )}
          {tab === 'historico' && (
            <TablaHistorico rows={(historicoQuery.data ?? []) as RankingViewRow[]} />
          )}
        </>
      )}
    </main>
  )
}
