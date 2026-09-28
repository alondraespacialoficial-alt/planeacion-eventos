import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character] || character));

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendApiKey) {
    console.error('send-quote-email: faltan secrets requeridos de Supabase o RESEND_API_KEY.');
    return jsonResponse(500, { error: 'El envío de correo no está configurado todavía.' });
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Inicia sesión como administrador para enviar cotizaciones.' });
  }

  try {
    const requestBody = await req.json();
    const quoteId = typeof requestBody.quoteId === 'string' ? requestBody.quoteId.trim() : '';
    const pdfBase64 = typeof requestBody.pdfBase64 === 'string' ? requestBody.pdfBase64 : '';
    if (!quoteId || !/^[A-Za-z0-9_-]{1,100}$/.test(quoteId)) {
      return jsonResponse(400, { error: 'El folio de la cotización no es válido.' });
    }
    if (!pdfBase64 || pdfBase64.length > 8_000_000 || !/^[A-Za-z0-9+/=]+$/.test(pdfBase64)) {
      return jsonResponse(400, { error: 'No se pudo adjuntar el PDF de la cotización.' });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authorization },
    });
    if (!authResponse.ok) return jsonResponse(401, { error: 'La sesión expiró. Inicia sesión de nuevo.' });
    const authUser = await authResponse.json();

    const serviceHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=role`,
      { headers: serviceHeaders },
    );
    if (!profileResponse.ok) throw new Error('No se pudo verificar el rol del usuario.');
    const profiles = await profileResponse.json();
    if (!['admin', 'super_admin'].includes(profiles?.[0]?.role)) {
      return jsonResponse(403, { error: 'Solo un administrador puede enviar cotizaciones.' });
    }

    const quoteResponse = await fetch(
      `${supabaseUrl}/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}&select=*`,
      { headers: serviceHeaders },
    );
    if (!quoteResponse.ok) throw new Error('No se pudo consultar la cotización guardada.');
    const quotes = await quoteResponse.json();
    const quote = quotes?.[0];
    if (!quote) return jsonResponse(404, { error: 'No se encontró la cotización.' });
    if (!['draft', 'sent'].includes(quote.status)) {
      return jsonResponse(409, { error: 'Solo se pueden enviar cotizaciones en borrador o ya enviadas.' });
    }

    const wasDraft = quote.status === 'draft';
    const updateQuoteStatus = (status: 'draft' | 'sent') => fetch(
      `${supabaseUrl}/rest/v1/quotes?id=eq.${encodeURIComponent(quoteId)}`,
      {
        method: 'PATCH',
        headers: { ...serviceHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ status }),
      },
    );
    const restoreDraft = async () => {
      const rollbackResponse = await updateQuoteStatus('draft');
      if (!rollbackResponse.ok) console.error('No se pudo restaurar el borrador tras fallar Resend.');
    };
    if (wasDraft) {
      const statusResponse = await updateQuoteStatus('sent');
      if (!statusResponse.ok) throw new Error('No se pudo preparar la cotización para el envío.');
    }

    const whatsappNumber = (Deno.env.get('QUOTE_WHATSAPP_PHONE') || '5214444237092').replace(/\D/g, '');
    const whatsappMessage = encodeURIComponent(`Hola, tengo una consulta sobre la cotización ${quote.folio}. ¿Me pueden apoyar?`);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
    const money = (amount: unknown) => Number(amount || 0).toLocaleString('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2,
    });
    const items = Array.isArray(quote.items) ? quote.items : [];
    const itemRows = items.map((item: Record<string, unknown>) => {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const discount = Number(item.discount || 0);
      return `<tr><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb">${escapeHtml(item.description)}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${quantity}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${money(price)}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${money(price * quantity - discount)}</td></tr>`;
    }).join('');
    const total = money(quote.total);
    const terms = escapeHtml(quote.terms || 'Los términos se confirmarán con tu asesor.').replace(/\n/g, '<br>');
    const observations = quote.observations
      ? `<section style="margin-top:24px"><h3 style="font-size:13px;color:#9a6700">OBSERVACIONES</h3><p style="font-size:13px;line-height:1.6;color:#4b5563">${escapeHtml(quote.observations).replace(/\n/g, '<br>')}</p></section>`
      : '';
    const html = `<!doctype html><html><body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827"><main style="max-width:680px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden"><header style="padding:24px 28px;background:#101216;color:#fff;border-bottom:4px solid #d99b26"><div style="font-size:11px;letter-spacing:2px;color:#d99b26">CELEBRA TU EVENTO</div><h1 style="margin:10px 0 4px;font-size:22px">Tu cotización está lista</h1><p style="margin:0;color:#d1d5db;font-size:13px">Folio ${escapeHtml(quote.folio)}</p></header><section style="padding:24px 28px"><p style="font-size:15px">Hola ${escapeHtml(quote.client_name)},</p><p style="font-size:14px;line-height:1.6;color:#4b5563">Te compartimos la cotización solicitada. Adjuntamos el PDF para que puedas revisarla y conservarla.</p><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f9fafb;text-align:left"><th style="padding:10px 8px">Concepto</th><th style="padding:10px 8px;text-align:center">Cant.</th><th style="padding:10px 8px;text-align:right">Precio</th><th style="padding:10px 8px;text-align:right">Importe</th></tr></thead><tbody>${itemRows}</tbody></table><div style="margin:18px 0 0 auto;max-width:280px;border-top:1px solid #e5e7eb;padding-top:12px"><div style="display:flex;justify-content:space-between;font-weight:bold;color:#9a6700"><span>TOTAL</span><span>${total}</span></div></div><section style="margin-top:24px"><h3 style="font-size:13px;color:#9a6700">TÉRMINOS COMERCIALES</h3><p style="font-size:13px;line-height:1.6;color:#4b5563">${terms}</p></section>${observations}<p style="font-size:13px;line-height:1.6;color:#4b5563;margin-top:24px">Para autorizar la cotización o resolver una duda, contáctanos por WhatsApp. No necesitas crear una cuenta para responder.</p><p style="text-align:center;margin:28px 0"><a href="${whatsappUrl}" style="display:inline-block;padding:13px 20px;background:#128c7e;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:bold">CONTÁCTANOS SOBRE ESTA COTIZACIÓN</a></p><p style="font-size:12px;color:#6b7280">También puedes responder este correo. Tu folio de referencia es <strong>${escapeHtml(quote.folio)}</strong>.</p></section><footer style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:11px">Celebra tu Evento · San Luis Potosí</footer></main></body></html>`;
    const portalUrl = `${(Deno.env.get('APP_PUBLIC_URL') || 'https://planeaslp.com').replace(/\/+$/, '')}/#login`;
    const portalNoteHtml = `<section style="margin:24px 0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px"><p style="margin:0;font-size:13px;line-height:1.6;color:#4b5563">Si quieres llevar el seguimiento digital de tus cotizaciones, servicios y pagos, puedes crear una cuenta con este mismo correo.</p><p style="margin:12px 0 0"><a href="${portalUrl}" style="color:#8a5b00;font-size:13px;font-weight:bold">ABRIR PORTAL DE CLIENTES</a></p></section>`;
    const htmlWithPortal = html.replace('</section><footer', `${portalNoteHtml}</section><footer`);
    const text = [
      `Hola ${quote.client_name},`,
      `Te compartimos la cotización ${quote.folio}. El PDF va adjunto.`,
      `Total: ${total}`,
      `Términos: ${quote.terms || 'Los términos se confirmarán con tu asesor.'}`,
      'Para autorizarla o resolver dudas, no necesitas crear una cuenta. Contáctanos por WhatsApp:',
      whatsappUrl,
      `También puedes responder este correo e indicar el folio ${quote.folio}.`,
      `Si quieres llevar el seguimiento digital de cotizaciones, servicios y pagos, puedes crear una cuenta con este mismo correo: ${portalUrl}`,
    ].join('\n\n');

    let resendResponse: Response;
    try {
      resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('QUOTE_FROM_EMAIL') || 'Celebra tu Evento <cotizaciones@celebraslp.com>',
          to: [quote.client_email],
          reply_to: Deno.env.get('QUOTE_REPLY_TO_EMAIL') || 'integrandotugente@hotmail.com',
          subject: `Cotización ${quote.folio} | Celebra tu Evento`,
          html: htmlWithPortal,
          text,
          attachments: [{ filename: `Cotizacion_${quote.folio}.pdf`, content: pdfBase64 }],
        }),
      });
    } catch (err) {
      if (wasDraft) await restoreDraft();
      throw err;
    }
    if (!resendResponse.ok) {
      const details = await resendResponse.text();
      if (wasDraft) await restoreDraft();
      console.error('Resend rechazó la cotización:', details);
      return jsonResponse(502, { error: 'Resend no pudo entregar el correo. Revisa la configuración del remitente y vuelve a intentar.' });
    }

    return jsonResponse(200, { ok: true, status: 'sent' });
  } catch (err) {
    console.error('send-quote-email error:', err);
    return jsonResponse(500, { error: err instanceof Error ? err.message : 'No se pudo enviar la cotización.' });
  }
});
