export type DealStage =
  | 'INTERESADO'
  | 'EN_NEGOCIACION'
  | 'PROPUESTA_ENVIADA'
  | 'MATRICULADO'
  | 'NO_INTERESADO'
  | 'NEUTRO_O_DUDOSO'

export interface ClassificationResult {
  etapa_asignada: DealStage
  confianza_analisis: 'ALTA' | 'MEDIA' | 'BAJA'
  justificacion_corta: string
}

import { normalizeQuery } from './normalizer.js'

function buildWeightedText(current: string, recent?: string[]): string | null {
  if (!recent || recent.length === 0) return null
  const parts: string[] = [current]
  const weights = [1, 0.6, 0.3]
  for (let i = 0; i < recent.length && i < weights.length; i++) {
    const normalized = normalizeQuery(recent[recent.length - 1 - i])
    parts.push(normalized.repeat(Math.round(weights[i] * 5)))
  }
  return parts.join(' ')
}

const RULES: { patterns: RegExp[]; stage: DealStage }[] = [
  {
    stage: 'MATRICULADO',
    patterns: [
      /ya (pag[úu]é|pagu[eé]|transfer[ií]).{0,30}(comprobante|voucher|captura|foto|imagen)/i,
      /(comprobante|voucher|captura|foto|imagen).{0,25}(pago|transferencia|dep[óo]sito|yape|plin)/i,
      /pago realizado.{0,20}(exito|confirmado|listo)/i,
      /listo.{0,10}(pag[ué]|transfer[ií]|dep[óo]sit[ée]).{0,20}(comprobante|voucher|captura)/i,
      /(aquí|te env[ií]o|adjunto|te mando).{0,20}(captura|comprobante|voucher|imagen).{0,15}(pago|deposito|transferencia)/i,
      /(ya|recién|acabo de).{0,10}(pagar|transferir|depositar|yapear).{0,20}(comprobante|voucher|captura)/i,
      /hice.{0,10}(el |la )?(pago|transferencia|dep[óo]sito).{0,20}(comprobante|voucher|captura|foto)/i,
    ],
  },
  {
    stage: 'PROPUESTA_ENVIADA',
    patterns: [
      /(link|enlace).{0,10}(pago|pagar)/i,
      /(n[úu]mero|cuenta).{0,15}(cuenta|bancaria|depositar|pagar|transferencia)/i,
      /(ficha|formato|formulario).{0,15}(inscripci[óo]n|matr[ií]cula)/i,
      /p[áa]same.{0,10}(link|enlace|cuenta|datos|número).{0,10}(pagar|pago|depositar)/i,
      /(m[ée]todo|forma|medio).{0,10}(pago|pagar)/i,
      /(c[óo]mo|donde).{0,10}(pago|pagar|deposito|transfiero)/i,
    ],
  },
  {
    stage: 'EN_NEGOCIACION',
    patterns: [
      /(llamada|llamar|ll[aá]menme|comunicarse|contactar)/i,
      /(agendar|programar|coordinar|separar).{0,15}(cita|entrevista|reuni[óo]n|llamada)/i,
      /(cuota|fracci[óo]n|partes|financiamiento|cr[ée]dito).{0,15}(pago|pagar|financiar)/i,
      /pagar.{0,15}(cuota|fraccion)/i,
      /(documentos|papeles|requisitos|certificados).{0,15}(sirven|v[áa]lidos|aceptan|piden)/i,
      /(validar|confirmar|verificar|revisar).{0,10}(perfil|cumplo|requisitos|curr[ií]cul)/i,
      /(descuento|promoci[óo]n|beca|media beca)/i,
    ],
  },
  {
    stage: 'NO_INTERESADO',
    patterns: [
      /no.{0,10}(interesado|interesa|gracias|puedo)/i,
      /(muy|demasiado|super).{0,5}(caro|cuesta|costoso|alto)/i,
      /no.{0,10}(puedo|alcanza|presupuesto|ajusto|llego)/i,
      /(b[oó]rr[aeé]nme|elim[íi]nenme|s[aá]quenme|retirarme|remover)/i,
      /(otro|otra).{0,10}(lado|instituci[óo]n|escuela|universidad|sitio)/i,
      /ya.{0,10}(estoy|me inscribí|me matriculé|estudio).{0,10}(otro|otra|diferente)/i,
    ],
  },
  {
    stage: 'INTERESADO',
    patterns: [
      /(interesado|interesa|gustar[ií]a|quisiera).{0,20}(curso|diplomado|programa|capacitaci[óo]n|taller)/i,
      /(informaci[óo]n|temario|plan de estudios|contenido|malla).{0,10}(curso|programa|diplomado|detallada)/i,
      /(cu[aá]nto|precio|costo|inversi[óo]n|valor).{0,10}(cuesta|vale|curso|programa|diplomado)/i,
      /(horario|duraci[óo]n|modalidad|fecha|inicio|disponible)/i,
      /(m[áa]s|mayor).{0,5}(informaci[óo]n|detalle|datos)/i,
      /(env[ií]|m[aá]nd|p[aá]s).{0,5}(ame|ame|en).{0,10}(temario|brochure|informaci[óo]n|precio)/i,
      /quiero.{0,10}(estudiar|aprender|inscribirme|matricularme|participar|informaci[óo]n)/i,
    ],
  },
]

