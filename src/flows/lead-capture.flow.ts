import { addKeyword, utils } from '@builderbot/bot'
import { leads } from '../services/store.js'
import { outbox } from '../services/store.js'
import { classify } from '../services/classifier.js'
import type { ClassificationResult } from '../services/classifier.js'
import { rnd } from '../utils.js'

export const leadCaptureFlow = addKeyword(utils.setEvent('EVENT_LEAD_CAPTURE'))
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    try {
      const msg = await extensions.ai?.chat(ctx.from,
        'El usuario va a dejarnos sus datos de contacto. Pídele amablemente su nombre completo.')
      await flowDynamic([{ body: msg ?? 'Voy a registrar tus datos. ¿Cuál es tu nombre completo?', delay: rnd() }])
    } catch {
      await flowDynamic([{ body: 'Voy a registrar tus datos. ¿Cuál es tu nombre completo?', delay: rnd() }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    if (input.length < 5) {
      return fallBack('El nombre parece muy corto. Ingresa tu *nombre completo* por favor.')
    }
    await state.update({ lead_name: input })
  })
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    try {
      const msg = await extensions.ai?.chat(ctx.from,
        'El usuario ya dio su nombre. Ahora pídele su DNI (8 dígitos). Sé breve.')
      await flowDynamic([{ body: msg ?? 'Ahora tu DNI (8 dígitos).', delay: rnd() }])
    } catch {
      await flowDynamic([{ body: 'Ahora tu DNI (8 dígitos).', delay: rnd() }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    if (!/^\d{8}$/.test(input)) {
      return fallBack('El DNI debe tener exactamente 8 dígitos numéricos, sin espacios ni letras. Inténtalo de nuevo.')
    }
    await state.update({ lead_dni: input })
  })
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    try {
      const msg = await extensions.ai?.chat(ctx.from,
        'El usuario ya dio nombre y DNI. Pídele su número de teléfono (9 dígitos). Sé breve.')
      await flowDynamic([{ body: msg ?? 'Tu número de teléfono (9 dígitos).', delay: rnd() }])
    } catch {
      await flowDynamic([{ body: 'Tu número de teléfono (9 dígitos).', delay: rnd() }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    const digits = input.replace(/\D/g, '')
    if (digits.length < 9) {
      return fallBack('El número debe tener al menos 9 dígitos. Inténtalo de nuevo.')
    }
    await state.update({ lead_phone: digits })
  })
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    try {
      const msg = await extensions.ai?.chat(ctx.from,
        'El usuario ya dio nombre, DNI y teléfono. Pídele su correo electrónico. Sé breve.')
      await flowDynamic([{ body: msg ?? 'Por último, tu correo electrónico.', delay: rnd() }])
    } catch {
      await flowDynamic([{ body: 'Por último, tu correo electrónico.', delay: rnd() }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { state, fallBack, endFlow, flowDynamic, extensions }) => {
    const input = ctx.body?.trim() ?? ''
    if (input === 'cancelar' || input === 'salir') {
      return endFlow('Registro cancelado. Escribe cualquier mensaje cuando desees retomar.')
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) {
      return fallBack('Eso no parece un correo válido. Inténtalo de nuevo (ej: nombre@correo.com).')
    }
    await state.update({ lead_email: input })

    const name = state.get<string>('lead_name') ?? ''
    const dni = state.get<string>('lead_dni') ?? ''
    const phone = state.get<string>('lead_phone') ?? ''
    const email = state.get<string>('lead_email') ?? ''
    const programInterest = state.get<string>('programInterest') ?? null

    const leadPhone = ctx.from.includes('@') ? ctx.from.split('@')[0] : ctx.from

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

    try {
      const msg = await extensions.ai?.chat(ctx.from,
        `El usuario completó el registro con estos datos: ${summary}. Confírmale que sus datos se registraron, agradécele y dile que un asesor lo contactará pronto.`)
      await flowDynamic([{ body: msg ?? `*Datos registrados exitosamente*\nUn asesor del CEE se pondrá en contacto contigo pronto.`, delay: rnd() }])
    } catch {
      await flowDynamic([{ body: `*Datos registrados exitosamente*\nUn asesor del CEE se pondrá en contacto contigo pronto.`, delay: rnd() }])
    }
    return endFlow()
  })
