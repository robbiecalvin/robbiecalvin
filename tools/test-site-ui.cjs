const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});try{const p=await b.newPage({reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.SITE_REVIEW_URL||'http://localhost:8787';const artifacts=process.env.REVIEW_ARTIFACTS_DIR;if(artifacts)fs.mkdirSync(artifacts,{recursive:true});const path=require('node:path');let visits=0;
for(const width of [1440,820,390,320]){
 await p.setViewportSize({width,height:1000});
 await p.goto(base+'/');
 assert.equal(await p.locator('h1').count(),1);
 assert.equal(await p.locator('main > section').count(),8);
 assert.equal(await p.locator('[data-home-carousel]').count(),5);
 assert.equal(await p.locator('footer').count(),1);
 for(const route of ['technical-portfolio','applications','websites','services','creative','wp-plugins','about','contact','ai-lessons','account']){
  assert.equal(await p.locator(`header nav a[href="/${route}/"]`).count(),1,route);
 }
 const apps=p.locator('#applications');
 const appImage=apps.locator('.showcase-slide:visible .showcase-desktop img');
 await appImage.scrollIntoViewIfNeeded();
 await p.waitForFunction(() => document.querySelector('#applications .showcase-slide:not([hidden]) .showcase-desktop img').naturalWidth > 0);
 await apps.getByRole('button',{name:'Next Applications item'}).click();
 assert.equal(await apps.getByRole('link',{name:'Explore QuickWoo Desktop',exact:true}).getAttribute('href'),'/quickwoo/');
 await apps.getByRole('button',{name:'Previous Applications item'}).click();
 assert.equal(await apps.getByRole('link',{name:'Explore Myra',exact:true}).getAttribute('href'),'/myra/');
 const services=p.locator('#services');
 await services.getByRole('button',{name:'Next Services item'}).click();
 const service=services.locator('.showcase-slide:visible');
 assert.equal(await service.locator('h3').innerText(),'WordPress management');
 assert.equal(await service.locator('.showcase-amount').innerText(),'From $40 CAD / month');
 assert.equal(await p.locator('link[rel="canonical"]').getAttribute('href'),'https://robbiecalvin.com/');
 assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'Homepage overflow '+width);
 if(artifacts)await p.screenshot({path:path.join(artifacts,'home-'+width+'.png')});
 visits++;
 for(const route of ['/launchboard/','/seo-auditor/','/about/','/contact/','/account/','/web-design/','/personal-assistant/','/graphic-design/','/rtb-advocacy/','/resume-building/','/myra/','/speechflow/','/kimix/','/typing-school/','/wild-chemistry/','/terms/','/privacy/','/legal/','/wp-plugins/quick-add/']){
  const r=await p.goto(base+route);assert.equal(r.status(),200,route);await p.locator('.skip-link').waitFor({state:'attached'});assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),route+' overflow '+width);visits++;
 }
 await p.goto(base+'/wp-plugins/quick-add/');await p.waitForFunction(()=>!document.querySelector('#license-billing').disabled);assert(await p.locator('.all-prices').evaluate(e=>e.open));
 const positions=await p.evaluate(()=>({quote:document.querySelector('.plan-picker').getBoundingClientRect().bottom,table:document.querySelector('.all-prices').getBoundingClientRect().top}));assert(positions.table>=positions.quote);
 await p.selectOption('#license-billing','annual');await p.selectOption('#license-sites','25');assert.match(await p.locator('[data-price-detail]').innerText(),/Annual prepaid total/);assert.equal(await p.locator('.package-panel [data-plugin-download]').count(),1);
 await p.locator('#pricing').scrollIntoViewIfNeeded();if(artifacts)await p.screenshot({path:path.join(artifacts,'pricing-'+width+'.png')});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({visits,homeWidths:[1440,820,390,320],heroCarousel:'passed',homepageNavigation:'passed',pricing:'passed',jsErrors:errors}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
