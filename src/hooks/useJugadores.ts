import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarJugadores, agregarJugador, agregarJugadores, eliminarJugador } from '@/api/jugadores'

export const jugadoresQueryKey = (grupoId: string) =>
  ['grupos', grupoId, 'jugadores'] as const

export function useJugadores(grupoId: string) {
  return useQuery({
    queryKey: jugadoresQueryKey(grupoId),
    queryFn: () => listarJugadores(grupoId),
    enabled: Boolean(grupoId),
  })
}

export function useAgregarJugador(grupoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => agregarJugador(grupoId, nombre),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: jugadoresQueryKey(grupoId) }),
  })
}

export function useAgregarJugadores(grupoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombres: string[]) => agregarJugadores(grupoId, nombres),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: jugadoresQueryKey(grupoId) }),
  })
}

export function useEliminarJugador(grupoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jugadorId: string) => eliminarJugador(jugadorId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: jugadoresQueryKey(grupoId) }),
  })
}
