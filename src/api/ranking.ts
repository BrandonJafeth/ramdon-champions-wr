import { supabase } from '@/lib/supabase'
import type { RankingViewRow, RankingRow } from '@/types/wildrift'

export async function obtenerRanking(grupoId: string): Promise<RankingViewRow[]> {
  const { data, error } = await supabase
    .from('wr_ranking')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('victorias', { ascending: false })
    .order('kda', { ascending: false })
  if (error) throw new Error(`Error obteniendo ranking: ${error.message}`)
  return (data ?? []) as RankingViewRow[]
}

export async function obtenerRankingDeTemporada(temporadaId: string): Promise<RankingRow[]> {
  const { data: noches, error: errNoches } = await supabase
    .from('wr_noches')
    .select('id')
    .eq('temporada_id', temporadaId)
  if (errNoches) throw new Error(`Error buscando noches: ${errNoches.message}`)

  const nocheIds = (noches ?? []).map((n: { id: string }) => n.id)
  if (nocheIds.length === 0) return []

  const { data: partidas, error: errPartidas } = await supabase
    .from('wr_partidas')
    .select('id')
    .in('noche_id', nocheIds)
  if (errPartidas) throw new Error(`Error buscando partidas: ${errPartidas.message}`)

  const partidaIds = (partidas ?? []).map((p: { id: string }) => p.id)
  if (partidaIds.length === 0) return []

  const { data, error } = await supabase
    .from('wr_stats_partida')
    .select('jugador_id, kills, deaths, assists, resultado, wr_jugadores(nombre)')
    .in('partida_id', partidaIds)
  if (error) throw new Error(`Error calculando ranking: ${error.message}`)

  type StatRow = {
    jugador_id: string
    kills: number
    deaths: number
    assists: number
    resultado: string
    // Supabase returns related rows as array for many-to-one joins
    wr_jugadores: { nombre: string }[] | { nombre: string } | null
  }

  const agregados = new Map<string, Omit<RankingRow, 'kda'>>()
  for (const row of (data ?? []) as StatRow[]) {
    const key = row.jugador_id
    if (!agregados.has(key)) {
      agregados.set(key, {
        jugador_id: key,
        jugador_nombre: Array.isArray(row.wr_jugadores)
          ? (row.wr_jugadores[0]?.nombre ?? 'Desconocido')
          : (row.wr_jugadores?.nombre ?? 'Desconocido'),
        partidas_jugadas: 0,
        total_kills: 0,
        total_deaths: 0,
        total_assists: 0,
        victorias: 0,
        derrotas: 0,
      })
    }
    const acc = agregados.get(key)!
    acc.partidas_jugadas += 1
    acc.total_kills += row.kills
    acc.total_deaths += row.deaths
    acc.total_assists += row.assists
    if (row.resultado === 'gano') acc.victorias += 1
    if (row.resultado === 'perdio') acc.derrotas += 1
  }

  const ranking: RankingRow[] = Array.from(agregados.values()).map((j) => ({
    ...j,
    kda:
      j.total_deaths > 0
        ? Math.round(((j.total_kills + j.total_assists) / j.total_deaths) * 100) / 100
        : j.total_kills + j.total_assists,
  }))

  ranking.sort((a, b) => b.victorias - a.victorias || b.kda - a.kda)
  return ranking
}
