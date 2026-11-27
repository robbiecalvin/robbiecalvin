"""Build static QuickWoo product pages from the imported pricing and reviewed content."""
from pathlib import Path
from html import escape as e
from urllib.parse import quote
import json,re
from site_footer import FOOTER
ROOT=Path(__file__).resolve().parents[1]
catalog=json.loads((ROOT/'assets/data/quickwoo-catalog.json').read_text());content=json.loads((ROOT/'assets/data/quickwoo-content.json').read_text())
products={p['id']:p for p in catalog['products']};bundles={b['id']:b for b in catalog['bundles']};categories={g['id']:g for g in catalog['categories']}
old=(ROOT/'wp-plugins/index.html').read_text();HEADER=re.search(r'<header\b[^>]*>.*?</header>',old,re.S)[0]
def money(cents):return f'${cents/100:,.2f}'
def route(item):return 'wp-plugins/'+('bundles/'if item['id']in bundles else '')+item['id']+'/'
def link(base,item,label=None):return f'<a href="{base}{route(item)}" data-product-page>{e(label or item["name"])} ↗</a>'
def controls():return '''<form class="license-controls" data-license-controls><div><label for="license-billing">Billing</label><select id="license-billing" name="billing" disabled><option value="monthly">Monthly</option><option value="annual">Annual — prepaid, 20% off</option></select></div><div><label for="license-sites">Production sites</label><select id="license-sites" name="sites" disabled><option value="1">1 site</option><option value="5">Up to 5 sites</option><option value="10">Up to 10 sites</option><option value="25">Agency — up to 25 sites</option></select></div><p>CAD, before tax. Annual amounts are the full prepaid yearly price. Agency is capped at 25 sites. No lifetime plans.</p></form><p class="license-status" data-license-status role="status" aria-live="polite"></p>'''
def quote_panel(item):
 return f'''<div class="license-quote" data-price-id="{item['id']}"><span class="kicker">Pro license / <span data-site-label>1 site</span></span><div class="license-amount"><strong data-price-amount>{money(item['prices']['monthly'][0])}</strong><span>CAD <span data-price-period>/ month</span></span></div><p data-price-detail>Monthly price for one production site.</p><a class="button primary" data-plan-inquiry="{item['id']}" href="mailto:robbiecalvin8@gmail.com?subject={quote(item['name']+' license enquiry')}">Enquire about a Pro license <svg class="cta-arrow" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 18 18 6M6 6h12v12"/></svg></a><p class="note">Proposed launch pricing. Online subscription checkout and automatic license delivery are not connected yet.</p></div>'''

def download(item):
 url=item.get('downloadUrl')
 if not url:return ''
 return f'''<section class="content package-panel" id="download"><p class="kicker">ZIP download / License separate</p><h2>Install {e(item['name'])}.</h2><p>Review the included requirements and test on a staging site. Upload the ZIP through Plugins → Add New → Upload Plugin. Downloading the package does not purchase or activate a Pro license.</p><a class="button" data-plugin-download="{item['id']}" href="{e(url,quote=True)}" download>Download {e(item['name'])} ZIP ↗</a></section>'''
def matrix(item):
 rows=''.join(f'<tr data-site-count="{sites}" data-monthly-cents="{item["prices"]["monthly"][i]}" data-annual-cents="{item["prices"]["annual"][i]}"><th scope="row">{"1 site"if sites==1 else "Up to "+str(sites)+" sites"}</th><td>{money(item["prices"]["monthly"][i])}</td><td>{money(item["prices"]["annual"][i])}</td></tr>'for i,sites in enumerate(catalog['siteLimits']))
 return f'<div class="license-table-scroll" tabindex="0" role="region" aria-label="All {e(item["name"])} prices in CAD"><table class="license-table"><caption>{e(item["name"])} — all prices in CAD, excluding tax</caption><thead><tr><th scope="col">Site allowance</th><th scope="col">Monthly</th><th scope="col">Annual / prepaid</th></tr></thead><tbody>{rows}</tbody></table></div>'
