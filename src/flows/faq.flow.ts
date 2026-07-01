import { addKeyword } from '@builderbot/bot'
import { programs } from '../data/programs.js'
import { findAnswer } from '../data/knowledge.js'
import { rnd } from '../utils.js'

const PROGRAM_KEYWORDS: [string, string][] = [
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
]

function extractEcho(question: string): string {
  const q = question.toLowerCase()
  for (const [word] of PROGRAM_KEYWORDS) {
    if (q.includes(word)) return word
  }
  return ''
}

function keywordMatch(question: string): string {
  const q = question.toLowerCase()

  const matched = new Set<string>()
  for (const [word, program] of PROGRAM_KEYWORDS) {
    if (q.includes(word)) matched.add(program)
  }

  if (matched.size === 0) return ''

  const echo = extractEcho(question)
  const matchedList = [...matched]
  const recs = matchedList.map(name => {
    const prog = programs.find(p => p.name === name)
    return prog ? `• *${prog.name}* — _${prog.type}_\n  ${prog.description}` : `• *${name}*`
  }).join('\n\n')

  let reply = echo
    ? `¡*${echo.charAt(0).toUpperCase() + echo.slice(1)}* es un gran tema! Estos programas del CEE pueden interesarte:\n\n`
    : 'Por tu consulta, creo que estos programas del CEE pueden interesarte:\n\n'
  reply += recs
  reply += '\n\n¿Te gustaría que te cuente más sobre alguno? Responde el *nombre del programa*.'
  if (matchedList.length > 1) reply += '\n\nTambién puedes volver al menú respondiendo *0*.'
  return reply
}

function replyOrFallback(hp: { reply: Function } | undefined, ctx: { from: string }, flowDynamic: Function, text: string) {
  if (hp) {
    return hp.reply(ctx, flowDynamic, text)
  }
  return flowDynamic([{ body: text, delay: rnd() }])
}

export const faqFlow = addKeyword(['preguntas', 'dudas', 'consulta'])
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    const aggregated = await extensions.aggregator?.waitForBurst(ctx.from, ctx.body ?? '', 'faq')
    if (aggregated === null) return
    ctx.body = aggregated

    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return
    const hp = extensions.humanPresence as { reply: Function } | undefined

    let prompt: string | undefined
    try {
      prompt = await extensions.ai?.chat(ctx.from,
        'El usuario eligió consultas. Dile brevemente que puede preguntar sobre programas, inscripciones, horarios, etc.')
    } catch { /* fallback */ }

    await replyOrFallback(hp, ctx, flowDynamic, prompt ?? 'Estoy aquí para resolver tus dudas. ¿Qué necesitas saber?')
  })
  .addAction({ capture: true, idle: 300000 }, async (ctx, { flowDynamic, fallBack, endFlow, gotoFlow, state, extensions }) => {
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'faq', '¿Qué te gustaría saber?')
    const hp = extensions.humanPresence as { reply: Function } | undefined
    const question = ctx.body?.trim() ?? ''
    if (!question || question.length < 3) {
      return fallBack('Cuéntame un poco más. ¿Qué te gustaría saber?')
    }
    if (question === 'cancelar' || question === 'salir') {
      return endFlow('Escribe *hola* cuando necesites algo.')
    }
    if (question === '0') {
      return endFlow('Volviendo al menú. Escribe *hola* para continuar.')
    }

    extensions.messageLog?.incoming(ctx.from, question)
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    extensions.pipeline?.classifyAndSend(ctx.from, question, 'Consulta en FAQ')

    // Capa 1: Moderación + frustración
    const mod = extensions.moderation?.check(question)
    if (mod?.blocked) {
      const hostile = extensions.conversationContext?.recordHostility(ctx.from)
      if (hostile || extensions.conversationContext?.isFrustrated(ctx.from)) {
        await replyOrFallback(hp, ctx, flowDynamic, 'Voy a derivarte con un asesor del CEE para atenderte mejor.')
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      await replyOrFallback(hp, ctx, flowDynamic, mod.response!)
      return fallBack('¿Hay algo más en lo que pueda ayudarte con información académica?')
    }

    // Capa 2: Base de conocimiento
    const kbAnswer = findAnswer(question, state.get<string>('programInterest'))
    if (kbAnswer) {
      await replyOrFallback(hp, ctx, flowDynamic, kbAnswer)
      extensions.messageLog?.outgoing(ctx.from, kbAnswer)
      return fallBack('¿Hay algo más en lo que pueda ayudarte?')
    }

    // Capa 3: Keyword fallback
    const kwAnswer = keywordMatch(question)
    if (kwAnswer) {
      await replyOrFallback(hp, ctx, flowDynamic, kwAnswer)
      extensions.messageLog?.outgoing(ctx.from, kwAnswer)
      return
    }

    // Capa 4: Gemini (último recurso)
    let reply = ''
    try {
      reply = extensions?.ai
        ? await Promise.race([
            extensions.ai.chat(ctx.from, question),
            new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
          ])
        : ''
    } catch { /* seguir */ }

    if (!reply) reply = '¿Quieres que te derive con un asesor para resolver tu consulta? Responde *sí* o *no*.'

    await replyOrFallback(hp, ctx, flowDynamic, reply)
    extensions.messageLog?.outgoing(ctx.from, reply)
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, flowDynamic, extensions }) => {
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'faq', '¿Quieres que te derive con un asesor? Responde sí o no.')
    const hp = extensions.humanPresence as { reply: Function } | undefined
    const option = ctx.body?.trim() ?? ''
    const text = option.toLowerCase()

    const mod = extensions.moderation?.check(option)
    if (mod?.blocked) {
      const hostile = extensions.conversationContext?.recordHostility(ctx.from)
      if (hostile || extensions.conversationContext?.isFrustrated(ctx.from)) {
        await replyOrFallback(hp, ctx, flowDynamic, 'Voy a derivarte con un asesor del CEE.')
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      await replyOrFallback(hp, ctx, flowDynamic, mod.response!)
      return fallBack('¿Hay algo más en lo que pueda ayudarte con información académica?')
    }

    // Buscar en knowledge base
    const kbAnswer = findAnswer(option)
    if (kbAnswer) {
      await replyOrFallback(hp, ctx, flowDynamic, kbAnswer)
      return fallBack('¿Algo más en lo que pueda ayudarte?')
    }

    if (option === '1' || text.includes('sí') || text.includes('si')) {
      const { handoffFlow } = await import('./handoff.flow.js')
      return gotoFlow(handoffFlow)
    }
    if (option === '2' || text.includes('no')) {
      return endFlow('¡Gracias por consultar! Cualquier cosa, aquí estoy.')
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe cuando quieras retomar.')
    }
    if (option === '0') {
      return endFlow('Volviendo al menú. Escribe cuando necesites algo.')
    }

    // Si no entendemos, intentar con contexto
    const ctx2 = extensions.conversationContext?.get(ctx.from)
    if (ctx2?.lastQuestions && ctx2.lastQuestions.length >= 2) {
      return fallBack('¿Quieres que te derive con un asesor o prefieres preguntarme algo más?')
    }

    return fallBack('¿Te gustaría que te derive con un asesor? Responde *sí* o *no*.')
  })
