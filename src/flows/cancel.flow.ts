import { addKeyword } from '@builderbot/bot'
import { rnd, splitResponse, delayBetween } from '../utils.js'

export const cancelFlow = addKeyword(['cancelar', 'salir'])
  .addAction(async (ctx, { flowDynamic, endFlow, extensions }) => {
    let msg: string | undefined
    try {
      msg = await extensions.ai?.chat(ctx.from,
        'El usuario quiere cancelar o salir del menú actual. Despídete brevemente e invítalo a escribir *hola* cuando necesite algo.')
    } catch { /* fallback abajo */ }
    const parts = splitResponse(msg ?? extensions.templates?.pick('goodbye', ctx.from) ?? 'Has salido del menú. Escribe *hola* cuando necesites algo.')
    const hp = extensions.humanPresence as { reply: Function } | undefined
    if (hp) {
      await hp.reply(ctx, flowDynamic, parts)
    } else {
      for (let i = 0; i < parts.length; i++) {
        await flowDynamic([{ body: parts[i], delay: i > 0 ? delayBetween() : rnd() }])
      }
    }
    return endFlow()
  })