def tile(item,base,bundle=False):
 summary=content[item['id']]['summary']if not bundle else bundle_copy[item['id']][1]
 label='Bundle'if bundle else 'Pro plugin'
 return f'''<article class="plugin-tile" data-price-id="{item['id']}" data-search="{e((item['name']+' '+summary).lower(),quote=True)}" data-palette="{item['palette']}"><div class="tile-heading"><span>{label}</span><span>{'18 + Desktop'if item.get('desktop')else str(len(item['includes']))+(' plugin'if len(item['includes'])==1 else ' plugins')if bundle else 'Lite: Free'}</span></div><h3>{link(base,item)}</h3><p>{e(summary)}</p><div class="tile-price"><strong data-price-amount>{money(item['prices']['monthly'][0])}</strong><span>CAD <span data-price-period>/ month</span></span></div><p class="tile-scope"><span data-site-label>1 site</span> · <span data-price-detail>Monthly plan</span></p><a class="button" href="{base}{route(item)}#pricing" data-product-page>Explore {'bundle'if bundle else 'plugin'} & pricing ↗</a></article>'''
bundle_copy={
'inventory-control':('A stronger grip on the catalog.','Six Pro plugins for adding, editing, varying, branding, shipping, and rewarding around a WooCommerce store.'),
'revenue-customer-operations':('Keep the work around the sale connected.','Six Pro plugins covering forms, scheduling, imports, quotes, operational accounting, and site email.'),
'admin-control':('Look after the site behind the store.','Five Pro plugins for caching, SEO, internal audits, traffic reporting, and controlled code snippets.'),
'education':('Give learning its own workspace.','Quick Course Builder Pro, grouped as the Education Bundle. This one-plugin bundle has the same price as the individual plugin.'),
'full-quickwoo-suite':('The whole plugin toolkit.','All 18 Pro plugins across inventory, customer operations, site administration, and education. Desktop is not included in this option.'),
'plus-desktop':('All 18 plugins. One desktop workspace.','The full Pro plugin suite plus QuickWoo Desktop, with licensed connector/server functionality for the selected site allowance.')}
def decision_panel(title, description, cards):
 sections = ''.join(
  f'<article><h3>{e(name)}</h3><p>{e(copy)}</p><a href="{e(href, quote=True)}">{e(label)}</a></article>'
  for name, copy, href, label in cards
 )
 return f'<section class="page-route" aria-labelledby="page-route-title"><h2 id="page-route-title">{e(title)}</h2><p>{e(description)}</p><div class="page-route-grid">{sections}</div></section>'

def shell(relative,title,description,body,palette='red',kind='plugin-detail'):
 base='../'*len(Path(relative).parts)
 header=HEADER.replace('href="../',f'href="{base}')
 existing=ROOT/relative/'index.html'
 head=re.search(r'<head>.*?</head>',existing.read_text(),re.S)[0] if existing.exists() else f'<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(title)} — QuickWoo by Robbie Calvin</title><meta name="description" content="{e(description,quote=True)}"><link rel="stylesheet" href="{base}assets/styles/overview.css"><link rel="stylesheet" href="{base}assets/styles/pages.css"><link rel="stylesheet" href="{base}assets/styles/plugins.css"><script src="{base}assets/scripts/overview.js" defer></script><script src="{base}assets/scripts/plugins.js" defer></script></head>'
 for asset in ('page-depth', 'portfolio-shell'):
  stylesheet = f'<link rel="stylesheet" href="/assets/styles/{asset}.css">'
  script = f'<script type="module" src="/assets/scripts/{asset}.mjs">'
  head = re.sub(r'\s*' + re.escape(stylesheet), '', head)
  head = re.sub(r'\s*' + re.escape(script) + r'\s*</script>', '', head)
  head = head.replace('</head>', stylesheet + script + '</script></head>')
 head=head.replace(' Temporarily free WordPress-plugin promotion.','')
 head=head.replace('Explore 18 QuickWoo WordPress and WooCommerce plugins, temporarily free. Browse plugin features, collections, and available release packages. Desktop is separate.','Explore 18 QuickWoo WordPress and WooCommerce plugins, standard CAD license pricing, bundles, and available ZIP packages.')
 head=head.replace('Explore the full QuickWoo WordPress plugin suite, temporarily free during this promotion. QuickWoo Desktop and its commercial plan remain separate.','Explore all 18 Pro plugins plus QuickWoo Desktop in one plan, with monthly and annual CAD pricing for up to 25 sites.')
 def clean_schema(match):
  data=json.loads(match[1])
  for entity in data.get('@graph',[]):
   # Launch prices are enquiries, not purchasable offers or free software.
   entity.pop('offers',None)
  return '<script type="application/ld+json">'+json.dumps(data,indent=2)+'</script>'
 head=re.sub(r'<script type="application/ld\+json">(.*?)</script>',clean_schema,head,flags=re.S)
 design_attributes = ''
 if existing.exists():
  # Keep the redesign stage and its route binding when refreshing catalogue content.
  previous = existing.read_text()
  binding = re.search(r'<body (data-design-page="[^"]+" data-scene-id="\d+")', previous)
  if binding:
   design_attributes = ' ' + binding[1]
   stage = re.search(r'<div class="cinematic-stage" data-cinematic-stage>.*?</div>', previous, re.S)[0]
   body = body.replace('</section>', stage + '</section>', 1)
 html=f'''<!DOCTYPE html><html lang="en">{head}<body{design_attributes} data-palette="{palette}" data-page="{kind}" data-quickwoo-catalog="{base}assets/data/quickwoo-catalog.json" class="portfolio-page"><a class="skip-link" href="#top">Skip to content</a>{header}<main class="wrap" id="top">{body}</main>{FOOTER}</body></html>'''
 p=ROOT/relative/'index.html';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(html.replace('><','>\n<'))
 return base

