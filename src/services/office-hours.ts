const LIMA_OFFSET = -5

const SCHEDULE: { day: number; start: number; end: number }[] = [
  { day: 1, start: 9, end: 18 },
  { day: 2, start: 9, end: 18 },
  { day: 3, start: 9, end: 18 },
  { day: 4, start: 9, end: 18 },
  { day: 5, start: 9, end: 18 },
  { day: 6, start: 9, end: 13 },
]

function getLimaHour(date: Date): number {
  return date.getUTCHours() + LIMA_OFFSET
}

function getLimaDay(date: Date): number {
  const localHour = getLimaHour(date)
  if (localHour < 0) return ((date.getUTCDay() + 6) % 7) || 7
  if (localHour >= 24) return (date.getUTCDay() % 7) + 1
  return date.getUTCDay() || 7
}

export function isOpen(date: Date = new Date()): boolean {
  const day = getLimaDay(date)
  const hour = getLimaHour(date)
  const todaySchedule = SCHEDULE.find(s => s.day === day)
  if (!todaySchedule) return false
  const normalizedHour = ((hour % 24) + 24) % 24
  return normalizedHour >= todaySchedule.start && normalizedHour < todaySchedule.end
}

export function nextOpenTime(date: Date = new Date()): Date {
  const current = new Date(date)
  for (let offset = 0; offset < 7 * 24 * 60; offset += 1) {
    const check = new Date(current.getTime() + offset * 60 * 1000)
    const day = getLimaDay(check)
    const normalizedHour = ((getLimaHour(check) % 24) + 24) % 24
    const schedule = SCHEDULE.find(s => s.day === day && normalizedHour < s.end)
    if (schedule) {
      const result = new Date(check)
      if (normalizedHour < schedule.start) {
        result.setUTCHours(schedule.start - LIMA_OFFSET, 0, 0, 0)
      }
      return result
    }
  }
  return current
}

export function outsideHoursMessage(): string {
  const next = nextOpenTime()
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const limaDay = getLimaDay(next)
  const limaHour = getLimaHour(next)
  const dayName = days[limaDay % 7]
  const normalizedHour = ((limaHour % 24) + 24) % 24
  const hours = `${String(Math.floor(normalizedHour)).padStart(2, '0')}:00`
  return `En este momento nos encontramos fuera de nuestro horario de atención.\n\nNuestro equipo está disponible de *lunes a viernes de 9:00 a.m. a 6:00 p.m.* y *sábados de 9:00 a.m. a 1:00 p.m.*\n\nTe contactaremos el próximo *${dayName}* a partir de las *${hours}*. Mientras tanto, dime en qué programa estás interesado y te lo anoto.`
}
