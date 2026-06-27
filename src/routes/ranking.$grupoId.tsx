import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Trophy, Sword } from 'lucide-react'
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
// Medal
// ──────────────────────────────────────────────────────────

function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-lg leading-none">🥇</span>
  if (pos === 2) return <span className="text-lg leading-none">🥈</span>
  if (pos === 3) return <span className="text-lg leading-none">🥉</span>
  return (
    <span className="font-mono text-xs text-muted-foreground tabular-nums w-6 text-center">
      {pos}
    </span>
  )
}

// ──────────────────────────────────────────────────────────
// Temporada table
// ──────────────────────────────────────────────────────────

function TablaTemporada({ rows }: { rows: RankingRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <Sword className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Sin partidas jugadas esta temporada.</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {rows.map((row, i) => {
        const kda = typeof row.kda === 'number' ? row.kda.toFixed(2) : '—'
        const pos = i + 1
        const isFirst = pos === 1

        return (
          <div
            key={row.jugador_id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              i < rows.length - 1 ? 'border-b border-border' : ''
            } ${isFirst ? 'bg-primary/5' : ''}`}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              <Medal pos={pos} />
            </div>

            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${isFirst ? 'text-base' : 'text-sm'}`}>
                {row.jugador_nombre}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                <span className="text-emerald-400">{row.total_kills}</span>
                <span className="opacity-40">/</span>
                <span className="text-red-400">{row.total_deaths}</span>
                <span className="opacity-40">/</span>
                <span className="text-blue-400">{row.total_assists}</span>
                <span className="text-muted-foreground opacity-60 mx-1.5">·</span>
                {row.partidas_jugadas}p
              </p>
            </div>

            <div className="shrink-0 text-right mr-2">
              <p className={`font-mono font-bold tabular-nums ${isFirst ? 'text-base text-primary' : 'text-sm'}`}>
                {kda}
              </p>
              <p className="text-xs text-muted-foreground">KDA</p>
            </div>

            <div className="shrink-0 flex flex-col gap-1 items-end">
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono font-medium">
                {row.victorias}V
              </span>
              {row.derrotas > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 font-mono font-medium">
                  {row.derrotas}D
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Histórico table
// ──────────────────────────────────────────────────────────

function TablaHistorico({ rows }: { rows: RankingViewRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Sin datos históricos todavía.</p>
      </div>
    )
  }

  const sorted = [...rows].sort((a, b) =>
    b.victorias - a.victorias || (b.kda ?? 0) - (a.kda ?? 0)
  )

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {sorted.map((row, i) => {
        const pos = i + 1
        const isFirst = pos === 1
        const nombre = String((row as Record<string, unknown>).jugador_nombre ?? row.jugador_id)
        const kda = typeof row.kda === 'number' ? row.kda.toFixed(2) : '—'

        return (
          <div
            key={row.jugador_id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              i < sorted.length - 1 ? 'border-b border-border' : ''
            } ${isFirst ? 'bg-primary/5' : ''}`}
          >
            <div className="w-7 flex items-center justify-center shrink-0">
              <Medal pos={pos} />
            </div>
            <p className={`flex-1 font-semibold truncate ${isFirst ? 'text-base' : 'text-sm'}`}>
              {nombre}
            </p>
            <div className="shrink-0 text-right mr-2">
              <p className={`font-mono font-bold tabular-nums ${isFirst ? 'text-base text-primary' : 'text-sm'}`}>
                {kda}
              </p>
              <p className="text-xs text-muted-foreground">KDA</p>
            </div>
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-mono font-medium">
              {row.victorias}V
            </span>
          </div>
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 pt-10 pb-12">
        {/* Header */}
        <div className="mb-7 flex items-center gap-3">
          <Link to="/grupos/$grupoId" params={{ grupoId }}>
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Trophy className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              {grupoNombre && (
                <p className="text-xs text-muted-foreground truncate">{grupoNombre}</p>
              )}
              <h1 className="font-display text-2xl font-bold leading-tight">Ranking</h1>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mb-5 flex rounded-xl border border-border p-1 bg-card gap-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              tab === 'temporada'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setTab('temporada')}
          >
            Temporada
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              tab === 'historico'
                ? 'bg-primary text-primary-foreground shadow-sm'
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
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">Sin temporada activa.</p>
              </div>
            )}
            {tab === 'temporada' && temporadaId && (
              <TablaTemporada rows={(temporadaQuery.data ?? []) as RankingRow[]} />
            )}
            {tab === 'historico' && (
              <TablaHistorico rows={(historicoQuery.data ?? []) as RankingViewRow[]} />
            )}
          </>
        )}
      </div>
    </main>
  )
}