def hero(name,label,headline,description,base,bundle=False):
 return f'''<div class="breadcrumb"><a href="{base}">Home</a> / <a href="{base}wp-plugins/">QuickWoo Plugins</a> / {e(name)}</div><section class="hero" aria-labelledby="title"><div class="hero-copy"><p class="eyebrow">{e(label)}</p><h1 id="title">{e(name)}</h1><p class="intro">{e(headline)}</p><div class="actions"><a class="button primary" href="#pricing">Explore pricing ↗</a><a class="button" href="{base}wp-plugins/#{'bundles'if bundle else 'plugins'}">Explore the suite ↗</a></div></div></section><div class="plugin-lead"><p>{e(description)}</p></div>'''

def pricing(item,base,lite=False):
 litesection='<aside class="lite-note"><span class="kicker">A free starting point</span><h3>Lite / Free</h3><p>The matrix lists a free Lite edition. Its final feature limits and release download are not specified here. The capabilities above describe the documented full build.</p></aside>'if lite else ''
 return f'''<section class="content license-section" id="pricing"><p class="kicker">Pro license plans</p><h2>Choose your plan.</h2><p class="pricing-intro">Select your billing period and site allowance to see the proposed Pro license price. A package download does not activate a Pro license.</p><div class="plan-picker"><div class="plan-options">{controls()}</div>{quote_panel(item)}</div><details class="all-prices" open><summary>Compare all site allowances</summary>{matrix(item)}</details>{litesection}<p class="note">CAD before tax. Annual plans are prepaid; no lifetime plans are offered. Downloading a ZIP does not purchase a Pro license.</p></section>'''


# Individual Pro modules.
for id,item in products.items():
 c=content[id];base='../../';category=categories[item['category']]
 body=hero(item['name'],category['name']+' / Pro plugin',c['headline'],c['summary'],base)
 if id == 'quick-add':
  guide = '<p><a href="/wp-plugins/quick-add/bulk-add-woocommerce-products-from-json/">Read the WooCommerce JSON import guide ↗</a></p>'
  body = body.removesuffix('</div>') + guide + '</div>'
 features=''.join(f'<article><span>0{i+1}</span><h3>{e(feature)}</h3></article>'for i,feature in enumerate(c['features']))
 body+=f'''<section class="content plugin-capabilities"><div class="section-head"><div><p class="kicker">Inside the full build</p><h2>{e(c['headline'])}</h2></div><p>{e(c['fit'])}</p></div><div class="capability-grid">{features}</div></section>'''
 workflow = c['workflow']
 related = products[workflow['related']]
 body += decision_panel(workflow['title'], workflow['summary'], [
  ('Compare plans', 'Check the proposed cost for the number of sites where you want to use this plugin.', '#pricing', 'See pricing'),
  (related['name'], content[related['id']]['summary'], '/' + route(related), 'Compare ' + related['name']),
 ])
 body+=pricing(item,base,True)+download(item)
 memberships=[b for b in bundles.values()if id in b['includes']]
 body+='<section class="content"><p class="kicker">Already part of a larger plan</p><h2>Choose a bundle when it fits.</h2><p class="muted">This plugin is included in the following options. Avoid adding a standalone license on top of a bundle that already covers it.</p><div class="membership-links">'+''.join(link(base,b)for b in memberships)+'</div></section>'
 requirements=' · '.join(c['requirements'])or'Check the current plugin header and setup instructions for supported WordPress and PHP versions.'
 body+=f'''<section class="content"><div class="split"><div><p class="kicker">The connected workflow</p><h2>On your site.<br>Connected to your tools.</h2></div><div><p class="muted">{e(requirements)}</p><p class="muted">Install and configure the plugin in WordPress. Quick Connector is required on each connected site; QuickWoo Desktop uses the licensed connector/server functionality for supported desktop actions.</p><div class="actions"><a class="button" href="{base}wp-plugins/quick-connector/">About Quick Connector ↗</a><a class="button" href="{c['source']}">View plugin source ↗</a></div></div></div></section><section class="closing page-finale"><div><p class="kicker">Start with your workflow</p><h2>Ask the question before choosing the plan.</h2><p class="muted">Tell me what your site needs and how many sites you manage.</p></div><a class="button primary" href="{base}contact/">Talk about {e(item['name'])} ↗</a></section>'''
 shell('wp-plugins/'+id,item['name'],c['summary'],body,item['palette'])
