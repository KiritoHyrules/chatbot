# 🟢 Developer B — CREAR 6 SERVICIOS DE INTELIGENCIA DE LEADS

## 🚨 ANTES DE EMPEZAR — HACÉ ESTO PRIMERO 🚨

Abrí una terminal y ejecutá:

```bash
git clone https://github.com/KiritoHyrules/chatbot.git
cd chatbot
copy .env.example .env.local
```

Editá `.env.local` con esto (usá TU propia API key de Gemini):

```
GEMINI_API_KEY=TU-API-KEY-DE-https://aistudio.google.com/apikey
DASHBOARD_SECRET=cee-uni-2026
PORT=3008
```

Después:

```bash
npm install --legacy-peer-deps
npx tsc --noEmit        # DEBE salir sin errores
npx vitest run           # DEBEN pasar 139 tests
```

Si cualquiera de los dos comandos falla, **no sigas**. Avisame.

---

## ⚠️ REGLAS DE ORO — LEELAS TODAS ⚠️

| # | REGLA | SI LA ROMPÉS, PASA ESTO |
|---|---|---|
| 1 | **SOLO CREÁ ARCHIVOS NUEVOS** en `src/services/` y `src/__tests__/unit/` | Si modificás un archivo existente, rompés el proyecto y los tests fallan |
| 2 | **NO instalés nuevas dependencias** (`npm install X`) | El proyecto ya tiene todo. Dependencias nuevas rompen el build |
| 3 | **Cada servicio es un archivo. No se importan entre sí** | Si `lead-scorer.ts` importa de `decision-engine.ts`, creás un enredo |
| 4 | **NO uses `@builderbot/bot` en tus servicios** | Tus servicios son funciones puras. No necesitan BuilderBot |
| 5 | **NO uses `require()`. Solo `import X from './x.js'`** | El proyecto es ESM. `require()` crashea |
| 6 | **Los imports llevan `.js` al final** | `import { rnd } from '../utils.js'` — correcto. `from '../utils'` — ERROR |
| 7 | **Siempre exportá con `export const nombreServicio = { ... }`** | Para que Developer A pueda usarlos como `extensions.nombreServicio` |
| 8 | **Antes de hacer push: `npx tsc --noEmit` Y `npx vitest run`** | Si cualquiera falla, NO hagas push. Arreglalo |
| 9 | **No uses `any` sin comentario** | TypeScript estricto |
| 10 | **NO borres archivos existentes** | Obvio, pero por las dudas |

---

## 📁 ARCHIVOS QUE YA EXISTEN (leelos para entender el proyecto, NO los toques)

```
src/utils.ts              → export const rnd = () => Math.floor(Math.random() * 800) + 500
src/data/programs.ts      → 5 programas (Diplomados, PEE, Curso). Cada uno tiene id, name, type, description
src/services/classifier.ts → classify(mensaje, contexto?) → { etapa_asignada, confianza_analisis, justificacion_corta }
src/services/store.ts      → leads.create/update/getAll, outbox.enqueue, dashboard, aiStore
src/database/sqlite.ts     → initDb(), getDb(), saveDb(), closeDb(). Usa sql.js (WASM, sin compilación)
src/services/ai.ts         → ai.chat(phone, message, context?) llama a Gemini. ai.clearHistory(phone)
src/services/office-hours.ts → isOpen(), outsideHoursMessage(), nextOpenTime()
src/services/message-log.ts  → messageLog.incoming/outgoing/human/shouldRespond
src/services/pipeline.ts     → pipeline.classifyAndSend(phone, message, context)
src/services/outbox.ts       → startOutboxWorker(), stopOutboxWorker()
```

---

## ✅ LO QUE VOS TENÉS QUE CREAR — 6 ARCHIVOS DE SERVICIO

### 📄 ARCHIVO 1: `src/services/lead-scorer.ts`

**Qué hace:** Lee un mensaje y devuelve un puntaje de 0 a 100 según qué acciones detecta.

**Interfaz exacta:**
```typescript
export const leadScorer = {
  score(message: string): {
    score: number          // -100 a 100. Negativo = rechazo, positivo = interés
    actions: string[]      // lista de acciones detectadas: ['pregunta_precio', 'comparte_dni', ...]
    priority: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'  // según el score
  }
}
```

**Reglas de puntaje (mínimo estas):**
```
"pide link de pago"                    → +30
"compartió DNI"                        → +25
"confirmó pago / adjuntó comprobante"   → +35
"pregunta precio / costo"              → +10
"pide información de programa"          → +15
"quiere ser contactado"                → +20
"pide llamada / agendar cita"          → +25
"menciona urgencia (hoy, ya, rápido)"  → +15
"pregunta por cuotas / descuento"      → +10
"es alumno UNI"                         → +10
"rechaza explícitamente"               → -50
"dice que es muy caro"                 → -20
"dice que no le interesa"              → -40
"mensaje genérico / no claro"          → 0
```

