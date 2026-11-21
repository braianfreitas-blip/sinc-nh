// Inscrição em grupo + Pix. Chamada pela página pública do evento.
//
// Ações (POST JSON):
//  { action: 'register', eventId, contact: {phone, email, invitedBy}, people: [{firstName, lastName}], courtesyCode? }
//      Cria um convidado por pessoa (mesmo group_id), aplica a cortesia e gera o Pix.
//  { action: 'group', guestId }    Pessoas do grupo desse convidado + Pix pendente ainda válido.
//  { action: 'pay', guestId }      Gera (ou reaproveita) o Pix de quem do grupo ainda não pagou.
//  { action: 'status', orderId }   Confere no provedor se o Pix foi pago.
//  { action: 'config' }            Quais provedores têm as chaves configuradas.
import { adminClient, corsHeaders, createOrderForGroup, json, publicOrder, reconcileOrder, type OrderRow } from '../_shared/orders.ts';
import { PROVIDERS } from '../_shared/payments/index.ts';

const MAX_PEOPLE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, max = 80) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

class UserError extends Error {}

async function loadEvent(db: ReturnType<typeof adminClient>, eventId: string) {
  const q = UUID.test(eventId)
    ? db.from('events').select('*').eq('id', eventId)
    : db.from('events').select('*').eq('slug', eventId);
  const { data } = await q.maybeSingle();
  if (!data) throw new UserError('Evento não encontrado.');
  return data;
}

async function register(body: any) {
  const db = adminClient();
  const event = await loadEvent(db, clean(body.eventId, 120));
  const voluntary = event.is_paid && event.contribution_mode === 'voluntary';
  const price = event.is_paid && !voluntary ? Number(event.ticket_price) : 0;

  const phone = clean(body.contact?.phone, 30);
  const email = clean(body.contact?.email, 120).toLowerCase();
  const invitedBy = clean(body.contact?.invitedBy);
  const people = (Array.isArray(body.people) ? body.people : [])
    .map((p: any) => ({ firstName: clean(p?.firstName), lastName: clean(p?.lastName) }))
    .filter((p: any) => p.firstName || p.lastName);

  if (people.length === 0) throw new UserError('Adicione pelo menos uma pessoa.');
  if (people.length > MAX_PEOPLE) throw new UserError(`Máximo de ${MAX_PEOPLE} pessoas por inscrição.`);
  if (people.some((p: any) => !p.firstName || !p.lastName)) throw new UserError('Informe nome e sobrenome de todas as pessoas.');
  if (!phone) throw new UserError('Informe o celular do responsável.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new UserError('Informe um e-mail válido.');
  const nomes = people.map((p: any) => norm(`${p.firstName} ${p.lastName}`));
  if (new Set(nomes).size !== nomes.length) throw new UserError('Há nomes repetidos na lista.');

  // Já inscritos (mesmo nome e sobrenome, não cancelados)?
  const { data: existing } = await db.from('guests').select('first_name,last_name,presence_status,companions,notes').eq('event_id', event.id);
  const ativos = (existing ?? []).filter((g: any) => g.presence_status !== 'cancelled');
  const jaInscritos = people.filter((p: any) =>
    ativos.some((g: any) => !String(g.notes || '').startsWith('nao-inscrito') && norm(`${g.first_name} ${g.last_name}`) === norm(`${p.firstName} ${p.lastName}`)),
  );
  if (jaInscritos.length > 0) {
    const lista = jaInscritos.map((p: any) => `${p.firstName} ${p.lastName}`).join(', ');
    throw new UserError(`Já ${jaInscritos.length === 1 ? 'está inscrito(a)' : 'estão inscritos'}: ${lista}. Use "Minha inscrição" para ver o ingresso.`);
  }

  // Vagas.
  const ocupadas = ativos
    .filter((g: any) => !String(g.notes || '').startsWith('nao-inscrito'))
    .reduce((s: number, g: any) => s + 1 + Number(g.companions || 0), 0);
  const restantes = Math.max(0, Number(event.max_guests) - ocupadas);
  let presence: 'confirmed' | 'waitlist' = 'confirmed';
  if (restantes === 0) presence = 'waitlist';
  else if (restantes < people.length) {
    throw new UserError(`Restam só ${restantes} ${restantes === 1 ? 'vaga' : 'vagas'}. Diminua a quantidade de pessoas.`);
  }

  // Cortesia: cada uso cobre uma pessoa (na ordem da lista).
  const code = clean(body.courtesyCode, 40).toUpperCase();
  let cortesias = 0;
  if (code && price > 0 && presence === 'confirmed') {
    const { data: n, error } = await db.rpc('redeem_courtesy_code', { p_event_id: event.id, p_code: code, p_people: people.length });
    if (error) throw error;
    cortesias = Number(n) || 0;
    if (cortesias === 0) throw new UserError('Código de cortesia inválido ou já utilizado.');
  }

  const groupId = crypto.randomUUID();
  const now = new Date().toISOString();
  const rows = people.map((p: any, i: number) => {
    const cortesia = i < cortesias;
    const paymentStatus = !event.is_paid ? 'exempt' : voluntary ? 'not_applicable' : cortesia ? 'exempt' : 'pending';
    return {
      id: i === 0 ? groupId : crypto.randomUUID(),
      event_id: event.id,
      group_id: groupId,
      first_name: p.firstName,
      last_name: p.lastName,
      phone: phone || null,
      email: email || null,
      presence_status: presence,
      payment_status: paymentStatus,
      amount_due: cortesia ? 0 : price,
      amount_paid: 0,
      companions: 0,
      notes: cortesia ? `cortesia:${code}` : i === 0 ? '' : `grupo de ${people[0].firstName} ${people[0].lastName}`,
      confirmed_at: now,
      checked_in: false,
      checkin_days: {},
      invited_by: invitedBy || null,
    };
  });
  const { data: guests, error: insErr } = await db.from('guests').insert(rows).select();
  if (insErr) throw insErr;

  const amount = rows.reduce((s: number, r: any) => s + (r.payment_status === 'pending' ? r.amount_due : 0), 0);
  let order: OrderRow | null = null;
  let paymentError: string | null = null;
  if (amount > 0 && presence === 'confirmed') {
    if (!email && event.payment_provider === 'mercadopago') {
      paymentError = 'Informe um e-mail para gerar o Pix.';
    } else {
      try {
        order = await createOrderForGroup(db, event, groupId);
      } catch (err) {
        console.error('Erro ao gerar Pix', err);
        paymentError = `Sua inscrição foi feita, mas não conseguimos gerar o Pix agora. Tente de novo em "Minha inscrição". (${err instanceof Error ? err.message : 'erro desconhecido'})`;
      }
    }
  }

  return {
    groupId,
    guests: (guests ?? []).map(publicMember),
    waitlist: presence === 'waitlist',
    courtesyApplied: cortesias,
    amount,
    provider: event.payment_provider || 'manual',
    order: order ? publicOrder(order) : null,
    paymentError,
  };
}

// Encontra o grupo de um convidado. Quem se inscreveu sozinho (antes da
// inscrição em grupo) vira um grupo de 1 pessoa.
async function groupOf(db: ReturnType<typeof adminClient>, guestId: string) {
  if (!UUID.test(guestId)) throw new UserError('Inscrição não encontrada.');
  const { data: g } = await db.from('guests').select('id,event_id,group_id').eq('id', guestId).maybeSingle();
  if (!g) throw new UserError('Inscrição não encontrada.');
  let groupId = g.group_id as string | null;
  if (!groupId) {
    groupId = g.id;
    await db.from('guests').update({ group_id: groupId }).eq('id', g.id);
  }
  return { groupId: groupId!, eventId: g.event_id as string };
}

// O que a página pública pode ver de cada pessoa do grupo.
function publicMember(g: any) {
  const notes = String(g.notes || '');
  return {
    id: g.id,
    event_id: g.event_id,
    group_id: g.group_id,
    first_name: g.first_name,
    last_name: g.last_name,
    presence_status: g.presence_status,
    payment_status: g.payment_status,
    amount_due: g.amount_due,
    amount_paid: g.amount_paid,
    companions: g.companions,
    notes: notes.startsWith('cortesia:') ? 'cortesia:' : '',
    checked_in: g.checked_in,
    checkin_days: {},
    created_at: g.created_at,
  };
}

async function group(body: any) {
  const db = adminClient();
  const { groupId } = await groupOf(db, clean(body.guestId, 40));
  const { data: members } = await db.from('guests').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
  // Pix ainda válido do grupo, para continuar de onde parou.
  const { data: orders } = await db
    .from('payment_orders')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1);
  const o = orders?.[0] as OrderRow | undefined;
  const valido = o && o.expires_at && new Date(o.expires_at).getTime() > Date.now() + 60 * 1000;
  return { groupId, members: (members ?? []).map(publicMember), order: valido ? publicOrder(o!) : null };
}

