import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wildRiftAPI } from '@wildrift/champions-api'
import type { Champion } from '@/types/wildrift'

const LS_KEY = 'wr_champions_cache'
// Bump version when fallback list changes so old caches are discarded
const LS_VERSION = 2
const LS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ─────────────────────────────────────────────────────────────────────────────
// Complete Wild Rift champion fallback — 139 champions (Patch 7.1g, June 2026)
// Used to fill in champions the scraper misses.
// id       → slug used in wildrift.leagueoflegends.com/champions/<id>/
// role     → primary role string returned by the API (first role label)
// image_url→ Data Dragon splash art (always available, CORS-friendly)
// ─────────────────────────────────────────────────────────────────────────────
const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles'

const FALLBACK_CHAMPIONS: Champion[] = [
  // ── Fighters / Top (Baron) ────────────────────────────────────────────────
  { id: 'aatrox',       name: 'Aatrox',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Aatrox_0.jpg` },
  { id: 'ambessa',      name: 'Ambessa',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Ambessa_0.jpg` },
  { id: 'camille',      name: 'Camille',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Camille_0.jpg` },
  { id: 'darius',       name: 'Darius',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/Darius_0.jpg` },
  { id: 'dr-mundo',     name: 'Dr. Mundo',       role: 'Fighter',   image_url: `${DDRAGON_BASE}/DrMundo_0.jpg` },
  { id: 'fiora',        name: 'Fiora',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Fiora_0.jpg` },
  { id: 'garen',        name: 'Garen',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Garen_0.jpg` },
  { id: 'gnar',         name: 'Gnar',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Gnar_0.jpg` },
  { id: 'gwen',         name: 'Gwen',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Gwen_0.jpg` },
  { id: 'irelia',       name: 'Irelia',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/Irelia_0.jpg` },
  { id: 'jax',          name: 'Jax',             role: 'Fighter',   image_url: `${DDRAGON_BASE}/Jax_0.jpg` },
  { id: 'jayce',        name: 'Jayce',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Jayce_0.jpg` },
  { id: 'k-sante',      name: "K'Santé",         role: 'Tank',      image_url: `${DDRAGON_BASE}/KSante_0.jpg` },
  { id: 'kayle',        name: 'Kayle',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Kayle_0.jpg` },
  { id: 'malphite',     name: 'Malphite',        role: 'Tank',      image_url: `${DDRAGON_BASE}/Malphite_0.jpg` },
  { id: 'mordekaiser',  name: 'Mordekaiser',     role: 'Fighter',   image_url: `${DDRAGON_BASE}/Mordekaiser_0.jpg` },
  { id: 'nasus',        name: 'Nasus',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Nasus_0.jpg` },
  { id: 'olaf',         name: 'Olaf',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Olaf_0.jpg` },
  { id: 'ornn',         name: 'Ornn',            role: 'Tank',      image_url: `${DDRAGON_BASE}/Ornn_0.jpg` },
  { id: 'renekton',     name: 'Renekton',        role: 'Fighter',   image_url: `${DDRAGON_BASE}/Renekton_0.jpg` },
  { id: 'riven',        name: 'Riven',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Riven_0.jpg` },
  { id: 'rumble',       name: 'Rumble',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/Rumble_0.jpg` },
  { id: 'sett',         name: 'Sett',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Sett_0.jpg` },
  { id: 'shen',         name: 'Shen',            role: 'Tank',      image_url: `${DDRAGON_BASE}/Shen_0.jpg` },
  { id: 'sion',         name: 'Sion',            role: 'Tank',      image_url: `${DDRAGON_BASE}/Sion_0.jpg` },
  { id: 'singed',       name: 'Singed',          role: 'Tank',      image_url: `${DDRAGON_BASE}/Singed_0.jpg` },
  { id: 'tryndamere',   name: 'Tryndamere',      role: 'Fighter',   image_url: `${DDRAGON_BASE}/Tryndamere_0.jpg` },
  { id: 'urgot',        name: 'Urgot',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Urgot_0.jpg` },
  { id: 'volibear',     name: 'Volibear',        role: 'Fighter',   image_url: `${DDRAGON_BASE}/Volibear_0.jpg` },
  { id: 'wukong',       name: 'Wukong',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/MonkeyKing_0.jpg` },

  // ── Assassins / Mid ───────────────────────────────────────────────────────
  { id: 'akali',        name: 'Akali',           role: 'Assassin',  image_url: `${DDRAGON_BASE}/Akali_0.jpg` },
  { id: 'akshan',       name: 'Akshan',          role: 'Assassin',  image_url: `${DDRAGON_BASE}/Akshan_0.jpg` },
  { id: 'diana',        name: 'Diana',           role: 'Assassin',  image_url: `${DDRAGON_BASE}/Diana_0.jpg` },
  { id: 'ekko',         name: 'Ekko',            role: 'Assassin',  image_url: `${DDRAGON_BASE}/Ekko_0.jpg` },
  { id: 'fizz',         name: 'Fizz',            role: 'Assassin',  image_url: `${DDRAGON_BASE}/Fizz_0.jpg` },
  { id: 'katarina',     name: 'Katarina',        role: 'Assassin',  image_url: `${DDRAGON_BASE}/Katarina_0.jpg` },
  { id: 'kassadin',     name: 'Kassadin',        role: 'Assassin',  image_url: `${DDRAGON_BASE}/Kassadin_0.jpg` },
  { id: 'kha-zix',      name: "Kha'Zix",         role: 'Assassin',  image_url: `${DDRAGON_BASE}/Khazix_0.jpg` },
  { id: 'nocturne',     name: 'Nocturne',        role: 'Assassin',  image_url: `${DDRAGON_BASE}/Nocturne_0.jpg` },
  { id: 'rengar',       name: 'Rengar',          role: 'Assassin',  image_url: `${DDRAGON_BASE}/Rengar_0.jpg` },
  { id: 'talon',        name: 'Talon',           role: 'Assassin',  image_url: `${DDRAGON_BASE}/Talon_0.jpg` },
  { id: 'zed',          name: 'Zed',             role: 'Assassin',  image_url: `${DDRAGON_BASE}/Zed_0.jpg` },

  // ── Mages / Mid ──────────────────────────────────────────────────────────
  { id: 'ahri',         name: 'Ahri',            role: 'Mage',      image_url: `${DDRAGON_BASE}/Ahri_0.jpg` },
  { id: 'annie',        name: 'Annie',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Annie_0.jpg` },
  { id: 'aurora',       name: 'Aurora',          role: 'Mage',      image_url: `${DDRAGON_BASE}/Aurora_0.jpg` },
  { id: 'aurelion-sol', name: 'Aurelion Sol',    role: 'Mage',      image_url: `${DDRAGON_BASE}/AurelionSol_0.jpg` },
  { id: 'brand',        name: 'Brand',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Brand_0.jpg` },
  { id: 'corki',        name: 'Corki',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Corki_0.jpg` },
  { id: 'galio',        name: 'Galio',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Galio_0.jpg` },
  { id: 'heimerdinger', name: 'Heimerdinger',    role: 'Mage',      image_url: `${DDRAGON_BASE}/Heimerdinger_0.jpg` },
  { id: 'karma',        name: 'Karma',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Karma_0.jpg` },
  { id: 'kennen',       name: 'Kennen',          role: 'Mage',      image_url: `${DDRAGON_BASE}/Kennen_0.jpg` },
  { id: 'lissandra',    name: 'Lissandra',       role: 'Mage',      image_url: `${DDRAGON_BASE}/Lissandra_0.jpg` },
  { id: 'lux',          name: 'Lux',             role: 'Mage',      image_url: `${DDRAGON_BASE}/Lux_0.jpg` },
  { id: 'mel',          name: 'Mel',             role: 'Mage',      image_url: `${DDRAGON_BASE}/Mel_0.jpg` },
  { id: 'morgana',      name: 'Morgana',         role: 'Mage',      image_url: `${DDRAGON_BASE}/Morgana_0.jpg` },
  { id: 'norra',        name: 'Norra',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Norra_0.jpg` },
  { id: 'orianna',      name: 'Orianna',         role: 'Mage',      image_url: `${DDRAGON_BASE}/Orianna_0.jpg` },
  { id: 'ryze',         name: 'Ryze',            role: 'Mage',      image_url: `${DDRAGON_BASE}/Ryze_0.jpg` },
  { id: 'seraphine',    name: 'Seraphine',       role: 'Mage',      image_url: `${DDRAGON_BASE}/Seraphine_0.jpg` },
  { id: 'swain',        name: 'Swain',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Swain_0.jpg` },
  { id: 'syndra',       name: 'Syndra',          role: 'Mage',      image_url: `${DDRAGON_BASE}/Syndra_0.jpg` },
  { id: 'taliyah',      name: 'Taliyah',         role: 'Mage',      image_url: `${DDRAGON_BASE}/Taliyah_0.jpg` },
  { id: 'twisted-fate', name: 'Twisted Fate',    role: 'Mage',      image_url: `${DDRAGON_BASE}/TwistedFate_0.jpg` },
  { id: 'veigar',       name: 'Veigar',          role: 'Mage',      image_url: `${DDRAGON_BASE}/Veigar_0.jpg` },
  { id: 'vel-koz',      name: "Vel'Koz",         role: 'Mage',      image_url: `${DDRAGON_BASE}/Velkoz_0.jpg` },
  { id: 'vex',          name: 'Vex',             role: 'Mage',      image_url: `${DDRAGON_BASE}/Vex_0.jpg` },
  { id: 'viktor',       name: 'Viktor',          role: 'Mage',      image_url: `${DDRAGON_BASE}/Viktor_0.jpg` },
  { id: 'vladimir',     name: 'Vladimir',        role: 'Mage',      image_url: `${DDRAGON_BASE}/Vladimir_0.jpg` },
  { id: 'ziggs',        name: 'Ziggs',           role: 'Mage',      image_url: `${DDRAGON_BASE}/Ziggs_0.jpg` },
  { id: 'zoe',          name: 'Zoe',             role: 'Mage',      image_url: `${DDRAGON_BASE}/Zoe_0.jpg` },
  { id: 'zyra',         name: 'Zyra',            role: 'Mage',      image_url: `${DDRAGON_BASE}/Zyra_0.jpg` },

  // ── Marksmen / Dragon (ADC) ───────────────────────────────────────────────
  { id: 'ashe',         name: 'Ashe',            role: 'Marksman',  image_url: `${DDRAGON_BASE}/Ashe_0.jpg` },
  { id: 'caitlyn',      name: 'Caitlyn',         role: 'Marksman',  image_url: `${DDRAGON_BASE}/Caitlyn_0.jpg` },
  { id: 'draven',       name: 'Draven',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Draven_0.jpg` },
  { id: 'ezreal',       name: 'Ezreal',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Ezreal_0.jpg` },
  { id: 'jhin',         name: 'Jhin',            role: 'Marksman',  image_url: `${DDRAGON_BASE}/Jhin_0.jpg` },
  { id: 'jinx',         name: 'Jinx',            role: 'Marksman',  image_url: `${DDRAGON_BASE}/Jinx_0.jpg` },
  { id: 'kai-sa',       name: "Kai'Sa",          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Kaisa_0.jpg` },
  { id: 'kalista',      name: 'Kalista',         role: 'Marksman',  image_url: `${DDRAGON_BASE}/Kalista_0.jpg` },
  { id: 'kog-maw',      name: "Kog'Maw",         role: 'Marksman',  image_url: `${DDRAGON_BASE}/KogMaw_0.jpg` },
  { id: 'lucian',       name: 'Lucian',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Lucian_0.jpg` },
  { id: 'miss-fortune', name: 'Miss Fortune',    role: 'Marksman',  image_url: `${DDRAGON_BASE}/MissFortune_0.jpg` },
  { id: 'nilah',        name: 'Nilah',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Nilah_0.jpg` },
  { id: 'samira',       name: 'Samira',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Samira_0.jpg` },
  { id: 'sivir',        name: 'Sivir',           role: 'Marksman',  image_url: `${DDRAGON_BASE}/Sivir_0.jpg` },
  { id: 'smolder',      name: 'Smolder',         role: 'Marksman',  image_url: `${DDRAGON_BASE}/Smolder_0.jpg` },
  { id: 'tristana',     name: 'Tristana',        role: 'Marksman',  image_url: `${DDRAGON_BASE}/Tristana_0.jpg` },
  { id: 'twitch',       name: 'Twitch',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Twitch_0.jpg` },
  { id: 'varus',        name: 'Varus',           role: 'Marksman',  image_url: `${DDRAGON_BASE}/Varus_0.jpg` },
  { id: 'vayne',        name: 'Vayne',           role: 'Marksman',  image_url: `${DDRAGON_BASE}/Vayne_0.jpg` },
  { id: 'xayah',        name: 'Xayah',           role: 'Marksman',  image_url: `${DDRAGON_BASE}/Xayah_0.jpg` },
  { id: 'zeri',         name: 'Zeri',            role: 'Marksman',  image_url: `${DDRAGON_BASE}/Zeri_0.jpg` },

  // ── Supports ──────────────────────────────────────────────────────────────
  { id: 'alistar',      name: 'Alistar',         role: 'Support',   image_url: `${DDRAGON_BASE}/Alistar_0.jpg` },
  { id: 'bard',         name: 'Bard',            role: 'Support',   image_url: `${DDRAGON_BASE}/Bard_0.jpg` },
  { id: 'blitzcrank',   name: 'Blitzcrank',      role: 'Support',   image_url: `${DDRAGON_BASE}/Blitzcrank_0.jpg` },
  { id: 'braum',        name: 'Braum',           role: 'Support',   image_url: `${DDRAGON_BASE}/Braum_0.jpg` },
  { id: 'janna',        name: 'Janna',           role: 'Support',   image_url: `${DDRAGON_BASE}/Janna_0.jpg` },
  { id: 'leona',        name: 'Leona',           role: 'Support',   image_url: `${DDRAGON_BASE}/Leona_0.jpg` },
  { id: 'lulu',         name: 'Lulu',            role: 'Support',   image_url: `${DDRAGON_BASE}/Lulu_0.jpg` },
  { id: 'milio',        name: 'Milio',           role: 'Support',   image_url: `${DDRAGON_BASE}/Milio_0.jpg` },
  { id: 'nami',         name: 'Nami',            role: 'Support',   image_url: `${DDRAGON_BASE}/Nami_0.jpg` },
  { id: 'nautilus',     name: 'Nautilus',        role: 'Support',   image_url: `${DDRAGON_BASE}/Nautilus_0.jpg` },
  { id: 'pyke',         name: 'Pyke',            role: 'Support',   image_url: `${DDRAGON_BASE}/Pyke_0.jpg` },
  { id: 'rakan',        name: 'Rakan',           role: 'Support',   image_url: `${DDRAGON_BASE}/Rakan_0.jpg` },
  { id: 'rell',         name: 'Rell',            role: 'Support',   image_url: `${DDRAGON_BASE}/Rell_0.jpg` },
  { id: 'senna',        name: 'Senna',           role: 'Support',   image_url: `${DDRAGON_BASE}/Senna_0.jpg` },
  { id: 'sona',         name: 'Sona',            role: 'Support',   image_url: `${DDRAGON_BASE}/Sona_0.jpg` },
  { id: 'soraka',       name: 'Soraka',          role: 'Support',   image_url: `${DDRAGON_BASE}/Soraka_0.jpg` },
  { id: 'thresh',       name: 'Thresh',          role: 'Support',   image_url: `${DDRAGON_BASE}/Thresh_0.jpg` },
  { id: 'yuumi',        name: 'Yuumi',           role: 'Support',   image_url: `${DDRAGON_BASE}/Yuumi_0.jpg` },
  { id: 'zilean',       name: 'Zilean',          role: 'Support',   image_url: `${DDRAGON_BASE}/Zilean_0.jpg` },

  // ── Junglers ─────────────────────────────────────────────────────────────
  { id: 'amumu',        name: 'Amumu',           role: 'Tank',      image_url: `${DDRAGON_BASE}/Amumu_0.jpg` },
  { id: 'evelynn',      name: 'Evelynn',         role: 'Assassin',  image_url: `${DDRAGON_BASE}/Evelynn_0.jpg` },
  { id: 'fiddlesticks', name: 'Fiddlesticks',    role: 'Mage',      image_url: `${DDRAGON_BASE}/Fiddlesticks_0.jpg` },
  { id: 'gragas',       name: 'Gragas',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/Gragas_0.jpg` },
  { id: 'graves',       name: 'Graves',          role: 'Marksman',  image_url: `${DDRAGON_BASE}/Graves_0.jpg` },
  { id: 'hecarim',      name: 'Hecarim',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Hecarim_0.jpg` },
  { id: 'jarvan-iv',    name: 'Jarvan IV',       role: 'Fighter',   image_url: `${DDRAGON_BASE}/JarvanIV_0.jpg` },
  { id: 'kayn',         name: 'Kayn',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Kayn_0.jpg` },
  { id: 'kindred',      name: 'Kindred',         role: 'Marksman',  image_url: `${DDRAGON_BASE}/Kindred_0.jpg` },
  { id: 'lee-sin',      name: 'Lee Sin',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/LeeSin_0.jpg` },
  { id: 'lillia',       name: 'Lillia',          role: 'Fighter',   image_url: `${DDRAGON_BASE}/Lillia_0.jpg` },
  { id: 'maokai',       name: 'Maokai',          role: 'Tank',      image_url: `${DDRAGON_BASE}/Maokai_0.jpg` },
  { id: 'master-yi',    name: 'Master Yi',       role: 'Fighter',   image_url: `${DDRAGON_BASE}/MasterYi_0.jpg` },
  { id: 'nidalee',      name: 'Nidalee',         role: 'Assassin',  image_url: `${DDRAGON_BASE}/Nidalee_0.jpg` },
  { id: 'nunu-willump', name: 'Nunu & Willump',  role: 'Tank',      image_url: `${DDRAGON_BASE}/Nunu_0.jpg` },
  { id: 'pantheon',     name: 'Pantheon',        role: 'Fighter',   image_url: `${DDRAGON_BASE}/Pantheon_0.jpg` },
  { id: 'poppy',        name: 'Poppy',           role: 'Tank',      image_url: `${DDRAGON_BASE}/Poppy_0.jpg` },
  { id: 'rammus',       name: 'Rammus',          role: 'Tank',      image_url: `${DDRAGON_BASE}/Rammus_0.jpg` },
  { id: 'shyvana',      name: 'Shyvana',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Shyvana_0.jpg` },
  { id: 'skarner',      name: 'Skarner',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Skarner_0.jpg` },
  { id: 'viego',        name: 'Viego',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Viego_0.jpg` },
  { id: 'vi',           name: 'Vi',              role: 'Fighter',   image_url: `${DDRAGON_BASE}/Vi_0.jpg` },
  { id: 'warwick',      name: 'Warwick',         role: 'Fighter',   image_url: `${DDRAGON_BASE}/Warwick_0.jpg` },
  { id: 'xin-zhao',     name: 'Xin Zhao',        role: 'Fighter',   image_url: `${DDRAGON_BASE}/XinZhao_0.jpg` },

  // ── Multi-role ────────────────────────────────────────────────────────────
  { id: 'teemo',        name: 'Teemo',           role: 'Marksman',  image_url: `${DDRAGON_BASE}/Teemo_0.jpg` },
  { id: 'yasuo',        name: 'Yasuo',           role: 'Fighter',   image_url: `${DDRAGON_BASE}/Yasuo_0.jpg` },
  { id: 'yone',         name: 'Yone',            role: 'Fighter',   image_url: `${DDRAGON_BASE}/Yone_0.jpg` },
]

// Deduplicate by id (safety net in case of accidental duplicates above)
const FALLBACK_BY_ID = new Map<string, Champion>(
  FALLBACK_CHAMPIONS.map((c) => [c.id, c])
)

function readCache(): Champion[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const { data, ts, v } = JSON.parse(raw) as { data: Champion[]; ts: number; v?: number }
    if (v !== LS_VERSION) return null           // force refresh on version bump
    if (Date.now() - ts > LS_TTL_MS) return null
    return data
  } catch {
    return null
  }
}

function writeCache(data: Champion[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, ts: Date.now(), v: LS_VERSION }))
  } catch {
    // storage full — ignore, TQ in-memory cache still works
  }
}

/**
 * Merge scraped champions with the fallback list.
 * - Champions from the API take priority (have real role strings & image URLs).
 * - Fallback entries are added only when the API didn't return that champion.
 */
function mergeWithFallback(apiList: Champion[]): Champion[] {
  const byId = new Map<string, Champion>(apiList.map((c) => [c.id, c]))
  for (const [id, fallback] of FALLBACK_BY_ID) {
    if (!byId.has(id)) {
      byId.set(id, fallback)
    }
  }
  return Array.from(byId.values())
}

async function loadChampions(): Promise<Champion[]> {
  const cached = readCache()
  if (cached) return cached

  let apiChampions: Champion[] = []
  try {
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
    // Cast is safe: API type is a structural superset of our Champion interface
    apiChampions = results.filter((c): c is NonNullable<typeof c> => c !== null) as unknown as Champion[]
  } catch (err) {
    console.warn('Error al cargar campeones desde la API, usando fallback completo:', (err as Error).message)
  }

  const fullList = mergeWithFallback(apiChampions)
  if (fullList.length === 0) throw new Error('No se pudo cargar ningún campeón.')

  console.info(`Campeones cargados: ${apiChampions.length} de API + ${fullList.length - apiChampions.length} de fallback = ${fullList.length} total`)
  writeCache(fullList)
  return fullList
}

// Maps Wild Rift lane → champion role strings (English, matches API + fallback)
const LANE_TO_CLASES: Record<string, string[]> = {
  'Barón':   ['Fighter', 'Tank'],
  'Jungla':  ['Fighter', 'Assassin', 'Tank', 'Marksman'],
  'Mid':     ['Mage', 'Assassin'],
  'Dragón':  ['Marksman', 'Fighter'],   // Nilah plays Dragon too
  'Soporte': ['Support', 'Tank', 'Mage'],
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
          const clasesSet = new Set(clases.map((s) => s.toLowerCase()))
          pool = pool.filter((c) => clasesSet.has(c.role?.toLowerCase() ?? ''))
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
