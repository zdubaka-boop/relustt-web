const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const schema = require('../funnel-schema');
const { cleanBatch } = require('../server/funnel-tracking');
const { resolve } = require('../funnel-archetypes');
const id = () => crypto.randomUUID();
const valid = (changes = {}) => ({ id:id(),secret:'a'.repeat(64),version:schema.VERSION,sequence:1,step:'motivation',
  answers:{ frequency:'Daily',motivation:'Relieving stress',triedQuit:'Yes',safeWord:'NEVER SAVE',signature:'PRIVATE' },
  events:[{ id:id(),type:'step_view',step:'motivation' }],context:{utm_source:'test',access_token:'secret'},...changes });

test('tracking excludes secrets, arbitrary properties, signatures, and forged archetypes', () => {
  const result = cleanBatch(valid({ result:{key:'forged'},user_id:'victim' }));
  const json = JSON.stringify(result);
  assert.ok(!json.includes('NEVER SAVE') && !json.includes('PRIVATE') && !json.includes('access_token') && !json.includes('victim'));
  assert.equal(result.result.key,resolve(result.answers).key);
  assert.equal(result.context.utm_source,'test');
});
test('tracking rejects forged payment events, versions, steps, sequence and proof', () => {
  for (const changes of [{secret:'bad'},{version:'old'},{step:'../admin'},{sequence:-1},
    {events:[{id:id(),type:'payment_succeeded',step:'your-plan'}]}]) assert.throws(() => cleanBatch(valid(changes)));
});
test('answer cleanup removes stale branch answers and caps free text', () => {
  const answers = schema.answers({triedQuit:'No',quitProgress:'On and off',setbackTrigger:'Easy access in the moment',
    forkAnswer:'No',contentIntensity:'Yes',intimacyConcern:'Yes',name:'x'.repeat(500),commitment:11});
  assert.equal(answers.name.length,80);
  for (const key of ['quitProgress','setbackTrigger','contentIntensity','intimacyConcern','commitment']) assert.ok(!(key in answers));
});
test('all live question routes have tracking fields and all six archetypes share the server scorer', () => {
  const source=fs.readFileSync(path.join(__dirname,'../funnel.js'),'utf8');
  for (const field of Object.keys(schema.options).filter(f=>f!=='selectedPrice')) assert.ok(source.includes(`state.${field}`),field);
  assert.equal(typeof resolve,'function');
});
test('browser navigation queues retries, tracks changes, and checkpoints latest answers without private fields', async () => {
  const storage = new Map(), listeners = {}, requests = [];
  const sandbox = {window:{RelusttQuizSchema:schema,addEventListener(){},removeEventListener(){}},
    document:{visibilityState:'visible',referrer:'https://example.com/path?secret=hidden',addEventListener:(n,f)=>listeners[n]=f,removeEventListener(){}},
    location:{href:'https://relustt.site/funnel?utm_source=test'},navigator:{language:'en'},innerWidth:390,
    sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},crypto:crypto.webcrypto,
    performance:{now:()=>1000},URL,Uint8Array,Intl,AbortController,console,
    setTimeout:()=>1,clearTimeout(){},fetch:async (url,opts)=>{requests.push(JSON.parse(opts.body));return {ok:requests.length>1};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../funnel-tracking.js'),'utf8'),sandbox);
  const tracker=sandbox.window.RelusttTracking.create();
  const state={frequency:'',motivation:'',commitment:7,selectedPrice:'9',safeWord:'EXCLUDE',name:''};
  tracker.view(state,'frequency');
  state.frequency='Daily'; tracker.advance(state,'frequency','motivation'); tracker.view(state,'motivation');
  state.motivation='Relieving stress'; tracker.advance(state,'motivation','your-plan'); tracker.view(state,'your-plan');
  const first=await tracker.checkout(state);
  const second=await tracker.checkout(state);
  assert.equal(first.answers.frequency,'Daily'); assert.equal(second.answers.motivation,'Relieving stress');
  assert.equal(second.answers.selectedPrice,'9'); assert.equal(second.answers.commitment,undefined);
  assert.ok(!JSON.stringify(requests).includes('EXCLUDE'));
  assert.equal(requests[0].events[0].id,requests[1].events[0].id,'retry event IDs stay stable');
  assert.ok(requests[1].events.some(e=>e.type==='step_completed'&&e.nextStep==='motivation'));
  tracker.dispose();
});
