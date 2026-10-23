// Fechas de «solo día» (vencimiento de facturas, fecha de reunión…): no deben correrse un día en zonas al oeste de UTC.
import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { parseDay, formatDay, todayLocal, monthLocal, isPastDay } from '../src/lib/dateOnly.js';

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => { if (ORIGINAL_TZ === undefined) delete process.env.TZ; else process.env.TZ = ORIGINAL_TZ; });

describe.each(['America/Panama', 'America/Bogota', 'America/Mexico_City', 'America/Argentina/Buenos_Aires'])('zona %s', (tz) => {
  it('el fallo de siempre: new Date("AAAA-MM-DD") cae en el día anterior', () => {
    process.env.TZ = tz;
    expect(new Date('2026-10-09').getDate()).toBe(8);               // así se mostraba 8/10 para un vencimiento del 9/10
    expect(new Date('2026-01-01').getFullYear()).toBe(2025);        // y una factura del 1 de enero mostraba el año anterior
  });
  it('parseDay lee el día calendario tal cual', () => {
    process.env.TZ = tz;
    const d = parseDay('2026-10-09');
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 9]);
    expect(parseDay('2026-01-01').getFullYear()).toBe(2026);
    expect(parseDay('2026-12-31').getDate()).toBe(31);
  });
  it('formatDay muestra el mismo día en cualquier formato de fecha', () => {
    process.env.TZ = tz;
    expect(formatDay('2026-10-09', 'es', { day: 'numeric', month: 'short' })).toBe('9 oct');
    expect(formatDay('2026-10-09', 'es-CO')).toBe('9/10/2026');   // el formato día/mes/año que ve tu equipo
    expect(formatDay('2026-03-01', 'es', { day: 'numeric', month: 'long' })).toBe('1 de marzo');
  });
});

describe('casos límite', () => {
  it('al este de UTC tampoco cambia (el día sigue siendo el mismo)', () => {
    process.env.TZ = 'Europe/Madrid';
    expect(parseDay('2026-10-09').getDate()).toBe(9);
    expect(formatDay('2026-10-09', 'es-ES')).toBe('9/10/2026');
  });
  it('un valor con hora (fecha y hora) se interpreta como siempre, no se toca', () => {
    process.env.TZ = 'America/Panama';
    const iso = '2026-10-09T15:30:00.000Z';
    expect(parseDay(iso).getTime()).toBe(new Date(iso).getTime());
    expect(parseDay('2026-10-09T02:00:00+00:00').getDate()).toBe(8); // 21:00 del 8 en Panamá: correcto para un instante
  });
  it('vacío o inválido → null / «—», sin romper la pantalla', () => {
    expect(parseDay(null)).toBeNull(); expect(parseDay('')).toBeNull(); expect(parseDay('no es fecha')).toBeNull();
    expect(formatDay(null)).toBe('—'); expect(formatDay(undefined)).toBe('—'); expect(formatDay('xx')).toBe('—');
  });
  it('el cálculo de «días para el cierre» usa el día local', () => {
    process.env.TZ = 'America/Panama';
    const hoy = new Date(2026, 9, 22, 20, 0, 0);               // 22/10 a las 8 p. m.
    const dias = Math.round((parseDay('2026-10-23').getTime() - hoy.getTime()) / 86400000);
    expect(dias).toBe(0);                                      // mañana a medianoche local está a 4 h: «es hoy», no «en 1 d»
  });
});

// ── «Hoy» según el reloj de quien usa el CRM (antes: UTC, que en Panamá ya es «mañana» desde las 7 p. m.) ──────
describe('hoy, este mes y «ya pasó» en la tarde-noche de Panamá', () => {
  afterEach(() => { vi.useRealTimers(); });
  const a_las_830_pm_del_22 = () => { process.env.TZ = 'America/Panama'; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-23T01:30:00Z')); }; // 20:30 del 22/10 en Panamá

  it('todayLocal da el día de Panamá (22), no el de UTC (23)', () => {
    a_las_830_pm_del_22();
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-10-23');   // el cálculo viejo
    expect(todayLocal()).toBe('2026-10-22');
    expect(monthLocal()).toBe('2026-10');
  });
  it('último día del mes por la noche: sigue siendo ese mes', () => {
    process.env.TZ = 'America/Panama'; vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T03:00:00Z')); // 22:00 del 31/10
    expect(new Date().toISOString().slice(0, 7)).toBe('2026-11');
    expect(monthLocal()).toBe('2026-10');
  });
  it('isPastDay: una fecha de solo día vence cuando termina ese día', () => {
    a_las_830_pm_del_22();
    expect(isPastDay('2026-10-22')).toBe(false);   // hoy: no está vencido
    expect(isPastDay('2026-10-23')).toBe(false);
    expect(isPastDay('2026-10-21')).toBe(true);
    expect(isPastDay(null)).toBe(false); expect(isPastDay('basura')).toBe(false);
  });
  it('isPastDay: con hora se compara con el instante actual, como siempre', () => {
    a_las_830_pm_del_22();
    expect(isPastDay('2026-10-22T20:00:00-05:00')).toBe(true);   // 8:00 p. m.: ya pasó
    expect(isPastDay('2026-10-22T21:00:00-05:00')).toBe(false);  // 9:00 p. m.: todavía no
  });
  it('el formulario «Nueva factura» propone la fecha de HOY (22) a las 8:30 p. m., no la de mañana', async () => {
    a_las_830_pm_del_22(); vi.useRealTimers();                    // el reloj queda congelado en la fecha, sin bloquear los temporizadores
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-23T01:30:00Z'));
    vi.doMock('../src/lib/api', () => ({ api: { get: async () => [], post: async () => ({}) } }));
    const { default: NewInvoiceModal } = await import('../src/components/NewInvoiceModal.jsx');
    render(<NewInvoiceModal onClose={() => {}} onCreated={() => {}} />);
    expect(screen.getByLabelText('Fecha de emisión').value).toBe('2026-10-22');
    cleanup();
  });
});
