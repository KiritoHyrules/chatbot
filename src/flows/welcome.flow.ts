import { addKeyword, EVENTS } from '@builderbot/bot'
import { leads } from '../services/store.js'

export const welcomeFlow = addKeyword(EVENTS.WELCOME)
  .addAction(async (ctx, { flowDynamic, gotoFlow, state, extensions }) => {
    const aggregated = await extensions.aggregator?.waitForBurst(ctx.from, ctx.body ?? '', 'welcome')
    if (aggregated === null) return
    ctx.body = aggregated

    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '', ctx.name)

    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    const hp = extensions.humanPresence as { reply: Function } | undefined
    console.log('[DEBUG-HP] hp defined:', !!hp, 'has reply:', typeof hp?.reply, 'from:', ctx.from)
    const body = ctx.body?.trim() ?? ''

    // === FIX 1.5: Moderación de primera capa ===
    const mod = extensions.moderation?.check(body)
    if (mod?.blocked) {
      const count = extensions.conversationContext?.recordHostility(ctx.from) ?? 0
      if ((count ?? 0) >= 3) {
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      const modMsg = 'Soy el asistente del CEE-FIIS-UNI. Prefiero que conversemos con respeto. ¿En qué te puedo ayudar?'
      if (hp) {
        await hp.reply(ctx, flowDynamic, modMsg)
      } else {
        await flowDynamic([{ body: modMsg, delay: 600 }])
      }
      return
    }

    // === FIX 1.2: Anti-reingreso para usuarios con lead registrado ===
    try {
      const existingLead = leads.getByPhone(ctx.from)
      const isRegistered = existingLead && existingLead.email && existingLead.dni

      if (isRegistered) {
        const name = existingLead.name?.split(' ')[0] ?? ''
        const intent = extensions.intentRouter?.detect(body)

        if (intent?.intent === 'programs') {
          if (intent.number) await state.update({ lastExtractedNumber: intent.number })
          extensions.ai?.clearHistory(ctx.from)
          const { programsFlow } = await import('./programs.flow.js')
          return gotoFlow(programsFlow)
        }
        if (intent?.intent === 'faq' || intent?.intent === 'buying') {
          if (intent.intent === 'buying') {
            await state.update({ faqContext: 'El usuario preguntó por precios.' })
          }
          extensions.ai?.clearHistory(ctx.from)
          const { faqFlow } = await import('./faq.flow.js')
          return gotoFlow(faqFlow)
        }
        if (intent?.intent === 'handoff') {
          extensions.ai?.clearHistory(ctx.from)
          const { handoffFlow } = await import('./handoff.flow.js')
          return gotoFlow(handoffFlow)
        }
        if (intent?.intent === 'hostile') {
          const count = extensions.conversationContext?.recordHostility(ctx.from) ?? 0
          if ((count ?? 0) >= 3) {
            extensions.ai?.clearHistory(ctx.from)
            const { handoffFlow } = await import('./handoff.flow.js')
            return gotoFlow(handoffFlow)
          }
          const modMsg = 'Soy el asistente del CEE-FIIS-UNI. Prefiero que conversemos con respeto. ¿En qué te puedo ayudar?'
          if (hp) {
            await hp.reply(ctx, flowDynamic, modMsg)
          } else {
            await flowDynamic([{ body: modMsg, delay: 600 }])
          }
          return
        }

        const returnGreeting = name
          ? `Hola ${name}, ¿en qué te puedo ayudar hoy?`
          : 'Hola de nuevo, ¿en qué te puedo ayudar?'
        if (hp) {
          await hp.reply(ctx, flowDynamic, returnGreeting)
        } else {
          await flowDynamic([{ body: returnGreeting, delay: 600 }])
        }
        return
      }
    } catch { /* leads.getByPhone puede fallar en fresh DB */ }

    // === Saludo unificado (FIX 1.3): greeting + open question en 1 solo mensaje ===
    const openQ = extensions.templates?.pick('WELCOME_OPEN_QUESTION', ctx.from)
      ?? '¿En qué te puedo ayudar? Puedo contarte de los programas, resolver dudas, o conectarte con un asesor.'

    if (!body || body === 'hola' || body === 'ola') {
      const greetText = extensions.templates?.pick('WELCOME_FIRST_TIME', ctx.from) ?? 'Hola 👋 soy del CEE de la FIIS-UNI.'
      const fullGreeting = `${greetText}\n\n${openQ}`
      if (hp) {
        await hp.reply(ctx, flowDynamic, fullGreeting)
      } else {
        await flowDynamic([{ body: fullGreeting, delay: 600 }])
      }
      return
    }

    // Clasificar el primer mensaje
    const intent = extensions.intentRouter?.detect(body)

    if (intent && intent.confidence !== 'BAJA' && intent.intent !== 'unclear') {
      const num = intent.number

      if (intent.intent === 'programs') {
        if (num) await state.update({ lastExtractedNumber: num })
        extensions.ai?.clearHistory(ctx.from)
        const { programsFlow } = await import('./programs.flow.js')
        return gotoFlow(programsFlow)
      }
      if (intent.intent === 'faq' || intent.intent === 'buying') {
        if (intent.intent === 'buying') {
          await state.update({ faqContext: 'El usuario preguntó por precios.' })
        }
        extensions.ai?.clearHistory(ctx.from)
        const { faqFlow } = await import('./faq.flow.js')
        return gotoFlow(faqFlow)
      }
      if (intent.intent === 'handoff') {
        extensions.ai?.clearHistory(ctx.from)
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      // === FIX 1.4: hostile → contador, no derivación inmediata ===
      if (intent.intent === 'hostile') {
        const count = extensions.conversationContext?.recordHostility(ctx.from) ?? 0
        if ((count ?? 0) >= 3) {
          extensions.ai?.clearHistory(ctx.from)
          const { handoffFlow } = await import('./handoff.flow.js')
          return gotoFlow(handoffFlow)
        }
        const modMsg = 'Soy el asistente del CEE-FIIS-UNI. Prefiero que conversemos con respeto. ¿En qué te puedo ayudar?'
        if (hp) {
          await hp.reply(ctx, flowDynamic, modMsg)
        } else {
          await flowDynamic([{ body: modMsg, delay: 600 }])
        }
        return
      }
    }

    // Intención no clara → greeting + open question en 1 solo mensaje
    const greetText = extensions.templates?.pick('WELCOME_FIRST_TIME', ctx.from) ?? 'Hola 👋 soy del CEE de la FIIS-UNI.'
    const fullGreeting = `${greetText}\n\n${openQ}`
    if (hp) {
      await hp.reply(ctx, flowDynamic, fullGreeting)
    } else {
      await flowDynamic([{ body: fullGreeting, delay: 600 }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, flowDynamic, endFlow, state, extensions }) => {
    const option = ctx.body?.trim() ?? ''
    const text = option.toLowerCase()
    const hp = extensions.humanPresence as { reply: Function } | undefined

    // === FIX 1.4 + 1.5: Moderación en capture + hostile vs handoff ===
    const mod = extensions.moderation?.check(option)
    if (mod?.blocked) {
      const count = extensions.conversationContext?.recordHostility(ctx.from) ?? 0
      if ((count ?? 0) >= 3) {
        if (hp) {
          await hp.reply(ctx, flowDynamic, 'Voy a derivarte con un asesor del CEE para atenderte mejor.')
        } else {
          await flowDynamic([{ body: 'Voy a derivarte con un asesor del CEE para atenderte mejor.', delay: 600 }])
        }
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      const modMsg = 'Soy el asistente del CEE-FIIS-UNI. Prefiero que conversemos con respeto. ¿En qué te puedo ayudar?'
      if (hp) {
        await hp.reply(ctx, flowDynamic, modMsg)
      } else {
        await flowDynamic([{ body: modMsg, delay: 600 }])
      }
      return
    }

    // Detectar intención del mensaje
    const intent = extensions.intentRouter?.detect(option)
    const num = intent?.number

    if (intent?.intent === 'programs' || option === '1' || (text.includes('ver') && text.length < 15)) {
      if (num && option !== '1') await state.update({ lastExtractedNumber: num })
      extensions.ai?.clearHistory(ctx.from)
      const { programsFlow } = await import('./programs.flow.js')
      return gotoFlow(programsFlow)
    }
    if (intent?.intent === 'faq' || option === '2') {
      extensions.ai?.clearHistory(ctx.from)
      const { faqFlow } = await import('./faq.flow.js')
      return gotoFlow(faqFlow)
    }
    if (intent?.intent === 'handoff' || option === '3') {
      extensions.ai?.clearHistory(ctx.from)
      const { handoffFlow } = await import('./handoff.flow.js')
      return gotoFlow(handoffFlow)
    }
    if (intent?.intent === 'hostile') {
      const count = extensions.conversationContext?.recordHostility(ctx.from) ?? 0
      if ((count ?? 0) >= 3) {
        extensions.ai?.clearHistory(ctx.from)
        const { handoffFlow } = await import('./handoff.flow.js')
        return gotoFlow(handoffFlow)
      }
      const modMsg = 'Soy el asistente del CEE-FIIS-UNI. Prefiero que conversemos con respeto. ¿En qué te puedo ayudar?'
      if (hp) {
        await hp.reply(ctx, flowDynamic, modMsg)
      } else {
        await flowDynamic([{ body: modMsg, delay: 600 }])
      }
      return
    }
    if (intent?.intent === 'buying' || text.includes('precio') || text.includes('costo')) {
      extensions.ai?.clearHistory(ctx.from)
      await state.update({ faqContext: 'El usuario preguntó por precios.' })
      const { faqFlow } = await import('./faq.flow.js')
      return gotoFlow(faqFlow)
    }
    if (text === 'cancelar' || text === 'salir') {
      return endFlow('Gracias por visitarnos. Cuando necesites algo, escribe cualquier mensaje.')
    }

    // Fallback — último intento con Gemini
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'welcome', '¿En qué te puedo ayudar?')
    let reply: string | undefined
    try {
      reply = await extensions.ai?.chat(ctx.from, option,
        'El usuario no seleccionó una opción clara. Respóndele de forma amable, recuérdale que puede ver programas, hacer consultas o hablar con un asesor.')
    } catch {
      console.warn('[welcome] Gemini falló en reintento')
    }
    const fallback = reply ?? 'Cuéntame qué te interesa: conocer los programas, resolver una duda, o hablar con un asesor.'
    if (hp) {
      await hp.reply(ctx, flowDynamic, fallback)
    } else {
      await flowDynamic([{ body: fallback, delay: 600 }])
    }
  })
