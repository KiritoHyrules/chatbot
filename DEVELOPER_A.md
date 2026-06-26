# Developer A — v3.0 Anti-Rigidez

## Tu alcance (solo estos archivos)

**NUEVOS:**
- `src/services/moderation.ts` — filtro de contenido inapropiado
- `src/data/knowledge.ts` — base de conocimiento por programa

**MODIFICAR:**
- `src/flows/welcome.flow.ts` — aceptar texto libre (no solo números)
- `src/flows/faq.flow.ts` — base de conocimiento + anti-bucle
- `src/flows/programs.flow.ts` — seguimiento de preguntas post-programa
- `src/services/ai.ts` — timeout 5s, solo 1 retry

**NO TOCAR NUNCA:**
- Nada creado por Developer B (`response-templates.ts`, `decision-engine.ts`, etc.)
- `src/services/store.ts`, `src/database/sqlite.ts`, `src/app.ts` (infraestructura compartida)
- Tests existentes (solo agregar tests nuevos)

---

## 1. `src/services/moderation.ts` (NUEVO)

Filtro de 40+ palabras/variaciones. Si detecta contenido inapropiado, devuelve mensaje profesional.

```typescript
export const moderation = {
  check(message: string): { blocked: boolean; response?: string } {
    const blocked = [
      'mamasita', 'mamacita', 'perra', 'perrita', 'kchar', 'cachar',
      'culo', 'puta', 'puto', 'mierda', 'pene', 'nepe', 'vagina',
      'sexo', 'sexual', 'tetas', 'culos', 'porno', 'desnudo',
      'chinga', 'chingar', 'verga', 'pendejo', 'pendeja',
      'cojer', 'coger', 'follar', 'culear',
      'estupido', 'estupida', 'idiota', 'imbecil', 'tarado',
      'concha', 'conchetumare', 'ctm', 'hdp', 'ptm',
      'drogas', 'droga', 'marihuana', 'cocaina',
    ]
    const q = message.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    for (const word of blocked) {
      if (q.includes(word)) {
        return {
          blocked: true,
          response: 'Soy el asistente profesional del *Centro de Especialización Ejecutiva* de la UNI. ¿En qué puedo ayudarte con información académica?'
        }
      }
    }
    return { blocked: false }
  }
}
```

## 2. `src/data/knowledge.ts` (NUEVO)

Base de conocimiento con preguntas frecuentes y respuestas pre-escritas para cada programa.

```typescript
export const knowledge = {
  programs: {
    'Diplomado en Gestión de Proyectos': {
      duration: '6 meses, 240 horas académicas',
      requirements: 'Título universitario o experiencia profesional equivalente',
      why: 'Porque aprenderás metodologías ágiles, PMBOK, gestión de riesgos y liderazgo de equipos. Ideal para quienes buscan certificarse como Project Manager.',
      forWho: 'Profesionales de cualquier carrera que gestionen equipos o proyectos',
      jobs: 'Project Manager, Scrum Master, Líder de PMO, Consultor de procesos',
    },
    'Diplomado en Ciencia de Datos': {
      duration: '6 meses, 240 horas académicas',
      requirements: 'Conocimientos básicos de programación. Título universitario deseable.',
      why: 'Porque combina Python, Machine Learning y visualización. Alta demanda laboral: científicos de datos son los más solicitados por empresas tech.',
      forWho: 'Ingenieros de sistemas, informáticos, estadísticos, y profesionales que trabajen con datos',
      jobs: 'Data Scientist, Data Analyst, ML Engineer, Business Intelligence Analyst',
    },
    'PEE en Transformación Digital': {
      duration: '4 meses, 120 horas académicas',
      requirements: 'Experiencia profesional en áreas de tecnología o gestión',
      why: 'Porque cubre estrategia digital, Industria 4.0 y cultura organizacional ágil. Perfecto para liderar la transformación en tu empresa.',
      forWho: 'Gerentes, líderes de TI, consultores, profesionales que quieran impulsar cambio digital',
      jobs: 'Chief Digital Officer, Consultor de Transformación Digital, Líder de Innovación',
    },
    'PEE en Ciberseguridad': {
      duration: '4 meses, 120 horas académicas',
      requirements: 'Conocimientos de redes y sistemas operativos',
      why: 'Porque aprenderás ethical hacking, gestión de incidentes y normativas ISO 27001. La ciberseguridad es el campo de mayor crecimiento en TI.',
      forWho: 'Ingenieros de sistemas, redes, seguridad informática, auditores TI',
      jobs: 'Analista de Ciberseguridad, CISO, Consultor ISO 27001, Ethical Hacker',
    },
    'Curso Taller de Power BI': {
      duration: '2 meses, 60 horas',
      requirements: 'Conocimientos básicos de Excel',
      why: 'Porque aprenderás dashboards interactivos, DAX y modelado de datos. Power BI es la herramienta #1 de business intelligence.',
      forWho: 'Analistas, gerentes, y cualquier profesional que necesite visualizar datos',
      jobs: 'Business Intelligence Analyst, Data Analyst, Report Developer',
    },
  },
  faq: {
    'duración': 'La duración varía según el programa: los *Diplomados* duran 6 meses (240h), los *PEE* 4 meses (120h), y los *Cursos* 2 meses (60h). ¿Sobre cuál quieres más detalle?',
    'costo': 'Los costos varían según el programa y modalidad. Para darte información precisa de precios y opciones de financiamiento, te recomiendo hablar con un asesor. ¿Quieres que te derive?',
    'inscripción': 'El proceso de inscripción es simple: completas el formulario de registro, presentas tu DNI y título o constancia de estudios. Un asesor te guiará en cada paso.',
    'horario': 'Ofrecemos modalidad presencial y semipresencial. Los horarios específicos dependen del programa y la sede. ¿Hay algún programa en particular que te interese?',
    'certificación': 'Todos nuestros programas otorgan certificación a nombre de la *Universidad Nacional de Ingeniería*. Los diplomados y PEE incluyen certificación digital verificable.',
    'virtual': 'Sí, varios programas ofrecen modalidad semipresencial con componentes virtuales. La tendencia es ampliar la oferta 100% virtual.',
    'descuento': 'Ofrecemos descuentos corporativos para grupos de 3+ personas, y tarifas preferenciales para alumnos y egresados UNI. Un asesor puede darte más detalles.',
    'prácticas': 'Nuestros programas incluyen casos prácticos reales y proyectos aplicados. Si buscas prácticas profesionales, el *Diplomado en Ciencia de Datos* y el *PEE en Ciberseguridad* incluyen proyectos con datasets reales.',
    'requisitos': 'Los requisitos varían por programa. En general, se requiere título universitario o experiencia profesional equivalente. Algunos cursos no tienen requisitos previos.',
  }
}

// Buscar respuesta en la base de conocimiento
export function findAnswer(question: string, programName?: string): string | null {
  const q = question.toLowerCase()

  // Si hay un programa específico, buscar en sus datos
  if (programName) {
    const prog = knowledge.programs[programName as keyof typeof knowledge.programs]
    if (!prog) return null

    if (q.includes('duración') || q.includes('dura') || q.includes('cuánto dura') || q.includes('cuanto dura') || q.includes('tiempo'))
      return `El *${programName}* tiene una duración de *${prog.duration}*.`
    if (q.includes('requisito') || q.includes('necesito') || q.includes('perfil') || q.includes('prerrequisito'))
      return `Para el *${programName}*: ${prog.requirements}.`
    if (q.includes('por qué') || q.includes('porque') || q.includes('por que') || q.includes('porqué'))
      return `El *${programName}*: ${prog.why}`
    if (q.includes('para quién') || q.includes('quién') || q.includes('dirigido'))
      return `El *${programName}* está dirigido a: ${prog.forWho}.`
    if (q.includes('trabajo') || q.includes('salida') || q.includes('laboral') || q.includes('empleo') || q.includes('trabajar'))
      return `Con el *${programName}* podrás desempeñarte como: ${prog.jobs}.`
  }

  // Buscar en FAQ general
  for (const [keyword, answer] of Object.entries(knowledge.faq)) {
    if (q.includes(keyword)) return answer
  }

  return null
}
```