---

### 📄 ARCHIVO 2: `src/services/objection-detector.ts`

**Qué hace:** Detecta si el usuario está poniendo una objeción y devuelve el tipo + un contramensaje.

**Interfaz exacta:**
```typescript
export const objectionDetector = {
  detect(message: string): {
    type: string           // 'precio' | 'tiempo' | 'confianza' | 'competencia' | 'calidad' | 'compromiso'
    confidence: 'ALTA' | 'MEDIA'
    counter: string        // mensaje para responder a esa objeción
  } | null                 // null si no hay objeción
}
```

**Los 6 tipos y sus triggers (usá regex):**
```
precio:      "muy caro", "no me alcanza", "costoso", "excede mi presupuesto"
tiempo:      "no tengo tiempo", "horarios", "muy lejos", "no puedo ese día"
confianza:   "es confiable?", "estafa", "no conozco", "quién los respalda"
competencia: "en X lugar es más barato", "ya estoy en otro", "me recomendaron Y"
calidad:     "vale la pena?", "es bueno?", "tienen experiencia?"
compromiso:  "lo voy a pensar", "después te confirmo", "déjame consultar"
```

---

### 📄 ARCHIVO 3: `src/services/urgency-detector.ts`

**Qué hace:** Detecta el nivel de urgencia del lead.

**Interfaz exacta:**
```typescript
export const urgencyDetector = {
  assess(message: string): 'INMEDIATA' | 'ALTA' | 'MEDIA' | 'BAJA' | 'NINGUNA'
}
```

**Triggers:**
```
INMEDIATA: "urgente", "hoy", "ya", "rápido", "ahora mismo", "lo antes posible", "cuánto antes"
ALTA:      "esta semana", "pronto", "en estos días", "no quiero esperar"
MEDIA:     "este mes", "próximamente", "me interesa empezar"
BAJA:      "a futuro", "más adelante", "para el próximo ciclo"
NINGUNA:   no hay indicio de urgencia
```

---

### 📄 ARCHIVO 4: `src/services/tag-engine.ts`

**Qué hace:** Asigna etiquetas automáticas al lead según lo que dice.

**Interfaz exacta:**
```typescript
export const tagEngine = {
  tag(message: string): string[]
  // Tags posibles: 'potencial', 'beca', 'empresarial', 'urgente', 
  //                'indeciso', 'referido', 'corporativo', 'alumno_uni'
}
```

**Reglas de tags:**
```
"potencial":    menciona "quiero inscribirme", "estoy listo", "proceder", "empecemos"
"beca":         menciona "beca", "media beca", "financiamiento", "apoyo económico"
"empresarial":  menciona "empresa", "corporativo", "in-house", "para mi equipo"
"urgente":      menciona "urgente", "hoy", "ya", "rápido", "ahora"
"indeciso":     menciona "no sé", "lo voy a pensar", "déjame ver", "quizás"
"referido":     menciona "me recomendaron", "me hablaron de", "un amigo me dijo"
"corporativo":  menciona "gerente", "director", "CEO", "jefe", "mi empresa", "RRHH"
"alumno_uni":   menciona "UNI", "universidad", "alumno", "estudiante", "tesis", "egresado"
```

---

### 📄 ARCHIVO 5: `src/services/response-templates.ts`

**Qué hace:** Devuelve un mensaje pre-armado para cada escenario, eligiendo aleatoriamente entre 3-5 variantes.

**Interfaz exacta:**
```typescript
import { rnd } from '../utils.js'

export const templates = {
  get(scenario: string, vars?: Record<string, string>): string
  // vars es opcional. Si se pasa, reemplaza {{nombre}}, {{programa}}, etc. en el template
}
```

**Escenarios que DEBE cubrir (mínimo 3 variantes cada uno):**

```
'welcome'                → saludo inicial + menú 1-2-3
'program_recommendation' → "Para tu perfil, te recomiendo: {{programa}}"
'ask_name'               → "¿Cuál es tu nombre completo?"
'ask_dni'                → "Tu DNI (8 dígitos)"
'ask_phone'              → "Tu número de teléfono"
'ask_email'              → "Tu correo electrónico"
'objection_price'        → responder a objeción de precio
'objection_time'         → responder a objeción de tiempo
'objection_confidence'   → responder a desconfianza
'objection_competencia'  → responder a comparación con competencia
'objection_calidad'      → responder a duda de calidad
'objection_compromiso'   → responder a indecisión
'goodbye'                → despedida
'handoff_urgent'         → derivar a asesor (urgente)
'handoff_normal'         → derivar a asesor (normal)
'confirm_data'           → confirmar datos registrados
'ask_more'               → preguntar si necesita algo más
'program_list'           → mostrar lista de programas
'program_detail'         → mostrar detalle de un programa específico
'faq_intro'              → introducción al FAQ
'out_of_hours'           → mensaje fuera de horario
'no_results'             → "No encontré info sobre eso"
'fallback'               → mensaje genérico de error
```

