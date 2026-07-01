export interface Program {
  id: string
  name: string
  type: 'Diplomado' | 'PEE' | 'Curso' | 'In-House'
  description: string
  brochureFile: string | null
}

export const programs: Program[] = [
  {
    id: 'prog-01',
    name: 'Diplomado en Gestión de Proyectos',
    type: 'Diplomado',
    description: 'Metodologías ágiles, PMBOK, gestión de riesgos y liderazgo de equipos.',
    brochureFile: 'brochure-gestion-proyectos.pdf',
  },
  {
    id: 'prog-02',
    name: 'Diplomado en Ciencia de Datos',
    type: 'Diplomado',
    description: 'Machine Learning, Python, visualización y toma de decisiones basada en datos.',
    brochureFile: 'brochure-ciencia-datos.pdf',
  },
  {
    id: 'prog-03',
    name: 'PEE en Transformación Digital',
    type: 'PEE',
    description: 'Estrategia digital, Industria 4.0, cultura organizacional ágil.',
    brochureFile: 'brochure-transformacion-digital.pdf',
  },
  {
    id: 'prog-04',
    name: 'PEE en Ciberseguridad',
    type: 'PEE',
    description: 'Ethical hacking, gestión de incidentes, normativas ISO 27001.',
    brochureFile: 'brochure-ciberseguridad.pdf',
  },
  {
    id: 'prog-05',
    name: 'Curso Taller de Power BI',
    type: 'Curso',
    description: 'Dashboards interactivos, DAX, modelado de datos para ejecutivos.',
    brochureFile: null,
  },
]
