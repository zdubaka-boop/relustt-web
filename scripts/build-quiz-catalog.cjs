const fs = require('node:fs');
const path = require('node:path');
const schema = require('../funnel-schema');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = schema.steps.map(([id, key, label], index) => {
  const tags = [key ? 'question' : 'information'];
  if (['brain-conditioning','performance-content-intensity','arousal-threshold','performance-commitment'].includes(id)) tags.push('performance');
  else if (['intimacy-concern','intimacy-worry','quit-progress','setback-trigger'].includes(id)) tags.push('conditional');
  else tags.push('shared');
  if (['choose-price','your-plan'].includes(id)) tags.push('offer');
  return `(${quote(schema.VERSION)},${quote(id)},${index},${quote(label)},${key ? quote(key) : 'null'},array[${tags.map(quote).join(',')}])`;
});
const sql = `-- Generated from funnel-schema.js. Existing version definitions are immutable.\nbegin;\ninsert into public.relustt_quiz_definitions(quiz_version,step_id,sort_order,label,answer_key,tags) values\n${rows.join(',\n')}\non conflict do nothing;\ncommit;\n`;
fs.writeFileSync(path.join(__dirname,'../supabase/migrations/202609200002_quiz_catalog.sql'), sql);
console.log(`Published local definition for ${schema.steps.length} steps; no database connection made.`);
