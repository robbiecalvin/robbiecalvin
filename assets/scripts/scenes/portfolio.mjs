const TAU = 2 * Math.PI;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export function stage(ctx, state, design, draw) {
  const { width, height, phase, pointer, quality } = state;
  const { animation, animationPalette } = design;
  const [dark, color, light, shade] = animationPalette.colors;
  const t = TAU * phase;
  const depth = animation.depth / 100;
  const movement = animation.movement / 100;
  const speed = animation.speed / 100;
  const glow = animation.glow / 100;
  const reflection = animation.reflect / 100;
  const scale = Math.min(width, height) * .35;
  const flyThrough = animation.camera === 'Cinematic fly-through';
  const dollyIn = animation.camera === 'Dolly inward';
  const floating = animation.camera === 'Floating';
  const angle = .34 + Math.sin(t) * speed * movement + pointer.x * .7;
  const tilt = -.24 + Math.cos(t) * (floating ? speed * .55 : .1) + pointer.y * .5;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 1.6);
  halo.addColorStop(0, withAlpha(color, glow * .21));
  halo.addColorStop(1, withAlpha(dark, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  function project([x, y, z = 0]) {
    const X = x * Math.cos(angle) - z * Math.sin(angle);
    const Z = x * Math.sin(angle) + z * Math.cos(angle);
    const Y = y * Math.cos(tilt) - Z * Math.sin(tilt);
    const layer = y * Math.sin(tilt) + Z * Math.cos(tilt);
    const dolly = 3.1 - speed * (flyThrough ? Math.sin(t) : dollyIn ? 1 - Math.cos(t) : 0);
    const perspective = dolly / (dolly - clamp(layer * depth, -2.15, 2.15));
    return [X * perspective * scale, Y * perspective * scale, layer];
  }

  function trace(points, { stroke, fill, width: line = 1, closed = false } = {}) {
    const projected = points.map(project);
    ctx.beginPath();
    ctx.moveTo(...projected[0].slice(0, 2));
    for (const [x, y] of projected.slice(1)) ctx.lineTo(x, y);
    if (closed) ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }

  function metal(a, b, intensity = 1) {
    const [ax, ay] = project(a);
    const [bx, by] = project(b);
    const gradient = ctx.createLinearGradient(ax, ay, bx, by);
    const stops = animationPalette.stops || [0, 28, 52, 100];
    gradient.addColorStop(stops[0] / 100, withAlpha(dark, intensity));
    gradient.addColorStop(stops[1] / 100, withAlpha(color, intensity));
    gradient.addColorStop(stops[2] / 100, withAlpha(light, intensity * reflection));
    gradient.addColorStop(stops[3] / 100, withAlpha(shade, intensity));
    return gradient;
  }

  function spark(position, radius = 2) {
    const [x, y] = project(position);
    ctx.fillStyle = light;
    ctx.shadowColor = color;
    ctx.shadowBlur = glow * 24;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  for (let i = 0; i < animation.particles * quality; i++) {
    const orbit = .55 + (i * 31 % 87) / 100;
    const pin = i * 2.399963 + t;
    ctx.globalAlpha = .1 + .28 * (.5 + .5 * Math.sin(pin));
    spark([Math.cos(pin) * orbit, Math.sin(pin) * orbit, Math.sin(i) * .6], 1);
  }
  ctx.globalAlpha = 1;
  draw({ t, quality, movement, color, light, shade, project, trace, metal, spark });
  ctx.restore();
}

function withAlpha(color, opacity) {
  return color + Math.round(clamp(opacity, 0, 1) * 255).toString(16).padStart(2, '0');
}

export function applicationModules(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, movement, color, light, project, trace, metal, spark } = scene;
    const emerge = (1 - Math.cos(t)) / 2;
    const modules = Array.from({ length: 13 }, (_, i) => {
      const a = i * TAU / 6;
      const shell = i === 0 ? 0 : i <= 6 ? .46 : .78;
      const spread = 1 + movement * .95 * (1 - emerge);
      return {
        i, a,
        x: Math.cos(a) * shell * spread,
        y: Math.sin(a) * shell * spread,
        z: (i % 3 - 1) * (.56 - emerge * .29),
      };
    });
    const center = [0, 0, -.05];
    for (const { i, x, y, z } of modules.slice(1)) {
      const elbow = [x * .7, y * .7, -.28];
      trace([center, elbow, [x, y, z]], { stroke: withAlpha(color, emerge * .9), width: 1.5 });
      const pulse = (state.phase + i * .19) % 1;
      ctx.globalAlpha = emerge;
      spark([x * pulse, y * pulse, z * pulse], 1.6);
      ctx.globalAlpha = 1;
    }

    modules.sort((a, b) => project([a.x, a.y, a.z])[2] - project([b.x, b.y, b.z])[2]);
    for (const { i, a, x, y, z } of modules) {
      const r = i === 0 ? .18 : .086 + i % 3 * .015;
      const spin = a + t + Math.sin(t) * movement;
      const shape = Array.from({ length: 6 }, (_, j) => {
        const theta = j * TAU / 6;
        return [r * Math.cos(theta), r * Math.sin(theta)];
      });
      const face = layer => shape.map(([u, v]) =>
        [x + Math.cos(spin) * u, y + v, z + Math.sin(spin) * u + layer]);
      const top = face(.09);
      const bottom = face(-.09);
      top.forEach((point, j) => {
        const k = (j + 1) % top.length;
        trace([point, top[k], bottom[k], bottom[j]], {
          fill: metal(point, bottom[k], .9), stroke: withAlpha(color, .7), closed: true,
        });
      });
      trace(top, { fill: metal(top[0], top[3]), stroke: withAlpha(light, .65), closed: true });
      spark([x, y, z + .1], i ? 1.4 : 4);
    }
  });
}

