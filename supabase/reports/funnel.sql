-- Run as the project owner in Supabase SQL Editor. These reports are not public APIs.
-- A session is one journey in a browser tab, not a verified unique person.

-- 1. Branch-aware step views, completions, inactivity and active viewing time.
select m.step_id, max(m.label) label, m.pathway,
  sum(viewed_sessions) viewed, sum(completed_sessions) completed,
  sum(stalled_sessions) inactive_at_this_step,
  round(100.0 * sum(completed_sessions) / nullif(sum(viewed_sessions),0),1) completion_percent
from public.relustt_quiz_step_metrics m
where cohort_date >= current_date - 30
group by m.step_id,m.pathway order by viewed desc;

-- 2. Archetype conversion: both session-to-purchase and offer-to-purchase denominators.
select archetype,pathway,sum(sessions) sessions,sum(quiz_completed) quiz_completed,
  sum(offer_viewers) offer_viewers,sum(purchases) purchases,sum(activated) activated,sum(app_opened) app_opened,
  round(100.0*sum(purchases)/nullif(sum(sessions),0),2) session_to_purchase_percent,
  round(100.0*sum(purchases)/nullif(sum(offer_viewers),0),2) offer_to_purchase_percent
from public.relustt_quiz_archetype_metrics where cohort_date>=current_date-30
group by archetype,pathway order by sessions desc;

-- 3. Answer distribution and conversion. Latest session answers, not every click.
select answer_key,answer_value,sum(sessions) sessions,sum(purchases) purchases,
  round(100.0*sum(purchases)/nullif(sum(sessions),0),2) purchase_percent
from public.relustt_quiz_answer_metrics where cohort_date>=current_date-30
group by answer_key,answer_value order by answer_key,sessions desc;

-- 4. Acquisition campaign, device and price segmentation.
select first_touch->>'utm_source' source,first_touch->>'utm_campaign' campaign,
  first_touch->>'device' device,quiz_answers->>'selectedPrice' selected_price,
  count(*) sessions,count(*) filter(where paid_at is not null) buyers,
  round(100.0*count(*) filter(where paid_at is not null)/nullif(count(*),0),2) purchase_percent
from public.relustt_quiz_sessions where created_at>=now()-interval '30 days'
group by source,campaign,device,selected_price order by sessions desc;

-- 5. Actual forward transitions. Conditional paths are not missing steps.
select step_id,properties->>'next_step' next_step,count(distinct session_id) journeys
from public.relustt_quiz_events where event_type='step_completed' and created_at>=now()-interval '30 days'
group by step_id,next_step order by journeys desc;

-- 6. Payments without activation; inspect through admin access only.
select id,paid_at,current_step,quiz_result->>'key' archetype
from public.relustt_quiz_sessions where paid_at is not null and activated_at is null order by paid_at desc;
