// Aviso do Mercado Pago quando um pagamento muda de status.
// Não confiamos no conteúdo do aviso: buscamos a cobrança pelo id e
// conferimos o status direto na API do Mercado Pago (reconcileOrder).
import { adminClient, corsHeaders, reconcileOrder, type OrderRow } from '../_shared/orders.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const type = body?.type ?? body?.topic ?? url.searchParams.get('type') ?? url.searchParams.get('topic');
    const paymentId = String(body?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '');

    if (type !== 'payment' || !/^\d+$/.test(paymentId)) {
      return new Response('ignored', { status: 200 });
    }

    const db = adminClient();
    const { data: order } = await db
      .from('payment_orders')
      .select('*')
      .eq('provider', 'mercadopago')
      .eq('provider_payment_id', paymentId)
      .maybeSingle();
    if (order) await reconcileOrder(db, order as OrderRow);
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('mercadopago-webhook error', err);
    // 500 faz o Mercado Pago tentar de novo mais tarde.
    return new Response('error', { status: 500 });
  }
});
