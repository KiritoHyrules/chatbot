import { addKeyword, EVENTS } from '@builderbot/bot'
import { rnd } from '../utils.js'

export const welcomeFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '', ctx.name)

    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    let greeting: string | undefined
    try {
      greeting = await extensions.ai?.chat(ctx.from, ctx.body ?? 'hola',
        'El usuario acaba de iniciar la conversación. Preséntate brevemente como el asistente del CEE de la FIIS-UNI y ofrécele estas opciones:\n1. Ver nuestros programas académicos\n2. Hacer una consulta o resolver dudas\n3. Hablar con un asesor\n\nIndica que responda con el número de la opción.')
    } catch {
      console.warn('[welcome] Gemini falló, usando template')
      greeting = extensions.templates?.get('welcome')
    }

    await flowDynamic([{ body: greeting ?? extensions.templates?.get('welcome') ?? 'Bienvenido al CEE de la FIIS-UNI. Responde *1*, *2* o *3*.', delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, flowDynamic, endFlow, extensions }) => {
    const option = ctx.body?.trim() ?? ''

    if (option === '1') {
      extensions.ai?.clearHistory(ctx.from)
      const { programsFlow } = await import('./programs.flow.js')
      return gotoFlow(programsFlow)
    }
    if (option === '2') {
      extensions.ai?.clearHistory(ctx.from)
      const { faqFlow } = await import('./faq.flow.js')
      return gotoFlow(faqFlow)
    }
    if (option === '3') {
      extensions.ai?.clearHistory(ctx.from)
      const { handoffFlow } = await import('./handoff.flow.js')
      return gotoFlow(handoffFlow)
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Gracias por visitarnos. Cuando necesites algo, escribe *hola*.')
    }

    let reply: string | undefined
    try {
      reply = await extensions.ai?.chat(ctx.from, option,
        'El usuario no seleccionó una opción válida (1, 2, 3). Responde de forma amable, recuérdale las opciones y pídele que elija un número.')
    } catch {
      console.warn('[welcome] Gemini falló en reintento')
    }
    await flowDynamic([{ body: reply ?? 'Responde *1*, *2* o *3* por favor.', delay: rnd() }])
  })
