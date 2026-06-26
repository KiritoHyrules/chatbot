import { addKeyword } from '@builderbot/bot'
import { join } from 'node:path'
import { programs } from '../data/programs.js'
import { rnd } from '../utils.js'

export const programsFlow = addKeyword(['programas', 'cursos', 'diplomados', 'pee'])
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    const list = programs.map((p, i) => `*${i + 1}.* ${p.name} — _${p.type}_`).join('\n')
    let intro: string | undefined
    try {
      intro = await extensions.ai?.chat(ctx.from,
        `El usuario quiere ver los programas disponibles. Esta es la lista:\n${list}\n\nPreséntasela de forma cálida y dile que responda con el número del programa que le interesa para recibir más información.`)
    } catch {
      console.warn('[programs] Gemini falló en intro')
    }

    await flowDynamic([{ body: intro ?? list, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { flowDynamic, fallBack, endFlow, state, extensions }) => {
    const option = ctx.body?.trim() ?? ''

    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe *hola* cuando desees retomar.')
    }

    const index = parseInt(option, 10)
    if (isNaN(index) || index < 1 || index > programs.length) {
      let retry: string | undefined
      try {
        retry = await extensions.ai?.chat(ctx.from, option,
          `El usuario respondió "${option}" pero no es un número válido (1-${programs.length}). Pídele amablemente que elija un número de la lista.`)
      } catch { /* fallback hardcodeado abajo */ }
      return fallBack(retry ?? `Opción inválida. Responde un número del *1* al *${programs.length}*.`)
    }

    const program = programs[index - 1]
    await state.update({ programInterest: program.name })
    extensions.pipeline?.classifyAndSend(ctx.from, option, `Interesado en: ${program.name}`)

    let detail: string | undefined
    try {
      detail = await extensions.ai?.chat(ctx.from,
        `El usuario seleccionó el programa: "${program.name}" (${program.type}). Descripción: ${program.description}. ${program.brochureFile ? 'Tiene brochure disponible.' : 'No tiene brochure.'} Cuéntale sobre este programa de forma atractiva y pregúntale si quiere que un asesor lo contacte (responde 1 para sí, 2 para no).`)
    } catch {
      console.warn('[programs] Gemini falló en detalle')
    }

    await flowDynamic([{ body: detail ?? program.description, delay: rnd() }])

    if (program.brochureFile) {
      await flowDynamic([{ body: 'Aquí tienes el brochure.', delay: rnd(), media: join(process.cwd(), 'public', 'brochures', program.brochureFile) }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, extensions }) => {
    const option = ctx.body?.trim() ?? ''
    if (option === '1' || option?.toLowerCase() === 'sí' || option?.toLowerCase() === 'si') {
      extensions.ai?.clearHistory(ctx.from)
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }
    if (option === '2' || option?.toLowerCase() === 'no') {
      return endFlow('Gracias por tu interés. Escribe *hola* cuando necesites algo más.')
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe *hola* cuando desees retomar.')
    }
    let retry: string | undefined
    try {
      retry = await extensions.ai?.chat(ctx.from, option,
        'El usuario dio una respuesta ambigua. Pregúntale si quiere ser contactado (1) o no (2).')
    } catch { /* fallback abajo */ }
    return fallBack(retry ?? 'Responde *1* para que te contactemos o *2* para volver al menú.')
  })
