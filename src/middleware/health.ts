export function healthCheck(_req: unknown, res: { writeHead: (c: number, h: Record<string, string>) => void; end: (s: string) => void }) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
}
