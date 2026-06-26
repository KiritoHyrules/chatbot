import { addKeyword } from '@builderbot/bot'
import { join } from 'node:path'
import { programs } from '../data/programs.js'
import { findAnswer } from '../data/knowledge.js'
import { extractNumber } from '../services/number-extractor.js'
import { rnd } from '../utils.js'

function reorderPrograms(userMessage: string) {
  const q = userMessage.toLowerCase()
  const scored = programs.map(p => {
    let score = 0
    const name = p.name.toLowerCase()
    if (q.includes('sistemas') && (name.includes('ciberseguridad') || name.includes('digital') || name.includes('datos'))) score += 3
    if (q.includes('industrial') && (name.includes('gestión') || name.includes('proyectos') || name.includes('digital'))) score += 3
    if (q.includes('datos') || q.includes('python') || q.includes('machine')) { if (name.includes('datos')) score += 3 }
    if (q.includes('seguridad') || q.includes('hacking')) { if (name.includes('ciberseguridad')) score += 3 }
    if (q.includes('proyecto') || q.includes('gestión') || q.includes('pmbok')) { if (name.includes('gestión') || name.includes('proyectos')) score += 3 }
    if (q.includes('digital') || q.includes('transformación') || q.includes('industria')) { if (name.includes('digital')) score += 3 }
    if (q.includes('power') || q.includes('bi') || q.includes('excel') || q.includes('dashboard')) { if (name.includes('power')) score += 3 }
    if (q.includes('práctica') || q.includes('practica')) { if (name.includes('datos') || name.includes('power')) score += 2 }
    return { ...p, _score: score }
  })
  scored.sort((a, b) => b._score - a._score)
  return scored
}

export const programsFlow = addKeyword(['programas', 'cursos', 'diplomados', 'pee'])
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, ctx.body ?? '')
    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    const ordered = reorderPrograms(ctx.body ?? '')
    const list = ordered.map((p, i) => `*${i + 1}.* ${p.name} — _${p.type}_`).join('\n')
    let intro: string | undefined
    try {
      intro = await extensions.ai?.chat(ctx.from,
        `El usuario quiere ver los programas disponibles. Esta es la lista:\n${list}\n\nPreséntasela de forma cálida y dile que responda con el número del programa que le interesa.${ordered[0]._score > 0 ? '\n\nEl usuario mostró interés en temas relacionados con los primeros programas. Destácalos sutilmente.' : ''}`)
    } catch { /* fallback */ }
    await flowDynamic([{ body: intro ?? list, delay: rnd() }])
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { flowDynamic, fallBack, endFlow, state, extensions }) => {
    const option = ctx.body?.trim() ?? ''

    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe *hola* cuando desees retomar.')
    }

    let index = parseInt(option, 10)
    if (isNaN(index) || index < 1 || index > programs.length) {
      const extracted = extractNumber(option)
      if (extracted && extracted >= 1 && extracted <= programs.length) {
        index = extracted
      }
    }

    if (isNaN(index) || index < 1 || index > programs.length) {
      let retry: string | undefined
      try {
        retry = await extensions.ai?.chat(ctx.from, option,
          `El usuario respondió "${option}" pero no es un número válido (1-${programs.length}). Pídele que elija un número de la lista.`)
      } catch { /* fallback */ }
      return fallBack(retry ?? `No entendí bien. ¿Me decís el número del programa que te interesa? (1-${programs.length})`)
    }

    const program = programs[index - 1]
    await state.update({ programInterest: program.name })
    extensions.pipeline?.classifyAndSend(ctx.from, option, `Interesado en: ${program.name}`)
    extensions.conversationContext?.recordProgram(ctx.from, program.name)

    let detail: string | undefined
    try {
      detail = await extensions.ai?.chat(ctx.from,
        `El usuario seleccionó el programa: "${program.name}" (${program.type}). Descripción: ${program.description}. ${program.brochureFile ? 'Tiene brochure disponible.' : 'No tiene brochure.'} Cuéntale sobre este programa y pregúntale si quiere que un asesor lo contacte (sí o no).`)
    } catch { /* fallback */ }
    await flowDynamic([{ body: detail ?? program.description, delay: rnd() }])

    if (program.brochureFile) {
      await flowDynamic([{ body: 'Aquí tienes el brochure.', delay: rnd(), media: join(process.cwd(), 'public', 'brochures', program.brochureFile) }])
    }
  })
  .addAction({ capture: true, idle: 120000 }, async (ctx, { gotoFlow, endFlow, fallBack, flowDynamic, state, extensions }) => {
    const option = ctx.body?.trim() ?? ''
    const text = option.toLowerCase()

    if (option === '1' || text === 'sí' || text === 'si') {
      extensions.ai?.clearHistory(ctx.from)
      const { leadCaptureFlow } = await import('./lead-capture.flow.js')
      return gotoFlow(leadCaptureFlow)
    }
    if (option === '2' || text === 'no') {
      return endFlow('Gracias por tu interés. Escribe cualquier cosa cuando necesites algo más.')
    }
    if (option === 'cancelar' || option === 'salir') {
      return endFlow('Escribe cuando quieras retomar.')
    }

    // Capa 1: Extraer número de la frase
    const num = extractNumber(option)
    if (num && num >= 1 && num <= programs.length) {
      const prog = programs[num - 1]
      await state.update({ programInterest: prog.name })
      const detail = prog.description
      await flowDynamic([{ body: `*${prog.name}* — ${detail}`, delay: rnd() }])
      return fallBack('¿Te gustaría que un asesor te contacte? Responde *sí* o *no*.')
    }

    // Capa 2: Buscar en knowledge base sobre el programa actual
    const currentProgram = state.get<string>('programInterest') ?? extensions.conversationContext?.get(ctx.from)?.lastProgramShown
    const kbAnswer = findAnswer(option, currentProgram ?? null)
    if (kbAnswer) {
      await flowDynamic([{ body: kbAnswer, delay: rnd() }])
      return fallBack('¿Querés saber algo más de este programa?')
    }

    // Capa 3: Buscar en knowledge base general
    const generalKb = findAnswer(option)
    if (generalKb) {
      await flowDynamic([{ body: generalKb, delay: rnd() }])
      return
    }

    // Capa 4: Intentar Gemini
    let retry: string | undefined
    try {
      retry = await extensions.ai?.chat(ctx.from, option, 'El usuario hizo una pregunta después de ver un programa. Responde con información útil sobre el CEE o sus programas.')
    } catch { /* fallback */ }

    if (retry) {
      await flowDynamic([{ body: retry, delay: rnd() }])
      return
    }

    // Capa 5: Último recurso
    return fallBack('¿Querés que te cuente más de este programa o preferís ver otros?')
  })
