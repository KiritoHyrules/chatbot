# Developer A — v3.1 Respuesta Natural

## Estado del proyecto

```
201 tests | 20 test files | v3.0 integrado
Todo el código de Developer B ya está mergeado.
```

## Tu misión: Técnica (cómo se entrega la respuesta)

### 1. Response pools sin repetición — `src/services/response-templates.ts`

El `get()` actual elige una variante aleatoria. El problema: a veces repite la misma 2 veces seguidas. Suena robótico.

**Qué cambiar:** Agregar `lastUsedIndex` por escenario. Si hay 4 variantes, nunca repetir la última usada.

```typescript
const lastUsed: Record<string, number> = {}

get(scenario: string, vars?: Record<string, string>): string {
  const options = TEMPLATES[scenario] ?? TEMPLATES['fallback']
  const available = options.map((_, i) => i).filter(i => i !== lastUsed[scenario])
  const idx = available[Math.floor(Math.random() * available.length)]
  lastUsed[scenario] = idx
  return options[idx].replace(/\{\{(\w+)\}\}/g, (_, k) => vars?.[k] ?? `{{${k}}}`)
}
```

### 2. Eco del usuario — `src/flows/faq.flow.ts` + `src/flows/programs.flow.ts`

Cuando el usuario menciona un programa o keyword, reflejarlo en la respuesta:

```
Usuario: "me interesa ciberseguridad"
Ahora:    "Por tu consulta, creo que estos programas..."  (genérico)
Con eco:  "¡*Ciberseguridad* es una excelente elección! Te cuento más..."
```

Extraer del mensaje del usuario la keyword más relevante y usarla en el template.

### 3. Instalar `fuse.js` — fuzzy matching

Cuando el usuario escribe con error de tipeo ("ciensia de datos"), encontrar el programa igual.

```bash
npm install fuse.js --legacy-peer-deps
```

Usar en `src/data/knowledge.ts` para buscar programas con tolerancia a errores.

### 4. Respuestas más cortas + delays — `src/flows/*`

Dividir respuestas largas (>150 chars) en 2-3 `flowDynamic` con delays de 1-2s entre ellas. Imita conversación real.

---

## Lo que NO tocás

```
src/services/response-templates.ts → solo el mecanismo de pool, no el contenido
src/services/metrics.ts → Developer B
Todo lo de Developer B → intacto
```

---

## Antes de push

```bash
npm install fuse.js --legacy-peer-deps   # solo la primera vez
npx tsc --noEmit
npx vitest run
```
