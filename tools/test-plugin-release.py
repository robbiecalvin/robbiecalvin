"""Run with python3 tools/test-plugin-release.py (no third-party dependencies)."""
from pathlib import Path
import hashlib
import json
import re
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    return json.loads((ROOT / path).read_text())

class PluginReleaseTests(unittest.TestCase):
    def test_all_192_standard_prices_are_restored(self):
        standard = load('assets/data/quickwoo-pricing-standard.json')
        catalog = load('assets/data/quickwoo-catalog.json')
        self.assertFalse(catalog['promotion']['active'])
        self.assertEqual(catalog['currency'], 'USD')
        checked = 0
        for group in ('products', 'bundles'):
            self.assertEqual(len(catalog[group]), len(standard[group]))
            for item, expected in zip(catalog[group], standard[group]):
                self.assertEqual(item['id'], expected['id'])
                self.assertEqual(item['prices'], expected['prices'])
                for amounts in item['prices'].values():
                    self.assertTrue(all(amount > 0 for amount in amounts))
                    checked += len(amounts)
        self.assertEqual(checked, 192)

    def test_static_pages_match_interactive_prices(self):
        catalog = load('assets/data/quickwoo-catalog.json')
        for group in ('products', 'bundles'):
            for item in catalog[group]:
                prefix = 'bundles/' if group == 'bundles' else ''
                html = (ROOT / 'wp-plugins' / prefix / item['id'] / 'index.html').read_text()
                self.assertIn('id="license-billing"', html)
                self.assertIn('id="license-sites"', html)
                self.assertIn(f'data-price-id="{item["id"]}"', html)
                rows = re.findall(r'data-monthly-cents="(\d+)" data-annual-cents="(\d+)"', html)
                self.assertEqual(rows, list(zip(map(str, item['prices']['monthly']), map(str, item['prices']['annual']))))

    def test_promotional_ads_and_zero_offers_are_gone(self):
        for page in (ROOT / 'wp-plugins').rglob('index.html'):
            html = page.read_text()
            self.assertNotRegex(html.lower(), r'temporarily free|temporary.free|data-plugin-promo|data-free-promotion')
            for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
                data = json.loads(block)
                for entity in data.get('@graph', []):
                    self.assertNotIn('offers', entity)
            self.assertEqual(len(re.findall(r'id="title"', html)), 1)

    def test_all_20_packages_have_safe_layout_and_matching_integrity(self):
        manifest = load('assets/data/quickwoo-downloads.json')
        self.assertEqual(manifest['mode'], 'standard')
        self.assertEqual(len(manifest['packages']), 20)
        fixes = load('tools/plugin-release-fixes.json')
        for slug, package in manifest['packages'].items():
            path = ROOT / package['url'].lstrip('/')
            data = path.read_bytes()
            self.assertEqual(len(data), package['bytes'], slug)
            self.assertEqual(hashlib.sha256(data).hexdigest(), package['sha256'], slug)
            self.assertFalse(package['freePromotion'], slug)
            page = (ROOT / 'wp-plugins' / slug / 'index.html').read_text()
            self.assertIn(package['url'], page)
            with zipfile.ZipFile(path) as archive:
                self.assertIsNone(archive.testzip())
                for name in archive.namelist():
                    self.assertTrue(name.startswith(slug + '/'), name)
                    self.assertNotIn('..', Path(name).parts)
                    self.assertFalse(name.endswith('FREE-PROMOTION.txt'))
                    contents = archive.read(name)
                    if name.endswith('.php'):
                        self.assertNotIn(b'QW_DISABLE_FREE_PROMO', contents, name)
                    for fix in fixes.get(name, []):
                        self.assertIn(fix['after'].encode(), contents, name)
                main = archive.read(f'{slug}/{slug}.php').decode()
                self.assertIn('Plugin Name:', main)
                if package.get('version'):
                    self.assertRegex(main, r'Version:\s*' + re.escape(package['version']))

if __name__ == '__main__':
    unittest.main()
