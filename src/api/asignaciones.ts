import { supabase } from '@/lib/supabase'
import type { Champion } from '@/types/wildrift'
import type { AsignacionCampeon, AsignacionConJugador } from '@/types/wildrift'

export async function obtenerCampeonesUsadosEnTemporada(
  temporadaId: string
): Promise<string[]> {
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

  // Exclude champions used by ANY player in the season, not just the current one
  const { data, error } = await supabase
    .from('wr_asignaciones_campeon')
    .select('champion_id')
    .neq('estado', 'baneado')
    .in('partida_id', partidaIds)
  if (error) throw new Error(`Error buscando campeones usados: ${error.message}`)

  return [...new Set((data ?? []).map((row: { champion_id: string }) => row.champion_id))]
}


export async function guardarAsignacion(
  partidaId: string,
  jugadorId: string,
  champion: Champion,
  rolPedido?: string
): Promise<AsignacionCampeon> {
  const { data, error } = await supabase
    .from('wr_asignaciones_campeon')
    .insert({
      partida_id: partidaId,
      jugador_id: jugadorId,
      champion_id: champion.id,
      champion_name: champion.name,
      rol_pedido: rolPedido ?? null,
      estado: 'activo',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Este jugador ya tiene un campeón asignado en esta partida.')
    }
    throw new Error(`Error guardando asignación: ${error.message}`)
  }
  return data as AsignacionCampeon
}

interface RerollParams {
  asignacionAnteriorId: string
  temporadaId: string
  getRandomChampion: (role?: string, excludeIds?: string[]) => Champion | null
}

export async function rerollPorBaneo({
  asignacionAnteriorId,
  temporadaId,
  getRandomChampion,
}: RerollParams): Promise<AsignacionCampeon> {
  // Read current row to get champion and lane
  const { data: anterior, error: errAnterior } = await supabase
    .from('wr_asignaciones_campeon')
    .select('champion_id, rol_pedido')
    .eq('id', asignacionAnteriorId)
    .single()
  if (errAnterior) throw new Error(`Error leyendo asignación: ${errAnterior.message}`)

  const { champion_id: anteriorChampionId, rol_pedido: rolPedido } =
    anterior as { champion_id: string; rol_pedido: string | null }

  const yaJugados = await obtenerCampeonesUsadosEnTemporada(temporadaId)
  // Exclude all used champions + the one being banned
  const excluir = [...new Set([...yaJugados, anteriorChampionId])]

  // Try same lane first, fall back to any lane if exhausted
  const nuevoChampion =
    (rolPedido ? getRandomChampion(rolPedido, excluir) : null) ??
    getRandomChampion(undefined, excluir)

  if (!nuevoChampion) {
    throw new Error('No quedan campeones disponibles para reasignar (se agotaron en esta temporada).')
  }

  // UPDATE in place — avoids unique constraint on (partida_id, jugador_id)
  const { data, error } = await supabase
    .from('wr_asignaciones_campeon')
    .update({
      champion_id: nuevoChampion.id,
      champion_name: nuevoChampion.name,
      estado: 'activo',
    })
    .eq('id', asignacionAnteriorId)
    .select()
    .single()

  if (error) throw new Error(`Error en reroll: ${error.message}`)
  return data as AsignacionCampeon
}


export async function listarAsignacionesDePartida(
  partidaId: string
): Promise<AsignacionConJugador[]> {
  const { data, error } = await supabase
    .from('wr_asignaciones_campeon')
    .select('*, wr_jugadores(nombre)')
    .eq('partida_id', partidaId)
  if (error) throw new Error(`Error listando asignaciones: ${error.message}`)
  return (data ?? []) as AsignacionConJugador[]
}
