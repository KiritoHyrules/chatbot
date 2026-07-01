import { addKeyword } from '@builderbot/bot'
import { programs } from '../data/programs.js'
import { findAnswer } from '../data/knowledge.js'
import { extractNumber } from '../services/number-extractor.js'
import { rnd } from '../utils.js'

function replyOrFallback(hp: { reply: Function } | undefined, ctx: { from: string }, flowDynamic: Function, text: string, opts?: Record<string, unknown>) {
  if (hp) {
    return hp.reply(ctx, flowDynamic, text, opts ?? {})
  }
  if (opts?.media) {
    return flowDynamic([{ body: text, delay: rnd(), media: opts.media }])
  }
  return flowDynamic([{ body: text, delay: rnd() }])
}

function reorderPrograms(userMessage: string) {
  const q = userMessage.toLowerCase()
  const scored = programs.map(p => {
    let score = 0
    const name = p.name.toLowerCase()
    if (q.includes('sistemas') && (name.includes('ciberseguridad') || name.includes('digital') || name.includes('datos'))) score += 3
    if (q.includes('industrial') && (name.includes('gestión') || name.includes('proyectos') || name.includes('digital'))) score += 3
    if (q.includes('datos') || q.includes('python') || q.includes('machine')) { if (name.includes('datos')) score += 3 }
    if (q.includes('seguridad') || q.includes('hacking')) { if (name.includes('ciberseguridad')) score += 3 }
    if (q.includes('proyecto') || q.includes('gestión') || q.includes('pmbok')) { if (name.includes('gestión') || name.includes('proyectos')) score += 3 }
    if (q.includes('digital') || q.includes('transformación') || q.includes('industria')) { if (name.includes('digital')) score += 3 }
    if (q.includes('power') || q.includes('bi') || q.includes('excel') || q.includes('dashboard')) { if (name.includes('power')) score += 3 }
    if (q.includes('práctica') || q.includes('practica')) { if (name.includes('datos') || name.includes('power')) score += 2 }
    return { ...p, _score: score }
  })
  scored.sort((a, b) => b._score - a._score)
  return scored
}

export const programsFlow = addKeyword(['programas', 'cursos', 'diplomados', 'pee'])
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    const aggregated = await extensions.aggregator?.waitForBurst(ctx.from, ctx.body ?? '', 'programs')
    if (aggregated === null) return
    ctx.body = aggregated

    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'programs', '¿Qué programa te interesa? Responde con el número.')

    const hp = extensions.humanPresence as { reply: Function } | undefined
    const ordered = reorderPrograms(ctx.body ?? '')
    const list = ordered.map((p, i) => `*${i + 1}.* ${p.name} — _${p.type}_`).join('\n')
    const hardcoded = `Estos son nuestros programas disponibles:\n\n${list}\n\n¿Sobre cuál te gustaría saber más?`
    await replyOrFallback(hp, ctx, flowDynamic, hardcoded)
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { flowDynamic, fallBack, endFlow, state, extensions }) => {
    const hp = extensions.humanPresence as { reply: Function } | undefined
    const option = ctx.body?.trim() ?? ''

    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe *hola* cuando desees retomar.')
    }

    let index = parseInt(option, 10)
    if (isNaN(index) || index < 1 || index > programs.length) {
      const extracted = extractNumber(option)
      if (extracted && extracted >= 1 && extracted <= programs.length) {
        index = extracted
      }
    }

    if (isNaN(index) || index < 1 || index > programs.length) {
      const retry = extensions.templates?.pick('program_invalid_number', ctx.from)
        ?? `No entendí bien. ¿Me dices el número del programa que te interesa? (1-${programs.length})`
      return fallBack(retry)
    }

    const program = programs[index - 1]
    await state.update({ programInterest: program.name })
    extensions.pipeline?.classifyAndSend(ctx.from, option, `Interesado en: ${program.name}`)
    extensions.conversationContext?.recordProgram(ctx.from, program.name)

    let detail: string | undefined
    try {
      const chunks = await extensions.rag?.retrieve(program.name, { topK: 1, threshold: 0.6 })
      if (chunks && chunks.length > 0) {
        detail = chunks[0].content
      }
    } catch { /* RAG falló, usar descripción */ }
    await replyOrFallback(hp, ctx, flowDynamic, detail ?? program.description)

    if (program.brochureFile) {
      const port = process.env.PORT ?? 3008
      const brochureUrl = `http://localhost:${port}/brochures/${program.brochureFile}`
      await replyOrFallback(hp, ctx, flowDynamic, 'Aquí tienes el brochure.', { media: brochureUrl })
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, flowDynamic, state, extensions }) => {
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'programs', '¿Te gustaría que un asesor te contacte? Responde sí o no.')
    const hp = extensions.humanPresence as { reply: Function } | undefined
    const option = ctx.body?.trim() ?? ''
    const text = option.toLowerCase()

    // shouldEscape: detectar pregunta fuera de contexto
    const escapeIntent = extensions.intentRouter?.detect?.(option)
    if (escapeIntent && escapeIntent.confidence !== 'BAJA' && escapeIntent.intent !== 'unclear') {
      const currentProgram = state.get<string>('programInterest') ?? extensions.conversationContext?.get(ctx.from)?.lastProgramShown
      const kbAnswer = findAnswer(option, currentProgram ?? null) || findAnswer(option)
      if (kbAnswer && hp) {
        await hp.reply(ctx, flowDynamic, kbAnswer)
      } else if (kbAnswer) {
        await replyOrFallback(hp, ctx, flowDynamic, kbAnswer)
      }
      return fallBack('¿Te gustaría que un asesor te contacte? Responde *sí* o *no*.')
    }

    if (option === '1' || text === 'sí' || text === 'si') {
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }
    if (option === '2' || text === 'no') {
      return endFlow('Gracias por tu interés. Escribe cualquier cosa cuando necesites algo más.')
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe cuando quieras retomar.')
    }

    const num = extractNumber(option)
    if (num && num >= 1 && num <= programs.length) {
      const prog = programs[num - 1]
      await state.update({ programInterest: prog.name })
      const detail = prog.description
      await replyOrFallback(hp, ctx, flowDynamic, `*${prog.name}* — ${detail}`)
      return fallBack('¿Te gustaría que un asesor te contacte? Responde *sí* o *no*.')
    }

    const currentProgram = state.get<string>('programInterest') ?? extensions.conversationContext?.get(ctx.from)?.lastProgramShown
    const kbAnswer = findAnswer(option, currentProgram ?? null)
    if (kbAnswer) {
      await replyOrFallback(hp, ctx, flowDynamic, kbAnswer)
      return fallBack('¿Quieres saber algo más de este programa?')
    }

    const generalKb = findAnswer(option)
    if (generalKb) {
      await replyOrFallback(hp, ctx, flowDynamic, generalKb)
      return
    }

    let retry: string | undefined
    try {
      const chunks = await extensions.rag?.retrieve(option, { topK: 1, threshold: 0.75 })
      if (chunks && chunks.length > 0) {
        retry = chunks[0].content
      }
    } catch { /* RAG falló */ }

    if (retry) {
      await replyOrFallback(hp, ctx, flowDynamic, retry)
      return
    }

    return fallBack('¿Quieres que te cuente más de este programa o prefieres ver otros?')
  })
