const { sendJson, methodNotAllowed } = require('../server/http');
const { required } = require('../server/env');

module.exports = function handler(request, response) {
  if (request.method !== 'GET') return methodNotAllowed(response, ['GET']);

  try {
    sendJson(response, 200, {
      supabaseUrl: required('SUPABASE_URL'),
      supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
      plans: {
        monthly: process.env.WEB_PLAN_MONTHLY_LABEL || 'Monthly plan',
        yearly: process.env.WEB_PLAN_YEARLY_LABEL || 'Yearly plan',
      },
    });
  } catch (error) {
    sendJson(response, 503, { error: 'Authentication is not configured yet.' });
  }
};
