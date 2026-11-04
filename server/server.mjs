import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,createHmac,timingSafeEqual,scrypt as scryptCallback} from 'node:crypto';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {services,applications,digitalProducts,quickwooLicenses} from './catalog.mjs';
const scrypt=promisify(scryptCallback);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=value=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const safeEqual=(a,b)=>Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const publicUser=user=>({id:user.id,email:user.email,name:user.name,verified:Boolean(user.verified)});
const publicOrder=order=>({id:order.id,product:order.product,plan:order.plan,quantity:order.quantity,totalCents:order.total,currency:'CAD',status:order.status,brief:order.brief,createdAt:order.created_at});

export async function createApp(options={}) {
  const env=options.env||process.env;
  const origin=new URL(env.APP_ORIGIN||'http://localhost:8787').origin;
  const local=['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname);
  if(!local&&!origin.startsWith('https://'))throw Error('APP_ORIGIN must use HTTPS in production.');
  const dataDir=path.resolve(env.DATA_DIR||path.join(ROOT,'.local-data'));
  await mkdir(dataDir,{recursive:true,mode:0o700});
  const db=new DatabaseSync(path.join(dataDir,'accounts.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,verified INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS tokens(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),purpose TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product TEXT NOT NULL,plan TEXT NOT NULL,quantity INTEGER NOT NULL,total INTEGER NOT NULL,status TEXT NOT NULL,brief TEXT NOT NULL,created_at INTEGER NOT NULL,stripe_session TEXT,payment_intent TEXT);
  CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS entitlements(user_id TEXT NOT NULL REFERENCES users(id),product TEXT NOT NULL,order_id TEXT NOT NULL REFERENCES orders(id),active INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(user_id,product,order_id));
  CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),product TEXT NOT NULL,kind TEXT NOT NULL,created_at INTEGER NOT NULL);`);
  const admins=new Set((env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
  const mailReady=Boolean(options.sendMail || (env.EMAIL_API_KEY&&env.EMAIL_FROM) || (local&&env.MAIL_MODE==='file'));
  const paymentsReady=Boolean(env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET);
  const cookieName=local?'rc_session':'__Host-rc_session';
  const buckets=new Map();
  const stripe=options.stripeRequest||(async (endpoint,params,key)=>{
    const response=await fetch(`https://api.stripe.com/v1/${endpoint}`,{method:'POST',headers:{Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':key},body:params,signal:AbortSignal.timeout(15000)});
    const value=await response.json();if(!response.ok)fail(502,'Payment provider unavailable. Please try again later.');return value;
  });
  const send=options.sendMail||(async ({to,subject,url})=>{
    if(local&&env.MAIL_MODE==='file'){
      const folder=path.join(dataDir,'mail');await mkdir(folder,{recursive:true,mode:0o700});
      await writeFile(path.join(folder,`${randomUUID()}.txt`),`To: ${to}\nSubject: ${subject}\n\n${url}\n`,{mode:0o600});return;
    }
    if(!mailReady)fail(503,'Account email delivery is not configured.');
    const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.EMAIL_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text:`${subject}\n\n${url}\n\nIf you did not request this, you can ignore this email.`}),signal:AbortSignal.timeout(15000)});
    if(!response.ok)fail(503,'Account email delivery is temporarily unavailable.');
  });
  function rate(req,scope,limit=20) {
    // Proxy headers are not trusted. Deploy behind a proxy that also rate-limits authentication.
    const key=`${scope}:${req.socket.remoteAddress}`;const now=Date.now();let entry=buckets.get(key);
    if(!entry||entry.until<now){entry={count:0,until:now+15*60*1000};buckets.set(key,entry);}
    if(++entry.count>limit)fail(429,'Too many attempts. Try again in 15 minutes.');
    if(buckets.size>5000)for(const [k,v]of buckets)if(v.until<now)buckets.delete(k);
  }
  async function body(req,raw=false) {
    if(!raw&&!String(req.headers['content-type']).startsWith('application/json'))fail(415,'Use application/json.');
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000)fail(413,'Request too large.');chunks.push(chunk);}const value=Buffer.concat(chunks);
    if(raw)return value;
    try{return JSON.parse(value.toString());}catch{fail(400,'Invalid JSON.');}
  }
  function user(req) {
    const cookies=String(req.headers.cookie||'').split(';').map(v=>v.trim());const value=cookies.find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if(!value)return null;
    return db.prepare('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.digest=? AND sessions.expires>?').get(hash(value),Date.now())||null;
  }
  function session(res,id){const value=token();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(value),id,Date.now()+7*86400000);res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${local?'':'; Secure'}`);}
  function clearSession(req,res){const value=String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(value)db.prepare('DELETE FROM sessions WHERE digest=?').run(hash(value));res.setHeader('Set-Cookie',`${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${local?'':'; Secure'}`);}
  async function sendToken(u,purpose){const value=token();const digest=hash(value);db.prepare('INSERT INTO tokens VALUES(?,?,?,?)').run(digest,u.id,purpose,Date.now()+(purpose==='verify'?86400000:3600000));try{await send({to:u.email,subject:purpose==='verify'?'Verify your Robbie Calvin account':'Reset your Robbie Calvin password',url:`${origin}/account/#${purpose}=${value}`});}catch(error){db.prepare('DELETE FROM tokens WHERE digest=?').run(digest);throw error;}}
  async function password(value){if(typeof value!=='string'||value.length<12||value.length>128)fail(400,'Use a password between 12 and 128 characters.');const salt=token();return `${salt}:${(await scrypt(value,salt,64)).toString('hex')}`;}
  async function passwordMatches(value,stored){if(typeof value!=='string'||value.length>128)return false;const [salt,expected]=stored.split(':');return safeEqual((await scrypt(value,salt,64)).toString('hex'),expected);}
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  async function webhook(req,res){
    if(!env.STRIPE_WEBHOOK_SECRET)fail(503,'Webhook is not configured.');
    const raw=await body(req,true);const signature=String(req.headers['stripe-signature']||'');const t=signature.split(',').find(s=>s.startsWith('t='))?.slice(2);const signatures=signature.split(',').filter(s=>s.startsWith('v1=')).map(s=>s.slice(3));
    if(!t||!/^\d+$/.test(t)||Math.abs(Date.now()/1000-Number(t))>300||!signatures.some(s=>safeEqual(s,createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${t}.`).update(raw).digest('hex'))))fail(400,'Invalid webhook signature.');
    let event;try{event=JSON.parse(raw);}catch{fail(400,'Invalid event.');}if(typeof event.id!=='string')fail(400,'Missing event ID.');
    if(db.prepare('SELECT 1 FROM events WHERE id=?').get(event.id))return json(res,200,{received:true});
    const obj=event.data?.object;
    db.exec('BEGIN IMMEDIATE');
    try{
      if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)&&obj?.payment_status==='paid'){
        if(typeof obj.metadata?.order_id!=='string')fail(400,'Missing order reference.');
        const order=db.prepare('SELECT * FROM orders WHERE id=?').get(obj.metadata.order_id);
        if(!order||obj.id!==order.stripe_session||obj.currency!=='cad'||obj.amount_subtotal!==order.total)fail(400,'Payment does not match order.');
        db.prepare("UPDATE orders SET status='paid',payment_intent=? WHERE id=?").run(typeof obj.payment_intent==='string'?obj.payment_intent:null,order.id);
        if(digitalProducts[order.product])db.prepare('INSERT OR IGNORE INTO entitlements VALUES(?,?,?,1)').run(order.user_id,order.product,order.id);
      }
      if(event.type==='charge.refunded'&&obj?.refunded){const order=db.prepare('SELECT * FROM orders WHERE payment_intent=?').get(obj.payment_intent);if(order){db.prepare("UPDATE orders SET status='refunded' WHERE id=?").run(order.id);db.prepare('UPDATE entitlements SET active=0 WHERE order_id=?').run(order.id);}}
      db.prepare('INSERT INTO events VALUES(?)').run(event.id);db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    json(res,200,{received:true});
  }
  const handler=async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    const url=new URL(req.url,'http://localhost');const route=url.pathname;
    try{
      if(route.startsWith('/api/')){
        const requestOrigin=req.headers.origin;
        if(requestOrigin&&requestOrigin!==origin)fail(403,'Origin not allowed.');
        if(requestOrigin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
        if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end();}
        if(req.method!=='GET'&&route!=='/api/stripe/webhook'&&requestOrigin!==origin)fail(403,'A matching Origin header is required.');
        if(route==='/api/health'&&req.method==='GET')return json(res,200,{accounts:mailReady,payments:paymentsReady});
        if(route==='/api/catalog'&&req.method==='GET')return json(res,200,{services,applications,pluginLicenses:quickwooLicenses,digitalProducts:Object.values(digitalProducts).map(({file,...product})=>product)});
        if(route==='/api/stripe/webhook'&&req.method==='POST')return await webhook(req,res);
        if(route==='/api/auth/register'&&req.method==='POST'){
          rate(req,'register',8);if(!mailReady)fail(503,'Account email delivery is not configured.');const data=await body(req);const email=String(data.email||'').trim().toLowerCase();const name=String(data.name||'').trim();
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>100)fail(400,'Enter a valid name and email.');
          const encoded=await password(data.password);
          if(!db.prepare('SELECT 1 FROM users WHERE email=?').get(email)){const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,0,?)').run(id,email,name,encoded,Date.now());await sendToken({id,email},'verify');}
          return json(res,202,{message:'If the address is available, a verification email has been sent. You can resend verification after signing in.'});
        }
        if(route==='/api/auth/login'&&req.method==='POST'){
          rate(req,'login',20);const data=await body(req);const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(data.email||'').trim().toLowerCase());
          const dummy='0'.repeat(64)+':'+'0'.repeat(128);const valid=await passwordMatches(data.password,u?.password||dummy);
          if(!u||!valid)fail(401,'Email or password is incorrect.');clearSession(req,res);session(res,u.id);return json(res,200,{user:publicUser(u),admin:admins.has(u.email)});
        }
        if(route==='/api/auth/verify'&&req.method==='POST'){
          rate(req,'verify');const data=await body(req);const row=db.prepare("SELECT * FROM tokens WHERE digest=? AND purpose='verify' AND expires>?").get(hash(String(data.token||'')),Date.now());if(!row)fail(400,'This verification link has expired or was already used.');
          db.prepare('UPDATE users SET verified=1 WHERE id=?').run(row.user_id);db.prepare("DELETE FROM tokens WHERE user_id=? AND purpose='verify'").run(row.user_id);return json(res,200,{message:'Email verified. You can sign in.'});
        }
        if(route==='/api/auth/forgot'&&req.method==='POST'){
          rate(req,'forgot',6);if(!mailReady)fail(503,'Account email delivery is not configured.');const data=await body(req);const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(data.email||'').trim().toLowerCase());if(u)await sendToken(u,'reset');return json(res,200,{message:'If the account exists, a reset email has been sent.'});
        }
        if(route==='/api/auth/reset'&&req.method==='POST'){
          rate(req,'reset',10);const data=await body(req);const row=db.prepare("SELECT * FROM tokens WHERE digest=? AND purpose='reset' AND expires>?").get(hash(String(data.token||'')),Date.now());if(!row)fail(400,'This reset link has expired or was already used.');const encoded=await password(data.password);
          db.exec('BEGIN IMMEDIATE');try{const freshToken=db.prepare("SELECT 1 FROM tokens WHERE digest=? AND purpose='reset' AND expires>?").get(hash(String(data.token||'')),Date.now());if(!freshToken)fail(400,'This reset link has expired or was already used.');db.prepare('UPDATE users SET password=? WHERE id=?').run(encoded,row.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);db.prepare("DELETE FROM tokens WHERE user_id=? AND purpose='reset'").run(row.user_id);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}clearSession(req,res);return json(res,200,{message:'Password changed. Please sign in again.'});
        }
        const u=user(req);if(!u)fail(401,'Please sign in.');
        if(route==='/api/me'&&req.method==='GET')return json(res,200,{user:publicUser(u),admin:admins.has(u.email)});
        if(route==='/api/me'&&req.method==='PATCH'){const data=await body(req);const name=String(data.name||'').trim();if(!name||name.length>100)fail(400,'Use a name between 1 and 100 characters.');db.prepare('UPDATE users SET name=? WHERE id=?').run(name,u.id);return json(res,200,{user:publicUser({...u,name})});}
        if(route==='/api/auth/logout'&&req.method==='POST'){clearSession(req,res);return json(res,200,{message:'Signed out.'});}
        if(route==='/api/auth/resend'&&req.method==='POST'){rate(req,'resend',5);if(!u.verified)await sendToken(u,'verify');return json(res,200,{message:'Check your email for verification.'});}
        if(route==='/api/library'&&req.method==='GET')return json(res,200,{activity:db.prepare('SELECT product,kind,created_at FROM activity WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(u.id),products:db.prepare('SELECT DISTINCT product FROM entitlements WHERE user_id=? AND active=1').all(u.id)});
        if(route==='/api/activity'&&req.method==='POST'){const data=await body(req);if(!applications[data.product])fail(400,'Unknown application.');db.prepare('INSERT INTO activity VALUES(?,?,?,?,?)').run(randomUUID(),u.id,data.product,'launch',Date.now());return json(res,201,{url:applications[data.product].url});}
        if(route==='/api/orders'&&req.method==='GET'){const rows=admins.has(u.email)&&u.verified?db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all():db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100').all(u.id);return json(res,200,{orders:rows.map(order=>{const value=publicOrder(order);if(admins.has(u.email)&&u.verified){const customer=db.prepare('SELECT name,email FROM users WHERE id=?').get(order.user_id);value.customer=customer;}return value;})});}
        if(route==='/api/orders'&&req.method==='POST'){
          rate(req,'orders',30);if(!u.verified)fail(403,'Verify your email before requesting an order.');const data=await body(req);const service=services[data.product];const digital=digitalProducts[data.product];let total;let plan=data.plan;
          const quantity=Number(data.quantity??1);if(!Number.isInteger(quantity)||quantity<1||quantity>40)fail(400,'Choose a quantity from 1 to 40.');
          if(service){if(!Object.hasOwn(service.plans,plan))fail(400,'Unknown service option.');const canMultiply=plan==='hour'||(data.product==='wp-managment'&&plan!=='hour');if(!canMultiply&&quantity!==1)fail(400,'This package is ordered once.');total=service.plans[plan]*quantity;}
          else if(digital){if(quantity!==1)fail(400,'Digital products use one entitlement per order.');total=digital.priceCents;plan='download';}else fail(400,'Unknown product.');
          const brief=String(data.brief||'').trim();if(brief.length>4000||(service&&brief.length<10))fail(400,'Add a project description between 10 and 4,000 characters.');
          const id=randomUUID();db.prepare('INSERT INTO orders(id,user_id,product,plan,quantity,total,status,brief,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,u.id,data.product,plan,quantity,total,service?'requested':'approved',brief,Date.now());return json(res,201,{order:publicOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id))});
        }
        const cancellation=route.match(/^\/api\/orders\/([a-f0-9-]+)\/cancel$/);
        if(cancellation&&req.method==='POST'){
          const order=db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(cancellation[1],u.id);
          if(!order)fail(404,'Order not found.');
          if(!['requested','approved'].includes(order.status))fail(409,'This order cannot be cancelled here. Contact Robbie about paid or checkout orders.');
          db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(order.id);
          return json(res,200,{message:'Service request cancelled.'});
        }
        const orderRoute=route.match(/^\/api\/orders\/([a-f0-9-]+)\/(approve|checkout)$/);
        if(orderRoute&&req.method==='POST'){
          if(!u.verified)fail(403,'Verify your email first.');const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderRoute[1]);if(!order)fail(404,'Order not found.');
          if(orderRoute[2]==='approve'){if(!admins.has(u.email))fail(403,'Only the site owner can approve a service scope.');if(order.status!=='requested')fail(409,'This order is not awaiting approval.');db.prepare("UPDATE orders SET status='approved' WHERE id=?").run(order.id);return json(res,200,{message:'Scope approved. The customer can pay once checkout is configured.'});}
          if(order.user_id!==u.id)fail(404,'Order not found.');if(!paymentsReady)fail(503,'Payment processing is not connected yet.');if(!['approved','checkout'].includes(order.status))fail(409,'This order is not ready for payment.');
          const recurring=order.product==='wp-managment'&&order.plan!=='hour';
          const params=new URLSearchParams({mode:recurring?'subscription':'payment',customer_email:u.email,success_url:`${origin}/account/?checkout=returned`,cancel_url:`${origin}/account/?checkout=cancelled`,'metadata[order_id]':order.id,'line_items[0][price_data][currency]':'cad','line_items[0][price_data][unit_amount]':String(order.total),'line_items[0][price_data][product_data][name]':`${services[order.product]?.name||digitalProducts[order.product]?.name} / ${order.plan}`,'line_items[0][quantity]':'1'});
          // Recurring care needs subscription lifecycle handling before it can be sold.
          if(recurring)fail(503,'Recurring care billing is not enabled. Contact Robbie to arrange this plan.');
          db.prepare("UPDATE orders SET status='checkout' WHERE id=? AND status='approved'").run(order.id);
          let checkout;
          try{checkout=await stripe('checkout/sessions',params,order.id);if(!checkout.id||!checkout.url?.startsWith('https://checkout.stripe.com/'))fail(502,'Invalid checkout response.');}
          catch(error){if(!order.stripe_session)db.prepare("UPDATE orders SET status='approved' WHERE id=? AND status='checkout' AND stripe_session IS NULL").run(order.id);throw error;}
          db.prepare("UPDATE orders SET stripe_session=? WHERE id=? AND status='checkout'").run(checkout.id,order.id);return json(res,200,{url:checkout.url});
        }
        const download=route.match(/^\/api\/downloads\/([a-z0-9-]+)$/);
        if(download&&req.method==='GET'){
          const product=digitalProducts[download[1]];if(!product||!db.prepare('SELECT 1 FROM entitlements WHERE user_id=? AND product=? AND active=1').get(u.id,download[1]))fail(403,'No active download entitlement.');
          const downloadDir=await realpath(path.resolve(env.DOWNLOAD_DIR||path.join(dataDir,'downloads')));const file=await realpath(path.resolve(downloadDir,product.file));if(!file.startsWith(downloadDir+path.sep))fail(403,'Invalid download.');const info=await stat(file);
          db.prepare('INSERT INTO activity VALUES(?,?,?,?,?)').run(randomUUID(),u.id,download[1],'download',Date.now());res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':info.size,'Content-Disposition':`attachment; filename="${path.basename(product.downloadName||file).replace(/[^a-zA-Z0-9._-]/g,'_')}"`,'Cache-Control':'no-store'});return createReadStream(file).pipe(res);
        }
        fail(404,'API endpoint not found.');
      }
      if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');
      // Serve only public site routes and static assets; never backend files or private data.
      if(route==='/assets/scripts/account-config.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end('window.RC_ACCOUNT = {enabled: true, apiBaseUrl: ""};');}
      const decoded=decodeURIComponent(route);if(decoded.split('/').some(v=>v.startsWith('.')||v==='server'||v==='docs'))fail(404,'Not found.');
      if(decoded!=='/'&&!decoded.startsWith('/assets/')&&!/^\/(?:[a-z0-9-]+\/){1,3}(?:index\.html)?$/.test(decoded))fail(404,'Not found.');
      let file=path.resolve(ROOT,'.'+decoded);if(!file.startsWith(ROOT+path.sep)&&file!==ROOT)fail(404,'Not found.');let info=await stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}const resolved=await realpath(file);if(!resolved.startsWith(ROOT+path.sep))fail(404,'Not found.');
      const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);
    }catch(error){if(res.headersSent){res.destroy();return;}const status=error.status||(error.code==='ENOENT'?404:500);json(res,status,{error:status===500?'The service is temporarily unavailable.':error.message});}
  };
  const server=http.createServer(handler);
  server.on('close',()=>db.close());
  return {server,db};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server}=await createApp();server.listen(Number(process.env.PORT||8787),process.env.HOST||'127.0.0.1',()=>console.log('Account server is listening. See server/README.md for configuration.'));
}
