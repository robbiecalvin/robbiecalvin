import test from 'node:test';import assert from 'node:assert/strict';import {quote,paidSessionMatches} from './core.mjs';
test('ignores browser total and quotes authoritative CAD price',()=>assert.equal(quote({product:'web-design',plan:'landing',quantity:1,brief:'A landing page',total_cents:1}).total_cents,10000));
test('rejects recurring care, unknown plans, prototype keys, fractional/oversized quantity',()=>{
for(const input of [{product:'wp-managment',plan:'essential'},{product:'__proto__',plan:'hour'},{product:'web-design',plan:'__proto__'},{product:'web-design',plan:'hour',quantity:0.5},{product:'web-design',plan:'hour',quantity:101}])assert.throws(()=>quote({...input,brief:'Valid scope'}));
});
test('paid state requires matching sandbox session, owner, currency, amount and reference',()=>{
const order={id:'order',user_id:'user',total_cents:10000,stripe_session_id:'cs_test_1'};
const session={id:'cs_test_1',livemode:false,mode:'payment',payment_status:'paid',currency:'cad',amount_total:10000,client_reference_id:'order',metadata:{order_id:'order',user_id:'user'}};
assert.equal(paidSessionMatches(order,session),true);
for(const patch of [{livemode:true},{payment_status:'unpaid'},{amount_total:1},{currency:'usd'},{id:'cs_test_other'},{client_reference_id:'other'},{metadata:{order_id:'order',user_id:'attacker'}}])assert.equal(paidSessionMatches(order,{...session,...patch}),false);
});

