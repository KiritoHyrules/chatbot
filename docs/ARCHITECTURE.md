# Arquitectura — Chatbot CEE-FIIS-UNI

**Stack:** BuilderBot 1.4.2 + Baileys (WhatsApp) + Gemini 2.5 Flash + SQLite (sql.js)  
**Grafo de código:** 12,153 nodos · 12,750 aristas · 12 clusters

---

## Clusters funcionales (Leiden community detection)

| # | Cohesion | Responsabilidad | Funciones clave |
|---|----------|-----------------|-----------------|
| 5 | 0.60 | Store + migraciones | `run`, `getDb`, `saveDb`, `migrate001` |
| 3 | 0.71 | Contexto + rate limiting | `get`, `set`, `waitForBurst`, `checkRateLimit` |
| 12 | 0.55 | Clasificación + búsqueda | `classify`, `findAnswerStatic`, `normalizeQuery` |
| 9 | 0.52 | LLM + Outbox | `chat`, `startOutboxWorker`, CRUD leads |
| 2 | 0.43 | Leads + presencia humana | `normalizeLeadId`, `human`, `setName` |
| 4 | 0.45 | HTTP / Dashboard | `main`, `authGuard`, `healthCheck` |
| 8 | 0.70 | Resiliencia LLM | `callWithRetry`, `track`, `recordFailure/Success` |
| 7 | 1.00 | Horario oficina (Lima UTC-5) | `isOpen`, `outsideHoursMessage`, `nextOpenTime` |
| 0 | 0.80 | Operador humano | `humanReply`, `rnd`, `replyOrFallback` |

---

## Top 10 hotspots (mayor fan-in)

Si modificás una de estas funciones, revisá todos sus callers:

1. `src/services/store.run` — **29 callers**
2. `src/services/conversation-context.get` — **19**
3. `src/services/lead-id.normalizeLeadId` — **16**
4. `src/services/conversation-context.set` — **13**
5. `src/database/sqlite.getDb` — **13**
6. `src/database/sqlite.saveDb` — **9**
7. `src/services/message-aggregator.waitForBurst` — **7**
8. `src/services/message-log.shouldRespond` — **7**
9. `src/services/message-log.incoming` — **7**
10. `src/utils.rnd` — **7**

---

## Pipeline de procesamiento de mensajes

Cada mensaje entrante atraviesa esta cadena antes de llegar a un flow:

```
normalizer → classifier → conversation-context → moderation
→ objection-detector → urgency-detector → decision-engine
→ intent-router → flow (welcome/cancel/programs/faq/handoff/lead-capture/media)
→ message-aggregator (burst control)
```

---

## Sistema de flows

7 flows registrados en `src/flows/index.ts`. **El orden importa** — el último flow cuyo keyword hace match gana:

```
createFlow([cancel, welcome, programs, faq, handoff, leadCapture, media])
```

| Flow | Archivo | Propósito |
|------|---------|-----------|
| cancel | `cancel.flow.ts` | "cancelar"/"salir" en cualquier momento |
| welcome | `welcome.flow.ts` | Catch-all, menú 1-2-3, intentRouter |
| programs | `programs.flow.ts` | Lista programas → brochure → lead capture |
| faq | `faq.flow.ts` | FAQ con timeout 15s, 4 capas (mod→KB→keyword→Gemini) |
| handoff | `handoff.flow.ts` | Derivación a operador humano |
| leadCapture | `lead-capture.flow.ts` | Formulario 4 pasos (nombre, DNI, tel, email) |
| media | `media.flow.ts` | Manejo de archivos multimedia |

---

## Base de datos (dual)

- `data/conversations.json` — **JsonFileDB** (BuilderBot: estado de flows, blacklist)
- `data/cee.db` — **SQLite** (6 tablas: leads, dashboard_messages, dashboard_meta, ai_history, outbox, conv_state)

---

## Tráfico entre capas

| Origen → Destino | Llamadas |
|-------------------|----------|
| `app` → `services` | 17 |
| `services` → `database` | 11 |
| `database` → `services` | 6 |
| `__tests__` → `services` | 5 |
| `data` → `services` | 4 |

---

## Cómo explorar la arquitectura

El proyecto está indexado con **codebase-memory**. Cualquier miembro del equipo puede:

```bash
# Indexar el proyecto (una sola vez)
codebase-memory index

# Ver la arquitectura completa
codebase-memory get_architecture

# Trazar quién llama a qué
codebase-memory trace_path --function store.run --direction both

# Buscar código muerto
codebase-memory search_graph --max_degree 0 --exclude_entry_points

# Encontrar hotspots
codebase-memory search_graph --min_degree 10 --relationship CALLS
```

Consulta `AGENTS.md` para las reglas de desarrollo y comandos del proyecto.
