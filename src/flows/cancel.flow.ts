import { addKeyword } from '@builderbot/bot'
import { rnd } from '../utils.js'

export const cancelFlow = addKeyword(['cancelar', 'salir'])
  .addAction(async (ctx, { flowDynamic, endFlow, extensions }) => {
    let msg: string | undefined
    try {
      msg = await extensions.ai?.chat(ctx.from,
        'El usuario quiere cancelar o salir del menú actual. Despídete brevemente e invítalo a escribir *hola* cuando necesite algo.')
    } catch { /* fallback abajo */ }
    await flowDynamic([{ body: msg ?? extensions.templates?.get('goodbye') ?? 'Has salido del menú. Escribe *hola* cuando necesites algo.', delay: rnd() }])
    return endFlow()
  })
