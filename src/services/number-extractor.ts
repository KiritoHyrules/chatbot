export function extractNumber(msg: string): number | null {
  if (!msg) return null
  const cleaned = msg.trim()

  if (/^\d+$/.test(cleaned)) {
    const n = parseInt(cleaned)
    if (n > 0) return n
  }

  const patterns = [
    /(?:opción|curso|programa|número|numero|la|el|del)\s*(\d+)/i,
    /(\d+)\s*(?:,|\.|\)|$)/,
    /^(?:quiero|elijo|escojo|dame|ver)\s*(?:el|la)?\s*(?:opción|curso|programa|número|numero)?\s*(\d+)/i,
    /estoy\s+interesad[oa]\s+en\s+(?:el|la)?\s*(?:opción|curso|programa|número|numero)?\s*(\d+)/i,
    /(?:más|mas)\s+informaci[óo]n\s+(?:de|del|sobre)\s+(?:el|la)?\s*(?:opción|curso|programa)?\s*(\d+)/i,
    /(?:el|la)\s*(?:primera?|segund[oa]|tercer[oa]|cuart[oa]|quint[oa])/i,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[1]) {
      const n = parseInt(match[1])
      if (n > 0) return n
    }
  }

  const wordMap: Record<string, number> = {
    'primero': 1, 'primera': 1, 'primer': 1,
    'segundo': 2, 'segunda': 2,
    'tercero': 3, 'tercera': 3, 'tercer': 3,
    'cuarto': 4, 'cuarta': 4,
    'quinto': 5, 'quinta': 5,
  }
  for (const [word, num] of Object.entries(wordMap)) {
    if (cleaned.toLowerCase().includes(word)) return num
  }

  return null
}

export function resolveReference(
  msg: string,
  programNames: string[],
  lastProgramShown?: string,
): number | null {
  if (!msg) return null
  const q = msg.toLowerCase().trim()

  // "ese", "esa", "eso" → último programa mostrado
  if (/^es[eo]s?$/i.test(q) || /^es[ao]$/i.test(q)) {
    if (lastProgramShown) {
      const idx = programNames.indexOf(lastProgramShown)
      if (idx >= 0) return idx + 1
    }
    return null
  }

  // "el que dijiste", "el que mencionaste", "ese mismo", "ese programa"
  if (/\b(el|la) que (dijiste|mencionaste|enseñaste|mostraste)\b/i.test(q) ||
      /\bese mism[oa]\b/i.test(q) ||
      /^(ese|esa|el mismo|la misma)\b.*(programa|curso|diplomado)?$/i.test(q)) {
    if (lastProgramShown) {
      const idx = programNames.indexOf(lastProgramShown)
      if (idx >= 0) return idx + 1
    }
    return null
  }

  // "el de operaciones", "el de ciberseguridad", etc. → busca por keyword
  for (let i = 0; i < programNames.length; i++) {
    const name = programNames[i].toLowerCase()
    const keywords = name.split(' ')
    for (const kw of keywords) {
      if (kw.length > 3 && q.includes(kw) && !q.match(/\d/)) {
        return i + 1
      }
    }
  }

  return null
}
