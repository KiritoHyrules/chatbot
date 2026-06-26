import { addKeyword } from '@builderbot/bot'
import { rnd } from '../utils.js'

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
  .addAction({ capture: true, idle: 120000 }, async (ctx, { flowDynamic, fallBack, endFlow, gotoFlow, extensions }) => {
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
      reply = 'Lo siento, no pude procesar tu consulta a tiempo. ¿Quieres que te derive con un asesor? Responde *1* para sí o *2* para no.'
    }

    if (!reply) reply = 'No encontré información sobre eso. ¿Deseas hablar con un asesor? Responde *1* para sí o *2* para no.'

    await flowDynamic([{ body: reply, delay: rnd() }])
    extensions.messageLog?.outgoing(ctx.from, reply)
  })
  .addAction({ capture: true, idle: 60000 }, async (ctx, { gotoFlow, endFlow, fallBack }) => {
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
    return fallBack('Responde *1* si te ayudé, o *2* para hablar con un asesor.')
  })
