import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getEventDays, isMultiDay, parseDays, parseAmounts, parseCheckinDays,
  formatDayLine, formatDateRange, defaultCheckinDay, checkedInOn, formatHour,
} from '@/lib/eventDays';
import { isConfirmado, situacaoPresenca } from '@/types/event';

describe('dias do evento', () => {
  it('evento antigo de um dia usa date/time', () => {
    expect(getEventDays({ days: [], date: '2026-11-07', time: '19:30' })).toEqual([{ date: '2026-11-07', start: '19:30' }]);
    expect(isMultiDay({ days: [], date: '2026-11-07', time: '19:30' })).toBe(false);
  });

  it('ordena os dias e detecta vários dias', () => {
    const days = [{ date: '2026-11-09', start: '09:00' }, { date: '2026-11-07', start: '19:30' }];
    expect(getEventDays({ days }).map(d => d.date)).toEqual(['2026-11-07', '2026-11-09']);
    expect(isMultiDay({ days })).toBe(true);
  });

  it('ignora lixo vindo do banco', () => {
    expect(parseDays(null)).toEqual([]);
    expect(parseDays([{ date: '2026-11-07', start: '19:30' }, { foo: 1 }, { date: '' }])).toEqual([{ date: '2026-11-07', start: '19:30', end: undefined }]);
    expect(parseAmounts([20, '50', -1, 'x'])).toEqual([20, 50]);
    expect(parseCheckinDays([])).toEqual({});
    expect(parseCheckinDays({ '2026-11-07': '2026-11-07T22:00:00Z', x: 3 })).toEqual({ '2026-11-07': '2026-11-07T22:00:00Z' });
  });

  it('formata datas em português', () => {
    expect(formatDayLine({ date: '2026-11-07', start: '19:30' })).toBe('Sáb, 7 de nov · 19h30');
    expect(formatDayLine({ date: '2026-11-08', start: '09:00', end: '12:00' })).toBe('Dom, 8 de nov · 9h às 12h');
    expect(formatDateRange([{ date: '2026-11-07', start: '' }, { date: '2026-11-09', start: '' }])).toBe('7 a 9 de novembro de 2026');
  });
});

describe('dia padrão do check-in', () => {
  afterEach(() => vi.useRealTimers());
  const days = [{ date: '2026-11-07', start: '' }, { date: '2026-11-08', start: '' }];

  it('abre no dia de hoje', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-08T10:00:00'));
    expect(defaultCheckinDay(days)).toBe('2026-11-08');
  });
  it('antes do evento abre no primeiro dia', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T10:00:00'));
    expect(defaultCheckinDay(days)).toBe('2026-11-07');
  });
  it('depois do evento abre no último dia', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-01T10:00:00'));
    expect(defaultCheckinDay(days)).toBe('2026-11-08');
  });
});

describe('presença e contribuição', () => {
  it('check-in por dia só vale no dia marcado', () => {
    const g = { checkedIn: true, checkinDays: { '2026-11-07': 'x' } };
    expect(checkedInOn(g, '2026-11-07', true)).toBe(true);
    expect(checkedInOn(g, '2026-11-08', true)).toBe(false);
    expect(checkedInOn(g, '', false)).toBe(true);
  });

  it('contribuição prometida já garante a vaga', () => {
    expect(isConfirmado({ paymentStatus: 'pledged' })).toBe(true);
    expect(situacaoPresenca({ presenceStatus: 'confirmed', paymentStatus: 'pledged' })).toBe('confirmado');
    expect(situacaoPresenca({ presenceStatus: 'confirmed', paymentStatus: 'pending' })).toBe('inscrito');
  });
});

describe('programação do dia', () => {
  it('ordena por horário, ignora itens vazios e mantém sem horário no fim', () => {
    const [d] = parseDays([{ date: '2026-10-24', start: '13:00', sessions: [
      { time: '16:00', title: 'Sessão 3' }, { time: '', title: 'Encerramento' }, { time: '13:00', title: 'Abertura' }, { time: '14:00', title: '  ' },
    ] }]);
    expect(d.sessions).toEqual([
      { time: '13:00', title: 'Abertura' }, { time: '16:00', title: 'Sessão 3' }, { time: '', title: 'Encerramento' },
    ]);
  });
  it('formata horas', () => {
    expect(formatHour('19:00')).toBe('19h');
    expect(formatHour('09:30')).toBe('9h30');
    expect(formatHour('')).toBe('');
  });
});
