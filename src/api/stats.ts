import { supabase } from '@/lib/supabase'
import type { StatsPartida, StatsConJugador, ResultadoPartida } from '@/types/wildrift'

interface GuardarStatsParams {
  kills: number
  deaths: number
  assists: number
  resultado: ResultadoPartida
}

export async function guardarStats(
  partidaId: string,
  jugadorId: string,
  { kills, deaths, assists, resultado }: GuardarStatsParams
): Promise<StatsPartida> {
  const { data, error } = await supabase
    .from('wr_stats_partida')
    .upsert(
      { partida_id: partidaId, jugador_id: jugadorId, kills, deaths, assists, resultado },
      { onConflict: 'partida_id,jugador_id' }
    )
    .select()
    .single()
  if (error) throw new Error(`Error guardando stats: ${error.message}`)
  return data as StatsPartida
}

export async function listarStatsDePartida(partidaId: string): Promise<StatsConJugador[]> {
  const { data, error } = await supabase
    .from('wr_stats_partida')
    .select('*, wr_jugadores(nombre)')
    .eq('partida_id', partidaId)
  if (error) throw new Error(`Error listando stats: ${error.message}`)
  return (data ?? []) as StatsConJugador[]
}

export async function statsCompletos(
  partidaId: string,
  totalJugadoresEsperado: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('wr_stats_partida')
    .select('jugador_id', { count: 'exact' })
    .eq('partida_id', partidaId)
  if (error) throw new Error(`Error chequeando stats: ${error.message}`)
  return (data?.length ?? 0) >= totalJugadoresEsperado
}
