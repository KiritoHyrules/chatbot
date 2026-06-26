import { rnd } from '../utils.js'

const TEMPLATES: Record<string, string[]> = {
  welcome: [
    '¡Hola! 👋 Soy el asistente del *CEE-UNI*. ¿En qué puedo ayudarte hoy?\n\n*1.* Ver nuestros programas\n*2.* Hacer una consulta\n*3.* Hablar con un asesor',
    '¡Bienvenido al *Centro de Educación Ejecutiva* de la UNI! 🎓\n\nElegí una opción:\n*1.* 📋 Ver programas\n*2.* 💬 Resolver dudas\n*3.* 👤 Contactar asesor',
    'Hola, gracias por escribir al CEE-UNI. Soy tu asistente virtual.\n\n¿Qué te gustaría hacer?\n*1.* Conocer nuestros programas\n*2.* Hacer una consulta\n*3.* Hablar con un asesor',
    '¡Saludos! 😊 Soy el asistente del CEE-UNI.\n\nSeleccioná:\n*1.* 📚 Programas disponibles\n*2.* 🎯 Resolver dudas\n*3.* 📞 Que un asesor te contacte',
    '¡Hola! ¿Todo bien? Soy el bot del CEE-UNI, listo para orientarte. ¿Empezamos?\n\n*1.* Ver programas\n*2.* Consultar algo\n*3.* Hablar con alguien del equipo',
    '¿Qué tal? 👋 Acá estoy para ayudarte con lo que necesites del CEE-UNI.\n\n*1.* Quiero ver los programas\n*2.* Tengo una duda\n*3.* Quiero que me contacten',
  ],
  program_recommendation: [
    'Para tu perfil, te recomiendo: *{{programa}}*. Es ideal para profesionales que buscan especializarse. ¿Te gustaría recibir más información?',
    'Basado en tu interés, el programa ideal para ti es: *{{programa}}*. Tiene un enfoque práctico y está dictado por expertos del sector.',
    '¡Excelente elección! *{{programa}}* es uno de nuestros programas más valorados. ¿Querés que te cuente más?',
    'Mirá, por lo que me contás, *{{programa}}* te queda como anillo al dedo. Es justo lo que buscás. ¿Te paso más info?',
    'Creo que *{{programa}}* es perfecto para vos. Combina justo lo que necesitás. ¿Te interesa que te dé más detalles?',
  ],
  ask_name: [
    'Perfecto. ¿Cuál es tu nombre completo?',
    'Gracias. Para ayudarte mejor, ¿me decís tu nombre completo?',
    'Entendido. ¿Me compartís tu nombre completo para registrarte?',
    '¡De una! Primero necesito tu nombre completo. ¿Me lo pasás?',
  ],
  ask_dni: [
    'Gracias. Ahora, ¿tu DNI? (8 dígitos)',
    'Perfecto. ¿Me pasás tu DNI? Son 8 dígitos nomás.',
    'Tu DNI, por favor (8 dígitos).',
    'Anotado. Ahora necesito tu DNI (8 dígitos, sin espacios).',
  ],
  ask_phone: [
    'Gracias. ¿Cuál es tu número de teléfono?',
    'Anotado. ¿Me pasás tu número de contacto?',
    'Tu número de teléfono, porfa (9 dígitos).',
    '¿Y tu celular? Así te contactamos directo.',
  ],
  ask_email: [
    'Gracias. Por último, ¿tu correo electrónico?',
    'Perfecto. ¿Me compartís tu correo?',
    'Tu correo electrónico, porfa.',
    'Último dato: ¿tu email? Así te enviamos la info.',
  ],
  objection_price: [
    'Entiendo tu preocupación. Tenemos facilidades de pago y descuentos especiales. ¿Te gustaría conocer las opciones de financiamiento?',
    'El precio incluye certificación universitaria, materiales digitales y acceso a nuestra bolsa laboral. Además, ofrecemos descuentos por pronto pago.',
    'Muchos profesionales como vos encontraron que la inversión vale la pena. ¿Agendamos una llamada para explicarte los beneficios?',
    'Te entiendo perfecto. Mirá, la mayoría de nuestros alumnos recupera la inversión en menos de 6 meses con el nuevo puesto. ¿Lo hablamos con un asesor?',
    'Es una inversión, no un gasto. Nuestros egresados reportan un aumento salarial del 30% promedio. ¿Querés que te cuente más?',
  ],
  objection_time: [
    'Nuestros programas tienen horarios flexibles: vespertinos, fines de semana y modalidad virtual. ¿Cuál se adapta mejor a tu agenda?',
    'Entiendo que estés ocupado. Justamente nuestros programas están diseñados para profesionales que trabajan, con clases grabadas y horarios flexibles.',
    'La mayoría de nuestros alumnos también trabaja y logra completar el programa sin problemas. ¿Te gustaría ver los horarios disponibles?',
    'Tranquilo, sé lo que es trabajar y estudiar. Por eso tenemos opciones que se adaptan a tu ritmo. ¿Revisamos juntos los horarios?',
  ],
  objection_confidence: [
    'Somos el *Centro de Educación Ejecutiva de la UNI*, con más de 15 años formando profesionales. Podés verificar nuestra trayectoria en la web oficial.',
    'La UNI es garantía de calidad. Tenemos más de 5000 egresados y convenios con las mejores empresas del país.',
    'Te invito a revisar los testimonios de nuestros exalumnos. Estoy seguro de que disiparán cualquier duda.',
    '¡Es normal dudar! Pero la UNI respalda cada programa. Somos la universidad de ingeniería más prestigiosa del Perú.',
  ],
  objection_competencia: [
    'Cada institución tiene su enfoque. En el CEE-UNI ofrecemos certificación universitaria, docentes ejecutivos y networking de alto nivel.',
    'Entiendo que compares. Nuestro diferencial es la certificación UNI y el enfoque práctico con casos reales. ¿Te comparto el plan de estudios?',
    'Valoro que investigues. Compará el plan de estudios, los docentes y la certificación. La calidad UNI marca la diferencia.',
    '¡Qué bueno que investigues! Fijate en la certificación y los docentes. La UNI te da un respaldo que pocos tienen.',
  ],
  objection_calidad: [
    'Nuestros programas son diseñados por expertos del sector y actualizados constantemente. La certificación tiene el respaldo académico de la UNI.',
    'La calidad está avalada por nuestros más de 5000 egresados y la tasa de empleabilidad del 85% en los 6 meses posteriores.',
    'Contamos con docentes que son ejecutivos en activo, lo que garantiza una formación práctica y actualizada.',
    'La calidad se nota en los resultados: 85% de empleabilidad y egresados trabajando en las mejores empresas. ¿Te paso casos de éxito?',
  ],
  objection_compromiso: [
    'Por supuesto, tomate tu tiempo. Mientras tanto, ¿querés que te envíe más info del programa para que lo revises?',
    'Entiendo. Solo te comento que los cupos son limitados. ¿Hay alguna duda específica que pueda resolverte?',
    'Claro. Aprovecho para recordarte que tenemos descuento por inscripción anticipada. ¿Te interesaría conocer los detalles?',
    '¡Sin apuros! Cuando estés listo, acá estoy. ¿Te dejo mientras tanto el brochure para que lo veas con calma?',
  ],
  goodbye: [
    '¡Un gusto ayudarte! Cualquier cosa, ya sabés dónde encontrarme. 😊',
    'Gracias por escribir al CEE-UNI. Cuando necesites algo, solo escribime. ¡Éxitos!',
    '¡Listo! Quedo atento por si tenés más consultas. Que tengas un excelente día.',
    'Gracias por tu tiempo. Si más adelante cambias de opinión, estaremos encantados de ayudarte. ¡Saludos!',
    '¡Chau! Cualquier duda, acá estoy. No dudes en escribir cuando quieras.',
  ],
  handoff_urgent: [
    '¡Entendido! Tu consulta es urgente. En unos momentos un asesor se comunicará con vos. 📞',
    'Recibimos tu solicitud urgente. Un asesor te contactará a la brevedad. Mantenete atento.',
    'Gracias por tu paciencia. Estamos derivando tu caso a un asesor especializado que te atenderá de inmediato.',
    '¡Ya lo estamos gestionando! Un asesor te va a contactar apenas esté disponible. No te preocupes.',
  ],
  handoff_normal: [
    'Gracias por tu interés. Un asesor se comunicará con vos en las próximas 24 horas hábiles para darte toda la info que necesitás.',
    'Registramos tu solicitud. Un asesor del CEE-UNI te contactará pronto para ayudarte.',
    'Perfecto. Un asesor se pondrá en contacto con vos para darte atención personalizada.',
    '¡Listo! Ya quedaste registrado. En menos de 24 horas hábiles te contactamos. ¿Algo más mientras tanto?',
  ],
  confirm_data: [
    'Gracias. Confirmo tus datos:\n👤 *{{nombre}}*\n🆔 *{{dni}}*\n📞 *{{telefono}}*\n📧 *{{email}}*\n\n¿Todo está correcto?',
    'Perfecto, registramos tus datos. Confirmame:\n• Nombre: {{nombre}}\n• DNI: {{dni}}\n• Teléfono: {{telefono}}\n• Email: {{email}}',
    'Tus datos quedaron registrados. Verificá:\n🙋 {{nombre}}\n🆔 {{dni}}\n📱 {{telefono}}\n📧 {{email}}',
    '¡Ya casi terminamos! Confirmame que estos datos estén bien:\n\n*{{nombre}}* — {{dni}} — {{telefono}} — {{email}}',
  ],
  ask_more: [
    '¿Hay algo más en lo que pueda ayudarte?',
    '¿Necesitás info adicional sobre algún programa?',
    '¿Querés saber más de algo en particular?',
    '¿Algo más en lo que te pueda orientar?',
    '¿Seguimos con otra consulta o vamos viendo?',
    '¿Qué más te gustaría saber?',
  ],
  program_list: [
    'Estos son nuestros programas:\n\n*1.* Diplomado en Gestión de Proyectos\n*2.* Diplomado en Ciencia de Datos\n*3.* PEE en Transformación Digital\n*4.* PEE en Ciberseguridad\n*5.* Curso Taller de Power BI\n\n¿Cuál te gustaría conocer a detalle?',
    'Mirá lo que tenemos:\n📋 *Diplomados:* Gestión de Proyectos, Ciencia de Datos\n📋 *PEE:* Transformación Digital, Ciberseguridad\n📋 *Curso Taller:* Power BI\n\n¿Te interesa alguno en especial?',
    'Nuestra oferta académica:\n• Diplomados (Gestión de Proyectos, Ciencia de Datos)\n• PEE (Transformación Digital, Ciberseguridad)\n• Curso Power BI\n\n¿Sobre cuál querés más info?',
    'Acá va la lista completa. Elegí el que más te llame:\n\n*1.* Gestión de Proyectos\n*2.* Ciencia de Datos\n*3.* Transformación Digital\n*4.* Ciberseguridad\n*5.* Power BI\n\nRespondé con el número.',
  ],
  program_detail: [
    '*{{programa}}* — {{descripcion}}\n\nTipo: {{tipo}}\n\n¿Te gustaría inscribirte o recibir más detalles?',
    'Info de *{{programa}}*:\n{{descripcion}}\n\nEs un {{tipo}}. ¿Te interesa?',
    '*{{programa}}* ({{tipo}}): {{descripcion}}\n\n¿Querés que un asesor te dé más info?',
  ],
  program_detail_gestion: [
    'El *Diplomado en Gestión de Proyectos* te prepara para liderar bajo estándares *PMBOK* y metodologías *ágiles (Scrum)*. 6 meses, 240 horas, certificación UNI. ¿Te paso el brochure?',
    'Nuestro Diplomado en Gestión de Proyectos cubre PMBOK, Scrum, gestión de riesgos y liderazgo. *6 meses | 240h | semipresencial.* ¿Te interesa inscribirte?',
    'Si buscás liderar proyectos con estándares internacionales, este diplomado es para vos. PMBOK, ágil, gestión de equipos. *6 meses, 240h, cert. UNI.* ¿Querés saber más?',
    'Gestión de Proyectos: PMBOK, Scrum, stakeholders. *6 meses | 240h | cert. UNI.* ¿Te gustaría que un asesor te contacte?',
  ],
  program_detail_datos: [
    'El *Diplomado en Ciencia de Datos* te mete de lleno en Python, Machine Learning y visualización. *6 meses, 240 horas, certificación UNI.* ¿Te paso el temario?',
    'Dominá Python, ML y visualización con nuestro Diplomado en Ciencia de Datos. *6 meses | 240h | semipresencial.* Ideal si querés ser data-driven.',
    'Ciencia de Datos es el perfil más demandado. Python, Machine Learning, estadística, visualización. *6 meses, 240h, cert. UNI.* ¿Te interesa?',
    'Con Ciencia de Datos aprendés a extraer insights con Python, ML y dashboards. *6 meses | 240h.* ¡Preguntá por descuentos!',
  ],
  program_detail_transformacion: [
    'El *PEE en Transformación Digital* es para líderes que quieren impulsar el cambio digital. Industria 4.0, cloud, cultura ágil. *4 meses, 120h, cert. UNI.*',
    'Transformá tu organización: Industria 4.0, cloud, cultura ágil, estrategia digital. *4 meses | 120h.* ¿Te interesa?',
    'El PEE en Transformación Digital es ideal para gerentes y directores. *4 meses, 120h, cert. UNI.* ¿Querés el plan de estudios?',
    'Industria 4.0, cloud, cultura ágil. Herramientas para liderar el cambio. *4 meses | 120h.* ¡Contactanos!',
  ],
  program_detail_ciberseguridad: [
    'El *PEE en Ciberseguridad* te forma en ethical hacking, gestión de incidentes y normativas ISO 27001. *4 meses, 120 horas, cert. UNI.* Alta demanda laboral.',
    'Especializate en ciberseguridad: ethical hacking, ISO 27001, gestión de incidentes. *4 meses | 120h.* ¿Querés conocer los requisitos?',
    'La ciberseguridad es crítica. Aprendé ethical hacking, normativas y gestión de riesgos. *4 meses, 120h, cert. UNI.*',
    'Con Ciberseguridad aprendés a proteger activos digitales, pentesting, ISO 27001. *4 meses | 120h | cert. UNI.* ¿Te interesa?',
  ],
  program_detail_powerbi: [
    'El *Curso Taller de Power BI* te enseña dashboards interactivos, DAX y modelado de datos. *2 meses, 60 horas, certificación UNI.*',
    'Dominá Power BI en 2 meses: dashboards, DAX, modelado, visualización. *2 meses | 60h | presencial/virtual.* ¿Te anotás?',
    'Power BI es la herramienta #1 en BI. Nuestro curso te forma en DAX, modelado y dashboards. *2 meses, 60h, cert. UNI.* ¡Cupos limitados!',
    'Convertí datos en decisiones con Power BI. *2 meses | 60h | cert. UNI.* ¿Querés más info?',
  ],
  program_comparison: [
    'Si estás entre un *Diplomado* y un *PEE*, la diferencia está en el enfoque. Los diplomados (6 meses) son más profundos técnicamente. Los PEE (4 meses) son para ejecutivos que buscan visión estratégica. ¿Cuál se alinea más con vos?',
    'Los *Diplomados* son para especialización técnica profunda. Los *PEE* son para actualización estratégica. El *Curso de Power BI* es la opción rápida para una habilidad concreta. ¿Qué perfil tenés?',
    '¿No sabés cuál elegir? Diplomados: 6 meses, profundidad técnica. PEE: 4 meses, enfoque estratégico. Power BI: 2 meses, herramienta. Contame más de vos y te ayudo.',
  ],
  program_job_outlook: [
    'Los egresados de *{{programa}}* suelen trabajar como líderes, analistas o consultores. La certificación UNI abre puertas.',
    '*{{programa}}* te prepara para roles de alta demanda. Convenios con +50 empresas.',
    'Con *{{programa}}*, mejora salarial promedio del 30% en el primer año. ¿Querés conocer casos de éxito?',
  ],
  program_ideal_profile: [
    '*{{programa}}* es para profesionales con ganas de especializarse. No necesitás conocimientos previos, solo motivación.',
    'El perfil ideal de *{{programa}}*: ingenieros, administradores, profesionales que buscan potenciar su carrera con UNI.',
    '*{{programa}}* es para vos si tenés espíritu de mejora y querés destacar en tu organización.',
  ],
  program_benefits: [
    'Estudiar en el CEE-UNI: certificación universitaria, docentes ejecutivos, modalidad semipresencial, bolsa laboral y descuentos corporativos.',
    '¿Por qué el CEE-UNI? Prestigio UNI + enfoque práctico + networking + clases grabadas + bolsa laboral exclusiva.',
    'CEE-UNI: certificación con valor curricular, docentes del sector, horarios flexibles, material digital y descuentos.',
  ],
  faq_intro: [
    'Claro, puedo ayudarte con preguntas frecuentes. Las más comunes:\n\n💳 Medios de pago\n⏱ Duración de programas\n📜 Certificación',
    'Con gusto. Estas son las dudas más frecuentes:\n• ¿Cuánto duran los programas?\n• ¿Qué medios de pago aceptan?\n• ¿Dan certificación?',
    'Te cuento lo que más preguntan:\n• Aceptamos tarjetas, transferencias y yape/plin.\n• La duración varía (2 a 6 meses).\n• Todos los programas dan certificación UNI.',
  ],
  out_of_hours: [
    'Gracias por escribirnos. Nuestro horario es *lun-vie 9am-6pm* y *sáb 9am-1pm*. Un asesor te atenderá apenas retomemos.',
    'Estamos fuera de horario 😴 Te respondemos en cuanto abramos: lun-vie 9am-6pm, sáb 9am-1pm.',
    'Gracias por contactarnos. Nuestro horario: lun-vie 9-6, sáb 9-1. Te atendemos ni bien volvamos.',
  ],
  no_results: [
    'Lo siento, no encontré info sobre eso. ¿Probás con otras palabras o querés que te derive con un asesor?',
    'Disculpá, no tengo datos de tu consulta. ¿Te parece si te contacto con un asesor que pueda ayudarte mejor?',
    'No encontré resultados. Intentá con otras palabras o escribí *asesor* para hablar con alguien del equipo.',
  ],
  fallback: [
    'Gracias por tu mensaje. Estoy procesando tu consulta, dame un segundo.',
    'Gracias por tu paciencia. Déjame revisar la info para darte una respuesta precisa.',
    'Estoy revisando tu consulta. Mientras tanto, ¿te gustaría conocer nuestros programas?',
    'Un momento, porfa. Ya te respondo.',
  ],
  moderation_response: [
    'Soy el asistente profesional del *CEE-UNI*. ¿En qué puedo ayudarte con información académica?',
    'Estoy aquí para orientarte sobre nuestros programas y servicios del CEE-UNI. ¿En qué te ayudo?',
    'Soy el bot oficial del CEE-UNI. ¿Necesitás información sobre nuestros diplomados, PEE o cursos?',
  ],
  follow_up: [
    '¿Querés saber más sobre este programa? Preguntame lo que necesites.',
    '¿Te gustaría conocer requisitos, duración o salida laboral?',
    '¿Hay algo más de este programa que te interese?',
    '¿Seguimos con este programa o vemos otros?',
  ],
}

export const templates = {
  get(scenario: string, vars?: Record<string, string>): string {
    const options = TEMPLATES[scenario]
    if (!options || options.length === 0) {
      const fallbacks = TEMPLATES['fallback']
      return fallbacks[Math.floor(Math.random() * fallbacks.length)]
    }

    const index = rnd() % options.length
    let result = options[index]

    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      }
    }

    return result
  },
}
