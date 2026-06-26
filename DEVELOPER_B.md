# Developer B — v3.0 Anti-Rigidez

## Estado actual del proyecto

```
192 tests | 19 test files | Node 22 | SQLite (sql.js WASM)
6 flows | Gemini con circuit breaker | 6 servicios de inteligencia
```

Tus servicios (`lead-scorer`, `objection-detector`, `urgency-detector`, `tag-engine`, `response-templates`, `decision-engine`) ya están integrados en los flows vía `extensions`.

---

## Tu misión: hacer que el bot hable como un humano

El problema actual: cuando Gemini falla (pasa seguido, 429), el bot responde con texto genérico y rígido. "Responde 1, 2 o 3". "No encontré información". El usuario se va.

Tu trabajo es darle **voz propia** al bot con templates ricos que no dependan de Gemini.

### Lo que tenés que lograr

**1. Templates con personalidad del CEE**

El archivo `src/services/response-templates.ts` ya tiene 23 escenarios base. Necesita crecer. Cada escenario debe tener múltiples variantes para que el bot nunca repita exactamente lo mismo.

Pensá en escenarios como:
- Describir cada uno de los 5 programas con detalle real
- Explicar por qué elegir cada programa
- Responder objeciones con datos, no frases genéricas
- Comparar dos programas cuando el usuario duda
- Convencer sin ser insistente

**2. Métricas para saber si mejora**

Creá `src/services/metrics.ts`. Necesitamos saber qué % de respuestas usan Gemini vs templates, tiempos de respuesta, abandonos. Sin métricas no sabemos si lo que hacemos funciona.

**3. Investigación (opcional pero útil)**

¿Baileys `[2,3000,1035824857]` soporta botones interactivos de WhatsApp? Si sí, podemos transformar los menús numéricos en botones que el usuario toca. Creá `research/botones-baileys.md` con lo que encuentres.

---

## Lo que NO podés tocar

```
src/flows/*              → Developer A los está modificando ahora
src/services/ai.ts       → Developer A le está bajando el timeout
src/services/moderation.ts   → lo está creando Developer A
src/data/knowledge.ts        → lo está creando Developer A
src/database/sqlite.ts       → infraestructura compartida
src/services/store.ts         → infraestructura compartida
src/app.ts                    → infraestructura compartida
```

---

## Lo que SÍ podés tocar

```
src/services/response-templates.ts   → amplificar (ya es tuyo)
src/services/metrics.ts              → crear nuevo
src/__tests__/unit/metrics.test.ts   → crear nuevo
research/                            → crear carpeta si querés
```

Y cualquier archivo NUEVO que quieras crear. Si tenés ideas más allá de lo que sugiero acá, hacelas. Mientras no toques los archivos prohibidos y los tests sigan pasando, todo vale.

---

## Verificación

```bash
npx tsc --noEmit    # 0 errores
npx vitest run       # todos los tests pasan
```

Si eso da verde, está bien. La implementación específica es tuya.
