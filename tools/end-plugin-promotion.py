"""Restore original entitlement checks in author-supplied promotional ZIPs.

Preserve archive entries and license notices; refresh the public integrity manifest.
Also used after the CI transfer-parts assembly so it cannot republish a promo build.
"""
from pathlib import Path
import argparse
import hashlib
import io
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROMO = re.compile(
    rb"[ \t]*// Owner-authorized free promotional edition\.[^\n]*\n"
    rb"[ \t]*if \( ! defined\( 'QW_DISABLE_FREE_PROMO' \) \|\| ! QW_DISABLE_FREE_PROMO \) \{\n"
    rb"[ \t]*return true;\n[ \t]*\}\n\n"
)
CODE_PROMO = (
    b"        // Promotional access is scoped to this owner-authored plugin only.\n"
    b"        if ( ( ! defined( 'QW_DISABLE_FREE_PROMO' ) || ! QW_DISABLE_FREE_PROMO ) && ! empty( $products ) && empty( array_diff( (array) $products, array( 'quick-code' ) ) ) ) {\n"
    b"            return true;\n        }\n\n"
)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plugin', help='Process only this package ID')
    args = parser.parse_args()
    manifest_path = ROOT / 'assets/data/quickwoo-downloads.json'
    manifest = json.loads(manifest_path.read_text())
    fixes = json.loads((ROOT / 'tools/plugin-release-fixes.json').read_text())
    if args.plugin and args.plugin not in manifest['packages']:
        parser.error('Unknown package')
    pending = []
    for slug, package in manifest['packages'].items():
        if args.plugin and args.plugin != slug:
            continue
        path = ROOT / package['url'].lstrip('/')
        original = path.read_bytes()
        digest = hashlib.sha256(original).hexdigest()
        assert digest in {package['sha256'], package.get('sourceSha256')}, f'{slug}: unexpected input digest'
        output = io.BytesIO()
        changed = False
        with zipfile.ZipFile(io.BytesIO(original)) as source, zipfile.ZipFile(output, 'w') as target:
            assert source.testzip() is None, f'{slug}: damaged ZIP'
            for info in source.infolist():
                assert info.filename.startswith(slug + '/') and '..' not in Path(info.filename).parts
                data = source.read(info)
                for fix in fixes.get(info.filename, []):
                    before, after = fix['before'].encode(), fix['after'].encode()
                    if after in data:
                        continue
                    if before in data:
                        data = data.replace(before, after)
                        changed = True
                    else:
                        assert after in data, f'{info.filename}: patch context changed'
                if info.filename == slug + '/FREE-PROMOTION.txt':
                    changed = True
                    continue
                if info.filename.endswith('.php'):
                    data, count = PROMO.subn(b'', data)
                    changed |= bool(count)
                    if CODE_PROMO in data:
                        data = data.replace(CODE_PROMO, b'')
                        changed = True
                    assert b'QW_DISABLE_FREE_PROMO' not in data, f'{slug}: unrecognized promotional bypass'
                if info.filename == f'{slug}/{slug}.php' and (package.get('sourceSha256') or changed or any(p.startswith(slug + '/') for p in fixes)):
                    version = re.search(rb'Version:\s*([0-9.]+)', data)[1].decode()
                    package.setdefault('sourceVersion', version)
                    source_version = package['sourceVersion']
                    if 'version' not in package:
                        parts = source_version.split('.')
                        parts[-1] = str(int(parts[-1]) + 1)
                        package['version'] = '.'.join(parts)
                    if version == source_version:
                        release = package['version'].encode()
                        data = re.sub(rb'(Version:\s*)' + re.escape(version.encode()), lambda m: m[1] + release, data, count=1)
                        data = data.replace(b"'" + version.encode() + b"'", b"'" + release + b"'")
                        changed = True
                target.writestr(info, data)
        if changed:
            package.setdefault('sourceSha256', digest)
            pending.append((path, output.getvalue()))
        data = output.getvalue() if changed else original
        package.update(sha256=hashlib.sha256(data).hexdigest(), bytes=len(data), freePromotion=False)
        print(f'{slug}: {"restored license checks" if changed else "unchanged"}')
    manifest['mode'] = 'standard'
    for path, data in pending:
        path.write_bytes(data)
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
