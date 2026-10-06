import assert from 'node:assert/strict';
import test from 'node:test';
import type { PaymentReceipt, Quote } from '../types';
import { calculateQuoteLedger, isApprovedQuoteForClient } from './accounting';

const quote = (id: string, total: number, clientEmail = 'client@example.com'): Quote => ({
  id,
  folio: id.toUpperCase(),
  created_at: '2026-10-06T00:00:00.000Z',
  client_id: 'client-id',
  client_name: 'Test Client',
  client_email: clientEmail,
  client_phone: '',
  items: [],
  subtotal: total,
  discount_total: 0,
  total,
  status: 'approved',
  observations: '',
  terms: '',
});

const payment = (id: string, amount: number, status: PaymentReceipt['status'], quoteId?: string, clientEmail = 'client@example.com'): PaymentReceipt => ({
  id,
  created_at: '2026-10-06T00:00:00.000Z',
  quote_id: quoteId,
  client_id: 'client-id',
  client_name: 'Test Client',
  client_email: clientEmail,
  amount,
  payment_type: 'abono_extra',
  payment_method: 'transferencia',
  concept: '',
  reference_code: id,
  status,
});

test('historical unassigned payments do not reduce an approved quote balance', () => {
  const ledger = calculateQuoteLedger(
    [quote('new-quote', 300)],
    [payment('historic', 900, 'verified')],
  );

  assert.equal(ledger.pendingBalance, 300);
  assert.equal(ledger.unassignedPaidVerified, 900);
  assert.equal(ledger.quoteBalances[0].paidVerified, 0);
});

test('verified payments reduce only their assigned quote; excess does not cover another quote', () => {
  const ledger = calculateQuoteLedger(
    [quote('quote-a', 100), quote('quote-b', 200)],
    [payment('a-payment', 150, 'verified', 'quote-a')],
  );

  assert.deepEqual(ledger.quoteBalances.map(row => row.pendingBalance), [0, 200]);
  assert.equal(ledger.quoteBalances[0].excess, 50);
  assert.equal(ledger.pendingBalance, 200);
});

test('pending and rejected payments do not reduce balances', () => {
  const ledger = calculateQuoteLedger(
    [quote('quote-a', 300)],
    [
      payment('pending', 100, 'pending', 'quote-a'),
      payment('rejected', 100, 'rejected', 'quote-a'),
    ],
  );

  assert.equal(ledger.pendingBalance, 300);
  assert.equal(ledger.totalPaidPending, 100);
});

test('payments assigned to another client quote are treated as unassigned', () => {
  const ledger = calculateQuoteLedger(
    [quote('quote-a', 300)],
    [payment('mismatched', 75, 'verified', 'quote-a', 'other@example.com')],
  );

  assert.equal(ledger.pendingBalance, 300);
  assert.equal(ledger.unassignedPaidByEmail.get('other@example.com'), 75);
});

test('only approved quotes owned by the same normalized email can receive a payment', () => {
  assert.equal(isApprovedQuoteForClient(quote('quote-a', 300), ' CLIENT@example.com '), true);
  assert.equal(isApprovedQuoteForClient({ ...quote('quote-a', 300), status: 'draft' }, 'client@example.com'), false);
  assert.equal(isApprovedQuoteForClient(quote('quote-a', 300), 'other@example.com'), false);
  assert.equal(isApprovedQuoteForClient(null, 'client@example.com'), false);
});
