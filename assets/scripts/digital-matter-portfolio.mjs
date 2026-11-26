import { mountCinematicHero } from './cinematic-hero.mjs';
import { applicationModules, browserArchitecture, serviceMechanism, experimentalReactor, liquidPortrait, assembledBust, conversationBridge, neuralArchitecture, sommelierTray } from './scenes/portfolio.mjs';

import { detailScene } from './scenes/detail.mjs';

const scenes = {
  applications: [2, applicationModules],
  websites: [3, browserArchitecture],
  services: [4, serviceMechanism],
  lab: [5, experimentalReactor],
  creative: [6, liquidPortrait],
  about: [7, assembledBust],
  contact: [8, conversationBridge],
  "codex-master": [9, neuralArchitecture],
  myra: [10, sommelierTray],
};
const stage = document.querySelector('[data-cinematic-stage]');
const { designPage, sceneId } = document.body.dataset;
const [id, scene] = sceneId ? [Number(sceneId), detailScene] : scenes[designPage];
const response = await fetch(new URL('../data/digital-matter.json', import.meta.url));
if (response.ok) {
  const design = (await response.json()).pages.find(page => page.page === id);
  mountCinematicHero({
    stage,
    canvas: stage.querySelector('canvas'),
    button: stage.querySelector('button'),
    settings: design.animation,
    stillPhase: .5,
    render: scene(design),
  });
}
