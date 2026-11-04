(async()=>{
  'use strict';
  const root=document.body;
  const status=document.querySelector('[data-license-status]');
  try{
    const response=await fetch(root.dataset.quickwooCatalog,{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Pricing data is unavailable.');
    const catalog=await response.json();
    if(catalog.currency!=='USD'||catalog.lifetimeOffered)throw Error('Pricing configuration needs review.');
    const all=[...catalog.products,...catalog.bundles];
    const byId=new Map(all.map(item=>[item.id,item]));
    const billing=document.getElementById('license-billing');
    const sites=document.getElementById('license-sites');
    const comparison=document.getElementById('bundle-select');
    const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(value/100);
    const params=new URLSearchParams(location.search);
    if(billing&&catalog.billingPeriods.includes(params.get('billing')))billing.value=params.get('billing');
    if(sites&&catalog.siteLimits.includes(Number(params.get('sites'))))sites.value=params.get('sites');
    const node=(tag,text,className)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;};
    function current(){return{period:billing?.value||'monthly',index:catalog.siteLimits.indexOf(Number(sites?.value||1))};}
    function updateComparison(){
      if(!comparison)return;
      const{period,index}=current();const bundle=byId.get(comparison.value);
      const target=document.getElementById('bundle-comparison');target.replaceChildren();
      const distinct=[...new Set(bundle.includes)];const individual=distinct.reduce((sum,id)=>sum+byId.get(id).prices[period][index],0);const amount=bundle.prices[period][index];
      target.append(node('h3',bundle.name),node('p',`${money(amount)} USD ${period==='annual'?'prepaid per year':'per month'} · up to ${catalog.siteLimits[index]} site${catalog.siteLimits[index]===1?'':'s'}`,'comparison-money'));
      if(bundle.desktop)target.append(node('p','Includes all 18 Pro plugins plus Desktop. Desktop has no separate price in the matrix, so a like-for-like savings claim is not calculated.'));
      else if(individual>amount)target.append(node('p',`Individual plugins: ${money(individual)} USD. This bundle: ${money(amount)} USD. Difference: ${money(individual-amount)} USD ${period==='annual'?'per year':'per month'}.`));
      else target.append(node('p','This is a one-plugin bundle at the same price as the individual plugin; there is no extra bundle discount.'));
      const list=node('ul');const catalogUrl=new URL(root.dataset.quickwooCatalog,location.href);const siteRoot=new URL('../../',catalogUrl);
      for(const id of distinct){const li=node('li');const a=node('a',byId.get(id).name);a.href=new URL(`wp-plugins/${id}/?billing=${period}&sites=${catalog.siteLimits[index]}`,siteRoot).href;li.append(a);list.append(li);}target.append(list);
      if(bundle.desktop){const p=node('p');const link=node('a','Plus QuickWoo Desktop ↗');link.href=new URL('quickwoo/',siteRoot).href;p.append(link);target.append(p);}
    }
    function update(syncUrl=false){
      const{period,index}=current();if(index<0)return;
      const limit=catalog.siteLimits[index];
      for(const element of document.querySelectorAll('[data-price-id]')){
        const item=byId.get(element.dataset.priceId);if(!item)continue;
        const amount=item.prices[period][index];
        element.querySelector('[data-price-amount]').textContent=money(amount);
        element.querySelector('[data-price-period]').textContent=period==='annual'?'/ year, prepaid':'/ month';
        element.querySelector('[data-site-label]').textContent=limit===1?'1 site':`Up to ${limit} sites`;
        const saving=item.prices.monthly[index]*12-item.prices.annual[index];
        element.querySelector('[data-price-detail]').textContent=period==='annual'?`Annual prepaid total; ${money(saving)} USD less than 12 monthly payments.`:'Monthly price for the selected site allowance.';
      }
      for(const a of document.querySelectorAll('[data-plan-inquiry]')){
        const item=byId.get(a.dataset.planInquiry);const subject=`${item.name} — ${period}, ${limit} sites`;
        const body=`Hi Robbie,\n\nI’m interested in ${item.name} for up to ${limit} site${limit===1?'':'s'}, on the ${period} plan listed at ${money(item.prices[period][index])} USD${period==='annual'?' prepaid per year':' per month'}.\n\nMy site and questions:\n`;
        a.href=`mailto:robbiecalvin8@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      }
      for(const row of document.querySelectorAll('[data-site-count]'))row.setAttribute('aria-current',String(Number(row.dataset.siteCount)===limit));
      for(const link of document.querySelectorAll('[data-product-page]')){const url=new URL(link.href);url.searchParams.set('billing',period);url.searchParams.set('sites',String(limit));link.href=url.href;}
      if(syncUrl){const url=new URL(location.href);url.searchParams.set('billing',period);url.searchParams.set('sites',String(limit));history.replaceState(null,'',url);}
      updateComparison();
      if(status)status.textContent=`Showing ${period==='annual'?'annual prepaid':'monthly'} USD pricing for ${limit===1?'one site':`up to ${limit} sites`}.`;
    }
    for(const control of [billing,sites,comparison])if(control){control.disabled=false;control.addEventListener('change',()=>update(true));}
    document.querySelector('[data-license-controls]')?.addEventListener('submit',event=>event.preventDefault());
    const search=document.getElementById('plugin-search');
    if(search){search.disabled=false;search.addEventListener('input',()=>{
      const query=search.value.trim().toLowerCase();let count=0;
      document.querySelectorAll('#plugins .plugin-tile').forEach(card=>{const show=card.dataset.search.includes(query);card.hidden=!show;if(show)count++;});
      document.querySelectorAll('.plugin-group').forEach(group=>group.hidden=![...group.querySelectorAll('.plugin-tile')].some(card=>!card.hidden));
      document.getElementById('plugin-count').textContent=`${count} plugin${count===1?'':'s'}${query?' match your search':' across four categories'}`;
      document.getElementById('plugin-empty').hidden=count!==0;
    });}
    update();
  }catch(error){if(status)status.textContent='Interactive pricing is unavailable. The static prices and full pricing tables remain available on each product page.';}
})();
