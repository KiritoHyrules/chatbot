type ObjectionType = 'precio' | 'tiempo' | 'confianza' | 'competencia' | 'calidad' | 'compromiso'

const OBJECTIONS: { type: ObjectionType; patterns: RegExp[]; counters: string[] }[] = [
  {
    type: 'precio',
    patterns: [
      /muy caro/i, /no me alcanza/i, /costoso/i, /excede mi presupuesto/i,
      /no tengo dinero/i, /es demasiado/i, /no puedo pagar eso/i,
    ],
    counters: [
      'Entiendo tu preocupación por el precio. Tenemos opciones de financiamiento en cuotas sin intereses que pueden ajustarse a tu bolsillo. ¿Te gustaría que te explique las alternativas?',
      'El valor de nuestros programas incluye certificación universitaria y materiales actualizados. Además, ofrecemos descuentos por pronto pago y convenios corporativos. ¿Qué tal si te cuento más?',
      'Muchos de nuestros alumnos pensaban igual al inicio, pero encontraron que la inversión vale la pena por la calidad académica y el respaldo de la UNI. ¿Podemos agendar una llamada para detallarte los beneficios?',
    ],
  },
  {
    type: 'tiempo',
    patterns: [
      /no tengo tiempo/i, /horarios/i, /muy lejos/i, /no puedo ese d[ií]a/i,
      /no me da tiempo/i, /muy ocupado/i, /trabajo hasta tarde/i,
    ],
    counters: [
      'Entendemos que tu tiempo es valioso. Por eso ofrecemos modalidades presencial, virtual y semipresencial para que elijas la que mejor se adapte a tu rutina. ¿Cuál te acomoda más?',
      'Nuestros programas tienen horarios flexibles, incluyendo fines de semana y turnos noche. ¿Qué días y horarios te gustaría ver?',
      'La mayoría de nuestros alumnos también trabaja y logran completar el programa sin problema. Las clases quedan grabadas por si no puedes asistir a alguna sesión. ¿Te gustaría conocer los horarios disponibles?',
    ],
  },
  {
    type: 'confianza',
    patterns: [
      /es confiable/i, /estafa/i, /no conozco/i, /qui[eé]n los respalda/i,
      /es seguro/i, /tienen experiencia/i, /son serios/i, /es verdad/i,
    ],
    counters: [
      'Somos el Centro de Educación Ejecutiva de la Universidad Nacional de Ingeniería, con más de 15 años formando profesionales. Puedes verificar nuestra trayectoria en la página oficial de la UNI.',
      'Entiendo tu cautela. Te invito a revisar las opiniones de nuestros egresados y las empresas que confían en nosotros. ¿Te comparto algunos testimonios?',
      'La UNI es una de las universidades más prestigiosas del país, y nuestro centro está acreditado por SUNEDU. La confianza de más de 5000 egresados nos respalda.',
    ],
  },
  {
    type: 'competencia',
    patterns: [
      /en (otro|X) lugar es m[aá]s barato/i, /ya estoy en otro/i,
      /me recomendaron (otro|Y)/i, /en (otra|X) (parte|institución|escuela) es m[aá]s/i,
      /all[ií] es m[aá]s barato/i, /conozco otro m[aá]s econ[oó]mico/i,
    ],
    counters: [
      'Entiendo que compares opciones. Nuestro diferencial está en la certificación de la UNI, el enfoque práctico y los docentes que son ejecutivos en activo. ¿Qué es lo más importante para ti al elegir un programa?',
      'Cada institución tiene su enfoque. En el CEE-UNI ofrecemos una combinación única de rigor académico, networking con profesionales del sector y acceso a la bolsa laboral corporativa. ¿Te gustaría conocer más detalles?',
      'Valoro que investigues otras alternativas. Te sugiero comparar el plan de estudios, los docentes y la certificación. ¿Qué tal si te envío el temario detallado para que evalúes la calidad?',
    ],
  },
  {
    type: 'calidad',
    patterns: [
      /vale la pena/i, /es bueno/i, /tienen experiencia/i,
      /qu[eé] tal es/i, /es recomendable/i, /sirve de algo/i,
    ],
    counters: [
      'Nuestros programas son diseñados y dictados por profesionales con amplia experiencia en el sector. Además, la certificación tiene el respaldo de la UNI. ¿Te gustaría ver el perfil de algunos docentes?',
      'La calidad de nuestros programas se refleja en la tasa de empleabilidad de nuestros egresados: más del 85% mejora su posición laboral dentro de los 6 meses de culminado el programa.',
      'Tenemos convenios con más de 50 empresas que reconocen nuestros certificados. ¿Te interesa algún programa en particular para contarte más sobre su contenido?',
    ],
  },
  {
    type: 'compromiso',
    patterns: [
      /lo voy a pensar/i, /despu[eé]s te confirmo/i, /d[eé]jame consultar/i,
      /lo voy a ver/i, /m[aá]s tarde te escribo/i, /d[eé]jame pensarlo/i,
      /lo evaluar[eé]/i, /lo consulto con/i,
    ],
    counters: [
      'Por supuesto, tómate tu tiempo. Mientras tanto, ¿te comparto el brochure del programa para que lo revises con calma?',
      'Entiendo totalmente. Solo te comento que los cupos son limitados y algunos programas ya están por cerrar. ¿Hay algo en particular sobre lo que tengas dudas para ayudarte a decidir?',
      'Claro, no hay problema. Aprovecho para contarte que tenemos un descuento especial por inscripción anticipada. ¿Te interesaría saber los detalles para que lo consideres?',
    ],
  },
]

export const objectionDetector = {
  detect(message: string): {
    type: string
    confidence: 'ALTA' | 'MEDIA'
    counter: string
  } | null {
    const text = message.toLowerCase().trim()

    for (const objection of OBJECTIONS) {
      let matches = 0
      for (const pattern of objection.patterns) {
        if (pattern.test(text)) {
          matches++
        }
      }
      if (matches > 0) {
        const confidence: 'ALTA' | 'MEDIA' = matches >= 2 ? 'ALTA' : 'MEDIA'
        const counter = objection.counters[Math.floor(Math.random() * objection.counters.length)]
        return { type: objection.type, confidence, counter }
      }
    }

    return null
  },
}
