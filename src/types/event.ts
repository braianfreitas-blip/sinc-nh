export type PresenceStatus = 'pending' | 'confirmed' | 'cancelled' | 'waitlist' | 'attended';
// 'pledged' = contribuição voluntária escolhida pela pessoa, ainda não recebida.
// A vaga já está garantida (conta como Confirmado); o admin marca como pago ao receber.
export type PaymentStatus = 'not_applicable' | 'pending' | 'paid' | 'exempt' | 'refunded' | 'partial' | 'pledged';
export type ContributionMode = 'fixed' | 'voluntary';
// Como o Pix é cobrado: 'manual' = chave PIX copiada e a equipe confirma;
// 'mercadopago' = Pix gerado e confirmado automaticamente; 'stripe' = futuro.
export type PaymentProvider = 'manual' | 'mercadopago' | 'stripe';
export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  manual: 'Manual (chave PIX)',
  mercadopago: 'Mercado Pago',
  stripe: 'Stripe',
};
// Cortesias ficam marcadas no campo notes como "cortesia:CODIGO".
export const isCortesia = (g: { notes?: string }) => (g.notes || '').startsWith('cortesia:');

// Um dia do evento (eventos de vários dias, ex.: seminário).
// Um item da programação do dia (ex.: "19:00 Abertura", "20:00 Sessão 1").
export interface EventSession {
  time: string;   // HH:MM (opcional)
  title: string;
}

export interface EventDay {
  date: string;   // AAAA-MM-DD
  start: string;  // HH:MM (opcional, pode ser '')
  end?: string;   // HH:MM (opcional)
  sessions?: EventSession[];
}
export type PaymentMethod = 'card' | 'pix' | 'cash' | 'transfer' | 'other';

// "Não inscritos": pessoas que compareceram sem inscrição prévia. São contadas
// no check-in com um toque. Ficam gravadas como convidados marcados no campo
// notes (sem mexer no banco), e são EXCLUÍDAS das métricas de inscritos.
export type WalkinCategoria = 'adulto' | 'crianca';
export const NAO_INSCRITO_TAG = 'nao-inscrito';
export const isNaoInscrito = (g: { notes?: string }) => (g.notes || '').startsWith(NAO_INSCRITO_TAG);
export const naoInscritoCategoria = (g: { notes?: string }): WalkinCategoria =>
  (g.notes || '').includes('crianca') ? 'crianca' : 'adulto';
export const naoInscritoNotes = (categoria: WalkinCategoria) => `${NAO_INSCRITO_TAG}:${categoria}`;

// Jornada única do convidado, derivada de presença + pagamento:
// Inscrito (na lista, ainda não pagou) -> Confirmado (pagou ou é isento) -> Compareceu (check-in).
// Lista de espera e Cancelado são ramificações. Pagamento parcial ainda é Inscrito.
export type SituacaoPresenca = 'inscrito' | 'confirmado' | 'compareceu' | 'lista_espera' | 'cancelado';

export function situacaoPresenca(g: { presenceStatus: PresenceStatus; paymentStatus: PaymentStatus; checkedIn?: boolean }): SituacaoPresenca {
  if (g.presenceStatus === 'cancelled') return 'cancelado';
  if (g.presenceStatus === 'waitlist') return 'lista_espera';
  if (g.checkedIn || g.presenceStatus === 'attended') return 'compareceu';
  const pago = isConfirmado(g);
  return pago ? 'confirmado' : 'inscrito';
}

// Pago/isento = vaga garantida (Confirmado). Usado p/ liberar ingresso.
// Contribuição voluntária prometida ('pledged') também garante a vaga.
export function isConfirmado(g: { paymentStatus: PaymentStatus }) {
  return g.paymentStatus === 'paid' || g.paymentStatus === 'exempt' || g.paymentStatus === 'not_applicable' || g.paymentStatus === 'pledged';
}

export const SITUACAO_LABELS: Record<SituacaoPresenca, string> = {
  inscrito: 'Inscrito',
  confirmado: 'Confirmado',
  compareceu: 'Compareceu',
  lista_espera: 'Lista de espera',
  cancelado: 'Cancelado',
};

export const SITUACAO_COLORS: Record<SituacaoPresenca, string> = {
  inscrito: 'bg-warning/10 text-warning',
  confirmado: 'bg-success/10 text-success',
  compareceu: 'bg-primary/10 text-primary',
  lista_espera: 'bg-info/10 text-info',
  cancelado: 'bg-destructive/10 text-destructive',
};

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
  // Eventos de vários dias: data do dia (AAAA-MM-DD) -> horário do check-in.
  checkinDays: Record<string, string>;
  invitedBy?: string;
  // Pessoas inscritas juntas (ex.: família) têm o mesmo groupId; o responsável tem id = groupId.
  groupId?: string;
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
  /** Public page only: seats taken (guest list is not exposed publicly). */
  publicOccupied?: number;
  slug?: string;
  name: string;
  date: string;
  time: string;
  location: string;
  description: string;
  isPaid: boolean;
  ticketPrice: number;
  ticketLabel: string;
  maxGuests: number;
  allowCompanions: boolean;
  maxCompanions: number;
  cancellationDeadline?: string;
  headerTextColor?: string;
  headerBgColor?: string;
  primaryColor?: string;
  logoUrl?: string;
  coverUrl?: string;
  pixKey?: string;
  useTickets: boolean;
  // Vazio = evento de um dia (usa date/time). Com itens = evento de vários dias.
  days: EventDay[];
  contributionMode: ContributionMode;
  suggestedAmounts: number[];
  contributionMessage?: string;
  paymentProvider: PaymentProvider;
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
  exempt: 'Isento / Cortesia',
  refunded: 'Estornado',
  partial: 'Parcial',
  pledged: 'Contribuição a receber',
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
  pledged: 'bg-info/10 text-info',
};
