import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { EventData, Guest, PaymentRecord, PaymentMethod } from '@/types/event';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_EVENT: EventData = {
  id: '',
  name: 'Meu Evento',
  date: '',
  time: '',
  location: '',
  description: '',
  isPaid: false,
  ticketLabel: 'Ingresso',
  ticketPrice: 0,
  maxGuests: 100,
  allowCompanions: false,
  maxCompanions: 1,
  useTickets: false,
  guests: [],
  payments: [],
  createdAt: new Date().toISOString(),
};

interface EventContextType {
  event: EventData;
  updateEvent: (data: Partial<EventData>) => void;
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt'>) => Guest;
  updateGuest: (id: string, data: Partial<Guest>) => void;
  removeGuest: (id: string) => void;
  addPayment: (payment: Omit<PaymentRecord, 'id'>) => void;
  getGuest: (id: string) => Guest | undefined;
  findGuestByName: (firstName: string, lastName: string) => Guest | undefined;
  stats: EventStats;
  loading: boolean;
}

interface EventStats {
  totalGuests: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  waitlist: number;
  attended: number;
  totalWithCompanions: number;
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  totalExempt: number;
  totalRefunded: number;
  confirmationRate: number;
  paymentRate: number;
}

const EventContext = createContext<EventContextType | null>(null);

function mapGuest(row: any): Guest {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    presenceStatus: row.presence_status,
    paymentStatus: row.payment_status,
    amountDue: Number(row.amount_due),
    amountPaid: Number(row.amount_paid),
    companions: row.companions,
    notes: row.notes,
    confirmedAt: row.confirmed_at || undefined,
    paidAt: row.paid_at || undefined,
    paymentMethod: row.payment_method || undefined,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at || undefined,
    invitedBy: row.invited_by || undefined,
    createdAt: row.created_at,
  };
}

function mapPayment(row: any): PaymentRecord {
  return {
    id: row.id,
    guestId: row.guest_id,
    amount: Number(row.amount),
    method: row.method as PaymentMethod,
    date: row.date,
    notes: row.notes,
    isManual: row.is_manual,
  };
}

function mapEvent(row: any): Omit<EventData, 'guests' | 'payments'> {
  return {
    id: row.id,
    slug: row.slug || undefined,
    name: row.name,
    date: row.date,
    time: row.time,
    location: row.location,
    description: row.description,
    isPaid: row.is_paid,
    ticketPrice: Number(row.ticket_price),
    ticketLabel: row.ticket_label,
    pixKey: row.pix_key || undefined,
    maxGuests: row.max_guests,
    allowCompanions: row.allow_companions,
    maxCompanions: row.max_companions,
    cancellationDeadline: row.cancellation_deadline || undefined,
    headerTextColor: row.header_text_color || undefined,
    headerBgColor: row.header_bg_color || undefined,
    primaryColor: row.primary_color || undefined,
    logoUrl: row.logo_url || undefined,
    coverUrl: row.cover_url || undefined,
    useTickets: row.use_tickets ?? false,
    createdAt: row.created_at,
  };
}

