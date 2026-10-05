import assert from 'node:assert/strict';
import test from 'node:test';
import { canCallNotifyEvent, recordIdKey } from './authorization.ts';

test('lead_new is restricted to the internal server caller', () => {
  assert.equal(canCallNotifyEvent('lead_new', 'service_role', true), true);
  assert.equal(canCallNotifyEvent('lead_new', 'admin', false), false);
  assert.equal(canCallNotifyEvent('lead_new', 'client', false), false);
});

test('payment_new requires a client session; status and quote events require staff', () => {
  assert.equal(canCallNotifyEvent('payment_new', 'client', false), true);
  assert.equal(canCallNotifyEvent('payment_new', 'admin', false), false);
  assert.equal(canCallNotifyEvent('payment_status_changed', 'admin', false), true);
  assert.equal(canCallNotifyEvent('lead_status_changed', 'super_admin', false), true);
  assert.equal(canCallNotifyEvent('quote_updated', 'client', false), false);
});

test('each event accepts only an identifier for its record type', () => {
  assert.equal(recordIdKey('payment_new'), 'receipt_id');
  assert.equal(recordIdKey('payment_status_changed'), 'receipt_id');
  assert.equal(recordIdKey('quote_new'), 'quote_id');
  assert.equal(recordIdKey('quote_updated'), 'quote_id');
  assert.equal(recordIdKey('lead_status_changed'), 'lead_id');
});