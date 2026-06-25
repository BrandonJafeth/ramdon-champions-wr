import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  obtenerTemporadaActiva,
  crearTemporada,
  finalizarTemporada,
  obtenerProgresoTemporada,
} from '@/api/temporadas'

export const temporadaActivaQueryKey = (grupoId: string) =>
  ['grupos', grupoId, 'temporada-activa'] as const

export const progresoQueryKey = (temporadaId: string) =>
  ['temporada', temporadaId, 'progreso'] as const

export function useTemporadaActiva(grupoId: string) {
  return useQuery({
    queryKey: temporadaActivaQueryKey(grupoId),
    queryFn: () => obtenerTemporadaActiva(grupoId),
    enabled: Boolean(grupoId),
  })
}

export function useCrearTemporada(grupoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre?: string) => crearTemporada(grupoId, nombre),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: temporadaActivaQueryKey(grupoId) }),
  })
}

export function useFinalizarTemporada(grupoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (temporadaId: string) => finalizarTemporada(temporadaId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: temporadaActivaQueryKey(grupoId) }),
  })
}

export function useProgresoTemporada(temporadaId: string) {
  return useQuery({
    queryKey: progresoQueryKey(temporadaId),
    queryFn: () => obtenerProgresoTemporada(temporadaId),
    enabled: Boolean(temporadaId),
  })
}
