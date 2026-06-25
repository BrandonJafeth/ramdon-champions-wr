import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { nochesQueryKey } from './useNoches'
import { progresoQueryKey } from './useTemporada'

/** Invalidates ['partida', partidaId, 'stats'] on any change in wr_stats_partida */
export function useStatsRealtime(partidaId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!partidaId) return

    const channel = supabase
      .channel(`stats_partida_${partidaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wr_stats_partida',
          filter: `partida_id=eq.${partidaId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ['partida', partidaId, 'stats'],
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [partidaId, queryClient])
}

/** Invalidates ['partida', partidaId, 'asignaciones'] on any change in wr_asignaciones_campeon */
export function useAsignacionesRealtime(partidaId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!partidaId) return

    const channel = supabase
      .channel(`asignaciones_${partidaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wr_asignaciones_campeon',
          filter: `partida_id=eq.${partidaId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ['partida', partidaId, 'asignaciones'],
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [partidaId, queryClient])
}

/** Invalidates noches + progreso when partidas change in a noche */
export function useNocheRealtime(nocheId: string, temporadaId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!nocheId) return

    const channel = supabase
      .channel(`noche_${nocheId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wr_partidas',
          filter: `noche_id=eq.${nocheId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: nochesQueryKey(temporadaId) })
          void queryClient.invalidateQueries({ queryKey: progresoQueryKey(temporadaId) })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [nocheId, temporadaId, queryClient])
}
