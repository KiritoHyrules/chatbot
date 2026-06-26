const BLOCKED_WORDS = [
  'mamasita', 'mamacita', 'perra', 'perrita', 'kchar', 'cachar',
  'culo', 'puta', 'puto', 'mierda', 'pene', 'nepe', 'vagina',
  'sexo', 'sexual', 'tetas', 'culos', 'porno', 'desnudo',
  'chinga', 'chingar', 'verga', 'pendejo', 'pendeja',
  'cojer', 'coger', 'follar', 'culear',
  'estupido', 'estupida', 'idiota', 'imbecil', 'tarado',
  'concha', 'conchetumare', 'ctm', 'hdp', 'ptm',
  'drogas', 'droga', 'marihuana', 'cocaina',
  'prostituta', 'zorra', 'marica', 'maricon',
  'basura', 'miercoles', 'joder', 'hostia',
  'cabron', 'cabrón', 'pendejada', 'huevon', 'huevón',
  'gilipollas', 'pelotudo', 'boludo', 'mamón',
]

const MODERATION_RESPONSE = 'Soy el asistente profesional del *Centro de Especialización Ejecutiva* de la UNI. ¿En qué puedo ayudarte con información académica?'

export const moderation = {
  check(message: string): { blocked: boolean; response?: string } {
    const clean = message.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/g, '')
    for (const word of BLOCKED_WORDS) {
      if (clean.includes(word)) {
        return { blocked: true, response: MODERATION_RESPONSE }
      }
    }
    return { blocked: false }
  },
}
