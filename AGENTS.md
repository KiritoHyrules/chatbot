# AGENTS.md — Chatbot CEE-FIIS-UNI

## BuilderBot rules (mandatory — the framework crashes silently if violated)

- `gotoFlow()`, `endFlow()`, `fallBack()` → always `return` the call
- `flowDynamic()`, `state.update()` → always `await`
- No `buttons` — menus use `capture: true` with numeric/keyword matching
- No `flowDynamic` + `endFlow` in the same callback
- No `idle` without `capture`
- No `idleFallBack`
- No `require()` — ESM only (the project is `"type": "module"`)
- Imports must include the `.js` extension (e.g. `'./flows/index.js'`)

## Commands (run in order before committing)

```bash
npm run typecheck   # tsc --noEmit (0 errors required)
npm test            # vitest run (201 tests, must pass)
```

## Env / setup

- Env file is `.env.local` (NOT `.env`), loaded as `--env-file=.env.local`
- Required vars: `DASHBOARD_SECRET`
- If `DASHBOARD_SECRET` is missing, the bot auto-generates a UUID and saves it to `data/operator_token.txt`
- Dashboard auth: pass `?token=<DASHBOARD_SECRET>` or `Authorization: Bearer <token>` header
- RAG: run `npm run rag:ingest` to load documents into LanceDB before first use

## Node.js version

- **Node 22 only.** Node 24 breaks `whatsapp-rust-bridge` (Baileys). Node 20 lacks precompiled `sql.js` binaries.
- `start.bat` / `start.sh` auto-download Node 22.18.0 portable. For `npm run dev`, you must have Node ≥22 already.
- Install deps with `npm install --legacy-peer-deps` (required for `fuse.js`)

## WhatsApp / Baileys

- Baileys version pinned via `overrides` in package.json → `baileys: 7.0.0-rc13`
- Provider version hardcoded in `src/provider/index.ts:4`
- Sessions stored in `bot_sessions/` → gitignored, never commit

## Architecture quirks

- `createFlow([...])` array order matters — last flow whose keyword pattern matches wins
- 7 flows: `cancel` → `welcome` → `programs` → `faq` → `handoff` → `leadCapture` → `media`
- Extensions (services) are injected in `src/app.ts` as a flat object. New services go there.
- 3 flows use RAG (`faq`, `welcome`, `programs`) — `rag.retrieve()` + `rag.formatResponse()`
- 3 flows use templates only (`cancel`, `handoff`, `lead-capture`)
- When `mode === 'HUMAN'` for a phone, the bot skips auto-reply (checked via `messageLog.shouldRespond`)
- Dashboard polls `/api/dashboard/state` — uses rate limiting (100 req/15min per IP)
- Message dedup: 10s window by `phone:body_hash`
- RAG uses LanceDB (local file) + Transformers.js (local embeddings) — 0 external APIs

## Persistence

- **JSON files** (`data/conversations.json`) — BuilderBot's internal state (flow position, blacklist)
- **SQLite** (`data/cee.db`) — leads, dashboard messages, AI history, outbox, conversation state
- Tables created automatically by `initDb()` on startup. Schema changes need migrations in `src/database/migrations/`.

## Testing

- Tests run sequentially (`fileParallelism: false`, `pool: 'forks'`)
- Test glob: `src/**/*.test.ts`
- Coverage excludes: flows/, provider/, database/index.ts, app.ts, test-helpers/
- Coverage thresholds: 50% statements, 45% branches, 50% functions, 50% lines

## Adding a new flow

1. Create `src/flows/new.flow.ts` — export as `const newFlow = addKeyword(...)`
2. Import and add to the array in `src/flows/index.ts`
3. If it needs a new service, create it in `src/services/`, inject in `src/app.ts`
4. Add tests in `src/__tests__/e2e/` and `src/__tests__/unit/`

## Key files for context

- `docs/PROJECT.md` — full developer documentation
- `DEVELOPER_A.md` / `DEVELOPER_B.md` — per-developer task specs (historical)
- `src/app.ts` — entry point: wires bot, HTTP routes, services
- `src/flows/welcome.flow.ts` — catch-all welcome flow with `intentRouter`
