import { supabase } from '@/lib/supabase'
import type { Temporada, ProgresoTemporada } from '@/types/wildrift'

export async function crearTemporada(grupoId: string, nombre = 'Temporada'): Promise<Temporada> {
  const { data, error } = await supabase
    .from('wr_temporadas')
    .insert({ grupo_id: grupoId, nombre, estado: 'activa' })
    .select()
    .single()
  if (error) throw new Error(`Error creando temporada: ${error.message}`)
  return data as Temporada
}

export async function listarTemporadas(grupoId: string): Promise<Temporada[]> {
  const { data, error } = await supabase
    .from('wr_temporadas')
    .select('*')
    .eq('grupo_id', grupoId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Error listando temporadas: ${error.message}`)
  return (data ?? []) as Temporada[]
}

export async function obtenerTemporadaActiva(grupoId: string): Promise<Temporada | null> {
  const { data, error } = await supabase
    .from('wr_temporadas')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('estado', 'activa')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Error buscando temporada activa: ${error.message}`)
  return data as Temporada | null
}

export async function finalizarTemporada(temporadaId: string): Promise<Temporada> {
  const { data, error } = await supabase
    .from('wr_temporadas')
    .update({ estado: 'finalizada' })
    .eq('id', temporadaId)
    .select()
    .single()
  if (error) throw new Error(`Error finalizando temporada: ${error.message}`)
  return data as Temporada
}

export async function obtenerProgresoTemporada(temporadaId: string): Promise<ProgresoTemporada[]> {
  const { data, error } = await supabase
    .from('wr_progreso_temporada')
    .select('*')
    .eq('temporada_id', temporadaId)
  if (error) throw new Error(`Error chequeando progreso: ${error.message}`)
  return (data ?? []) as ProgresoTemporada[]
}

export async function chequearTemporadaCompleta(
  temporadaId: string,
  totalCampeonesDisponibles: number
): Promise<{ completa: boolean; progreso: ProgresoTemporada[] }> {
  const progreso = await obtenerProgresoTemporada(temporadaId)
  const completa =
    progreso.length > 0 &&
    progreso.every((row) => row.campeones_jugados >= totalCampeonesDisponibles)
  return { completa, progreso }
}
