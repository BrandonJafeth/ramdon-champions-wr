import { useQuery } from '@tanstack/react-query'
import { obtenerRankingDeTemporada, obtenerRanking } from '@/api/ranking'

export function useRankingTemporada(temporadaId: string) {
  return useQuery({
    queryKey: ['temporada', temporadaId, 'ranking'],
    queryFn: () => obtenerRankingDeTemporada(temporadaId),
    enabled: Boolean(temporadaId),
  })
}

export function useRankingHistorico(grupoId: string) {
  return useQuery({
    queryKey: ['grupos', grupoId, 'ranking'],
    queryFn: () => obtenerRanking(grupoId),
    enabled: Boolean(grupoId),
  })
}
