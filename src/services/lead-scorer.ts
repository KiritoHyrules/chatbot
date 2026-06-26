const RULES: { pattern: RegExp; action: string; points: number }[] = [
  { pattern: /(link|enlace).{0,10}(pago|pagar)/i, action: 'pide link de pago', points: 30 },
  { pattern: /(compart[iió]|comparto|pas[oó]|env[ií]o|doy).{0,20}(dni|documento|identidad)/i, action: 'compartió DNI', points: 25 },
  { pattern: /(ya|reci[eé]n|acabo de|hice).{0,15}(pag[uú]e[eé]?|pag[ué]|transfer[ií]|deposité|yape[eé]?).{0,20}(comprobante|voucher|captura|foto)/i, action: 'confirmó pago / adjuntó comprobante', points: 35 },
  { pattern: /(pag[uú]e[eé]?|pag[ué]|transfer[ií]|deposité|yape[eé]?).{0,5} (comprobante|voucher|captura|foto)/i, action: 'confirmó pago / adjuntó comprobante', points: 35 },
  { pattern: /(comprobante|voucher|captura|foto).{0,20}(pago|transferencia|depósito|yape|plin)/i, action: 'confirmó pago / adjuntó comprobante', points: 35 },
  { pattern: /(cu[aá]nto cuesta|cu[aá]l es el precio|cu[aá]l es el costo|qu[eé] precio tiene|inversi[oó]n)/i, action: 'pregunta precio / costo', points: 10 },
  { pattern: /(informaci[oó]n|temario|plan de estudios|contenido|detalle|brochure).{0,15}(curso|programa|diplomado|taller)/i, action: 'pide información de programa', points: 15 },
  { pattern: /(quiero|quisiera|necesito).{0,15}(ser contactado|que me contacten|que me llamen|asesor[aí]a|ayuda)/i, action: 'quiere ser contactado', points: 20 },
  { pattern: /(llamar|ll[aá]mame|llamada|agendar|cita|reuni[oó]n|coordinar)/i, action: 'pide llamada / agendar cita', points: 25 },
  { pattern: /\b(hoy|ya|urgente|r[aá]pido|ahora mismo|lo antes posible|cuanto antes)\b/i, action: 'menciona urgencia (hoy, ya, rápido)', points: 15 },
  { pattern: /\b(cuota|cuotas|descuento|fraccionado|financiamiento|partes|crédito)\b/i, action: 'pregunta por cuotas / descuento', points: 10 },
  { pattern: /\b(uni|universidad nacional|alumno uni|estudiante uni|egresado uni|soy de la uni)\b/i, action: 'es alumno UNI', points: 10 },
  { pattern: /no.{0,15}(interesado|interesa|gracias|quisiera|quiero)/i, action: 'rechaza explícitamente', points: -50 },
  { pattern: /(muy|demasiado|super).{0,10}(caro|costoso|alto|carísimo)/i, action: 'dice que es muy caro', points: -20 },
  { pattern: /no.{0,10}(me interesa|interesa|gracias)/i, action: 'dice que no le interesa', points: -40 },
]

export const leadScorer = {
  score(message: string): {
    score: number
    actions: string[]
    priority: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'
  } {
    const text = message.toLowerCase().trim()
    const actions: string[] = []
    let totalScore = 0

    for (const rule of RULES) {
      if (rule.pattern.test(text)) {
        actions.push(rule.action)
        totalScore += rule.points
      }
    }

    if (actions.length === 0) {
      actions.push('mensaje genérico / no claro')
    }

    const clampedScore = Math.max(-100, Math.min(100, totalScore))
    let priority: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'

    if (clampedScore >= 60) {
      priority = 'URGENTE'
    } else if (clampedScore >= 30) {
      priority = 'ALTA'
    } else if (clampedScore >= 0) {
      priority = 'MEDIA'
    } else {
      priority = 'BAJA'
    }

    return { score: clampedScore, actions, priority }
  },
}
