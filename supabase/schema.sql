-- ARAB ALI HOTEL Digital Menu
-- Run this file once in Supabase Dashboard → SQL Editor before starting the API.

create table if not exists public.menu_items (
  id text primary key,
  name jsonb not null,
  description jsonb not null,
  price numeric(12, 2) not null default 0 check (price >= 0),
  category text not null,
  image text not null default '',
  hidden boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists public.categories (
  id text primary key,
  name jsonb not null,
  "order" integer not null default 0
);

create table if not exists public.tables (
  id text primary key,
  number integer not null check (number > 0),
  location text not null default '',
  status text not null default 'available'
    check (status in ('available', 'occupied', 'reserved')),
  active_order_count integer not null default 0
);

create table if not exists public.settings (
  key text primary key,
  value text
);

create table if not exists public.orders (
  id text primary key,
  table_id text not null,
  table_number integer not null check (table_number > 0),
  items jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  note text,
  created_at bigint not null,
  delivered_at bigint
);

alter table public.orders add column if not exists delivered_at bigint;
update public.orders
set delivered_at = created_at
where status = 'delivered' and delivered_at is null;

create table if not exists public.waiter_calls (
  table_id text primary key,
  count integer not null default 1 check (count > 0),
  last_called_at bigint not null
);

create table if not exists public.reviews (
  id text primary key,
  table_id text not null,
  table_number integer not null check (table_number > 0),
  mood text,
  stars integer not null default 0 check (stars between 0 and 5),
  comment text not null default '' check (char_length(comment) <= 200),
  created_at bigint not null
);

create table if not exists public.menu_clicks (
  item_id text primary key,
  clicks bigint not null default 0 check (clicks >= 0)
);

create table if not exists public.request_limits (
  key text primary key,
  window_started_at bigint not null,
  count integer not null default 0 check (count >= 0)
);

create unique index if not exists tables_number_unique_idx
  on public.tables (number);
create index if not exists menu_items_sort_order_idx
  on public.menu_items (sort_order);
create index if not exists categories_order_idx
  on public.categories ("order");
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);
create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

-- Atomic counters and category order updates are shared by all API instances.
create or replace function public.increment_menu_click(p_item_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.menu_clicks (item_id, clicks)
  values (p_item_id, 1)
  on conflict (item_id)
  do update set clicks = public.menu_clicks.clicks + 1;
$$;

create or replace function public.increment_waiter_call(p_table_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.waiter_calls (table_id, count, last_called_at)
  values (p_table_id, 1, (extract(epoch from clock_timestamp()) * 1000)::bigint)
  on conflict (table_id)
  do update set
    count = public.waiter_calls.count + 1,
    last_called_at = excluded.last_called_at;
$$;

create or replace function public.reorder_categories(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if cardinality(p_ids) <> (select count(*) from public.categories)
     or exists (
       select 1 from public.categories c
       where not (c.id = any(p_ids))
     )
     or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as ids(id))
  then
    raise exception 'Category order does not match current categories';
  end if;

  update public.categories c
  set "order" = ordered.ordinality::integer - 1
  from unnest(p_ids) with ordinality as ordered(id, ordinality)
  where c.id = ordered.id;
end;
$$;

create or replace function public.consume_public_rate_limit(
  p_key text,
  p_limit integer,
  p_now bigint,
  p_window_ms integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_count integer;
begin
  insert into public.request_limits (key, window_started_at, count)
  values (p_key, p_now, 1)
  on conflict (key)
  do update set
    count = case
      when public.request_limits.window_started_at <= p_now - p_window_ms then 1
      else public.request_limits.count + 1
    end,
    window_started_at = case
      when public.request_limits.window_started_at <= p_now - p_window_ms then p_now
      else public.request_limits.window_started_at
    end
  returning count into request_count;

  if random() < 0.01 then
    delete from public.request_limits
    where window_started_at < p_now - 86_400_000;
  end if;

  return request_count <= p_limit;
end;
$$;

revoke all on function public.increment_menu_click(text) from public, anon, authenticated;
revoke all on function public.increment_waiter_call(text) from public, anon, authenticated;
revoke all on function public.reorder_categories(text[]) from public, anon, authenticated;
revoke all on function public.consume_public_rate_limit(text, integer, bigint, integer) from public, anon, authenticated;
grant execute on function public.increment_menu_click(text) to service_role;
grant execute on function public.increment_waiter_call(text) to service_role;
grant execute on function public.reorder_categories(text[]) to service_role;
grant execute on function public.consume_public_rate_limit(text, integer, bigint, integer) to service_role;

alter table public.menu_items enable row level security;
alter table public.categories enable row level security;
alter table public.tables enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.waiter_calls enable row level security;
alter table public.reviews enable row level security;
alter table public.menu_clicks enable row level security;
alter table public.request_limits enable row level security;

-- Images are proxied through the API using its Supabase connection.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', false), ('logos', 'logos', false)
on conflict (id) do nothing;
