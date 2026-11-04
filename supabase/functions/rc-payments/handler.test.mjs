import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const env={SUPABASE_URL:'https://supabase.test',SUPABASE_SERVICE_ROLE_KEY:'test-service-role'};
globalThis.Deno={env:{get:k=>env[k]},serve:()=>{}};
let source=await readFile(new URL('./index.ts',import.meta.url),'utf8');
source=source.replace("import Stripe from 'npm:stripe@23.0.0';","class Stripe { static createSubtleCryptoProvider(){return {}} }");
source=source.replace("'./core.mjs'",JSON.stringify(new URL('./core.mjs',import.meta.url).href));
const {handler}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function req(path,method='GET',body,headers={}){return new Request('https://supabase.test/functions/v1/rc-payments'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});}
test('health exposes sandbox status without credentials or live checkout',async()=>{
 const r=await handler(req('/health'));const b=await r.json();assert.equal(r.status,200);assert.equal(b.livePayments,false);assert.equal(b.checkoutReady,false);assert.equal(b.registrationReady,false);assert(!JSON.stringify(b).includes('test-service-role'));
});
test('catalog is available before sign-in; private orders require authentication',async()=>{
 assert.equal((await handler(req('/catalog'))).status,200);
 assert.equal((await handler(req('/orders'))).status,401);
});
test('cross-origin requests are rejected and account signup is gated on verified email setup',async()=>{
 assert.equal((await handler(req('/auth/login','POST',{email:'test@example.com',password:'password'},{Origin:'https://attacker.test'}))).status,403);
 const r=await handler(req('/auth/register','POST',{email:'test@example.com',name:'Test',password:'long-enough-password',accept_terms:'on'},{Origin:'https://robbiecalvin.com'}));
 assert.equal(r.status,503);assert.match((await r.json()).error,/email setup/);
});
test('forged webhook cannot mark an order paid before signing secrets are configured',async()=>{
 const r=await handler(req('/webhook','POST',{livemode:false,type:'checkout.session.completed'}));assert.equal(r.status,503);
});
test('signed-in customer cannot approve another user order or set admin through user_metadata',async()=>{
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
 if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'customer',email:'customer@example.com',email_confirmed_at:'now',user_metadata:{rc_payments_admin:true},app_metadata:{}});
 if(String(url).includes('/rest/v1/rc_payment_orders'))return Response.json([{id:'12345678-1234-1234-1234-123456789012',user_id:'other',status:'requested'}]);
 throw Error('Unexpected URL');
 };
 try{
 const r=await handler(req('/orders/12345678-1234-1234-1234-123456789012/approve','POST',{}, {Origin:'https://robbiecalvin.com',Authorization:'Bearer token'}));assert.equal(r.status,404);
 }finally{globalThis.fetch=previous;}
});