# Bundle pages, with explicit membership and no inferred extras.
for id,item in bundles.items():
 base='../../../';headline,summary=bundle_copy[id]
 body=hero(item['name'],'QuickWoo / '+('Desktop + suite'if item['desktop']else'Pro bundle'),headline,summary,base,True)
 body+='<section class="content" id="included"><p class="kicker">Exactly what is included</p><h2>'+('All 18. And the desktop.'if item['desktop']else 'The tools inside this plan.')+'</h2><div class="included-grid">'+''.join(f'<a href="{base}wp-plugins/{pid}/"><span>{e(products[pid]["name"])}</span><small>{e(content[pid]["summary"])}</small></a>'for pid in item['includes'])+'</div>'
 if item['desktop']:body+=f'<div class="desktop-inclusion"><h3>Plus QuickWoo Desktop</h3><p>Site Mode and Store Mode in one desktop app. The licensed connector/server functionality remains required on each WordPress site.</p><a class="button" href="{base}quickwoo/">Explore QuickWoo Desktop ↗</a></div>'
 body+='</section>'
 featured = products[item['includes'][0]]
 body += decision_panel('Check the bundle against your workflow', summary, [
  (featured['name'], content[featured['id']]['summary'], '/' + route(featured), 'Explore the individual plugin'),
  ('Compare coverage and pricing', 'Choose the site allowance you need and review the full prepaid amount if you prefer annual billing.', '#pricing', 'Compare bundle pricing'),
 ])
 body += pricing(item,base)
 individual=sum(products[pid]['prices']['monthly'][0]for pid in item['includes']);saving=individual-item['prices']['monthly'][0]
 if item['desktop']:comparison='The spreadsheet does not specify a standalone Desktop price, so a like-for-like Desktop bundle saving is not quoted.'
 elif saving>0:comparison=f'At the one-site monthly level, the included plugins total {money(individual)} individually. This bundle is {money(item["prices"]["monthly"][0])}, a difference of {money(saving)} per month.'
 else:comparison='Education includes one plugin, Quick Course Builder, at the same price as buying it individually. No extra bundle discount is claimed.'
 body+=f'''<section class="content"><div class="split"><div><p class="kicker">Compare the scope</p><h2>The right collection,<br>without the overlap.</h2></div><div><p class="intro">{comparison}</p><p class="muted">A plugin included in this bundle should not be purchased again as a separate overlapping entitlement. Existing customers should discuss an upgrade before choosing another plan.</p><a class="button" href="{base}wp-plugins/#compare">Compare all bundle options ↗</a></div></div></section><section class="closing page-finale"><p class="kicker">Make the scope clear</p><h2>Choose the toolkit for the work you do.</h2><a class="button primary" href="{base}contact/">Ask about {e(item['name'])} ↗</a></section>'''
 shell('wp-plugins/bundles/'+id,item['name'],summary,body,item['palette'],'plugin-bundle')