export function browserArchitecture(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, movement, color, light, trace, metal, spark } = scene;
    const unfold = Math.sin(t / 2) ** 2;
    const dissolution = Math.sin(t) ** 8;
    for (let layer = 0; layer < 6; layer++) {
      const z = (layer - 2.5) * (.09 + unfold * .22);
      const landing = (layer - 2.5) * unfold * .14;
      const twist = Math.sin(t + layer / 2) * movement * .58;
      const position = (x, y) => [
        Math.cos(twist) * x + landing,
        y - landing * .45,
        z + Math.sin(twist) * x + dissolution * Math.sin(x * 6 + t + layer) * .34,
      ];
      const line = (coords, stroke, width) =>
        trace(coords.map(([x, y]) => position(x, y)), { stroke, width });
      const corners = [[-.75, -.46], [.75, -.46], [.75, .46], [-.75, .46]];
      const border = corners.flatMap(([x, y], i) => {
        const [X, Y] = corners[(i + 1) % 4];
        return Array.from({ length: 14 }, (_, j) => position(x + (X - x) * j / 14, y + (Y - y) * j / 14));
      });
      trace(border, {
        fill: metal(position(-.75, -.5), position(.75, .5), .17),
        stroke: metal(position(-.75, -.5), position(.75, .5)), width: 2.2, closed: true,
      });
      ctx.globalAlpha = 1 - dissolution * .81;
      line([[-.75, -.31], [.75, -.31]], withAlpha(light, .66), 1.4);
      for (let i = 0; i < 3; i++) spark(position(-.65 + i * .09, -.385), 1.5);
      for (let i = 0; i < 5; i++) {
        const y = -.19 + i * .12;
        line([[-.08, y], [.56 - ((layer + i) % 4) * .11, y]], withAlpha(light, .62), 2);
      }
      line([[-.63, -.19], [-.23, -.19], [-.23, .29], [-.63, .29], [-.63, -.19]],
        withAlpha(color, .9), 2);
      ctx.globalAlpha = 1;
    }
  });
}

