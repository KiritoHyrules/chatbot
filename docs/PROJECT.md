# Chatbot CEE-FIIS-UNI — Documentación para Desarrolladores

## 1. Propósito

Chatbot conversacional para WhatsApp del **Centro de Especialización Ejecutiva (CEE)** de la Facultad de Ingeniería Industrial y de Sistemas (FIIS) de la Universidad Nacional de Ingeniería (UNI), Lima, Perú.

El bot atiende automáticamente consultas de prospectos 24/7: presenta 5 programas académicos, resuelve preguntas frecuentes, captura datos de contacto (leads), clasifica la etapa del lead en un pipeline de ventas, y deriva a un asesor humano cuando es necesario.

**Objetivo:** Convertir conversaciones de WhatsApp en leads calificados, reduciendo el tiempo de respuesta de horas a segundos.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Propósito |
|---|---|---|
| Motor conversacional | BuilderBot 1.4.2 | Framework declarativo de flows (máquinas de estado) |
| Canal WhatsApp | Baileys 7.0.0 (WebSocket) | Conexión reverse-engineered al protocolo de WhatsApp |
| Lenguaje | TypeScript 5.4+ | Estricto (strict: true) |
| Runtime | Node.js 22.18.0 | Auto-descargado por start.bat |
| LLM | Gemini 2.5 Flash | Generación de respuestas vía API OpenAI-compatible |
| BD | SQLite (sql.js WASM) | Sin compilación nativa, funciona en cualquier Node |
| Testing | Vitest 4.x | 201 tests (unitarios, integración, E2E) |
| Dashboard | HTML vanilla + polling | Panel de operador humano |

### Dependencias principales

```
@builderbot/bot              1.4.2   Motor de flows
@builderbot/provider-baileys 1.4.2   Conexión WhatsApp
openai                        4.73    SDK para Gemini
sql.js                        1.14    SQLite WASM (sin compilación nativa)
lru-cache                     11.5    Cache LRU para historial IA
fuse.js                       7.4     Búsqueda fuzzy (tolerancia a typos)
```

---

## 3. Arquitectura

### 3.1 Estructura de archivos

```
Chatbot/
├── start.bat / start.sh       Auto-arranque (descarga Node, instala, inicia)
├── package.json               Dependencias y scripts
├── .env.local                 GEMINI_API_KEY, DASHBOARD_SECRET (NO en git)
├── .env.example               Template para .env.local
│
├── public/
│   ├── dashboard.html         Panel del operador
│   └── brochures/             PDFs de programas
│
├── data/                      NO en git (generado en runtime)
│   ├── cee.db                 SQLite (leads, dashboard, IA, outbox)
│   └── conversations.json     BuilderBot JsonFileDB (estado interno)
│
├── bot_sessions/              NO en git (credenciales WhatsApp)
│
└── src/
    ├── app.ts                 Entry point: createBot + extensions + rutas HTTP
    ├── utils.ts               rnd() delay aleatorio 500-1300ms
    │
    ├── provider/index.ts      BaileysProvider (versión hardcodeada)
    │
    ├── database/
    │   ├── index.ts           BuilderBot JsonFileDB
    │   └── sqlite.ts          SQLite via sql.js (initDb, getDb, saveDb, closeDb)
    │
    ├── data/
    │   ├── programs.ts        5 programas CEE
    │   └── knowledge.ts       Base de conocimiento + findAnswer()
    │
    ├── flows/                 7 flows BuilderBot
    │   ├── index.ts           createFlow([cancel, welcome, programs, faq, handoff, leadCapture])
    │   ├── welcome.flow.ts    Catch-all: menú 1-2-3 + intentRouter
    │   ├── cancel.flow.ts     "cancelar"/"salir"
    │   ├── programs.flow.ts   Lista, describe, brochure, captura lead
    │   ├── faq.flow.ts        Pipeline: mod -> KB -> keyword -> Gemini
    │   ├── handoff.flow.ts    Horario + derivación a asesor
    │   └── lead-capture.flow.ts Formulario 4 pasos -> SQLite -> outbox
    │
    ├── services/              20 servicios inyectados via extensions
    │   ├── ai.ts              Gemini: circuit breaker, retry backoff, LRU cache
    │   ├── classifier.ts      6 etapas pipeline (regex, 0 llamadas API)
    │   ├── intent-router.ts   7 niveles de intención
    │   ├── number-extractor.ts Extrae números de frases
    │   ├── conversation-context.ts Memoria por usuario
    │   ├── lead-scorer.ts     Scoring 0-100
    │   ├── objection-detector.ts 6 tipos objeciones
    │   ├── urgency-detector.ts 5 niveles urgencia
    │   ├── tag-engine.ts      8 tags automáticos
    │   ├── decision-engine.ts 11 reglas decisión
    │   ├── response-templates.ts 50+ escenarios, 4-6 variantes c/u
    │   ├── moderation.ts      70+ palabras bloqueadas + frustración
    │   ├── office-hours.ts    Lima UTC-5: Lun-Vie 9-18, Sáb 9-13
    │   ├── pipeline.ts        classifyAndSend -> outbox -> n8n
    │   ├── outbox.ts          Worker cada 30s -> N8N_WEBHOOK_URL
    │   ├── message-log.ts     Bridge hacia dashboard
    │   ├── store.ts           CRUD: leads, dashboard, aiStore, outbox
    │   └── metrics.ts         Calidad: % Gemini vs template
    │
    ├── middleware/
    │   ├── auth.ts            Token guard (query ?token=X o header Bearer)
    │   └── health.ts          GET /health
    │
    └── __tests__/             201 tests en 20 archivos
        ├── unit/              classifier, scorer, objection, etc.
        ├── integration/       store, ai-service, message-log
        └── e2e/               flows completos
```

