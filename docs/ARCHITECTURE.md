# Arquitectura — Chatbot CEE-FIIS-UNI

> **Grafo de código:** 12,153 nodos · 12,750 aristas · 12 clusters (Leiden)  
> **Stack:** BuilderBot 1.4.2 + Baileys (WhatsApp) + Gemini 2.5 Flash + SQLite (sql.js)  
> **Node.js:** 22.18.0 obligatorio (24 rompe Baileys, 20 sin binarios sql.js)

---

## Guía rápida de diagnóstico

| Síntoma | Dónde mirar primero |
|---------|---------------------|
| El bot no responde | `message-log.shouldRespond` → `store.run` → `ai.chat` |
| Lead no se guarda | `store.run` → `lead-id.normalizeLeadId` → `sqlite.saveDb` |
| Respuesta repetida/robótica | `response-templates.get` (pool sin repetición) → `ai.chat` (Gemini caído) |
| Dashboard no carga | `authGuard` → `store.getAll` → `checkRateLimit` |
| Mensajes duplicados | `app.isDuplicate` (ventana 10s) → `message-aggregator.waitForBurst` |
| El bot contesta fuera de horario | `office-hours.isOpen` → `handoff.flow` |
| Clasificación de lead incorrecta | `classifier.classify` → `lead-scorer.score` → `tag-engine.tag` |
| WhatsApp no conecta | `provider/index.ts:4` (versión hardcodeada) → `bot_sessions/` corrupta |

---

## 1. Clusters funcionales (Leiden community detection)

| # | Cohesion | Responsabilidad | Funciones clave | Archivos |
|---|----------|-----------------|-----------------|----------|
| 5 | 0.60 | Store + migraciones | `run`, `getDb`, `saveDb`, `migrate001` | `store.ts`, `sqlite.ts`, `migrations/` |
| 3 | 0.71 | Contexto + rate limiting | `get`, `set`, `waitForBurst`, `checkRateLimit` | `conversation-context.ts`, `message-aggregator.ts` |
| 12 | 0.55 | Clasificación + búsqueda | `classify`, `findAnswerStatic`, `normalizeQuery` | `classifier.ts`, `knowledge.ts` |
| 9 | 0.52 | LLM + Outbox | `chat`, `startOutboxWorker`, CRUD leads | `ai.ts`, `outbox.ts`, `store.ts` |
| 2 | 0.43 | Leads + presencia humana | `normalizeLeadId`, `human`, `setName` | `lead-id.ts`, `message-log.ts`, `human-presence.ts` |
| 4 | 0.45 | HTTP / Dashboard | `main`, `authGuard`, `healthCheck` | `app.ts`, `middleware/` |
| 8 | 0.70 | Resiliencia LLM | `callWithRetry`, `track`, `recordFailure/Success` | `ai.ts`, `metrics.ts` |
| 7 | 1.00 | Horario oficina (Lima UTC-5) | `isOpen`, `outsideHoursMessage`, `nextOpenTime` | `office-hours.ts` |
| 0 | 0.80 | Operador humano | `humanReply`, `rnd`, `replyOrFallback` | `human-presence.ts`, `utils.ts` |

**Cluster de riesgo:** #2 (cohesión 0.43) — `normalizeLeadId`, `addMessage`, `handleContactUpdate`, `human`, `setName` están débilmente cohesionados. Si crece, considerar dividirlo.

---

## 2. Entry points (20 funciones)

