import { supabase } from '@/lib/supabase'
import type { Grupo } from '@/types/wildrift'

export async function crearGrupo(nombre: string): Promise<Grupo> {
  const { data, error } = await supabase
    .from('wr_grupos')
    .insert({ nombre })
    .select()
    .single()
  if (error) throw new Error(`Error creando grupo: ${error.message}`)
  return data as Grupo
}

export async function listarGrupos(): Promise<Grupo[]> {
  const { data, error } = await supabase
    .from('wr_grupos')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Error listando grupos: ${error.message}`)
  return (data ?? []) as Grupo[]
}

export async function eliminarGrupo(grupoId: string): Promise<void> {
  const { error } = await supabase.from('wr_grupos').delete().eq('id', grupoId)
  if (error) throw new Error(`Error eliminando grupo: ${error.message}`)
}