export function EventProvider({ children, eventId }: { children: React.ReactNode; eventId: string }) {
  const [event, setEvent] = useState<EventData>({ ...DEFAULT_EVENT, id: eventId });
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      // Try by UUID first, then by slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
      const eventQuery = isUUID
        ? supabase.from('events').select('*').eq('id', eventId).single()
        : supabase.from('events').select('*').eq('slug', eventId).single();

      const eventRes = await eventQuery;
      if (eventRes.error) throw eventRes.error;

      const realId = eventRes.data.id;
      const guestsRes = await supabase.from('guests').select('*').eq('event_id', realId).order('created_at', { ascending: true });

      const eventData = mapEvent(eventRes.data);
      const guests = (guestsRes.data || []).map(mapGuest);

      const guestIds = guests.map(g => g.id);
      let payments: PaymentRecord[] = [];
      if (guestIds.length > 0) {
        const { data: payData } = await supabase.from('payments').select('*').in('guest_id', guestIds);
        payments = (payData || []).map(mapPayment);
      }

      setEvent({ ...eventData, guests, payments });
    } catch (err) {
      console.error('Error loading event data:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateEvent = useCallback(async (data: Partial<EventData>) => {
    setEvent(prev => ({ ...prev, ...data }));

    const dbData: Record<string, any> = {};
    if (data.name !== undefined) dbData.name = data.name;
    if (data.slug !== undefined) dbData.slug = data.slug || null;
    if (data.date !== undefined) dbData.date = data.date;
    if (data.time !== undefined) dbData.time = data.time;
    if (data.location !== undefined) dbData.location = data.location;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.isPaid !== undefined) dbData.is_paid = data.isPaid;
    if (data.ticketPrice !== undefined) dbData.ticket_price = data.ticketPrice;
    if (data.ticketLabel !== undefined) dbData.ticket_label = data.ticketLabel;
    if (data.pixKey !== undefined) dbData.pix_key = data.pixKey || null;
    if (data.maxGuests !== undefined) dbData.max_guests = data.maxGuests;
    if (data.allowCompanions !== undefined) dbData.allow_companions = data.allowCompanions;
    if (data.maxCompanions !== undefined) dbData.max_companions = data.maxCompanions;
    if (data.cancellationDeadline !== undefined) dbData.cancellation_deadline = data.cancellationDeadline || null;
    if (data.headerTextColor !== undefined) dbData.header_text_color = data.headerTextColor || null;
    if (data.headerBgColor !== undefined) dbData.header_bg_color = data.headerBgColor || null;
    if (data.primaryColor !== undefined) dbData.primary_color = data.primaryColor || null;
    if (data.logoUrl !== undefined) dbData.logo_url = data.logoUrl || null;
    if (data.coverUrl !== undefined) dbData.cover_url = data.coverUrl || null;
    if (data.useTickets !== undefined) dbData.use_tickets = data.useTickets;

    if (Object.keys(dbData).length > 0) {
      const realId = event.id;
      const { error } = await supabase.from('events').update(dbData).eq('id', realId);
      if (error) {
        console.error('Error updating event:', error);
        if (error.code === '23505' && data.slug) {
          const { toast } = await import('sonner');
          toast.error('Este slug já está em uso. Escolha outro.');
        }
      }
    }
  }, [event.id]);

  const addGuest = useCallback((guestData: Omit<Guest, 'id' | 'createdAt'>): Guest => {
    const tempId = crypto.randomUUID();
    const now = new Date().toISOString();
    const guest: Guest = { ...guestData, id: tempId, createdAt: now };

    setEvent(prev => ({ ...prev, guests: [...prev.guests, guest] }));

    supabase.from('guests').insert({
      event_id: eventId,
      first_name: guestData.firstName,
      last_name: guestData.lastName,
      phone: guestData.phone || null,
      email: guestData.email || null,
      presence_status: guestData.presenceStatus,
      payment_status: guestData.paymentStatus,
      amount_due: guestData.amountDue,
      amount_paid: guestData.amountPaid,
      companions: guestData.companions,
      notes: guestData.notes,
      confirmed_at: guestData.confirmedAt || null,
      paid_at: guestData.paidAt || null,
      payment_method: guestData.paymentMethod || null,
      checked_in: guestData.checkedIn,
      checked_in_at: guestData.checkedInAt || null,
      invited_by: guestData.invitedBy || null,
    }).select().single().then(({ data, error }) => {
      if (error) { console.error('Error adding guest:', error); return; }
      if (data) {
        setEvent(prev => ({
          ...prev,
          guests: prev.guests.map(g => g.id === tempId ? mapGuest(data) : g),
        }));
      }
    });

    return guest;
  }, [eventId]);

  const updateGuest = useCallback((id: string, data: Partial<Guest>) => {
    setEvent(prev => ({
      ...prev,
      guests: prev.guests.map(g => g.id === id ? { ...g, ...data } : g),
    }));

    const dbData: Record<string, any> = {};
    if (data.firstName !== undefined) dbData.first_name = data.firstName;
    if (data.lastName !== undefined) dbData.last_name = data.lastName;
    if (data.phone !== undefined) dbData.phone = data.phone || null;
    if (data.email !== undefined) dbData.email = data.email || null;
    if (data.presenceStatus !== undefined) dbData.presence_status = data.presenceStatus;
    if (data.paymentStatus !== undefined) dbData.payment_status = data.paymentStatus;
    if (data.amountDue !== undefined) dbData.amount_due = data.amountDue;
    if (data.amountPaid !== undefined) dbData.amount_paid = data.amountPaid;
    if (data.companions !== undefined) dbData.companions = data.companions;
    if (data.notes !== undefined) dbData.notes = data.notes;
    if (data.confirmedAt !== undefined) dbData.confirmed_at = data.confirmedAt || null;
    if (data.paidAt !== undefined) dbData.paid_at = data.paidAt || null;
    if (data.paymentMethod !== undefined) dbData.payment_method = data.paymentMethod || null;
    if (data.checkedIn !== undefined) dbData.checked_in = data.checkedIn;
    if (data.checkedInAt !== undefined) dbData.checked_in_at = data.checkedInAt || null;
    if (data.invitedBy !== undefined) dbData.invited_by = data.invitedBy || null;

    if (Object.keys(dbData).length > 0) {
      supabase.from('guests').update(dbData).eq('id', id).then(({ error }) => {
        if (error) console.error('Error updating guest:', error);
      });
    }
  }, []);

  const removeGuest = useCallback((id: string) => {
    setEvent(prev => ({
      ...prev,
      guests: prev.guests.filter(g => g.id !== id),
      payments: prev.payments.filter(p => p.guestId !== id),
    }));

    supabase.from('guests').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('Error removing guest:', error);
    });
  }, []);

  const addPayment = useCallback((payment: Omit<PaymentRecord, 'id'>) => {
    const tempId = crypto.randomUUID();
    const record: PaymentRecord = { ...payment, id: tempId };
    setEvent(prev => ({ ...prev, payments: [...prev.payments, record] }));

    supabase.from('payments').insert({
      guest_id: payment.guestId,
      amount: payment.amount,
      method: payment.method,
      date: payment.date,
      notes: payment.notes,
      is_manual: payment.isManual,
    }).select().single().then(({ data, error }) => {
      if (error) { console.error('Error adding payment:', error); return; }
      if (data) {
        setEvent(prev => ({
          ...prev,
          payments: prev.payments.map(p => p.id === tempId ? mapPayment(data) : p),
        }));
      }
    });
  }, []);

  const getGuest = useCallback((id: string) => event.guests.find(g => g.id === id), [event.guests]);

  const findGuestByName = useCallback((firstName: string, lastName: string) => {
    return event.guests.find(
      g => g.firstName.toLowerCase() === firstName.toLowerCase() &&
           g.lastName.toLowerCase() === lastName.toLowerCase()
    );
  }, [event.guests]);

  const stats: EventStats = useMemo(() => {
    const guests = event.guests;
    const confirmed = guests.filter(g => g.presenceStatus === 'confirmed').length;
    const pending = guests.filter(g => g.presenceStatus === 'pending').length;
    const cancelled = guests.filter(g => g.presenceStatus === 'cancelled').length;
    const waitlist = guests.filter(g => g.presenceStatus === 'waitlist').length;
    const attended = guests.filter(g => g.presenceStatus === 'attended').length;
    const totalWithCompanions = guests.reduce((sum, g) => {
      if (g.presenceStatus !== 'cancelled') return sum + 1 + g.companions;
      return sum;
    }, 0);
    const totalReceived = guests.reduce((sum, g) => sum + g.amountPaid, 0);
    const totalExpected = guests.reduce((sum, g) => sum + g.amountDue, 0);
    const totalPendingPayment = guests
      .filter(g => g.paymentStatus === 'pending' || g.paymentStatus === 'partial')
      .reduce((sum, g) => sum + (g.amountDue - g.amountPaid), 0);
    const totalExempt = guests.filter(g => g.paymentStatus === 'exempt').length;
    const totalRefunded = guests.filter(g => g.paymentStatus === 'refunded').reduce((s, g) => s + g.amountPaid, 0);
    const total = guests.length;

    return {
      totalGuests: total,
      confirmed,
      pending,
      cancelled,
      waitlist,
      attended,
      totalWithCompanions,
      totalExpected,
      totalReceived,
      totalPending: totalPendingPayment,
      totalExempt,
      totalRefunded,
      confirmationRate: total > 0 ? Math.round(((confirmed + attended) / total) * 100) : 0,
      paymentRate: totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0,
    };
  }, [event.guests]);

  return (
    <EventContext.Provider value={{ event, updateEvent, addGuest, updateGuest, removeGuest, addPayment, getGuest, findGuestByName, stats, loading }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
}
