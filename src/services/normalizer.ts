export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\p{Emoji}\s]/gu, ' ')
    .replace(/\b(xq|pk|pq)\b/g, 'porque')
    .replace(/\b(tbn|tmb)\b/g, 'tambien')
    .replace(/\b(q|k)\b/g, 'que')
    .replace(/\b(xfa|pf)\b/g, 'por favor')
    .replace(/\b(kuanto|kanto)\b/g, 'cuanto')
    .replace(/\b(kuesta|kesta)\b/g, 'cuesta')
    .replace(/\b(klase|clse)\b/g, 'clase')
    .replace(/\s+/g, ' ')
    .trim()
}