export function classify(message: string, conversationContext?: string, recentMessages?: string[]): ClassificationResult {
  const text = normalizeQuery(message)

  // Construir ventana de contexto con peso decreciente
  const weightedText = buildWeightedText(text, recentMessages)

  // Capa 1: Reglas sobre el mensaje directo + ventana
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text) || (recentMessages && weightedText && pattern.test(weightedText))) {
        return {
          etapa_asignada: rule.stage,
          confianza_analisis: pattern.test(text) ? 'ALTA' : 'MEDIA',
          justificacion_corta: buildJustification(rule.stage, message),
        }
      }
    }
  }

  // Neutro por reglas (saludos, emojis, monosílabos)
  if (/^(hola|buenas?\s*(tardes|noches|d[ií]as)?|hey|saludos|ok|bien|gracias|👍|👋|s[ií]|no|claro|dale|listo|perfecto|genial)\s*$/i.test(text)) {
    return {
      etapa_asignada: 'NEUTRO_O_DUDOSO',
      confianza_analisis: 'ALTA',
      justificacion_corta: 'Saludo o respuesta cortés sin intención comercial clara.',
    }
  }

  // Capa 2: Análisis del contexto de la conversación
  if (conversationContext) {
    if (/interesado|interesa|quisiera|informaci[óo]n/i.test(conversationContext)) {
      return {
        etapa_asignada: 'INTERESADO',
        confianza_analisis: 'MEDIA',
        justificacion_corta: 'El usuario completó el registro de contacto mostrando interés en un programa del CEE.',
      }
    }
  }

  // Capa 3: Fallback — si completó lead-capture, es INTERESADO
  if (conversationContext && conversationContext.length > 20) {
    return {
      etapa_asignada: 'INTERESADO',
      confianza_analisis: 'MEDIA',
      justificacion_corta: 'El usuario proporcionó sus datos de contacto para recibir asesoría. Clasificado como interesado por defecto.',
    }
  }

  // Sin suficiente información
  return {
    etapa_asignada: 'NEUTRO_O_DUDOSO',
    confianza_analisis: 'BAJA',
    justificacion_corta: 'No se encontraron patrones claros de intención comercial en el mensaje.',
  }
}

function buildJustification(stage: DealStage, message: string): string {
  const preview = message.length > 80 ? message.slice(0, 80) + '...' : message
  const labels: Record<DealStage, string> = {
    INTERESADO: `El usuario muestra interés inicial en programas del CEE: "${preview}"`,
    EN_NEGOCIACION: `El usuario busca interacción directa con un asesor: "${preview}"`,
    PROPUESTA_ENVIADA: `El usuario solicita método de pago o ficha de inscripción: "${preview}"`,
    MATRICULADO: `El usuario afirma haber realizado el pago o adjunta comprobante: "${preview}"`,
    NO_INTERESADO: `El usuario rechaza explícitamente la oferta: "${preview}"`,
    NEUTRO_O_DUDOSO: `El mensaje no contiene intención comercial definida: "${preview}"`,
  }
  return labels[stage]
}
