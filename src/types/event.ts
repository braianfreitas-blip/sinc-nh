export type PresenceStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlist' | 'attended';
export type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'exempt' | 'refunded' | 'partial';
export type PaymentMethod = 'card' | 'pix' | 'cash' | 'transfer' | 'other';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  presenceStatus: PresenceStatus;
  paymentStatus: PaymentStatus;
  amountDue: number;
  amountPaid: number;
  companions: number;
  notes: string;
  confirmedAt?: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  checkedIn: boolean;
  invitedBy?: string;
  checkedInAt?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  guestId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes: string;
  isManual: boolean;
}

export interface EventData {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  isPaid: boolean;
  ticketPrice: number;
  maxGuests: number;
  allowCompanions: boolean;
  maxCompanions: number;
  cancellationDeadline?: string;
  guests: Guest[];
  payments: PaymentRecord[];
  createdAt: string;
}

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  waitlist: 'Lista de Espera',
  attended: 'Compareceu',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  not_applicable: 'Não se aplica',
  pending: 'Pendente',
  paid: 'Pago',
  exempt: 'Isento',
  refunded: 'Estornado',
  partial: 'Parcial',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Cartão',
  pix: 'PIX',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  other: 'Outro',
};

export const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  confirmed: 'bg-success/10 text-success',
  cancelled: 'bg-destructive/10 text-destructive',
  waitlist: 'bg-info/10 text-info',
  attended: 'bg-primary/10 text-primary',
};

export const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  not_applicable: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  paid: 'bg-success/10 text-success',
  exempt: 'bg-info/10 text-info',
  refunded: 'bg-destructive/10 text-destructive',
  partial: 'bg-accent/20 text-accent-foreground',
};
