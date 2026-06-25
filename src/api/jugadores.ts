import { supabase } from '@/lib/supabase'
import type { Jugador } from '@/types/wildrift'

export async function agregarJugador(grupoId: string, nombre: string): Promise<Jugador> {
  const { data, error } = await supabase
    .from('wr_jugadores')
    .insert({ grupo_id: grupoId, nombre })
    .select()
    .single()
  if (error) throw new Error(`Error agregando jugador: ${error.message}`)
  return data as Jugador
}

export async function agregarJugadores(grupoId: string, nombres: string[]): Promise<Jugador[]> {
  const rows = nombres.map((nombre) => ({ grupo_id: grupoId, nombre }))
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
