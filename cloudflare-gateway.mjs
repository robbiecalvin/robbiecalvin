const ORIGIN='https://robbiecalvin.com';
const API='https://fzjcoxmrwquofkqdryqh.supabase.co/functions/v1/rc-payments';
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',zip:'application/zip',json:'application/json; charset=utf-8',svg:'image/svg+xml',png:'image/png',webp:'image/webp',jpg:'image/jpeg',jpeg:'image/jpeg',ico:'image/x-icon',xml:'application/xml; charset=utf-8',txt:'text/plain; charset=utf-8',woff2:'font/woff2'};
const secure={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Strict-Transport-Security':'max-age=86400'};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com; frame-ancestors 'self'; upgrade-insecure-requests";
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.hostname!=='robbiecalvin.com')return new Response('Not found',{status:404,headers:secure});
 if(u.protocol!=='https:'){u.protocol='https:';return Response.redirect(u.href,308);}
 try{
 if(u.pathname.startsWith('/api/')){
  const path=u.pathname.slice(4);
  const webhook=path==='/stripe/webhook';
  if(!['GET','POST','PATCH','OPTIONS'].includes(req.method))return Response.json({error:'Method not allowed'},{status:405,headers:secure});
  if(!webhook&&['POST','PATCH'].includes(req.method)&&req.headers.get('origin')!==ORIGIN)return Response.json({error:'Origin denied'},{status:403,headers:secure});
  if(!webhook&&req.method!=='OPTIONS'&&env.API_LIMITER){const limit=await env.API_LIMITER.limit({key:(req.headers.get('CF-Connecting-IP')||'unknown')+':'+(path.startsWith('/auth/')?'auth':'api')});if(!limit.success)return Response.json({error:'Too many requests. Try again shortly.'},{status:429,headers:{...secure,'Retry-After':'60','Cache-Control':'no-store'}});}
  const target=API+(webhook?'/webhook':path);
  const headers=new Headers();for(const key of ['content-type','cookie','authorization','origin','stripe-signature']){const value=req.headers.get(key);if(value)headers.set(key,value);}
  const response=await fetch(target,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:req.body,redirect:'manual',signal:AbortSignal.timeout(25000)});
  const out=new Headers(response.headers);for(const [k,v]of Object.entries(secure))out.set(k,v);
  out.set('Cache-Control','private, no-store');out.set('X-Robots-Tag','noindex, nofollow, noarchive');out.delete('Access-Control-Allow-Origin');out.delete('Access-Control-Allow-Credentials');
  return new Response(response.body,{status:response.status,headers:out});
 }
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers:secure});
 let path;
 try{path=decodeURIComponent(u.pathname);}catch{return new Response('Bad path',{status:400,headers:secure});}
 if(path.includes('\\')||path.includes('\0')||path.split('/').some(x=>x.startsWith('.'))||path.includes('//'))return new Response('Not found',{status:404,headers:secure});
 if(!path.split('/').pop().includes('.')){
  if(!path.endsWith('/')){u.pathname+='/';return Response.redirect(u.href,308);}
  path+='index.html';
 }
 const ext=path.split('.').pop().toLowerCase();
 const allowed=/^\/downloads\/wordpress\/[a-z0-9-]+\.zip$/.test(path)||path==='/robots.txt'||path==='/sitemap.xml'||/^\/assets\/(images|styles|scripts|data)\//.test(path)||/^\/(favicon[^/]*\.(svg|ico|png)|apple-touch-icon\.png)$/.test(path)||path.endsWith('/index.html');
 if(!allowed||!types[ext])return new Response('Not found',{status:404,headers:secure});
 const upstream=await fetch('https://raw.githubusercontent.com/robbiecalvin/robbiecalvin/main'+path,{method:req.method,headers:{Accept:'*/*'},redirect:'manual',signal:AbortSignal.timeout(20000),cf:{cacheTtl:ext==='html'?30:300,cacheEverything:true}});
 if(upstream.status!==200)return new Response('Page not found',{status:upstream.status===404?404:502,headers:{...secure,'Cache-Control':'no-store'}});
 const headers=new Headers(secure);headers.set('Content-Type',types[ext]);if(ext==='zip')headers.set('Content-Disposition','attachment; filename="'+path.split('/').pop()+'"');headers.set('Content-Security-Policy',csp);headers.set('Cache-Control',ext==='html'?'public, max-age=0, must-revalidate':'public, max-age=300');
 if(/^\/(account|assistant-hq|brenden|payments-test)(\/|$)/.test(path)){headers.set('X-Robots-Tag','noindex, nofollow, noarchive');headers.set('Cache-Control','private, no-store');}
 return new Response(upstream.body,{status:200,headers});
 }catch{return new Response('Service temporarily unavailable',{status:503,headers:{...secure,'Cache-Control':'no-store'}});}
}};
