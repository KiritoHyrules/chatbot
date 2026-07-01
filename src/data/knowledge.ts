import Fuse from 'fuse.js'
import { LRUCache } from 'lru-cache'
import type { KnowledgeAnswer, KnowledgeSource } from '../services/knowledge/types.js'
import { normalizeQuery } from '../services/normalizer.js'
import { knowledgeQueries } from '../services/store.js'

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

type ProgramData = typeof knowledge.programs[keyof typeof knowledge.programs]

interface ProgramRule {
  keywords: string[]
  buildAnswer: (prog: ProgramData, programName: string) => string
}

const PROGRAM_RULES: ProgramRule[] = [
  {
    keywords: ['duración', 'dura', 'cuánto dura', 'tiempo'],
    buildAnswer: (p, name) => `El *${name}* dura *${p.duration}*.`,
  },
  {
    keywords: ['requisito', 'necesito', 'perfil'],
    buildAnswer: (p, name) => `*${name}*: ${p.requirements}`,
  },
  {
    keywords: ['por qué', 'porque', 'por que'],
    buildAnswer: (p, name) => `*${name}*: ${p.why}`,
  },
  {
    keywords: ['para quién', 'dirigido'],
    buildAnswer: (p, name) => `*${name}* está dirigido a: ${p.forWho}.`,
  },
  {
    keywords: ['trabajo', 'salida', 'laboral', 'empleo'],
    buildAnswer: (p, name) => `Con *${name}* podrás trabajar como: ${p.jobs}.`,
  },
]

type FaqKey = keyof typeof knowledge.faq

interface FaqRule {
  keywords: string[]
  answerKey: FaqKey
}

const FAQ_RULES: FaqRule[] = [
  { keywords: ['duración', 'dura', 'cuánto dura', 'tiempo'], answerKey: 'duración' as FaqKey },
  { keywords: ['costo', 'precio', 'cuánto', 'inversión', 'vale', 'pagar'], answerKey: 'costo' as FaqKey },
  { keywords: ['inscrib', 'registr', 'matricul', 'formulario'], answerKey: 'inscripción' as FaqKey },
  { keywords: ['horario', 'horas', 'clase', 'turno'], answerKey: 'horario' as FaqKey },
  { keywords: ['certific', 'diploma', 'constancia', 'título'], answerKey: 'certificación' as FaqKey },
  { keywords: ['virtual', 'online', 'remoto', 'distancia'], answerKey: 'virtual' as FaqKey },
  { keywords: ['descuento', 'promoción', 'beca', 'financiamiento'], answerKey: 'descuento' as FaqKey },
  { keywords: ['práctica', 'practica', 'laboratorio', 'caso'], answerKey: 'prácticas' as FaqKey },
]

const answerCache = new LRUCache<string, string | null>({
  max: 500,
  ttl: 1000 * 60 * 60 * 6,
})

function matchKeywords(q: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    if (q.includes(kw)) return true
  }
  return false
}

function findAnswerStatic(query: string, programName?: string | null): string | null {
  const normalized = normalizeQuery(query)
  const cacheKey = `${normalized}|${programName ?? '_'}`

  const cached = answerCache.get(cacheKey)
  if (cached !== undefined) {
    try { knowledgeQueries.record(query, normalized, 'cache') } catch { /* ok */ }
    return cached
  }

  const q = query.toLowerCase()
  let result: string | null = null

  // Capa 1: reglas ligadas a un programa específico
  if (programName) {
    const prog = knowledge.programs[programName as keyof typeof knowledge.programs]
    if (prog) {
      for (const rule of PROGRAM_RULES) {
        if (matchKeywords(q, rule.keywords)) {
          result = rule.buildAnswer(prog, programName)
          break
        }
      }
    }
  }

  // Capa 2: FAQ keywords
  if (!result) {
    for (const rule of FAQ_RULES) {
      if (matchKeywords(q, rule.keywords)) {
        result = knowledge.faq[rule.answerKey]
        break
      }
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
