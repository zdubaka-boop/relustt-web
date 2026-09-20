-- Run with: supabase db query --linked --file tests/subscription-access.sql
-- No accounts are created or changed. Fixture rows and all writes roll back.
begin;
do $$
declare
  owner_id uuid;
  other_id uuid;
  claim_id uuid := gen_random_uuid();
  sub_id text := 'sub_relustt_rollback_' || gen_random_uuid()::text;
  snapshot jsonb;
  result public.billing_subscriptions;
  rejected boolean := false;
begin
  select id into owner_id from auth.users order by id limit 1;
  select id into other_id from auth.users where id <> owner_id order by id limit 1;
  if owner_id is null or other_id is null then
    raise exception 'Two existing identities are required for isolation checks';
  end if;
  insert into public.purchase_claims (id, secret_hash, stripe_checkout_session_id)
    values (claim_id, 'fixture_hash', 'cs_' || claim_id::text);
  snapshot := jsonb_build_object(
    'provider_subscription_id', sub_id, 'provider_customer_id', 'cus_fixture',
    'status', 'trialing', 'current_period_end', now() + interval '7 days',
    'metadata', jsonb_build_object('purchase_claim_id', claim_id)
  );
  result := public.sync_stripe_subscription(snapshot, now(), claim_id, owner_id, 'fixture_hash', 'cs_' || claim_id::text);
  if result.user_id is distinct from owner_id then raise exception 'Owner not attached'; end if;
  if not exists (select 1 from public.purchase_claims where id = claim_id and claimed_by = owner_id) then
    raise exception 'Claim not attached atomically';
  end if;

  begin
    perform public.sync_stripe_subscription(snapshot, now(), claim_id, other_id, 'fixture_hash', 'cs_' || claim_id::text);
  exception when sqlstate 'P0001' then rejected := true;
  end;
  if not rejected then raise exception 'Second account stole the purchase'; end if;

  snapshot := jsonb_set(snapshot, '{status}', '"canceled"');
  result := public.sync_stripe_subscription(snapshot, now() + interval '2 seconds', claim_id);
  if result.user_id is distinct from owner_id or result.status <> 'canceled' then
    raise exception 'Webhook erased owner or failed to revoke';
  end if;
  snapshot := jsonb_set(snapshot, '{status}', '"active"');
  result := public.sync_stripe_subscription(snapshot, now() + interval '1 second', claim_id);
  if result.status <> 'canceled' then raise exception 'Stale snapshot resurrected access'; end if;

  -- RLS: the purchaser can read their own row; another identity cannot.
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  set local role authenticated;
  if not exists (select 1 from public.billing_subscriptions where provider_subscription_id = sub_id) then
    raise exception 'Owner cannot read their entitlement';
  end if;
  reset role;
  perform set_config('request.jwt.claim.sub', other_id::text, true);
  set local role authenticated;
  if exists (select 1 from public.billing_subscriptions where provider_subscription_id = sub_id) then
    raise exception 'RLS leaked another account entitlement';
  end if;
  if has_function_privilege(current_user,
    'public.sync_stripe_subscription(jsonb,timestamptz,uuid,uuid,text,text)', 'EXECUTE') then
    raise exception 'Client can call privileged synchronization';
  end if;
  if has_table_privilege(current_user, 'public.billing_subscriptions', 'UPDATE') then
    raise exception 'Client can edit billing state';
  end if;
  reset role;
end;
$$;
rollback;
select 'PASS: ownership, atomic claim, stale snapshots, cancellation, RLS, and privileged writes; fixtures rolled back' as result;
