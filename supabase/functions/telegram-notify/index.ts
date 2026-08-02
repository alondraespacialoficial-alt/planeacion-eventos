/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Private internal alert channel for the super admin (leads, quotes, payment receipts).
// Telegram here is a monitoring add-on only: it must never block or fail the caller's flow.
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotifyEvent =
  | 'lead_new'
  | 'lead_status_changed'
  | 'quote_new'
  | 'quote_status_changed'
  | 'quote_updated'
  | 'payment_new'
  | 'payment_status_changed';

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { event, payload } = await req.json();
    const message = buildMessage(event as NotifyEvent, payload || {});

    if (!message) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    if (!botToken || !chatId) {
      console.error('telegram-notify: faltan los secrets TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID');
      return new Response(JSON.stringify({ error: 'not_configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });

    if (!tgResponse.ok) {
      console.error('telegram-notify: Telegram API respondió con error:', await tgResponse.text());
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Never surface this as a hard failure - the caller (AppService) already ignores errors,
    // but returning 200 keeps logs clean instead of showing spurious function-crash entries.
    console.error('telegram-notify error:', err);
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
