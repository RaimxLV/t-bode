create table if not exists public.processed_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  order_id uuid,
  processed_at timestamptz not null default now(),
  unique (provider, event_id)
);

alter table public.processed_webhook_events enable row level security;

create policy "Admins can view processed webhook events"
  on public.processed_webhook_events
  for select
  using (public.is_admin_or_whitelisted());

create index if not exists idx_processed_webhook_events_order
  on public.processed_webhook_events(order_id);