| # | Función | Archivo | Capa |
|---|---------|---------|------|
| 1 | `main` | `src/app.ts` | Internal — orquestador, 21 destinos |
| 2 | `findProgram` | `src/data/knowledge.ts` | Entry — búsqueda de programas |
| 3 | `findAnswer` | `src/data/knowledge.ts` | Entry — búsqueda FAQ |
| 4 | `ask` | `src/services/ai.ts` | Core — prompt único a Gemini |
| 5 | `chat` | `src/services/ai.ts` | Core — chat multi-turno con Gemini |
| 6 | `clearHistory` | `src/services/ai.ts` | Core — limpiar historial IA |
| 7 | `classify` | `src/services/classifier.ts` | Core — 6 etapas pipeline |
| 8 | `get` | `src/services/conversation-context.ts` | Core — leer contexto (fan_in=19) |
| 9 | `set` | `src/services/conversation-context.ts` | Core — escribir contexto (fan_in=13) |
| 10 | `recordQuestion/Program/Hostility/Loop` | `src/services/conversation-context.ts` | Core — registrar eventos |
| 11 | `initDb` | `src/database/sqlite.ts` | Core — crear tablas |
| 12 | `getDb` | `src/database/sqlite.ts` | Core — obtener conexión (fan_in=13) |
| 13 | `saveDb` | `src/database/sqlite.ts` | Core — persistir a disco (fan_in=9) |
| 14 | `closeDb` | `src/database/sqlite.ts` | Core — cerrar conexión |
| 15 | `migrate001` | `src/database/migrations/001-normalize-lead-ids.ts` | Core |
| 16 | `authGuard` | `src/middleware/auth.ts` | Entry — proteger dashboard |
| 17 | `healthCheck` | `src/middleware/health.ts` | Entry — GET /health |

---

## 3. Hotspots (funciones con mayor fan-in)

Si tocás una de estas, **revisá todos sus callers**. Un cambio puede romper en cascada.

| Ranking | Función | fan_in | Impacto si falla |
|---------|---------|--------|------------------|
| 1 | `store.run` | **29** | Colapsa toda persistencia de leads, dashboard, outbox |
| 2 | `conversation-context.get` | **19** | Se pierde el contexto de toda conversación activa |
| 3 | `lead-id.normalizeLeadId` | **16** | IDs corruptos en cadena completa de captura |
| 4 | `conversation-context.set` | **13** | No se puede guardar estado de conversación |
| 5 | `sqlite.getDb` | **13** | Sin BD = bot muerto |
| 6 | `sqlite.saveDb` | **9** | Pérdida de datos si falla el flush |
| 7 | `message-aggregator.waitForBurst` | **7** | Se rompe el burst de mensajes (duplicados) |
| 8 | `message-log.shouldRespond` | **7** | El bot responde cuando no debe (modo HUMAN roto) |
| 9 | `message-log.incoming` | **7** | Log de mensajes roto, dedup falla |
| 10 | `utils.rnd` | **7** | Fallos en selección aleatoria de templates |

### Función de mayor fan-out

- **`main` en `src/app.ts`** — fan_out = **21**. El orquestador monolítico. Cualquier cambio en `app.ts` tiene alto riesgo de impacto múltiple.

---

## 4. Puntos de fallo y riesgos

### 4.1 Funciones recursivas no protegidas

| Función | Archivo | Riesgo |
|---------|---------|--------|
| `store.run` | `store.ts:210` | `unguarded_recursion=true` — se llama a sí misma sin condición de parada verificable |
| `message-aggregator.waitForBurst` | `message-aggregator.ts` | `recursive=true` — re-despacho de mensajes puede provocar loop |
| `message-aggregator.doFlush` | `message-aggregator.ts` | `recursive=true` |
| `message-aggregator.flush` | `message-aggregator.ts` | `recursive=true` |
| `message-aggregator.drop` | `message-aggregator.ts` | `recursive=true` |
| `message-log.setMode` | `message-log.ts` | `recursive=true` |
| `ai.clearHistory` | `ai.ts` | `recursive=true` |
| `replyOrFallback` | `human-presence.ts` | Aparece **duplicado** en el cluster 0 — posible bucle de reenvío |

### 4.2 Funciones con alta profundidad de bucle transitivo

| Función | Profundidad | linear_scan | Riesgo |
|---------|-------------|-------------|--------|
| `main` | 3 | 0 | Orquestador con 21 callers en cascada |
| `pipeline.classifyAndSend` | 3 | 0 | Pipeline de clasificación profundo |
| `classifier.classify` | 3 | 0 | 6 etapas encadenadas |
| `lid-resolver.resolvePendingLids` | 3 | 0 | Resolución de LIDs con reintentos |
| `lid-resolver.setupLidListener` | 3 | 0 | Listener de eventos con callbacks anidados |
| `faq.flow.keywordMatch` | 2 | **1** | Escaneo lineal dentro de loops |
| `number-extractor.resolveReference` | 2 | **1** | Escaneo lineal dentro de loops |
| `office-hours.nextOpenTime` | 1 | **1** | Escaneo de arrays |
| `knowledge.findAnswerStatic` | 1 | **1** | Búsqueda lineal en knowledge base |
| `moderation.check` | 1 | **1** | Escaneo de palabras bloqueadas |

