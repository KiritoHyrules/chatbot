const TAG_RULES: { tag: string; patterns: RegExp[] }[] = [
  {
    tag: 'potencial',
    patterns: [
      /quiero inscribirme/i, /estoy listo/i, /proceder/i, /empecemos/i,
      /quiero matriculame/i, /inscr[ií]beme/i,
    ],
  },
  {
    tag: 'beca',
    patterns: [
      /\bbeca\b/i, /media beca/i, /financiamiento/i, /apoyo econ[oó]mico/i,
      /beca parcial/i, /beca completa/i,
    ],
  },
  {
    tag: 'empresarial',
    patterns: [
      /\bempresa\b/i, /\bcorporativo\b/i, /in.house/i, /para mi equipo/i,
      /para la empresa/i,
    ],
  },
  {
    tag: 'urgente',
    patterns: [
      /\burgente\b/i, /\bhoy\b/i, /\bya\b/i, /\br[aá]pido\b/i, /ahora mismo/i,
    ],
  },
  {
    tag: 'indeciso',
    patterns: [
      /no s[eé]/i, /lo voy a pensar/i, /d[eé]jame ver/i, /quiz[aá]s/i,
      /tal vez/i, /no estoy seguro/i,
    ],
  },
  {
    tag: 'referido',
    patterns: [
      /me recomendaron/i, /me hablaron de/i, /un amigo me dijo/i,
      /me refiri[oó]/i, /me coment[oó] un/i,
    ],
  },
  {
    tag: 'corporativo',
    patterns: [
      /\bgerente\b/i, /\bdirector\b/i, /\bCEO\b/i, /\bjefe\b/i,
      /mi empresa/i, /\bRRHH\b/i, /recursos humanos/i,
    ],
  },
  {
    tag: 'alumno_uni',
    patterns: [
      /\bUNI\b/i, /\buniversidad\b/i, /\balumno\b/i, /\bestudiante\b/i,
      /\btesis\b/i, /\begresado\b/i,
    ],
  },
]

export const tagEngine = {
  tag(message: string): string[] {
    const text = message.toLowerCase().trim()
    const tags: string[] = []

    for (const rule of TAG_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          tags.push(rule.tag)
          break
        }
      }
    }

    return tags
  },
}
