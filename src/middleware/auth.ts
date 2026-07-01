type SimpleRes = { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }

export function authGuard(
  req: { url?: string; headers?: Record<string, string>; socket?: { remoteAddress?: string } },
  res: SimpleRes,
): boolean {
  const secret = process.env.DASHBOARD_SECRET ?? 'cambiar-en-produccion'

  const bearer = req.headers?.authorization?.replace('Bearer ', '') ?? ''
  if (bearer && bearer === secret) return true

  const url = new URL(req.url ?? '/', 'http://localhost')
  const token = url.searchParams.get('token') ?? ''
  if (token && token === secret) {
    console.warn(`[AUTH] Token via query param usado desde ${req.socket?.remoteAddress ?? 'unknown'}. Migrar a Bearer header.`)
    return true
  }

  res.writeHead(401, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'No autorizado.' }))
  return false
}
