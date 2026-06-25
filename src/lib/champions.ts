import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { wildRiftAPI } from '@wildrift/champions-api'
import type { Champion } from '@/types/wildrift'

const LS_KEY = 'wr_champions_cache'
// Bump version when fallback list changes so old caches are discarded
const LS_VERSION = 4
const LS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

// ─────────────────────────────────────────────────────────────────────────────
// LANE MAP — source of truth for filtering.
// Uses the Spanish lane names that the UI sends to getRandomChampion.
// Champions can appear in multiple lanes; the FIRST is their primary lane
// (used when role is "anything").
//
// Lanes: 'Barón' | 'Jungla' | 'Mid' | 'Dragón' | 'Soporte'
// ─────────────────────────────────────────────────────────────────────────────
const CHAMPION_LANES: Record<string, string[]> = {
  // ── Barón (Top) ───────────────────────────────────────────────────────────
  'aatrox':       ['Barón'],
  'ambessa':      ['Barón', 'Jungla'],
  'camille':      ['Barón'],
  'darius':       ['Barón'],
  'dr-mundo':     ['Barón', 'Jungla'],
  'fiora':        ['Barón'],
  'garen':        ['Barón'],
  'gnar':         ['Barón'],
  'gwen':         ['Barón', 'Mid'],
  'irelia':       ['Barón', 'Mid'],
  'jax':          ['Barón', 'Jungla'],
  'jayce':        ['Barón', 'Mid'],
  'k-sante':      ['Barón'],
  'kayle':        ['Barón', 'Mid'],
  'malphite':     ['Barón', 'Soporte'],
  'mordekaiser':  ['Barón', 'Mid'],
  'nasus':        ['Barón'],
  'olaf':         ['Barón', 'Jungla'],
  'ornn':         ['Barón'],
  'renekton':     ['Barón'],
  'riven':        ['Barón'],
  'rumble':       ['Barón', 'Mid'],
  'sett':         ['Barón'],
  'shen':         ['Barón', 'Soporte'],
  'sion':         ['Barón'],
  'singed':       ['Barón'],
  'tryndamere':   ['Barón'],
  'urgot':        ['Barón'],
  'volibear':     ['Barón', 'Jungla'],
  'wukong':       ['Barón', 'Jungla'],
  'yasuo':        ['Barón', 'Mid'],
  'yone':         ['Barón', 'Mid'],
  'teemo':        ['Barón'],

  // ── Jungla ───────────────────────────────────────────────────────────────
  'amumu':        ['Jungla'],
  'evelynn':      ['Jungla'],
  'fiddlesticks': ['Jungla'],
  'gragas':       ['Jungla', 'Soporte'],
  'graves':       ['Jungla'],
  'hecarim':      ['Jungla'],
  'jarvan-iv':    ['Jungla'],
  'kayn':         ['Jungla'],
  'kindred':      ['Jungla'],
  'kha-zix':      ['Jungla'],
  'lee-sin':      ['Jungla'],
  'lillia':       ['Jungla'],
  'maokai':       ['Jungla', 'Soporte'],
  'master-yi':    ['Jungla'],
  'nidalee':      ['Jungla'],
  'nocturne':     ['Jungla'],
  'nunu-willump': ['Jungla'],
  'pantheon':     ['Jungla', 'Mid', 'Soporte'],
  'poppy':        ['Jungla', 'Soporte'],
  'rammus':       ['Jungla'],
  'rengar':       ['Jungla'],
  'shyvana':      ['Jungla'],
  'skarner':      ['Jungla'],
  'viego':        ['Jungla'],
  'vi':           ['Jungla'],
  'warwick':      ['Jungla'],
  'xin-zhao':     ['Jungla'],

  // ── Mid ───────────────────────────────────────────────────────────────────
  'ahri':         ['Mid'],
  'akali':        ['Mid'],
  'akshan':       ['Mid'],
  'annie':        ['Mid', 'Soporte'],
  'aurora':       ['Mid'],
  'aurelion-sol': ['Mid'],
  'corki':        ['Mid'],
  'diana':        ['Jungla', 'Mid'],
  'ekko':         ['Mid', 'Jungla'],
  'fizz':         ['Mid'],
  'galio':        ['Mid'],
  'heimerdinger': ['Mid', 'Barón', 'Soporte'],
  'karma':        ['Mid', 'Soporte'],
  'kassadin':     ['Mid'],
  'katarina':     ['Mid'],
  'kennen':       ['Barón', 'Mid'],
  'lissandra':    ['Mid'],
  'lux':          ['Mid', 'Soporte'],
  'mel':          ['Mid'],
  'morgana':      ['Soporte', 'Mid'],
  'norra':        ['Mid'],
  'orianna':      ['Mid'],
  'ryze':         ['Mid'],
  'seraphine':    ['Mid', 'Soporte'],
  'swain':        ['Mid', 'Soporte'],
  'syndra':       ['Mid'],
  'taliyah':      ['Mid', 'Jungla'],
  'talon':        ['Mid', 'Jungla'],
  'twisted-fate': ['Mid'],
  'veigar':       ['Mid'],
  'vel-koz':      ['Mid', 'Soporte'],
  'vex':          ['Mid'],
  'viktor':       ['Mid'],
  'vladimir':     ['Mid', 'Barón'],
  'zed':          ['Mid', 'Jungla'],
  'ziggs':        ['Mid', 'Dragón'],
  'zoe':          ['Mid'],
  'zyra':         ['Soporte', 'Mid'],
  'brand':        ['Soporte', 'Mid'],

  // ── Dragón (ADC) ─────────────────────────────────────────────────────────
  'ashe':         ['Dragón'],
  'caitlyn':      ['Dragón'],
  'draven':       ['Dragón'],
  'ezreal':       ['Dragón'],
  'jhin':         ['Dragón'],
  'jinx':         ['Dragón'],
  'kai-sa':       ['Dragón'],
  'kalista':      ['Dragón'],
  'kog-maw':      ['Dragón'],
  'lucian':       ['Dragón'],
  'miss-fortune': ['Dragón'],
  'nilah':        ['Dragón'],
  'samira':       ['Dragón'],
  'sivir':        ['Dragón'],
  'smolder':      ['Dragón'],
  'tristana':     ['Dragón', 'Mid'],
  'twitch':       ['Dragón', 'Jungla'],
  'varus':        ['Dragón'],
  'vayne':        ['Dragón', 'Barón'],
  'xayah':        ['Dragón'],
  'zeri':         ['Dragón'],

  // ── Soporte ───────────────────────────────────────────────────────────────
  'alistar':      ['Soporte'],
  'bard':         ['Soporte'],
  'blitzcrank':   ['Soporte'],
  'braum':        ['Soporte'],
  'janna':        ['Soporte'],
  'leona':        ['Soporte'],
  'lulu':         ['Soporte'],
  'milio':        ['Soporte'],
  'nami':         ['Soporte'],
  'nautilus':     ['Soporte'],
  'pyke':         ['Soporte'],
  'rakan':        ['Soporte'],
  'rell':         ['Soporte'],
  'senna':        ['Soporte', 'Dragón'],
  'sona':         ['Soporte'],
  'soraka':       ['Soporte'],
  'thresh':       ['Soporte'],
  'yuumi':        ['Soporte'],
  'zilean':       ['Soporte', 'Mid'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize the role string the API scraper returns (English lane names)
// so they map to our Spanish lane names.
// ─────────────────────────────────────────────────────────────────────────────
const API_ROLE_TO_LANE: Record<string, string> = {
  // English lane names returned by wildrift.leagueoflegends.com
  'baron lane':   'Barón',
  'baron':        'Barón',
  'top':          'Barón',
  'jungle':       'Jungla',
  'jungler':      'Jungla',
  'mid lane':     'Mid',
  'mid':          'Mid',
  'middle':       'Mid',
  'dragon lane':  'Dragón',
  'adc':          'Dragón',
  'marksman':     'Dragón',
  'support':      'Soporte',
  // Spanish (in case it comes normalized already)
  'barón':        'Barón',
  'jungla':       'Jungla',
  'dragón':       'Dragón',
  'soporte':      'Soporte',
}

// ─────────────────────────────────────────────────────────────────────────────
// Complete Wild Rift champion fallback — 139 champions (Patch 7.1g, June 2026)
// role field here is less important — CHAMPION_LANES overrides filtering.
// ─────────────────────────────────────────────────────────────────────────────
const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com/cdn/img/champion/tiles'

const FALLBACK_CHAMPIONS: Champion[] = [
  // ── Barón ─────────────────────────────────────────────────────────────────
  { id: 'aatrox',       name: 'Aatrox',         role: 'Barón',    image_url: `${DDRAGON_BASE}/Aatrox_0.jpg` },
  { id: 'ambessa',      name: 'Ambessa',         role: 'Barón',    image_url: `${DDRAGON_BASE}/Ambessa_0.jpg` },
  { id: 'camille',      name: 'Camille',         role: 'Barón',    image_url: `${DDRAGON_BASE}/Camille_0.jpg` },
  { id: 'darius',       name: 'Darius',          role: 'Barón',    image_url: `${DDRAGON_BASE}/Darius_0.jpg` },
  { id: 'dr-mundo',     name: 'Dr. Mundo',       role: 'Barón',    image_url: `${DDRAGON_BASE}/DrMundo_0.jpg` },
  { id: 'fiora',        name: 'Fiora',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Fiora_0.jpg` },
  { id: 'garen',        name: 'Garen',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Garen_0.jpg` },
  { id: 'gnar',         name: 'Gnar',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Gnar_0.jpg` },
  { id: 'gwen',         name: 'Gwen',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Gwen_0.jpg` },
  { id: 'irelia',       name: 'Irelia',          role: 'Barón',    image_url: `${DDRAGON_BASE}/Irelia_0.jpg` },
  { id: 'jax',          name: 'Jax',             role: 'Barón',    image_url: `${DDRAGON_BASE}/Jax_0.jpg` },
  { id: 'jayce',        name: 'Jayce',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Jayce_0.jpg` },
  { id: 'k-sante',      name: "K'Santé",         role: 'Barón',    image_url: `${DDRAGON_BASE}/KSante_0.jpg` },
  { id: 'kayle',        name: 'Kayle',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Kayle_0.jpg` },
  { id: 'malphite',     name: 'Malphite',        role: 'Barón',    image_url: `${DDRAGON_BASE}/Malphite_0.jpg` },
  { id: 'mordekaiser',  name: 'Mordekaiser',     role: 'Barón',    image_url: `${DDRAGON_BASE}/Mordekaiser_0.jpg` },
  { id: 'nasus',        name: 'Nasus',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Nasus_0.jpg` },
  { id: 'olaf',         name: 'Olaf',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Olaf_0.jpg` },
  { id: 'ornn',         name: 'Ornn',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Ornn_0.jpg` },
  { id: 'renekton',     name: 'Renekton',        role: 'Barón',    image_url: `${DDRAGON_BASE}/Renekton_0.jpg` },
  { id: 'riven',        name: 'Riven',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Riven_0.jpg` },
  { id: 'rumble',       name: 'Rumble',          role: 'Barón',    image_url: `${DDRAGON_BASE}/Rumble_0.jpg` },
  { id: 'sett',         name: 'Sett',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Sett_0.jpg` },
  { id: 'shen',         name: 'Shen',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Shen_0.jpg` },
  { id: 'sion',         name: 'Sion',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Sion_0.jpg` },
  { id: 'singed',       name: 'Singed',          role: 'Barón',    image_url: `${DDRAGON_BASE}/Singed_0.jpg` },
  { id: 'teemo',        name: 'Teemo',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Teemo_0.jpg` },
  { id: 'tryndamere',   name: 'Tryndamere',      role: 'Barón',    image_url: `${DDRAGON_BASE}/Tryndamere_0.jpg` },
  { id: 'urgot',        name: 'Urgot',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Urgot_0.jpg` },
  { id: 'volibear',     name: 'Volibear',        role: 'Barón',    image_url: `${DDRAGON_BASE}/Volibear_0.jpg` },
  { id: 'wukong',       name: 'Wukong',          role: 'Barón',    image_url: `${DDRAGON_BASE}/MonkeyKing_0.jpg` },
  { id: 'yasuo',        name: 'Yasuo',           role: 'Barón',    image_url: `${DDRAGON_BASE}/Yasuo_0.jpg` },
  { id: 'yone',         name: 'Yone',            role: 'Barón',    image_url: `${DDRAGON_BASE}/Yone_0.jpg` },

  // ── Jungla ────────────────────────────────────────────────────────────────
  { id: 'amumu',        name: 'Amumu',           role: 'Jungla',   image_url: `${DDRAGON_BASE}/Amumu_0.jpg` },
  { id: 'evelynn',      name: 'Evelynn',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Evelynn_0.jpg` },
  { id: 'fiddlesticks', name: 'Fiddlesticks',    role: 'Jungla',   image_url: `${DDRAGON_BASE}/Fiddlesticks_0.jpg` },
  { id: 'gragas',       name: 'Gragas',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Gragas_0.jpg` },
  { id: 'graves',       name: 'Graves',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Graves_0.jpg` },
  { id: 'hecarim',      name: 'Hecarim',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Hecarim_0.jpg` },
  { id: 'jarvan-iv',    name: 'Jarvan IV',       role: 'Jungla',   image_url: `${DDRAGON_BASE}/JarvanIV_0.jpg` },
  { id: 'kayn',         name: 'Kayn',            role: 'Jungla',   image_url: `${DDRAGON_BASE}/Kayn_0.jpg` },
  { id: 'kindred',      name: 'Kindred',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Kindred_0.jpg` },
  { id: 'kha-zix',      name: "Kha'Zix",         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Khazix_0.jpg` },
  { id: 'lee-sin',      name: 'Lee Sin',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/LeeSin_0.jpg` },
  { id: 'lillia',       name: 'Lillia',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Lillia_0.jpg` },
  { id: 'maokai',       name: 'Maokai',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Maokai_0.jpg` },
  { id: 'master-yi',    name: 'Master Yi',       role: 'Jungla',   image_url: `${DDRAGON_BASE}/MasterYi_0.jpg` },
  { id: 'nidalee',      name: 'Nidalee',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Nidalee_0.jpg` },
  { id: 'nocturne',     name: 'Nocturne',        role: 'Jungla',   image_url: `${DDRAGON_BASE}/Nocturne_0.jpg` },
  { id: 'nunu-willump', name: 'Nunu & Willump',  role: 'Jungla',   image_url: `${DDRAGON_BASE}/Nunu_0.jpg` },
  { id: 'pantheon',     name: 'Pantheon',        role: 'Jungla',   image_url: `${DDRAGON_BASE}/Pantheon_0.jpg` },
  { id: 'poppy',        name: 'Poppy',           role: 'Jungla',   image_url: `${DDRAGON_BASE}/Poppy_0.jpg` },
  { id: 'rammus',       name: 'Rammus',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Rammus_0.jpg` },
  { id: 'rengar',       name: 'Rengar',          role: 'Jungla',   image_url: `${DDRAGON_BASE}/Rengar_0.jpg` },
  { id: 'shyvana',      name: 'Shyvana',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Shyvana_0.jpg` },
  { id: 'skarner',      name: 'Skarner',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Skarner_0.jpg` },
  { id: 'viego',        name: 'Viego',           role: 'Jungla',   image_url: `${DDRAGON_BASE}/Viego_0.jpg` },
  { id: 'vi',           name: 'Vi',              role: 'Jungla',   image_url: `${DDRAGON_BASE}/Vi_0.jpg` },
  { id: 'warwick',      name: 'Warwick',         role: 'Jungla',   image_url: `${DDRAGON_BASE}/Warwick_0.jpg` },
  { id: 'xin-zhao',     name: 'Xin Zhao',        role: 'Jungla',   image_url: `${DDRAGON_BASE}/XinZhao_0.jpg` },

  // ── Mid ───────────────────────────────────────────────────────────────────
  { id: 'ahri',         name: 'Ahri',            role: 'Mid',      image_url: `${DDRAGON_BASE}/Ahri_0.jpg` },
  { id: 'akali',        name: 'Akali',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Akali_0.jpg` },
  { id: 'akshan',       name: 'Akshan',          role: 'Mid',      image_url: `${DDRAGON_BASE}/Akshan_0.jpg` },
  { id: 'annie',        name: 'Annie',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Annie_0.jpg` },
  { id: 'aurora',       name: 'Aurora',          role: 'Mid',      image_url: `${DDRAGON_BASE}/Aurora_0.jpg` },
  { id: 'aurelion-sol', name: 'Aurelion Sol',    role: 'Mid',      image_url: `${DDRAGON_BASE}/AurelionSol_0.jpg` },
  { id: 'corki',        name: 'Corki',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Corki_0.jpg` },
  { id: 'diana',        name: 'Diana',           role: 'Jungla',   image_url: `${DDRAGON_BASE}/Diana_0.jpg` },
  { id: 'ekko',         name: 'Ekko',            role: 'Mid',      image_url: `${DDRAGON_BASE}/Ekko_0.jpg` },
  { id: 'fizz',         name: 'Fizz',            role: 'Mid',      image_url: `${DDRAGON_BASE}/Fizz_0.jpg` },
  { id: 'galio',        name: 'Galio',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Galio_0.jpg` },
  { id: 'heimerdinger', name: 'Heimerdinger',    role: 'Mid',      image_url: `${DDRAGON_BASE}/Heimerdinger_0.jpg` },
  { id: 'karma',        name: 'Karma',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Karma_0.jpg` },
  { id: 'kassadin',     name: 'Kassadin',        role: 'Mid',      image_url: `${DDRAGON_BASE}/Kassadin_0.jpg` },
  { id: 'katarina',     name: 'Katarina',        role: 'Mid',      image_url: `${DDRAGON_BASE}/Katarina_0.jpg` },
  { id: 'kennen',       name: 'Kennen',          role: 'Barón',    image_url: `${DDRAGON_BASE}/Kennen_0.jpg` },
  { id: 'lissandra',    name: 'Lissandra',       role: 'Mid',      image_url: `${DDRAGON_BASE}/Lissandra_0.jpg` },
  { id: 'lux',          name: 'Lux',             role: 'Mid',      image_url: `${DDRAGON_BASE}/Lux_0.jpg` },
  { id: 'mel',          name: 'Mel',             role: 'Mid',      image_url: `${DDRAGON_BASE}/Mel_0.jpg` },
  { id: 'morgana',      name: 'Morgana',         role: 'Soporte',  image_url: `${DDRAGON_BASE}/Morgana_0.jpg` },
  { id: 'norra',        name: 'Norra',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Norra_0.jpg` },
  { id: 'orianna',      name: 'Orianna',         role: 'Mid',      image_url: `${DDRAGON_BASE}/Orianna_0.jpg` },
  { id: 'ryze',         name: 'Ryze',            role: 'Mid',      image_url: `${DDRAGON_BASE}/Ryze_0.jpg` },
  { id: 'seraphine',    name: 'Seraphine',       role: 'Mid',      image_url: `${DDRAGON_BASE}/Seraphine_0.jpg` },
  { id: 'swain',        name: 'Swain',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Swain_0.jpg` },
  { id: 'syndra',       name: 'Syndra',          role: 'Mid',      image_url: `${DDRAGON_BASE}/Syndra_0.jpg` },
  { id: 'taliyah',      name: 'Taliyah',         role: 'Mid',      image_url: `${DDRAGON_BASE}/Taliyah_0.jpg` },
  { id: 'talon',        name: 'Talon',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Talon_0.jpg` },
  { id: 'twisted-fate', name: 'Twisted Fate',    role: 'Mid',      image_url: `${DDRAGON_BASE}/TwistedFate_0.jpg` },
  { id: 'veigar',       name: 'Veigar',          role: 'Mid',      image_url: `${DDRAGON_BASE}/Veigar_0.jpg` },
  { id: 'vel-koz',      name: "Vel'Koz",         role: 'Mid',      image_url: `${DDRAGON_BASE}/Velkoz_0.jpg` },
  { id: 'vex',          name: 'Vex',             role: 'Mid',      image_url: `${DDRAGON_BASE}/Vex_0.jpg` },
  { id: 'viktor',       name: 'Viktor',          role: 'Mid',      image_url: `${DDRAGON_BASE}/Viktor_0.jpg` },
  { id: 'vladimir',     name: 'Vladimir',        role: 'Mid',      image_url: `${DDRAGON_BASE}/Vladimir_0.jpg` },
  { id: 'zed',          name: 'Zed',             role: 'Mid',      image_url: `${DDRAGON_BASE}/Zed_0.jpg` },
  { id: 'ziggs',        name: 'Ziggs',           role: 'Mid',      image_url: `${DDRAGON_BASE}/Ziggs_0.jpg` },
  { id: 'zoe',          name: 'Zoe',             role: 'Mid',      image_url: `${DDRAGON_BASE}/Zoe_0.jpg` },
  { id: 'zyra',         name: 'Zyra',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Zyra_0.jpg` },

  // ── Dragón (ADC) ─────────────────────────────────────────────────────────
  { id: 'ashe',         name: 'Ashe',            role: 'Dragón',   image_url: `${DDRAGON_BASE}/Ashe_0.jpg` },
  { id: 'caitlyn',      name: 'Caitlyn',         role: 'Dragón',   image_url: `${DDRAGON_BASE}/Caitlyn_0.jpg` },
  { id: 'draven',       name: 'Draven',          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Draven_0.jpg` },
  { id: 'ezreal',       name: 'Ezreal',          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Ezreal_0.jpg` },
  { id: 'jhin',         name: 'Jhin',            role: 'Dragón',   image_url: `${DDRAGON_BASE}/Jhin_0.jpg` },
  { id: 'jinx',         name: 'Jinx',            role: 'Dragón',   image_url: `${DDRAGON_BASE}/Jinx_0.jpg` },
  { id: 'kai-sa',       name: "Kai'Sa",          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Kaisa_0.jpg` },
  { id: 'kalista',      name: 'Kalista',         role: 'Dragón',   image_url: `${DDRAGON_BASE}/Kalista_0.jpg` },
  { id: 'kog-maw',      name: "Kog'Maw",         role: 'Dragón',   image_url: `${DDRAGON_BASE}/KogMaw_0.jpg` },
  { id: 'lucian',       name: 'Lucian',          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Lucian_0.jpg` },
  { id: 'miss-fortune', name: 'Miss Fortune',    role: 'Dragón',   image_url: `${DDRAGON_BASE}/MissFortune_0.jpg` },
  { id: 'nilah',        name: 'Nilah',           role: 'Dragón',   image_url: `${DDRAGON_BASE}/Nilah_0.jpg` },
  { id: 'samira',       name: 'Samira',          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Samira_0.jpg` },
  { id: 'sivir',        name: 'Sivir',           role: 'Dragón',   image_url: `${DDRAGON_BASE}/Sivir_0.jpg` },
  { id: 'smolder',      name: 'Smolder',         role: 'Dragón',   image_url: `${DDRAGON_BASE}/Smolder_0.jpg` },
  { id: 'tristana',     name: 'Tristana',        role: 'Dragón',   image_url: `${DDRAGON_BASE}/Tristana_0.jpg` },
  { id: 'twitch',       name: 'Twitch',          role: 'Dragón',   image_url: `${DDRAGON_BASE}/Twitch_0.jpg` },
  { id: 'varus',        name: 'Varus',           role: 'Dragón',   image_url: `${DDRAGON_BASE}/Varus_0.jpg` },
  { id: 'vayne',        name: 'Vayne',           role: 'Dragón',   image_url: `${DDRAGON_BASE}/Vayne_0.jpg` },
  { id: 'xayah',        name: 'Xayah',           role: 'Dragón',   image_url: `${DDRAGON_BASE}/Xayah_0.jpg` },
  { id: 'zeri',         name: 'Zeri',            role: 'Dragón',   image_url: `${DDRAGON_BASE}/Zeri_0.jpg` },

  // ── Soporte ───────────────────────────────────────────────────────────────
  { id: 'alistar',      name: 'Alistar',         role: 'Soporte',  image_url: `${DDRAGON_BASE}/Alistar_0.jpg` },
  { id: 'bard',         name: 'Bard',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Bard_0.jpg` },
  { id: 'blitzcrank',   name: 'Blitzcrank',      role: 'Soporte',  image_url: `${DDRAGON_BASE}/Blitzcrank_0.jpg` },
  { id: 'braum',        name: 'Braum',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Braum_0.jpg` },
  { id: 'brand',        name: 'Brand',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Brand_0.jpg` },
  { id: 'janna',        name: 'Janna',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Janna_0.jpg` },
  { id: 'leona',        name: 'Leona',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Leona_0.jpg` },
  { id: 'lulu',         name: 'Lulu',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Lulu_0.jpg` },
  { id: 'milio',        name: 'Milio',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Milio_0.jpg` },
  { id: 'nami',         name: 'Nami',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Nami_0.jpg` },
  { id: 'nautilus',     name: 'Nautilus',        role: 'Soporte',  image_url: `${DDRAGON_BASE}/Nautilus_0.jpg` },
  { id: 'pyke',         name: 'Pyke',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Pyke_0.jpg` },
  { id: 'rakan',        name: 'Rakan',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Rakan_0.jpg` },
  { id: 'rell',         name: 'Rell',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Rell_0.jpg` },
  { id: 'senna',        name: 'Senna',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Senna_0.jpg` },
  { id: 'sona',         name: 'Sona',            role: 'Soporte',  image_url: `${DDRAGON_BASE}/Sona_0.jpg` },
  { id: 'soraka',       name: 'Soraka',          role: 'Soporte',  image_url: `${DDRAGON_BASE}/Soraka_0.jpg` },
  { id: 'thresh',       name: 'Thresh',          role: 'Soporte',  image_url: `${DDRAGON_BASE}/Thresh_0.jpg` },
  { id: 'yuumi',        name: 'Yuumi',           role: 'Soporte',  image_url: `${DDRAGON_BASE}/Yuumi_0.jpg` },
  { id: 'zilean',       name: 'Zilean',          role: 'Soporte',  image_url: `${DDRAGON_BASE}/Zilean_0.jpg` },
]

// Deduplicate by id
const FALLBACK_BY_ID = new Map<string, Champion>(
  FALLBACK_CHAMPIONS.map((c) => [c.id, c])
)

// ─────────────────────────────────────────────────────────────────────────────
// Resolve lanes for a champion.
// Priority: CHAMPION_LANES map → API_ROLE_TO_LANE normalization → primary role
// ─────────────────────────────────────────────────────────────────────────────
function getChampionLanes(champion: Champion): string[] {
  // 1. Explicit per-champion lane map (most accurate)
  if (CHAMPION_LANES[champion.id]) {
    return CHAMPION_LANES[champion.id]
  }
  // 2. Normalize API role string → Spanish lane name
  const normalized = API_ROLE_TO_LANE[champion.role?.toLowerCase() ?? '']
  if (normalized) return [normalized]
  // 3. Role already matches a lane name (fallback champions set their own lane)
  const knownLanes = ['Barón', 'Jungla', 'Mid', 'Dragón', 'Soporte']
  if (knownLanes.includes(champion.role)) return [champion.role]
  // 4. Unknown — eligible for any lane
  return []
}

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
 * API champions take priority; fallback fills in missing ones.
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
    (lane?: string, excludeIds: string[] = []): Champion | null => {
      if (champions.length === 0) return null

      const excludeSet = new Set(excludeIds)
      let pool = champions.filter((c) => !excludeSet.has(c.id))

      if (lane) {
        // Filter by lane using CHAMPION_LANES (exact match, supports multi-lane champions)
        pool = pool.filter((c) => getChampionLanes(c).includes(lane))
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
