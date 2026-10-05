/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Private internal alert channel for the super admin (leads, quotes, payment receipts).
// Telegram here is a monitoring add-on only: it must never block or fail the caller's flow.
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { canCallNotifyEvent, recordIdKey, type NotifyEvent } from './authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  quoted: 'Cotización enviada',
  confirmed: 'Evento confirmado',
  lost: 'Cancelado / Perdido',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  anticipo: 'Anticipo',
  saldo: 'Liquidación',
  abono_extra: 'Abono extra',
};

// Returns null when the event/status combination has no message defined for it
// (e.g. a quote update that isn't a status change we care about) - caller skips silently.
function buildMessage(event: NotifyEvent, payload: Record<string, any>): string | null {
  switch (event) {
    case 'lead_new':
      return [
        '🔔 Nuevo lead recibido',
        `Cliente: ${payload.name}`,
        `Evento: ${payload.event_type}`,
        `Asistentes: ${payload.guests_count ?? 'N/D'}`,
        `Ciudad: ${payload.city}`,
        `Presupuesto: ${payload.estimated_budget}`,
        `Servicios: ${(payload.services_selected || []).join(', ') || 'N/D'}`,
        `Fecha: ${payload.event_date}`,
        `WhatsApp: ${payload.phone}`,
      ].join('\n');

    case 'lead_status_changed':
      if (payload.status === 'confirmed') {
        return [
          '✅ Evento confirmado',
          `Cliente: ${payload.name}`,
          `Evento: ${payload.event_type}`,
          `Presupuesto: ${payload.estimated_budget}`,
        ].join('\n');
      }
      if (payload.status === 'lost') {
        return ['❌ Lead perdido / cancelado', `Cliente: ${payload.name}`, `Evento: ${payload.event_type}`].join('\n');
      }
      return [
        '📌 Lead actualizado',
        `Cliente: ${payload.name}`,
        `Nuevo estado: ${LEAD_STATUS_LABELS[payload.status] || payload.status}`,
        `Evento: ${payload.event_type}`,
        `Presupuesto: ${payload.estimated_budget}`,
      ].join('\n');

    case 'quote_new':
      return [
        '📝 Nueva cotización creada',
        `Folio: ${payload.folio}`,
        `Cliente: ${payload.client_name}`,
        `Monto estimado: $${payload.total}`,
        'Estado: Borrador',
      ].join('\n');

    case 'quote_status_changed':
      if (payload.status === 'sent') {
        return [
          '📤 Cotización enviada',
          `Folio: ${payload.folio}`,
          `Cliente: ${payload.client_name}`,
          `Monto: $${payload.total}`,
          'Estatus: Enviado al cliente',
        ].join('\n');
      }
      if (payload.status === 'approved') {
        return ['🎉 Cotización aprobada', `Folio: ${payload.folio}`, `Cliente: ${payload.client_name}`, `Monto: $${payload.total}`].join('\n');
      }
      if (payload.status === 'cancelled') {
        return ['🚫 Cotización cancelada', `Folio: ${payload.folio}`, `Cliente: ${payload.client_name}`].join('\n');
      }
      return null;

    case 'quote_updated':
      return [
        '✏️ Cotización actualizada',
        `Folio: ${payload.folio}`,
        `Cliente: ${payload.client_name}`,
        `Nuevo total: $${payload.total}`,
        `Nuevo estatus: ${payload.status}`,
      ].join('\n');

    case 'payment_new':
      return [
        '💳 Nuevo comprobante recibido',
        `Cliente: ${payload.client_name}`,
        `Concepto: ${PAYMENT_TYPE_LABELS[payload.payment_type] || payload.payment_type}`,
        `Monto reportado: $${payload.amount}`,
        'Revisar validación.',
      ].join('\n');

    case 'payment_status_changed':
      if (payload.status === 'verified') {
        return [
          '✅ Pago validado',
          `Cliente: ${payload.client_name}`,
          `Concepto: ${PAYMENT_TYPE_LABELS[payload.payment_type] || payload.payment_type}`,
          `Monto: $${payload.amount}`,
        ].join('\n');
      }
      if (payload.status === 'rejected') {
        return [
          '⚠️ Pago con observación',
          `Cliente: ${payload.client_name}`,
          `Monto: $${payload.amount}`,
          `Motivo: ${payload.notes || 'Sin detalle'}`,
        ].join('\n');
      }
      return null;

    default:
      return null;
  }
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeText(value: unknown, maxLength = 180): string {
  const text = String(value ?? 'N/D').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
  return text || 'N/D';
}

async function readLimitedBody(req: Request, limit: number): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function getRow(table: string, id: string, columns: string): Promise<Record<string, any> | null> {
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set('select', columns);
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) throw new Error(`Supabase lookup failed (${response.status}).`);
  const rows = await response.json();
  return rows[0] || null;
}

