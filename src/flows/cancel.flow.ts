import { addKeyword } from '@builderbot/bot'
import { rnd, splitResponse, delayBetween } from '../utils.js'

export const cancelFlow = addKeyword(['cancelar', 'salir'])
  .addAction(async (ctx, { flowDynamic, endFlow, extensions }) => {
    const parts = splitResponse(extensions.templates?.pick('goodbye', ctx.from) ?? 'Has salido del menú. Escribe *hola* cuando necesites algo.')
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
