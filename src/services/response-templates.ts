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
