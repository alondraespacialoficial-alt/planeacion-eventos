# public-submissions

This function accepts public RSVP and lead submissions without a logged-in Supabase user.

## Authentication model

`supabase/config.toml` explicitly sets `verify_jwt = false` for this function. The browser invokes it with the project's normal Supabase anon key through `supabase.functions.invoke`; that key identifies the project but is public and does not establish a user identity. The function does not authorize from an Authorization header or user role. A local handler test also sends a POST without any Authorization header and verifies the public RSVP path.

The endpoint is intentionally public to preserve invitation microsites and the public quote form. Its security boundary is server-side schema/business validation, a 16 KiB body cap, event status/deadline checks, server-generated IDs/pass codes/status/timestamps, and writes made with `SUPABASE_SERVICE_ROLE_KEY` held only in Edge Function secrets. Never expose that key in the frontend. CORS is not an authorization control; direct HTTP clients are expected and receive the same validation.

Apply the additive schema migration first. Deploy this endpoint and its frontend caller, verify both flows, then apply `20261005121000_b21_revoke_public_submission_policies.sql` to remove the two direct public INSERT policies for `rsvps` and `leads`. Service-role writes continue to work. Do not apply the policy migration before the new function and frontend are available.

## Request shapes

Send JSON through `supabase.functions.invoke('public-submissions', { body })`:

```json
{
  "kind": "rsvp",
  "data": {
    "event_id": "event UUID",
    "name": "Guest name",
    "email": "guest@example.com",
    "phone": "+52 444 123 4567",
    "attendance": "confirmed",
    "plus_ones": 0,
    "notes": "",
    "consent_privacy": true,
    "consent_terms": true
  }
}
```

```json
{
  "kind": "lead",
  "data": {
    "name": "Client name",
    "phone": "+52 444 123 4567",
    "city": "San Luis Potosí",
    "event_type": "Boda",
    "event_date": "Sin fecha fija",
    "estimated_budget": "$30,000 – $50,000 MXN",
    "services_selected": [],
    "guests_count": 30,
    "consent_privacy": true
  }
}
```

Lead notifications are sent server-to-server after insert. That call requires the service-role bearer token and `TELEGRAM_INTERNAL_SECRET`; neither secret is available to browsers.