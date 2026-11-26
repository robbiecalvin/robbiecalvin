const tau = Math.PI * 2;

// Original projected solar sculpture. All rotating coordinates use integer
// harmonics of the loop phase so the start and end frames coincide.
export function solarSculpture(settings, palette) {
  const [shadow, gold, highlight, bronze] = palette.colors;
  const particles = Array.from({ length: settings.particles * 2 }, (_, i) => ({
    angle: i * 2.399963,
    radius: 1.25 + ((i * 37) % 100) / 95,
    direction: i % 3 === 0 ? -1 : 1,
    size: .6 + (i % 4) * .34,
  }));
  const opacity = (color, alpha) =>
    color + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');

  return (ctx, { width, height, phase, pointer, quality }) => {
    const t = phase * tau;
    const glow = settings.glow / 100;
    const reflection = settings.reflect / 100;
    const movement = settings.movement / 100;
    const depth = settings.depth / 100;
    // Speed adjusts the camera's angular excursion within the fixed loop.
    const camera = Math.sin(t) * settings.speed / 100;
    const radius = Math.min(width, height) * .2;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.4);
    halo.addColorStop(0, opacity(gold, glow * .35));
    halo.addColorStop(.45, opacity(bronze, glow * .22));
    halo.addColorStop(1, opacity(shadow, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    function sphere(x, y, r, bright, shade) {
      const lighting = ctx.createRadialGradient(x - r * .3, y - r * .35, 0, x, y, r);
      lighting.addColorStop(0, bright);
      lighting.addColorStop(.31, gold);
      lighting.addColorStop(.75, shade);
      lighting.addColorStop(1, shadow);
      ctx.fillStyle = lighting;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, tau);
      ctx.fill();
    }

    particles.slice(0, Math.ceil(particles.length * quality)).forEach(particle => {
      const angle = particle.angle + particle.direction * t;
      const alpha = .18 + .62 * (.5 + .5 * Math.cos(t + particle.angle));
      ctx.fillStyle = opacity(highlight, alpha);
      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * radius * particle.radius,
        Math.sin(angle) * radius * particle.radius * .85,
        particle.size, 0, tau,
      );
      ctx.fill();
    });

    const paths = [];
    const moons = [];
    const steps = Math.round(85 * quality);
    for (let ring = 0; ring < 5; ring++) {
      const orbitRadius = 1 + ring * .23;
      const inclination = .3 + ring * .38 + pointer.y * .32;
      const bearing = ring * .85 + camera + pointer.x * .55;
      const precession = t + ring * .7;
      function orbit(angle) {
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        const tilted = y * Math.cos(inclination);
        const z = y * Math.sin(inclination) * depth;
        const scale = radius * 4 / (4 - z);
        return {
          x: (x * Math.cos(bearing) - tilted * Math.sin(bearing)) * scale,
          y: (x * Math.sin(bearing) + tilted * Math.cos(bearing)) * scale,
          z,
        };
      }
      let a = orbit(precession);
      for (let i = 1; i <= steps; i++) {
        const b = orbit(precession + i / steps * tau);
        paths.push({ a, b, z: (a.z + b.z) / 2, ring });
        a = b;
      }
      moons.push({ ...orbit((ring % 2 ? -1 : 1) * t * (1 + ring % 2) + ring * 1.7), ring });
    }

    function drawLayer(front) {
      for (const { a, b, z, ring } of paths) {
        if ((z >= 0) !== front) continue;
        const light = .5 + .5 * Math.sin(z * 3 + ring + t);
        ctx.strokeStyle = opacity(light > .58 ? highlight : bronze,
          .26 + light * reflection * .72);
        ctx.lineWidth = (radius * .031 - ring * .22) * (1 + z * .19);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (const moon of moons) {
        if ((moon.z >= 0) !== front) continue;
        sphere(moon.x, moon.y, radius * (.087 - moon.ring * .009), highlight, bronze);
      }
    }

    drawLayer(false);
    ctx.shadowColor = opacity(gold, glow);
    ctx.shadowBlur = radius * glow * .58;
    sphere(0, 0, radius * (.38 + movement * .045 * Math.sin(t * 2)), highlight, bronze);
    ctx.shadowBlur = 0;
    drawLayer(true);
    ctx.restore();
  };
}
