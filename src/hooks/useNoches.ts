import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarNoches, crearNoche, obtenerNocheDeHoy, cerrarNoche, reabrirNoche } from '@/api/noches'

export const nochesQueryKey = (temporadaId: string) =>
  ['temporada', temporadaId, 'noches'] as const

export const nocheHoyQueryKey = (temporadaId: string) =>
  ['temporada', temporadaId, 'noche-hoy'] as const

export function useNoches(temporadaId: string) {
  return useQuery({
    queryKey: nochesQueryKey(temporadaId),
    queryFn: () => listarNoches(temporadaId),
    enabled: Boolean(temporadaId),
  })
}

export function useNocheDeHoy(temporadaId: string) {
  return useQuery({
    queryKey: nocheHoyQueryKey(temporadaId),
    queryFn: () => obtenerNocheDeHoy(temporadaId),
    enabled: Boolean(temporadaId),
  })
}

export function useCrearNoche(temporadaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre?: string) => crearNoche(temporadaId, nombre),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nochesQueryKey(temporadaId) })
      queryClient.invalidateQueries({ queryKey: nocheHoyQueryKey(temporadaId) })
    },
  })
}

export function useCerrarNoche(temporadaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nocheId: string) => cerrarNoche(nocheId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nocheHoyQueryKey(temporadaId) })
      queryClient.invalidateQueries({ queryKey: nochesQueryKey(temporadaId) })
    },
  })
}

export function useReabrirNoche(temporadaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nocheId: string) => reabrirNoche(nocheId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nocheHoyQueryKey(temporadaId) })
      queryClient.invalidateQueries({ queryKey: nochesQueryKey(temporadaId) })
    },
  })
}
