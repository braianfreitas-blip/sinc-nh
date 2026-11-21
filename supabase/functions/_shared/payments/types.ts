// Camada de pagamentos: cada provedor (Mercado Pago, Stripe, ...) implementa
// esta mesma interface. As funções do app só falam com a interface, então
// trocar ou adicionar um provedor não mexe no resto do sistema.

export type ProviderId = 'mercadopago' | 'stripe';

export type ChargeStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed' | 'refunded';

export interface CreatePixInput {
  orderId: string;          // id da cobrança no nosso banco (vai como referência externa)
  amount: number;           // em reais, ex.: 40
  description: string;      // aparece no extrato do pagador
  payer: { email: string; firstName: string; lastName: string };
  expiresAt: Date;
  notificationUrl: string;  // webhook que o provedor chama quando o status muda
}

export interface PixCharge {
  providerPaymentId: string;
  qrCode: string;           // código "copia e cola"
  qrCodeBase64?: string;    // imagem PNG do QR em base64 (sem o prefixo data:)
  ticketUrl?: string;       // página do provedor com o QR (plano B)
  expiresAt: Date;
}

export interface ChargeInfo {
  status: ChargeStatus;
  amount: number;
  externalReference?: string;
}

export interface PaymentProvider {
  id: ProviderId;
  label: string;
  /** Tem as chaves configuradas (segredos do Lovable Cloud)? */
  isConfigured(): boolean;
  createPix(input: CreatePixInput): Promise<PixCharge>;
  getCharge(providerPaymentId: string): Promise<ChargeInfo>;
}