### 4.3 Acoplamientos bidireccionales (riesgo de ciclo)

| Dirección | Llamadas | Problema |
|-----------|----------|----------|
| `database` → `services` | **6** | `core` llamando a `core` — posible dependencia circular |
| `middleware` → `__tests__` | 4 | Capa `entry` dependiendo de `internal` (probablemente error del analizador, verificar) |
| `app` → `__tests__` | 2 | Ídem |
| `flows` → `app` | 2 | Flows importando del entry point (verificar si es real o tipo) |

---

## 5. API HTTP (6 endpoints)

Todas las rutas definidas en `src/app.ts:100-182`:

| Método | Ruta | Handler | Auth | Rate Limit |
|--------|------|---------|------|------------|
| `GET` | `/health` | `healthCheck` | No | No |
| `GET` | `/dashboard` | sirve `dashboard.html` | No | No |
| `GET` | `/api/dashboard/state` | `store.getAll` | `?token=` o `Bearer` | 100/15min |
| `POST` | `/api/dashboard/mode` | `messageLog.setMode` | `?token=` o `Bearer` | 100/15min |
| `POST` | `/api/dashboard/send` | `bot.sendMessage` + `messageLog.human` | `?token=` o `Bearer` | 100/15min |
| `POST` | `/api/dashboard/reclassify` | `leads.updateClassification` + `outbox.enqueue` | `?token=` o `Bearer` | 100/15min |

---

## 6. Pipeline de procesamiento de mensajes

```
normalizer → classifier → conversation-context → moderation
→ objection-detector → urgency-detector → decision-engine
→ intent-router → flow (welcome/cancel/programs/faq/handoff/lead-capture/media)
→ message-aggregator (burst control)
```

### Flujo de lead capture completo
```
lead-capture.flow (nombre → DNI → tel → email)
  → leads.upsert()           [SQLite]
  → classifier.classify()     [6 etapas regex]
  → leadScorer.score()        [0-100]
  → tagEngine.tag()           [8 tags]
  → outbox.enqueue()          [cola → n8n webhook]
```

---

## 7. Sistema de flows

7 flows en `src/flows/index.ts`. **El orden importa** — el último flow cuyo keyword hace match gana:

```
createFlow([cancel, welcome, programs, faq, handoff, leadCapture, media])
```

| Flow | Archivo | Keyword | Propósito |
|------|---------|---------|-----------|
| cancel | `cancel.flow.ts` | `cancelar`, `salir` | Terminar flow actual |
| welcome | `welcome.flow.ts` | `EVENTS.WELCOME` | Catch-all, intentRouter |
| programs | `programs.flow.ts` | `programas`, `cursos` | Lista + brochure + lead |
| faq | `faq.flow.ts` | `duda`, `consulta` | FAQ 4 capas, timeout 15s |
| handoff | `handoff.flow.ts` | `asesor`, `hablar` | Derivación a humano |
| leadCapture | `lead-capture.flow.ts` | `contactar`, `info` | Formulario 4 pasos |
| media | `media.flow.ts` | archivos | Multimedia entrante |

---

## 8. Base de datos (dual)

### JsonFileDB — `data/conversations.json`
BuilderBot interno: posición en el flow, blacklist, estado de flows.

### SQLite — `data/cee.db`
6 tablas creadas por `initDb()`:

| Tabla | Propósito |
|-------|-----------|
| `leads` | Datos de contacto + etapa pipeline + clasificación |
| `dashboard_messages` | Historial de mensajes por conversación |
| `dashboard_meta` | Modo AI/HUMAN, nombre, última actividad |
| `ai_history` | Historial de conversación para Gemini (max 20) |
| `outbox` | Cola de eventos para n8n (con reintentos) |
| `conv_state` | Estado de conversación (contexto, hostilidad, loops) |

