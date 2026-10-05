export type NotifyEvent =
  | 'lead_new'
  | 'lead_status_changed'
  | 'quote_new'
  | 'quote_status_changed'
  | 'quote_updated'
  | 'payment_new'
  | 'payment_status_changed';

export function canCallNotifyEvent(event: NotifyEvent, role: string, internalServerCall: boolean): boolean {
  if (event === 'lead_new') return internalServerCall;
  if (event === 'payment_new') return !internalServerCall && role === 'client';
  return !internalServerCall && (role === 'admin' || role === 'super_admin');
}

export function recordIdKey(event: NotifyEvent): 'receipt_id' | 'quote_id' | 'lead_id' {
  return event.startsWith('payment_') ? 'receipt_id'
    : event.startsWith('quote_') ? 'quote_id'
      : 'lead_id';
}