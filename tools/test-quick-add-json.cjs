const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const sample = require('../assets/data/quick-add-sample-products.json');
const { chromium } = require('playwright');

async function run() {
  const base = new URL(process.env.QUICK_ADD_TEST_URL || 'http://127.0.0.1:8803');
  const username = process.env.QUICK_ADD_TEST_USER;
  const password = process.env.QUICK_ADD_TEST_PASSWORD;
  assert(
    ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) &&
    ['http:', 'https:'].includes(base.protocol) &&
    process.env.QUICK_ADD_TEST_DISPOSABLE === '1' && username && password,
    'Set the disposable flag and admin credentials for a loopback-only WordPress test store.',
  );

  const runId = randomUUID().slice(0, 8);
  const rows = sample.map(product => ({
    ...product,
    product_name: product.product_name + ' ' + runId,
    sku: product.sku + '-' + runId,
  }));
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || '/usr/bin/chromium',
  });

  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    await page.route('**/*', route => (
      new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort()
    ));
    await page.goto(new URL('/wp-login.php', base).href);
    await page.locator('#user_login').fill(username);
    await page.locator('#user_pass').fill(password);
    await Promise.all([
      page.waitForURL(url => url.pathname.startsWith('/wp-admin/')),
      page.locator('#wp-submit').click(),
    ]);
    await page.goto(new URL('/wp-admin/admin.php?page=qa-settings', base).href);
    assert.equal(
      await page.locator('#qadd_default_product_status').inputValue(),
      'draft',
      'Set the disposable fixture to create draft products before running.',
    );

    async function enterJson(products) {
      await page.locator('#qa-table-body input[required]').first().waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'JSON Paste Mode' }).click();
      await page.waitForFunction(() => document.querySelector('#qa-table-body input[required]').disabled);
      await page.locator('#qadd_json_input').fill(JSON.stringify(products));
      await page.getByRole('button', { name: 'Validate & Preview JSON' }).click();
      const previews = await page.locator('#qa-json-preview tbody tr').allTextContents();
      assert.equal(previews.length, products.length);
      assert(previews.every(row => row.includes('Valid')));
    }

    async function createProducts(count) {
      await page.getByRole('button', { name: 'Create Products' }).click();
      await page.getByText('Products created successfully: ' + count, { exact: true }).waitFor();
    }

    const bulk = new URL('/wp-admin/admin.php?page=qa-bulk-add', base).href;
    await page.goto(bulk);
    await enterJson(rows);
    await createProducts(2);

    await page.goto(new URL('/wp-admin/edit.php?post_status=draft&post_type=product', base).href);
    assert.match(await page.locator('.subsubsub .current').innerText(), /Draft/);
    const table = page.locator('table.wp-list-table');
    for (const product of rows) {
      const row = await table.getByRole('row').filter({ hasText: product.product_name }).innerText();
      assert(row.includes(product.sku));
      assert(row.includes(product.regular_price));
      assert(row.includes('(' + product.stock_quantity + ')'));
    }

    await page.goto(bulk);
    await enterJson(rows);
    await createProducts(0);
    assert.equal(await page.getByText(/SKU already exists in catalog/).count(), 2);

    await enterJson([
      rows[0],
      { product_name: 'Demo Partial ' + runId, regular_price: '4.50', sku: 'DEMO-PARTIAL-' + runId },
    ]);
    await createProducts(1);
    assert.equal(await page.getByText(/SKU already exists in catalog/).count(), 1);

    await page.locator('#qa-table-body input[required]').first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'JSON Paste Mode' }).click();
    await page.waitForFunction(() => document.querySelector('#qa-table-body input[required]').disabled);
    await page.getByRole('button', { name: 'Table Input Mode' }).click();
    const name = page.locator('#qa-table-body input[name$="[product_name]"]').first();
    assert(await name.isEnabled());
    assert(await page.locator('#qadd_json_input').isDisabled());
    assert.equal(await name.evaluate(input => input.form.checkValidity()), false);
    await name.fill('Demo Table ' + runId);
    await page.locator('#qa-table-body input[name$="[regular_price]"]').first().fill('5.25');
    await page.locator('#qa-table-body input[name$="[sku]"]').first().fill('DEMO-TABLE-' + runId);
    await createProducts(1);

    const templateName = 'Demo JSON Template ' + runId;
    const templates = new URL('/wp-admin/admin.php?page=qa-templates', base).href;
    await enterJson(rows);
    await page.locator('#qadd_template_name').fill(templateName);
    await Promise.all([
      page.waitForURL(url => url.searchParams.has('qadd_template_success')),
      page.getByRole('button', { name: 'Save Template' }).click(),
    ]);
    await page.goto(templates);
    const templateRow = page.getByRole('row').filter({ hasText: templateName });
    await templateRow.getByRole('link', { name: 'Load' }).click();
    await page.locator('#qa-table-body input[name$="[sku]"]').first().waitFor({ state: 'visible' });
    assert.deepEqual(
      await page.locator('#qa-table-body input[name$="[sku]"]').evaluateAll(inputs => inputs.map(input => input.value)),
      rows.map(row => row.sku),
    );

    await page.goto(templates);
    page.once('dialog', dialog => dialog.accept());
    await templateRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByText('Template deleted.', { exact: true }).waitFor();
    assert.equal(await templateRow.count(), 0);

    console.log('Quick Add browser checks passed for JSON and table creation, duplicate and partial results, and template save, load and delete.');
  } finally {
    await browser.close();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
