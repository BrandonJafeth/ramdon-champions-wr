import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarStatsDePartida, guardarStats } from '@/api/stats'
import { finalizarPartida } from '@/api/partidas'
import { progresoQueryKey } from './useTemporada'

export const statsQueryKey = (partidaId: string) =>
  ['partida', partidaId, 'stats'] as const

export function useStatsPartida(partidaId: string) {
  return useQuery({
    queryKey: statsQueryKey(partidaId),
    queryFn: () => listarStatsDePartida(partidaId),
    enabled: Boolean(partidaId),
  })
}

export function useGuardarStats(partidaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      jugadorId: string
      kills: number
      deaths: number
      assists: number
      resultado: 'gano' | 'perdio'
    }) => guardarStats(partidaId, params.jugadorId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statsQueryKey(partidaId) })
    },
  })
}

export function useFinalizarPartida(partidaId: string, temporadaId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => finalizarPartida(partidaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statsQueryKey(partidaId) })
      queryClient.invalidateQueries({ queryKey: progresoQueryKey(temporadaId) })
    },
  })
}
