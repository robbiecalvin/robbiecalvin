"""Check the static pages and discoverability signals that ship with the site."""

from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
HOST = 'robbiecalvin.com'
SITEMAP_URL = f'https://{HOST}/sitemap.xml'


class Page(HTMLParser):
    def __init__(self, file):
        super().__init__()
        self.title = ''
        self.reading_title = False
        self.headings = 0
        self.meta = {}
        self.canonicals = []
        self.links = []
        self.assets = []
        self.anchors = set()
        self.feed(file.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.anchors.add(attrs['id'])
        if tag == 'title':
            self.reading_title = True
        if tag == 'h1':
            self.headings += 1
        if tag == 'meta' and attrs.get('name'):
            self.meta[attrs['name'].lower()] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonicals.append(attrs.get('href'))
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'icon', 'apple-touch-icon'):
            self.assets.append(attrs.get('href'))
        if tag in ('img', 'script', 'source', 'video') and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'video' and attrs.get('poster'):
            self.assets.append(attrs['poster'])
        if tag == 'img' and attrs.get('srcset'):
            self.assets.extend(candidate.strip().split()[0] for candidate in attrs['srcset'].split(','))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.reading_title = False

    def handle_data(self, data):
        if self.reading_title:
            self.title += data


def local_file(public_path):
    file = ROOT / unquote(public_path).lstrip('/')
    return file / 'index.html' if file.is_dir() else file


def main():
    sitemap = ElementTree.parse(ROOT / 'sitemap.xml')
    urls = [entry.text.strip() for entry in sitemap.findall('{*}url/{*}loc')]
    assert urls and len(urls) == len(set(urls)), 'The sitemap must contain unique URLs'
    assert f'Sitemap: {SITEMAP_URL}' in (ROOT / 'robots.txt').read_text(), 'robots.txt must advertise the sitemap'
    titles = {}
    inbound = defaultdict(set)
    pages = {}
    count = 0

    for url in urls:
        parsed = urlsplit(url)
        assert parsed.scheme == 'https' and parsed.netloc == HOST, url
        assert not parsed.query and not parsed.fragment, url
        file = local_file(parsed.path)
        assert file.is_file(), f'Missing sitemap page: {url}'
        if file not in pages:
            pages[file] = Page(file)
        page = pages[file]
        assert page.title.strip() and page.title not in titles, f'Missing or duplicate title: {url}'
        titles[page.title] = url
        assert page.meta.get('description', '').strip(), f'Missing description: {url}'
        assert 'noindex' not in page.meta.get('robots', '').lower(), f'Sitemap page uses noindex: {url}'
        assert page.headings == 1, f'Expected one H1: {url}'
        assert page.canonicals == [url], f'Canonical differs from sitemap: {url}'

        for reference in page.links + page.assets:
            if not reference:
                continue
            destination = urlsplit(urljoin(url, reference))
            if destination.scheme != 'https' or destination.netloc != HOST:
                continue
            destination_file = local_file(destination.path)
            assert destination_file.is_file(), f'Missing internal reference from {url}: {reference}'
            if reference in page.links and destination.path != parsed.path:
                inbound[destination.path].add(parsed.path)
            if destination.fragment and destination_file.suffix == '.html':
                if destination_file not in pages:
                    pages[destination_file] = Page(destination_file)
                assert unquote(destination.fragment) in pages[destination_file].anchors, (
                    f'Missing internal anchor from {url}: {reference}'
                )
            count += 1

    for url in urls:
        route = urlsplit(url).path
        assert route == '/' or inbound[route], f'Sitemap page has no link from another sitemap page: {url}'

    print(f'Checked {len(urls)} sitemap pages and {count} internal link and asset references.')


if __name__ == '__main__':
    main()