## 3. `src/flows/welcome.flow.ts` (MODIFICAR)

El segundo `.addAction` debe aceptar texto libre:

```typescript
// En vez de solo números:
if (option === '1') { ... }

// Aceptar texto libre:
const text = option.toLowerCase()
if (option === '1' || text.includes('programa') || text.includes('curso') || text.includes('ver') || text.includes('diplomado') || text.includes('catálogo')) {
  // ir a programs
}
if (option === '2' || text.includes('duda') || text.includes('pregunta') || text.includes('consulta') || text.includes('saber')) {
  // ir a faq
}
if (option === '3' || text.includes('asesor') || text.includes('hablar') || text.includes('contactar') || text.includes('persona') || text.includes('humano')) {
  // ir a handoff
}
```

## 4. `src/flows/faq.flow.ts` (MODIFICAR)

Pipeline: moderación → knowledge base → keyword fallback → templates → Gemini

```typescript
// Al inicio del capture:
const mod = extensions.moderation?.check(question)
if (mod?.blocked) {
  await flowDynamic([{ body: mod.response!, delay: rnd() }])
  return fallBack('¿Hay algo más en lo que pueda ayudarte con información académica?')
}

// Buscar en knowledge base
const answer = findAnswer(question, state.get('programInterest'))
if (answer) {
  await flowDynamic([{ body: answer, delay: rnd() }])
  // Seguir conversación, no mostrar "Responde 1 o 2"
  return fallBack('¿Hay algo más en lo que pueda ayudarte?')
}

// Si nada matchea → keyword fallback → Gemini o template
```

## 5. `src/flows/programs.flow.ts` (MODIFICAR)

Después de describir un programa, aceptar preguntas de seguimiento:

```typescript
// Último .addAction: capturar preguntas post-programa
.addAction({ capture: true, idle: 120000 }, async (ctx, { flowDynamic, fallBack, gotoFlow, endFlow, state, extensions }) => {
  const input = ctx.body?.trim() ?? ''
  if (input === 'sí' || input === 'si' || input === '1') {
    // lead capture como antes
  }
  if (input === 'no' || input === '2') {
    return endFlow(...)
  }
  // Buscar respuesta en knowledge base sobre el programa actual
  const progName = state.get<string>('programInterest')
  const answer = findAnswer(input, progName ?? undefined)
  if (answer) {
    await flowDynamic([{ body: answer, delay: rnd() }])
    return fallBack('¿Quieres saber algo más sobre este programa?')
  }
  // Si no entiende, ofrecer contacto
  return fallBack('¿Te gustaría que un asesor te contacte para resolver tus dudas? Responde *sí* o *no*.')
})
```

## 6. `src/services/ai.ts` (MODIFICAR)

Timeout de 5s y solo 1 retry:

```typescript
// Cambiar en callWithRetry:
for (let attempt = 0; attempt < 2; attempt++) {  // solo 2 intentos (original + 1 retry)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)  // 5s timeout
    // ...
    clearTimeout(timeout)
  }
}
```

---

## Reglas

1. **Solo estos archivos.** No toques nada de Developer B.
2. **`npm test` antes de cada commit.**
3. **Test nuevo por cada archivo nuevo.**
4. **NO modificar `store.ts`, `sqlite.ts`, `app.ts`** sin coordinación.
