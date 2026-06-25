// ──────────────────────────────────────────────────────────
// Champion types (mirrors @wildrift/champions-api internals,
// which declares these interfaces locally without exporting them)
// ──────────────────────────────────────────────────────────

export interface ChampionHeader {
  id: string
  name: string
  image_url: string
}

export interface Champion extends ChampionHeader {
  role: string
}

// ──────────────────────────────────────────────────────────
// Supabase row types
// ──────────────────────────────────────────────────────────

export interface Grupo {
  id: string
  nombre: string
  created_at: string
}

export interface Jugador {
  id: string
  grupo_id: string
  nombre: string
  created_at: string
}

export interface Temporada {
  id: string
  grupo_id: string
  nombre: string
  estado: 'activa' | 'finalizada'
  created_at: string
}

export interface Noche {
  id: string
  temporada_id: string
  nombre: string | null
  fecha: string
  estado: 'abierta' | 'cerrada'
  created_at: string
}

export interface Partida {
  id: string
  noche_id: string
  numero: number
  estado: 'en_curso' | 'finalizada'
  created_at: string
}

export type EstadoAsignacion = 'activo' | 'baneado' | 'jugado'

export interface AsignacionCampeon {
  id: string
  partida_id: string
  jugador_id: string
  champion_id: string
  champion_name: string
  rol_pedido: string | null
  estado: EstadoAsignacion
}

export interface AsignacionConJugador extends AsignacionCampeon {
  wr_jugadores: { nombre: string }
}

export type ResultadoPartida = 'gano' | 'perdio'

export interface StatsPartida {
  id: string
  partida_id: string
  jugador_id: string
  kills: number
  deaths: number
  assists: number
  resultado: ResultadoPartida
}

export interface StatsConJugador extends StatsPartida {
  wr_jugadores: { nombre: string }
}

/** Row from wr_ranking Supabase view */
export interface RankingViewRow {
  grupo_id: string
  jugador_id: string
  victorias: number
  kda: number
  [key: string]: unknown
}

/** Computed ranking row (built client-side from wr_stats_partida) */
export interface RankingRow {
  jugador_id: string
  jugador_nombre: string
  partidas_jugadas: number
  total_kills: number
  total_deaths: number
  total_assists: number
  victorias: number
  derrotas: number
  kda: number
}

/** Row from wr_progreso_temporada Supabase view */
export interface ProgresoTemporada {
  temporada_id: string
  jugador_id: string
  campeones_jugados: number
}

export interface ProgresoConNombre extends ProgresoTemporada {
  jugador_nombre: string
}
