export const MAX_PLUS_ONES = 10;

const EVENT_TYPES = [
  'Boda',
  'XV Años',
  'Graduación',
  'Cumpleaños',
  'Bautizo / Primera Comunión',
  'Evento corporativo',
  'Aniversario',
  'Otro',
] as const;

const BUDGETS = [
  '$5,000 – $15,000 MXN',
  '$15,000 – $30,000 MXN',
  '$30,000 – $50,000 MXN',
  '$50,000 – $80,000 MXN',
  '$80,000 – $120,000 MXN',
  '$120,000 – $200,000 MXN',
  'Más de $200,000 MXN',
] as const;

const SERVICES = [
  'Alimentos para evento',
  'Producción visual',
  'Barras y snacks',
  'Personal para evento',
  'Show y animación',
  'Invitaciones digitales',
  'Restauración y enmarcado',
] as const;

export interface RSVPSubmission {
  event_id: string;
  name: string;
  email: string;
  phone: string;
  attendance: 'confirmed' | 'declined';
  plus_ones: number;
  notes: string;
  consent_privacy: true;
  consent_terms: true;
}

export interface LeadSubmission {
  name: string;
  phone: string;
  city: string;
  event_type: (typeof EVENT_TYPES)[number];
  event_date: string;
  estimated_budget: (typeof BUDGETS)[number];
  services_selected: string[];
  guests_count: number;
  consent_privacy: true;
}

export type PublicSubmission =
  | { kind: 'rsvp'; data: RSVPSubmission }
  | { kind: 'lead'; data: LeadSubmission };

type Validation<T> = { value: T; error?: never } | { value?: never; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key));
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function validPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '');
  return phone.length <= 25 && /^[+\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
    ? phone
    : null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validatePublicSubmission(input: unknown, todayLocal: string): Validation<PublicSubmission> {
  if (!isRecord(input) || !hasOnlyKeys(input, ['kind', 'data']) || !isRecord(input.data)) {
    return { error: 'invalid_request' };
  }

  const data = input.data;
  if (input.kind === 'rsvp') {
    const keys = [
      'event_id', 'name', 'email', 'phone', 'attendance', 'plus_ones', 'notes',
      'consent_privacy', 'consent_terms',
    ];
    const name = boundedText(data.name, 120);
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const phone = validPhone(data.phone);
    const notes = data.notes === undefined ? '' : data.notes;

    if (
      !hasOnlyKeys(data, keys) ||
      typeof data.event_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.event_id) ||
      !name ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !phone ||
      (data.attendance !== 'confirmed' && data.attendance !== 'declined') ||
      !Number.isInteger(data.plus_ones) || (data.plus_ones as number) < 0 || (data.plus_ones as number) > MAX_PLUS_ONES ||
      typeof notes !== 'string' || notes.length > 1000 ||
      data.consent_privacy !== true || data.consent_terms !== true ||
      (data.attendance === 'declined' && data.plus_ones !== 0)
    ) {
      return { error: 'invalid_rsvp' };
    }

    return {
      value: {
        kind: 'rsvp',
        data: {
          event_id: data.event_id,
          name,
          email,
          phone,
          attendance: data.attendance,
          plus_ones: data.plus_ones as number,
          notes: notes.trim(),
          consent_privacy: true,
          consent_terms: true,
        },
      },
    };
  }

  if (input.kind === 'lead') {
    const keys = [
      'name', 'phone', 'city', 'event_type', 'event_date', 'estimated_budget',
      'services_selected', 'guests_count', 'consent_privacy',
    ];
    const name = boundedText(data.name, 120);
    const phone = validPhone(data.phone);
    const city = boundedText(data.city, 120);
    const eventDate = data.event_date;
    const services = data.services_selected;

    if (
      !hasOnlyKeys(data, keys) ||
      !name || !phone || !city ||
      typeof data.event_type !== 'string' || !EVENT_TYPES.includes(data.event_type as (typeof EVENT_TYPES)[number]) ||
      typeof eventDate !== 'string' || !(eventDate === 'Sin fecha fija' || (isValidDate(eventDate) && eventDate >= todayLocal)) ||
      typeof data.estimated_budget !== 'string' || !BUDGETS.includes(data.estimated_budget as (typeof BUDGETS)[number]) ||
      !Array.isArray(services) || services.length > SERVICES.length ||
      services.some(service => typeof service !== 'string' || !SERVICES.includes(service as (typeof SERVICES)[number])) ||
      new Set(services).size !== services.length ||
      !Number.isInteger(data.guests_count) || (data.guests_count as number) < 30 ||
      (data.guests_count as number) > 300 || (data.guests_count as number) % 10 !== 0 ||
      data.consent_privacy !== true
    ) {
      return { error: 'invalid_lead' };
    }

    return {
      value: {
        kind: 'lead',
        data: {
          name,
          phone,
          city,
          event_type: data.event_type as LeadSubmission['event_type'],
          event_date: eventDate,
          estimated_budget: data.estimated_budget as LeadSubmission['estimated_budget'],
          services_selected: services.length ? [...services] as string[] : ['Información General'],
          guests_count: data.guests_count as number,
          consent_privacy: true,
        },
      },
    };
  }

  return { error: 'invalid_kind' };
}