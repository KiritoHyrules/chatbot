import OpenAI from 'openai'
import { LRUCache } from 'lru-cache'
import { aiStore } from './store.js'

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

const SYSTEM_PROMPT = `Eres el asistente virtual del *Centro de Especialización Ejecutiva* (CEE) de la Facultad de Ingeniería Industrial y de Sistemas (FIIS) de la Universidad Nacional de Ingeniería (UNI).

# QUIÉNES SOMOS
Brindamos programas de capacitación de alto nivel para profesionales y ejecutivos:
• Diplomados de Alta Especialización
• Programas de Especialización Ejecutiva (PEE)
• Cursos cortos y talleres técnicos
• Capacitación In-House para empresas

# REGLAS DE RESPUESTA
- Responde en español neutro, formal y profesional.
- Mensajes breves: 2 a 4 líneas por respuesta.
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

export const ai = {
  async ask(prompt: string, history: ChatMessage[] = []): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
    })
    return completion.choices[0]?.message?.content ?? ''
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

    const completion = await getClient().chat.completions.create({
      model: 'gemini-2.5-flash',
      messages,
      max_tokens: 500,
    })

    const reply = completion.choices[0]?.message?.content ?? ''

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
