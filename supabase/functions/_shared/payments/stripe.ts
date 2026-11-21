// Stripe — reservado para uma integração futura.
//
// Para ativar:
//  1. Criar a conta Stripe (com Pix habilitado para o Brasil) e salvar o
//     segredo STRIPE_SECRET_KEY no Lovable Cloud.
//  2. Implementar createPix: POST /v1/payment_intents com
//     payment_method_types[]=pix, amount em centavos, currency=brl,
//     metadata[order_id]=orderId, e confirmar com payment_method_data[type]=pix.
//     O QR vem em next_action.pix_display_qr_code (data, image_url_png, expires_at).
//  3. Implementar getCharge: GET /v1/payment_intents/{id}
//     (status 'succeeded' = pago; 'canceled' = cancelado).
//  4. Criar a função stripe-webhook (evento payment_intent.succeeded) que chama
//     reconcileOrder, igual à mercadopago-webhook.
//  5. Liberar a opção "Stripe" em Configurações → Integrações de pagamento.
import type { ChargeInfo, CreatePixInput, PaymentProvider, PixCharge } from './types.ts';

export const stripe: PaymentProvider = {
  id: 'stripe',
  label: 'Stripe',

  isConfigured() {
    return (Deno.env.get('STRIPE_SECRET_KEY') ?? '').length > 0;
  },

  createPix(_input: CreatePixInput): Promise<PixCharge> {
    return Promise.reject(new Error('A integração com o Stripe ainda não foi ativada.'));
  },

  getCharge(_providerPaymentId: string): Promise<ChargeInfo> {
    return Promise.reject(new Error('A integração com o Stripe ainda não foi ativada.'));
  },
};
