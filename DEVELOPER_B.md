# Developer B — v3.0 Enriquecimiento

## Acá estamos

```
192 tests | v2.0 integrado | Tus 6 servicios ya funcionan en los flows
```

## Lo que ya hiciste (y está perfecto)

```
lead-scorer.ts ✅           scoring 0-100 con 15 reglas
objection-detector.ts ✅    6 tipos de objeción
urgency-detector.ts ✅      5 niveles de urgencia
tag-engine.ts ✅            8 tags automáticos
response-templates.ts ✅    23 escenarios con variantes
decision-engine.ts ✅       11 reglas de decisión
```

## Tu misión ahora

El bot funciona pero cuando Gemini falla (429 constante), las respuestas suenan genéricas. Tu trabajo: **darle voz propia al CEE** a través de los templates.

### Enfocate en `response-templates.ts`

Ya tenés 23 escenarios. Ahora sumale **específicos de los 5 programas del CEE**. Con datos reales:

| Programa | Datos clave |
|---|---|
| Gestión de Proyectos | PMBOK, ágil, Scrum, 6 meses, 240h |
| Ciencia de Datos | Python, ML, visualización, 6 meses, 240h |
| Transformación Digital | Industria 4.0, cloud, cultura ágil, 4 meses, 120h |
| Ciberseguridad | Ethical hacking, ISO 27001, 4 meses, 120h |
| Power BI | Dashboards, DAX, modelado, 2 meses, 60h |

Escenarios que sumarían (los que vos veas, no es checklist):
- Descripción detallada de cada programa
- Por qué elegir X sobre Y (comparación)
- Salida laboral de cada uno
- Perfil del estudiante ideal

### Creá `src/services/metrics.ts`

Algo simple para saber si mejoramos: ¿cuántas respuestas usan Gemini vs template? ¿tiempo promedio? ¿abandonos?

### Investigación (opcional)

¿Baileys `[2,3000,1035824857]` soporta botones interactivos? Si sí, cambia todo. `research/botones-baileys.md`.

---

## Lo que NO tocás

```
src/flows/*              → Developer A en progreso
src/services/ai.ts       → Developer A ajustando timeout
src/services/moderation.ts   → Developer A (nuevo)
src/data/knowledge.ts        → Developer A (nuevo)
src/database/sqlite.ts / store.ts / app.ts → compartido
```

---

## Lo que SÍ

```
src/services/response-templates.ts   → enriquecer (es tuyo)
src/services/metrics.ts              → crear
src/__tests__/unit/metrics.test.ts   → crear
research/                            → opcional
```

Y cualquier idea propia que tengas. Si los tests pasan y no tocás lo prohibido, vale.

---

## Antes de push

```bash
npx tsc --noEmit     # 0 errores
npx vitest run        # todo verde
```
