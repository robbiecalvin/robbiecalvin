const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');

export function mountCinematicHero({ stage, canvas, button, settings, render, stillPhase = 0 }) {
  let context;
  try {
    context = canvas.getContext('2d', { alpha: true });
  } catch {
    // The poster remains visible if the drawing context cannot be created.
  }

  let cleanup;
  function connect() {
    const events = new AbortController();
    const { signal } = events;
    const compact = matchMedia('(max-width: 760px)').matches ||
      (navigator.hardwareConcurrency || 4) <= 4;
    const quality = compact ? 0.6 : 1;
    const pixelRatio = Math.min(devicePixelRatio || 1, compact ? 1.25 : 2);
    const interval = compact ? 1000 / 30 : 1000 / 60;
    const pointer = { x: 0, y: 0 };
    const follow = { x: 0, y: 0 };
    let elapsed = stillPhase * settings.duration;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = null;
    let paused = false;
    let visible = false;
    let contextLost = false;

    function draw() {
      if (!context || contextLost || !width || !height) return;
      render(context, {
        width, height, quality, pointer: follow,
        phase: elapsed / settings.duration,
      });
      stage.dataset.rendering = 'canvas';
    }

    function animate(now) {
      frame = requestAnimationFrame(animate);
      const delta = last === null ? interval : now - last;
      if (delta < interval * .96) return;
      last = now;
      const step = Math.min(delta, 50) / 1000;
      elapsed = (elapsed + step) % settings.duration;
      const smoothing = 1 - Math.exp(-step * 5);
      follow.x += (pointer.x - follow.x) * smoothing;
      follow.y += (pointer.y - follow.y) * smoothing;
      draw();
    }

    function sync() {
      const stopped = paused || motionPreference.matches || !context || contextLost;
      button.disabled = motionPreference.matches || !context || contextLost;
      button.hidden = !context || contextLost;
      button.textContent = motionPreference.matches ? 'Motion disabled' :
        stopped ? 'Play motion' : 'Pause motion';
      button.setAttribute('aria-pressed', String(stopped));
      button.setAttribute('aria-label', button.textContent);
      document.body.classList.toggle('motion-paused', stopped);
      if (!stopped && visible && !document.hidden) {
        if (!frame) frame = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
        last = null;
      }
      if (motionPreference.matches) {
        elapsed = stillPhase * settings.duration;
        follow.x = follow.y = 0;
        draw();
      }
    }

    const size = new ResizeObserver(([entry]) => {
      if (!context || contextLost) return;
      ({ width, height } = entry.contentRect);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    });
    const view = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    size.observe(stage);
    view.observe(stage);

    if (settings.mouse) {
      stage.addEventListener('pointermove', event => {
        if (!finePointer.matches || event.pointerType === 'touch' || button.disabled || paused) return;
        const rect = stage.getBoundingClientRect();
        pointer.x = (event.clientX - rect.left) / rect.width - .5;
        pointer.y = (event.clientY - rect.top) / rect.height - .5;
      }, { signal });
      stage.addEventListener('pointerleave', () => {
        pointer.x = pointer.y = 0;
      }, { signal });
    }

    button.addEventListener('click', () => {
      paused = !paused;
      sync();
    }, { signal });
    canvas.addEventListener('contextlost', () => {
      contextLost = true;
      delete stage.dataset.rendering;
      sync();
    }, { signal });
    canvas.addEventListener('contextrestored', () => {
      contextLost = false;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
      sync();
    }, { signal });
    motionPreference.addEventListener('change', sync, { signal });
    document.addEventListener('visibilitychange', sync, { signal });
    sync();

    return () => {
      events.abort();
      size.disconnect();
      view.disconnect();
      cancelAnimationFrame(frame);
      delete stage.dataset.rendering;
      canvas.width = canvas.height = 0;
    };
  }

  cleanup = connect();
  addEventListener('pagehide', () => {
    cleanup?.();
    cleanup = undefined;
  });
  addEventListener('pageshow', () => {
    cleanup ??= connect();
  });
}
