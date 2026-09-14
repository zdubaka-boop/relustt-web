begin;

create extension if not exists pgcrypto;

create table if not exists public.purchase_claims (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null,
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  purchaser_email text,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_customer_id text,
  provider_subscription_id text not null unique,
  price_id text,
  status text not null check (
    status in (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_status_idx
  on public.billing_subscriptions(user_id, status, current_period_end);

create index if not exists purchase_claims_unclaimed_idx
  on public.purchase_claims(expires_at)
  where claimed_by is null;

create or replace function public.set_billing_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_purchase_claims_updated_at on public.purchase_claims;
create trigger set_purchase_claims_updated_at
before update on public.purchase_claims
for each row execute function public.set_billing_updated_at();

drop trigger if exists set_billing_subscriptions_updated_at on public.billing_subscriptions;
create trigger set_billing_subscriptions_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_billing_updated_at();

alter table public.purchase_claims enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_webhook_events enable row level security;

drop policy if exists "Users can view their own billing subscriptions"
  on public.billing_subscriptions;
create policy "Users can view their own billing subscriptions"
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.purchase_claims from anon, authenticated;
revoke all on public.billing_webhook_events from anon, authenticated;
grant select on public.billing_subscriptions to authenticated;

create or replace function public.has_active_web_subscription()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.billing_subscriptions
    where user_id = auth.uid()
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

revoke all on function public.has_active_web_subscription() from public;
grant execute on function public.has_active_web_subscription() to authenticated;

comment on table public.purchase_claims is
  'Short-lived, server-only records that connect a completed Stripe Checkout session to the OAuth identity chosen after payment.';

comment on table public.billing_subscriptions is
  'Server-managed subscription state. Authenticated users may only read rows belonging to their own Supabase user.';

commit;
