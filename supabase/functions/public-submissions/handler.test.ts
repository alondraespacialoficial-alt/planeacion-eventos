import assert from 'node:assert/strict';
import test from 'node:test';
import { handlePublicSubmission, type SubmissionStore } from './handler.ts';

const openEvent = {
  id: '8d2a03c0-69b7-4b29-91da-15f3d2a6507c',
  status: 'active' as const,
  rsvp_deadline: '2026-12-31',
  max_plus_ones: 10,
};

function createStore(overrides: Partial<SubmissionStore> = {}): SubmissionStore {
  return {
    getEvent: async () => openEvent,
    insertRSVP: async data => ({ id: 'rsvp-1', created_at: '2026-10-05T00:00:00Z', ...data }),
    insertLead: async data => ({ id: data.id, created_at: '2026-10-05T00:00:00Z', status: data.status }),
    notifyLeadNew: async () => {},
    todayLocal: () => '2026-10-05',
    now: () => '2026-10-05T00:00:00Z',
    makePassCode: () => 'PASS-123456',
    makeId: () => 'lead-uuid',
    ...overrides,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://supabase.example/functions/v1/public-submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

test('accepts a public RSVP without Authorization or a logged-in user', async () => {
  let inserted = false;
  const response = await handlePublicSubmission(post({
    kind: 'rsvp',
    data: {
      event_id: openEvent.id,
      name: '  Ana Pérez  ',
      email: 'ANA@example.com',
      phone: '+52 444 123 4567',
      attendance: 'confirmed',
      plus_ones: 10,
      notes: '',
      consent_privacy: true,
      consent_terms: true,
    },
  }), createStore({ insertRSVP: async data => {
    inserted = true;
    return { id: 'rsvp-1', ...data };
  } }));

  assert.equal(response.status, 201);
  assert.equal(inserted, true);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('rejects RSVP over the global plus-ones limit', async () => {
  const response = await handlePublicSubmission(post({
    kind: 'rsvp',
    data: {
      event_id: openEvent.id,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '4441234567',
      attendance: 'confirmed',
      plus_ones: 11,
      notes: '',
      consent_privacy: true,
      consent_terms: true,
    },
  }), createStore());

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_rsvp' });
});

test('enforces a lower max_plus_ones value configured for an event', async () => {
  const response = await handlePublicSubmission(post({
    kind: 'rsvp',
    data: {
      event_id: openEvent.id,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '4441234567',
      attendance: 'confirmed',
      plus_ones: 5,
      notes: '',
      consent_privacy: true,
      consent_terms: true,
    },
  }), createStore({ getEvent: async () => ({ ...openEvent, max_plus_ones: 4 }) }));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'too_many_plus_ones' });
});

test('does not insert an RSVP for a closed event', async () => {
  let inserted = false;
  const response = await handlePublicSubmission(post({
    kind: 'rsvp',
    data: {
      event_id: openEvent.id,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '4441234567',
      attendance: 'declined',
      plus_ones: 0,
      notes: '',
      consent_privacy: true,
      consent_terms: true,
    },
  }), createStore({
    getEvent: async () => ({ ...openEvent, status: 'closed' }),
    insertRSVP: async data => {
      inserted = true;
      return { ...data };
    },
  }));

  assert.equal(response.status, 409);
  assert.equal(inserted, false);
});

test('persists consent and notifies Telegram only after a valid lead insert', async () => {
  const calls: string[] = [];
  const response = await handlePublicSubmission(post({
    kind: 'lead',
    data: {
      name: 'Ana Pérez',
      phone: '4441234567',
      city: 'San Luis Potosí',
      event_type: 'Boda',
      event_date: 'Sin fecha fija',
      estimated_budget: '$30,000 – $50,000 MXN',
      services_selected: [],
      guests_count: 30,
      consent_privacy: true,
    },
  }), createStore({
    insertLead: async data => {
      calls.push(`insert:${data.consent_privacy}:${data.status}`);
      return { id: data.id, status: data.status };
    },
    notifyLeadNew: async id => {
      calls.push(`notify:${id}`);
    },
  }));

  assert.equal(response.status, 201);
  assert.deepEqual(calls, ['insert:true:new', 'notify:lead-uuid']);
});

test('rejects a lead without explicit consent', async () => {
  const response = await handlePublicSubmission(post({
    kind: 'lead',
    data: {
      name: 'Ana Pérez',
      phone: '4441234567',
      city: 'San Luis Potosí',
      event_type: 'Boda',
      event_date: 'Sin fecha fija',
      estimated_budget: '$30,000 – $50,000 MXN',
      services_selected: [],
      guests_count: 30,
      consent_privacy: false,
    },
  }), createStore());

  assert.equal(response.status, 400);
});