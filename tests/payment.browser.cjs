// Local-only browser tests. Stripe and checkout APIs are intercepted, so these
// checks cannot charge, create a customer, or write to the production database.
// Run with PLAYWRIGHT_MODULE pointing to an existing Playwright installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const screenshotDir = process.env.CHECKOUT_SCREENSHOT_DIR || require('node:os').tmpdir();
const assets = new Set(['/payment.html', '/payment.js', '/payment.css']);
const config = {
  status: 'open', publishableKey: 'pk_test_fixture', clientSecret: 'fixture-only',
  introAmountCents: 500, renewalAmountCents: 2950, introDays: 7, currency: 'usd',
  activationUrl: '/activate?session_id=cs_test_fixture',
};
const mockStripe = `
window.confirmCalls = 0;
window.Stripe = () => ({initCheckout: () => {
  const session = {currency:'usd', status:{type:'open'}, total:{total:{amount:'$5.00',minorUnitsAmount:500}}};
  let change;
  window.changeStripeSession = (value) => change(value);
  return {
    loadActions: async () => ({type:'success',actions:{
      getSession: () => session,
      confirm: async (options) => {
        window.lastConfirmOptions=options;
        window.confirmCalls++;
        await new Promise(resolve=>setTimeout(resolve,80));
        return window.confirmResult || {type:'error',error:{message:'Your card was declined. Try another payment method.'}};
      }
    }}),
    on: (_, handler) => {change=handler;},
    createExpressCheckoutElement: (options) => {
      window.walletOptions=options;
      const handlers={}; let holder;
      window.emitWalletEvent=(name,value)=>handlers[name]?.(value);
      return {
        on:(name,handler)=>{handlers[name]=handler;},
        destroy:()=>holder?.replaceChildren(),
        mount:(selector)=>{
          holder=document.querySelector(selector);
          holder.textContent='Mock Apple Pay / Google Pay / Link';
          setTimeout(()=>handlers.ready?.({availablePaymentMethods:{applePay:true,googlePay:true,link:true}}),20);
        }
      };
    },
    createPaymentElement: (options) => {
      window.cardOptions=options;
      const handlers = {}; let frame;
      return {
        on: (name, handler) => {handlers[name]=handler;},
        destroy: () => frame?.remove(),
        mount: (selector) => {
          frame=document.createElement('iframe');
          frame.title='Mock Stripe card fields — local test only';
          frame.style.cssText='width:100%;height:185px;border:0;display:block';
          frame.srcdoc='<style>html{color-scheme:dark;background:transparent}*{box-sizing:border-box}body{margin:0;background:transparent;font:16px Inter,system-ui;color:#e0d8ef}label{display:block;font-size:14px;margin:0 0 7px}input{width:100%;height:46px;padding:12px 13px;border:1px solid #b39aff38;border-radius:10px;background:#1c1532;color:#f5f2ff;font:16px Inter,system-ui}input::placeholder{color:#a79bbd}.row{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}</style><label for="card">Card number</label><input id="card" placeholder="1234 1234 1234 1234"><div class="row"><div><label for="expiry">Expiration date</label><input id="expiry" placeholder="MM / YY"></div><div><label for="cvc">Security code</label><input id="cvc" placeholder="CVC"></div></div>';
          document.querySelector(selector).replaceChildren(frame);
          setTimeout(()=>handlers.ready?.(),20);
        }
      };
    }
  };
}});
`;

