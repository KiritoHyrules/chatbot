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

export function findAnswer(question: string, programName?: string | null): string | null {
  const q = question.toLowerCase()

  if (programName) {
    const prog = knowledge.programs[programName as keyof typeof knowledge.programs]
    if (!prog) return null
    if (q.includes('duración') || q.includes('dura') || q.includes('cuánto dura') || q.includes('tiempo'))
      return `El *${programName}* dura *${prog.duration}*.`
    if (q.includes('requisito') || q.includes('necesito') || q.includes('perfil'))
      return `*${programName}*: ${prog.requirements}`
    if (q.includes('por qué') || q.includes('porque') || q.includes('por que'))
      return `*${programName}*: ${prog.why}`
    if (q.includes('para quién') || q.includes('dirigido'))
      return `*${programName}* está dirigido a: ${prog.forWho}.`
    if (q.includes('trabajo') || q.includes('salida') || q.includes('laboral') || q.includes('empleo'))
      return `Con *${programName}* podrás trabajar como: ${prog.jobs}.`
  }

  for (const [keyword, answer] of Object.entries(knowledge.faq)) {
    if (q.includes(keyword)) return answer
  }

  return null
}
