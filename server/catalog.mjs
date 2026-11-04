import quickwooLicenses from '../assets/data/quickwoo-catalog.json' with { type: 'json' };
export {quickwooLicenses};
// Prices are authoritative on the server; browser totals never determine a charge.
export const services = {
  'personal-assistant': {name:'Personal Assistant', plans:{one:2500,five:10000,ten:19000}},
  'rtb-advocacy': {name:'RTB Advocacy', plans:{hour:4000,session:10000,evidence:22500}},
  'web-design': {name:'Web Design', plans:{landing:10000,business:50000,hour:3500}},
  'wp-managment': {name:'WordPress Management', plans:{essential:4000,content:9000,hour:3500}},
  'graphic-design': {name:'Graphic Design', plans:{piece:5000,set:15000,identity:22500}},
  'resume-building': {name:'Resume Building', plans:{refresh:4000,fresh:7500,application:10000}}
};
export const applications = {
  'red-door': {name:'Red Door',url:'https://robbiecalvin.github.io/red-door/#/discover-chat'},
  kimix: {name:'KIMIX',url:'https://robbiecalvin.github.io/KIMIX/'},
  speechflow: {name:'SpeechFlow',url:'https://robbiecalvin.github.io/speechflow/'},
  'typing-school': {name:'Typing School',url:'https://robbiecalvin.github.io/typing-school/'},
  quickwoo: {name:'QuickWoo Desktop',url:'https://github.com/robbiecalvin/QuickWoo-Desktop'},
  'codex-master': {name:'Codex Master',url:'https://github.com/robbiecalvin/CodexMaster'}
};
// Paid download delivery stays disabled until release files and recurring licensing are connected.
// {id, name, priceCents, file, downloadName}; `file` is relative to DOWNLOAD_DIR.
export const digitalProducts = {};

for (const catalog of [services, applications, digitalProducts]) Object.setPrototypeOf(catalog, null);

services['personal-assistant'].planLabels={one:'One hour',five:'Five-hour package',ten:'Ten-hour package'};
services['rtb-advocacy'].planLabels={hour:'Document organization',session:'Preparation session',evidence:'Evidence organization'};
services['web-design'].planLabels={landing:'Landing page',business:'Small business site',hour:'Focused improvements'};
services['wp-managment'].planLabels={essential:'Essential care',content:'Care + content',hour:'Focused support'};
services['graphic-design'].planLabels={piece:'One useful piece',set:'A consistent set',identity:'Starter identity'};
services['resume-building'].planLabels={refresh:'Resume refresh',fresh:'A fresh start',application:'Application set'};
