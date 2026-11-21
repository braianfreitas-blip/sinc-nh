import type { EventDay, EventSession, Guest } from '@/types/event';

// Dias de um evento. Eventos antigos/de um dia não têm `days`: usamos date/time.
export function getEventDays(ev: { days?: EventDay[]; date?: string; time?: string }): EventDay[] {
  const days = (ev.days || []).filter(d => d && d.date);
  if (days.length > 0) return [...days].sort((a, b) => a.date.localeCompare(b.date));
  if (ev.date) return [{ date: ev.date, start: ev.time || '' }];
  return [];
}

export const isMultiDay = (ev: { days?: EventDay[]; date?: string; time?: string }) => getEventDays(ev).length > 1;

// Converte o valor bruto vindo do banco (jsonb) em lista de dias válida.
export function parseDays(raw: unknown): EventDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d: any) => d && typeof d.date === 'string' && d.date)
    .map((d: any) => {
      const day: EventDay = { date: d.date, start: typeof d.start === 'string' ? d.start : '', end: typeof d.end === 'string' && d.end ? d.end : undefined };
      const sessions = parseSessions(d.sessions);
      if (sessions.length > 0) day.sessions = sessions;
      return day;
    });
}

// Programação do dia: itens com título, ordenados pelo horário.
export function parseSessions(raw: unknown): EventSession[] {
  if (!Array.isArray(raw)) return [];
  return sortSessions(
    raw
      .filter((x: any) => x && typeof x.title === 'string' && x.title.trim())
      .map((x: any) => ({ time: typeof x.time === 'string' ? x.time : '', title: x.title.trim() })),
  );
}

export function sortSessions(list: EventSession[]) {
  // Itens sem horário ficam no fim, na ordem em que foram escritos.
  return list
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (a.x.time || '99:99').localeCompare(b.x.time || '99:99') || a.i - b.i)
    .map(({ x }) => x);
}

// "19:00" -> "19h", "20:30" -> "20h30"
export function formatHour(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':');
  return m && m !== '00' ? `${Number(h)}h${m}` : `${Number(h)}h`;
}

export const hasProgram = (days: EventDay[]) => days.some(d => (d.sessions?.length ?? 0) > 0);

export function parseAmounts(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(Number).filter(n => Number.isFinite(n) && n > 0);
}

export function parseCheckinDays(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

const toDate = (iso: string) => new Date(iso + 'T00:00');

function horario(d: EventDay) {
  if (!d.start) return '';
  const fmt = (t: string) => t.replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
  return d.end ? `${fmt(d.start)} às ${fmt(d.end)}` : fmt(d.start);
}

// "Sex, 7 de nov · 19h30"
export function formatDayLine(d: EventDay) {
  const dia = toDate(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  const limpo = dia.replace(/\./g, '').replace(/^\w/, c => c.toUpperCase());
  const h = horario(d);
  return h ? `${limpo} · ${h}` : limpo;
}

// Curto, para listas: "7 a 9 de novembro de 2026" / "7 de nov a 2 de dez de 2026"
export function formatDateRange(days: EventDay[]) {
  if (days.length === 0) return '';
  const first = toDate(days[0].date);
  const last = toDate(days[days.length - 1].date);
  if (days.length === 1) return first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const mesmoMes = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
  if (mesmoMes) {
    return `${first.getDate()} a ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')} a ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')}`;
}

// Data de hoje no fuso local, AAAA-MM-DD.
export function todayISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Dia que o check-in deve abrir: hoje, se for um dia do evento; senão o próximo; senão o último.
export function defaultCheckinDay(days: EventDay[]) {
  if (days.length === 0) return '';
  const hoje = todayISO();
  return (days.find(d => d.date === hoje) || days.find(d => d.date > hoje) || days[days.length - 1]).date;
}

// Presença em um dia específico. Para eventos de um dia, vale o check-in normal.
export function checkedInOn(g: Pick<Guest, 'checkedIn' | 'checkinDays'>, day: string, multi: boolean) {
  return multi ? !!g.checkinDays?.[day] : g.checkedIn;
}

export const DEFAULT_CONTRIBUTION_MESSAGE =
  'Este evento não tem valor fixo de inscrição. Ainda assim, incentivamos a oferta voluntária, ' +
  'que ajuda a cobrir os custos do evento.\n\n' +
  'A contribuição é feita via PIX e, caso deseje ofertar, não é necessário enviar o comprovante. ' +
  'Sua inscrição já está garantida! 🤍';

export const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
