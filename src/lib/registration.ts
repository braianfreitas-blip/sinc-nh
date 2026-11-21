import { supabase } from '@/integrations/supabase/client';

// Fala com a função do servidor `registration` (supabase/functions/registration).

export interface PixOrder {
  id: string;
  provider: string;
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'refunded';
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expiresAt: string | null;
  guestIds: string[];
}

export interface RegisterResult {
  groupId: string;
  guests: any[];
  waitlist: boolean;
  courtesyApplied: number;
  amount: number;
  provider: string;
  order: PixOrder | null;
  paymentError: string | null;
}

export interface ProviderConfig {
  id: 'mercadopago' | 'stripe';
  label: string;
  configured: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('registration', { body });
  if (error) {
    // Erros 400 trazem a mensagem amigável no corpo da resposta.
    let msg = 'Não conseguimos concluir agora. Tente de novo em instantes.';
    try {
      const ctx = (error as any).context;
      const parsed = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (parsed?.error) msg = parsed.error;
    } catch { /* mantém a mensagem padrão */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

export const registerGroup = (input: {
  eventId: string;
  contact: { phone: string; email?: string; invitedBy?: string };
  people: { firstName: string; lastName: string }[];
  courtesyCode?: string;
}) => call<RegisterResult>({ action: 'register', ...input });

// guestId = qualquer pessoa do grupo (o responsável tem id = groupId).
export const payGroup = (guestId: string) => call<{ order: PixOrder | null }>({ action: 'pay', guestId });

export const fetchGroup = (guestId: string) =>
  call<{ groupId: string; members: any[]; order: PixOrder | null }>({ action: 'group', guestId });

export const orderStatus = (orderId: string) => call<{ order: PixOrder }>({ action: 'status', orderId });

export const providersConfig = () => call<{ providers: ProviderConfig[] }>({ action: 'config' });

// Código de cortesia fácil de ditar: sem 0/O, 1/I.
export function generateCourtesyCode(prefix = 'GRACA') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return `${prefix}-${Array.from(arr, n => chars[n % chars.length]).join('')}`;
}
