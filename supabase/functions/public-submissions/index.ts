import { handlePublicSubmission, type PublicEvent, type SubmissionStore } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const telegramInternalSecret = Deno.env.get('TELEGRAM_INTERNAL_SECRET');

if (!supabaseUrl || !serviceRoleKey) throw new Error('Missing public-submissions server configuration.');

const restHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function selectOne<T>(table: string, query: Record<string, string>): Promise<T | null> {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  url.searchParams.set('limit', '1');

  const response = await fetch(url, { headers: restHeaders });
  if (!response.ok) throw new Error(`Supabase select failed (${response.status}).`);
  const rows = await response.json() as T[];
  return rows[0] || null;
}

async function insertOne<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const response = await fetch(new URL(`/rest/v1/${table}`, supabaseUrl), {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`Supabase insert failed (${response.status}).`);
  const rows = await response.json() as T[];
  if (!rows[0]) throw new Error('Supabase insert returned no row.');
  return rows[0];
}

function localDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const store: SubmissionStore = {
  getEvent: id => selectOne<PublicEvent>('eventos', {
    select: 'id,status,rsvp_deadline,max_plus_ones',
    id: `eq.${id}`,
  }),
  insertRSVP: data => insertOne('rsvps', data),
  insertLead: data => insertOne('leads', data),
  notifyLeadNew: async leadId => {
    if (!telegramInternalSecret) throw new Error('TELEGRAM_INTERNAL_SECRET is not configured.');
    const response = await fetch(`${supabaseUrl}/functions/v1/telegram-notify`, {
      method: 'POST',
      headers: {
        ...restHeaders,
        'x-internal-telegram-secret': telegramInternalSecret,
      },
      body: JSON.stringify({ event: 'lead_new', payload: { lead_id: leadId } }),
    });
    if (!response.ok) throw new Error(`Internal Telegram call failed (${response.status}).`);
  },
  todayLocal: localDate,
  now: () => new Date().toISOString(),
  makePassCode: () => {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return `PASS-${100000 + (value[0] % 900000)}`;
  },
  makeId: () => crypto.randomUUID(),
};

Deno.serve(request => handlePublicSubmission(request, store));