import { supabase } from '@/lib/supabase'
import type { Noche } from '@/types/wildrift'

function fechaLocalHoy(): string {
  // Use local date (not UTC) to avoid crossing midnight issues for UTC-3 users
  return new Date().toLocaleDateString('en-CA') // → YYYY-MM-DD in local tz
}

export async function crearNoche(temporadaId: string, nombre?: string): Promise<Noche> {
  const { data, error } = await supabase
    .from('wr_noches')
    .insert({ temporada_id: temporadaId, fecha: fechaLocalHoy(), nombre: nombre ?? null })
    .select()
    .single()
  if (error) throw new Error(`Error creando noche: ${error.message}`)
  return data as Noche
}

export async function listarNoches(temporadaId: string): Promise<Noche[]> {
  const { data, error } = await supabase
    .from('wr_noches')
    .select('*')
    .eq('temporada_id', temporadaId)
    .order('fecha', { ascending: false })
  if (error) throw new Error(`Error listando noches: ${error.message}`)
  return (data ?? []) as Noche[]
}

export async function obtenerNocheDeHoy(temporadaId: string): Promise<Noche | null> {
  const hoy = new Date().toLocaleDateString('en-CA')
  const { data, error } = await supabase
    .from('wr_noches')
    .select('*')
    .eq('temporada_id', temporadaId)
    .eq('fecha', hoy)
    .maybeSingle()
  if (error) throw new Error(`Error buscando noche de hoy: ${error.message}`)
  return data as Noche | null
}

export async function cerrarNoche(nocheId: string): Promise<Noche> {
  const { data, error } = await supabase
    .from('wr_noches')
    .update({ estado: 'cerrada' })
    .eq('id', nocheId)
    .select()
    .single()
  if (error) throw new Error(`Error cerrando noche: ${error.message}`)
  return data as Noche
}

export async function reabrirNoche(nocheId: string): Promise<Noche> {
  const { data, error } = await supabase
    .from('wr_noches')
    .update({ estado: 'abierta' })
    .eq('id', nocheId)
    .select()
    .single()
  if (error) throw new Error(`Error reabriendo noche: ${error.message}`)
  return data as Noche
}
