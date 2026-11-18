import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestBlueWaveMicrosite(unittest.TestCase):
    def test_required_files_exist(self):
        required = [
            "index.html",
            "styles.css",
            "scrollcraft.css",
            "scrollcraft.js",
            "sources-data.js",
            "app.js",
            "design/style.json",
            "design/style.css",
            "assets/hero-plate-bg.webp",
            "assets/hero-plate-bg-m.webp",
            "assets/hero-pylon-cutout.webp",
            "assets/act2-ballot-substation.webp",
            "assets/act4-transmission-corridor.webp",
            "fonts/BricolageGrotesque-Bold.ttf",
            "fonts/WorkSans-Regular.ttf",
            "fonts/SpaceMono-Regular.ttf",
            "blue-wave-data-center-report.pdf",
        ]
        for rel in required:
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), f"Missing {rel}")

    def test_hero_has_bold_pdf_download_cta(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
            html = f.read()
        self.assertIn('class="btn-hero-pdf"', html)
        self.assertIn('href="blue-wave-data-center-report.pdf"', html)
        pdf_path = os.path.join(ROOT, "blue-wave-data-center-report.pdf")
        self.assertGreater(os.path.getsize(pdf_path), 10000)

    def test_no_em_or_en_dashes_in_visible_html(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
            html = f.read()
        # Strip HTML comments
        clean = re.sub(r"<!--.*?-->", "", html, flags=re.S)
        self.assertNotIn("—", clean, "Found banned em-dash in index.html")
        self.assertNotIn("–", clean, "Found banned en-dash in index.html")

    def test_every_inline_cite_handle_exists_in_sources_data(self):
        with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
            html = f.read()
        with open(os.path.join(ROOT, "sources-data.js"), encoding="utf-8") as f:
            src_js = f.read()
        with open(os.path.join(ROOT, "app.js"), encoding="utf-8") as f:
            app_js = f.read()

        # Zero internal [sN] or [cN] handles may remain anywhere in the site
        for name, content in [("index.html", html), ("sources-data.js", src_js), ("app.js", app_js)]:
            self.assertIsNone(
                re.search(r"\[[sc]\d+\]|data-cite=\"[sc]\d+\"", content),
                f"Found un-renumbered internal handle in {name}",
            )

        cited_in_order = re.findall(r'data-cite="(\d+)"', html)
        self.assertGreaterEqual(len(set(cited_in_order)), 15)
        self.assertEqual(cited_in_order[:3], ["1", "2", "3"], "Hero citations must start at [1], [2], [3]")
        for handle in set(cited_in_order):
            self.assertIn(f'id: "{handle}"', src_js, f"Missing source definition for [{handle}]")


if __name__ == "__main__":
    unittest.main()
