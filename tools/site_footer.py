"""Shared footer markup for the static portfolio and generated QuickWoo pages."""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

FOOTER = """<footer class="portfolio-footer">
  <div class="portfolio-footer-inner">
    <div class="portfolio-footer-feature">
      <div>
        <h2>What are you building?</h2>
        <p>Tell me what you’re working on, or see how I’ve approached similar projects.</p>
      </div>
      <div class="portfolio-footer-actions">
        <a class="portfolio-footer-primary" href="/contact/">Tell me about your project</a>
        <a href="/technical-portfolio/">Explore the AI portfolio</a>
      </div>
    </div>

    <div class="portfolio-footer-directory">
      <div class="portfolio-footer-identity">
        <a class="portfolio-footer-wordmark" href="/">Robbie Calvin<span>.</span></a>
        <p>AI creations, software, and design from Vancouver, BC.</p>
        <div class="portfolio-footer-social">
          <a href="https://github.com/robbiecalvin">GitHub</a>
          <a href="https://www.linkedin.com/in/robbie-calvin-50710b386/">LinkedIn</a>
        </div>
      </div>
      <nav aria-label="Explore the portfolio">
        <h3>Explore</h3>
        <a href="/applications/">Applications</a>
        <a href="/websites/">Websites</a>
        <a href="/creative/">Creative</a>
        <a href="/lab/">Lab</a>
      </nav>
      <nav aria-label="Learn and work with Robbie">
        <h3>Learn &amp; build</h3>
        <a href="/ai-lessons/">AI Lessons</a>
        <a href="/wp-plugins/">QuickWoo Plugins</a>
        <a href="/services/">Services</a>
        <a href="/about/">About Robbie</a>
      </nav>
      <nav aria-label="Account and policies">
        <h3>Site information</h3>
        <a href="/account/">Account</a>
        <a href="/terms/">Terms</a>
        <a href="/privacy/">Privacy Policy</a>
        <a href="/legal/">Legal &amp; Copyright</a>
      </nav>
    </div>

    <div class="portfolio-footer-bottom">
      <small>© <span id="year">2026</span> Robbie Calvin</small>
      <a href="#">Back to top</a>
    </div>
  </div>
</footer>"""


def sync_footers():
    for page in sorted(ROOT.rglob("index.html")):
        if any(part.startswith(".") for part in page.relative_to(ROOT).parts):
            continue
        source = page.read_text(encoding="utf-8")
        if '<header class="home-toolbar">' not in source:
            continue
        updated, count = re.subn(
            r"<footer\b[^>]*>.*?</footer>",
            lambda _: FOOTER,
            source,
            count=1,
            flags=re.S,
        )
        if not count:
            updated = source.replace("</main>", "</main>\n" + FOOTER, 1)
        if source != updated:
            page.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    sync_footers()
