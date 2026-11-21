import { mercadoPago } from './mercadopago.ts';
import { stripe } from './stripe.ts';
import type { PaymentProvider, ProviderId } from './types.ts';

export * from './types.ts';

export const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  mercadopago: mercadoPago,
  stripe,
};

export function getProvider(id: string | null | undefined): PaymentProvider | null {
  if (id === 'mercadopago' || id === 'stripe') return PROVIDERS[id];
  return null; // 'manual' ou desconhecido = sem cobrança automática
}
