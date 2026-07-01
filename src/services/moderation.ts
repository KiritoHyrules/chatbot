const BLOCKED_SET = new Set([
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
  'mrd', 'mrda', 'ctmr', 'chcha', 'prra',
  'webon', 'webón', 'callate', 'cállate', 'calla',
  'oe', 'perro',
  'xd', 'pinche', 'chingada', 'chingado',
])

const MODERATION_RESPONSE = 'Soy el asistente profesional del *Centro de Especialización Ejecutiva* de la UNI. ¿En qué puedo ayudarte con información académica?'

export const moderation = {
  check(message: string): { blocked: boolean; response?: string } {
    const clean = message.toLowerCase().replace(/[^a-záéíóúñ0-9\s]/g, '')
    for (const word of clean.split(/\s+/)) {
      if (BLOCKED_SET.has(word)) {
        return { blocked: true, response: MODERATION_RESPONSE }
      }
    }
    return { blocked: false }
  },

  isFrustrated(message: string, hostilityCount: number): boolean {
    if (hostilityCount >= 3) return true
    const text = message.toLowerCase()
    const frustrationWords = ['ya', 'chcha', 'oe', 'pn', 'np', '.', '...', '??', '!!', 'osea', 'o sea', 'wtf']
    const hasFrustration = frustrationWords.filter(w => text.includes(w)).length >= 2
    const isVeryShort = text.length <= 3
    return hasFrustration || (isVeryShort && hostilityCount >= 2)
  },

  shouldEscalate(hostilityCount: number, loopCount: number): boolean {
    return hostilityCount >= 2 || loopCount >= 3
  },
}