export function serviceMechanism(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, trace, metal, spark } = scene;
    const alignment = (1 - Math.cos(t)) / 2;
    const steps = Math.round(76 * quality);
    const rings = [];

    for (let n = 0; n < 7; n++) {
      const a = n * Math.PI / 7 + t * (n % 2 ? -1 : 1);
      const inclination = .34 + n * .3 + Math.sin(t) * movement * .48;
      const radius = .46 + n * .075;
      const distance = (1 - alignment) * movement * .27;
      const point = (theta, offset = 0) => {
        const x = Math.cos(theta) * (radius + offset);
        const y = Math.sin(theta) * (radius + offset) * Math.cos(inclination);
        return [
          x * Math.cos(a) - y * Math.sin(a) + Math.cos(n) * distance,
          x * Math.sin(a) + y * Math.cos(a) + Math.sin(n) * distance,
          Math.sin(theta) * radius * Math.sin(inclination),
        ];
      };
      rings.push(point);
    }

    function layers(front) {
      for (const [i, point] of rings.entries()) {
        for (let j = 0; j < steps; j++) {
          const theta = TAU * j / steps;
          const a = point(theta);
          if ((a[2] >= 0) !== front) continue;
          const next = point(theta + TAU / steps);
          const track = point(theta, .021);
          trace([a, next], { stroke: metal(a, track), width: 3.5 });
          if (j % 4 === 0) trace([a, point(theta, .038)], { stroke: withAlpha(light, .65) });
        }
        const pulse = point(t * (i % 2 ? -1 : 1) + i * .46);
        if ((pulse[2] >= 0) === front) spark(pulse, 2);
      }
    }

    layers(false);
    spark([0, 0, 0], 8 + alignment * 5);
    trace([[-.18, 0, 0], [.18, 0, 0]], { stroke: withAlpha(color, .6), width: 2 });
    layers(true);
  });
}

export function experimentalReactor(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, project, trace, metal, spark } = scene;
    const spread = .15 + .85 * Math.sin(t / 2) ** 2;
    const lattice = Math.sin(t) ** 6;
    const turning = Math.sin(t) * movement;
    const cage = [[-.65, -.85], [.65, -.85], [.65, .85], [-.65, .85]];

    const glass = z => {
      const corners = cage.map(([x, y]) => [x, y, z]);
      trace(corners, {
        fill: withAlpha(color, .055), stroke: withAlpha(light, .35),
        width: 1.6, closed: true,
      });
    };

    glass(-.66);
    for (const [x, y] of cage) {
      const back = [x, y, -.66];
      const front = [x, y, .66];
      trace([back, front], { stroke: metal(back, front), width: 2 });
    }

    const rings = Math.round(12 * quality);
    const columns = Math.round(20 * quality);
    function surface(row, col) {
      const phi = Math.PI * row / rings;
      const theta = TAU * col / columns;
      const wave = 1 + movement * Math.sin(theta * 3 + t) * Math.sin(phi * 5) * .26;
      const faceting = 1 - lattice * .28 * Math.abs(Math.sin(theta * 3 + phi * 2));
      const r = (.22 + spread * .33) * wave * faceting;
      return [
        Math.sin(phi) * Math.cos(theta + turning) * r,
        Math.cos(phi) * r * (1 + spread * .22),
        Math.sin(phi) * Math.sin(theta + turning) * r,
      ];
    }

    const cells = [];
    for (let row = 0; row < rings; row++) {
      for (let col = 0; col < columns; col++) {
        const a = surface(row, col);
        const b = surface(row + 1, col);
        const c = surface(row + 1, col + 1);
        const d = surface(row, col + 1);
        cells.push({ a, b, c, d, z: project(a)[2] + project(c)[2] });
      }
    }

    cells.sort((a, b) => a.z - b.z);
    for (const { a, b, c, d } of cells) {
      trace([a, b, c, d], {
        fill: metal(a, c, 1 - lattice * .75),
        stroke: withAlpha(light, .12 + lattice * .38), closed: true,
      });
    }

    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + turning;
      const x = Math.cos(a) * (.26 + spread * .48);
      const y = Math.sin(a) * (.26 + spread * .54);
      const z = Math.sin(i * 3 + t) * .35;
      const point = [x, y, z];
      const edge = .025 + spread * .035;
      ctx.globalAlpha = spread;
      trace([[x, y - edge, z], [x + edge, y, z], [x, y + edge, z], [x - edge, y, z]], {
        fill: metal([x - edge, y - edge, z], [x + edge, y + edge, z]), closed: true,
      });
      const pulse = (state.phase * 2 + i * .21) % 1;
      const impulse = point.map(component => component * pulse);
      if (i % 2 === 0) {
        trace([[0, 0, 0], [x * .23, y * .48, z * .3], impulse],
          { stroke: withAlpha(light, spread * (1 - pulse) * .55) });
        spark(impulse, 1.4);
      }
    }
    ctx.globalAlpha = 1;
    glass(.66);
  });
}

