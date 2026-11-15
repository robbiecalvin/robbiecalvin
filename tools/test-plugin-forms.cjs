// Requires a disposable local test site; sends sample form submissions.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 assert.equal(process.env.QUICKWOO_REVIEW_DISPOSABLE,'1','Set QUICKWOO_REVIEW_DISPOSABLE=1 for a disposable test site');
 const url=process.env.WORDPRESS_REVIEW_FORM_URL;assert(url,'Set WORDPRESS_REVIEW_FORM_URL to the page created by plugin-runtime-smoke.php');
 const base=new URL(url).origin;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url);assert.equal(response.status(),200);
 for(const [selector,action] of [['.qf-form','qfrm_submit'],['#qq-frontend-form','qquo_submit_quote'],['#qs-booking-form','qsch_book_appointment']]){
  const form=page.locator(selector);assert.equal(await form.count(),1,selector);
  await form.locator('input[type=email]').fill('customer@example.test');
  if(selector==='.qf-form'){}
  if(selector==='#qq-frontend-form'){
   await form.locator('[name=client_name]').fill('Review customer');
   const select=form.locator('[name=project_type]');const value=await select.locator('option').evaluateAll(es=>es.find(e=>e.value)?.value);await select.selectOption(value);
   await form.locator('[name="line_description[]"]').fill('Review service');await form.locator('[name="line_price[]"]').fill('100');
  }
  if(selector==='#qs-booking-form'){await form.locator('[name=client_name]').fill('Review customer');await form.locator('[name=appointment_at]').fill('2030-01-01T10:00');}
  const invalid=await form.locator(':invalid').evaluateAll(es=>es.map(e=>({name:e.name,type:e.type,message:e.validationMessage})));assert.equal(invalid.length,0,'Invalid fixture fields');
  const wait=page.waitForResponse(r=>r.url().includes('admin-ajax.php')&&r.request().method()==='POST',{timeout:15000});await form.locator('button[type=submit]').click();const r=await wait;const body=await r.json();assert.equal(r.status(),200,selector+JSON.stringify(body));assert.equal(body.success,true,selector+JSON.stringify(body));console.log(selector+' submission passed');
 }
 const nonce=await page.evaluate(()=>QWSData.nonce);
 for(const action of ['qfrm_submit','qquo_submit_quote','qsch_book_appointment']){const response=await page.request.post(base+'/wp-admin/admin-ajax.php',{form:{action}});assert.equal(response.status(),403,'Missing nonce was accepted');}
 for(const invalidDate of ['not-a-date','2030-02-31T10:00','2000-01-01T10:00']){
 const bad=await page.request.post(base+'/wp-admin/admin-ajax.php',{form:{action:'qsch_book_appointment',nonce,client_name:'Invalid date review',client_email:'review@example.test',appointment_at:invalidDate}});
 assert.equal(bad.status(),400,'Invalid appointment date accepted');}
 console.log('Missing nonces and invalid/past dates rejected');
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
