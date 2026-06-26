# Documento de Arquitectura de Flujos — Chatbot CEE-FIIS-UNI v1.2.0

## Resumen para la IA revisora

Este documento describe cómo el chatbot de WhatsApp del CEE-FIIS-UNI procesa las conversaciones. Está construido sobre **BuilderBot 1.4.2**, un framework declarativo de flows. Cada flow es una máquina de estados con `addAction` encadenados. El LLM (Gemini 2.5 Flash) se invoca desde dentro de los flows para generar respuestas conversacionales. La clasificación de leads (pipeline de ventas) es 100% basada en reglas regex, sin dependencia del LLM.

---

## 1. Capa de transporte

**Archivo:** `src/provider/index.ts`
```
createProvider(BaileysProvider, { version: [2, 3000, 1035824857] })
```
Baileys reverse-engineerea el protocolo de WhatsApp Web sobre WebSocket. Mantiene una conexión persistente con los servidores de Meta. Entrega los mensajes al motor de BuilderBot.

---

## 2. Motor de flows

**Archivo:** `src/flows/index.ts`
```
createFlow([welcomeFlow, cancelFlow, programsFlow, faqFlow, handoffFlow, leadCaptureFlow])
```
6 flows encadenados en una lista plana. BuilderBot matchea el PRIMER flow cuyo keyword/disparador coincida. El orden importa.

### Inyección de extensiones

**Archivo:** `src/app.ts` línea 25
```
await createBot({ flow, provider, database }, { extensions: { ai, messageLog } })
```
Los servicios `ai` y `messageLog` se inyectan como `extensions`. Cada flow accede a ellos vía `extensions.ai` y `extensions.messageLog`. Esto permite testing (mock fácil) y desacopla los flows de imports directos.

---

## 3. Grafo completo de la conversación

```
                         ┌──────────────────────────────┐
                         │      WhatsApp: "hola"         │
                         └──────────────┬───────────────┘
                                        │ EVENTS.WELCOME
                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                     welcome.flow.ts (40 líneas)                    │
│                                                                    │
│  ┌─ addAction #1: saludo con Gemini                               │
│  │   • messageLog.incoming() — registra en dashboard              │
│  │   • shouldRespond() → false si modo HUMAN                     │
│  │   • ai.chat(phone, "hola", CONTEXTO_MENU)                     │
│  │   • flowDynamic → envía saludo + menú 1-2-3                   │
│  └─ addAction #2: capture:true, idle:120s                         │
│      • "1" → clearHistory → gotoFlow(programsFlow)               │
│      • "2" → clearHistory → gotoFlow(faqFlow)                    │
│      • "3" → clearHistory → gotoFlow(handoffFlow)                │
│      • "cancelar"/"salir" → endFlow                              │
│      • default → Gemini pide número válido → fallBack implícito  │
└──────────────────────────────────────────────────────────────────┘
          │                    │                    │
     "1"  ▼               "2"  ▼               "3"  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ programs.flow │  │   faq.flow   │  │ handoff.flow │
│   (59 líneas) │  │  (56 líneas) │  │  (34 líneas) │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │  "sí"           │  timeout        │  isOpen() = true
       │  después         │  15s            │
       │  de ver          │  → "1"          │
       │  programa        │                 │
       ▼                 ▼                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                   lead-capture.flow.ts (114 líneas)                │
│                                                                    │
│  4 pasos secuenciales de formulario:                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Paso 1: nombre  → ai.chat pide nombre → capture → validar  │ │
│  │         longitud >= 5 → state.update({ lead_name })         │ │
│  │         si inválido → fallBack con Gemini                    │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Paso 2: DNI     → ai.chat pide DNI → capture → validar     │ │
│  │         regex /^\d{8}$/ → state.update({ lead_dni })        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Paso 3: teléfono → ai.chat pide tel → capture → validar    │ │
│  │         limpieza \D → >= 9 dígitos → state.update           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Paso 4: email    → ai.chat pide email → capture → validar  │ │
│  │         regex email → state.update({ lead_email })          │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ CIERRE:                                                      │ │
│  │  1. leads.create() → INSERT en SQLite (atómicamente)        │ │
│  │  2. classify() → reglas regex → etapa pipeline              │ │
│  │     Ej: INTERESADO, EN_NEGOCIACION, PROPUESTA_ENVIADA...    │ │
│  │  3. leads.updateClassification() → guarda etapa en BD       │ │
│  │  4. outbox.enqueue() → cola para webhook n8n                │ │
│  │  5. ai.chat genera despedida                                │ │
│  │  6. endFlow() → conversación terminada                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

En cualquier momento:
┌──────────────────────┐
│  cancel.flow.ts       │  ← keywords "cancelar", "salir"
│  (10 líneas)          │     Gemini genera despedida
│  → endFlow()          │     Termina la conversación
└──────────────────────┘
```

