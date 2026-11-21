// Mercado Pago — Pix via API de pagamentos (/v1/payments).
// Segredo necessário no Lovable Cloud: MERCADOPAGO_ACCESS_TOKEN
// (Mercado Pago Developers → Suas integrações → Credenciais de produção).
import type { ChargeInfo, ChargeStatus, CreatePixInput, PaymentProvider, PixCharge } from './types.ts';

const API = 'https://api.mercadopago.com';

function token() {
  return Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') ?? '';
}

// O Mercado Pago espera datas no formato 2026-11-20T20:30:00.000-03:00.
function mpDate(d: Date) {
  const local = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return local.toISOString().replace('Z', '-03:00');
}

function mapStatus(s: string): ChargeStatus {
  switch (s) {
    case 'approved':
      return 'paid';
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pending';
    case 'cancelled':
      return 'cancelled'; // Pix vencido também volta como "cancelled"
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'failed';
  }
}

async function mpFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Mercado Pago error', res.status, JSON.stringify(body));
    const causa = Array.isArray(body?.cause) && body.cause[0]
      ? ` [${body.cause[0].code ?? ''} ${body.cause[0].description ?? ''}]`.replace(/\s+]/, ']')
      : '';
    throw new Error(`Mercado Pago: ${body?.message ?? res.status}${causa}`);
  }
  return body;
}

export const mercadoPago: PaymentProvider = {
  id: 'mercadopago',
  label: 'Mercado Pago',

  isConfigured() {
    return token().length > 0;
  },

  async createPix(input: CreatePixInput): Promise<PixCharge> {
    const body = await mpFetch('/v1/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': input.orderId },
      body: JSON.stringify({
        transaction_amount: Math.round(input.amount * 100) / 100,
        description: input.description.slice(0, 250),
        payment_method_id: 'pix',
        external_reference: input.orderId,
        notification_url: input.notificationUrl,
        date_of_expiration: mpDate(input.expiresAt),
        payer: {
          email: input.payer.email,
          first_name: input.payer.firstName,
          last_name: input.payer.lastName,
        },
      }),
    });
    const tx = body?.point_of_interaction?.transaction_data ?? {};
    if (!tx.qr_code) throw new Error('Mercado Pago não devolveu o QR Code do Pix.');
    return {
      providerPaymentId: String(body.id),
      qrCode: tx.qr_code,
      qrCodeBase64: tx.qr_code_base64,
      ticketUrl: tx.ticket_url,
      expiresAt: body.date_of_expiration ? new Date(body.date_of_expiration) : input.expiresAt,
    };
  },

  async getCharge(providerPaymentId: string): Promise<ChargeInfo> {
    const body = await mpFetch(`/v1/payments/${encodeURIComponent(providerPaymentId)}`);
    return {
      status: mapStatus(String(body.status)),
      amount: Number(body.transaction_amount ?? 0),
      externalReference: body.external_reference ?? undefined,
    };
  },
};
