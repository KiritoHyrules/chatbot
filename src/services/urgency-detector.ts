type UrgencyLevel = 'INMEDIATA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'NINGUNA'

const LEVELS: { level: UrgencyLevel; patterns: RegExp[] }[] = [
  {
    level: 'INMEDIATA',
    patterns: [
      /\burgente\b/i, /\bhoy\b/i, /\bya\b/i, /\br[aá]pido\b/i, /ahora mismo/i,
      /lo antes posible/i, /cuanto antes/i, /a la brevedad/i, /inmediatamente/i,
    ],
  },
  {
    level: 'ALTA',
    patterns: [
      /esta semana/i, /\bpronto\b/i, /en estos d[ií]as/i, /no quiero esperar/i,
      /lo m[aá]s pronto posible/i, /a la mayor brevedad/i,
    ],
  },
  {
    level: 'MEDIA',
    patterns: [
      /este mes/i, /pr[oó]ximamente/i, /me interesa empezar/i,
      /para empezar/i, /quiero inscribirme pronto/i,
    ],
  },
  {
    level: 'BAJA',
    patterns: [
      /a futuro/i, /m[aá]s adelante/i, /para el pr[oó]ximo ciclo/i,
      /el otro mes/i, /para el otro a[ñn]o/i, /m[aá]s tarde/i,
    ],
  },
]

export const urgencyDetector = {
  assess(message: string): UrgencyLevel {
    const text = message.toLowerCase().trim()

    for (const level of LEVELS) {
      for (const pattern of level.patterns) {
        if (pattern.test(text)) {
          return level.level
        }
      }
    }

    return 'NINGUNA'
  },
}