---

## 4. Mecánica del LLM — `src/services/ai.ts`

### Lazy init
```typescript
function getClient(): OpenAI {
  if (!_client) { /* crea cliente una sola vez */ }
  return _client
}
```
No crashea al importar si no hay API key. Se crea en la primera llamada.

### Memoria por usuario (LRU Cache)
```
conversaciones = LRUCache { max: 500, ttl: 30min, updateAgeOnGet: true }
```
- Máximo 500 usuarios simultáneos en RAM
- TTL de 30 minutos de inactividad por usuario
- Si el usuario vuelve y la RAM está vacía, recupera historial de SQLite
- Persistencia dual: RAM (rápida) + SQLite (sobrevive reinicios)

### Rate limiting
```
3 segundos entre mensajes por teléfono
```
Segunda llamada en <3s retorna "espera un momento" sin gastar API.

### Sistema de prompt
```
SYSTEM_PROMPT fijo de ~800 tokens (personalidad CEE)
+ CONTEXTO ACTUAL (variable, inyectado por cada flow)
+ últimos 20 mensajes de historial
+ mensaje nuevo del usuario
→ Gemini 2.5 Flash → respuesta (max_tokens: 500)
```

### Cuándo se borra el historial
Cada vez que el usuario cambia de flow principal:
```typescript
extensions.ai?.clearHistory(ctx.from)
// welcome → programs: se borra
// welcome → faq: se borra
// welcome → handoff: se borra
// programs → lead-capture: se borra
```
EXCEPTO en FAQ, donde el historial SE ACUMULA (conversación de preguntas abiertas).

---

## 5. Clasificador de Pipeline — `src/services/classifier.ts`

### 100% basado en reglas regex. Cero llamadas a Gemini.

6 etapas, evaluadas en este orden (la primera que hace match gana):

| Orden | Etapa | Disparadores clave |
|---|---|---|
| 1 | MATRICULADO | "ya pagué", "aquí el comprobante", "transferí" |
| 2 | PROPUESTA_ENVIADA | "link de pago", "cuenta bancaria", "ficha inscripción" |
| 3 | EN_NEGOCIACION | "llamar", "agendar cita", "cuotas", "descuento" |
| 4 | NO_INTERESADO | "no me interesa", "muy caro", "bórrenme" |
| 5 | INTERESADO | "me interesa", "¿cuánto cuesta?", "horarios" |
| 6 | NEUTRO_O_DUDOSO | "hola", "ok", "gracias" → fallback |

### Fallback por contexto
Si ninguna regla matchea pero hay `conversationContext` (el usuario completó lead-capture):
```
→ INTERESADO (MEDIA)
```

### Se ejecuta UNA SOLA VEZ al final de lead-capture

---

## 6. Persistencia — `src/services/store.ts`

### SQLite vía sql.js (WASM, sin dependencias nativas)

| Tabla | Propósito |
|---|---|
| `leads` | Datos de contacto + `deal_stage` + `classification_json` |
| `dashboard_messages` | Historial de mensajes (user/assistant/human) por teléfono |
| `dashboard_meta` | Modo AI/HUMAN, nombre, última actividad |
| `ai_history` | Historial de conversación para Gemini (máx 20 por usuario) |
| `outbox` | Cola de eventos para enviar a n8n (con reintentos) |

### Auto-save
Cada `INSERT`/`UPDATE` dispara `saveDb()` inmediato. Además, un `setInterval` guarda cada 10 segundos.

---

