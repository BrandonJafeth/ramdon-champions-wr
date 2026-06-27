const GROK_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

async function grokChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY no configurada.')

  const res = await fetch(GROK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Groq error ${res.status}: ${body}`)
  }

  const json = await res.json() as {
    choices: { message: { content: string } }[]
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  }

  const usage = json.usage
  if (usage) {
    console.info(
      `[Groq] tokens — prompt: ${usage.prompt_tokens} | completion: ${usage.completion_tokens} | total: ${usage.total_tokens}`
    )
  }

  return json.choices[0]?.message?.content ?? ''
}

export interface BanSuggestion {
  champion: string
  reason: string
}

interface SugerirBaneosParams {
  championName: string
  role: string
  teamComposition: { champion: string; role: string }[]
  availableChampions: string[]
}

export async function sugerirBaneos({
  championName,
  role,
  teamComposition,
  availableChampions,
}: SugerirBaneosParams): Promise<BanSuggestion[]> {
  const teamStr =
    teamComposition.length > 0
      ? teamComposition.map((c) => `${c.champion} (${c.role})`).join(', ')
      : 'ninguno aún'

  const rosterStr = availableChampions.join(', ')

  const prompt = `Tu tarea: sugerir exactamente 3 campeones que el equipo ENEMIGO debería banear para contrarrestar la composición dada.

REGLA CRÍTICA: Solo puedes sugerir campeones de esta lista exacta de ${availableChampions.length} campeones disponibles en Wild Rift. Ninguno más.
Lista completa: ${rosterStr}

Campeón recién asignado: ${championName} (${role || 'rol desconocido'})
Composición del equipo hasta ahora: ${teamStr}

Responde ÚNICAMENTE con un JSON array de exactamente 3 objetos. Sin texto extra, sin markdown, solo el JSON.
Formato exacto:
[
  { "champion": "NombreExacto", "reason": "razón corta en español (max 10 palabras)" },
  { "champion": "NombreExacto", "reason": "razón corta en español (max 10 palabras)" },
  { "champion": "NombreExacto", "reason": "razón corta en español (max 10 palabras)" }
]`

  const raw = await grokChat([
    {
      role: 'system',
      content: `Eres un experto en League of Legends: Wild Rift (versión móvil). SOLO puedes sugerir campeones que aparezcan en la lista que te dará el usuario. Cualquier campeón fuera de esa lista no existe en este juego y no debes mencionarlo.`,
    },
    { role: 'user', content: prompt },
  ])

  // Strip markdown code fences if model wraps in ```json
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Respuesta inválida de Groq. Intenta de nuevo.')
  }

  if (!Array.isArray(parsed)) throw new Error('Respuesta inesperada de Groq.')

  const validNames = new Set(availableChampions.map((n) => n.toLowerCase()))

  return (parsed as { champion: string; reason: string }[])
    .map((item) => ({ champion: String(item.champion), reason: String(item.reason) }))
    .filter((item) => validNames.has(item.champion.toLowerCase()))
    .slice(0, 3)
}
