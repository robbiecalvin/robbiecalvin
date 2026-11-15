const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});try{const p=await b.newPage({reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.SITE_REVIEW_URL||'http://localhost:8787';const artifacts=process.env.REVIEW_ARTIFACTS_DIR;if(artifacts)fs.mkdirSync(artifacts,{recursive:true});const path=require('node:path');let visits=0;
for(const width of [1440,820,390,320]){
 await p.setViewportSize({width,height:1000});await p.emulateMedia({reducedMotion:'no-preference'});await p.goto(base+'/?ui_width='+width);await p.locator('#project-sections .project-card').first().waitFor();
 assert.equal(await p.locator('#featured-projects').count(),0);assert.equal(await p.locator('#project-sections .project-card').count(),19);assert.equal(await p.locator('#sites .project-card').count(),4);assert.equal(await p.locator('.project-visual img').count(),0);assert.equal(await p.locator('.project-card .project-icon').count(),19);
 for(const[name,url]of[['Crystal Eye','https://robbiecalvin.github.io/crystaleye/'],['Trusted Cash Loans','https://robbiecalvin.github.io/TrustedCashLoans/']])assert.equal(await p.locator('#sites .project-card').filter({has:p.getByRole('heading',{name,exact:true})}).getAttribute('href'),url);
 const animated=p.locator('.project-icon .icon-float').first();
 assert.notEqual(await animated.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert.equal(await p.locator('#motion').getAttribute('aria-pressed'),'false');
 await p.locator('#motion').click();assert.equal(await animated.evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
 await p.locator('#motion').click();assert.equal(await animated.evaluate(e=>getComputedStyle(e).animationPlayState),'running');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.getElementById('motion').getAttribute('aria-pressed')==='true');
 assert.equal(await animated.evaluate(e=>getComputedStyle(e).animationName),'none');
 assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'Homepage overflow '+width);
 if(artifacts)await p.screenshot({path:path.join(artifacts,'home-'+width+'.png')});
 if(artifacts&&width===1440){await p.locator('#applications > summary').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(artifacts,'cards.png')});}
 visits++;
 for(const route of ['/about/','/contact/','/account/','/web-design/','/personal-assistant/','/graphic-design/','/rtb-advocacy/','/resume-building/','/myra/','/speechflow/','/kimix/','/typing-school/','/wild-chemistry/','/terms/','/privacy/','/legal/','/wp-plugins/quick-add/']){
  const r=await p.goto(base+route);assert.equal(r.status(),200,route);await p.locator('.skip-link').waitFor({state:'attached'});assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),route+' overflow '+width);visits++;
 }
 await p.goto(base+'/wp-plugins/quick-add/');await p.waitForFunction(()=>!document.querySelector('#license-billing').disabled);assert(await p.locator('.all-prices').evaluate(e=>e.open));
 const positions=await p.evaluate(()=>({quote:document.querySelector('.plan-picker').getBoundingClientRect().bottom,table:document.querySelector('.all-prices').getBoundingClientRect().top}));assert(positions.table>=positions.quote);
 await p.selectOption('#license-billing','annual');await p.selectOption('#license-sites','25');assert.match(await p.locator('[data-price-detail]').innerText(),/Annual prepaid total/);assert.equal(await p.locator('.package-panel [data-plugin-download]').count(),1);
 await p.locator('#pricing').scrollIntoViewIfNeeded();if(artifacts)await p.screenshot({path:path.join(artifacts,'pricing-'+width+'.png')});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({visits,homeWidths:[1440,820,390,320],cards:19,animatedIcons:'passed',pauseControl:'passed',reducedMotion:'passed',pricing:'passed',jsErrors:errors}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
