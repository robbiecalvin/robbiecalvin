import { stage } from './portfolio.mjs';

const TAU = 2 * Math.PI;
const steps = (count, draw) => Array.from({ length: count }, (_, index) => draw(index, index / count));

export function detailScene(design) {
  const compose = compositions[design.page];
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, movement, trace, metal, spark, light, color } = scene;
    const open = Math.sin(t / 2) ** 2;
    const spread = open * movement;
    const stroke = light + 'aa';

    function line(points, width = 1.6) {
      trace(points, { stroke, width });
    }

    function plate(points) {
      trace(points, { closed: true, fill: metal(points[0], points[2]), stroke, width: 1.1 });
    }

    function box(x, y, z, w, h, d = .1) {
      const a = [x-w/2, y-h/2, z], b = [x+w/2, y-h/2, z];
      const c = [x+w/2, y+h/2, z], e = [x-w/2, y+h/2, z];
      const rear = ([px, py]) => [px, py, z-d];
      plate([rear(a), rear(b), b, a]);
      plate([rear(b), rear(c), c, b]);
      plate([a, b, c, e]);
    }

    function ring(x, y, z, rx, ry = rx, tilt = 0, width = 2) {
      line(steps(49, i => {
        const a = i / 48 * TAU;
        return [x + rx * Math.cos(a), y + ry * Math.sin(a) * Math.cos(tilt), z + ry * Math.sin(a) * Math.sin(tilt)];
      }), width);
    }

    function panel(x, y, z, w = .72, h = .62) {
      box(x, y, z, w, h);
      for (let i = 0; i < 3; i++) {
        const row = y + h * (i - 1) * .21;
        line([[x-w*.32, row, z+.02], [x+w*(.3-i*.09), row, z+.02]]);
      }
    }

    function globe(x, y, z, r) {
      for (let i = 0; i < 7; i++) ring(x, y, z, r, r, i * Math.PI / 7 + t, 1.2);
      ring(x, y, z, r, r, 0, 3);
      spark([x, y, z], 3);
    }

    function glyph(text, x, y, z, size = .8) {
      const [px, py] = scene.project([x, y, z]);
      const pixels = Math.min(state.width, state.height) * .35 * size;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(.8 + .2 * Math.cos(t), 1);
      ctx.font = '700 ' + pixels + 'px system-ui';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const gradient = ctx.createLinearGradient(-pixels/2, -pixels/2, pixels/2, pixels/2);
      const palette = design.animationPalette;
      palette.colors.forEach((shade, i) => gradient.addColorStop(palette.stops[i] / 100, shade));
      ctx.fillStyle = gradient;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.15;
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }

    compose({ t, open, spread, box, ring, line, plate, panel, globe, glyph, spark, color });
  });
}

