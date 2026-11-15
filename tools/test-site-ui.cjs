const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});try{const p=await b.newPage({reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.SITE_REVIEW_URL||'http://localhost:8787';const artifacts=process.env.REVIEW_ARTIFACTS_DIR;if(artifacts)fs.mkdirSync(artifacts,{recursive:true});const path=require('node:path');let visits=0;
for(const width of [1440,820,390,320]){
 await p.setViewportSize({width,height:1000});await p.goto(base+'/?ui_width='+width);await p.locator('#featured-projects .project-card').first().waitFor();
 assert.equal(await p.locator('#featured-projects .project-card').count(),3);assert.equal(await p.locator('#project-sections .project-card').count(),19);assert.equal(await p.locator('#sites .project-card').count(),4);
 assert.equal(await p.getByRole('link',{name:'Explore my work'}).getAttribute('href'),'#work');assert.equal(await p.getByRole('link',{name:'Work with me'}).getAttribute('href'),'./contact/');
 for(const[name,url]of[['Crystal Eye','https://robbiecalvin.github.io/crystaleye/'],['Trusted Cash Loans','https://robbiecalvin.github.io/TrustedCashLoans/']])assert.equal(await p.locator('#sites .project-card').filter({has:p.getByRole('heading',{name,exact:true})}).getAttribute('href'),url);
 await p.locator('.project-visual img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));await p.waitForFunction(()=>[...document.querySelectorAll('.project-visual img')].every(i=>i.complete&&i.naturalWidth>0));
 await p.locator('.project-visual img').evaluateAll(es=>Promise.all(es.map(e=>e.decode())));
 assert(await p.locator('.project-visual img').evaluateAll(es=>es.every(e=>Math.abs(e.getBoundingClientRect().height-e.parentElement.getBoundingClientRect().height)<1)),'Preview image box mismatch');
 assert.equal(await p.locator('#motion').getAttribute('aria-pressed'),'true');assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'Homepage overflow '+width);
 if(artifacts)await p.screenshot({path:path.join(artifacts,'home-'+width+'.png')});
 if(artifacts&&width===1440){await p.locator('#work').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(artifacts,'featured.png')});}
 await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.className),'skip-link');
 visits++;
 for(const route of ['/about/','/contact/','/account/','/web-design/','/personal-assistant/','/graphic-design/','/rtb-advocacy/','/resume-building/','/myra/','/speechflow/','/kimix/','/typing-school/','/wild-chemistry/','/terms/','/privacy/','/legal/','/wp-plugins/quick-add/']){
  const r=await p.goto(base+route);assert.equal(r.status(),200,route);await p.locator('.skip-link').waitFor({state:'attached'});assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),route+' overflow '+width);visits++;
 }
 await p.goto(base+'/wp-plugins/quick-add/');await p.waitForFunction(()=>!document.querySelector('#license-billing').disabled);assert(await p.locator('.all-prices').evaluate(e=>e.open));
 const positions=await p.evaluate(()=>({quote:document.querySelector('.plan-picker').getBoundingClientRect().bottom,table:document.querySelector('.all-prices').getBoundingClientRect().top}));assert(positions.table>=positions.quote);
 await p.selectOption('#license-billing','annual');await p.selectOption('#license-sites','25');assert.match(await p.locator('[data-price-detail]').innerText(),/Annual prepaid total/);assert.equal(await p.locator('.package-panel [data-plugin-download]').count(),1);
 await p.locator('#pricing').scrollIntoViewIfNeeded();if(artifacts)await p.screenshot({path:path.join(artifacts,'pricing-'+width+'.png')});
}
assert.deepEqual(errors,[]);console.log(JSON.stringify({visits,homeWidths:[1440,820,390,320],featured:3,cards:19,images:'loaded',reducedMotion:'passed',pricing:'passed',jsErrors:errors}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
