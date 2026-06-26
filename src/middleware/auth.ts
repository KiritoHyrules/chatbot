type SimpleRes = { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }

export function authGuard(req: { url?: string; headers?: Record<string, string> }, res: SimpleRes): boolean {
  const secret = process.env.DASHBOARD_SECRET ?? 'cambiar-en-produccion'
  const url = new URL(req.url ?? '/', 'http://localhost')
  const token = url.searchParams.get('token') ?? req.headers?.authorization?.replace('Bearer ', '') ?? ''
  if (token !== secret) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'No autorizado. Usa ?token=X en la URL.' }))
    return false
  }
  return true
}
