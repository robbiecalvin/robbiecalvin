const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('fs');
(async()=>{
 const root=require('node:path').resolve(__dirname,'..');const base=process.env.SITE_REVIEW_URL||'http://localhost:8787';const artifacts=process.env.REVIEW_ARTIFACTS_DIR;const catalog=JSON.parse(fs.readFileSync(root+'/assets/data/quickwoo-catalog.json'));
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const routes=['/wp-plugins/',...catalog.products.map(p=>'/wp-plugins/'+p.id+'/'),...catalog.bundles.map(p=>'/wp-plugins/bundles/'+p.id+'/'),...catalog.infrastructure.map(p=>'/wp-plugins/'+p.id+'/')];
 let visits=0,priceChecks=0,downloads=0;
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   const response=await page.goto(base+route);assert.equal(response.status(),200,route);
   await page.waitForFunction(()=>!document.querySelector('#license-billing')?.disabled);
   const text=await page.locator('body').innerText();assert(!/temporarily free|temporary free|No payment required|\$0(?:\.00)?\b/i.test(text),route);
   assert.equal(await page.locator('#title').count(),1,route);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow,route+' horizontal page overflow at '+width);
   if(await page.locator('#license-billing').count()){
    for(const billing of ['monthly','annual'])for(const sites of [1,5,10,25]){
     await page.selectOption('#license-billing',billing);await page.selectOption('#license-sites',String(sites));
     const shown=await page.locator('[data-price-id]').evaluateAll(es=>es.map(e=>({id:e.dataset.priceId,amount:e.querySelector('[data-price-amount]').textContent})));
     for(const s of shown){const item=[...catalog.products,...catalog.bundles].find(p=>p.id===s.id);assert.equal(s.amount,new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.prices[billing][catalog.siteLimits.indexOf(sites)]/100));priceChecks++;}
    }
   }
   const link=page.locator('[data-plugin-download]');
   if(await link.count()){
    const url=await link.getAttribute('href');const r=await page.request.get(base+url);assert.equal(r.status(),200,url);assert.equal((await r.body()).subarray(0,2).toString(),'PK');downloads++;
   }
   visits++;
  }
  await page.goto(base+'/wp-plugins/');await page.waitForFunction(()=>!document.querySelector('#plugin-search').disabled);await page.fill('#plugin-search','quick seo');assert.equal(await page.locator('#plugins .plugin-tile:visible').count(),1);await page.fill('#plugin-search','no-such-plugin');assert(await page.locator('#plugin-empty').isVisible());await page.fill('#plugin-search','');assert.equal(await page.locator('#plugins .plugin-tile:visible').count(),18);
  if(artifacts)await page.screenshot({path:require('node:path').join(artifacts,'site-'+width+'.png'),fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({visits,priceChecks,downloads,search:'passed',jsErrors:errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
