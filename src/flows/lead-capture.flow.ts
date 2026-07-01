import { addKeyword, utils } from '@builderbot/bot'
import { leads } from '../services/store.js'
import { outbox } from '../services/store.js'
import { classify } from '../services/classifier.js'
import type { ClassificationResult } from '../services/classifier.js'
import { normalizeLeadId } from '../services/lead-id.js'
import { findAnswer } from '../data/knowledge.js'
import { rnd, splitResponse, delayBetween } from '../utils.js'

export const leadCaptureFlow = addKeyword(utils.setEvent('EVENT_LEAD_CAPTURE'))
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    const aggregated = await extensions.aggregator?.waitForBurst(ctx.from, ctx.body ?? '', 'lead_capture')
    if (aggregated === null) return
    ctx.body = aggregated

    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '', ctx.name)
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return
    extensions.conversationContext?.recordFlowPosition?.(ctx.from, 'lead_capture', '¿Cuál es tu nombre completo?')
    extensions.metrics?.trackFunnelStart(ctx.from)

    const msg = extensions.templates?.pick('ask_name', ctx.from) ?? '¿Cuál es tu nombre completo?'
    await flowDynamic([{ body: msg, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow, extensions }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      extensions.metrics?.trackFunnelAbandon(ctx.from, 'name')
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    if (input.length < 5) {
      return fallBack('El nombre parece muy corto. Ingresa tu *nombre completo* por favor.')
    }
    extensions.metrics?.trackFunnelStep(ctx.from, 'name')
    await state.update({ lead_name: input })

    // Preguntar DNI inmediatamente después de validar nombre
    const dniMsg = extensions.templates?.pick('ask_dni', ctx.from) ?? 'Ahora tu DNI (8 dígitos).'
    await extensions.flowDynamic?.([{ body: dniMsg, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow, flowDynamic, extensions }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      extensions.metrics?.trackFunnelAbandon(ctx.from, 'dni')
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }

    const normalizedDni = input.replace(/[\s.\-]/g, '')
    if (!/^\d{8}$/.test(normalizedDni)) {
      return fallBack('El DNI debe tener 8 dígitos. Inténtalo de nuevo (ej: 12345678).')
    }
    extensions.metrics?.trackFunnelStep(ctx.from, 'dni')
    await state.update({ lead_dni: normalizedDni })

    // Preguntar teléfono inmediatamente
    const phoneMsg = extensions.templates?.pick('ask_phone', ctx.from) ?? 'Tu número de teléfono (9 dígitos).'
    await flowDynamic([{ body: phoneMsg, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow, flowDynamic, extensions }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      extensions.metrics?.trackFunnelAbandon(ctx.from, 'phone')
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    const digits = input.replace(/\D/g, '')
    if (digits.length < 9) {
      return fallBack('El número debe tener al menos 9 dígitos. Inténtalo de nuevo (ej: 987654321).')
    }
    extensions.metrics?.trackFunnelStep(ctx.from, 'phone')
    await state.update({ lead_phone: digits })

    // Preguntar email inmediatamente
    const emailMsg = extensions.templates?.pick('ask_email', ctx.from) ?? 'Por último, tu correo electrónico.'
    await flowDynamic([{ body: emailMsg, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow, flowDynamic, extensions }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      extensions.metrics?.trackFunnelAbandon(ctx.from, 'email')
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      return fallBack('Eso no parece un correo válido. Inténtalo de nuevo (ej: nombre@correo.com).')
    }

    // shouldEscape: detectar pregunta fuera de contexto durante captura
    const escapeIntent = extensions.intentRouter?.detect?.(input)
    const isNumericInput = /^\d[\d\s.\-]*$/.test(input)
    if (escapeIntent && escapeIntent.confidence !== 'BAJA' && escapeIntent.intent !== 'unclear' && !isNumericInput) {
      const currentProgram = state.get<string>('programInterest')
      const kbAnswer = findAnswer(input, currentProgram ?? null) || findAnswer(input)
      const hp = extensions.humanPresence as { reply: Function } | undefined
      if (kbAnswer && hp) {
        await hp.reply(ctx, flowDynamic, kbAnswer)
      } else if (kbAnswer) {
        await flowDynamic([{ body: kbAnswer, delay: rnd() }])
      }
      const escapeCount = (state.get<number>('escapeCount') ?? 0) + 1
      await state.update({ escapeCount })
      if (escapeCount >= 3) {
        return fallBack('Entiendo que tienes dudas. Terminemos rápido el registro y el asesor te responde todo. ¿Tu correo electrónico?')
      }
      return fallBack('¿Tu correo electrónico?')
    }

    extensions.metrics?.trackFunnelStep(ctx.from, 'email')
    await state.update({ lead_email: input })

    const name = state.get<string>('lead_name') ?? ''
    const dni = state.get<string>('lead_dni') ?? ''
    const phone = state.get<string>('lead_phone') ?? ''
    const email = state.get<string>('lead_email') ?? ''
    const programInterest = state.get<string>('programInterest') ?? null

    extensions.metrics?.trackFunnelComplete(ctx.from)

    const leadPhone = normalizeLeadId(ctx.from)

    const lead = leads.upsert(leadPhone, { name, dni, phone, email, programInterest })

    const conversationContext = `Lead: ${name}. Programa: ${programInterest ?? 'No especificado'}. Completó registro.`
    const classification: ClassificationResult = classify(ctx.body ?? '', conversationContext)

    leads.updateClassification(lead.id, classification.etapa_asignada, JSON.stringify(classification))

    outbox.enqueue('lead.classified', {
      lead: { id: lead.id, name, dni, phone, email, programInterest, status: lead.status, createdAt: lead.createdAt },
      classification,
      tags: extensions.tagEngine?.tag(ctx.body ?? ''),
    })

    const summary = `Nombre: ${name}, DNI: ${dni}, Teléfono: ${phone}, Email: ${email}`
    extensions.messageLog?.outgoing(ctx.from, `Lead registrado: ${summary} | Pipeline: ${classification.etapa_asignada}`)

    const doneMsg = extensions.templates?.pick('registration_done', ctx.from)
      ?? `*Datos registrados exitosamente*\nUn asesor del CEE se pondrá en contacto contigo pronto.`
    const parts = splitResponse(doneMsg)
    for (let i = 0; i < parts.length; i++) {
      await flowDynamic([{ body: parts[i], delay: i > 0 ? delayBetween() : rnd() }])
    }
    return endFlow()
  })
