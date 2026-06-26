import { extractNumber } from './number-extractor.js'
import { moderation } from './moderation.js'

export type Intent = 'programs' | 'faq' | 'handoff' | 'hostile' | 'buying' | 'unclear'

export const intentRouter = {
  detect(message: string, hasActiveFlow: boolean = false): { intent: Intent; number?: number; confidence: 'ALTA' | 'MEDIA' | 'BAJA' } {
    const text = message.toLowerCase().trim()

    // Capa 1: Número explícito
    const num = extractNumber(message)
    if (num) {
      // Si ya tiene un flow activo, probablemente es una selección
      if (hasActiveFlow) {
        return { intent: 'programs', number: num, confidence: 'ALTA' }
      }
      // Sin flow activo, un número suelto es poco claro
      if (/^\d+$/.test(text)) {
        return { intent: 'unclear', number: num, confidence: 'BAJA' }
      }
    }

    // Capa 2: Moderación / Hostil
    const mod = moderation.check(message)
    if (mod.blocked) {
      return { intent: 'hostile', confidence: 'ALTA' }
    }

    // Capa 3: Intención EXPLORAR → programs
    if (/\b(ver|conocer|cat[aá]logo|listado|mostrar|ense[ñn]ar|tienes|tienen|hay|c[uú]ales)\b/i.test(text) &&
        /\b(programa|curso|diplomado|taller|pee|cat[aá]logo)\b/i.test(text)) {
      return { intent: 'programs', number: num ?? undefined, confidence: 'ALTA' }
    }

    // Capa 4: Intención COMPRAR → faq con contexto
    if (/\b(precio|costo|inversi[oó]n|pagar|pago|vale|cuesta|presupuesto)\b/i.test(text)) {
      return { intent: 'buying', confidence: 'ALTA' }
    }

    // Capa 5: Intención PREGUNTAR → faq
    if (/\b(duda|pregunta|consulta|saber|informaci[oó]n|detalle|explicar)\b/i.test(text)) {
      return { intent: 'faq', confidence: 'MEDIA' }
    }

    // Capa 6: Intención CONTACTAR → handoff
    if (/\b(asesor|hablar|contactar|llamar|comunicar|persona|humano|atender)\b/i.test(text)) {
      return { intent: 'handoff', confidence: 'ALTA' }
    }

    // Capa 7: Frases de exploración genérica
    if (/\b(cursos?|programas?|diplomados?|talleres?)\b/i.test(text) && text.length < 20) {
      return { intent: 'programs', confidence: 'MEDIA' }
    }

    return { intent: 'unclear', confidence: 'BAJA' }
  },
}
