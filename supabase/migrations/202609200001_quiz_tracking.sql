begin;

-- RELUSTT names intentionally avoid the app's existing community/analytics tables.
create table public.relustt_quiz_sessions (
  id uuid primary key,
  proof_hash text not null,
  user_id uuid references auth.users(id) on delete cascade,
  quiz_version text not null,
  sequence bigint not null default 0,
  current_step text not null,
  pathway text not null check (pathway in ('identity','performance')),
  quiz_answers jsonb not null default '{}',
  quiz_result jsonb not null default '{}',
  first_touch jsonb not null default '{}',
  last_touch jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  paid_at timestamptz,
  activated_at timestamptz,
  app_opened_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days'
);
create table public.relustt_quiz_events (
  session_id uuid not null references public.relustt_quiz_sessions(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  step_id text,
  duration_ms integer not null default 0,
  properties jsonb not null default '{}',
  source text not null check (source in ('browser','server','app')),
  created_at timestamptz not null default now(),
  primary key (session_id,event_id)
);
create index relustt_quiz_events_step_idx on public.relustt_quiz_events(step_id,event_type,created_at);
create index relustt_quiz_sessions_created_idx on public.relustt_quiz_sessions(created_at);
create table public.relustt_quiz_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid references public.relustt_quiz_sessions(id) on delete set null,
  quiz_version text not null,
  answers jsonb not null,
  result jsonb not null,
  purchased_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create table public.relustt_quiz_definitions (
  quiz_version text not null,
  step_id text not null,
  sort_order integer not null,
  label text not null,
  answer_key text,
  tags text[] not null default '{}',
  primary key (quiz_version,step_id)
);
create table public.relustt_quiz_rate_limits (
  bucket text primary key,
  window_started timestamptz not null,
  requests integer not null
);
alter table public.purchase_claims add column funnel_session_id uuid references public.relustt_quiz_sessions(id) on delete set null;
alter table public.purchase_claims add column funnel_snapshot jsonb;
alter table public.purchase_claims add column paid_at timestamptz;

alter table public.relustt_quiz_sessions enable row level security;
alter table public.relustt_quiz_events enable row level security;
alter table public.relustt_quiz_profiles enable row level security;
alter table public.relustt_quiz_definitions enable row level security;
alter table public.relustt_quiz_rate_limits enable row level security;
revoke all on public.relustt_quiz_sessions, public.relustt_quiz_events, public.relustt_quiz_profiles,
  public.relustt_quiz_definitions, public.relustt_quiz_rate_limits from public, anon, authenticated;
grant all on public.relustt_quiz_sessions, public.relustt_quiz_events, public.relustt_quiz_profiles,
  public.relustt_quiz_definitions, public.relustt_quiz_rate_limits to service_role;
grant select on public.relustt_quiz_profiles to authenticated;
create policy "Read own purchased quiz profile" on public.relustt_quiz_profiles
  for select to authenticated using (user_id = auth.uid());

create function public.relustt_record_quiz(
  p_id uuid, p_proof_hash text, p_sequence bigint, p_version text, p_step text,
  p_answers jsonb, p_result jsonb, p_pathway text, p_context jsonb, p_events jsonb, p_rate_key text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_session public.relustt_quiz_sessions; v_event jsonb; v_requests integer;
begin
  if jsonb_array_length(p_events) > 40 or octet_length(p_answers::text) > 8192 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  insert into public.relustt_quiz_rate_limits values(p_rate_key, date_trunc('minute', now()), 1)
    on conflict(bucket) do update set window_started = excluded.window_started,
      requests = case when relustt_quiz_rate_limits.window_started = excluded.window_started
        then relustt_quiz_rate_limits.requests + 1 else 1 end returning requests into v_requests;
  if v_requests > 1800 then raise exception 'Too many requests' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 123));
  insert into public.relustt_quiz_sessions(id,proof_hash,quiz_version,current_step,pathway,first_touch,last_touch)
    values(p_id,p_proof_hash,p_version,p_step,p_pathway,p_context,p_context) on conflict do nothing;
  select * into v_session from public.relustt_quiz_sessions where id=p_id for update;
  if v_session.proof_hash <> p_proof_hash or v_session.expires_at <= now() or v_session.quiz_version <> p_version then
    raise exception 'Invalid session proof' using errcode = '42501';
  end if;
  if (select count(*) from public.relustt_quiz_events where session_id=p_id) > 4000 then
    raise exception 'Session event limit reached' using errcode = 'P0001';
  end if;
  insert into public.relustt_quiz_events(session_id,event_id,event_type,source)
    values(p_id,'session_started','session_started','server') on conflict do nothing;
  if p_sequence > v_session.sequence then
    update public.relustt_quiz_sessions set sequence=p_sequence,current_step=p_step,pathway=p_pathway,
      quiz_answers=p_answers,quiz_result=p_result,last_touch=p_context,updated_at=now(),
      completed_at=case when p_step='your-plan' and p_result->>'hasEvidence'='true'
        then coalesce(completed_at,now()) else completed_at end where id=p_id;
  end if;
  for v_event in select value from jsonb_array_elements(p_events) loop
    -- Defense in depth: a browser must never mint payment/activation milestones.
    if v_event->>'type' not in ('step_view','step_exit','step_completed','answer_changed','quiz_completed',
      'offer_viewed','checkout_clicked','checkout_cancelled','checkout_error') then
      raise exception 'Invalid event type' using errcode='22023';
    end if;
    insert into public.relustt_quiz_events(session_id,event_id,event_type,step_id,duration_ms,properties,source)
      values(p_id,v_event->>'id',v_event->>'type',v_event->>'step',
        least(3600000,greatest(0,(v_event->>'duration_ms')::integer)),coalesce(v_event->'properties','{}'),'browser')
      on conflict do nothing;
  end loop;
  return jsonb_build_object('sequence', greatest(v_session.sequence,p_sequence));