### 3.2 Grafo de conversación

```
Usuario escribe cualquier cosa
        |
        v
  EVENTS.WELCOME
        |
        v
  welcome.flow.ts
  (intentRouter: EXPLORAR/PREGUNTAR/CONTACTAR/HOSTIL)
        |
  1/programas  2/dudas  3/asesor
        |         |         |
        v         v         v
  programs   faq      handoff
        |         |         |
    sí/contactar  sí/derivar  sí/registrar
        |         |         |
        +----+----+---------+
             |
             v
      lead-capture.flow.ts
      (nombre -> DNI -> tel -> email)
             |
             v
      Guarda en SQLite + classifica + outbox -> n8n
```

---

## 4. Instalación y Configuración

### 4.1 Requisitos

**Cero.** El bot se auto-instala. No necesitás Node.js ni npm.

### 4.2 Arranque

**Windows:** Doble clic en `start.bat`

**Linux/Mac:** `chmod +x start.sh && ./start.sh`

El script:
1. Descarga Node 22.18.0 portable si no existe
2. Instala dependencias (`npm install`)
3. Inicia el bot
4. Muestra QR en la terminal

### 4.3 Vincular WhatsApp

1. Escaneá el QR con WhatsApp (Dispositivos vinculados -> Vincular dispositivo)
2. Verás `Connected Provider` cuando esté listo
3. Escribí "hola" desde otro WhatsApp

### 4.4 Variables de entorno (.env.local)

```env
GEMINI_API_KEY=tu-key-de-aistudio.google.com/apikey
DASHBOARD_SECRET=cee-uni-2026
PORT=3008
```

El bot funciona SIN Gemini. Usa templates + knowledge base para el 90% de casos.

---

## 5. Comandos

```bash
npm run dev          # Desarrollo (requiere Node >=22)
npm run typecheck    # TypeScript check (tsc --noEmit)
npm test             # 201 tests (vitest run)
npm run test:watch   # Tests en modo watch
npm run test:coverage # Con reporte de cobertura
```

---

## 6. Flujos principales

### 6.1 Bienvenida

Cualquier mensaje activa `welcome.flow.ts` (EVENTS.WELCOME). El `intentRouter` analiza la intención:

- **EXPLORAR** ("ver programas", "qué cursos hay") -> programs
- **PREGUNTAR** ("tengo una duda", "consulta") -> faq
- **CONTACTAR** ("asesor", "hablar con alguien") -> handoff
- **HOSTIL** (insultos) -> moderación -> 3 strikes -> handoff

### 6.2 Programas

Muestra los 5 programas. El usuario puede:
- Escribir "1", "2"..."5" (números directos)
- Escribir frases como "estoy interesado en la 5" o "dame info de la 3" (extractNumber)
- Pedir más info sobre "ese curso" o "el programa" (conversation-context)

### 6.3 FAQ

Pipeline de 4 capas:

1. **Moderación** - filtra insultos/lenguaje inapropiado
2. **Knowledge Base** - busca en datos pre-escritos de programas (duración, requisitos, salida laboral)
3. **Keyword Match** - 35 keywords mapeadas a programas
4. **Gemini** - solo como último recurso si nada matchea

### 6.4 Lead Capture

Formulario secuencial de 4 pasos con validación:
- Nombre completo (min 5 caracteres)
- DNI (8 dígitos, regex)
- Teléfono (min 9 dígitos)
- Email (regex)

Al completar, se ejecuta:
1. `leads.upsert()` -> SQLite
2. `classifier.classify()` -> etapa pipeline
3. `leadScorer.score()` -> puntaje 0-100
4. `tagEngine.tag()` -> etiquetas
5. `outbox.enqueue('lead.classified', {...})` -> cola para n8n

### 6.5 Cancelación

"cancelar" o "salir" en cualquier momento termina el flow.

---

## 7. Pipeline de Clasificación de Leads

