import Stripe from 'npm:stripe@23.0.0';
import {services,quote,paidSessionMatches} from './core.mjs';
const origin='https://robbiecalvin.com';
const base=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeKey=Deno.env.get('RC_STRIPE_TEST_KEY')||'';
const signingSecret=Deno.env.get('RC_STRIPE_TEST_WEBHOOK_SECRET')||'';
const enabled=/^(rk|sk)_test_/.test(stripeKey)&&!!signingSecret;
const stripe=/^(rk|sk)_test_/.test(stripeKey)?new Stripe(stripeKey,{apiVersion:'2026-09-30.endive',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2}):null;
const cryptoProvider=Stripe.createSubtleCryptoProvider();
function fail(status,message){throw Object.assign(Error(message),{status});}
async function db(path,method='GET',body){
 const response=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)fail(503,'Order storage temporarily unavailable');
 return response.status===204?null:await response.json();
}
async function boundedBody(req,limit){
 const reader=req.body?.getReader();if(!reader)return '';
 let bytes=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>limit){await reader.cancel();fail(413,'Request too large');}chunks.push(value);}
 const joined=new Uint8Array(bytes);let n=0;for(const chunk of chunks){joined.set(chunk,n);n+=chunk.length;}return new TextDecoder().decode(joined);
}
async function user(req,headers){
 let auth=req.headers.get('authorization')||'';
 const cookies=parseCookies(req);
 if(cookies['__Host-rc_access'])auth='Bearer '+cookies['__Host-rc_access'];
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(auth)&&cookies['__Host-rc_refresh']){
  const s=await authCall('/token?grant_type=refresh_token','POST',{refresh_token:cookies['__Host-rc_refresh']});saveSession(headers,s);auth='Bearer '+s.access_token;
 }
 if(!/^Bearer [A-Za-z0-9_.-]+$/.test(auth))fail(401,'Sign in required');
 const response=await fetch(base+'/auth/v1/user',{headers:{apikey:serviceKey,Authorization:auth}});
 if(!response.ok){
  const refresh=cookies['__Host-rc_refresh'];if(!refresh)fail(401,'Sign in required');
  const session=await authCall('/token?grant_type=refresh_token','POST',{refresh_token:refresh});
  saveSession(headers,session);
  const check=await fetch(base+'/auth/v1/user',{headers:{apikey:serviceKey,Authorization:'Bearer '+session.access_token}});
  if(!check.ok)fail(401,'Sign in required');
  const value=await check.json();value.__access=session.access_token;return value;
 }
 const value=await response.json();
 value.__access=auth.slice(7);return value;
}
function isAdmin(value){return value.app_metadata?.rc_payments_admin===true;}
async function orderFor(id,u){
 if(!/^[0-9a-f-]{36}$/.test(id))fail(404,'Order not found');
 const rows=await db('rc_payment_orders?id=eq.'+id+'&limit=1');
 const row=rows[0];if(!row||(!isAdmin(u)&&row.user_id!==u.id))fail(404,'Order not found');return row;
}
async function webhook(req){
 if(req.method!=='POST')fail(405,'POST required');
 if(!stripe||!signingSecret)fail(503,'Sandbox webhook is awaiting secret configuration');
 let event;
 const raw=await boundedBody(req,262144);
 try{event=await stripe.webhooks.constructEventAsync(raw,req.headers.get('stripe-signature')||'',signingSecret,300,cryptoProvider);}catch{fail(400,'Invalid webhook signature');}
 if(event.livemode!==false)fail(400,'Live events are disabled');
 const seen=await db('rc_payment_events?id=eq.'+encodeURIComponent(event.id)+'&select=id');
 if(seen.length)return {received:true,duplicate:true};
 const obj=event.data.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&obj.payment_status==='paid'){
  const rows=await db('rc_payment_orders?id=eq.'+encodeURIComponent(obj.metadata?.order_id||'00000000-0000-0000-0000-000000000000')+'&limit=1');
  const order=rows[0];
  if(!order||!paidSessionMatches(order,obj))fail(400,'Payment does not match order');
  await db('rc_payment_orders?id=eq.'+order.id+'&status=in.(approved,checkout)','PATCH',{status:'paid',paid_at:new Date().toISOString(),stripe_payment_intent_id:typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id});
 } else if(event.type==='charge.refunded'&&obj.refunded===true&&obj.amount_refunded===obj.amount){
  const pi=typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id;
  if(pi)await db('rc_payment_orders?stripe_payment_intent_id=eq.'+encodeURIComponent(pi)+'&status=eq.paid','PATCH',{status:'refunded'});
 }
 // Replaying an event after a crash is safe: each state mutation is conditional.
 await db('rc_payment_events?on_conflict=id','POST',{id:event.id,type:event.type});
 return {received:true};
}
export async function handler(req){
 const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 const requestOrigin=req.headers.get('origin');
 if(requestOrigin===origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','authorization, apikey, content-type');headers.set('Access-Control-Allow-Methods','GET, POST, PATCH, OPTIONS');}
 try{
  const url=new URL(req.url);const path=url.pathname.replace(/^.*\/rc-payments/,'');
  if(path==='/webhook')return Response.json(await webhook(req),{headers});
  if(requestOrigin&&requestOrigin!==origin)fail(403,'Origin denied');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(path==='/health'&&req.method==='GET')return Response.json({mode:'sandbox',livePayments:false,checkoutReady:enabled,orders:true,accounts:true,registrationReady:Deno.env.get('RC_AUTH_EMAIL_READY')==='true'},{headers});
  const authResult=await authRoute(path,req,headers);if(authResult)return authResult;
  if(path==='/catalog'&&req.method==='GET')return Response.json({services,applications:{},mode:'sandbox'},{headers});
  const u=await user(req,headers);
  if(path==='/me'&&req.method==='GET')return Response.json({user:{id:u.id,name:u.user_metadata?.name||u.email.split('@')[0],email:u.email,verified:!!u.email_confirmed_at},admin:isAdmin(u)},{headers});
  if(path==='/me'&&req.method==='PATCH'){let b;try{b=JSON.parse(await boundedBody(req,2048));}catch{fail(400,'Invalid JSON');}const name=String(b.name||'').trim();if(name.length<1||name.length>100)fail(400,'Name must be 1–100 characters');await authCall('/user','PUT',{data:{name}},u.__access);return Response.json({updated:true},{headers});}
  if(path==='/library'&&req.method==='GET')return Response.json({products:[],activity:[]},{headers});
  if(path==='/activity'&&req.method==='POST')return Response.json({recorded:false},{headers});
  if(path==='/orders'&&req.method==='GET'){
   const filter=isAdmin(u)?'':'&user_id=eq.'+u.id;
   return Response.json({orders:(await db('rc_payment_orders?select=*&order=created_at.desc&limit=100'+filter)).map(o=>({...o,totalCents:o.total_cents}))},{headers});
  }
  let body={};
  if(req.method==='POST'){if(!(req.headers.get('content-type')||'').startsWith('application/json'))fail(415,'JSON required');try{body=JSON.parse(await boundedBody(req,8192));}catch(e){if(e.status)throw e;fail(400,'Invalid JSON');}}
  if(path==='/orders'&&req.method==='POST'){
   let values;try{values=quote(body);}catch(e){fail(400,e.message);}
   if(!u.email_confirmed_at)fail(403,'Verify your email first');
   const rows=await db('rc_payment_orders','POST',{...values,user_id:u.id});
   return Response.json({order:rows[0]},{status:201,headers});
  }
  const match=path.match(/^\/orders\/([0-9a-f-]+)\/(approve|cancel|checkout)$/);
  if(!match||req.method!=='POST')fail(404,'Endpoint not found');
  const order=await orderFor(match[1],u);const action=match[2];
  if(action==='approve'){
   if(!isAdmin(u))fail(403,'Owner approval required');
   if(order.status!=='requested')fail(409,'Order is no longer awaiting review');
   const rows=await db('rc_payment_orders?id=eq.'+order.id+'&status=eq.requested','PATCH',{status:'approved',approved_by:u.id,approved_at:new Date().toISOString()});
   if(!rows.length)fail(409,'Order changed; reload');return Response.json({order:rows[0]},{headers});
  }
  if(order.user_id!==u.id)fail(403,'Only the customer can pay or cancel');
  if(action==='cancel'){
   if(order.status!=='requested')fail(409,'Only an unapproved request can be cancelled');
   return Response.json({orders:await db('rc_payment_orders?id=eq.'+order.id+'&status=eq.requested','PATCH',{status:'cancelled'})},{headers});
  }
  if(!enabled)fail(503,'Sandbox checkout is awaiting Stripe secret configuration');
  if(!['approved','checkout'].includes(order.status))fail(409,'Owner must approve scope before checkout');
  let session;
  if(order.stripe_session_id){
   session=await stripe.checkout.sessions.retrieve(order.stripe_session_id);
   if(session.livemode!==false)fail(409,'Live session rejected');
   if(session.status==='complete')fail(409,'Payment is processing; refresh shortly');
   if(session.status==='expired')fail(409,'Checkout expired; contact Robbie for a replacement request');
  } else {
   session=await stripe.checkout.sessions.create({
    mode:'payment',integration_identifier:'robbiecalvin_sandbox_hqkvrmta',
    customer_email:u.email,client_reference_id:order.id,
    metadata:{order_id:order.id,user_id:u.id},
    payment_intent_data:{metadata:{order_id:order.id,user_id:u.id}},
    line_items:[{quantity:1,price_data:{currency:'cad',unit_amount:order.total_cents,product_data:{name:services[order.product].name+' — '+order.plan}}}],
    success_url:origin+'/account/?checkout=returned',
    cancel_url:origin+'/account/?checkout=cancelled'
   },{idempotencyKey:'rc-sandbox-'+order.id});
   if(session.livemode!==false)fail(409,'Live session rejected');
   // Retrying after a failed write retrieves the same session through Stripe idempotency.
   await db('rc_payment_orders?id=eq.'+order.id+'&status=eq.approved','PATCH',{status:'checkout',stripe_session_id:session.id});
  }
  if(!session.url||new URL(session.url).hostname!=='checkout.stripe.com')fail(503,'Checkout is unavailable');
  return Response.json({url:session.url,mode:'sandbox'},{headers});
 }catch(e){return Response.json({error:e.status?e.message:'Payment service temporarily unavailable'},{status:e.status||503,headers});}
}

function parseCookies(req){
 const result={};for(const item of (req.headers.get('cookie')||'').split(';')){
 const at=item.indexOf('=');if(at<0)continue;
 try{result[item.slice(0,at).trim()]=decodeURIComponent(item.slice(at+1));}catch{}}
 return result;
}
function saveSession(headers,s){
 for(const [name,value,age] of [['__Host-rc_access',s.access_token,Math.min(s.expires_in||3600,3600)],['__Host-rc_refresh',s.refresh_token,2592000]]){
  if(value)headers.append('Set-Cookie',name+'='+encodeURIComponent(value)+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+age);
 }
}
function clearSession(headers){for(const name of ['__Host-rc_access','__Host-rc_refresh'])headers.append('Set-Cookie',name+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');}
async function authCall(path,method='POST',body,token){
 const r=await fetch(base+'/auth/v1'+path,{method,headers:{apikey:serviceKey,'Content-Type':'application/json',Authorization:'Bearer '+(token||serviceKey)},body:body===undefined?undefined:JSON.stringify(body)});
 let data={};try{data=await r.json();}catch{}
 if(!r.ok){if(r.status===429)fail(429,'Too many attempts. Try again shortly.');fail(400,path.startsWith('/token')?'Sign-in failed. Check your email and password.':'Account request could not be completed. Check your details or try again shortly.');}
 return data;
}
async function authRoute(path,req,headers){
 if(!path.startsWith('/auth/'))return null;
 if(req.method!=='POST')fail(405,'POST required');
 if(req.headers.get('origin')!==origin)fail(403,'Origin denied');
 if(!(req.headers.get('content-type')||'').startsWith('application/json'))fail(415,'JSON required');
 let b;try{b=JSON.parse(await boundedBody(req,8192));}catch(e){if(e.status)throw e;fail(400,'Invalid JSON');}
 const email=String(b.email||'').trim().toLowerCase();
 const password=String(b.password||'');
 if(['/auth/register','/auth/login','/auth/forgot'].includes(path)&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))fail(400,'Enter a valid email address');
 const reply=data=>Response.json(data,{headers});
 if(['/auth/register','/auth/forgot','/auth/resend'].includes(path)&&Deno.env.get('RC_AUTH_EMAIL_READY')!=='true')fail(503,'Account email setup is being completed. Please contact Robbie for assistance.');
 if(path==='/auth/register'){
  if(b.accept_terms!=='on'&&b.accept_terms!==true)fail(400,'Accept the terms and privacy policy to create an account');
  const name=String(b.name||'').trim();
  if(password.length<12||password.length>128)fail(400,'Use a password of 12–128 characters');
  if(!name||name.length>100)fail(400,'Enter a name of 1–100 characters');
  const result=await authCall('/signup?redirect_to='+encodeURIComponent(origin+'/account/'),'POST',{email,password,data:{name,terms_accepted_at:new Date().toISOString(),terms_version:'2026-11-03'}});
  if(result.access_token)saveSession(headers,result);
  return reply({message:'Check your email to confirm your account, then sign in.'});
 }
 if(path==='/auth/login'){
  const result=await authCall('/token?grant_type=password','POST',{email,password});
  saveSession(headers,result);return reply({signedIn:true});
 }
 if(path==='/auth/logout'){
  const token=parseCookies(req)['__Host-rc_access'];
  if(token){const r=await fetch(base+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+token}});if(!r.ok&&r.status!==401)fail(503,'Sign-out temporarily unavailable');}
  clearSession(headers);return reply({signedOut:true});
 }
 if(path==='/auth/forgot'){
  await authCall('/recover?redirect_to='+encodeURIComponent(origin+'/account/'),'POST',{email});
  return reply({message:'If an account exists, a password reset email has been sent.'});
 }
 if(path==='/auth/callback'){
  if(typeof b.access_token!=='string'||typeof b.refresh_token!=='string'||b.access_token.length>8192||b.refresh_token.length>2048)fail(400,'Invalid confirmation link');
  const r=await fetch(base+'/auth/v1/user',{headers:{apikey:serviceKey,Authorization:'Bearer '+b.access_token}});
  if(!r.ok)fail(400,'Confirmation link expired. Request a new email.');
  saveSession(headers,{access_token:b.access_token,refresh_token:b.refresh_token,expires_in:3600});
  return reply({message:'Email confirmed. Your account is ready.'});
 }
 if(path==='/auth/reset'){
  if(password.length<12||password.length>128)fail(400,'Use a password of 12–128 characters');
  const u=await user(req,headers);
  const token=u.__access;
  await authCall('/user','PUT',{password},token);
  clearSession(headers);return reply({message:'Password updated. Sign in with your new password.'});
 }
 if(path==='/auth/resend'){
  const u=await user(req,headers);
  await authCall('/resend?redirect_to='+encodeURIComponent(origin+'/account/'),'POST',{type:'signup',email:u.email});
  return reply({message:'Confirmation email requested.'});
 }
 fail(404,'Account endpoint not found');
}

Deno.serve(handler);