(async () => {
  const server = http.createServer((req,res) => {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname === '/activate') {res.end('Activation fixture — no real purchase');return;}
    if (!assets.has(pathname)) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(pathname)]);
    fs.createReadStream(path.join(root,pathname)).pipe(res);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {})});
    const page = await browser.newPage({viewport:{width:1280,height:1100}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    let response={...config}, responseStatus=200, apiCalls=0;
    await page.route('https://js.stripe.com/**', route=>route.fulfill({contentType:'text/javascript',body:mockStripe}));
    await page.route('**/api/checkout-details', route=>{
      apiCalls++;
      assert.equal(route.request().postDataJSON().sessionId,'cs_test_fixture');
      return route.fulfill({status:responseStatus,json:response});
    });
    const open = () => page.goto(`${base}/payment.html?session_id=cs_test_fixture&path=performance`);
    await open();
    await page.waitForFunction(()=>!document.getElementById('payButton').disabled);
    assert.equal(await page.locator('#checkoutTotal').textContent(),'$5.00');
    assert.match(await page.locator('#checkoutRenewal').textContent(),/\$5\.00.*7 days.*\$29\.50\/month/);
    await page.waitForFunction(()=>!document.getElementById('expressCheckout').hidden);
    assert.equal(await page.evaluate(()=>window.cardOptions.terms.card),'never');
    assert.equal(await page.evaluate(()=>window.cardOptions.wallets.link),'never','Link uses the express button without a duplicate signup form');
    assert.equal(await page.evaluate(()=>window.walletOptions.paymentMethods.link),'auto');
    assert.match(await page.locator('#closeCheckout').getAttribute('href'),/path=performance/);
    assert.equal(await page.locator('input').count(),1,'Only email is collected outside the payment iframe');
    await page.screenshot({path:path.join(screenshotDir,'relustt-checkout-desktop.png'),fullPage:true});
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No horizontal overflow at ${width}`);
      if(width===390) await page.screenshot({path:path.join(screenshotDir,'relustt-checkout-mobile.png'),fullPage:true});
    }
    await page.setViewportSize({width:390,height:900});
    await page.locator('#paymentEmail').fill('checkout-fixture@example.test');
    await page.evaluate(()=>{
      const form=document.getElementById('paymentForm');
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.getElementById('checkoutError').textContent.includes('declined'));
    assert.equal(await page.evaluate(()=>window.confirmCalls),1,'Double-submit is suppressed');
    assert.equal(await page.locator('#payButton').isEnabled(),true,'A failed payment can be retried');
    await page.locator('#paymentEmail').fill('');
    await page.evaluate(()=>{
      window.emitWalletEvent('confirm',{expressPaymentType:'link'});
      document.getElementById('paymentForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>window.confirmCalls===2 && !document.getElementById('payButton').disabled);
    assert.equal(await page.evaluate(()=>window.lastConfirmOptions.expressCheckoutConfirmEvent.expressPaymentType),'link','Wallet event is passed to Stripe; no external email field required');
    assert.equal(await page.evaluate(()=>window.confirmCalls),2,'Card submission cannot duplicate a wallet confirmation');
    await page.evaluate(()=>window.emitWalletEvent('availablepaymentmethodschange',{paymentMethods:null}));
    assert.equal(await page.locator('#expressCheckout').isVisible(),false,'No empty wallet section on unsupported browsers');
    assert.equal(await page.locator('#payButton').isEnabled(),true,'Card fallback stays usable');
    await page.evaluate(()=>window.emitWalletEvent('availablepaymentmethodschange',{paymentMethods:{link:true}}));
    await page.evaluate(()=>window.changeStripeSession({currency:'usd',status:{type:'open'},total:{total:{amount:'$9.00',minorUnitsAmount:900}}}));
    assert.equal(await page.locator('#payButton').isDisabled(),true,'Changed amount cannot be confirmed');
    await page.evaluate(()=>window.emitWalletEvent('confirm',{paymentFailed:()=>{window.walletRejected=true;}}));
    assert.equal(await page.evaluate(()=>window.walletRejected),true,'Changed amount also blocks wallets');
    assert.equal(await page.evaluate(()=>window.confirmCalls),2);
    response={error:'This checkout has expired. Return to your plan.'}; responseStatus=410;
    await open();
    await page.waitForFunction(()=>!document.getElementById('retryButton').hidden);
    assert.equal(await page.locator('#paymentForm').isVisible(),false);
    response={...config}; responseStatus=200;
    await page.locator('#retryButton').click();
    await page.waitForFunction(()=>!document.getElementById('payButton').disabled);
    await page.locator('#paymentEmail').fill('checkout-fixture@example.test');
    await page.evaluate(()=>{window.confirmResult={type:'success'};});
    await page.locator('#payButton').click();
    await page.waitForURL('**/activate?session_id=cs_test_fixture');
    response={status:'complete',activationUrl:config.activationUrl};
    await open();
    await page.waitForURL('**/activate?session_id=cs_test_fixture');
    const callsBefore=apiCalls;
    await page.goto(`${base}/payment.html`);
    await page.waitForFunction(()=>!document.getElementById('checkoutError').hidden);
    assert.equal(apiCalls,callsBefore,'Direct links without a Session do not create a payment');
    assert.deepEqual(errors,[]);
    console.log('PASS: desktop/mobile layout, protected-session loading, amount consistency, decline/retry, duplicate-submit, expiry, completion/activation routing and missing-session handling. All payments mocked.');
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
