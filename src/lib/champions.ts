import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wildRiftAPI } from '@wildrift/champions-api'
import type { Champion } from '@/types/wildrift'

const LS_KEY = 'wr_champions_cache'
const LS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function readCache(): Champion[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw) as { data: Champion[]; ts: number }
    if (Date.now() - ts > LS_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(data: Champion[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // storage full — ignore, TQ in-memory cache still works
  }
}

async function loadChampions(): Promise<Champion[]> {
  const cached = readCache()
  if (cached) return cached

  const headers = await wildRiftAPI.loadChampionHeaders()
  const results = await Promise.all(
    headers.map(async (header) => {
      try {
        return await wildRiftAPI.fetchChampion(header)
      } catch (err) {
        console.warn(`No se pudo cargar ${header.name}:`, (err as Error).message)
        return null
      }
    })
  )
  const fullList = results.filter((c): c is NonNullable<typeof c> => c !== null)
  if (fullList.length === 0) throw new Error('No se pudo cargar ningún campeón.')
  // Cast is safe: API type is a structural superset of our Champion interface
  const champions = fullList as unknown as Champion[]
  writeCache(champions)
  return champions
}

// Maps Wild Rift lane → champion classes that primarily play there
const LANE_TO_CLASES: Record<string, string[]> = {
  'Barón':   ['PELEADOR', 'TANQUE'],
  'Jungla':  ['PELEADOR', 'ASESINO', 'TANQUE'],
  'Mid':     ['MAGO', 'ASESINO'],
  'Dragón':  ['TIRADOR'],
  'Soporte': ['SOPORTE', 'TANQUE', 'MAGO'],
}

// Infinity: once loaded from cache or network, never refetch in this session
const NEVER_STALE = Infinity

export function useWildRiftChampions() {
  const query = useQuery({
    queryKey: ['champions'],
    queryFn: loadChampions,
    staleTime: NEVER_STALE,
    gcTime: NEVER_STALE,
  })

  const champions = query.data ?? []

  const getRandomChampion = useCallback(
    (roleOrLane?: string, excludeIds: string[] = []): Champion | null => {
      if (champions.length === 0) return null

      const excludeSet = new Set(excludeIds)
      let pool = champions.filter((c) => !excludeSet.has(c.id))

      if (roleOrLane) {
        const clases = LANE_TO_CLASES[roleOrLane]
        if (clases) {
          // Lane name — filter by corresponding classes
          const clasesUpper = new Set(clases)
          pool = pool.filter((c) => clasesUpper.has(c.role?.toUpperCase() ?? ''))
        } else {
          // Direct class filter
          pool = pool.filter((c) =>
            c.role?.toLowerCase().includes(roleOrLane.toLowerCase())
          )
        }
      }

      if (pool.length === 0) return null
      return pool[Math.floor(Math.random() * pool.length)]
    },
    [champions]
  )

  const availableRoles = Array.from(
    new Set(champions.map((c) => c.role).filter(Boolean))
  ).sort()

  return {
    champions,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    getRandomChampion,
    availableRoles,
  }
}
