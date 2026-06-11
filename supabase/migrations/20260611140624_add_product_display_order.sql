-- Add display_order for manual sorting in admin
alter table public.products add column if not exists display_order int;

-- Seed with row_number ordered by created_at so existing products keep their relative order
with ranked as (
  select id, row_number() over (order by created_at asc) as rn from public.products
)
update public.products p set display_order = ranked.rn * 10
from ranked where ranked.id = p.id and p.display_order is null;

create index if not exists products_display_order_idx on public.products(display_order);