async function pay(body: any) {
  const db = adminClient();
  const { groupId, eventId } = await groupOf(db, clean(body.guestId ?? body.groupId, 40));
  const event = await loadEvent(db, eventId);
  const order = await createOrderForGroup(db, event, groupId).catch((err) => {
    console.error('Erro ao gerar Pix', err);
    const msg = err instanceof Error ? err.message : '';
    // Mensagens nossas vão direto; erros do provedor vão junto entre parênteses para a equipe identificar.
    throw new UserError(msg && !msg.startsWith('Mercado Pago') && !msg.includes('Stripe') ? msg : `Não conseguimos gerar o Pix agora. Tente de novo em instantes. (${msg || 'erro desconhecido'})`);
  });
  return { order: order ? publicOrder(order) : null };
}

async function status(body: any) {
  const orderId = clean(body.orderId, 40);
  if (!UUID.test(orderId)) throw new UserError('Pagamento não encontrado.');
  const db = adminClient();
  const { data: order } = await db.from('payment_orders').select('*').eq('id', orderId).maybeSingle();
  if (!order) throw new UserError('Pagamento não encontrado.');
  const fresh = await reconcileOrder(db, order as OrderRow).catch((err) => {
    console.error('Erro ao consultar pagamento', err);
    return order as OrderRow;
  });
  return { order: publicOrder(fresh) };
}

function config() {
  return {
    providers: Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, configured: p.isConfigured() })),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    switch (body?.action) {
      case 'register':
        return json(await register(body));
      case 'group':
        return json(await group(body));
      case 'pay':
        return json(await pay(body));
      case 'status':
        return json(await status(body));
      case 'config':
        return json(config());
      default:
        return json({ error: 'Ação inválida.' }, 400);
    }
  } catch (err) {
    if (err instanceof UserError) return json({ error: err.message }, 400);
    console.error('registration error', err);
    return json({ error: 'Algo deu errado. Tente de novo em instantes.' }, 500);
  }
});
