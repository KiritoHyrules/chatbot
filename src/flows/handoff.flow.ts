import { addKeyword } from '@builderbot/bot'
import { isOpen, outsideHoursMessage } from '../services/office-hours.js'
import { rnd, splitResponse, delayBetween } from '../utils.js'

export const handoffFlow = addKeyword(['asesor', 'humano', 'hablar', 'contactar'])
  .addAction(async (ctx, { flowDynamic, gotoFlow, extensions }) => {
    const aggregated = await extensions.aggregator?.waitForBurst(ctx.from, ctx.body ?? '', 'handoff')
    if (aggregated === null) return
    ctx.body = aggregated

    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return
    const hp = extensions.humanPresence as { reply: Function } | undefined

    if (isOpen()) {
      extensions.pipeline?.classifyAndSend(ctx.from, ctx.body ?? '', 'Solicita asesor en horario')
      const urgency = extensions.urgencyDetector?.assess(ctx.body ?? '') ?? 'NINGUNA'
      const isUrgent = urgency === 'INMEDIATA' || urgency === 'ALTA'
      let msg: string | undefined
      try {
        msg = await extensions.ai?.chat(ctx.from,
          `El usuario quiere hablar con un asesor humano. Estamos DENTRO del horario de atención. ${isUrgent ? 'El usuario muestra URGENCIA. Prioriza su atención.' : ''} Dile que un asesor lo atenderá pronto y que necesitas registrar sus datos primero.`)
      } catch { /* fallback abajo */ }
      const fallback = isUrgent
        ? '¡Entendido! Por la urgencia de tu solicitud, voy a agilizar el registro. ¿Cuál es tu nombre?'
        : 'Un momento, por favor. Voy a registrar tus datos para que el asesor te atienda mejor.'
      if (hp) {
        await hp.reply(ctx, flowDynamic, msg ?? fallback)
      } else {
        await flowDynamic([{ body: msg ?? fallback, delay: rnd() }])
      }
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }

    let msg: string | undefined
    try {
      msg = await extensions.ai?.chat(ctx.from,
        `El usuario quiere hablar con un asesor pero estamos FUERA de horario. ${outsideHoursMessage()} Pregúntale si quiere dejar sus datos para que lo contactemos al abrir (responde 1 para sí, 2 para no).`)
    } catch {
      console.warn('[handoff] Gemini falló fuera de horario')
    }
    const outParts = splitResponse(msg ?? outsideHoursMessage())
    if (hp) {
      await hp.reply(ctx, flowDynamic, outParts)
    } else {
      for (let i = 0; i < outParts.length; i++) {
        await flowDynamic([{ body: outParts[i], delay: i > 0 ? delayBetween() : rnd() }])
      }
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, flowDynamic, extensions }) => {
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'handoff', 'Responde 1 para dejar tus datos o 2 para salir.')
    const option = ctx.body?.trim() ?? ''

    // shouldEscape: detectar pregunta fuera de contexto
    const escapeIntent = extensions.intentRouter?.detect?.(option)
    const isNumericOption = option === '1' || option === '2'
    if (escapeIntent && escapeIntent.confidence !== 'BAJA' && escapeIntent.intent !== 'unclear' && !isNumericOption) {
      const { findAnswer } = await import('../data/knowledge.js')
      const kbAnswer = findAnswer(option)
      if (kbAnswer) {
        const hp = extensions.humanPresence as { reply: Function } | undefined
        if (hp) {
          await hp.reply(ctx, flowDynamic, kbAnswer)
        } else {
          await flowDynamic([{ body: kbAnswer, delay: 600 }])
        }
        return fallBack('Responde *1* para dejar tus datos o *2* para salir.')
      }
    }

    if (option === '1' || option?.toLowerCase() === 'sí' || option?.toLowerCase() === 'si') {
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }
    if (option === '2' || option?.toLowerCase() === 'no') {
      return endFlow('Entendido. Si cambias de opinión, escribe *hola*. ¡Hasta pronto!')
    }
    let retry: string | undefined
    try {
      retry = await extensions.ai?.chat(ctx.from, option,
        'El usuario dio una respuesta ambigua. Pregúntale si quiere dejar sus datos (1) o no (2).')
    } catch { /* fallback abajo */ }
    return fallBack(retry ?? 'Responde *1* para dejar tus datos o *2* para salir.')
  })
