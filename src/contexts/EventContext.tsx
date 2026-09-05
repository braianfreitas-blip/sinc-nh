import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { EventData, Guest, PaymentRecord, PaymentMethod } from '@/types/event';

const DEFAULT_EVENT: EventData = {
  id: '1',
  name: 'Meu Evento',
  date: '',
  time: '',
  location: '',
  description: '',
  isPaid: false,
  ticketPrice: 0,
  maxGuests: 100,
  allowCompanions: false,
  maxCompanions: 1,
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

export function EventProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<EventData>(() => {
    const saved = localStorage.getItem('eventData');
    return saved ? JSON.parse(saved) : DEFAULT_EVENT;
  });

  useEffect(() => {
    localStorage.setItem('eventData', JSON.stringify(event));
  }, [event]);

  const updateEvent = useCallback((data: Partial<EventData>) => {
    setEvent(prev => ({ ...prev, ...data }));
  }, []);

  const addGuest = useCallback((guestData: Omit<Guest, 'id' | 'createdAt'>): Guest => {
    const guest: Guest = {
      ...guestData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEvent(prev => ({ ...prev, guests: [...prev.guests, guest] }));
    return guest;
  }, []);

  const updateGuest = useCallback((id: string, data: Partial<Guest>) => {
    setEvent(prev => ({
      ...prev,
      guests: prev.guests.map(g => g.id === id ? { ...g, ...data } : g),
    }));
  }, []);

  const removeGuest = useCallback((id: string) => {
    setEvent(prev => ({
      ...prev,
      guests: prev.guests.filter(g => g.id !== id),
      payments: prev.payments.filter(p => p.guestId !== id),
    }));
  }, []);

  const addPayment = useCallback((payment: Omit<PaymentRecord, 'id'>) => {
    const record: PaymentRecord = { ...payment, id: crypto.randomUUID() };
    setEvent(prev => ({ ...prev, payments: [...prev.payments, record] }));
  }, []);

  const getGuest = useCallback((id: string) => event.guests.find(g => g.id === id), [event.guests]);

  const findGuestByName = useCallback((firstName: string, lastName: string) => {
    return event.guests.find(
      g => g.firstName.toLowerCase() === firstName.toLowerCase() &&
           g.lastName.toLowerCase() === lastName.toLowerCase()
    );
  }, [event.guests]);

  const stats: EventStats = React.useMemo(() => {
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
    <EventContext.Provider value={{ event, updateEvent, addGuest, updateGuest, removeGuest, addPayment, getGuest, findGuestByName, stats }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
}