---

### 📄 ARCHIVO 6: `src/services/decision-engine.ts`

**Qué hace:** Decide qué acción tomar basado en el estado del lead.

**Interfaz exacta:**
```typescript
export type Decision = {
  type: 'welcome' | 'present_programs' | 'describe_program' | 'resolve_objection'
       | 'ask_name' | 'ask_dni' | 'ask_phone' | 'ask_email' | 'register_done'
       | 'handoff' | 'goodbye' | 'ask_more' | 'handoff_urgent'
  reason: string     // explicación legible de por qué esta decisión
  templateVars?: Record<string, string>  // variables para el template (opcional)
}

export const decision = {
  decide(lead: {
    phone: string
    name?: string
    dni?: string
    email?: string
    programInterest?: string
    score?: number
    priority?: string
    dealStage?: string
    objections?: string
    urgency?: string
    tags?: string
    contactCount?: number
  }, message: string, hasObjection: boolean): Decision
}
```

**Las reglas en ORDEN (la primera que aplica, gana):**

```
Regla 1:  SI hasObjection = true                     → resolve_objection
Regla 2:  SI dealStage = 'NO_INTERESADO'              → goodbye
Regla 3:  SI dealStage IN ('PROPUESTA_ENVIADA', 'MATRICULADO') → handoff
Regla 4:  SI dealStage = 'EN_NEGOCIACION' y score >= 50 → handoff
Regla 5:  SI dealStage = 'INTERESADO' y programInterest definido → describe_program
Regla 6:  SI dealStage = 'INTERESADO' y programInterest NO definido → present_programs
Regla 7:  SI score >= 25 y NO tiene name              → ask_name
Regla 8:  SI score >= 40 y NO tiene dni               → ask_dni
Regla 9:  SI score >= 50 y NO tiene email             → ask_email
Regla 10: SI urgencia IN ('INMEDIATA', 'ALTA')         → handoff_urgent
Regla 11: DEFAULT                                      → ask_more
```

---

## 🧪 ARCHIVOS DE TEST QUE TENÉS QUE CREAR

Cada test debe estar en `src/__tests__/unit/`. Usá `vitest`. Ejemplo:

```typescript
import { describe, it, expect } from 'vitest'
import { nombreServicio } from '../../services/nombre-servicio.js'

describe('nombreServicio', () => {
  it('descripción del caso', () => {
    const result = nombreServicio.metodo('mensaje de prueba')
    expect(result.algo).toBe('esperado')
  })
})
```

### Tests mínimos requeridos:

| Archivo | Mínimo casos | Ejemplos de casos |
|---|---|---|
| `unit/lead-scorer.test.ts` | 12 | "cuánto cuesta"=+10, "link de pago"=+25, "no gracias"=-50, "ya pagué"=+35, "hola"=0 |
| `unit/objection-detector.test.ts` | 8 | Un caso por tipo + "sin objeción"=null + caso borde |
| `unit/urgency-detector.test.ts` | 7 | Un caso por nivel + "sin urgencia" + caso borde |
| `unit/tag-engine.test.ts` | 10 | Un caso por tag + múltiples tags + sin tags |
| `unit/decision-engine.test.ts` | 12 | Cada regla + caso borde + default |

---

## ✅ VERIFICACIÓN FINAL — HACÉ ESTO ANTES DE PUSH

```bash
# 1. Typecheck
npx tsc --noEmit
# Debe salir SIN ERRORES. Si hay errores, arreglalos.

# 2. Tests
npx vitest run
# Deben pasar TODOS (los 139 existentes + los nuevos que creaste).
# Si algún test existente falla, ROMPISTE ALGO. Revisá.

# 3. Ver qué archivos tocaste
git status
# Solo deben aparecer archivos NUEVOS en src/services/ y src/__tests__/unit/
# Si aparece CUALQUIER archivo existente modificado, algo hiciste mal.

# 4. Si todo está bien:
git add .
git commit -m "feat: 6 servicios de inteligencia de leads (scorer, objection, urgency, tags, templates, decision)"
git push
```

---

## 🆘 SI ALGO FALLA

- ¿`npx tsc --noEmit` falla? → Error de tipos. Revisá los tipos.
- ¿Un test existente falla? → Tocaste algo que no debías. `git diff` para ver qué.
- ¿`npm test` falla en tus tests? → Tu lógica está mal. Revisá el test.
- ¿No sabés qué hacer? → **No hagas push.** Avisame.

---

## 📦 ESO ES TODO

6 archivos de servicio + 5 archivos de test = 11 archivos nuevos.
Cero modificaciones a lo existente.
Cero dependencias nuevas.