export function liquidPortrait(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, trace, metal, spark } = scene;
    const face = (1 - Math.cos(t)) / 2;
    const wave = Math.sin(t) ** 2;
    const ribbons = 24;
    const steps = Math.round(52 * quality);
    const strips = [];

    for (let strip = 0; strip < ribbons; strip++) {
      const level = strip / (ribbons - 1);
      const profile = Math.sin(level * Math.PI) ** .65 * (.48 + .14 * Math.sin(level * 4.8));
      const loose = (strip - ribbons / 2) * .019;
      function edge(u, trim) {
        const x = Math.cos(u) * profile;
        const eye = Math.exp(-((Math.abs(x) - .19) ** 2 * 55 + (level - .44) ** 2 * 190));
        const nose = Math.exp(-(x ** 2 * 115 + (level - .53) ** 2 * 72));
        const lip = Math.exp(-(x ** 2 * 34 + (level - .7) ** 2 * 490));
        const depth = Math.sin(u) * profile + Math.max(0, Math.sin(u)) *
          (.22 * nose - .16 * eye + .082 * lip);
        const strand = u * 2 + level * TAU + t;
        const ribbonX = Math.cos(u) * (.55 + wave * .29) + loose * wave;
        const ribbonY = Math.sin(strand) * (.18 + wave * movement * .48) + loose;
        const ribbonZ = .29 * Math.cos(strand + .6) + loose * wave;
        return [
          x * face + ribbonX * (1 - face),
          (level - .5) * 1.52 * face + ribbonY * (1 - face) + trim,
          depth * face + ribbonZ * (1 - face),
        ];
      }
      const halfWidth = .014 + (1 - face) * .012;
      const top = [];
      const bottom = [];
      for (let i = 0; i <= steps; i++) {
        const u = TAU * i / steps;
        top.push(edge(u, -halfWidth));
        bottom.push(edge(u, halfWidth));
      }
      strips.push({ top, bottom });
    }

    for (const { top, bottom } of strips) {
      for (let i = 0; i < steps; i++) {
        const a = top[i];
        const b = top[i + 1];
        const c = bottom[i + 1];
        const d = bottom[i];
        const flash = .42 + .58 * (.5 + .5 * Math.sin(t * 3 + i * .18));
        trace([a, b, c, d], {
          fill: metal(a, c, flash), stroke: withAlpha(color, .42), closed: true,
        });
      }
    }

    ctx.globalAlpha = wave;
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399963 + t;
      const x = Math.sin(a) * .95;
      const y = Math.cos(a) * (.63 + i * .025);
      const z = .2 * Math.cos(a);
      trace([[x-.04, y, z], [x+.06, y-.08, z], [x+.08, y+.025, z]], {
        fill: metal([x, y, z], [x+.06, y-.08, z]),
        stroke: withAlpha(light, .65), closed: true,
      });
      spark([x, y, z], 1.6);
    }
    ctx.globalAlpha = 1;
  });
}

export function assembledBust(design) {
  // Horizontal cross sections of an anonymous head, neck and shoulder plinth.
  const sections = [
    [-.87, .05, .11], [-.81, .25, .24], [-.71, .36, .32], [-.55, .39, .35],
    [-.37, .38, .36], [-.2, .35, .35], [-.02, .31, .3], [.13, .24, .25],
    [.21, .15, .18], [.39, .14, .16], [.47, .28, .2], [.6, .58, .29], [.69, .71, .31],
  ];
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, trace, metal, spark, project } = scene;
    const assembly = Math.sin(t / 2) ** 2;
    const dispersion = (1 - assembly) * movement;
    const columns = Math.round(28 * quality);
    const tiles = [];

    for (let row = 0; row < sections.length - 1; row++) {
      for (let col = 0; col < columns; col++) {
        const theta = col * TAU / columns;
        const seed = row * columns + col;
        const shift = [
          Math.cos(seed * 2.4 + t) * dispersion * .77,
          Math.sin(seed * 1.7 + t) * dispersion * .57,
          Math.cos(seed * 1.8 - t) * dispersion,
        ];
        const point = (i, a) => {
          const [y, breadth, depth] = sections[i];
          const x = Math.cos(a) * breadth;
          const front = Math.max(0, Math.sin(a));
          const eye = Math.exp(-((Math.abs(x) - .15) ** 2 * 120 + (y + .41) ** 2 * 145));
          const nose = Math.exp(-(x ** 2 * 140 + (y + .31) ** 2 * 65));
          const mouth = Math.exp(-(x ** 2 * 70 + (y + .075) ** 2 * 450));
          const relief = front * (.24 * nose - .16 * eye + .11 * mouth);
          return [x + shift[0], y + shift[1], Math.sin(a) * depth + relief + shift[2]];
        };
        const next = theta + TAU / columns;
        const a = point(row, theta);
        const b = point(row, next);
        const c = point(row + 1, next);
        const d = point(row + 1, theta);
        tiles.push({ a, b, c, d, seed, wiring: a[0] > 0, layer: project(a)[2] + project(c)[2] });
      }
    }

    tiles.sort((a, b) => a.layer - b.layer);
    for (const { a, b, c, d, wiring, seed } of tiles) {
      trace([a, b, c, d], {
        fill: metal(a, c, wiring ? .22 : .98),
        stroke: withAlpha(wiring ? light : color, wiring ? .28 : .45),
        closed: true,
      });
      if (wiring && seed % 6 === 0) {
        const knee = [(a[0] + c[0]) / 2, a[1], (a[2] + c[2]) / 2];
        trace([a, knee, c], { stroke: withAlpha(light, .5), width: 1.3 });
        if (Math.sin(t * 2 + seed) > .68) spark(knee, 1.8);
      }
    }
  });
}

