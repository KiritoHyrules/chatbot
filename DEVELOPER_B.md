# Developer B — v3.1 Lenguaje Natural

## Estado del proyecto

```
201 tests | v3.0 integrado | Tus métricas y templates ya están en producción
```

## Tu misión: Contenido (qué dice la respuesta)

### 1. Lenguaje más cálido en `src/services/response-templates.ts`

Reescribir las variantes para que suenen a una persona real, no a un robot corporativo. Investigación respalda esto: en WhatsApp y español latino, el tono coloquial y cálido funciona mejor que el formal y distante.

**Principios:**

- Usar "te" en vez de "le" (más cercano)
- Incluir signos de empatía: "Entiendo", "Claro", "Buena pregunta"
- Usar emojis con moderación (1 por mensaje, no más)
- Frases cortas, ritmo conversacional
- Preguntar, no solo enunciar

**Ejemplo:**

```
ANTES: "Procesando tu solicitud. Por favor espera."
AHORA:  "¡Entendido! Dame un segundo para revisar eso."

ANTES: "Responde 1, 2 o 3 por favor."
AHORA:  "¿Qué te gustaría hacer? Te guío sin problema."

ANTES: "Has salido del menú. Escribe hola cuando necesites algo."
AHORA:  "¡Listo! Cuando quieras retomar, solo escribime."
```

### 2. Más variantes por escenario

Cada escenario debería tener 4-6 variantes. Cuantas más, menos se nota la repetición.

### 3. Transiciones variadas

En lugar de siempre "Responde 1 o 2":

```
"¿Qué te gustaría saber?"
"¿Por dónde seguimos?"
"¿Algo más en lo que pueda ayudarte?"
"¿Continuamos con algo en especial?"
```

### 4. Frases de cierre más naturales

```
ANTES: "Me alegra haber ayudado. Escribe hola cuando necesites algo más."
MEJOR: "¡Un gusto ayudarte! Cualquier otra duda, aquí estoy."
       "Quedo atento por si necesitas algo más."
       "¡Éxitos con tu búsqueda! Si necesitas orientación, escribime."
```

---

## Referencia de copywriting para WhatsApp (de la investigación)

- **60-90 caracteres por mensaje** (se ve completo en pantalla móvil)
- **Lenguaje emocional > procedimental**
- **Español latino es naturalmente más cálido** — usalo a tu favor
- **Regla de 3 clics**: el usuario llega a su objetivo en máximo 3 inputs
- **Menú al inicio** explica capacidades y expectativas

---

## Lo que NO tocás

```
src/flows/* → Developer A está modificando
src/services/ai.ts → Developer A
src/data/knowledge.ts → Developer A
src/services/moderation.ts → Developer A
src/app.ts → compartido
Todo lo de Developer A → intacto
```

---

## Antes de push

```bash
npx tsc --noEmit
npx vitest run
```
