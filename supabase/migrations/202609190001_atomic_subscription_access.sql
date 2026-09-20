begin;

alter table public.billing_subscriptions
  add column if not exists stripe_observed_at timestamptz;

-- All Stripe writes and purchase claims use one transaction. A webhook cannot
-- erase an owner, and simultaneous logins cannot attach one purchase twice.
create or replace function public.sync_stripe_subscription(
  p_subscription jsonb,
  p_observed_at timestamptz,
  p_claim_id uuid default null,
  p_user_id uuid default null,
  p_claim_secret_hash text default null,
  p_checkout_session_id text default null
)
returns public.billing_subscriptions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subscription_id text := p_subscription->>'provider_subscription_id';
  v_claim public.purchase_claims;
  v_existing public.billing_subscriptions;
  v_result public.billing_subscriptions;
  v_owner uuid;
begin
  if v_subscription_id is null or p_observed_at is null then
    raise exception 'Missing subscription identity or observation time';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_subscription_id, 0));
  select * into v_existing from public.billing_subscriptions
    where provider_subscription_id = v_subscription_id for update;

  if p_claim_id is not null then
    select * into v_claim from public.purchase_claims
      where id = p_claim_id for update;
  else
    select * into v_claim from public.purchase_claims
      where stripe_subscription_id = v_subscription_id for update;
  end if;

  if v_claim.id is not null and v_claim.stripe_subscription_id is not null
     and v_claim.stripe_subscription_id <> v_subscription_id then
    raise exception 'Purchase is already bound to another subscription' using errcode = 'P0001';
  end if;

  if p_user_id is not null then
    if v_claim.id is null
      or v_claim.secret_hash is distinct from p_claim_secret_hash
      or v_claim.stripe_checkout_session_id is distinct from p_checkout_session_id
      or v_claim.expires_at <= now()
      or (v_claim.claimed_by is not null and v_claim.claimed_by <> p_user_id)
      or (v_existing.user_id is not null and v_existing.user_id <> p_user_id)
      or (v_claim.stripe_subscription_id is not null and v_claim.stripe_subscription_id <> v_subscription_id)
    then
      raise exception 'Purchase cannot be linked to this account' using errcode = 'P0001';
    end if;
    update public.purchase_claims set
      claimed_by = p_user_id,
      claimed_at = coalesce(claimed_at, now()),
      stripe_subscription_id = v_subscription_id,
      stripe_customer_id = p_subscription->>'provider_customer_id'
      where id = v_claim.id;
  elsif v_claim.id is not null then
    update public.purchase_claims set
      stripe_subscription_id = v_subscription_id,
      stripe_customer_id = p_subscription->>'provider_customer_id'
      where id = v_claim.id;
  end if;

  v_owner := coalesce(v_existing.user_id, p_user_id, v_claim.claimed_by);
  insert into public.billing_subscriptions (
    user_id, provider, provider_customer_id, provider_subscription_id,
    price_id, status, current_period_end, cancel_at_period_end, metadata, stripe_observed_at
  ) values (
    v_owner, 'stripe', p_subscription->>'provider_customer_id', v_subscription_id,
    p_subscription->>'price_id', p_subscription->>'status',
    (p_subscription->>'current_period_end')::timestamptz,
    coalesce((p_subscription->>'cancel_at_period_end')::boolean, false),
    coalesce(p_subscription->'metadata', '{}'::jsonb), p_observed_at
  ) on conflict (provider_subscription_id) do update set
    user_id = coalesce(billing_subscriptions.user_id, excluded.user_id),
    provider_customer_id = excluded.provider_customer_id,
    price_id = excluded.price_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    metadata = excluded.metadata,
    stripe_observed_at = excluded.stripe_observed_at
  where billing_subscriptions.stripe_observed_at is null
     or billing_subscriptions.stripe_observed_at <= excluded.stripe_observed_at;

  -- Ownership may arrive after a newer webhook snapshot. Attach the account
  -- without rolling the subscription status back to the older snapshot.
  if v_owner is not null then
    update public.billing_subscriptions set user_id = v_owner
      where provider_subscription_id = v_subscription_id and user_id is null;
  end if;
  select * into v_result from public.billing_subscriptions
    where provider_subscription_id = v_subscription_id;
  return v_result;
end;
$$;

revoke all on function public.sync_stripe_subscription(jsonb, timestamptz, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.sync_stripe_subscription(jsonb, timestamptz, uuid, uuid, text, text)
  to service_role;
revoke insert, update, delete on public.billing_subscriptions from anon, authenticated;

create or replace function public.has_active_web_subscription()
returns boolean language sql stable security invoker set search_path = public
as $$
  select exists (
    select 1 from public.billing_subscriptions
    where user_id = auth.uid() and status in ('active', 'trialing')
      and current_period_end > now()
  );
$$;

commit;