const compositions = {
  11({ box, line, glyph, open }) {
    box(-.51, -.13, .1, .08, 1.43); box(.51, -.13, .1, .08, 1.43);
    box(0, -.85, .1, 1.1, .10);
    glyph('X', .14, -.18, -.7, .67);
    steps(8, i => line([[-.47+i*.035,.62-i*.071,-i*.14],[.47-i*.035,.62-i*.071,-i*.14]], 3));
    box(-.49 + .43*(1-open), -.13, .2-open*.25, .86*(1-open)+.04, 1.31, .04);
  },
  12({ globe, line, t, open }) {
    globe(0, 0, 0, .78 + open*.17);
    steps(5, layer => line(steps(58, (_, u) => [u*2.36-1.18, Math.sin(u*TAU*3+t+layer*.35)*.24*(.25+.75*Math.sin(u*Math.PI)), (layer-2)*.12]), 2.3));
  },
  13({ panel, box, spread }) {
    box(0,.61,-.25,.85,.1); box(0,.36,-.25,.16,.52);
    steps(4, i => panel((i-1.5)*spread*.46,-.22-i*spread*.1,(i-2)*.26,1.32,.79));
  },
  14({ line, t }) {
    steps(16, layer => line(steps(66, (_, u) => [u*2.4-1.2, Math.sin(u*TAU*3+t+layer*.28)*Math.sin(u*Math.PI)**2*(.3+layer*.028), (layer-7.5)*.09]), 2.1));
  },
  15({ glyph, ring, box, t, spread }) {
    ring(0,0,0,.44,.44,0,5); glyph('W',0,0,.2,.62);
    steps(17, (i,u) => {
      const a = u*TAU+t, radius = .88 + spread*.33;
      box(Math.cos(a)*radius,Math.sin(a)*radius,Math.sin(i*1.7)*.4,.19,.16,.13);
    });
  },
  16({ panel, ring, spark, spread }) {
    steps(4, i => ring(0,.62-i*.09,-.1,.9-i*.11,.19,1.02,3));
    steps(5, i => panel((i-2)*(.23+spread*.34), .1-i*.19,-.5+i*.24,.58,.38));
    spark([0,-.58-spread*.3,.5],5);
  },
  17({ line, spread }) {
    for (const side of [-1,1]) {
      steps(10, i => line([[-.26,-.73], [.02,-.78], [.24,-.64], [.27,-.38], [.41,-.13], [.26,-.06], [.29,.11], [.22,.24], [.19,.43], [-.12,.51], [-.25,.68]].map(([x,y]) => [side*(.63-spread*.23-x),y,(i-4.5)*.075]), 2));
    }
  },
  18({ box, t, spread }) {
    box(0,.28,-.12,2.08,.9,.27);
    steps(32, i => {
      const row = Math.floor(i/8);
      box((i%8-3.5)*.235,.01+row*.18-spread*.43*Math.max(0,Math.sin(t+i*.48)),.05+row*.025,.18,.135,.12);
    });
  },
  19({ box, ring, open }) {
    ring(-.53,-.02,-.15,.38,.38,open,6);
    box(.23,0,0,1.34,.63,.24);
    steps(3, i => ring(i*.25-.02,0,.04,.085,.085,0,3));
    box(.91,.07,-.05,open*.44+.1,.08);
  },
  20({ plate, globe, open }) {
    steps(24, (_,u) => {
      const a = u*TAU, b = a+TAU/24;
      plate([[0,0,-.35],[Math.cos(a),Math.sin(a)*(.22+open*.3),0],[Math.cos(b),Math.sin(b)*(.22+open*.3),0]]);
    });
    globe(0,0,.2,.27);
  },
  21({ plate, globe, spread }) {
    globe(0,.03,-.12,.23);
    for (const side of [-1, 1]) {
      steps(9, i => {
        const x = side*(i*.102+.18);
        plate([[x,.04,-i*.04],[x+side*.24,-.36-spread*.63+i*.012,i*.035],[x+side*.38,-.18-spread*.57,i*.022],[x+side*.05,.25,.06]]);
      });
    }
  },
  22({ box, panel, ring, t }) {
    box(0,.12,0,1.36,1.13,.33); panel(0,-.09,.05,.93,.49);
    steps(9, i => ring(.95*Math.cos(i*TAU/9+t),.77*Math.sin(i*TAU/9+t),.32,.105,.105,t+i,3));
  },
  23({ box, panel, spread }) {
    box(0,0,.12,1.32,.29,.22); box(0,0,.14,.29,1.32,.22);
    steps(8, i => panel((i%4-1.5)*(.43+spread*.26),(i<4?-1:1)*(.59+spread*.17),spread-i*.08,.26,.22));
  },
  24({ ring, line, spark, t, spread }) {
    steps(7, i => ring(0,0,(i-3)*(.11+spread*.14),.8-i*.08,.8-i*.08,0,3.4));
    const tip = [Math.cos(t)*.77,Math.sin(t)*.77,.37];
    line([[0,0,.1],tip],3); spark(tip,5);
  },
  25({ glyph, line, spread, t }) {
    glyph('{',-.52-spread*.34,0,0,1.32); glyph('}',.52+spread*.34,0,0,1.32);
    steps(11, i => line([[-.31,(i-5)*.117,-.19],[.1+.19*Math.sin(i+t),(i-5)*.117,.21]],2.4));
  },
  26({ globe, ring, t, spread }) {
    globe(0,0,.1,.38);
    steps(8, i => ring(0,0,(i-3.5)*spread*.13,.65+(i%3)*.11,.53+i*.03,t+i*.47,3));
  },
  27({ plate, line, spread }) {
    for (const side of [-1,1]) {
      steps(8, i => {
        const x = side*(.69+i*.025);
        const z = i*.056+spread*i*.057;
        plate([[0,-.54,0],[x,-.64,z],[x,.41,z],[0,.54,0]]);
        if (i === 7) steps(5, row => line([[x*.25,-.32+row*.13,z*.26],[x*.81,-.35+row*.13,z*.82]]));
      });
    }
  },
  28({ panel, line, plate, spark, t }) {
    panel(-.12,.04,-.1,1.32,1.05);
    const x = .27*Math.sin(t), y = .23*Math.cos(t);
    plate([[x,y,.17],[x+.59,y-.75,.35],[x+.69,y-.67,.35],[x+.1,y-.08,.17]]);
    line([[x-.38,y,.17],[x,y,.17]],3); spark([x,y,.17],4);
  },
  29({ box, line, spread }) {
    box(0,0,-.2,1.32,1.65);
    steps(5, i => {
      const y = (i-2)*.245, z = (i+1)*spread*.14;
      box(.12,y,z,.78,.135);
      box(-.43,y,z,.125,.125);
      line([[-.48,y,z+.02],[-.44,y+.045,z+.02],[-.36,y-.05,z+.02]],2);
    });
  },
  30({ ring, box, glyph, open }) {
    ring(-.44,-.1,.13,.35,.35,open*.7,11);
    box(.34,.02,.12,1.05,.16,.17);
    steps(3, i => box(.72-i*.18,.19,.12,.09,.22-i*.04,.15));
    glyph('01',.01,-.61,.35,.31);
  },
  31({ panel, spread }) {
    panel(0,0,-.1,.52,.55);
    steps(8, (_,u) => {
      const a = u*TAU, r=.47+spread*.67;
      panel(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a)*spread*.86,.43,.32);
    });
  },
  32({ glyph, panel, spread, t }) {
    glyph('?',0,0,.14,1.63);
    steps(6, i => panel((i%2?1:-1)*(.54+spread*.44), (Math.floor(i/2)-1)*.4,Math.sin(t+i)*.36,.24,.17));
  },
  33({ glyph, panel, spread }) {
    glyph('“',-.42-spread*.33,-.14,.19,1.49);
    glyph('”',.42+spread*.33,.24,.19,1.49);
    panel(0,.52,-.34,.82+spread*.34,.34);
  },
  34({ ring, line, spark, t, open }) {
    steps(5, i => ring(0,0,-i*.081,.79-i*.066,.79-i*.066,i*open*.13,3.5));
    steps(12, (_,u) => line([[.57*Math.cos(u*TAU),.57*Math.sin(u*TAU),.04],[.71*Math.cos(u*TAU),.71*Math.sin(u*TAU),.04]],2.7));
    for (const [a,r] of [[t,.54],[2*t,.46]]) line([[0,0,.08],[Math.cos(a)*r,Math.sin(a)*r,.08]],5);
    spark([0,0,.1],5);
  },
  35({ panel, ring, line, spark, t }) {
    panel(0,-.32,0,1.72,.36);
    ring(.66,-.33,.15,.082,.082,0,3);
    steps(7, i => panel((i%3-1)*.54,.1+Math.floor(i/3)*.27,-i*.09,.4,.19));
    const y=.12+.37*Math.sin(t);
    line([[-.92,y,.36],[.92,y,.36]],3); spark([.74,y,.36],4);
  },
  36({ box, spread, t }) {
    steps(12, i => {
      const row = Math.floor(i/4);
      const height = .18+(i%4)*.1;
      box((i%4-1.5)*(.37+spread*.15),.47-height/2-spread*.38*Math.sin(t+i),(row-1)*.53,.34,height,.27);
    });
    box(0,.6,-.05,1.7,.13,.85);
  },
  37({ line, spark, t }) {
    steps(5, i => {
      const road = u => [u*2.35-1.18, (i-2)*.16+Math.sin(u*TAU+i*.66)*.44,(i-2)*.19+Math.cos(u*TAU)*.28];
      line(steps(54, (_,u)=>road(u)),5);
      steps(6, (n,u) => spark(road((t/TAU+u+i*.19)%1),2.5));
    });
  },
  38({ box, spread }) {
    steps(8, i => {
      const shift = .26+spread*.36;
      box((i&1?1:-1)*shift,(i&2?1:-1)*shift,(i&4?1:-1)*shift,.46,.46,.37);
    });
  },
  39({ box, plate, spark, spread }) {
    plate([[-.39,.77,0],[-.43,.13,0],[-.24,-.31,.04],[.35,-.25,.08],[.33,.27,.06],[.12,.77,0]]);
    steps(4, i => {
      const x = (i-1.5)*.173, y = -.42-.18*Math.sin((i+1)*.65);
      box(x,y+spread*i*.13,.08,.135,.49-i*.029,.1);
      spark([x,y-.23,.18],2.5);
    });
    box(-.48,.05-spread*.16,.09,.22,.52,.11);
  },
  40({ box, line, ring, t }) {
    const balance = Math.sin(t)*.22;
    box(0,.08,0,.11,1.3); box(0,.73,0,.94,.1);
    line([[-.71,-.45-balance,.1],[.71,-.45+balance,.1]],6);
    for (const side of [-1,1]) {
      const x=side*.69, y=.14+side*balance;
      line([[x-.31,y,0],[x,y-.59,.11],[x+.31,y,0]],2);
      ring(x,y,0,.32,.16,.45,4);
    }
  },
  41({ panel, line, box, open }) {
    panel(0,0,-.25,1.78,1.27);
    steps(5,i=>line([[-.79,-.43+i*.215,.1],[.79,-.43+i*.215,.1]],1));
    box(-.35,-.1,.1+open*.3,.64,.56); box(.38,-.16,.18+open*.17,.58,.43);
    panel(.2,.34,.07+open*.28,1.19,.28);
  },
  42({ glyph, ring, box, t, spread }) {
    glyph('W',0,0,.2,.92);
    steps(4,i=>ring(0,0,(i-2)*spread*.26,.58+i*.12,.58+i*.12,i*spread,3));
    steps(10, (_,u)=>box(Math.cos(u*TAU+t)*1.03,Math.sin(u*TAU+t)*1.03,-.22,.11,.15,.12));
  },
  43({ plate, line, spread, t }) {
    steps(9,i=>line(steps(56, (_,u)=> {
      const a=u*TAU, r=(.32+spread*.68)*(1+.25*Math.cos(3*a+i));
      return [Math.cos(a+i*.2)*r,Math.sin(a)*r*(.7+.27*Math.cos(t+i)),Math.sin(a*2+i)*.35];
    }),3));
    plate([[0,-.64,0],[-.29,.18,.22],[0,.5,.36],[.29,.18,.22]]);
  },
  44({ panel, glyph, spread }) {
    panel(0,0,-.14,1.05,1.48);
    steps(6,(i,u)=>glyph('Aa+✦01'[i],Math.cos(u*TAU)*(.46+spread*.6), Math.sin(u*TAU)*(.51+spread*.38),.4,.28));
  },
  45({ globe, box, line, spread, t }) {
    globe(0,0,.07,.32);
    steps(12, (i,u)=>{
      const a=u*TAU+0,r=.53+spread*.6;
      const point=[Math.cos(a)*r,Math.sin(a)*r,Math.sin(i*2.4)*.43];
      line([[0,0,-.15],point]); box(...point,.21,.24,.18);
    });
  },
  46({ globe, panel, glyph, t, spread }) {
    globe(0,0,0,.52);
    steps(6,(i,u)=>{
      const a=u*TAU+t,r=.83+spread*.25, x=Math.cos(a)*r,y=Math.sin(a)*r;
      panel(x,y,Math.sin(u*TAU)*.35,.37,.29);
      glyph('✓◷▦↗☰◈'[i],x,y,.49,.18);
    });
  },
  47({ globe, panel, box, line, spark, t }) {
    globe(.06,.32,-.15,.62);
    box(-.18,-.56,.28,.34,.31);
    panel(-.63,-.56,.23,.46,.24); panel(.27,-.56,.23,.46,.24);
    const pin=[.55*Math.sin(t),.32+.29*Math.cos(t),.42];
    line([[-.18,-.4,.32],pin],4); spark(pin,5);
  },
  48({ globe, ring, spark, line, open, t }) {
    const distance=.82-open*.59;
    globe(-distance,0,0,.28+open*.22); globe(distance,0,0,.28+open*.22);
    steps(11, (_,u)=>{
      const a=u*TAU+t, r=.28+open*.76;
      const point=[r*Math.cos(a),r*Math.sin(a),.47*Math.sin(a+t)];
      line([[0,0,-.24],point]); ring(...point,.08+open*.039); spark(point,3);
    });
  },
  49({ plate, line, box, open, t }) {
    const x = .48*Math.cos(t), y = -.21*Math.sin(t);
    steps(6, i=>line(steps(72, (_,u)=>[u*2.04-1.02,.42+Math.sin(u*TAU*1.2+t+i*.14)*(.1+open*.21),i*.05]),3));
    plate([[x,y,.1],[x+.55,y-.73,.32],[x+.61,y-.69,.32],[x+.08,y-.06,.1]]);
    plate([[x+.23,y-.18,.12],[x+.44,y-.55,.24],[x+.75,y-.42,.24],[x+.7,y-.15,.26],[x+.51,y+.14,.26]]);
    steps(4,i=>box(x+.27+i*.095,y-.31+i*.05,.29,.13,.14,.085));
  },
};
