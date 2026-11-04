import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {once} from 'node:events';
import {createApp} from './server.mjs';
import {digitalProducts} from './catalog.mjs';

test('account, order, payment, and entitlement boundaries',async t=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'rc-account-test-')),emails=[];let checkoutAmount;
 const env={APP_ORIGIN:'http://localhost:8787',DATA_DIR:dir,ADMIN_EMAILS:'owner@example.test',STRIPE_SECRET_KEY:'test-only',STRIPE_WEBHOOK_SECRET:'test-webhook-signing-key'};
 const app=await createApp({env,sendMail:async m=>emails.push(m),stripeRequest:async(endpoint,params)=>{checkoutAmount=params.get('line_items[0][price_data][unit_amount]');return{id:'cs_test_'+params.get('metadata[order_id]'),url:'https://checkout.stripe.com/c/pay/test'};}});
 app.server.listen(0,'127.0.0.1');await once(app.server,'listening');const base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));await rm(dir,{recursive:true,force:true});delete digitalProducts['test-download'];});
 async function api(route,{method='GET',body,cookie,origin=env.APP_ORIGIN}={}){const response=await fetch(base+route,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return{response,data:await response.json()};}
 async function login(email,password='a-test-password-123'){const{response}=await api('/api/auth/login',{method:'POST',body:{email,password}});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);return cookie.split(';')[0];}
 async function register(email){assert.equal((await api('/api/auth/register',{method:'POST',body:{name:'Test person',email,password:'a-test-password-123'}})).response.status,202);const m=emails.findLast(m=>m.to===email);const token=new URLSearchParams(new URL(m.url).hash.slice(1)).get('verify');assert.equal((await api('/api/auth/verify',{method:'POST',body:{token}})).response.status,200);return login(email);}
 const customer=await register('customer@example.test'),other=await register('other@example.test'),admin=await register('owner@example.test');let order;
 await t.test('profiles, hashed passwords, cookies, origin restrictions, and private files',async()=>{
  assert.notEqual(app.db.prepare('SELECT password FROM users WHERE email=?').get('customer@example.test').password,'a-test-password-123');
  assert.equal((await api('/api/me',{cookie:customer})).data.user.email,'customer@example.test');assert.equal((await api('/api/me')).response.status,401);
  assert.equal((await api('/api/me',{method:'PATCH',cookie:customer,origin:'https://attacker.example',body:{name:'bad'}})).response.status,403);
  assert.equal((await api('/api/me',{method:'PATCH',cookie:customer,body:{name:'Updated'}})).data.user.name,'Updated');
  assert.equal((await api('/.local-data/accounts.sqlite')).response.status,404);assert.equal((await api('/server/server.mjs')).response.status,404);
 });
 await t.test('server prices and service scope approval; other users cannot see or pay the order',async()=>{
  const r=await api('/api/orders',{method:'POST',cookie:customer,body:{product:'personal-assistant',plan:'five',quantity:1,total:1,brief:'Five hours of administrative support.'}});assert.equal(r.response.status,201);order=r.data.order;assert.equal(order.totalCents,10000);
  assert.equal((await api(`/api/orders/${order.id}/checkout`,{method:'POST',cookie:customer,body:{}})).response.status,409);
  assert.equal((await api(`/api/orders/${order.id}/approve`,{method:'POST',cookie:customer,body:{}})).response.status,403);
  assert.equal((await api('/api/orders',{cookie:other})).data.orders.length,0);
  assert.equal((await api('/api/orders',{method:'POST',cookie:customer,body:{product:'__proto__',plan:'five',brief:'Unknown catalog test'}})).response.status,400);
  assert.equal((await api(`/api/orders/${order.id}/approve`,{method:'POST',cookie:admin,body:{}})).response.status,200);
  assert.equal((await api(`/api/orders/${order.id}/checkout`,{method:'POST',cookie:other,body:{}})).response.status,404);
  assert.equal((await api(`/api/orders/${order.id}/checkout`,{method:'POST',cookie:customer,body:{}})).response.status,200);assert.equal(checkoutAmount,'10000');
 });
 async function event(event,valid=true){const raw=JSON.stringify(event),t=String(Math.floor(Date.now()/1000));const signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(t+'.'+raw).digest('hex');return fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':valid?`t=${t},v1=${signature}`:'invalid'},body:raw});}
 await t.test('only matching signed paid webhooks complete orders; duplicate events are idempotent',async()=>{
  const payload={id:'evt_paid',type:'checkout.session.completed',data:{object:{id:'cs_test_'+order.id,metadata:{order_id:order.id},payment_status:'paid',currency:'cad',amount_subtotal:10000,payment_intent:'pi_service'}}};
  assert.equal((await event(payload,false)).status,400);assert.equal(app.db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'checkout');
  assert.equal((await event({...payload,id:'evt_wrong',data:{object:{...payload.data.object,amount_subtotal:1}}})).status,400);
  assert.equal((await event(payload)).status,200);assert.equal((await event(payload)).status,200);assert.equal(app.db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'paid');
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM events WHERE id=?').get('evt_paid').n,1);
 });
 await t.test('downloads require a paid entitlement and full refunds revoke it',async()=>{
  await mkdir(path.join(dir,'downloads'));await writeFile(path.join(dir,'downloads','test.zip'),'test release');digitalProducts['test-download']={name:'Test release',priceCents:1200,file:'test.zip',downloadName:'release.zip'};
  const created=await api('/api/orders',{method:'POST',cookie:customer,body:{product:'test-download',quantity:1}});assert.equal(created.response.status,201);const id=created.data.order.id;
  assert.equal((await api('/api/downloads/test-download',{cookie:customer})).response.status,403);await api(`/api/orders/${id}/checkout`,{method:'POST',cookie:customer,body:{}});
  assert.equal((await event({id:'evt_digital',type:'checkout.session.completed',data:{object:{id:'cs_test_'+id,metadata:{order_id:id},payment_status:'paid',currency:'cad',amount_subtotal:1200,payment_intent:'pi_download'}}})).status,200);
  const downloaded=await fetch(base+'/api/downloads/test-download',{headers:{Cookie:customer}});assert.equal(downloaded.status,200);assert.equal(await downloaded.text(),'test release');
  assert.equal((await api('/api/downloads/test-download',{cookie:other})).response.status,403);assert.equal((await api('/api/library',{cookie:customer})).data.activity[0].kind,'download');
  await event({id:'evt_refund',type:'charge.refunded',data:{object:{payment_intent:'pi_download',refunded:true}}});assert.equal((await api('/api/downloads/test-download',{cookie:customer})).response.status,403);
 });
 await t.test('application launches are separate from file downloads and owned by the user',async()=>{assert.equal((await api('/api/activity',{method:'POST',cookie:customer,body:{product:'speechflow'}})).response.status,201);assert.equal((await api('/api/library',{cookie:customer})).data.activity[0].kind,'launch');assert.equal((await api('/api/library',{cookie:other})).data.activity.length,0);});
 await t.test('unverified accounts, invalid quantities, cancellation ownership, and expired links',async()=>{
  await api('/api/auth/register',{method:'POST',body:{name:'Not verified',email:'unverified@example.test',password:'an-unverified-password'}});
  const unverified=await login('unverified@example.test','an-unverified-password');
  assert.equal((await api('/api/orders',{method:'POST',cookie:unverified,body:{product:'personal-assistant',plan:'one',brief:'A requested task'}})).response.status,403);
  const verification=new URLSearchParams(new URL(emails.at(-1).url).hash.slice(1)).get('verify');
  app.db.prepare("UPDATE tokens SET expires=0 WHERE purpose='verify'").run();
  assert.equal((await api('/api/auth/verify',{method:'POST',body:{token:verification}})).response.status,400);
  assert.equal((await api('/api/orders',{method:'POST',cookie:other,body:{product:'web-design',plan:'landing',quantity:0,brief:'A landing page'}})).response.status,400);
  const created=await api('/api/orders',{method:'POST',cookie:other,body:{product:'web-design',plan:'landing',quantity:1,brief:'A landing page'}});const id=created.data.order.id;
  assert.equal((await api(`/api/orders/${id}/cancel`,{method:'POST',cookie:customer,body:{}})).response.status,404);
  assert.equal((await api(`/api/orders/${id}/cancel`,{method:'POST',cookie:other,body:{}})).response.status,200);
  assert.equal((await api(`/api/orders/${id}/checkout`,{method:'POST',cookie:other,body:{}})).response.status,409);
 });
 await t.test('a reset token cannot be consumed by two concurrent requests',async()=>{
  await api('/api/auth/forgot',{method:'POST',body:{email:'other@example.test'}});
  const token=new URLSearchParams(new URL(emails.at(-1).url).hash.slice(1)).get('reset');
  const attempts=await Promise.all(['concurrent-password-one','concurrent-password-two'].map(password=>api('/api/auth/reset',{method:'POST',body:{token,password}})));
  assert.deepEqual(attempts.map(r=>r.response.status).sort(),[200,400]);
 });
 await t.test('password resets are one-use and invalidate sessions; logout clears authentication',async()=>{
  await api('/api/auth/forgot',{method:'POST',body:{email:'customer@example.test'}});const value=new URLSearchParams(new URL(emails.at(-1).url).hash.slice(1)).get('reset');
  assert.equal((await api('/api/auth/reset',{method:'POST',body:{token:value,password:'a-new-password-456'}})).response.status,200);assert.equal((await api('/api/me',{cookie:customer})).response.status,401);
  assert.equal((await api('/api/auth/reset',{method:'POST',body:{token:value,password:'another-password-789'}})).response.status,400);
  const fresh=await login('customer@example.test','a-new-password-456');await api('/api/auth/logout',{method:'POST',cookie:fresh,body:{}});assert.equal((await api('/api/me',{cookie:fresh})).response.status,401);
 });
});
