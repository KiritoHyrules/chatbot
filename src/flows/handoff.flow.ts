import { addKeyword } from '@builderbot/bot'
import { isOpen, outsideHoursMessage } from '../services/office-hours.js'
import { rnd } from '../utils.js'

export const handoffFlow = addKeyword(['asesor', 'humano', 'hablar', 'contactar'])
  .addAction(async (ctx, { flowDynamic, gotoFlow, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    if (isOpen()) {
      extensions.pipeline?.classifyAndSend(ctx.from, ctx.body ?? '', 'Solicita asesor en horario')
      let msg: string | undefined
      try {
        msg = await extensions.ai?.chat(ctx.from,
          'El usuario quiere hablar con un asesor humano. Estamos DENTRO del horario de atención (Lun-Vie 9am-6pm, Sáb 9am-1pm). Dile que un asesor lo atenderá pronto y que necesitas registrar sus datos primero para agilizar.')
      } catch {
        console.warn('[handoff] Gemini falló en horario')
      }
      await flowDynamic([{ body: msg ?? 'Un momento, por favor. Voy a registrar tus datos para que el asesor te atienda mejor.', delay: rnd() }])
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
    await flowDynamic([{ body: msg ?? outsideHoursMessage(), delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, extensions }) => {
    const option = ctx.body?.trim() ?? ''
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
