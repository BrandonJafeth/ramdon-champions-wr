import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listarAsignacionesDePartida,
  guardarAsignacion,
  rerollPorBaneo,
  obtenerCampeonesUsadosEnTemporada,
  obtenerRolesJugadosEnTemporada,
} from '@/api/asignaciones'
import { crearPartida } from '@/api/partidas'
import { useWildRiftChampions } from '@/lib/champions'
import { nochesQueryKey, nocheHoyQueryKey } from './useNoches'

const WR_LINEAS = ['Barón', 'Jungla', 'Mid', 'Dragón', 'Soporte'] as const

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
      // Fetch fresh DB state in parallel to avoid stale-React-state race conditions
      const [yaJugados, asignacionesActuales, rolesHistoricos] = await Promise.all([
        obtenerCampeonesUsadosEnTemporada(temporadaId),
        listarAsignacionesDePartida(partidaId),
        obtenerRolesJugadosEnTemporada(temporadaId, jugadorId),
      ])

      let rolEfectivo = rol
      if (!rolEfectivo) {
        const rolesOcupados = new Set(
          asignacionesActuales
            .filter((a) => a.estado !== 'baneado')
            .map((a) => a.rol_pedido)
            .filter((r): r is string => Boolean(r))
        )
        const lineasLibres = WR_LINEAS.filter((l) => !rolesOcupados.has(l))

        if (lineasLibres.length > 0) {
          // Count how many times this player played each free lane this season.
          // Prefer the least-played ones to avoid repeating the same role.
          const conteo = new Map(lineasLibres.map((l) => [l, 0]))
          for (const r of rolesHistoricos) {
            if (conteo.has(r)) conteo.set(r, conteo.get(r)! + 1)
          }
          const minJugadas = Math.min(...conteo.values())
          const candidatas = lineasLibres.filter((l) => conteo.get(l) === minJugadas)
          rolEfectivo = candidatas[Math.floor(Math.random() * candidatas.length)]
        }
      }

      const champion = getRandomChampion(rolEfectivo, yaJugados)
      if (!champion) throw new Error('No quedan campeones disponibles (se agotaron en esta temporada).')
      return guardarAsignacion(partidaId, jugadorId, champion, rolEfectivo)
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
