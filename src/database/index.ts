import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { JsonFileDB as Database } from '@builderbot/database-json'

mkdirSync(join(process.cwd(), 'data'), { recursive: true })

export const database = new Database({ filename: 'data/conversations.json' })
