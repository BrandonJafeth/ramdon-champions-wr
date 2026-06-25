import { supabase } from '@/lib/supabase'
import type { Jugador } from '@/types/wildrift'

const MAX_JUGADORES = 5

export async function agregarJugador(grupoId: string, nombre: string): Promise<Jugador> {
  // Guard: count current players before inserting
  const { count, error: errCount } = await supabase
    .from('wr_jugadores')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', grupoId)
  if (errCount) throw new Error(`Error contando jugadores: ${errCount.message}`)
  if ((count ?? 0) >= MAX_JUGADORES) {
    throw new Error(`El grupo ya tiene ${MAX_JUGADORES} jugadores (máximo permitido).`)
  }
  const { data, error } = await supabase
    .from('wr_jugadores')
    .insert({ grupo_id: grupoId, nombre })
    .select()
    .single()
  if (error) throw new Error(`Error agregando jugador: ${error.message}`)
  return data as Jugador
}

export async function agregarJugadores(grupoId: string, nombres: string[]): Promise<Jugador[]> {
  // Guard: check remaining slots before bulk insert
  const { count, error: errCount } = await supabase
    .from('wr_jugadores')
    .select('id', { count: 'exact', head: true })
    .eq('grupo_id', grupoId)
  if (errCount) throw new Error(`Error contando jugadores: ${errCount.message}`)
  const libres = MAX_JUGADORES - (count ?? 0)
  if (libres <= 0) {
    throw new Error(`El grupo ya tiene ${MAX_JUGADORES} jugadores (máximo permitido).`)
  }
  const nombresValidos = nombres.slice(0, libres)
  if (nombresValidos.length < nombres.length) {
    console.warn(`Solo se agregarán ${nombresValidos.length} de ${nombres.length} jugadores (límite de ${MAX_JUGADORES}).`)
  }
  const rows = nombresValidos.map((nombre) => ({ grupo_id: grupoId, nombre }))
  const { data, error } = await supabase.from('wr_jugadores').insert(rows).select()
  if (error) throw new Error(`Error agregando jugadores: ${error.message}`)
  return (data ?? []) as Jugador[]
}

export async function listarJugadores(grupoId: string): Promise<Jugador[]> {
  const { data, error } = await supabase
    .from('wr_jugadores')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('nombre')
  if (error) throw new Error(`Error listando jugadores: ${error.message}`)
  return (data ?? []) as Jugador[]
}

export async function eliminarJugador(jugadorId: string): Promise<void> {
  const { error } = await supabase.from('wr_jugadores').delete().eq('id', jugadorId)
  if (error) throw new Error(`Error eliminando jugador: ${error.message}`)
}
