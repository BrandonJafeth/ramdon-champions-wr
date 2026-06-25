import { supabase } from '@/lib/supabase'
import type { Partida } from '@/types/wildrift'

export async function crearPartida(nocheId: string): Promise<Partida> {
  const { data: ultima, error: errBusqueda } = await supabase
    .from('wr_partidas')
    .select('numero')
    .eq('noche_id', nocheId)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (errBusqueda) throw new Error(`Error calculando número de partida: ${errBusqueda.message}`)

  const siguienteNumero = ((ultima as { numero: number } | null)?.numero ?? 0) + 1

  const { data, error } = await supabase
    .from('wr_partidas')
    .insert({ noche_id: nocheId, numero: siguienteNumero, estado: 'en_curso' })
    .select()
    .single()
  if (error) throw new Error(`Error creando partida: ${error.message}`)
  return data as Partida
}

export async function listarPartidas(nocheId: string): Promise<Partida[]> {
  const { data, error } = await supabase
    .from('wr_partidas')
    .select('*')
    .eq('noche_id', nocheId)
    .order('numero')
  if (error) throw new Error(`Error listando partidas: ${error.message}`)
  return (data ?? []) as Partida[]
}

export async function finalizarPartida(partidaId: string): Promise<Partida> {
  const { data, error } = await supabase
    .from('wr_partidas')
    .update({ estado: 'finalizada' })
    .eq('id', partidaId)
    .select()
    .single()
  if (error) throw new Error(`Error finalizando partida: ${error.message}`)
  return data as Partida
}
