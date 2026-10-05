import { MAX_PLUS_ONES, validatePublicSubmission } from './validation.ts';
import type { LeadSubmission, RSVPSubmission } from './validation.ts';

export interface PublicEvent {
  id: string;
  status: 'active' | 'closed' | 'archived';
  rsvp_deadline: string;
  max_plus_ones: number | null;
}

export interface SubmissionStore {
  getEvent(id: string): Promise<PublicEvent | null>;
  insertRSVP(data: RSVPSubmission & { pass_code: string }): Promise<Record<string, unknown>>;
  insertLead(data: LeadSubmission & {
    id: string;
    status: 'new';
    consented_at: string;
    privacy_notice_version: string;
  }): Promise<Record<string, unknown>>;
  notifyLeadNew(leadId: string): Promise<void>;
  todayLocal(): string;
  now(): string;
  makePassCode(): string;
  makeId(): string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handlePublicSubmission(request: Request, store: SubmissionStore): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'content_type_must_be_json' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16_384) return jsonResponse({ error: 'request_too_large' }, 413);

  let rawBody = '';
  const reader = request.body?.getReader();
  if (!reader) return jsonResponse({ error: 'invalid_json' }, 400);
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > 16_384) {
        await reader.cancel();
        return jsonResponse({ error: 'request_too_large' }, 413);
      }
      chunks.push(value);
    }
    const bodyBytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    rawBody = new TextDecoder().decode(bodyBytes);
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400);
  }

  const validated = validatePublicSubmission(body, store.todayLocal());
  if (validated.error) return jsonResponse({ error: validated.error }, 400);

  if (validated.value.kind === 'rsvp') {
    const submission = validated.value.data;
    let event: PublicEvent | null;
    try {
      event = await store.getEvent(submission.event_id);
    } catch {
      return jsonResponse({ error: 'event_lookup_failed' }, 503);
    }
    if (!event) return jsonResponse({ error: 'event_not_found' }, 404);
    if (event.status !== 'active' || event.rsvp_deadline < store.todayLocal()) {
      return jsonResponse({ error: 'rsvp_closed' }, 409);
    }

    const eventLimit = event.max_plus_ones ?? MAX_PLUS_ONES;
    if (submission.plus_ones > Math.min(MAX_PLUS_ONES, eventLimit)) {
      return jsonResponse({ error: 'too_many_plus_ones' }, 400);
    }

    try {
      const rsvp = await store.insertRSVP({ ...submission, pass_code: store.makePassCode() });
      return jsonResponse({ rsvp }, 201);
    } catch {
      return jsonResponse({ error: 'rsvp_insert_failed' }, 503);
    }
  }

  const submission = validated.value.data;
  const leadId = store.makeId();
  let lead: Record<string, unknown>;
  try {
    lead = await store.insertLead({
      ...submission,
      id: leadId,
      status: 'new',
      consented_at: store.now(),
      privacy_notice_version: '2026-10-05',
    });
  } catch {
    return jsonResponse({ error: 'lead_insert_failed' }, 503);
  }

  try {
    await store.notifyLeadNew(leadId);
  } catch (error) {
    console.error('public-submissions: lead saved but Telegram notification failed', error);
  }

  return jsonResponse({ lead: { id: lead.id, created_at: lead.created_at, status: lead.status } }, 201);
}