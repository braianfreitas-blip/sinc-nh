// Regras de cobrança compartilhadas pelas funções `registration` e pelos webhooks.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { getProvider, type ChargeStatus } from './payments/index.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY')!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Pix vale por 40 minutos (o Mercado Pago exige no mínimo 30); depois a pessoa gera outro.
export const PIX_MINUTES = 40;

export interface OrderRow {
  id: string;
  event_id: string;
  group_id: string;
  guest_ids: string[];
  provider: string;
  provider_payment_id: string | null;
  amount: number;
  status: string;
  pix_qr_code: string | null;
  pix_qr_code_base64: string | null;
  ticket_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
}

// O que o navegador pode ver de uma cobrança.
export function publicOrder(o: OrderRow) {
  return {
    id: o.id,
    provider: o.provider,
    amount: Number(o.amount),
    status: o.status,
    qrCode: o.pix_qr_code,
    qrCodeBase64: o.pix_qr_code_base64,
    ticketUrl: o.ticket_url,
    expiresAt: o.expires_at,
    guestIds: o.guest_ids,
  };
}

const UNPAID = ['pending', 'partial'];

/**
 * Cria (ou reaproveita, se ainda válido) o Pix do grupo para quem ainda não pagou.
 * Devolve null quando não há nada a cobrar.
 */
export async function createOrderForGroup(db: SupabaseClient, event: any, groupId: string): Promise<OrderRow | null> {
  const provider = getProvider(event.payment_provider);
  if (!provider) return null;
  if (!provider.isConfigured()) throw new Error(`${provider.label} ainda não está configurado.`);

  const { data: guests, error } = await db
    .from('guests')
    .select('*')
    .eq('group_id', groupId)
    .eq('event_id', event.id)
    .neq('presence_status', 'cancelled')
    .neq('presence_status', 'waitlist')
    .in('payment_status', UNPAID);
  if (error) throw error;
  const toPay = (guests ?? []).filter((g: any) => Number(g.amount_due) - Number(g.amount_paid) > 0);
  if (toPay.length === 0) return null;

  const amount = Math.round(toPay.reduce((s: number, g: any) => s + Number(g.amount_due) - Number(g.amount_paid), 0) * 100) / 100;
  const guestIds = toPay.map((g: any) => g.id).sort();

  // Reaproveita um Pix pendente do mesmo grupo e valor que ainda não venceu.
  const { data: existing } = await db
    .from('payment_orders')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  const prev = existing?.[0] as OrderRow | undefined;
  if (
    prev && Number(prev.amount) === amount && prev.provider === provider.id &&
    [...prev.guest_ids].sort().join() === guestIds.join() &&
    prev.expires_at && new Date(prev.expires_at).getTime() - Date.now() > 2 * 60 * 1000
  ) {
    return prev;
  }
  if (prev) await db.from('payment_orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', prev.id);

  const leader = toPay.find((g: any) => g.id === groupId) ?? toPay[0];
  const email = (toPay.find((g: any) => g.email)?.email as string | undefined) ?? '';
  if (!email) throw new Error('Informe um e-mail para gerar o Pix.');

  const { data: order, error: insErr } = await db
    .from('payment_orders')
    .insert({ event_id: event.id, group_id: groupId, guest_ids: guestIds, provider: provider.id, amount, status: 'pending' })
    .select()
    .single();
  if (insErr) throw insErr;

  const expiresAt = new Date(Date.now() + PIX_MINUTES * 60 * 1000);
  const label = event.ticket_label || 'Ingresso';
  try {
    const charge = await provider.createPix({
      orderId: order.id,
      amount,
      description: `${event.name} - ${label} (${toPay.length} ${toPay.length === 1 ? 'pessoa' : 'pessoas'})`,
      payer: { email, firstName: leader.first_name, lastName: leader.last_name || '-' },
      expiresAt,
      notificationUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/${provider.id}-webhook`,
    });
    const { data: saved, error: upErr } = await db
      .from('payment_orders')
      .update({
        provider_payment_id: charge.providerPaymentId,
        pix_qr_code: charge.qrCode,
        pix_qr_code_base64: charge.qrCodeBase64 ?? null,
        ticket_url: charge.ticketUrl ?? null,
        expires_at: charge.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();
    if (upErr) throw upErr;
    return saved as OrderRow;
  } catch (err) {
    await db.from('payment_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id);
    throw err;
  }
}

/**
 * Consulta o provedor e atualiza a cobrança e os convidados.
 * É a única forma de um pagamento virar "Pago" automaticamente: sempre
 * conferimos direto no provedor, nunca confiamos só no aviso recebido.
 */
export async function reconcileOrder(db: SupabaseClient, order: OrderRow): Promise<OrderRow> {
  if (order.status !== 'pending' || !order.provider_payment_id) return order;
  const provider = getProvider(order.provider);
  if (!provider || !provider.isConfigured()) return order;

  const info = await provider.getCharge(order.provider_payment_id);
  let status: ChargeStatus = info.status;
  if (status === 'paid' && Math.abs(info.amount - Number(order.amount)) > 0.009) {
    console.error('Valor pago diferente do cobrado', order.id, info.amount, order.amount);
    status = 'failed';
  }
  if (status === 'pending') {
    if (order.expires_at && new Date(order.expires_at).getTime() < Date.now() - 5 * 60 * 1000) status = 'expired';
    else return order;
  }

  const now = new Date().toISOString();
  // Só quem trocar de 'pending' para outro status segue (evita marcar 2 vezes).
  const { data: updated } = await db
    .from('payment_orders')
    .update({ status, updated_at: now, ...(status === 'paid' ? { paid_at: now } : {}) })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select()
    .single();
  if (!updated) {
    const { data: fresh } = await db.from('payment_orders').select('*').eq('id', order.id).single();
    return (fresh ?? order) as OrderRow;
  }

  if (status === 'paid') {
    const { data: guests } = await db.from('guests').select('*').in('id', order.guest_ids);
    for (const g of guests ?? []) {
      if (!UNPAID.includes(g.payment_status)) continue;
      const due = Number(g.amount_due);
      const falta = Math.max(0, due - Number(g.amount_paid));
      await db.from('guests').update({
        payment_status: 'paid',
        amount_paid: due,
        paid_at: now,
        payment_method: 'pix',
      }).eq('id', g.id);
      if (falta > 0) {
        await db.from('payments').insert({
          guest_id: g.id,
          amount: falta,
          method: 'pix',
          date: now,
          notes: `Pix automático (${provider.label} #${order.provider_payment_id})`,
          is_manual: false,
        });
      }
    }
  }
  return updated as OrderRow;
}
