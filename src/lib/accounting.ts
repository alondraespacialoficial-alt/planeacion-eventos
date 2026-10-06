import type { PaymentReceipt, Quote } from '../types';

export interface QuoteBalance {
  quote: Quote;
  paidVerified: number;
  pendingBalance: number;
  excess: number;
}

export interface QuoteLedger {
  quoteBalances: QuoteBalance[];
  approvedQuoteTotal: number;
  totalPaidVerified: number;
  allocatedPaidVerified: number;
  unassignedPaidVerified: number;
  unassignedPaidByEmail: Map<string, number>;
  totalPaidPending: number;
  pendingBalance: number;
  paymentProgressPercent: number;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function isApprovedQuoteForClient(
  quote: Pick<Quote, 'status' | 'client_email'> | null | undefined,
  clientEmail: string,
): boolean {
  return Boolean(
    quote &&
    quote.status === 'approved' &&
    normalizeEmail(quote.client_email) === normalizeEmail(clientEmail)
  );
}

export function calculateQuoteLedger(quotes: Quote[], payments: PaymentReceipt[]): QuoteLedger {
  const approvedQuotes = quotes.filter(quote => quote.status === 'approved');
  const approvedById = new Map(approvedQuotes.map(quote => [quote.id, quote]));
  const paidByQuoteId = new Map<string, number>();
  const unassignedPaidByEmail = new Map<string, number>();
  let totalPaidVerified = 0;
  let totalPaidPending = 0;
  let allocatedPaidVerified = 0;
  let unassignedPaidVerified = 0;

  payments.forEach(payment => {
    if (payment.status === 'pending') totalPaidPending += payment.amount;
    if (payment.status !== 'verified') return;

    totalPaidVerified += payment.amount;
    const quote = payment.quote_id ? approvedById.get(payment.quote_id) : undefined;
    if (!quote || normalizeEmail(quote.client_email) !== normalizeEmail(payment.client_email)) {
      unassignedPaidVerified += payment.amount;
      const email = normalizeEmail(payment.client_email);
      unassignedPaidByEmail.set(email, (unassignedPaidByEmail.get(email) || 0) + payment.amount);
      return;
    }

    allocatedPaidVerified += payment.amount;
    paidByQuoteId.set(quote.id, (paidByQuoteId.get(quote.id) || 0) + payment.amount);
  });

  const quoteBalances = approvedQuotes.map(quote => {
    const paidVerified = paidByQuoteId.get(quote.id) || 0;
    return {
      quote,
      paidVerified,
      pendingBalance: Math.max(0, quote.total - paidVerified),
      excess: Math.max(0, paidVerified - quote.total),
    };
  });
  const approvedQuoteTotal = approvedQuotes.reduce((sum, quote) => sum + quote.total, 0);
  const pendingBalance = quoteBalances.reduce((sum, balance) => sum + balance.pendingBalance, 0);

  return {
    quoteBalances,
    approvedQuoteTotal,
    totalPaidVerified,
    allocatedPaidVerified,
    unassignedPaidVerified,
    unassignedPaidByEmail,
    totalPaidPending,
    pendingBalance,
    paymentProgressPercent: approvedQuoteTotal > 0
      ? Math.min(100, Math.round((allocatedPaidVerified / approvedQuoteTotal) * 100))
      : 0,
  };
}
