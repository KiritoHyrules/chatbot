import { addKeyword } from '@builderbot/bot'
import { programs } from '../data/programs.js'
import { rnd } from '../utils.js'

function keywordMatch(question: string): string {
  const q = question.toLowerCase()
  const keywords: [string, string][] = [
    ['sistemas', 'PEE en Ciberseguridad'],
    ['industrial', 'PEE en Transformación Digital'],
    ['datos', 'Diplomado en Ciencia de Datos'],
    ['ciencia', 'Diplomado en Ciencia de Datos'],
    ['proyectos', 'Diplomado en Gestión de Proyectos'],
    ['gestión', 'Diplomado en Gestión de Proyectos'],
    ['ciberseguridad', 'PEE en Ciberseguridad'],
    ['seguridad', 'PEE en Ciberseguridad'],
    ['digital', 'PEE en Transformación Digital'],
    ['transformación', 'PEE en Transformación Digital'],
    ['power bi', 'Curso Taller de Power BI'],
    ['powerbi', 'Curso Taller de Power BI'],
    ['prácticas', 'Diplomado en Ciencia de Datos'],
    ['practicas', 'Diplomado en Ciencia de Datos'],
    ['python', 'Diplomado en Ciencia de Datos'],
    ['machine learning', 'Diplomado en Ciencia de Datos'],
    ['machine', 'Diplomado en Ciencia de Datos'],
    ['hacking', 'PEE en Ciberseguridad'],
    ['ético', 'PEE en Ciberseguridad'],
    ['ético', 'PEE en Ciberseguridad'],
    ['iso', 'PEE en Ciberseguridad'],
    ['dax', 'Curso Taller de Power BI'],
    ['dashboard', 'Curso Taller de Power BI'],
    ['visualización', 'Curso Taller de Power BI'],
    ['pmbok', 'Diplomado en Gestión de Proyectos'],
    ['ágil', 'Diplomado en Gestión de Proyectos'],
    ['agil', 'Diplomado en Gestión de Proyectos'],
    ['scrum', 'Diplomado en Gestión de Proyectos'],
    ['riesgos', 'Diplomado en Gestión de Proyectos'],
    ['liderazgo', 'Diplomado en Gestión de Proyectos'],
    ['industria 4', 'PEE en Transformación Digital'],
    ['cloud', 'PEE en Transformación Digital'],
    ['devops', 'PEE en Transformación Digital'],
    ['automatización', 'PEE en Transformación Digital'],
    ['cultura', 'PEE en Transformación Digital'],
  ]

  const matched = new Set<string>()
  for (const [word, program] of keywords) {
    if (q.includes(word)) matched.add(program)
  }

  if (matched.size === 0) return ''

  const matchedList = [...matched]
  const recs = matchedList.map(name => {
    const prog = programs.find(p => p.name === name)
    return prog ? `• *${prog.name}* — _${prog.type}_\n  ${prog.description}` : `• *${name}*`
  }).join('\n\n')

  let reply = 'Por tu consulta, creo que estos programas del CEE pueden interesarte:\n\n'
  reply += recs
  reply += '\n\n¿Te gustaría que te cuente más sobre alguno? Responde el *nombre del programa*.'
  if (matchedList.length > 1) {
    reply += '\n\nTambién puedes volver al menú principal respondiendo *0*.'
  }
  return reply
}

export const faqFlow = addKeyword(['preguntas', 'dudas', 'consulta'])
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    let prompt: string | undefined
    try {
      prompt = await extensions.ai?.chat(ctx.from,
        'El usuario eligió la opción de consultas. Preséntate brevemente y dile que puede preguntar lo que necesite sobre programas, inscripciones, horarios o cualquier tema del CEE.')
    } catch {
      console.warn('[faq] Gemini falló en prompt')
    }

    await flowDynamic([{ body: prompt ?? 'Estoy aquí para resolver tus dudas. ¿Qué necesitas saber?', delay: rnd() }])
  })
  .addAction({ capture: true, idle: 300000 }, async (ctx, { flowDynamic, fallBack, endFlow, gotoFlow, extensions }) => {
    const question = ctx.body?.trim() ?? ''
    if (!question || question.length < 3) {
      return fallBack('Por favor escribe tu pregunta con más detalle.')
    }
    if (question === 'cancelar' || question === 'salir') {
      return endFlow('Escribe *hola* cuando necesites algo.')
    }

    extensions.messageLog?.incoming(ctx.from, question)
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    extensions.pipeline?.classifyAndSend(ctx.from, question, 'Consulta en FAQ')

    let reply = ''
    try {
      reply = extensions?.ai
        ? await Promise.race([
            extensions.ai.chat(ctx.from, question),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
          ])
        : 'Disculpa, el servicio de respuestas no está disponible en este momento.'
    } catch {
      reply = keywordMatch(question)
      if (!reply) {
        reply = 'Lo siento, no pude procesar tu consulta a tiempo. ¿Quieres que te derive con un asesor? Responde *1* para sí o *2* para no.'
      }
    }

    if (!reply) reply = keywordMatch(question) || 'No encontré información sobre eso. ¿Deseas hablar con un asesor? Responde *1* para sí o *2* para no.'

    await flowDynamic([{ body: reply, delay: rnd() }])
    extensions.messageLog?.outgoing(ctx.from, reply)
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack }) => {
    const option = ctx.body?.trim() ?? ''
    if (option === '1' || option?.toLowerCase() === 'sí' || option?.toLowerCase() === 'si') {
      const { handoffFlow } = await import('./handoff.flow.js')
      return gotoFlow(handoffFlow)
    }
    if (option === '2' || option?.toLowerCase() === 'no') {
      return endFlow('Me alegra haber ayudado. Escribe *hola* cuando necesites algo más.')
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe *hola* cuando desees retomar.')
    }
    if (option === '0') {
      return endFlow('Volviendo al menú principal. Escribe *hola* cuando necesites algo.')
    }
    return fallBack('Responde *1* si te ayudé, o *2* para hablar con un asesor.')
  })