# Infrastructure pages. Neither is represented as an additional paid Pro module.
for id,name in [('quick-connector','Quick Connector'),('quick-license','Quick License')]:
 c=content[id];base='../../';body=hero(name,'QuickWoo / Infrastructure',c['headline'],c['summary'],base)
 body=body.replace('href="#pricing">Explore pricing','href="#infrastructure">How it fits')
 body+='<section class="content" id="infrastructure"><p class="kicker">Infrastructure, not a Pro price tier</p><h2>Part of the system behind the suite.</h2><p class="intro">'+e(c['fit'])+'</p><div class="capability-grid">'+''.join(f'<article><span>0{i+1}</span><h3>{e(f)}</h3></article>'for i,f in enumerate(c['features']))+'</div><p class="note">The pricing matrix does not list a standalone price for this infrastructure component. It is not counted among the 18 separately priced Pro modules.</p></section>'
 body+=f'<section class="closing page-finale"><h2>See how the pieces connect.</h2><div class="actions"><a class="button primary" href="{base}wp-plugins/">Explore the suite ↗</a><a class="button" href="{c["source"]}">View the implementation ↗</a></div></section>'
 item=next(p for p in catalog['infrastructure'] if p['id']==id)
 body+=download(item)
 body += decision_panel('Follow the QuickWoo connection', c['fit'], [
  ('QuickWoo Desktop', 'See how the app separates WordPress site work from WooCommerce store work.', '/quickwoo/', 'Explore the desktop app'),
  ('QuickWoo plugins', 'Find the plugin that handles the task you want to do on the site.', '/wp-plugins/#plugins', 'Browse Pro plugins'),
 ])
 shell('wp-plugins/'+id,name,c['summary'],body,'red','plugin-infrastructure')
# Suite overview.
base='../'
body='''<div class="breadcrumb"><a href="../">Home</a> / QuickWoo Plugins</div><section class="hero" aria-labelledby="title"><div class="hero-copy"><p class="eyebrow">QuickWoo / The connected WordPress toolkit</p><h1 id="title">QuickWoo WordPress &amp; WooCommerce Plugins</h1><p class="intro">18 Pro plugins for WordPress and WooCommerce. Focused bundles when you need a few. A full suite when you need the wider picture.</p><div class="actions"><a class="button primary" href="#plugins">Shop individual plugins</a><a class="button" href="#bundles">Compare plugin bundles</a></div></div></section><div class="suite-facts"><div><strong>18</strong><span>Pro modules</span></div><div><strong>4</strong><span>focused collections</span></div><div><strong>6</strong><span>bundle options</span></div><div><strong>25</strong><span>maximum agency sites</span></div></div>
<section class="content" id="overview"><div class="section-head"><div><p class="kicker">The ecosystem</p><h2>On the site.<br>At your desk.<br>Working together.</h2></div><p>The plugins do their work in WordPress. Quick Connector provides the authenticated control surface. Quick License handles licensing infrastructure. QuickWoo Desktop brings supported site and store operations into a single app shell.</p></div><div class="ecosystem-map"><a href="../wp-plugins/#plugins"><strong>Pro plugins</strong><span>The focused tools</span></a><a href="../wp-plugins/quick-connector/"><strong>Quick Connector</strong><span>The site-to-desktop bridge</span></a><a href="../quickwoo/"><strong>QuickWoo Desktop</strong><span>The workspace</span></a><a href="../wp-plugins/quick-license/"><strong>Quick License</strong><span>The licensing layer</span></a></div></section>
<section class="content" id="pricing"><p class="kicker">Choose once / Explore everything</p><h2>Find the right scope.</h2>'''+controls()+'''<p class="note">Plugin, bundle, and service prices are in CAD. Changing billing or site allowance updates every price on this page.</p></section>
<section class="content" id="plugins"><div class="section-head"><div><p class="kicker">The individual tools</p><h2>Start with the work<br>you need to do.</h2></div><div class="plugin-search"><label for="plugin-search">Find a plugin</label><input id="plugin-search" type="search" placeholder="Try forms, products, SEO…" disabled><p id="plugin-count" aria-live="polite">18 plugins across four categories</p></div></div>'''
for gid,group in categories.items():
 members=[p for p in products.values()if p['category']==gid]
 body+=f'<div class="plugin-group" id="{gid}"><div class="group-heading"><h3>{e(group["name"])}</h3><a href="../wp-plugins/bundles/{gid}/">Explore the bundle ↗</a></div><div class="plugin-grid">'+''.join(tile(p,base)for p in members)+'</div></div>'
