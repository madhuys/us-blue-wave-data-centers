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
        ]
        for rel in required:
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), f"Missing {rel}")

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
        cited = set(re.findall(r'data-cite="([sc]\d+)"', html))
        self.assertGreaterEqual(len(cited), 15)
        for handle in cited:
            self.assertIn(f'id: "{handle}"', src_js, f"Missing source definition for {handle}")


if __name__ == "__main__":
    unittest.main()
