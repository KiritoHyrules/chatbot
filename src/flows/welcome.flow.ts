import { addKeyword, EVENTS } from '@builderbot/bot'
import { rnd, splitResponse, delayBetween } from '../utils.js'

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
    const text = option.toLowerCase()

    const mod = extensions.moderation?.check(option)
    if (mod?.blocked) {
      await flowDynamic([{ body: mod.response!, delay: rnd() }])
      return
    }

    const isPrograms = option === '1' || text.includes('programa') || text.includes('curso') || text.includes('diplomado') || text.includes('catálogo') || text.includes('catalogo') || text.includes('ver') && text.length < 15
    const isFaq = option === '2' || text.includes('duda') || text.includes('pregunta') || text.includes('consulta') || text.includes('saber')
    const isHandoff = option === '3' || text.includes('asesor') || text.includes('hablar') || text.includes('contactar') || text.includes('persona') || text.includes('humano')

    if (isPrograms) {
      extensions.ai?.clearHistory(ctx.from)
      const { programsFlow } = await import('./programs.flow.js')
      return gotoFlow(programsFlow)
    }
    if (isFaq) {
      extensions.ai?.clearHistory(ctx.from)
      const { faqFlow } = await import('./faq.flow.js')
      return gotoFlow(faqFlow)
    }
    if (isHandoff) {
      extensions.ai?.clearHistory(ctx.from)
      const { handoffFlow } = await import('./handoff.flow.js')
      return gotoFlow(handoffFlow)
    }
    if (text === 'cancelar' || text === 'salir') {
      return endFlow('Gracias por visitarnos. Cuando necesites algo, escribe cualquier mensaje.')
    }

    let reply: string | undefined
    try {
      reply = await extensions.ai?.chat(ctx.from, option,
        'El usuario no seleccionó una opción clara. Respóndele de forma amable, recuérdale que puede ver programas, hacer consultas o hablar con un asesor. Pídele que elija una de estas opciones.')
    } catch {
      console.warn('[welcome] Gemini falló en reintento')
    }
    const parts = splitResponse(reply ?? 'Puedes: *1* Ver programas, *2* Hacer una consulta, o *3* Hablar con un asesor. ¿Qué prefieres?')
    for (let i = 0; i < parts.length; i++) {
      await flowDynamic([{ body: parts[i], delay: i > 0 ? delayBetween() : rnd() }])
    }
  })