body+='''<p id="plugin-empty" class="muted" hidden>No plugins match that search. Try another name or workflow.</p></section><section class="content" id="related-projects" aria-labelledby="related-projects-title"><h2 id="related-projects-title">Related plugin projects</h2><ul><li><a href="/wp-plugins/quick-core/">Quick Core</a></li><li><a href="/wp-plugins/quick-plugin-pages/">Quick Plugin Pages</a></li><li><a href="/wp-plugins/quick-questions/">Quick Questions</a></li></ul></section><section class="content" id="bundles"><p class="kicker">The collections</p><h2>Go wider.<br>Keep the scope clear.</h2><div class="plugin-grid bundle-grid">'''+''.join(tile(b,base,True)for b in bundles.values())+'''</div></section><section class="content" id="compare"><div class="split"><div><p class="kicker">A closer look</p><h2>What’s inside<br>the bundle?</h2><p class="muted">Compare a collection with its individual plugins at the billing period and site allowance selected above. Don’t buy a standalone plugin if your chosen bundle already includes it.</p></div><div class="bundle-comparison"><label for="bundle-select">Bundle to compare</label><select id="bundle-select" disabled>'''+''.join(f'<option value="{b["id"]}">{e(b["name"])}</option>'for b in bundles.values())+'''</select><div id="bundle-comparison" aria-live="polite"><p>Select a bundle to explore its contents. The individual bundle pages list every included module and all prices.</p></div></div></div></section>
<section class="content"><p class="kicker">Before choosing a plan</p><h2>A few useful distinctions.</h2><details><summary>What does Lite include?</summary><p>Each individual module is listed with a free Lite edition. The matrix does not specify its exact feature limits or release downloads. Feature descriptions on these pages refer to the documented full builds; they are not a promise that every feature is included in Lite.</p></details><details><summary>How are annual prices shown?</summary><p>Annual plans show the full prepaid CAD total for a year, using the workbook’s stated 20% discount. They are not monthly charges. Agency covers up to 25 sites, not unlimited sites. Taxes are excluded.</p></details><details><summary>What is included with Desktop?</summary><p>The Full Suite + QuickWoo Desktop plan includes all 18 Pro modules and the desktop app. It requires licensed connector/server functionality. The plugin-only Full Suite does not include Desktop in the matrix.</p></details><details><summary>Can I buy or download a license now?</summary><p>These are proposed launch prices. Plugin ZIPs are available on their individual pages. Online subscription checkout and automatic license delivery are not connected yet. Downloading a ZIP does not activate a Pro license. You can enquire about a plan using the links on its page.</p></details><details><summary>Why is Education the same price as Course Builder?</summary><p>The Education Bundle contains Quick Course Builder alone in this matrix. Its prices are identical to that plugin’s individual prices; no additional bundle discount is claimed.</p></details><details><summary>What about lifetime licenses?</summary><p>Lifetime licenses are not offered at launch. The available paid billing options are monthly and prepaid annual.</p></details></section><section class="closing page-finale"><p class="kicker">Choose a useful starting point</p><h2>Tell me how you run your site.</h2><p class="muted">One tool, a focused collection, or the whole connected workspace.</p><a class="button primary" href="../contact/">Ask about QuickWoo ↗</a></section>'''
body += decision_panel('Start with a task you do often', 'Choose an individual plugin for a single workflow or compare bundles if you need several tools.', [
 ('Create or update products', 'Quick Add creates new listings. Quick Edit is for catalog items already in WooCommerce.', '/wp-plugins/bundles/inventory-control/', 'See inventory tools'),
 ('Diagnose or improve search', 'Quick Audit helps review issues. Quick SEO gives you controls for tags, canonicals, and metadata.', '/wp-plugins/bundles/admin-control/', 'See site administration tools'),
 ('Collect and follow up on inquiries', 'Compare forms, scheduling, and quote requests by the information you need from customers.', '/wp-plugins/bundles/revenue-customer-operations/', 'See customer tools'),
])
shell('wp-plugins','QuickWoo Plugins','Explore 18 QuickWoo Pro plugins, six bundle options, exact CAD launch pricing, and the connected WordPress and WooCommerce ecosystem.',body,'red','plugin-suite')
print('Built suite overview, 18 Pro plugin pages, 6 bundle pages, and 2 infrastructure pages.')
