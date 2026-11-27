const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = process.env.SITE_REVIEW_URL || 'http://localhost:8787';
const artifacts = process.env.REVIEW_ARTIFACTS_DIR;
const routes = [
  '/applications/',
  '/websites/',
  '/services/',
  '/lab/',
  '/creative/',
  '/codex-master/',
  '/myra/',
  '/badehaus-x/',
  '/speechflow/',
  '/quickwoo/',
  '/kimix/',
  '/wp-plugins/',
  '/meetdiscreet/',
  '/crystal-eye/',
  '/trusted-cash-loans/',
  '/wp-plugins/quick-accountant/',
  '/wp-plugins/quick-add/',
  '/wp-plugins/quick-audit/',
  '/wp-plugins/quick-code/',
  '/wp-plugins/quick-core/',
  '/wp-plugins/quick-course-builder/',
  '/wp-plugins/quick-edit/',
  '/wp-plugins/quick-forms/',
  '/wp-plugins/quick-license/',
  '/wp-plugins/quick-plugin-pages/',
  '/wp-plugins/quick-questions/',
  '/wp-plugins/quick-quotes/',
  '/wp-plugins/quick-schedule/',
  '/wp-plugins/quick-seo/',
  '/wp-plugins/quick-site/',
  '/wp-plugins/quick-traffic/',
  '/wp-plugins/quick-variations/',
  '/personal-assistant/',
  '/rtb-advocacy/',
  '/web-design/',
  '/wp-managment/',
  '/graphic-design/',
  '/resume-building/',
  '/custom-software/',
  '/productivity-suite/',
  '/wild-chemistry/',
  '/instagram/',
];

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',
  });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        this.canvas.drawCount = (this.canvas.drawCount || 0) + 1;
        return clear.apply(this, args);
      };
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (artifacts) fs.mkdirSync(artifacts, { recursive: true });

    for (const route of routes) {
      for (const width of [1440, 820, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200, route);
        const canvas = page.locator('[data-rendering="canvas"] canvas');
        await canvas.waitFor();
        const button = page.locator('[data-cinematic-stage] button');
        assert(await button.isDisabled(), route);
        assert.equal(await button.getAttribute('aria-pressed'), 'true', route);
        const poster = page.locator('[data-cinematic-stage] img');
        assert(await poster.evaluate(img => img.complete && img.naturalWidth > 0), route);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          route + ' at ' + width);
        if (artifacts) {
          const slug = route.slice(1, -1);
          await page.screenshot({ path: path.join(artifacts, slug.replaceAll('/', '-') + '-' + width + '.png') });
        }
      }

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      const stage = page.locator('[data-cinematic-stage]');
      const button = stage.locator('button');
      await page.waitForFunction(() => !document.querySelector('[data-cinematic-stage] button').disabled);
      await button.focus();
      await page.keyboard.press('Space');
      assert.equal(await button.getAttribute('aria-pressed'), 'true', route);
      const draws = () => stage.locator('canvas').evaluate(canvas => canvas.drawCount);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const paused = await draws();
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 180)));
      assert.equal(await draws(), paused, route);
      await page.keyboard.press('Space');
      await page.waitForFunction(count =>
        document.querySelector('[data-cinematic-stage] canvas').drawCount > count, paused);
      await stage.locator('canvas').dispatchEvent('contextlost');
      assert(await stage.locator('img').isVisible(), route);
      assert(await button.isHidden(), route);
      await stage.locator('canvas').dispatchEvent('contextrestored');
      await button.waitFor();
      await page.emulateMedia({ reducedMotion: 'reduce' });
    }

    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type === '2d' ? null : getContext.call(this, type, ...args);
      };
    });
    for (const route of routes) {
      await page.goto(base + route);
      const stage = page.locator('[data-cinematic-stage]');
      await stage.locator('img').waitFor();
      assert(await stage.locator('img').evaluate(img => img.complete && img.naturalWidth > 0), route);
      assert(await stage.locator('canvas').isHidden(), route);
    }
    assert.deepEqual(errors, []);
    console.log(`Verified ${routes.length} routes at four widths, reduced motion, keyboard pause, and context fallback.`);
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
