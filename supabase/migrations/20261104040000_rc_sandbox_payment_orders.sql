create table public.rc_payment_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 product text not null, plan text not null, quantity integer not null check(quantity between 1 and 100),
 brief text not null check(length(brief) between 5 and 3000),
 total_cents integer not null check(total_cents>0), currency text not null default 'cad' check(currency='cad'),
 status text not null default 'requested' check(status in ('requested','approved','checkout','paid','cancelled','refunded')),
 stripe_session_id text unique, stripe_payment_intent_id text unique,
 checkout_attempt integer not null default 0,
 approved_by uuid references auth.users(id), approved_at timestamptz,
 created_at timestamptz not null default now(), paid_at timestamptz,
 livemode boolean not null default false check(livemode=false)
);
create index rc_payment_orders_user_created on public.rc_payment_orders(user_id,created_at desc);
alter table public.rc_payment_orders enable row level security;
revoke all on public.rc_payment_orders from anon, authenticated;
grant all on public.rc_payment_orders to service_role;
create table public.rc_payment_events (
 id text primary key, type text not null, processed_at timestamptz not null default now()
);
alter table public.rc_payment_events enable row level security;
revoke all on public.rc_payment_events from anon, authenticated;
grant all on public.rc_payment_events to service_role;
comment on table public.rc_payment_orders is 'Sandbox service requests only. API authenticates ownership and owner approval. No direct client access.';
