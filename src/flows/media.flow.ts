import { addKeyword, EVENTS } from '@builderbot/bot'

const NO_MEDIA_REPLIES = [
  'No puedo escuchar audios por aquí 😅 ¿me lo escribes?',
  'No puedo escuchar audios todavía. ¿Me mandas texto mejor?',
  'Uy, solo leo texto por ahora. ¿Me lo escribes? 🙏',
  'Perdón, no proceso audios ni imágenes. ¿Me cuentas por texto?',
]

export const mediaFlow = addKeyword(EVENTS.MEDIA)
  .addAction(async (ctx, { flowDynamic, extensions }) => {
    extensions.messageLog?.incoming(ctx.from, '[MEDIA]', ctx.name)

    if (!extensions.messageLog?.shouldRespond(ctx.from)) return

    const msg = NO_MEDIA_REPLIES[Math.floor(Math.random() * NO_MEDIA_REPLIES.length)]
    await flowDynamic([{ body: msg, delay: 600 }])

    const state = extensions.conversationContext?.get(ctx.from)
    if (state?.lastPrompt) {
      await new Promise(r => setTimeout(r, 8000))
      await flowDynamic([{ body: `Te decía — ${state.lastPrompt}`, delay: 600 }])
    }
  })
