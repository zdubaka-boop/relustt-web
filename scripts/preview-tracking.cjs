// Disposable local PostgreSQL fixture. Never connects to Supabase or Stripe.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PREVIEW_PORT || 8001);
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.json':'application/json'};
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to authenticated,service_role;`);
  for (const name of ['202609140001_web_subscription_entitlements.sql','202609190001_atomic_subscription_access.sql',
    '202609200001_quiz_tracking.sql','202609200002_quiz_catalog.sql']) {
    await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',name),'utf8').replace('create extension if not exists pgcrypto;',''));
  }
  process.env.SUPABASE_URL='http://supabase-fixture.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY='local-fixture-only';
  process.env.PUBLIC_SITE_URL=`http://localhost:${port}`;
  global.fetch = async (url, options) => {
    if (url !== 'http://supabase-fixture.invalid/rest/v1/rpc/relustt_record_quiz') throw new Error('External calls disabled');
    try {
      const b=JSON.parse(options.body);
      const result=await db.query('select * from relustt_record_quiz($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [b.p_id,b.p_proof_hash,b.p_sequence,b.p_version,b.p_step,b.p_answers,b.p_result,b.p_pathway,b.p_context,b.p_events,b.p_rate_key]);
      return new Response(JSON.stringify(result.rows[0].relustt_record_quiz),{status:200});
    } catch (error) { return new Response(JSON.stringify({code:error.code,message:error.message}),{status:400}); }
  };
  const handler = require('../api/funnel-events');
  const server = http.createServer(async (req,res) => {
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (pathname === '/api/funnel-events') {
        let body='';
        for await (const chunk of req) { body+=chunk; if (Buffer.byteLength(body)>32768) {res.writeHead(413);res.end();return;} }
        req.body=body;
        return await handler(req,res);
      }
      if (pathname === '/_fixture/status') {
        const result=await db.query(`select current_step, quiz_answers, quiz_result, (select count(*)::int from relustt_quiz_events e where e.session_id=s.id) events from relustt_quiz_sessions s`);
        res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(result.rows));return;
      }
      const target=path.resolve(root,'.'+(pathname==='/'?'/funnel.html':pathname));
      if (!target.startsWith(root+path.sep) || /(^|[/\\])\./.test(pathname) || /^\/(api|server|supabase|tests|scripts)\//.test(pathname) || !types[path.extname(target)] || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        res.writeHead(404);res.end('Unavailable in tracking preview');return;
      }
      res.writeHead(200,{'Content-Type':types[path.extname(target)],'Cache-Control':'no-store'});
      fs.createReadStream(target).pipe(res);
    } catch { res.writeHead(500);res.end('Fixture request failed'); }
  });
  server.listen(port,'127.0.0.1',()=>console.log(`Temporary tracking preview: http://localhost:${port}/funnel.html?start=1`));
  process.on('SIGINT',()=>server.close(async()=>{await db.close();process.exit(0);}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
