import Fuse from 'fuse.js'
import { LRUCache } from 'lru-cache'
import type { KnowledgeAnswer, KnowledgeSource } from '../services/knowledge/types.js'
import { normalizeQuery } from '../services/normalizer.js'
import { knowledgeQueries } from '../services/store.js'
import { programs } from './programs.js'

const programNames = ['Diplomado en Gestión de Proyectos', 'Diplomado en Ciencia de Datos', 'PEE en Transformación Digital', 'PEE en Ciberseguridad', 'Curso Taller de Power BI']

const fuse = new Fuse(programNames, { threshold: 0.4 })

export function findProgram(query: string): string | null {
  const result = fuse.search(query)
  return result.length > 0 ? result[0].item : null
}

export const knowledge = {
  programs: {
    'Diplomado en Gestión de Proyectos': {
      duration: '6 meses, 240 horas',
      requirements: 'Título universitario o experiencia profesional equivalente',
      why: 'Aprenderás metodologías ágiles, PMBOK, gestión de riesgos y liderazgo. Ideal para certificarte como Project Manager.',
      forWho: 'Profesionales de cualquier carrera que gestionen equipos',
      jobs: 'Project Manager, Scrum Master, Líder de PMO, Consultor',
    },
    'Diplomado en Ciencia de Datos': {
      duration: '6 meses, 240 horas',
      requirements: 'Conocimientos básicos de programación',
      why: 'Combina Python, Machine Learning y visualización. Perfil más demandado por empresas tech.',
      forWho: 'Ingenieros de sistemas, informáticos, estadísticos',
      jobs: 'Data Scientist, Data Analyst, ML Engineer, BI Analyst',
    },
    'PEE en Transformación Digital': {
      duration: '4 meses, 120 horas',
      requirements: 'Experiencia en tecnología o gestión',
      why: 'Cubre Industria 4.0, cloud y cultura ágil. Perfecto para liderar cambio digital.',
      forWho: 'Gerentes, líderes de TI, consultores',
      jobs: 'CDO, Consultor Digital, Líder de Innovación',
    },
    'PEE en Ciberseguridad': {
      duration: '4 meses, 120 horas',
      requirements: 'Conocimientos de redes y sistemas operativos',
      why: 'Ethical hacking, ISO 27001, gestión de incidentes. Crece 30% anual en demanda.',
      forWho: 'Ingenieros de sistemas, redes, seguridad, auditores TI',
      jobs: 'CISO, Ethical Hacker, Consultor ISO 27001, Analista de Seguridad',
    },
    'Curso Taller de Power BI': {
      duration: '2 meses, 60 horas',
      requirements: 'Conocimientos básicos de Excel',
      why: 'Dashboards, DAX y modelado. Power BI es líder en business intelligence.',
      forWho: 'Analistas, gerentes, cualquier profesional',
      jobs: 'BI Analyst, Data Analyst, Report Developer',
    },
  },
  faq: {
    duración: 'Varía: *Diplomados* 6 meses (240h), *PEE* 4 meses (120h), *Cursos* 2 meses (60h).',
    costo: 'Varía según programa. Un asesor te da precios exactos y opciones de financiamiento.',
    inscripción: 'Formulario de registro, DNI y título/constancia. Un asesor te guía.',
    horario: 'Presencial y semipresencial. Horarios específicos por programa y sede.',
    certificación: 'Certificación a nombre de la *UNI*. Incluye versión digital verificable.',
    virtual: 'Varios programas ofrecen modalidad semipresencial. Ampliando oferta virtual.',
    descuento: 'Descuentos corporativos (3+ personas) y tarifas para alumnos/egresados UNI.',
    prácticas: 'Casos prácticos reales. Ciencia de Datos y Ciberseguridad incluyen laboratorios.',
  },
}

