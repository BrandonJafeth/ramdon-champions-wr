import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listarGrupos, crearGrupo, eliminarGrupo } from '@/api/grupos'

export const gruposQueryKey = ['grupos'] as const

export function useGrupos() {
  return useQuery({
    queryKey: gruposQueryKey,
    queryFn: listarGrupos,
  })
}

export function useCrearGrupo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => crearGrupo(nombre),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gruposQueryKey }),
  })
}

export function useEliminarGrupo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (grupoId: string) => eliminarGrupo(grupoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gruposQueryKey }),
  })
}
