const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
let PGlite;
try { ({ PGlite } = require('@electric-sql/pglite')); } catch {}

test('quiz SQL: retries, out-of-order saves, purchase snapshot, RLS and cross-account isolation', {skip:!PGlite}, async () => {
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      grant execute on function auth.uid() to authenticated,service_role;`);
    for (const name of ['202609140001_web_subscription_entitlements.sql','202609190001_atomic_subscription_access.sql',
      '202609200001_quiz_tracking.sql','202609200002_quiz_catalog.sql']) {
      const sql=fs.readFileSync(path.join(__dirname,'../supabase/migrations',name),'utf8').replace('create extension if not exists pgcrypto;','');
      await db.exec(sql);
    }
    const one=crypto.randomUUID(),two=crypto.randomUUID(),session=crypto.randomUUID(),claim=crypto.randomUUID(),event=crypto.randomUUID();
    await db.query('insert into auth.users values ($1),($2)',[one,two]);
    const answer={triedQuit:'Yes',motivation:'Relieving stress',changePriority:'Feeling better about myself',name:'Fixture'};
    const result={key:'confidence',name:'Confidence',focus:'Build confidence',hasEvidence:true,version:'relustt-2026-09-20-v1'};
    async function save(sequence,answers=answer,proof='proof',events=[{id:event,type:'step_view',step:'motivation',duration_ms:0}]) {
      return db.query('select relustt_record_quiz($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [session,proof,sequence,'relustt-2026-09-20-v1','your-plan',answers,result,'identity',{},events,'rate_fixture']);
    }
    await save(2); await save(2); await save(1,{name:'older'});
    assert.equal((await db.query('select quiz_answers from relustt_quiz_sessions')).rows[0].quiz_answers.name,'Fixture');
    assert.equal((await db.query("select count(*)::int n from relustt_quiz_events where event_type='step_view'")).rows[0].n,1);
    await assert.rejects(save(3,answer,'wrong'),/Invalid session proof/);
    await assert.rejects(save(3,answer,'proof',[{id:crypto.randomUUID(),type:'payment_succeeded'}]),/Invalid event/);
    const snapshot={version:'relustt-2026-09-20-v1',answers:answer,result};
    await db.query('insert into purchase_claims(id,secret_hash,stripe_checkout_session_id,funnel_session_id,funnel_snapshot) values($1,$2,$3,$4,$5)',[claim,'claimproof','cs_fixture',session,snapshot]);
    assert.equal((await db.query('select count(*)::int n from relustt_quiz_profiles')).rows[0].n,0);
    // Verified payment alone records conversion, but never invents an Auth user.
    await db.query('update purchase_claims set paid_at=now() where id=$1',[claim]);
    assert.equal((await db.query('select count(*)::int n from relustt_quiz_profiles')).rows[0].n,0);
    await db.query('select sync_stripe_subscription($1,now(),$2,$3,$4,$5)',[
      {provider_subscription_id:'sub_fixture',status:'active',current_period_end:'2099-01-01T00:00:00Z'},claim,one,'claimproof','cs_fixture']);
    // The app profile keeps the purchase-time snapshot even if browser answers change later.
    await save(4,{...answer,name:'Later edit'});
    assert.equal((await db.query('select answers from relustt_quiz_profiles')).rows[0].answers.name,'Fixture');
    await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',one]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select * from relustt_get_my_quiz()')).rows.length,1);
    assert.equal((await db.query('select * from relustt_quiz_profiles')).rows.length,1);
    await assert.rejects(db.query('select * from relustt_quiz_sessions'),/permission denied/);
    await assert.rejects(db.query('select * from relustt_quiz_archetype_metrics'),/permission denied/);
    await assert.rejects(db.query("update relustt_quiz_profiles set answers='{}'"),/permission denied/);
    await db.query('select set_config($1,$2,false)',['request.jwt.claim.sub',two]);
    assert.equal((await db.query('select * from relustt_get_my_quiz()')).rows.length,0);
    assert.equal((await db.query('select * from relustt_quiz_profiles')).rows.length,0);
    await db.exec('reset role');
    await assert.rejects(db.query('update purchase_claims set claimed_by=$1 where id=$2',[two,claim]),/another account/);
    assert.equal((await db.query("select count(*)::int n from relustt_quiz_events where event_type='payment_succeeded'")).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int n from relustt_quiz_events where event_type='app_first_open'")).rows[0].n,1);
    await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/reports/funnel.sql'),'utf8'));
    await db.query('delete from auth.users where id=$1',[one]);
    assert.equal((await db.query('select count(*)::int n from relustt_quiz_profiles')).rows[0].n,0);
  } finally { await db.close(); }
});