---

## 9. Dependencias entre capas

### Arquitectura en capas

| Capa | Paquetes | Tipo |
|------|----------|------|
| **Entry** | `data/`, `flows/`, `middleware/` | Puntos de entrada, solo llamadas salientes |
| **Core** | `services/` (fan_in=32), `database/` (fan_in=17) | Lógica de negocio, muy dependidos |
| **API** | `app.ts` (raíz) | Orquestador, define rutas HTTP |
| **Internal** | `__tests__/`, `test-helpers/` | Tests y fixtures |

### Tráfico observado

| Origen → Destino | Llamadas | Estado |
|-------------------|----------|--------|
| `app` → `services` | 17 | ✓ Correcto |
| `services` → `database` | 11 | ✓ Correcto |
| `database` → `services` | 6 | ⚠️ Core→Core, posible ciclo |
| `__tests__` → `services` | 5 | ✓ Correcto |
| `data` → `services` | 4 | ✓ Correcto |
| `flows` → `app` | 2 | ⚠️ Entry→API, verificar |

### Dirección esperada
```
Entry → Core (services) → Core (database)
```
La violación `database → services` debe revisarse — si `services` también importa de `database`, hay dependencia circular real.

---

## 10. Conexiones externas no rastreadas por el grafo

El grafo de código solo captura imports y calls directos. Estas conexiones **no aparecen** pero son críticas:

| Conexión | Archivo | Tipo |
|----------|---------|------|
| Gemini API | `services/ai.ts:6` | HTTP a `generativelanguage.googleapis.com` |
| WhatsApp WebSocket | `provider/index.ts:4` | WebSocket Baileys |
| n8n webhook | `services/outbox.ts` | HTTP POST a `N8N_WEBHOOK_URL` |
| Escritura a disco | `database/sqlite.ts` | Filesystem (`data/cee.db`) |
| Escritura JSON | `database/index.ts` | Filesystem (`data/conversations.json`) |

---

## 11. Código no usado y deuda

- **TypeScript:** 0 funciones muertas. Las 150 funciones del proyecto están vivas.
- **Skills markdown:** ~72 archivos en `.agents/` y `.claude/` no referenciados por ningún `.ts`. No son dead code (son herramientas de IA), pero revisar si todos se usan.
- **`opencode.json` ignorado en `.gitignore`** — el equipo no comparte la config de opencode. Si se quiere consistencia entre devs, considerar versionarlo.

---

## 12. Decisiones técnicas clave

| Decisión | Razón |
|----------|-------|
| BuilderBot en vez de LLM puro | 80% determinístico, 20% generativo. Más mantenible que un system prompt gigante. |
| SQLite (sql.js WASM) en vez de PostgreSQL | Cero dependencias nativas. Suficiente para <500 leads/día. |
| Clasificador por regex en vez de LLM | 0 tokens, instantáneo, determinista. Cubre 80% de casos. |
| Circuit breaker en Gemini | 3 fallos en 60s → circuito abierto 60s. Evita cuelgues por rate-limit. |
| Templates con 4-6 variantes sin repetición | Experiencia conversacional sin depender de IA. Pool rotativo por escenario. |
| Node 22 portable en start.bat | Node 24 rompe `whatsapp-rust-bridge`, Node 20 sin binarios `sql.js`. |

---

## 13. Cómo explorar la arquitectura (codebase-memory)

```bash
# Indexar (una vez)
codebase-memory index

# Ver arquitectura completa
codebase-memory get_architecture

# Trazar quién llama a qué
codebase-memory trace_path --function store.run --direction both --depth 3

# Buscar código no usado
codebase-memory search_graph --max_degree 0 --exclude_entry_points

# Encontrar hotspots
codebase-memory search_graph --min_degree 10 --relationship CALLS

# Funciones con riesgo de rendimiento
codebase-memory query_graph "MATCH (f:Function) WHERE f.transitive_loop_depth >= 2 OR f.linear_scan_in_loop >= 1 RETURN f.qualified_name, f.transitive_loop_depth, f.linear_scan_in_loop"
```

Consulta `AGENTS.md` para reglas de desarrollo y `docs/PROJECT.md` para documentación completa.