async function getUserContext(req: Request): Promise<{ id: string; role: string } | null> {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !supabaseUrl || !serviceRoleKey) return null;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  if (typeof user.id !== 'string') return null;

  const profileUrl = new URL('/rest/v1/profiles', supabaseUrl);
  profileUrl.searchParams.set('select', 'role');
  profileUrl.searchParams.set('id', `eq.${user.id}`);
  profileUrl.searchParams.set('limit', '1');
  const profileResponse = await fetch(profileUrl, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!profileResponse.ok) throw new Error(`Profile lookup failed (${profileResponse.status}).`);
  const profiles = await profileResponse.json();
  if (!profiles[0] || typeof profiles[0].role !== 'string') return null;
  return { id: user.id, role: profiles[0].role };
}

function requestedId(event: NotifyEvent, payload: unknown): string | null {
  const key = recordIdKey(event);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record[key] !== 'string') return null;
  const id = record[key] as string;
  return /^[A-Za-z0-9_-]{1,100}$/.test(id) ? id : null;
}

function messageFromRow(event: NotifyEvent, row: Record<string, any>): string | null {
  const payload = { ...row };
  for (const key of ['name', 'event_type', 'city', 'estimated_budget', 'phone', 'client_name', 'folio', 'total', 'amount', 'notes', 'status', 'payment_type']) {
    if (payload[key] !== undefined) payload[key] = safeText(payload[key]);
  }
  if (Array.isArray(payload.services_selected)) {
    payload.services_selected = payload.services_selected.slice(0, 7).map((value: unknown) => safeText(value, 80));
  } else {
    payload.services_selected = [];
  }
  return buildMessage(event, payload)?.slice(0, 4000) || null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'not_configured' }, 503);

  try {
    const length = Number(req.headers.get('content-length') || 0);
    if (length > 4096) return jsonResponse({ error: 'request_too_large' }, 413);
    const rawBody = await readLimitedBody(req, 4096);
    if (rawBody === null) return jsonResponse({ error: 'request_too_large' }, 413);
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => !['event', 'payload'].includes(key)) || typeof body.event !== 'string') {
      return jsonResponse({ error: 'invalid_request' }, 400);
    }

    const event = body.event as NotifyEvent;
    const knownEvents: NotifyEvent[] = [
      'lead_new', 'lead_status_changed', 'quote_new', 'quote_status_changed',
      'quote_updated', 'payment_new', 'payment_status_changed',
    ];
    if (!knownEvents.includes(event)) return jsonResponse({ error: 'event_not_allowed' }, 400);

    const internalLeadCall = event === 'lead_new' &&
      req.headers.get('authorization') === `Bearer ${serviceRoleKey}` &&
      !!Deno.env.get('TELEGRAM_INTERNAL_SECRET') &&
      req.headers.get('x-internal-telegram-secret') === Deno.env.get('TELEGRAM_INTERNAL_SECRET');
    if (event === 'lead_new' && !internalLeadCall) return jsonResponse({ error: 'forbidden' }, 403);

    let role = 'service_role';
    let callerId: string | null = null;
    if (!internalLeadCall) {
      const user = await getUserContext(req);
      if (!user) return jsonResponse({ error: 'unauthorized' }, 401);
      role = user.role;
      callerId = user.id;
    }
    if (!canCallNotifyEvent(event, role, internalLeadCall)) return jsonResponse({ error: 'forbidden' }, 403);

    const id = requestedId(event, body.payload);
    if (!id) return jsonResponse({ error: 'invalid_payload' }, 400);
    const [table, columns] = event.startsWith('payment_')
      ? ['payment_receipts', 'id,client_id,client_name,client_email,amount,payment_type,status,notes']
      : event.startsWith('quote_')
        ? ['quotes', 'id,folio,client_name,total,status']
        : ['leads', 'id,name,event_type,guests_count,city,estimated_budget,services_selected,event_date,phone,status'];
    const row = await getRow(table, id, columns);
    if (!row) return jsonResponse({ error: 'record_not_found' }, 404);

    if (event === 'payment_new') {
      if (!callerId || row.client_id !== callerId || row.status !== 'pending') {
        return jsonResponse({ error: 'forbidden' }, 403);
      }
    }

    if (event === 'payment_status_changed' && !['verified', 'rejected'].includes(row.status)) {
      return jsonResponse({ skipped: true });
    }
    if (event === 'quote_status_changed' && !['sent', 'approved', 'cancelled'].includes(row.status)) {
      return jsonResponse({ skipped: true });
    }

    const message = messageFromRow(event, row);
    if (!message) return jsonResponse({ skipped: true });

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!botToken || !chatId) return jsonResponse({ error: 'not_configured' }, 503);

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!tgResponse.ok) {
      console.error('telegram-notify: Telegram API returned an error.');
      return jsonResponse({ error: 'telegram_delivery_failed' }, 502);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('telegram-notify error:', error);
    return jsonResponse({ error: 'internal_error' }, 500);
  }
});