export function conversationBridge(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, trace, metal, spark } = scene;
    const union = Math.sin(t / 2) ** 2;
    const steps = Math.round(64 * quality);
    for (const side of [-1, 1]) {
      const x = side * (.82 - .26 * union);
      for (let facet = 0; facet < 8; facet++) {
        const a = TAU * facet / 8 + side * t;
        const b = a + TAU / 8;
        const edge = angle => [x + Math.cos(angle) * .13, Math.sin(angle) * .28, Math.cos(angle) * .27];
        const tip = [x + side * .16, Math.sin(t) * .1, 0];
        const inner = [x - side * .24, -.04, 0];
        trace([edge(a), edge(b), tip], {
          fill: metal(edge(a), tip), stroke: withAlpha(light, .48), closed: true,
        });
        trace([edge(b), edge(a), inner], {
          fill: metal(edge(b), inner), stroke: withAlpha(color, .68), closed: true,
        });
      }
    }

    for (let strand = 0; strand < 16; strand++) {
      function filament(p) {
        const twist = p * TAU + strand * TAU / 16 + t;
        const bridgeRadius = Math.sin(p * Math.PI) * movement * .35;
        const latitude = p * Math.PI;
        const ring = .67 * Math.sin(latitude);
        return [
          (p - .5) * 1.38 * (1 - union) + Math.cos(latitude) * .67 * union,
          Math.cos(twist) * (bridgeRadius * (1 - union) + ring * union),
          Math.sin(twist) * (bridgeRadius * (1 - union) + ring * union),
        ];
      }
      const points = Array.from({ length: steps + 1 }, (_, i) => filament(i / steps));
      trace(points, {
        stroke: metal(points[steps * .18 | 0], points[steps * .73 | 0], .35 + union * .65),
        width: strand % 4 === 0 ? 2 : .78,
      });
      const progress = (state.phase * 2 + strand / 16) % 1;
      ctx.globalAlpha = Math.sin(progress * Math.PI) ** 2;
      spark(filament(strand % 2 ? progress : 1 - progress), 2);
      ctx.globalAlpha = 1;
    }
  });
}

