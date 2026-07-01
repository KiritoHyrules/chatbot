import OpenAI from 'openai'
import { LRUCache } from 'lru-cache'
import { aiStore } from './store.js'
import { geminiUsage } from './store.js'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/'

let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: GEMINI_BASE_URL,
      apiKey: process.env.GEMINI_API_KEY,
    })
  }
  return _client
}

// Circuit breaker: 3 fallos en 60s → 60s de cooldown
let failures = 0
let failuresWindowStart = 0
let cooldownUntil = 0
const MAX_FAILURES = 3
const FAILURE_WINDOW_MS = 60_000
const COOLDOWN_MS = 60_000

function isCircuitOpen(): boolean {
  if (cooldownUntil > Date.now()) {
    console.warn('[ai] Circuito abierto. Reintentando en', Math.round((cooldownUntil - Date.now()) / 1000), 's')
    return true
  }
  return false
}

function recordFailure(): void {
  const now = Date.now()
  if (now - failuresWindowStart > FAILURE_WINDOW_MS) {
    failures = 1
    failuresWindowStart = now
  } else {
    failures++
  }
  if (failures >= MAX_FAILURES) {
    cooldownUntil = now + COOLDOWN_MS
    console.error('[ai] Circuito abierto por', COOLDOWN_MS / 1000, 's tras', MAX_FAILURES, 'fallos')
  }
  try { geminiUsage.track(false) } catch { /* ok */ }
}

function recordSuccess(): void {
  failures = 0
  failuresWindowStart = 0
  cooldownUntil = 0
  try { geminiUsage.track(true) } catch { /* ok */ }
}

const SYSTEM_PROMPT = `Eres el asistente virtual del *Centro de Especialización Ejecutiva* (CEE) de la Facultad de Ingeniería Industrial y de Sistemas (FIIS) de la Universidad Nacional de Ingeniería (UNI).

# INSTRUCCIONES DE LENGUAJE — CRÍTICAS

Hablas español neutro internacional, sin dejos regionales de ningún país.

PROHIBIDO ESTRICTAMENTE:
- Voseo argentino: NUNCA uses "vos", "querés", "preferís", "pasás", "tenés", "podés", "necesitás", "sabés", "decís", "mirá", "elegí", "dominá", "aprendé", "dale che".
- Peruanismos marcados: NUNCA uses "pe", "ps", "oe", "nomás", "bacán", "chamba", "pata", "jato", "broder", "dale pues", "acá" (usar "aquí" siempre).
- Mexicanismos marcados: NUNCA uses "ándale", "órale", "neta", "chido", "platicar", "ahorita".
- Coloquialismos genéricos: NUNCA uses "porfa", "anotado" solo, "dale" solo.

USA SIEMPRE:
- Tuteo neutro: "tú", "tienes", "puedes", "quieres", "prefieres", "necesitas", "sabes".
- Cortesía neutra: "por favor", "gracias", "de acuerdo", "perfecto", "claro", "con gusto".
- Tono cálido pero profesional.

EJEMPLOS CORRECTOS:
- "¿Me podrías compartir tu DNI?"
- "Con gusto te cuento sobre el programa."
- "Perfecto. ¿Cuál es tu correo electrónico?"

EJEMPLOS INCORRECTOS:
- "¿Me pasás tu DNI?" (voseo)
- "Dale, te cuento ps." (rioplatense + peruano)

# QUIÉNES SOMOS
Brindamos programas de capacitación de alto nivel para profesionales y ejecutivos:
• Diplomados de Alta Especialización
• Programas de Especialización Ejecutiva (PEE)
• Cursos cortos y talleres técnicos
• Capacitación In-House para empresas

# REGLAS DE RESPUESTA
- Mensajes breves: 2 a 3 oraciones por respuesta.
- Usa *negritas* para destacar nombres de programas e información clave.
- Usa • para listas. No uses emojis.
- Saluda con cordialidad y despídete invitando a seguir consultando.

# QUÉ PUEDES HACER
- Dar información sobre nuestros programas académicos, contenidos y beneficios.
- Resolver dudas sobre procesos de inscripción, horarios, y modalidad.
- Explicar requisitos y perfil del participante de cada programa.

# QUÉ NO PUEDES HACER
- Dar precios o fechas exactas que no tengas confirmadas.
- Inscribir directamente a un alumno.
- Dar información personal de otros alumnos o docentes.

# CUANDO NO SEPAS QUÉ HACER
Si la pregunta excede tu conocimiento, responde:
"Te invito a comunicarte con un asesor del CEE para brindarte información más detallada. ¿Deseas que te derive con uno?"

Responde SIEMPRE con base en estas reglas. Sé conciso, útil y profesional.`

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const MAX_HISTORY = 20
const RATE_LIMIT_MS = 3000

const conversations = new LRUCache<string, ChatMessage[]>({
  max: 500,
  ttl: 1000 * 60 * 30,
  updateAgeOnGet: true,
})

const lastCall = new Map<string, number>()

async function callWithRetry(messages: ChatMessage[], maxTokens: number): Promise<string> {
  if (isCircuitOpen()) throw new Error('Circuit open')

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await getClient().chat.completions.create({
        model: 'gemini-2.5-flash',
        messages,
        max_tokens: maxTokens,
      }, { timeout: 5000 })
      recordSuccess()
      return completion.choices[0]?.message?.content ?? ''
    } catch (err) {
      lastError = err as Error
      if (attempt < 1) console.warn(`[ai] Intento ${attempt + 1}/2 falló:`, lastError.message)
      if ((err as { status?: number }).status === 429 && attempt === 0) {
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
  recordFailure()
  throw lastError ?? new Error('Gemini no disponible')
}

export const ai = {
  async ask(prompt: string, history: ChatMessage[] = []): Promise<string> {
    return callWithRetry([
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt },
    ], 800)
  },

  async chat(phone: string, message: string, context?: string): Promise<string> {
    const now = Date.now()
    const prev = lastCall.get(phone) ?? 0
    if (now - prev < RATE_LIMIT_MS) {
      return 'Por favor, espera un momento antes de enviar otro mensaje.'
    }
    lastCall.set(phone, now)

    let history = conversations.get(phone) ?? []

    if (history.length === 0) {
      const persisted = aiStore.getHistory(phone)
      if (persisted.length > 0) {
        history = persisted.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      }
    }

    const systemContent = context
      ? SYSTEM_PROMPT + '\n\n# CONTEXTO ACTUAL\n' + context
      : SYSTEM_PROMPT

    const messages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...history.slice(-MAX_HISTORY),
      { role: 'user', content: message },
    ]

    const reply = await callWithRetry(messages, 500)

    history.push({ role: 'user', content: message })
    history.push({ role: 'assistant', content: reply })
    conversations.set(phone, history.slice(-MAX_HISTORY))

    aiStore.addMessage(phone, 'user', message)
    aiStore.addMessage(phone, 'assistant', reply)

    return reply
  },

  clearHistory(phone: string): void {
    conversations.delete(phone)
    aiStore.clearHistory(phone)
  },
}
