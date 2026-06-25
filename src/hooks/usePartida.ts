import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarAsignacionesDePartida,
  guardarAsignacion,
  rerollPorBaneo,
  obtenerCampeonesUsadosEnTemporada,
} from '@/api/asignaciones'
import { crearPartida } from '@/api/partidas'
import { useWildRiftChampions } from '@/lib/champions'
import { nochesQueryKey, nocheHoyQueryKey } from './useNoches'

export const asignacionesQueryKey = (partidaId: string) =>
  ['partida', partidaId, 'asignaciones'] as const

export function useAsignacionesPartida(partidaId: string) {
  return useQuery({
    queryKey: asignacionesQueryKey(partidaId),
    queryFn: () => listarAsignacionesDePartida(partidaId),
    enabled: Boolean(partidaId),
  })
}

export function useAsignarCampeon(partidaId: string, temporadaId: string) {
  const queryClient = useQueryClient()
  const { getRandomChampion } = useWildRiftChampions()

  return useMutation({
    mutationFn: async ({ jugadorId, rol }: { jugadorId: string; rol?: string }) => {
      const yaJugados = await obtenerCampeonesUsadosEnTemporada(temporadaId)
      const champion = getRandomChampion(rol, yaJugados)
      if (!champion) throw new Error('No quedan campeones disponibles (se agotaron en esta temporada).')
      return guardarAsignacion(partidaId, jugadorId, champion, rol)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asignacionesQueryKey(partidaId) })
    },
  })
}

export function useRerollBaneo(partidaId: string, temporadaId: string) {
  const queryClient = useQueryClient()
  const { getRandomChampion } = useWildRiftChampions()

  return useMutation({
    mutationFn: (params: { asignacionAnteriorId: string }) =>
      rerollPorBaneo({ ...params, temporadaId, getRandomChampion }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asignacionesQueryKey(partidaId) })
    },
  })
}

export function useCrearPartida(temporadaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nocheId: string) => crearPartida(nocheId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nochesQueryKey(temporadaId) })
      queryClient.invalidateQueries({ queryKey: nocheHoyQueryKey(temporadaId) })
    },
  })
}