6 etapas, evaluadas en orden (regex, 0 llamadas API):

| Orden | Etapa | Triggers |
|---|---|---|
| 1 | MATRICULADO | "ya pagué", comprobante, voucher |
| 2 | PROPUESTA_ENVIADA | "link de pago", "cuenta bancaria" |
| 3 | EN_NEGOCIACION | "llamar", "agendar cita", "cuotas" |
| 4 | NO_INTERESADO | "no me interesa", "muy caro" |
| 5 | INTERESADO | "me interesa", "cuánto cuesta" |
| 6 | NEUTRO_O_DUDOSO | "hola", saludos, sin intención |

---

## 8. Dashboard del Operador

**URL:** `http://localhost:3008/dashboard?token=cee-uni-2026`

**Endpoints:**
- `GET /api/dashboard/state` - lista conversaciones activas
- `POST /api/dashboard/mode` - cambia AI/HUMAN por usuario
- `POST /api/dashboard/send` - envía mensaje manual como operador

**Modo HUMAN:** el bot deja de responder automáticamente y el operador toma el control.

---

## 9. Integración con n8n

Cuando un lead completa el formulario, el `outbox` envía:

```json
{
  "event": "lead.classified",
  "lead": { "id": "...", "name": "...", "dni": "...", "programInterest": "..." },
  "classification": { "etapa_asignada": "INTERESADO", "confianza_analisis": "ALTA" },
  "tags": ["potencial", "alumno_uni"]
}
```

Configurar en `.env.local`: `N8N_WEBHOOK_URL=https://tu-n8n.onrender.com/webhook/lead`

---

## 10. Base de Datos (SQLite)

6 tablas creadas automáticamente al iniciar:

| Tabla | Propósito |
|---|---|
| leads | Datos de contacto + etapa pipeline + clasificación |
| dashboard_messages | Historial de mensajes por conversación |
| dashboard_meta | Modo AI/HUMAN, nombre, última actividad |
| ai_history | Historial de conversación para Gemini (max 20) |
| outbox | Cola de eventos para n8n (con reintentos) |
| conv_state | Estado de conversación (contexto, hostilidad, loops) |

---

## 11. Decisiones Técnicas Importantes

### ¿Por qué BuilderBot y no un LLM puro?

Los flows declarativos son más mantenibles y predecibles que un system prompt gigante. El 80% de la conversación es determinística (menú, captura, handoff). Solo el 20% necesita IA generativa.

### ¿Por qué SQLite (sql.js) y no PostgreSQL/Supabase?

sql.js es SQLite compilado a WebAssembly. Cero dependencias nativas. Funciona en cualquier Node sin compilar. El auto-save cada 10s es suficiente para <500 leads diarios. La migración a Supabase está planeada para cuando el volumen lo justifique.

### ¿Por qué clasificador por regex y no con LLM?

Un LLM gasta ~100 tokens por clasificación. Con 100 leads/día son 10,000 tokens. Los regex cubren el 80% de casos con 0 costo. Es instantáneo y determinista.

### ¿Por qué circuit breaker en Gemini?

3 fallos en 60s abren el circuito por 60s. Evita que el bot se cuelgue esperando respuestas cuando Gemini está rate-limited (429).

### ¿Por qué templates con variantes aleatorias?

Cuando Gemini falla, los templates dan una experiencia conversacional sin depender de IA. 50+ escenarios con 4-6 variantes cada uno, elegidas sin repetición consecutiva.

### ¿Por qué Node 22 portable en start.bat?

Node 24 rompe `whatsapp-rust-bridge`. Node 20 no tiene binarios precompilados de sql.js. Node 22 es el sweet spot. El script descarga la versión exacta sin requerir instalación previa.

---

## 12. Guía para Nuevos Desarrolladores

### Antes de tocar código

1. Leé `AGENTS.md` - reglas de BuilderBot
2. Leé `DEVELOPER_A.md` y `DEVELOPER_B.md` - división de trabajo
3. Ejecutá `npm test` - deben pasar 201 tests
4. Ejecutá `npm run typecheck` - debe salir limpio

### Si vas a crear un servicio nuevo

- Creá el archivo en `src/services/`
- Exportá con `export const nombreServicio = { ... }`
- Inyectalo en `src/app.ts` dentro del objeto `extensions`
- Usalo en los flows como `extensions.nombreServicio`
- Creá tests en `src/__tests__/unit/`

### Si vas a modificar un flow

- NUNCA uses `buttons` (menús con `capture: true`)
- `gotoFlow`, `endFlow`, `fallBack` siempre con `return`
- `flowDynamic`, `state.update` siempre con `await`
- No uses `require()` (ESM puro)
- Imports con extensión `.js`

### Antes de hacer push

```bash
npm run typecheck    # 0 errores
npm test             # 201/201 passing
git status           # solo tus archivos modificados
```