// FAQ con sinónimos y jerga (se comparan contra la consulta NORMALizada, sin acentos).
// Respuestas decoradas para WhatsApp: encabezado en *negrita* + viñetas.
const FAQ_MATCHERS: { keys: string[]; answer: string }[] = [
  {
    keys: ['duracion', 'cuanto dura', 'cuanto tiempo', 'meses', 'cuantas horas'],
    answer: '⏱ *¿Cuánto duran los programas?*\n\n• *Diplomados:* 6 meses (240 h)\n• *PEE:* 4 meses (120 h)\n• *Cursos taller:* 2 meses (60 h)',
  },
  {
    keys: ['costo', 'precio', 'cuesta', 'vale', 'inversion', 'cuanto es', 'cuanto sale', 'pagar', 'pago', 'financiamiento', 'cuotas'],
    answer: '💰 *Inversión*\n\nEl precio varía según el programa. Un asesor te comparte los *precios exactos* y las *opciones de financiamiento* disponibles.\n\n¿Deseas que un asesor te contacte?',
  },
  {
    keys: ['inscripcion', 'inscribir', 'matricula', 'matricular', 'registrarme', 'como me inscribo'],
    answer: '📝 *Proceso de inscripción*\n\n• Formulario de registro\n• DNI\n• Título o constancia de estudios\n\nUn asesor te guía en todo el proceso.',
  },
  {
    keys: ['horario', 'clases', 'dias', 'turno', 'presencial', 'semipresencial'],
    answer: '📅 *Modalidad y horarios*\n\nContamos con clases *presenciales* y *semipresenciales*. Los horarios específicos dependen de cada programa y sede.',
  },
  {
    keys: ['certificacion', 'certificado', 'diploma', 'titulo', 'acreditacion'],
    answer: '📜 *Certificación*\n\nCertificación a nombre de la *UNI*, con versión digital verificable.',
  },
  {
    keys: ['virtual', 'online', 'remoto', 'a distancia', 'en linea'],
    answer: '💻 *Modalidad virtual*\n\nVarios programas ofrecen modalidad *semipresencial*. Estamos ampliando la oferta 100% virtual.',
  },
  {
    keys: ['descuento', 'promocion', 'beca', 'oferta', 'corporativo', 'rebaja'],
    answer: '🏷️ *Descuentos*\n\n• Corporativos (grupos de 3+ personas)\n• Tarifas especiales para alumnos y egresados UNI',
  },
  {
    keys: ['practica', 'laboratorio', 'proyecto real', 'caso real'],
    answer: '🧪 *Prácticas*\n\nTrabajamos con casos prácticos reales. *Ciencia de Datos* y *Ciberseguridad* incluyen laboratorios.',
  },
]

const answerCache = new LRUCache<string, string | null>({
  max: 500,
  ttl: 1000 * 60 * 60 * 6,
})

function findAnswerStatic(query: string, programName?: string | null): string | null {
  const normalized = normalizeQuery(query)
  const cacheKey = `${normalized}|${programName ?? '_'}`

  const cached = answerCache.get(cacheKey)
  if (cached !== undefined) {
    try { knowledgeQueries.record(query, normalized, 'cache') } catch { /* ok */ }
    return cached
  }

  // Usamos la consulta normalizada (sin acentos, en minúsculas, jerga expandida)
  const q = normalized

  let result: string | null = null

  if (programName) {
    const prog = knowledge.programs[programName as keyof typeof knowledge.programs]
    if (prog) {
      if (/(duracion|dura|cuanto dura|tiempo|meses|horas)/.test(q))
        result = `⏱ El *${programName}* dura *${prog.duration}*.`
      else if (/(requisito|necesito|perfil|piden|pide|prerequisito)/.test(q))
        result = `📋 *Requisitos — ${programName}*\n${prog.requirements}.`
      else if (/(por que|porque|beneficio|vale la pena|para que sirve|conviene)/.test(q))
        result = `✨ *¿Por qué llevar ${programName}?*\n${prog.why}`
      else if (/(para quien|dirigido|a quien|para mi)/.test(q))
        result = `🎯 *${programName}* está dirigido a:\n${prog.forWho}.`
      else if (/(trabajo|salida|laboral|empleo|puesto|conseguir|ganar)/.test(q))
        result = `💼 *Salida laboral — ${programName}*\n${prog.jobs}.`
    }
  }

  if (!result) {
    for (const m of FAQ_MATCHERS) {
      if (m.keys.some(k => q.includes(k))) { result = m.answer; break }
    }
  }

  answerCache.set(cacheKey, result)
  try { knowledgeQueries.record(query, normalized, result ? 'static' : null) } catch { /* ok */ }
  return result
}

class StaticKnowledgeSource implements KnowledgeSource {
  async findAnswer(query: string, programContext?: string | null): Promise<KnowledgeAnswer | null> {
    const text = findAnswerStatic(query, programContext)
    if (!text) return null
    return { text, source: 'static', confidence: 0.8 }
  }
}

export const staticKnowledge: StaticKnowledgeSource = new StaticKnowledgeSource()

export function findAnswer(query: string, programName?: string | null): string | null {
  return findAnswerStatic(query, programName)
}

const TYPE_EMOJI: Record<string, string> = {
  Diplomado: '🎓',
  PEE: '📈',
  Curso: '🛠️',
  'In-House': '🏢',
}

/**
 * Ficha completa de un programa, decorada para WhatsApp.
 * Combina la descripción (programs.ts) con los detalles de conocimiento (duración,
 * requisitos, perfil, salida laboral). Datos verificados y consistentes.
 */
export function programCard(programName: string): string | null {
  const prog = knowledge.programs[programName as keyof typeof knowledge.programs]
  const meta = programs.find(p => p.name === programName)
  if (!prog || !meta) return null

  const emoji = TYPE_EMOJI[meta.type] ?? '📚'
  return [
    `${emoji} *${programName}*`,
    `_${meta.type}_`,
    ``,
    meta.description,
    ``,
    `⏱ *Duración:* ${prog.duration}`,
    `📋 *Requisitos:* ${prog.requirements}`,
    `🎯 *Dirigido a:* ${prog.forWho}`,
    `💼 *Salida laboral:* ${prog.jobs}`,
    ``,
    `✨ ${prog.why}`,
  ].join('\n')
}
