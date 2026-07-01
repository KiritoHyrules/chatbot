import { addKeyword } from '@builderbot/bot'
import { isOpen, outsideHoursMessage } from '../services/office-hours.js'
import { leads } from '../services/store.js'
import { rnd, splitResponse, delayBetween } from '../utils.js'

function normalizePhoneForLookup(from: string): string {
  const normalized = from.replace('@s.whatsapp.net', '')
  return normalized.startsWith('51') ? normalized : `51${normalized}`
}

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

      // Verificar si el usuario ya tiene datos registrados
      const lookupPhone = normalizePhoneForLookup(ctx.from)
      const existingLead = leads.getByPhone(lookupPhone)

      if (existingLead && existingLead.email && existingLead.dni) {
        // Ya registrado → mensaje de confirmación directo
        const confirmMsg = extensions.templates?.pick('registration_done', ctx.from)
          ?? 'Tus datos ya están registrados. Un asesor del CEE te contactará pronto. ¿Mientras tanto, algo más en lo que pueda ayudarte?'
        if (hp) {
          await hp.reply(ctx, flowDynamic, confirmMsg)
        } else {
          await flowDynamic([{ body: confirmMsg, delay: rnd() }])
        }
        return
      }

      const urgency = extensions.urgencyDetector?.assess(ctx.body ?? '') ?? 'NINGUNA'
      const isUrgent = urgency === 'INMEDIATA' || urgency === 'ALTA'
      const handoffMsg = extensions.templates?.pick('handoff_description', ctx.from)
        ?? (isUrgent
          ? '¡Entendido! Por la urgencia de tu solicitud, voy a agilizar el registro. ¿Cuál es tu nombre?'
          : 'Un momento, por favor. Voy a registrar tus datos para que el asesor te atienda mejor.')
      if (hp) {
        await hp.reply(ctx, flowDynamic, handoffMsg)
      } else {
        await flowDynamic([{ body: handoffMsg, delay: rnd() }])
      }
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }

    const outParts = splitResponse(outsideHoursMessage())
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
      // Verificar lead existente antes de redirigir
      const lookupPhone = normalizePhoneForLookup(ctx.from)
      const existingLead = leads.getByPhone(lookupPhone)
      if (existingLead && existingLead.email && existingLead.dni) {
        const confirmMsg = extensions.templates?.pick('registration_done', ctx.from)
          ?? 'Tus datos ya están registrados. Un asesor del CEE te contactará pronto.'
        return endFlow(confirmMsg)
      }
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }
    if (option === '2' || option?.toLowerCase() === 'no') {
      return endFlow('Entendido. Si cambias de opinión, escribe *hola*. ¡Hasta pronto!')
    }
    return fallBack('Responde *1* para dejar tus datos o *2* para salir.')
  })
