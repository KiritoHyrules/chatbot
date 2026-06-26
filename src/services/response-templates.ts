import { rnd } from '../utils.js'

const TEMPLATES: Record<string, string[]> = {
  welcome: [
    '¡Hola! 👋 Soy el asistente virtual del CEE-UNI. ¿En qué puedo ayudarte hoy?\n\n1️⃣ Información de programas\n2️⃣ Asesoría personalizada\n3️⃣ Hablar con un asesor',
    '¡Bienvenido al Centro de Educación Ejecutiva de la UNI! 🎓\n\nElige una opción:\n1. 📋 Ver programas\n2. 💬 Asesoría personalizada\n3. 👤 Contactar asesor',
    'Hola, gracias por contactar al CEE-UNI. Soy tu asistente virtual.\n\n¿Qué te gustaría hacer?\n1️⃣ Conocer nuestros programas\n2️⃣ Recibir asesoría\n3️⃣ Hablar directamente con un asesor',
    '¡Saludos! 😊 Te habla el asistente del CEEUNI.\n\nSelecciona una opción:\n1. 📚 Programas disponibles\n2. 🎯 Recomendación personalizada\n3. 📞 Que un asesor te contacte',
  ],
  program_recommendation: [
    'Para tu perfil, te recomiendo: {{programa}}. Es ideal para profesionales que buscan especializarse. ¿Te gustaría recibir más información?',
    'Basado en tu interés, el programa ideal para ti es: {{programa}}. Tiene un enfoque práctico y está dictado por expertos del sector.',
    '¡Excelente elección! {{programa}} es uno de nuestros programas más valorados. ¿Quieres que te envíe el temario completo?',
  ],
  ask_name: [
    'Perfecto. ¿Cuál es tu nombre completo?',
    'Gracias. Para poder ayudarte mejor, ¿me podrías decir tu nombre completo?',
    'Entendido. ¿Me compartes tu nombre completo para registrarte?',
  ],
  ask_dni: [
    'Gracias. Ahora, ¿cuál es tu número de DNI (8 dígitos)?',
    'Perfecto. Por favor, indícame tu DNI (8 dígitos).',
    'Tu DNI, por favor (8 dígitos).',
  ],
  ask_phone: [
    'Gracias. ¿Cuál es tu número de teléfono o celular?',
    'Anotado. ¿Me pasas tu número de contacto?',
    'Tu número de teléfono, por favor.',
  ],
  ask_email: [
    'Gracias. Por último, ¿cuál es tu correo electrónico?',
    'Perfecto. ¿Me compartes tu correo electrónico?',
    'Tu correo electrónico, por favor.',
  ],
  objection_price: [
    'Entiendo tu preocupación. Tenemos facilidades de pago y descuentos especiales. ¿Te gustaría conocer las opciones de financiamiento?',
    'El precio incluye certificación universitaria, materiales digitales y acceso a nuestra bolsa laboral. Además, ofrecemos descuentos por pronto pago.',
    'Muchos profesionales como tú encontraron que la inversión vale la pena. Podemos agendar una llamada para explicarte los beneficios en detalle.',
  ],
  objection_time: [
    'Nuestros programas tienen horarios flexibles: vespertinos, fines de semana y modalidad virtual. ¿Cuál se adapta mejor a tu agenda?',
    'Entiendo que estés ocupado. Justamente nuestros programas están diseñados para profesionales que trabajan, con clases grabadas y horarios flexibles.',
    'La mayoría de nuestros alumnos también trabaja y logra completar el programa sin problemas. ¿Te gustaría ver los horarios disponibles?',
  ],
  objection_confidence: [
    'Somos el Centro de Educación Ejecutiva de la UNI, con más de 15 años de experiencia formando profesionales. Puedes verificar nuestra trayectoria en la web oficial.',
    'La UNI es garantía de calidad. Tenemos más de 5000 egresados y convenios con las mejores empresas del país.',
    'Te invito a revisar los testimonios de nuestros exalumnos. Estoy seguro de que disiparán cualquier duda.',
  ],
  objection_competencia: [
    'Cada institución tiene su enfoque. En el CEE-UNI ofrecemos certificación universitaria, docentes ejecutivos y networking de alto nivel.',
    'Entiendo que compares. Nuestro diferencial es la certificación UNI y el enfoque práctico con casos reales. ¿Qué te parece si te comparto el plan de estudios?',
    'Valoro que investigues. Te sugiero comparar el plan de estudios, los docentes y la certificación. La calidad UNI marca la diferencia.',
  ],
  objection_calidad: [
    'Nuestros programas son diseñados por expertos del sector y actualizados constantemente. La certificación tiene el respaldo académico de la UNI.',
    'La calidad está avalada por nuestros más de 5000 egresados y la tasa de empleabilidad del 85% dentro de los 6 meses de culminado el programa.',
    'Contamos con docentes que son ejecutivos en activo, lo que garantiza una formación práctica y actualizada.',
  ],
  objection_compromiso: [
    'Por supuesto, tómate tu tiempo. Mientras tanto, ¿quieres que te envíe más información del programa para que lo revises?',
    'Entiendo. Solo te comento que los cupos son limitados. ¿Hay alguna duda específica que pueda resolverte?',
    'Claro. Aprovecho para recordarte que tenemos descuento por inscripción anticipada. ¿Te interesaría conocer los detalles?',
  ],
  goodbye: [
    'Gracias por tu tiempo. Si más adelante cambias de opinión, estaremos encantados de ayudarte. ¡Que tengas un excelente día! 😊',
    'Entendido. Quedamos a tu disposición para cuando lo necesites. ¡Saludos!',
    'Gracias por comunicarte con el CEE-UNI. Cuídate mucho y mucho éxito.',
  ],
  handoff_urgent: [
    'Entendido, tu consulta es urgente. En unos momentos un asesor se comunicará contigo para atenderte. 📞',
    'Hemos recibido tu solicitud urgente. Un asesor te contactará a la brevedad posible. Por favor, mantente atento.',
    'Gracias por tu paciencia. Estamos derivando tu caso a un asesor especializado que te atenderá de inmediato.',
  ],
  handoff_normal: [
    'Gracias por tu interés. Un asesor se comunicará contigo en las próximas 24 horas hábiles para brindarte toda la información que necesitas.',
    'Hemos registrado tu solicitud. Un asesor del CEE-UNI te contactará pronto para ayudarte.',
    'Perfecto. Un asesor se pondrá en contacto contigo para darte atención personalizada.',
  ],
  confirm_data: [
    'Gracias. Confirmo tus datos registrados:\nNombre: {{nombre}}\nDNI: {{dni}}\nTeléfono: {{telefono}}\nCorreo: {{email}}\n\n¿Todo está correcto?',
    'Perfecto, hemos registrado tus datos. Por favor confirma:\n• Nombre: {{nombre}}\n• DNI: {{dni}}\n• Teléfono: {{telefono}}\n• Email: {{email}}',
    'Tus datos han sido registrados. Verifica que estén correctos:\n👤 {{nombre}}\n🆔 {{dni}}\n📞 {{telefono}}\n📧 {{email}}',
  ],
  ask_more: [
    '¿Hay algo más en lo que pueda ayudarte?',
    '¿Necesitas información adicional sobre algún programa en particular?',
    '¿Te gustaría conocer más detalles de nuestros programas o tienes alguna otra consulta?',
  ],
  program_list: [
    'Estos son nuestros programas disponibles:\n\n1️⃣ Diplomado en Gestión de Proyectos\n2️⃣ Diplomado en Ciencia de Datos\n3️⃣ PEE en Transformación Digital\n4️⃣ PEE en Ciberseguridad\n5️⃣ Curso Taller de Power BI\n\n¿Cuál te gustaría conocer a detalle?',
    'Contamos con los siguientes programas:\n📋 Diplomados: Gestión de Proyectos, Ciencia de Datos\n📋 PEE: Transformación Digital, Ciberseguridad\n📋 Curso Taller: Power BI\n\n¿Te interesa alguno en especial?',
    'Nuestra oferta académica incluye:\n• Diplomados (Gestión de Proyectos, Ciencia de Datos)\n• Programas de Especialización Ejecutiva (Transformación Digital, Ciberseguridad)\n• Curso Taller de Power BI\n\n¿Sobre cuál te gustaría recibir información?',
  ],
  program_detail: [
    '{{programa}} - {{descripcion}}\n\nTipo: {{tipo}}\n\n¿Te gustaría inscribirte o recibir más detalles?',
    'Aquí tienes la información de {{programa}}:\n{{descripcion}}\n\nEste programa es {{tipo}}. ¿Te interesa?',
    '{{programa}} ({{tipo}}): {{descripcion}}\n\n¿Quieres que un asesor te dé más información?',
  ],
  program_detail_gestion: [
    'El *Diplomado en Gestión de Proyectos* te prepara para liderar proyectos bajo los estándares del *PMBOK* y metodologías *ágiles (Scrum)*. Son 6 meses (240 horas) con certificación UNI. ¿Te gustaría recibir el brochure completo?',
    'Nuestro Diplomado en Gestión de Proyectos cubre PMBOK, Scrum, gestión de riesgos y liderazgo de equipos. *Duración:* 6 meses | *Horas:* 240 | *Modalidad:* semipresencial. ¿Te interesa inscribirte?',
    'Si buscas liderar proyectos con estándares internacionales, el Diplomado en Gestión de Proyectos es para ti. Aprenderás PMBOK, metodologías ágiles y gestión de equipos. 6 meses, 240h, certificación UNI. ¿Quieres saber más?',
    'El Diplomado en Gestión de Proyectos del CEE-UNI te forma en PMBOK, Scrum y gestión de stakeholders. *Duración:* 6 meses | *Horas lectivas:* 240 | *Inversión:* consulta por nuestros descuentos. ¿Te gustaría que un asesor te contacte?',
  ],
  program_detail_datos: [
    'El *Diplomado en Ciencia de Datos* te sumerge en Python, Machine Learning y visualización de datos para la toma de decisiones. Son 6 meses (240 horas) con certificación UNI. ¿Te gustaría conocer el temario?',
    'Domina Python, ML y visualización con nuestro Diplomado en Ciencia de Datos. *Duración:* 6 meses | *Horas:* 240 | *Modalidad:* semipresencial. Ideal si buscas convertirte en data-driven professional.',
    'La Ciencia de Datos es el perfil más demandado. Nuestro diplomado te forma en Python, Machine Learning, estadística y visualización. 6 meses, 240h, certificación UNI. ¿Te gustaría recibir el brochure?',
    'Con el Diplomado en Ciencia de Datos del CEE-UNI aprenderás a extraer insights de datos usando Python, ML y dashboards interactivos. *Duración:* 6 meses | *240 horas académicas.* ¡Pregunta por nuestros descuentos!',
  ],
  program_detail_transformacion: [
    'El *PEE en Transformación Digital* está diseñado para líderes que quieren impulsar el cambio digital en sus organizaciones. Industria 4.0, cloud computing y cultura ágil. 4 meses, 120h, certificación UNI.',
    'Transforma tu organización con el PEE en Transformación Digital. Aprenderás sobre Industria 4.0, cloud, cultura ágil y estrategia digital. *Duración:* 4 meses | *Horas:* 120. ¿Te interesa?',
    'El programa ejecutivo en Transformación Digital del CEE-UNI es ideal para gerentes y directores que buscan liderar la digitalización. 4 meses, 120h, certificación UNI. ¿Quieres que te enviemos el plan de estudios?',
    'Industria 4.0, cloud computing, cultura organizacional ágil. El PEE en Transformación Digital te da las herramientas para liderar el cambio. *Duración:* 4 meses | *120h.* ¡Contáctanos para más información!',
  ],
  program_detail_ciberseguridad: [
    'El *PEE en Ciberseguridad* te forma en ethical hacking, gestión de incidentes y normativas ISO 27001. 4 meses, 120 horas, certificación UNI. Un campo con alta demanda laboral.',
    'Especialízate en ciberseguridad con nuestro programa ejecutivo: ethical hacking, ISO 27001, gestión de incidentes y continuidad del negocio. *Duración:* 4 meses | *Horas:* 120. ¿Te gustaría conocer los requisitos?',
    'La ciberseguridad es crítica para toda organización. El PEE del CEE-UNI te prepara con ethical hacking, normativas y gestión de riesgos. 4 meses, 120h, certificación UNI.',
    'Con el PEE en Ciberseguridad aprenderás a proteger activos digitales, realizar pentesting y gestionar incidentes bajo ISO 27001. *4 meses | 120 horas | Certificación UNI.* ¿Te interesa este programa?',
  ],
  program_detail_powerbi: [
    'El *Curso Taller de Power BI* te enseña a crear dashboards interactivos, usar DAX y modelar datos para la toma de decisiones ejecutivas. 2 meses, 60 horas, certificación UNI.',
    'Domina Power BI en 2 meses: dashboards, DAX, modelado de datos y visualización ejecutiva. *Duración:* 2 meses | *Horas:* 60 | *Modalidad:* presencial/virtual. ¿Te gustaría inscribirte?',
    'El Curso Taller de Power BI del CEE-UNI es perfecto para profesionales que necesitan convertir datos en decisiones. 2 meses, 60h, certificación UNI. ¡Cupos limitados!',
    'Power BI es la herramienta #1 en business intelligence. Nuestro curso taller te forma en DAX, modelado y dashboards interactivos. *Duración:* 2 meses | *60 horas.* ¿Quieres más información?',
  ],
  program_comparison: [
    'Si estás entre un *Diplomado* y un *PEE*, la diferencia está en el enfoque. Los diplomados (6 meses) son más extensos y profundos en habilidades técnicas. Los PEE (4 meses) están diseñados para ejecutivos que buscan actualización estratégica. ¿Cuál se alinea más con tu perfil?',
    'Los *Diplomados* (Gestión de Proyectos, Ciencia de Datos) son ideales si buscas especialización técnica profunda. Los *PEE* (Transformación Digital, Ciberseguridad) son perfectos si ya tienes experiencia y buscas una visión estratégica. El *Curso de Power BI* es la opción rápida si necesitas una habilidad específica.',
    '¿No sabes cuál elegir? Los diplomados tienen mayor duración y profundidad (6 meses, 240h). Los PEE son ejecutivos y estratégicos (4 meses, 120h). El curso de Power BI es intensivo y práctico (2 meses, 60h). Cuéntame más sobre tu perfil y te ayudo a decidir.',
  ],
  program_job_outlook: [
    'Los egresados de {{programa}} suelen desempeñarse como líderes de proyecto, analistas, consultores o gerentes en empresas del sector público y privado. La certificación UNI abre puertas en el mercado laboral.',
    '{{programa}} te prepara para roles de alta demanda: jefatura de proyectos, analítica de datos, consultoría digital, seguridad informática o inteligencia de negocios. Nuestra bolsa laboral tiene convenios con más de 50 empresas.',
    'Con {{programa}} del CEE-UNI, tus oportunidades laborales crecen. Nuestros egresados reportan una mejora salarial promedio del 30% dentro del primer año. ¿Te gustaría conocer casos de éxito?',
  ],
  program_ideal_profile: [
    '{{programa}} está dirigido a profesionales con experiencia mínima de 2 años que buscan especializarse o actualizarse en su campo. No requieres conocimientos previos específicos, solo motivación y compromiso.',
    'El perfil ideal para {{programa}} incluye a ingenieros, administradores, y profesionales de carreras afines que buscan potenciar su carrera con una certificación de la UNI.',
    '{{programa}} es perfecto si tienes espíritu de mejora continua, te interesa la innovación y quieres destacar en tu organización. ¿Cumples con este perfil? ¡Este programa es para ti!',
  ],
  program_benefits: [
    'Estudiar en el CEE-UNI tiene múltiples beneficios: certificación universitaria, docentes ejecutivos en activo, modalidad semipresencial, bolsa laboral con +50 empresas y descuentos corporativos.',
    '¿Por qué elegir el CEE-UNI? Porque combinas el prestigio de la UNI con un enfoque práctico. Accedes a networking de alto nivel, clases grabadas y una bolsa laboral exclusiva.',
    'Al elegir el CEE-UNI obtienes: certificación con valor curricular, docentes del sector empresarial, horarios flexibles, material digital actualizado y descuentos por pronto pago. ¡Invierte en tu futuro!',
  ],
  faq_intro: [
    'Claro, puedo ayudarte con preguntas frecuentes. Aquí te van las principales consultas:\n\n¿Qué medios de pago tienen?\n¿Cuánto dura el programa?\n¿Hay certificación?',
    'Con gusto. Estas son las preguntas más comunes:\n1. 💳 Medios de pago\n2. ⏱ Duración de programas\n3. 📜 Certificación',
    'Te respondo las dudas más frecuentes:\n• Aceptamos tarjetas, transferencias y yape/plin.\n• La duración varía según el programa (3 a 6 meses).\n• Todos nuestros programas otorgan certificación UNI.',
  ],
  out_of_hours: [
    'Gracias por escribirnos. Nuestro horario de atención es de lunes a viernes de 9:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m. Un asesor te atenderá a la brevedad una vez retomemos las actividades.',
    'Estamos fuera de nuestro horario de atención. Te responderemos en cuanto abramos. Horario: lun-vie 9am-6pm, sáb 9am-1pm.',
    'Gracias por contactarnos. Nuestro horario es de lunes a viernes de 9am a 6pm y sábados hasta la 1pm. Te atenderemos apenas regresemos.',
  ],
  no_results: [
    'Lo siento, no encontré información sobre eso. ¿Puedes intentar con otra pregunta o contactar a un asesor para ayudarte mejor?',
    'Disculpa, no tengo información sobre tu consulta. ¿Te gustaría hablar con un asesor que pueda ayudarte?',
    'No encontré resultados para tu consulta. Por favor, intenta con otras palabras o selecciona una opción del menú.',
  ],
  fallback: [
    'Gracias por tu mensaje. Estoy procesando tu consulta, por favor dame un momento.',
    'Gracias por tu paciencia. Permíteme revisar la información para darte una respuesta precisa.',
    'Estoy revisando tu consulta. Mientras tanto, ¿te gustaría conocer nuestros programas disponibles?',
  ],
}

const lastUsed: Record<string, number> = {}

export const templates = {
  get(scenario: string, vars?: Record<string, string>): string {
    const options = TEMPLATES[scenario] ?? TEMPLATES['fallback']
    const available = options
      .map((_, i) => i)
      .filter(i => options.length < 2 || i !== lastUsed[scenario])
    const idx = available[Math.floor(Math.random() * available.length)]
    lastUsed[scenario] = idx
    let result = options[idx]
    if (vars) {
      result = result.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
    }
    return result
  },
}
