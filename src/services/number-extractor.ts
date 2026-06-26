export function extractNumber(msg: string): number | null {
  if (!msg) return null
  const cleaned = msg.trim()

  // "1", "2", "3" → número puro
  if (/^\d+$/.test(cleaned)) {
    const n = parseInt(cleaned)
    if (n > 0) return n
  }

  // Patrones de frase: "la 3", "el curso 5", "opción 2", "número 1"
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

  // Palabras: "primero" → 1, "segundo" → 2, etc.
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
