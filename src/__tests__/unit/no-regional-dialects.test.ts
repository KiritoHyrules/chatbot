import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const FORBIDDEN = [
  /\b(querés|preferís|pasás|tenés|podés|necesitás|sabés|decís|mirá|elegí|dominá|aprendé|probás|intentá|contame|vení|animate|fijate)\b/i,
  /\b(bacán|chamba|jato|nomás|broder|pata)\b/i,
  /\b(ándale|órale|neta|chido)\b/i,
  /\b(porfa|dale che|che|acá)\b/i,
]

const FILES = [
  'src/services/response-templates.ts',
  'src/data/knowledge.ts',
  'src/data/programs.ts',
  'src/services/ai.ts',
  'src/flows/welcome.flow.ts',
  'src/flows/programs.flow.ts',
  'src/flows/lead-capture.flow.ts',
  'src/flows/faq.flow.ts',
  'src/flows/handoff.flow.ts',
  'src/flows/cancel.flow.ts',
]

describe('No regional dialects in user-facing strings', () => {
  for (const file of FILES) {
    it(`${file} has no forbidden dialect markers`, () => {
      const content = readFileSync(join(process.cwd(), file), 'utf-8')
      for (const pattern of FORBIDDEN) {
        const lines = content.split('\n')
        for (const line of lines) {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue
          if (line.includes('NUNCA uses') || line.includes('PROHIBIDO') || line.includes('EJEMPLOS INCORRECTOS')) continue
          if (line.includes('(voseo)') || line.includes('(rioplatense') || line.includes('(peruano')) continue
          const match = line.match(pattern)
          if (match) {
            expect.fail(`Found "${match[0]}" in ${file}: "${line.trim().slice(0, 80)}"`)
          }
        }
      }
    })
  }
})