export function neuralArchitecture(design) {
  const nodes = Array.from({ length: 196 }, (_, index) => {
    const side = index % 2 ? 1 : -1;
    const layer = Math.floor(index / 2);
    const phi = Math.acos(1 - (layer + .5) / 49);
    const theta = layer * 2.399963;
    const fold = 1 + .08 * Math.sin(theta * 7) * Math.sin(phi * 5);
    return [
      side * (.075 + Math.abs(Math.cos(theta)) * Math.sin(phi) * .64 * fold),
      Math.sin(theta) * Math.sin(phi) * .52 * fold,
      Math.cos(phi) * .78 * fold,
    ];
  });
  const signals = nodes.map((node, i) => nodes.map((other, j) => [
    j, (other[0] - node[0]) ** 2 + (other[1] - node[1]) ** 2 + (other[2] - node[2]) ** 2,
  ]).filter(([, distance]) => distance > 0).sort((a, b) => a[1] - b[1])
    .slice(0, 4).map(([j]) => j).filter(j => j > i));

  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, trace, metal, spark } = scene;
    const activation = Math.sin(t / 2) ** 2;
    const growth = .07 + activation * (.86 + movement * .14);
    const scaled = nodes.map(node => node.map(component => component * growth));

    for (let i = 0; i < scaled.length; i++) {
      if (quality < .8 && i % 3 === 0) continue;
      const origin = scaled[i];
      const energy = .5 + .5 * Math.cos(t * 3 - i * .16);
      const alpha = activation * (.23 + energy * .77);
      for (const j of signals[i]) {
        const target = scaled[j];
        const joint = [
          (origin[0] + target[0]) * .47,
          (origin[1] + target[1]) * .5,
          (origin[2] + target[2]) * .52,
        ];
        trace([origin, joint, target], { stroke: metal(origin, target, alpha), width: 1.25 });
      }

      if (i % 7 === 0) {
        trace([[0, 0, 0], origin.map(n => n * .66), origin], { stroke: withAlpha(color, alpha * .59) });
      }
      ctx.globalAlpha = alpha;
      if (energy > .72) spark(origin, 1.2);
    }
    ctx.globalAlpha = 1;
    spark([0, 0, 0], 3.6 + (1 - activation) * 2.8);
    trace([[-.17, 0, 0], [.17, 0, 0]], { stroke: withAlpha(light, .42) });
  });
}

export function sommelierTray(design) {
  return (ctx, state) => stage(ctx, state, design, scene => {
    const { t, quality, movement, color, light, project, trace, metal, spark } = scene;
    const approach = Math.sin(t / 2) ** 2;
    const tilt = Math.sin(t) * movement * .23;
    const tray = angle => [
      Math.cos(angle) * .97,
      .54 + Math.sin(angle) * tilt,
      Math.sin(angle) * .59,
    ];
    const edge = Array.from({ length: 65 }, (_, i) => tray(TAU * i / 64));
    ctx.globalAlpha = .31 + approach * .69;
    trace(edge, {
      fill: metal([-.95, .54, 0], [.95, .54, 0]),
      stroke: withAlpha(light, .85), width: 3, closed: true,
    });
    trace(edge.map(([x, y, z]) => [x * .89, y - .013, z * .89]),
      { stroke: withAlpha(light, .55), width: 1.3, closed: true });

    function vessel(position, profile, opacity) {
      const panels = [];
      const steps = Math.round(24 * quality);
      const rim = (row, i) => {
        const [y, radius] = profile[row];
        const a = i * TAU / steps;
        const z = Math.cos(a) * radius;
        return [position + Math.sin(a) * radius, y + z * tilt, z];
      };
      for (let row = 0; row < profile.length - 1; row++) {
        for (let i = 0; i < steps; i++) {
          const a = rim(row, i);
          const b = rim(row, i + 1);
          const c = rim(row + 1, i + 1);
          const d = rim(row + 1, i);
          panels.push({ a, b, c, d, row, z: project(a)[2] + project(c)[2] });
        }
      }
      panels.sort((a, b) => a.z - b.z);
      for (const { a, b, c, d, row } of panels) {
        trace([a, b, c, d], {
          fill: metal(a, c, opacity(row)),
          stroke: withAlpha(light, opacity(row) * .19), closed: true,
        });
      }
      const opening = Array.from({ length: steps }, (_, i) => rim(0, i));
      trace(opening, { fill: withAlpha(color, .55), stroke: withAlpha(light, .75), closed: true });
    }

    const bottle = [[-.69,.087],[-.65,.09],[-.4,.07],[-.31,.12],[-.2,.21],[.1,.21],[.29,.21],[.48,.19],[.52,.06]];
    vessel(-.29, bottle, row => row === 4 || row === 5 ? .72 : 1);
    const glass = [[-.18,.23],[-.115,.23],[-.05,.228],[.15,.205],[.34,.176],[.46,.15],[.52,.12]];
    vessel(.35, glass, row => row === 1 || row === 2 ? .59 : .84);
    for (let i = 0; i < 6; i++) {
      const rise = (state.phase + i / 6) % 1;
      ctx.globalAlpha = Math.sin(rise * Math.PI) * approach;
      spark([.35 + Math.sin(i * 9.1) * .13, .36 - rise * .4, Math.cos(i) * .09], 1.1);
    }
    ctx.globalAlpha = 1;
  });
}
