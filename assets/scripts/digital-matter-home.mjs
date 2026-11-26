import { mountCinematicHero } from './cinematic-hero.mjs';
import { solarSculpture } from './scenes/homepage.mjs';

const stage = document.querySelector('[data-cinematic-stage]');
const response = await fetch(new URL('../data/digital-matter.json', import.meta.url));
if (response.ok) {
  const design = (await response.json()).pages[0];
  mountCinematicHero({
    stage,
    canvas: stage.querySelector('canvas'),
    button: stage.querySelector('button'),
    settings: design.animation,
    render: solarSculpture(design.animation, design.animationPalette),
  });
}
