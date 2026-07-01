export const validLead = {
  name: 'María López García',
  dni: '12345678',
  phone: '51987654321',
  email: 'maria@ejemplo.com',
  programInterest: 'Diplomado en Ciencia de Datos',
}

export const validLead2 = {
  name: 'Carlos Mendoza Ruiz',
  dni: '22222222',
  phone: '51999888777',
  email: 'carlos@test.com',
  programInterest: 'PEE en Ciberseguridad',
}

export const invalidLead = {
  name: 'A',
  dni: '12',
  phone: '123',
  email: 'noemail',
  programInterest: null,
}

export const classifierMessages: Record<string, string> = {
  matriculado_1: 'Ya pagué el diplomado',
  matriculado_2: 'Listo, ya transferí el dinero',
  matriculado_3: 'Aquí te envío la captura del pago',
  matriculado_4: 'Ya hice el depósito en el banco',
  matriculado_5: 'Acabo de yapear, aquí está el voucher',

  propuesta_1: 'Pásame el link de pago por favor',
  propuesta_2: '¿A qué cuenta bancaria puedo depositar?',
  propuesta_3: 'Envíame el formato de matrícula para llenarlo',
  propuesta_4: '¿Cómo puedo pagar el diplomado?',
  propuesta_5: 'Dame el número de cuenta para transferir',

  negociacion_1: '¿Me pueden llamar a las 5pm?',
  negociacion_2: 'Quiero agendar una entrevista con el asesor',
  negociacion_3: '¿Tienen opción de pagar en cuotas?',
  negociacion_4: '¿Hay descuento por grupo de 3 personas?',
  negociacion_5: 'Necesito validar si cumplo los requisitos del perfil',

  no_interesado_1: 'No gracias, no me interesa',
  no_interesado_2: 'Está muy caro, no puedo pagar ese monto',
  no_interesado_3: 'No me alcanza el presupuesto, disculpa',
  no_interesado_4: 'Por favor bórrenme de la lista de contactos',
  no_interesado_5: 'Ya me matriculé en otra universidad, gracias',

  interesado_1: 'Me interesa el diplomado en ciencia de datos',
  interesado_2: '¿Cuánto cuesta el curso de Power BI?',
  interesado_3: 'Quiero más información del programa por favor',
  interesado_4: '¿Qué horarios tienen disponibles?',
  interesado_5: 'Envíame el temario del diplomado por favor',

  neutro_1: 'Hola',
  neutro_2: 'Buenas tardes',
  neutro_3: 'Ok',
  neutro_4: '👍',
  neutro_5: 'Gracias',
}
