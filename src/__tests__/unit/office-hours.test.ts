import { describe, it, expect } from 'vitest'
import { isOpen, nextOpenTime, outsideHoursMessage } from '../../services/office-hours.js'

function utc(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute))
}

describe('isOpen()', () => {
  it('Lunes 10am Lima → abierto', () => {
    expect(isOpen(utc(2026, 6, 22, 15, 0))).toBe(true)
  })

  it('Lunes 8am Lima → cerrado (antes de abrir)', () => {
    expect(isOpen(utc(2026, 6, 22, 13, 0))).toBe(false)
  })

  it('Lunes 6pm Lima → cerrado (hora exacta de cierre)', () => {
    expect(isOpen(utc(2026, 6, 22, 23, 0))).toBe(false)
  })

  it('Viernes 5:30pm Lima → abierto', () => {
    expect(isOpen(utc(2026, 6, 26, 22, 30))).toBe(true)
  })

  it('Viernes 6:30pm Lima → cerrado', () => {
    expect(isOpen(utc(2026, 6, 26, 23, 30))).toBe(false)
  })

  it('Sábado 10am Lima → abierto', () => {
    expect(isOpen(utc(2026, 6, 27, 15, 0))).toBe(true)
  })

  it('Sábado 1pm Lima → cerrado (hora exacta de cierre)', () => {
    expect(isOpen(utc(2026, 6, 27, 18, 0))).toBe(false)
  })

  it('Sábado 2pm Lima → cerrado', () => {
    expect(isOpen(utc(2026, 6, 27, 19, 0))).toBe(false)
  })

  it('Domingo 11am Lima → cerrado', () => {
    expect(isOpen(utc(2026, 6, 28, 16, 0))).toBe(false)
  })

  it('medianoche Lima (00:00) → cerrado', () => {
    expect(isOpen(utc(2026, 6, 23, 5, 0))).toBe(false)
  })
})

describe('nextOpenTime()', () => {
  it('lunes 8am → devuelve lunes 9am (mismo día)', () => {
    const next = nextOpenTime(utc(2026, 6, 22, 13, 0))
    expect(next.getUTCDay()).toBe(1) // lunes
    expect(next.getUTCHours()).toBe(14) // 14 UTC = 9am Lima
  })

  it('viernes 7pm → devuelve sábado 9am', () => {
    const next = nextOpenTime(utc(2026, 6, 27, 0, 0))
    expect(next.getUTCDay()).toBe(6) // sábado
    expect(next.getUTCHours()).toBe(14) // 14 UTC = 9am Lima
  })

  it('sábado 2pm → devuelve lunes 9am', () => {
    const next = nextOpenTime(utc(2026, 6, 27, 19, 0))
    expect(next.getUTCDay()).toBe(1) // lunes
    expect(next.getUTCHours()).toBe(14) // 14 UTC = 9am Lima
  })

  it('domingo → devuelve lunes 9am', () => {
    const next = nextOpenTime(utc(2026, 6, 28, 18, 0))
    expect(next.getUTCDay()).toBe(1) // lunes
    expect(next.getUTCHours()).toBe(14) // 14 UTC = 9am Lima
  })
})

describe('outsideHoursMessage()', () => {
  it('contiene "lunes a viernes"', () => {
    const msg = outsideHoursMessage()
    expect(msg).toContain('lunes a viernes')
  })

  it('contiene "9:00 a.m."', () => {
    const msg = outsideHoursMessage()
    expect(msg).toContain('9:00 a.m.')
  })

  it('contiene "6:00 p.m."', () => {
    const msg = outsideHoursMessage()
    expect(msg).toContain('6:00 p.m.')
  })

  it('menciona un día de la semana', () => {
    const msg = outsideHoursMessage()
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const found = days.some(d => msg.toLowerCase().includes(d))
    expect(found).toBe(true)
  })
})