end; $$;
revoke all on function public.relustt_record_quiz(uuid,text,bigint,text,text,jsonb,jsonb,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.relustt_record_quiz(uuid,text,bigint,text,text,jsonb,jsonb,text,jsonb,jsonb,text) to service_role;

-- This runs inside the already-atomic purchase claim transaction. Never match by email.
create function public.relustt_link_quiz_purchase() returns trigger
language plpgsql security invoker set search_path=public as $$
declare v_owner uuid;
begin
  if new.funnel_session_id is null or new.funnel_snapshot is null then return new; end if;
  select user_id into v_owner from public.relustt_quiz_sessions where id=new.funnel_session_id for update;
  if new.claimed_by is not null and v_owner is not null and v_owner <> new.claimed_by then
    raise exception 'Quiz already belongs to another account' using errcode='P0001';
  end if;
  if new.stripe_checkout_session_id is not null then
    insert into public.relustt_quiz_events(session_id,event_id,event_type,step_id,source)
      values(new.funnel_session_id,'checkout:'||new.id,'checkout_started','your-plan','server') on conflict do nothing;
  end if;
  if new.paid_at is not null then
    update public.relustt_quiz_sessions set paid_at=coalesce(paid_at,new.paid_at) where id=new.funnel_session_id;
    insert into public.relustt_quiz_events(session_id,event_id,event_type,step_id,source)
      values(new.funnel_session_id,'paid:'||new.id,'payment_succeeded','your-plan','server') on conflict do nothing;
  end if;
  if new.claimed_by is not null and new.paid_at is not null then
    update public.relustt_quiz_sessions set user_id=new.claimed_by,activated_at=coalesce(activated_at,now()) where id=new.funnel_session_id;
    insert into public.relustt_quiz_profiles(user_id,session_id,quiz_version,answers,result,purchased_at)
      values(new.claimed_by,new.funnel_session_id,new.funnel_snapshot->>'version',
        new.funnel_snapshot->'answers',new.funnel_snapshot->'result',new.paid_at)
      on conflict(user_id) do update set session_id=excluded.session_id,quiz_version=excluded.quiz_version,
        answers=excluded.answers,result=excluded.result,purchased_at=excluded.purchased_at,updated_at=now()
      where relustt_quiz_profiles.purchased_at < excluded.purchased_at;
    insert into public.relustt_quiz_events(session_id,event_id,event_type,source)
      values(new.funnel_session_id,'activated:'||new.id,'account_activated','server') on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function public.relustt_link_quiz_purchase() from public,anon,authenticated;
create trigger relustt_link_quiz_purchase after insert or update on public.purchase_claims
  for each row execute function public.relustt_link_quiz_purchase();

-- Called by the iOS app only after authenticating; no caller-supplied user/session IDs.
create function public.relustt_get_my_quiz() returns setof public.relustt_quiz_profiles
language plpgsql security definer set search_path=public as $$
declare v_session uuid;
begin
  if auth.uid() is null then raise exception 'Login required' using errcode='42501'; end if;
  select session_id into v_session from public.relustt_quiz_profiles where user_id=auth.uid();
  if v_session is not null then
    update public.relustt_quiz_sessions set app_opened_at=coalesce(app_opened_at,now()) where id=v_session and user_id=auth.uid();
    insert into public.relustt_quiz_events(session_id,event_id,event_type,source)
      values(v_session,'app_first_open','app_first_open','app') on conflict do nothing;
  end if;
  return query select * from public.relustt_quiz_profiles where user_id=auth.uid();
end; $$;
revoke all on function public.relustt_get_my_quiz() from public,anon;
grant execute on function public.relustt_get_my_quiz() to authenticated;

-- Admin reports: distinct journeys, not clicks. Branch omissions are never losses.
create view public.relustt_quiz_step_metrics as
with visits as (
  select s.id,s.quiz_version,s.pathway,s.created_at::date cohort_date,s.current_step,s.updated_at,s.paid_at,
    e.step_id,bool_or(e.event_type='step_view') viewed,bool_or(e.event_type='step_completed') completed,
    sum(e.duration_ms) filter(where e.event_type='step_exit') duration_ms
  from public.relustt_quiz_sessions s join public.relustt_quiz_events e on e.session_id=s.id
  where e.step_id is not null group by s.id,e.step_id
)
select v.quiz_version,v.cohort_date,v.pathway,v.step_id,d.label,
  count(*) filter(where viewed) viewed_sessions,
  count(*) filter(where completed) completed_sessions,
  count(*) filter(where viewed and not completed and current_step=v.step_id and paid_at is null
    and updated_at < now()-interval '30 minutes') stalled_sessions,
  round(avg(duration_ms) filter(where duration_ms is not null)) avg_active_ms
from visits v left join public.relustt_quiz_definitions d on d.quiz_version=v.quiz_version and d.step_id=v.step_id
group by v.quiz_version,v.cohort_date,v.pathway,v.step_id,d.label;

create view public.relustt_quiz_archetype_metrics as
with cohorts as (
  select s.*,coalesce(c.funnel_snapshot->'result',s.quiz_result) report_result
  from public.relustt_quiz_sessions s left join lateral (
    select funnel_snapshot from public.purchase_claims where funnel_session_id=s.id and paid_at is not null order by paid_at limit 1
  ) c on true
)
select quiz_version,created_at::date cohort_date,pathway,
  case when report_result->>'hasEvidence'='true' then report_result->>'key' else 'insufficient_evidence' end archetype,
  count(*) sessions,count(*) filter(where completed_at is not null) quiz_completed,
  count(*) filter(where exists(select 1 from public.relustt_quiz_events e where e.session_id=cohorts.id and e.event_type='offer_viewed')) offer_viewers,
  count(*) filter(where paid_at is not null) purchases,
  count(*) filter(where activated_at is not null) activated,
  count(*) filter(where app_opened_at is not null) app_opened
from cohorts group by quiz_version,created_at::date,pathway,archetype;

create view public.relustt_quiz_answer_metrics as
select s.quiz_version,s.created_at::date cohort_date,s.pathway,a.key answer_key,a.value answer_value,
  count(*) sessions,count(*) filter(where s.paid_at is not null) purchases
from public.relustt_quiz_sessions s cross join lateral jsonb_each_text(s.quiz_answers - 'name') a
group by s.quiz_version,s.created_at::date,s.pathway,a.key,a.value;
revoke all on public.relustt_quiz_step_metrics,public.relustt_quiz_archetype_metrics,public.relustt_quiz_answer_metrics from public,anon,authenticated;
grant select on public.relustt_quiz_step_metrics,public.relustt_quiz_archetype_metrics,public.relustt_quiz_answer_metrics to service_role;

comment on view public.relustt_quiz_step_metrics is 'Admin only. Stalled = last viewed step, not completed, no purchase, inactive 30 minutes; not a confirmed exit. Filter cohort_date and pathway.';
comment on table public.relustt_quiz_profiles is 'Purchase-time answer snapshot, readable only by its authenticated owner. Does not grant a subscription.';
commit;
