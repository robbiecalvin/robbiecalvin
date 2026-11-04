(async()=>{
  'use strict';
  const status=document.getElementById('account-status');
  const dashboard=document.getElementById('dashboard');
  const auth=document.getElementById('auth-forms');
  const request=window.rcRequest;
  const money=cents=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
  let me,catalog;
  const message=text=>{status.textContent=text;};
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
  const action=(text,fn)=>{const button=node('button',text,'button');button.type='button';button.addEventListener('click',async()=>{button.disabled=true;try{await fn();}catch(error){message(error.message);}finally{button.disabled=false;}});return button;};
  function disableAuth(disabled){document.querySelectorAll('#auth-forms button').forEach(el=>el.disabled=disabled);}
  function fillPlans(){
    const select=document.getElementById('order-plan');select.replaceChildren();
    const service=catalog.services[document.getElementById('order-product').value];
    for(const [key,amount]of Object.entries(service.plans)){const option=node('option',`${service.planLabels?.[key]||key} — ${money(amount)}${key==='hour'?' / hour':''}`);option.value=key;select.append(option);}
    document.getElementById('order-quantity').value='1';updateOrderNote();
  }
  function updateOrderNote(){
    const product=document.getElementById('order-product').value;const plan=document.getElementById('order-plan').value;
    const monthly=product==='wp-managment'&&plan!=='hour';
    const multi=plan==='hour'||monthly;
    document.getElementById('order-quantity').disabled=!multi;
    document.getElementById('order-quantity-label').textContent=monthly?'Number of websites':plan==='hour'?'Hours':'One package';
    document.getElementById('order-price-note').textContent=monthly?'Monthly scope request. Recurring checkout is not enabled yet.':plan==='hour'?'The hourly amount is multiplied by your requested hours.':'The listed price covers one package. Robbie confirms scope before payment.';
  }
  async function refresh(){
    const result=await request('/api/me');me=result.user;auth.hidden=true;dashboard.hidden=false;
    document.getElementById('profile-name').value=me.name;document.getElementById('profile-email').textContent=me.email;
    document.getElementById('verification-note').hidden=me.verified;
    message(`Welcome, ${me.name}.${me.verified?'':' Please verify your email before requesting an order.'}`);
    const [orders,library]=await Promise.all([request('/api/orders'),request('/api/library')]);
    const list=document.getElementById('orders');list.replaceChildren();
    if(!orders.orders.length)list.append(node('p','No service requests or purchases yet.','muted'));
    for(const order of orders.orders){
      const card=node('article',null,'card');const service=catalog.services[order.product];const name=service?.name||order.product;
      const orderStatus={requested:'Awaiting scope review',approved:'Scope approved',checkout:'Checkout started',paid:'Paid',cancelled:'Cancelled',refunded:'Refunded'}[order.status]||order.status;
      card.append(node('h3',name),node('p',`${service?.planLabels?.[order.plan]||order.plan} × ${order.quantity} · ${money(order.totalCents)} CAD`),node('p',`Status: ${orderStatus}`),node('p',order.brief,'muted'));
      if(order.customer)card.append(node('p',`${order.customer.name} — ${order.customer.email}`,'muted'));
      if(!result.admin&&['requested','approved'].includes(order.status))card.append(action('Cancel request',async()=>{await request(`/api/orders/${order.id}/cancel`,'POST',{});await refresh();}));
      if(result.admin&&order.status==='requested')card.append(action('Approve this scope',async()=>{await request(`/api/orders/${order.id}/approve`,'POST',{});await refresh();}));
      if(['approved','checkout'].includes(order.status)&&!result.admin)card.append(action('Continue to secure checkout',async()=>{const checkout=await request(`/api/orders/${order.id}/checkout`,'POST',{});location.assign(checkout.url);}));
      list.append(card);
    }
    const products=document.getElementById('library');products.replaceChildren();
    if(!library.products.length)products.append(node('p','Purchased plugin and app downloads will appear here when the product catalog and release files are connected.','muted'));
    for(const product of library.products){const link=node('a',`Download ${product.product}`,'button');link.href=(window.RC_ACCOUNT.apiBaseUrl||'')+`/api/downloads/${encodeURIComponent(product.product)}`;products.append(link);}
    const history=document.getElementById('activity');history.replaceChildren();
    if(!library.activity.length)history.append(node('p','No recorded activity yet. Public app visits made while signed out are not attached to your profile.','muted'));
    for(const item of library.activity){history.append(node('li',`${catalog.applications[item.product]?.name||item.product} — ${item.kind==='launch'?'app or project opened':'file downloaded'} · ${new Date(item.created_at).toLocaleDateString()}`));}
  }
  function bind(id,handler){document.getElementById(id).addEventListener('submit',async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await handler(new FormData(event.target));}catch(error){message(error.message);}finally{button.disabled=false;}});}
  bind('register-form',async data=>{const r=await request('/api/auth/register','POST',Object.fromEntries(data));message(r.message);document.getElementById('register-form').reset();});
  bind('login-form',async data=>{await request('/api/auth/login','POST',Object.fromEntries(data));document.getElementById('login-form').reset();await refresh();});
  bind('forgot-form',async data=>{const r=await request('/api/auth/forgot','POST',Object.fromEntries(data));message(r.message);});
  bind('reset-form',async data=>{const r=await request('/api/auth/reset','POST',{token:resetToken,password:data.get('password')});document.getElementById('reset-form').reset();document.getElementById('reset-section').hidden=true;resetToken='';dashboard.hidden=true;auth.hidden=false;message(r.message);});
  bind('profile-form',async data=>{await request('/api/me','PATCH',{name:data.get('name')});await refresh();});
  bind('order-form',async data=>{await request('/api/orders','POST',{product:data.get('product'),plan:data.get('plan'),quantity:Number(data.get('quantity')||1),brief:data.get('brief')});await refresh();message('Your scope request is saved. Robbie must approve it before one-time checkout. Monthly care billing is not enabled yet.');});
  document.getElementById('order-product').addEventListener('change',fillPlans);
  document.getElementById('order-plan').addEventListener('change',updateOrderNote);
  document.getElementById('logout').addEventListener('click',async()=>{try{await request('/api/auth/logout','POST',{});location.reload();}catch(error){message(error.message);}});
  document.getElementById('resend').addEventListener('click',async()=>{try{message((await request('/api/auth/resend','POST',{})).message);}catch(error){message(error.message);}});
  let resetToken='';
  function readEmailAction(){
    const fragment=new URLSearchParams(location.hash.slice(1));
    if(fragment.has('verify')||fragment.has('reset'))history.replaceState(null,'',location.pathname);
    return fragment;
  }
  const initialAction=readEmailAction();
  async function handleEmailAction(fragment){
    const verifyToken=fragment.get('verify');
    if(verifyToken){message((await request('/api/auth/verify','POST',{token:verifyToken})).message);return true;}
    if(fragment.has('reset')){resetToken=fragment.get('reset');document.getElementById('reset-section').hidden=false;message('Choose a new password.');return true;}
    return false;
  }
  window.addEventListener('hashchange',()=>handleEmailAction(readEmailAction()).catch(error=>message(error.message)));
  try{
    const health=await request('/api/health');if(!health.accounts)throw Error('Account email delivery is not configured yet.');
    catalog=await request('/api/catalog');disableAuth(false);
    const productSelect=document.getElementById('order-product');
    for(const [key,service]of Object.entries(catalog.services)){const option=node('option',service.name);option.value=key;productSelect.append(option);}fillPlans();
    if(!await handleEmailAction(initialAction))message('Create an account or sign in. Verify your email to make a service request.');
    try{await refresh();}catch{}
  }catch(error){message(error.message);disableAuth(true);}
})();