## 7. Dashboard del operador — `public/dashboard.html` + `src/app.ts`

### Endpoints protegidos con token

| Endpoint | Método | Auth | Función |
|---|---|---|---|
| `/dashboard` | GET | No | Sirve el HTML |
| `/health` | GET | No | Monitoreo: `{"status":"ok"}` |
| `/api/dashboard/state` | GET | `?token=X` | Lista conversaciones y mensajes |
| `/api/dashboard/mode` | POST | `?token=X` | Cambia AI ↔ HUMAN |
| `/api/dashboard/send` | POST | `?token=X` | Operador envía mensaje manual |

### Flujo dashboard
1. Cada 3 segundos hace polling a `/api/dashboard/state`
2. Cuando el operador activa modo HUMAN → `messageLog.shouldRespond()` retorna `false`
3. Todos los flows chequean `shouldRespond()` al inicio y hacen `return` si es `false`
4. El operador envía respuestas manuales vía `/api/dashboard/send`

---

## 8. Outbox a n8n — `src/services/outbox.ts`

### Flujo
```
lead-capture termina → outbox.enqueue('lead.classified', payload)
                                 │
Worker cada 30s               ▼
                  SELECT * FROM outbox WHERE status='pending'
                                 │
                        POST a N8N_WEBHOOK_URL
                        ┌───────┴───────┐
                      200              error
                       │                │
                  markSent()       markFailed()
                                       │
                              attempts++ → si >= 5 → 'failed'
```

### Payload que recibe n8n
```json
{
  "event": "lead.classified",
  "timestamp": "2026-06-25T16:30:00Z",
  "lead": {
    "id": "uuid", "name": "María López", "dni": "12345678",
    "phone": "51987654321", "email": "maria@ej.com",
    "programInterest": "Diplomado en Ciencia de Datos"
  },
  "classification": {
    "etapa_asignada": "INTERESADO",
    "confianza_analisis": "ALTA",
    "justificacion_corta": "..."
  }
}
```

---

## 9. Puntos de revisión para la IA externa

### Preguntas que deberías hacerle a este código:

1. **¿Demasiadas llamadas al LLM?** El lead-capture hace ~8 llamadas a Gemini (una por paso + reintentos). ¿Se puede reducir agrupando prompts?

2. **¿El orden de los flows es correcto?** `cancelFlow` usa keywords "cancelar/salir". ¿Está antes o después de los flows que capturan números? Si "cancelar" se evalúa después de un flow que captura, el usuario queda atrapado.

3. **¿Manejo de errores?** Si `ai.chat()` falla, se usa `?.` optional chaining que devuelve `undefined` y el fallback hardcodeado. Pero si `flowDynamic()` o `state.update()` fallan, NO hay try/catch → crashea el proceso.

4. **¿Duplicación de mensajes?** WhatsApp a veces reenvía. No hay deduplicación por `message.id`. El mismo mensaje procesado 2 veces = 2 respuestas.

5. **¿Timeout en welcome?** `idle: 120000` (2 minutos). Si el usuario no responde, ¿el flow expira limpiamente o se queda zombie?

6. **¿SQLite vs Supabase?** sql.js guarda toda la BD en RAM y la persiste a disco. Con 1000+ leads, la exportación completa cada 10 segundos puede degradar. ¿Migrar a Supabase ya?

7. **¿Multi-LLM failover?** Solo usa Gemini. Si Gemini cae, todo el bot deja de responder. El skill `chatbot-architect` recomienda router con Groq + Gemini + Cerebras.

8. **¿Senderos no felices?** ¿Qué pasa si el usuario escribe "1" en medio del lead-capture? El flow welcome.flow capturó "1" antes. ¿Hay conflicto de keywords entre flows?

9. **¿La clasificación es correcta?** El orden de reglas: MATRICULADO gana sobre PROPUESTA_ENVIADA. Si alguien dice "ya pagué, pásame el link del comprobante" → MATRICULADO. ¿Es correcto o debería ser PROPUESTA_ENVIADA?

10. **¿Seguridad?** El dashboard tiene auth por token. Pero las APIs no tienen rate limiting. Un atacante que adivine el token puede leer todas las conversaciones.








