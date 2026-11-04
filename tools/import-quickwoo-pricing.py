"""Import exact USD amounts from the owner-supplied XLSX; no spreadsheet macros execute.
Usage: python3 tools/import-quickwoo-pricing.py path/to/workbook.xlsx
"""
import sys,json,re,zipfile,hashlib
from pathlib import Path
from decimal import Decimal,ROUND_HALF_UP
from xml.etree import ElementTree as ET
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
path=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(path) as z:
 strings=[]
 if 'xl/sharedStrings.xml'in z.namelist():strings=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS)]
 rows={}
 for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).findall('.//m:sheetData/m:row',NS):
  cells={}
  for c in row:
   v=c.find('m:v',NS);inline=c.find('m:is',NS);value=v.text if v is not None else ''.join(inline.itertext())if inline is not None else ''
   if c.attrib.get('t')=='s':value=strings[int(value)]
   cells[re.sub(r'\d','',c.attrib['r'])]=value
  rows[int(row.attrib['r'])]=cells
 if 'USD'not in rows[1]['A']:raise ValueError('Expected the USD pricing workbook.')
 groups=[('inventory-control','Inventory Control','orange',[4,5,6,7,8,9],10),('revenue-customer-operations','Revenue & Customer Operations','purple',[12,13,14,15,16,17],18),('admin-control','Admin Control','red',[20,21,22,23,24],25),('education','Education','purple',[27],28)]
 def cents(v):return int((Decimal(v)*100).quantize(Decimal('1'),rounding=ROUND_HALF_UP))
 def price(row):
  if any(row.get(c)!='Not offered' for c in 'KLMN'):raise ValueError('Unexpected lifetime offering; review importer before proceeding.')
  return {'monthly':[cents(row[c]) for c in 'CDEF'],'annual':[cents(row[c]) for c in 'GHIJ']}
 products=[];bundles=[];categories=[]
 for slug,name,palette,indices,bundle_row in groups:
  members=[]
  for i in indices:
   row=rows[i];id=re.sub(r'[^a-z0-9]+','-',row['A'].lower()).strip('-')
   if 'scout' in id:continue
   members.append(id);products.append({'id':id,'name':row['A'],'category':slug,'palette':palette,'lite':'Free','prices':price(row),'sourceRow':i})
  categories.append({'id':slug,'name':name,'palette':palette})
  bundles.append({'id':slug,'name':name+' Bundle','category':slug,'palette':palette,'includes':members,'desktop':False,'prices':price(rows[bundle_row]),'sourceRow':bundle_row})
 all_ids=[p['id'] for p in products]
 bundles.extend([{'id':'full-quickwoo-suite','name':'Full QuickWoo Suite','palette':'red','includes':all_ids,'desktop':False,'prices':price(rows[30]),'sourceRow':30},{'id':'plus-desktop','name':'Full Suite + QuickWoo Desktop','palette':'orange','includes':all_ids,'desktop':True,'prices':price(rows[31]),'sourceRow':31}])
 if len(products)!=18 or len(bundles)!=6:raise ValueError('Unexpected product counts; review workbook.')
 data={'currency':'USD','siteLimits':[1,5,10,25],'billingPeriods':['monthly','annual'],'annualDiscountPercent':20,'annualPrepaid':True,'lifetimeOffered':False,'status':'proposed-launch','source':{'filename':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()},'categories':categories,'products':products,'bundles':bundles,'infrastructure':[{'id':'quick-connector','name':'Quick Connector','separatelyPriced':False},{'id':'quick-license','name':'Quick License','separatelyPriced':False}]}
 (root/'assets/data/quickwoo-catalog.json').write_text(json.dumps(data,indent=2)+'\n')
 print(f'Imported {len(products)} plugins, {len(bundles)} bundles, 192 exact prices; currency USD.')
